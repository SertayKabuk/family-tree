import { Gender, RelationshipType } from "@prisma/client";

// Color scheme for gender-based node styling
export const GENDER_COLORS: Record<Gender, {
  background: string;
  border: string;
  text: string;
  ring: string;
}> = {
  MALE: {
    background: "rgb(219 234 254)", // blue-100
    border: "rgb(59 130 246)",      // blue-500
    text: "rgb(30 64 175)",         // blue-800
    ring: "rgb(147 197 253)",       // blue-300
  },
  FEMALE: {
    background: "rgb(252 231 243)", // pink-100
    border: "rgb(236 72 153)",      // pink-500
    text: "rgb(157 23 77)",         // pink-800
    ring: "rgb(249 168 212)",       // pink-300
  },
  OTHER: {
    background: "rgb(243 232 255)", // purple-100
    border: "rgb(168 85 247)",      // purple-500
    text: "rgb(88 28 135)",         // purple-800
    ring: "rgb(216 180 254)",       // purple-300
  },
  UNKNOWN: {
    background: "rgb(243 244 246)", // gray-100
    border: "rgb(107 114 128)",     // gray-500
    text: "rgb(31 41 55)",          // gray-800
    ring: "rgb(209 213 219)",       // gray-300
  },
};

// Color scheme for relationship edges
export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  PARENT_CHILD: "#22c55e",    // green-500
  SPOUSE: "#f59e0b",          // amber-500
  PARTNER: "#eab308",         // yellow-500
  EX_SPOUSE: "#94a3b8",       // slate-400
  SIBLING: "#3b82f6",         // blue-500
  HALF_SIBLING: "#60a5fa",    // blue-400
  STEP_SIBLING: "#93c5fd",    // blue-300
  ADOPTIVE_PARENT: "#10b981", // emerald-500
  FOSTER_PARENT: "#14b8a6",   // teal-500
  GODPARENT: "#8b5cf6",       // violet-500
};

// Get relationship label for display
export function getRelationshipLabel(
  type: RelationshipType,
  fromGender?: Gender,
  toGender?: Gender
): string {
  switch (type) {
    case "PARENT_CHILD":
      if (fromGender === "MALE") return "Father";
      if (fromGender === "FEMALE") return "Mother";
      return "Parent";
    case "SPOUSE":
      return "Spouse";
    case "PARTNER":
      return "Partner";
    case "EX_SPOUSE":
      return "Ex-Spouse";
    case "SIBLING":
      if (toGender === "MALE") return "Brother";
      if (toGender === "FEMALE") return "Sister";
      return "Sibling";
    case "HALF_SIBLING":
      return "Half-Sibling";
    case "STEP_SIBLING":
      return "Step-Sibling";
    case "ADOPTIVE_PARENT":
      if (fromGender === "MALE") return "Adoptive Father";
      if (fromGender === "FEMALE") return "Adoptive Mother";
      return "Adoptive Parent";
    case "FOSTER_PARENT":
      if (fromGender === "MALE") return "Foster Father";
      if (fromGender === "FEMALE") return "Foster Mother";
      return "Foster Parent";
    case "GODPARENT":
      if (fromGender === "MALE") return "Godfather";
      if (fromGender === "FEMALE") return "Godmother";
      return "Godparent";
    default:
      return type;
  }
}
