type ActiveStoryRun = {
  jobId: string;
  controller: AbortController;
};

const activeStoryRuns = new Map<string, ActiveStoryRun>();

export function registerActiveStoryRun(
  memberId: string,
  jobId: string,
  controller: AbortController
) {
  const existing = activeStoryRuns.get(memberId);
  if (existing && existing.jobId !== jobId && !existing.controller.signal.aborted) {
    existing.controller.abort(`Story run ${existing.jobId} superseded by ${jobId}`);
  }

  activeStoryRuns.set(memberId, { jobId, controller });
}

export function abortActiveStoryRun(memberId: string, reason: string) {
  const activeRun = activeStoryRuns.get(memberId);
  if (!activeRun || activeRun.controller.signal.aborted) {
    return false;
  }

  activeRun.controller.abort(reason);
  return true;
}

export function clearActiveStoryRun(memberId: string, jobId?: string) {
  const activeRun = activeStoryRuns.get(memberId);
  if (!activeRun) {
    return;
  }

  if (!jobId || activeRun.jobId === jobId) {
    activeStoryRuns.delete(memberId);
  }
}

export function getActiveStoryRun(memberId: string) {
  return activeStoryRuns.get(memberId);
}
