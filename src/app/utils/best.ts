/** Best run, kept in localStorage when it is available (sandboxed embeds may block it). */
export interface BestRun {
  kills: number;
  time: number;
}

const KEY = "zomzoms.best";
let memory: BestRun = { kills: 0, time: 0 };

export function loadBest(): BestRun {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<BestRun>;
      return { kills: Number(v.kills) || 0, time: Number(v.time) || 0 };
    }
  } catch {
    // Storage unavailable: best score just lasts for this page.
  }
  return memory;
}

/** Records a run; returns true when it beat the previous best kill count. */
export function submitRun(run: BestRun): boolean {
  const best = loadBest();
  const isBest = run.kills > best.kills;
  if (isBest) {
    memory = { ...run };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      // Ignore: memory copy still works for this session.
    }
  }
  return isBest;
}
