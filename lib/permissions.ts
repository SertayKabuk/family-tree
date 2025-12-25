import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MemberRole } from "@prisma/client";

export type Permission = "view" | "edit" | "delete" | "manage_members" | "invite";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: ["view", "edit", "delete", "manage_members", "invite"],
  EDITOR: ["view", "edit", "manage_members"],
  VIEWER: ["view"],
};

export async function getTreePermissions(treeId: string): Promise<{
  hasAccess: boolean;
  role: MemberRole | null;
  permissions: Permission[];
  userId: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { hasAccess: false, role: null, permissions: [], userId: null };
  }

  // Check if owner
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { ownerId: true, isPublic: true },
  });

  if (!tree) {
    return { hasAccess: false, role: null, permissions: [], userId: session.user.id };
  }

  if (tree.ownerId === session.user.id) {
    return {
      hasAccess: true,
      role: "OWNER",
      permissions: ROLE_PERMISSIONS.OWNER,
      userId: session.user.id,
    };
  }

  // Check membership
  const membership = await prisma.treeMembership.findUnique({
    where: {
      treeId_userId: {
        treeId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (membership) {
    return {
      hasAccess: true,
      role: membership.role,
      permissions: ROLE_PERMISSIONS[membership.role],
      userId: session.user.id,
    };
  }

  // Check if public tree
  if (tree.isPublic) {
    return {
      hasAccess: true,
      role: null,
      permissions: ["view"],
      userId: session.user.id,
    };
  }

  return { hasAccess: false, role: null, permissions: [], userId: session.user.id };
}

export async function requirePermission(
  treeId: string,
  permission: Permission
): Promise<{ userId: string; role: MemberRole | null }> {
  const { hasAccess, permissions, userId, role } = await getTreePermissions(treeId);

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!hasAccess || !permissions.includes(permission)) {
    throw new Error("Forbidden");
  }

  return { userId, role };
}

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}
