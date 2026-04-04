import { Gender, RelationshipType } from "@prisma/client";
import { z } from "zod";

export const importWarningSeveritySchema = z.enum(["info", "warning", "error"]);

export const importDraftWarningSchema = z.object({
  code: z.string().min(1),
  severity: importWarningSeveritySchema.default("warning"),
  message: z.string().min(1),
});

export const importDuplicateCandidateSchema = z.object({
  memberId: z.string().min(1),
  displayName: z.string().min(1),
  birthDate: z.string().datetime().nullable().default(null),
  deathDate: z.string().datetime().nullable().default(null),
  reason: z.string().min(1),
});

export const importDraftMemberSchema = z.object({
  tempId: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).nullable().default(null),
  nickname: z.string().max(100).nullable().default(null),
  gender: z.enum(Gender).default("UNKNOWN"),
  relationToRoot: z.string().max(200).nullable().default(null),
  birthDateText: z.string().max(100).nullable().default(null),
  deathDateText: z.string().max(100).nullable().default(null),
  birthDate: z.string().datetime().nullable().default(null),
  deathDate: z.string().datetime().nullable().default(null),
  birthPlace: z.string().max(200).nullable().default(null),
  deathPlace: z.string().max(200).nullable().default(null),
  occupation: z.string().max(200).nullable().default(null),
  bio: z.string().max(4000).nullable().default(null),
  duplicateCandidates: z.array(importDuplicateCandidateSchema).default([]),
});

export const importDraftRelationshipSchema = z.object({
  fromTempId: z.string().min(1),
  toTempId: z.string().min(1),
  type: z.enum(RelationshipType),
  notes: z.string().max(500).nullable().default(null),
});

export const extractedImportMemberSchema = z.object({
  tempId: z.string().min(1).optional(),
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  relationToRoot: z.string().nullable().optional(),
  birthDateText: z.string().nullable().optional(),
  deathDateText: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  deathPlace: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});

export const extractedImportRelationshipSchema = z.object({
  fromTempId: z.string().min(1),
  toTempId: z.string().min(1),
  type: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export const extractedImportWarningSchema = z.union([
  z.string().min(1),
  z.object({
    code: z.string().optional(),
    severity: z.string().optional(),
    message: z.string().min(1),
  }),
]);

export const extractedFamilyTreeImportSchema = z.object({
  rootPersonTempId: z.string().nullable().optional(),
  members: z.array(extractedImportMemberSchema).min(1),
  relationships: z.array(extractedImportRelationshipSchema).default([]),
  warnings: z.array(extractedImportWarningSchema).default([]),
});

export const familyTreeImportDraftSchema = z.object({
  sourceFileName: z.string().min(1),
  sourceMimeType: z.string().min(1),
  rootPersonTempId: z.string().nullable().default(null),
  members: z.array(importDraftMemberSchema).min(1),
  relationships: z.array(importDraftRelationshipSchema).default([]),
  warnings: z.array(importDraftWarningSchema).default([]),
});

export const familyTreeImportDraftStatusSchema = z.enum(["ACTIVE", "COMMITTED"]);

export const familyTreeImportCommitResultSchema = z.object({
  createdMembers: z.number().int().nonnegative(),
  createdRelationships: z.number().int().nonnegative(),
});

export const familyTreeImportDraftRecordSchema = z.object({
  id: z.string().min(1),
  treeId: z.string().min(1),
  threadId: z.string().nullable().default(null),
  createdByUserId: z.string().min(1),
  status: familyTreeImportDraftStatusSchema.default("ACTIVE"),
  draft: familyTreeImportDraftSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  committedAt: z.string().datetime().nullable().default(null),
  commitResult: familyTreeImportCommitResultSchema.nullable().default(null),
});

export type ImportDraftWarning = z.infer<typeof importDraftWarningSchema>;
export type ImportDuplicateCandidate = z.infer<typeof importDuplicateCandidateSchema>;
export type ImportDraftMember = z.infer<typeof importDraftMemberSchema>;
export type ImportDraftRelationship = z.infer<typeof importDraftRelationshipSchema>;
export type ExtractedImportMember = z.infer<typeof extractedImportMemberSchema>;
export type ExtractedImportRelationship = z.infer<typeof extractedImportRelationshipSchema>;
export type ExtractedFamilyTreeImport = z.infer<typeof extractedFamilyTreeImportSchema>;
export type FamilyTreeImportDraft = z.infer<typeof familyTreeImportDraftSchema>;
export type FamilyTreeImportDraftStatus = z.infer<typeof familyTreeImportDraftStatusSchema>;
export type FamilyTreeImportDraftRecord = z.infer<typeof familyTreeImportDraftRecordSchema>;
export type FamilyTreeImportCommitResult = z.infer<typeof familyTreeImportCommitResultSchema>;
