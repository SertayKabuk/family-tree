import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Safely serialize query results — handles BigInt, Date, null, etc.
function serializeRows(rows: unknown[]): string {
  if (!rows.length) return "No results found.";
  return JSON.stringify(
    rows,
    (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      if (value instanceof Date) return value.toISOString();
      return value;
    },
    2
  );
}

const BLOCKED = /^\s*(insert|update|delete|drop|truncate|alter|create|grant|revoke|exec|execute|call)\s/i;

export function createSqlTools(treeId: string) {
  const executeSql = tool(
    async ({ query }) => {
      if (!query.trim().toLowerCase().startsWith("select")) {
        return "Error: Only SELECT queries are allowed.";
      }
      if (BLOCKED.test(query)) {
        return "Error: Only SELECT queries are allowed.";
      }
      // Ensure query is scoped to the current tree
      if (!query.includes(treeId)) {
        return `Error: Query must be scoped to the current tree. Include "treeId" = '${treeId}' in your WHERE clause.`;
      }
      try {
        const rows = await prisma.$queryRawUnsafe<unknown[]>(query);
        return serializeRows(rows);
      } catch (err) {
        return `SQL Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "execute_sql",
      description:
        "Execute a read-only SELECT query against the PostgreSQL family tree database. " +
        `Always filter by "treeId" = '${treeId}'. Returns JSON rows.`,
      schema: z.object({
        query: z.string().describe(
          `A valid PostgreSQL SELECT query. Must include WHERE "treeId" = '${treeId}'.`
        ),
      }),
    }
  );

  return [executeSql];
}

export function buildSqlSystemPrompt(treeId: string): string {
  return `
## Database Access

You have the \`execute_sql\` tool to query the family tree database directly.

### Rules
- Only SELECT queries are allowed — never INSERT, UPDATE, DELETE, or DDL.
- ALWAYS filter by \`"treeId" = '${treeId}'\` on every table that has a treeId column.
- Table names and column names are **case-sensitive** and must be double-quoted (e.g. \`"FamilyMember"\`, \`"firstName"\`).
- Limit results with \`LIMIT\` when expecting large sets (default to LIMIT 50).

### Tables & Columns

**"FamilyMember"** — People in the tree
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key |
| treeId | text | Foreign key → FamilyTree |
| firstName | text | |
| lastName | text | nullable |
| nickname | text | nullable |
| gender | enum | MALE, FEMALE, OTHER, UNKNOWN |
| birthDate | timestamp | nullable |
| deathDate | timestamp | nullable |
| birthPlace | text | nullable |
| deathPlace | text | nullable |
| occupation | text | nullable |
| bio | text | nullable |

**"Relationship"** — Connections between members
| Column | Type | Notes |
|--------|------|-------|
| id | text | |
| treeId | text | |
| fromMemberId | text | |
| toMemberId | text | |
| type | enum | PARENT_CHILD, SPOUSE, PARTNER, EX_SPOUSE, SIBLING, HALF_SIBLING, STEP_SIBLING, ADOPTIVE_PARENT, FOSTER_PARENT, GODPARENT |
| marriageDate | timestamp | nullable |
| divorceDate | timestamp | nullable |

**"Fact"** — Facts and stories about a member
| Column | Type | Notes |
|--------|------|-------|
| id | text | |
| memberId | text | FK → FamilyMember |
| title | text | |
| content | text | |
| date | timestamp | nullable |
| source | text | nullable |

**"Photo"** — Photos attached to members
| Column | Type | |
|--------|------|-|
| id | text | |
| memberId | text | |
| title | text | nullable |
| description | text | nullable |
| aiDescription | text | AI analysis, nullable |
| takenAt | timestamp | nullable |
| location | text | nullable |

**"Document"** — Documents attached to members
| Column | Type | |
|--------|------|-|
| id | text | |
| memberId | text | |
| title | text | |
| description | text | nullable |
| aiDescription | text | AI analysis, nullable |
| fileType | text | MIME type |
| fileSize | int | bytes |

**"AudioClip"** — Audio recordings
| Column | Type | |
|--------|------|-|
| id | text | |
| memberId | text | |
| title | text | |
| description | text | nullable |
| aiDescription | text | AI transcription/analysis, nullable |
| duration | int | seconds, nullable |
| recordedAt | timestamp | nullable |

**"Story"** — AI-generated stories for members
| Column | Type | |
|--------|------|-|
| id | text | |
| memberId | text | unique |
| content | text | Formal/biographical version |
| narrativeContent | text | Oral storytelling version, nullable |
| status | enum | PENDING, GENERATING, COMPLETED, FAILED |

### Example Queries

\`\`\`sql
-- List all members
SELECT id, "firstName", "lastName", gender, "birthDate", "deathDate", occupation
FROM "FamilyMember"
WHERE "treeId" = '${treeId}'
ORDER BY "birthDate" NULLS LAST
LIMIT 50;

-- Members with their relationship counts
SELECT fm."firstName", fm."lastName",
       COUNT(r.id) AS relationship_count
FROM "FamilyMember" fm
LEFT JOIN "Relationship" r ON r."fromMemberId" = fm.id AND r."treeId" = '${treeId}'
WHERE fm."treeId" = '${treeId}'
GROUP BY fm.id, fm."firstName", fm."lastName"
ORDER BY relationship_count DESC;

-- Find parent-child relationships with names
SELECT
  p."firstName" || ' ' || COALESCE(p."lastName", '') AS parent,
  c."firstName" || ' ' || COALESCE(c."lastName", '') AS child
FROM "Relationship" r
JOIN "FamilyMember" p ON r."fromMemberId" = p.id
JOIN "FamilyMember" c ON r."toMemberId" = c.id
WHERE r."treeId" = '${treeId}' AND r.type = 'PARENT_CHILD';

-- Members with photos and facts
SELECT fm."firstName", fm."lastName",
       COUNT(DISTINCT ph.id) AS photo_count,
       COUNT(DISTINCT f.id)  AS fact_count
FROM "FamilyMember" fm
LEFT JOIN "Photo" ph ON ph."memberId" = fm.id
LEFT JOIN "Fact"  f  ON f."memberId"  = fm.id
WHERE fm."treeId" = '${treeId}'
GROUP BY fm.id, fm."firstName", fm."lastName";
\`\`\`
`.trim();
}
