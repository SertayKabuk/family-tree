import { tool } from "@langchain/core/tools";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import {
  buildImportDraftSummary,
} from "@/lib/ai/family-tree-import";
import {
  clearThreadImportDraft,
  resolveActiveImportDraft,
  saveImportDraft,
} from "@/lib/ai/family-tree-import-store";
import type {
  FamilyTreeImportDraftRecord,
  ImportDraftMember,
  ImportDraftRelationship,
} from "@/lib/ai/family-tree-import-schema";
import { z } from "zod";

interface CreateFamilyTreeImportToolsOptions {
  treeId: string;
  userId: string;
  threadId: string | null;
  importDraftId: string | null;
  messages: Array<{ role: string; content: string }>;
}

function hasExplicitImportConfirmation(messages: Array<{ role: string; content: string }>): boolean {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user" && typeof message.content === "string");

  if (!latestUserMessage) {
    return false;
  }

  const normalized = latestUserMessage.content.toLocaleLowerCase("tr-TR");
  return [
    /\bonay\b/,
    /\biçe aktar\b/,
    /\baktar\b/,
    /\bdevam et\b/,
    /\bbaşla\b/,
    /\bimport\b/,
    /\bproceed\b/,
    /\bgo ahead\b/,
    /\bconfirm\b/,
    /\byes\b/,
    /\bevet\b/,
  ].some((pattern) => pattern.test(normalized));
}

async function commitImportDraft(
  record: FamilyTreeImportDraftRecord,
  treeId: string
): Promise<{ createdMembers: number; createdRelationships: number }> {
  return prisma.$transaction(async (tx) => {
    const createdMembers = await Promise.all(
      record.draft.members.map((member: ImportDraftMember) =>
        tx.familyMember.create({
          data: {
            treeId,
            firstName: member.firstName,
            lastName: member.lastName,
            nickname: member.nickname,
            gender: member.gender,
            birthDate: member.birthDate ? new Date(member.birthDate) : null,
            deathDate: member.deathDate ? new Date(member.deathDate) : null,
            bio: member.bio,
            birthPlace: member.birthPlace,
            deathPlace: member.deathPlace,
            occupation: member.occupation,
          },
        })
      )
    );

    const memberIdMap = new Map(
      record.draft.members.map((member: ImportDraftMember, index: number) => [member.tempId, createdMembers[index].id])
    );

    await Promise.all(
      record.draft.relationships.map((relationship: ImportDraftRelationship) => {
        const fromMemberId = memberIdMap.get(relationship.fromTempId);
        const toMemberId = memberIdMap.get(relationship.toTempId);

        if (!fromMemberId || !toMemberId) {
          throw new Error(`Missing member mapping for relationship ${relationship.fromTempId} -> ${relationship.toTempId}`);
        }

        return tx.relationship.create({
          data: {
            treeId,
            fromMemberId,
            toMemberId,
            type: relationship.type,
          },
        });
      })
    );

    await tx.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    return {
      createdMembers: createdMembers.length,
      createdRelationships: record.draft.relationships.length,
    };
  });
}

export function createFamilyTreeImportTools(options: CreateFamilyTreeImportToolsOptions) {
  const getActiveDraft = async () => {
    return resolveActiveImportDraft(options.userId, options.treeId, {
      draftId: options.importDraftId,
      threadId: options.threadId,
    });
  };

  const reviewImportDraft = tool(
    async () => {
      const record = await getActiveDraft();
      if (!record) {
        return "No active family tree import draft is available for this chat.";
      }

      return buildImportDraftSummary(record);
    },
    {
      name: "review_import_draft",
      description:
        "Review the currently active family-tree image import draft, including extracted people, relationships, warnings, and possible duplicates.",
      schema: z.object({}),
    }
  );

  const commitImportDraftTool = tool(
    async () => {
      const record = await getActiveDraft();
      if (!record) {
        return "No active family tree import draft is available to import.";
      }

      if (record.status !== "ACTIVE") {
        return "This import draft is no longer active.";
      }

      if (!hasExplicitImportConfirmation(options.messages)) {
        return "Explicit user confirmation is required before importing this family tree draft.";
      }

      await requirePermission(options.treeId, "manage_members");
      const result = await commitImportDraft(record, options.treeId);

      const updatedRecord: FamilyTreeImportDraftRecord = {
        ...record,
        status: "COMMITTED",
        updatedAt: new Date().toISOString(),
        committedAt: new Date().toISOString(),
        commitResult: result,
      };

      await Promise.all([
        saveImportDraft(updatedRecord),
        options.threadId
          ? clearThreadImportDraft(options.userId, options.treeId, options.threadId)
          : Promise.resolve(),
      ]);

      return `Import complete. Created ${result.createdMembers} members and ${result.createdRelationships} relationships in the current tree.`;
    },
    {
      name: "commit_import_draft",
      description:
        "Import the active family-tree draft into the current tree after the user has explicitly confirmed the import.",
      schema: z.object({}),
    }
  );

  return [reviewImportDraft, commitImportDraftTool];
}
