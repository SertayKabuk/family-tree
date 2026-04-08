type ActiveTreeStoryRun = {
  jobId: string;
  controller: AbortController;
};

const activeTreeStoryRuns = new Map<string, ActiveTreeStoryRun>();

export function registerActiveTreeStoryRun(
  treeId: string,
  jobId: string,
  controller: AbortController
) {
  const existing = activeTreeStoryRuns.get(treeId);
  if (existing && existing.jobId !== jobId && !existing.controller.signal.aborted) {
    existing.controller.abort(`Tree story run ${existing.jobId} superseded by ${jobId}`);
  }

  activeTreeStoryRuns.set(treeId, { jobId, controller });
}

export function abortActiveTreeStoryRun(treeId: string, reason: string) {
  const activeRun = activeTreeStoryRuns.get(treeId);
  if (!activeRun || activeRun.controller.signal.aborted) {
    return false;
  }

  activeRun.controller.abort(reason);
  return true;
}

export function clearActiveTreeStoryRun(treeId: string, jobId?: string) {
  const activeRun = activeTreeStoryRuns.get(treeId);
  if (!activeRun) {
    return;
  }

  if (!jobId || activeRun.jobId === jobId) {
    activeTreeStoryRuns.delete(treeId);
  }
}
