import { getAgentStore } from "@/lib/ai/store";
import {
  familyTreeImportDraftRecordSchema,
  type FamilyTreeImportDraftRecord,
} from "@/lib/ai/family-tree-import-schema";

function importDraftNamespace(userId: string, treeId: string) {
  return [userId, treeId, "import-drafts"];
}

function threadImportNamespace(userId: string, treeId: string) {
  return [userId, treeId, "thread-import-drafts"];
}

export async function saveImportDraft(record: FamilyTreeImportDraftRecord): Promise<void> {
  const store = await getAgentStore();
  await store.put(importDraftNamespace(record.createdByUserId, record.treeId), record.id, record, false);
}

export async function getImportDraft(
  userId: string,
  treeId: string,
  draftId: string
): Promise<FamilyTreeImportDraftRecord | null> {
  const store = await getAgentStore();
  const item = await store.get(importDraftNamespace(userId, treeId), draftId);

  if (!item) {
    return null;
  }

  const parsed = familyTreeImportDraftRecordSchema.safeParse(item.value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function setThreadImportDraft(
  userId: string,
  treeId: string,
  threadId: string,
  draftId: string
): Promise<void> {
  const store = await getAgentStore();
  await store.put(
    threadImportNamespace(userId, treeId),
    threadId,
    {
      draftId,
      updatedAt: new Date().toISOString(),
    },
    false
  );
}

export async function getThreadImportDraftId(
  userId: string,
  treeId: string,
  threadId: string
): Promise<string | null> {
  const store = await getAgentStore();
  const item = await store.get(threadImportNamespace(userId, treeId), threadId);

  if (!item) {
    return null;
  }

  const draftId = item.value.draftId;
  return typeof draftId === "string" && draftId.length > 0 ? draftId : null;
}

export async function clearThreadImportDraft(
  userId: string,
  treeId: string,
  threadId: string
): Promise<void> {
  const store = await getAgentStore();
  await store.delete(threadImportNamespace(userId, treeId), threadId);
}

export async function resolveActiveImportDraft(
  userId: string,
  treeId: string,
  options: {
    draftId?: string | null;
    threadId?: string | null;
  }
): Promise<FamilyTreeImportDraftRecord | null> {
  const candidateDraftId =
    options.draftId ??
    (options.threadId ? await getThreadImportDraftId(userId, treeId, options.threadId) : null);

  if (!candidateDraftId) {
    return null;
  }

  const record = await getImportDraft(userId, treeId, candidateDraftId);

  if (!record || record.status !== "ACTIVE") {
    return null;
  }

  return record;
}
