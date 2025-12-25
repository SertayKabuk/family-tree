import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  expiresInDays: number = 7
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

  const message = `You've been invited to join the family tree "${treeName}"! Click here to join: ${inviteUrl}`;

  return {
    id: invitation.id,
    token: invitation.token,
    treeId: invitation.treeId,
    treeName,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    inviteUrl,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    emailSubject: `Invitation to join family tree: ${treeName}`,
    emailBody: `You've been invited to view and contribute to the family tree "${treeName}".\n\nClick here to join: ${inviteUrl}\n\nThis invitation expires on ${expiresAt.toLocaleDateString()}.`,
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
  error?: string;
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
    return { valid: false, error: "Invitation not found" };
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
      error: "Invitation has expired",
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
      error: "Invitation has already been used",
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
): Promise<{ success: boolean; treeId?: string; error?: string }> {
  const validation = await validateInvitation(token);

  if (!validation.valid || !validation.invitation) {
    return { success: false, error: validation.error };
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
    return { success: false, error: "You already own this tree" };
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
