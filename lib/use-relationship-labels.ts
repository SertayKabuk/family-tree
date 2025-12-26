"use client";

import { useTranslations } from "next-intl";
import { Gender, RelationshipType } from "@prisma/client";

export function useRelationshipLabels() {
  const t = useTranslations();

  const getRelationshipLabel = (
    type: RelationshipType | string,
    fromGender?: Gender,
    toGender?: Gender
  ): string => {
    const labels = t.raw("relationships.labels") as Record<string, string>;

    switch (type) {
      case "PARENT_CHILD":
        if (fromGender === "MALE") return labels.father;
        if (fromGender === "FEMALE") return labels.mother;
        return labels.parent;
      case "SPOUSE":
        return labels.spouse;
      case "PARTNER":
        return labels.partner;
      case "EX_SPOUSE":
        return labels.exSpouse;
      case "SIBLING":
        if (toGender === "MALE") return labels.brother;
        if (toGender === "FEMALE") return labels.sister;
        return labels.sibling;
      case "HALF_SIBLING":
        return labels.halfSibling;
      case "STEP_SIBLING":
        return labels.stepSibling;
      case "ADOPTIVE_PARENT":
        if (fromGender === "MALE") return labels.adoptiveFather;
        if (fromGender === "FEMALE") return labels.adoptiveMother;
        return labels.adoptiveParent;
      case "FOSTER_PARENT":
        if (fromGender === "MALE") return labels.fosterFather;
        if (fromGender === "FEMALE") return labels.fosterMother;
        return labels.fosterParent;
      case "GODPARENT":
        if (fromGender === "MALE") return labels.godfather;
        if (fromGender === "FEMALE") return labels.godmother;
        return labels.godparent;
      default:
        return type;
    }
  };

  return { getRelationshipLabel };
}
