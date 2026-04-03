export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDatabase } = await import("./lib/seed");
    await seedDatabase();

    const { startWorkers } = await import("./lib/jobs/worker");
    await startWorkers();
  }
}
