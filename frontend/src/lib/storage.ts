import type { CheckIn } from "./checkin";
import type { Translation } from "./translation";
import type { PlanResult } from "./types";

// Everything stays in this browser. Nothing is sent to or stored on a server.
const KEY = "carebridge:v1";

export interface Saved {
  result: PlanResult;
  checkIns: CheckIn[];
  /** The chosen language and its cached translation, if not English. */
  language?: string;
  translation?: Translation;
}

function isSaved(value: unknown): value is Saved {
  const saved = value as Saved;
  const plan = saved?.result?.plan;
  // Plans saved before key points existed are ignored rather than shown broken.
  return Boolean(plan && Array.isArray(plan.warning_signs) && Array.isArray(plan.key_points) && Array.isArray(saved.checkIns));
}

export function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSaved(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function save(saved: Saved): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
