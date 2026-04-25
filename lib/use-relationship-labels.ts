"use client";

import { useTranslations } from "next-intl";
import { Gender, RelationshipType } from "@prisma/client";

/**
 * Returns the role of the *other* person in a relationship, relative to the
 * current member. Directional relationships (parent-child types) flip
 * depending on whether the other person is on the FROM side (parent) or the
 * TO side (child).
 *
 * @param type        Relationship type
 * @param otherGender Gender of the *other* person (the one being labeled)
 * @param options.otherIsFrom  True if the other person is the FROM (parent)
 *                             side of the original relationship; false if
 *                             they are the TO (child) side. Defaults to true
 *                             so the label describes "FROM is X of TO" — the
 *                             form used by edge labels.
 */
export function useRelationshipLabels() {
  const t = useTranslations();

  const getRelationshipLabel = (
    type: RelationshipType | string,
    otherGender?: Gender,
    options?: { otherIsFrom?: boolean }
  ): string => {
    const labels = t.raw("relationships.labels") as Record<string, string>;
    const otherIsFrom = options?.otherIsFrom ?? true;

    const childLabel = () => {
      if (otherGender === "MALE") return labels.son;
      if (otherGender === "FEMALE") return labels.daughter;
      return labels.child;
    };

    switch (type) {
      case "PARENT_CHILD":
        if (otherIsFrom) {
          if (otherGender === "MALE") return labels.father;
          if (otherGender === "FEMALE") return labels.mother;
          return labels.parent;
        }
        return childLabel();
      case "ADOPTIVE_PARENT":
        if (otherIsFrom) {
          if (otherGender === "MALE") return labels.adoptiveFather;
          if (otherGender === "FEMALE") return labels.adoptiveMother;
          return labels.adoptiveParent;
        }
        return childLabel();
      case "FOSTER_PARENT":
        if (otherIsFrom) {
          if (otherGender === "MALE") return labels.fosterFather;
          if (otherGender === "FEMALE") return labels.fosterMother;
          return labels.fosterParent;
        }
        return childLabel();
      case "GODPARENT":
        if (otherIsFrom) {
          if (otherGender === "MALE") return labels.godfather;
          if (otherGender === "FEMALE") return labels.godmother;
          return labels.godparent;
        }
        return childLabel();
      case "SPOUSE":
        return labels.spouse;
      case "PARTNER":
        return labels.partner;
      case "EX_SPOUSE":
        return labels.exSpouse;
      case "SIBLING":
        if (otherGender === "MALE") return labels.brother;
        if (otherGender === "FEMALE") return labels.sister;
        return labels.sibling;
      case "HALF_SIBLING":
        return labels.halfSibling;
      case "STEP_SIBLING":
        return labels.stepSibling;
      default:
        return type;
    }
  };

  return { getRelationshipLabel };
}
