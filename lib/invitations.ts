import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { env } from "@/lib/env";
import { getTranslations } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

function resolveLocale(locale?: string): Locale {
  return locale && locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;
}

export type InvitationValidationErrorCode =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_EXPIRED"
  | "INVITATION_USED";

export type InvitationAcceptErrorCode =
  | InvitationValidationErrorCode
  | "ALREADY_TREE_OWNER";

export interface InvitationDetails {
  id: string;
  token: string;
  treeId: string;
  treeName: string;
  role: MemberRole;
  expiresAt: Date;
  inviteUrl: string;
  whatsappUrl: string;
  emailSubject: string;
  emailBody: string;
}

export async function createInvitation(
  treeId: string,
  role: MemberRole = "VIEWER",
  email?: string,
  expiresInDays: number = 7,
  locale?: string
): Promise<InvitationDetails> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invitation = await prisma.treeInvitation.create({
    data: {
      treeId,
      role,
      email: email || null,
      expiresAt,
    },
    include: {
      tree: {
        select: { name: true },
      },
    },
  });

  const inviteUrl = `${APP_URL}/invite/${invitation.token}`;
  const treeName = invitation.tree.name;
  const resolvedLocale = resolveLocale(locale);
  const [tSharing, tRoles] = await Promise.all([
    getTranslations({ locale: resolvedLocale, namespace: "sharing.invitationText" }),
    getTranslations({ locale: resolvedLocale, namespace: "roles" }),
  ]);
  const roleLabels: Record<MemberRole, string> = {
    OWNER: tRoles("owner"),
    EDITOR: tRoles("editor"),
    VIEWER: tRoles("viewer"),
  };
  const formattedExpiresAt = new Intl.DateTimeFormat(resolvedLocale).format(expiresAt);

  const message = tSharing("whatsapp", {
    treeName,
    role: roleLabels[role],
    inviteUrl,
    expiresAt: formattedExpiresAt,
  });

  return {
    id: invitation.id,
    token: invitation.token,
    treeId: invitation.treeId,
    treeName,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    inviteUrl,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    emailSubject: tSharing("emailSubject", { treeName }),
    emailBody: tSharing("emailBody", {
      treeName,
      role: roleLabels[role],
      inviteUrl,
      expiresAt: formattedExpiresAt,
    }),
  };
}

export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation?: {
    id: string;
    treeId: string;
    treeName: string;
    role: MemberRole;
    expiresAt: Date;
    isExpired: boolean;
    isUsed: boolean;
  };
  errorCode?: InvitationValidationErrorCode;
}> {
  const invitation = await prisma.treeInvitation.findUnique({
    where: { token },
    include: {
      tree: {
        select: { id: true, name: true },
      },
    },
  });

  if (!invitation) {
    return { valid: false, errorCode: "INVITATION_NOT_FOUND" };
  }

  const isExpired = invitation.expiresAt < new Date();
  const isUsed = !!invitation.usedAt;

  if (isExpired) {
    return {
      valid: false,
      invitation: {
        id: invitation.id,
        treeId: invitation.treeId,
        treeName: invitation.tree.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        isExpired: true,
        isUsed: false,
      },
      errorCode: "INVITATION_EXPIRED",
    };
  }

  if (isUsed) {
    return {
      valid: false,
      invitation: {
        id: invitation.id,
        treeId: invitation.treeId,
        treeName: invitation.tree.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        isExpired: false,
        isUsed: true,
      },
      errorCode: "INVITATION_USED",
    };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      treeId: invitation.treeId,
      treeName: invitation.tree.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      isExpired: false,
      isUsed: false,
    },
  };
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; treeId?: string; errorCode?: InvitationAcceptErrorCode }> {
  const validation = await validateInvitation(token);

  if (!validation.valid || !validation.invitation) {
    return {
      success: false,
      errorCode: validation.errorCode ?? "INVITATION_NOT_FOUND",
    };
  }

  const { treeId, role } = validation.invitation;

  // Check if user is already a member
  const existingMembership = await prisma.treeMembership.findUnique({
    where: {
      treeId_userId: {
        treeId,
        userId,
      },
    },
  });

  // Check if user is the owner
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { ownerId: true },
  });

  if (tree?.ownerId === userId) {
    return { success: false, errorCode: "ALREADY_TREE_OWNER" };
  }

  if (existingMembership) {
    // Update role if new role is higher
    const roleOrder = { VIEWER: 0, EDITOR: 1, OWNER: 2 };
    if (roleOrder[role] > roleOrder[existingMembership.role]) {
      await prisma.treeMembership.update({
        where: { id: existingMembership.id },
        data: { role },
      });
    }
  } else {
    // Create new membership
    await prisma.treeMembership.create({
      data: {
        treeId,
        userId,
        role,
      },
    });
  }

  // Mark invitation as used
  await prisma.treeInvitation.update({
    where: { token },
    data: {
      usedAt: new Date(),
      usedById: userId,
    },
  });

  return { success: true, treeId };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await prisma.treeInvitation.delete({
    where: { id: invitationId },
  });
}

export async function getTreeInvitations(treeId: string) {
  return prisma.treeInvitation.findMany({
    where: { treeId },
    orderBy: { createdAt: "desc" },
  });
}
