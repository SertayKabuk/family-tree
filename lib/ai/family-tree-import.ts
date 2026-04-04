import { ChatGoogle } from "@langchain/google";
import { HumanMessage } from "@langchain/core/messages";
import { Gender, RelationshipType } from "@prisma/client";
import { env } from "@/lib/env";
import {
  extractedFamilyTreeImportSchema,
  familyTreeImportDraftSchema,
  importDraftWarningSchema,
  type ExtractedFamilyTreeImport,
  type ExtractedImportMember,
  type ExtractedImportRelationship,
  type FamilyTreeImportDraft,
  type FamilyTreeImportDraftRecord,
  type ImportDraftMember,
  type ImportDraftRelationship,
  type ImportDraftWarning,
} from "@/lib/ai/family-tree-import-schema";

const FAMILY_TREE_IMPORT_PROMPT = `Türk devlet kurumu tarafından dışa aktarılmış bir soy ağacı görselini analiz ediyorsun.

Görev:
- Kutulardaki kişi bilgilerini oku.
- Bağlantı çizgilerini izleyerek kişiler arasındaki DOĞRUDAN ilişkileri çıkar.
- Varsa kişinin kök kişiye göre akrabalık etiketini de ekle.
- Belirsiz veya okunamayan alanları uydurma; bunun yerine warnings listesine not düş.
- Aynı kişiyi birden fazla kez üretmemeye çalış.

Çok önemli kurallar:
- Yanıtını verilen yapılandırılmış çıktı şemasına uygun doldur.
- İlişkileri sadece kök kişiye göre metin olarak değil, üyeler arası doğrudan kenarlar olarak ver.
- parent -> child yönü kullan.
- Eş ilişkileri için SPOUSE kullan.
- Bilinmeyen cinsiyet için UNKNOWN kullan.
- Tarih metnini birthDateText / deathDateText alanlarına ham haliyle yaz.
- Eğer doğrudan doğum/ölüm yeri görünüyorsa birthPlace / deathPlace alanına yaz.
`;

const RELATIONSHIP_TYPE_ALIASES: Record<string, RelationshipType> = {
  PARENT_CHILD: "PARENT_CHILD",
  PARENT: "PARENT_CHILD",
  CHILD: "PARENT_CHILD",
  SPOUSE: "SPOUSE",
  WIFE: "SPOUSE",
  HUSBAND: "SPOUSE",
  PARTNER: "PARTNER",
  EX_SPOUSE: "EX_SPOUSE",
  EXSPOUSE: "EX_SPOUSE",
  SIBLING: "SIBLING",
  BROTHER: "SIBLING",
  SISTER: "SIBLING",
  HALF_SIBLING: "HALF_SIBLING",
  HALFSIBLING: "HALF_SIBLING",
  STEP_SIBLING: "STEP_SIBLING",
  STEPSIBLING: "STEP_SIBLING",
  ADOPTIVE_PARENT: "ADOPTIVE_PARENT",
  ADOPTIVEPARENT: "ADOPTIVE_PARENT",
  FOSTER_PARENT: "FOSTER_PARENT",
  FOSTERPARENT: "FOSTER_PARENT",
  GODPARENT: "GODPARENT",
};

const GENDER_ALIASES: Record<string, Gender> = {
  MALE: "MALE",
  ERKEK: "MALE",
  M: "MALE",
  FEMALE: "FEMALE",
  KADIN: "FEMALE",
  KIZ: "FEMALE",
  F: "FEMALE",
  OTHER: "OTHER",
  DIGER: "OTHER",
  DİĞER: "OTHER",
  UNKNOWN: "UNKNOWN",
  BELIRSIZ: "UNKNOWN",
  BELİRSİZ: "UNKNOWN",
  BILINMIYOR: "UNKNOWN",
  BİLİNMİYOR: "UNKNOWN",
};

const MAX_PREVIEW_MEMBERS = 12;
const MAX_PREVIEW_RELATIONSHIPS = 12;
const MAX_PREVIEW_WARNINGS = 8;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toNullableString(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeDateText(value: string | null | undefined): string | null {
  return toNullableString(value, 100);
}

function createWarning(code: string, message: string, severity: ImportDraftWarning["severity"] = "warning"): ImportDraftWarning {
  return importDraftWarningSchema.parse({ code, message, severity });
}

function normalizeGender(value: string | null | undefined): Gender {
  if (!value) {
    return "UNKNOWN";
  }

  const key = normalizeWhitespace(value)
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-ZÇĞİÖŞÜ_]/g, "");

  return GENDER_ALIASES[key] ?? "UNKNOWN";
}

function normalizeRelationshipType(value: string | null | undefined): RelationshipType | null {
  if (!value) {
    return null;
  }

  const key = normalizeWhitespace(value)
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-ZÇĞİÖŞÜ_]/g, "");

  return RELATIONSHIP_TYPE_ALIASES[key] ?? null;
}

function parseTurkishDateToIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value)
    .replace(/[–—]/g, "-")
    .replace(/\//g, ".");

  const fullDateMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (fullDateMatch) {
    const [, dayText, monthText, yearText] = fullDateMatch;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date.toISOString();
    }
  }

  const isoDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, yearText, monthText, dayText] = isoDateMatch;
    const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function normalizeWarningInput(value: ExtractedFamilyTreeImport["warnings"][number], index: number): ImportDraftWarning {
  if (typeof value === "string") {
    return createWarning(`model-warning-${index + 1}`, normalizeWhitespace(value));
  }

  return createWarning(
    value.code ? normalizeWhitespace(value.code) : `model-warning-${index + 1}`,
    normalizeWhitespace(value.message),
    value.severity === "info" || value.severity === "error" || value.severity === "warning"
      ? value.severity
      : "warning"
  );
}

function normalizeMember(
  member: ExtractedImportMember,
  index: number,
  warnings: ImportDraftWarning[]
): ImportDraftMember {
  const birthDateText = normalizeDateText(member.birthDateText ?? null);
  const deathDateText = normalizeDateText(member.deathDateText ?? null);
  const birthDate = parseTurkishDateToIso(birthDateText);
  const deathDate = parseTurkishDateToIso(deathDateText);

  if (birthDateText && !birthDate) {
    warnings.push(
      createWarning(
        `birth-date-${index + 1}`,
        `${member.firstName} için doğum tarihi çözümlenemedi: ${birthDateText}`
      )
    );
  }

  if (deathDateText && !deathDate) {
    warnings.push(
      createWarning(
        `death-date-${index + 1}`,
        `${member.firstName} için ölüm tarihi çözümlenemedi: ${deathDateText}`
      )
    );
  }

  return {
    tempId: toNullableString(member.tempId ?? null, 100) ?? `member-${index + 1}`,
    firstName: normalizeWhitespace(member.firstName).slice(0, 100),
    lastName: toNullableString(member.lastName ?? null, 100),
    nickname: toNullableString(member.nickname ?? null, 100),
    gender: normalizeGender(member.gender),
    relationToRoot: toNullableString(member.relationToRoot ?? null, 200),
    birthDateText,
    deathDateText,
    birthDate,
    deathDate,
    birthPlace: toNullableString(member.birthPlace ?? null, 200),
    deathPlace: toNullableString(member.deathPlace ?? null, 200),
    occupation: toNullableString(member.occupation ?? null, 200),
    bio: toNullableString(member.bio ?? null, 4000),
    duplicateCandidates: [],
  };
}

function normalizeRelationships(
  relationships: ExtractedImportRelationship[],
  memberIds: Set<string>,
  warnings: ImportDraftWarning[]
): ImportDraftRelationship[] {
  const uniqueKeys = new Set<string>();
  const normalized: ImportDraftRelationship[] = [];

  relationships.forEach((relationship, index) => {
    const type = normalizeRelationshipType(relationship.type);
    if (!type) {
      warnings.push(
        createWarning(
          `relationship-type-${index + 1}`,
          `Bilinmeyen ilişki türü atlandı: ${relationship.type}`
        )
      );
      return;
    }

    if (!memberIds.has(relationship.fromTempId) || !memberIds.has(relationship.toTempId)) {
      warnings.push(
        createWarning(
          `relationship-member-${index + 1}`,
          `Eksik üye referansı olan bir ilişki atlandı: ${relationship.fromTempId} -> ${relationship.toTempId}`
        )
      );
      return;
    }

    if (relationship.fromTempId === relationship.toTempId) {
      warnings.push(
        createWarning(
          `relationship-self-${index + 1}`,
          `Kendi kendine ilişki atlandı: ${relationship.fromTempId}`
        )
      );
      return;
    }

    const key = `${relationship.fromTempId}:${relationship.toTempId}:${type}`;
    if (uniqueKeys.has(key)) {
      return;
    }

    uniqueKeys.add(key);
    normalized.push({
      fromTempId: relationship.fromTempId,
      toTempId: relationship.toTempId,
      type,
      notes: toNullableString(relationship.notes ?? null, 500),
    });
  });

  return normalized;
}

export async function parseFamilyTreeImageDraft(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<FamilyTreeImportDraft> {
  const model = new ChatGoogle({
    model: env.GOOGLE_LLM_MODEL,
    apiKey: env.GOOGLE_API_KEY,
  }).withStructuredOutput(extractedFamilyTreeImportSchema);

  const extracted = extractedFamilyTreeImportSchema.parse(await model.invoke([
    new HumanMessage({
      contentBlocks: [
        { type: "text", text: FAMILY_TREE_IMPORT_PROMPT },
        {
          type: "image",
          mimeType: input.mimeType,
          data: input.buffer.toString("base64"),
        },
      ],
    }),
  ]));

  return normalizeExtractedImport(extracted, {
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
}

export function normalizeExtractedImport(
  extracted: ExtractedFamilyTreeImport,
  file: { fileName: string; mimeType: string }
): FamilyTreeImportDraft {
  const warnings = extracted.warnings.map(normalizeWarningInput);
  const normalizedMembers = extracted.members.map((member, index) => normalizeMember(member, index, warnings));

  const seenTempIds = new Set<string>();
  const members = normalizedMembers.map((member, index) => {
    let tempId = member.tempId;
    while (seenTempIds.has(tempId)) {
      tempId = `${member.tempId}-${index + 1}`;
    }
    seenTempIds.add(tempId);

    return tempId === member.tempId ? member : { ...member, tempId };
  });

  const memberIds = new Set(members.map((member) => member.tempId));
  const relationships = normalizeRelationships(extracted.relationships, memberIds, warnings);

  const rootPersonTempId =
    extracted.rootPersonTempId && memberIds.has(extracted.rootPersonTempId)
      ? extracted.rootPersonTempId
      : members[0]?.tempId ?? null;

  return familyTreeImportDraftSchema.parse({
    sourceFileName: file.fileName,
    sourceMimeType: file.mimeType,
    rootPersonTempId,
    members,
    relationships,
    warnings,
  });
}

function normalizeComparableName(member: {
  firstName: string;
  lastName: string | null;
}) {
  return normalizeWhitespace(`${member.firstName} ${member.lastName ?? ""}`)
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function sameIsoDay(left: string | Date | null, right: string | Date | null): boolean {
  if (!left || !right) {
    return false;
  }

  const leftIso = typeof left === "string" ? left : left.toISOString();
  const rightIso = typeof right === "string" ? right : right.toISOString();

  return leftIso.slice(0, 10) === rightIso.slice(0, 10);
}

export function attachDuplicateCandidates(
  draft: FamilyTreeImportDraft,
  existingMembers: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    birthDate: Date | null;
    deathDate: Date | null;
  }>
): FamilyTreeImportDraft {
  const warnings = [...draft.warnings];

  const members = draft.members.map((member) => {
    const comparableName = normalizeComparableName(member);
    const duplicateCandidates = existingMembers
      .filter((existingMember) => normalizeComparableName(existingMember) === comparableName)
      .map((existingMember) => {
        const birthDateMatch = sameIsoDay(member.birthDate, existingMember.birthDate);
        const deathDateMatch = sameIsoDay(member.deathDate, existingMember.deathDate);

        let reason = "Exact full-name match in the current tree";
        if (birthDateMatch && deathDateMatch) {
          reason = "Exact full-name match with matching birth and death dates";
        } else if (birthDateMatch) {
          reason = "Exact full-name match with matching birth date";
        } else if (deathDateMatch) {
          reason = "Exact full-name match with matching death date";
        }

        return {
          memberId: existingMember.id,
          displayName: normalizeWhitespace(`${existingMember.firstName} ${existingMember.lastName ?? ""}`),
          birthDate: existingMember.birthDate?.toISOString() ?? null,
          deathDate: existingMember.deathDate?.toISOString() ?? null,
          reason,
        };
      });

    if (duplicateCandidates.length > 0) {
      warnings.push(
        createWarning(
          `duplicate-${member.tempId}`,
          `${member.firstName} için mevcut ağaçta ${duplicateCandidates.length} olası eşleşme bulundu.`
        )
      );
    }

    return {
      ...member,
      duplicateCandidates,
    };
  });

  return familyTreeImportDraftSchema.parse({
    ...draft,
    members,
    warnings,
  });
}

function formatMemberForPreview(member: ImportDraftMember): string {
  const displayName = normalizeWhitespace(`${member.firstName} ${member.lastName ?? ""}`);
  const detailParts = [member.relationToRoot, member.birthDateText, member.birthPlace]
    .filter((value): value is string => Boolean(value));

  return detailParts.length > 0 ? `${displayName} — ${detailParts.join(" • ")}` : displayName;
}

function formatRelationshipForPreview(
  relationship: ImportDraftRelationship,
  membersById: Map<string, ImportDraftMember>
): string {
  const fromName = membersById.get(relationship.fromTempId);
  const toName = membersById.get(relationship.toTempId);
  const fromLabel = fromName ? normalizeWhitespace(`${fromName.firstName} ${fromName.lastName ?? ""}`) : relationship.fromTempId;
  const toLabel = toName ? normalizeWhitespace(`${toName.firstName} ${toName.lastName ?? ""}`) : relationship.toTempId;
  return `${fromLabel} → ${toLabel} (${relationship.type})`;
}

export function buildImportDraftSummary(record: FamilyTreeImportDraftRecord): string {
  const { draft } = record;
  const membersById = new Map(draft.members.map((member) => [member.tempId, member]));
  const rootPerson = draft.rootPersonTempId ? membersById.get(draft.rootPersonTempId) : null;
  const duplicateMembers = draft.members.filter((member) => member.duplicateCandidates.length > 0);

  const lines: string[] = [
    `Import draft: ${draft.members.length} people, ${draft.relationships.length} relationships.`,
  ];

  if (rootPerson) {
    lines.push(
      `Root person: ${normalizeWhitespace(`${rootPerson.firstName} ${rootPerson.lastName ?? ""}`)}.`
    );
  }

  if (record.status === "COMMITTED" && record.commitResult) {
    lines.push(
      `Already imported: ${record.commitResult.createdMembers} members and ${record.commitResult.createdRelationships} relationships were created.`
    );
  }

  if (duplicateMembers.length > 0) {
    lines.push("Possible duplicates:");
    duplicateMembers.slice(0, MAX_PREVIEW_WARNINGS).forEach((member) => {
      const candidatePreview = member.duplicateCandidates
        .slice(0, 2)
        .map((candidate) => `${candidate.displayName} (${candidate.reason})`)
        .join("; ");
      lines.push(`- ${formatMemberForPreview(member)} => ${candidatePreview}`);
    });
    if (duplicateMembers.length > MAX_PREVIEW_WARNINGS) {
      lines.push(`- ${duplicateMembers.length - MAX_PREVIEW_WARNINGS} more members have duplicate warnings.`);
    }
  }

  if (draft.warnings.length > 0) {
    lines.push("Warnings:");
    draft.warnings.slice(0, MAX_PREVIEW_WARNINGS).forEach((warning) => {
      lines.push(`- ${warning.message}`);
    });
    if (draft.warnings.length > MAX_PREVIEW_WARNINGS) {
      lines.push(`- ${draft.warnings.length - MAX_PREVIEW_WARNINGS} more warnings omitted for brevity.`);
    }
  }

  lines.push("People preview:");
  draft.members.slice(0, MAX_PREVIEW_MEMBERS).forEach((member) => {
    lines.push(`- ${formatMemberForPreview(member)}`);
  });
  if (draft.members.length > MAX_PREVIEW_MEMBERS) {
    lines.push(`- ${draft.members.length - MAX_PREVIEW_MEMBERS} more people omitted for brevity.`);
  }

  if (draft.relationships.length > 0) {
    lines.push("Relationship preview:");
    draft.relationships.slice(0, MAX_PREVIEW_RELATIONSHIPS).forEach((relationship) => {
      lines.push(`- ${formatRelationshipForPreview(relationship, membersById)}`);
    });
    if (draft.relationships.length > MAX_PREVIEW_RELATIONSHIPS) {
      lines.push(`- ${draft.relationships.length - MAX_PREVIEW_RELATIONSHIPS} more relationships omitted for brevity.`);
    }
  }

  lines.push("This is still a draft. Ask the user to confirm before importing.");
  return lines.join("\n");
}

export function buildImportDraftPreview(draft: FamilyTreeImportDraft) {
  const rootPerson = draft.rootPersonTempId
    ? draft.members.find((member) => member.tempId === draft.rootPersonTempId) ?? null
    : null;

  return {
    memberCount: draft.members.length,
    relationshipCount: draft.relationships.length,
    warningCount: draft.warnings.length,
    duplicateCount: draft.members.filter((member) => member.duplicateCandidates.length > 0).length,
    rootPerson: rootPerson
      ? normalizeWhitespace(`${rootPerson.firstName} ${rootPerson.lastName ?? ""}`)
      : null,
  };
}
