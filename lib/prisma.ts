import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDmmfSignature: string | undefined;
};

function getPrismaDmmfSignature() {
  return JSON.stringify(
    Prisma.dmmf.datamodel.models.map((model) => ({
      name: model.name,
      fields: model.fields.map((field) => ({
        name: field.name,
        kind: field.kind,
        type: field.type,
        isList: field.isList,
        isRequired: field.isRequired,
      })),
    }))
  );
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  if (env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  const nextSignature = getPrismaDmmfSignature();

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaDmmfSignature === nextSignature
  ) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch((error: unknown) => {
      console.warn("Failed to disconnect stale Prisma client during reload:", error);
    });
  }

  const prisma = createPrismaClient();
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDmmfSignature = nextSignature;

  return prisma;
}

export const prisma = getPrismaClient();
