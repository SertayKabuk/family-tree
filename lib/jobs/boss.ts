import { PgBoss } from "pg-boss";

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    monitorIntervalSeconds: 30,
    persistWarnings: true,
  });

  boss.on("error", (error) => {
    console.error("[pg-boss] Error:", error);
  });

  boss.on("monitor-states", (states) => {
    console.log("[pg-boss] Queue states:", JSON.stringify(states));
  });

  await boss.start();
  console.log("[pg-boss] Started");

  return boss;
}
