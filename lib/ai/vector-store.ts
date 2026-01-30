import { prisma } from "@/lib/prisma"; // Assuming global prisma client exists here

export async function saveVector(content: string, metadata: Record<string, unknown>, embedding: number[]) {
    // Convert embedding array to string format "[0.1, 0.2, ...]" for SQL
    const vectorString = `[${embedding.join(",")}]`;

    // Use executeRaw for insertion because Prisma doesn't fully support vector types in create() yet without typed sql
    await prisma.$executeRaw`
    INSERT INTO "SearchIndex" (id, content, metadata, embedding, "createdAt")
    VALUES (${crypto.randomUUID()}, ${content}, ${metadata}, ${vectorString}::vector, NOW())
  `;
}

export async function searchVectors(embedding: number[], limit: number = 5, minSimilarity: number = 0.5) {
    const vectorString = `[${embedding.join(",")}]`;

    // Query using cosine distance (<=>)
    // Distance is 0 to 2 (for normalized). Similarity = 1 - distance/2 or similar depending on metric.
    // For cosine distance: 0 is identical, 2 is opposite.
    // We want closest matches (smallest distance).

    const results = await prisma.$queryRaw`
    SELECT id, content, metadata, 
           1 - (embedding <=> ${vectorString}::vector) as similarity
    FROM "SearchIndex"
    WHERE 1 - (embedding <=> ${vectorString}::vector) > ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${limit};
  `;

    return results as Array<{ id: string; content: string; metadata: Record<string, unknown>; similarity: number }>;
}

export async function deleteVectorByResourceId(resourceId: string) {
    // Assuming metadata contains { resourceId: "..." }
    // Since metadata is JSONB, we can query it.

    await prisma.$executeRaw`
    DELETE FROM "SearchIndex"
    WHERE metadata->>'resourceId' = ${resourceId}
  `;
}
