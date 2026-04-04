import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTreePermissions } from "@/lib/permissions";
import { ChatClient } from "./chat-client";

interface ChatPageProps {
  params: Promise<{ treeId: string }>;
  searchParams: Promise<{ thread?: string }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { treeId } = await params;
  const { thread } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { hasAccess } = await getTreePermissions(treeId);
  if (!hasAccess) {
    notFound();
  }

  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { id: true, name: true },
  });

  if (!tree) {
    notFound();
  }

  return (
    <ChatClient
      treeId={tree.id}
      treeName={tree.name}
      initialThreadId={thread ?? null}
    />
  );
}
