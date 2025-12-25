import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TreesList } from "@/components/dashboard/trees-list";
import { CreateTreeDialog } from "@/components/dashboard/create-tree-dialog";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get trees owned by user and trees they're a member of
  const [ownedTrees, memberTrees] = await Promise.all([
    prisma.familyTree.findMany({
      where: { ownerId: session.user.id },
      include: {
        _count: { select: { familyMembers: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.treeMembership.findMany({
      where: { userId: session.user.id },
      include: {
        tree: {
          include: {
            owner: { select: { name: true, email: true } },
            _count: { select: { familyMembers: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sharedTrees = memberTrees.map((m) => ({
    ...m.tree,
    role: m.role,
  }));

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Family Trees</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your family trees
          </p>
        </div>
        <CreateTreeDialog />
      </div>

      <TreesList ownedTrees={ownedTrees} sharedTrees={sharedTrees} />
    </div>
  );
}
