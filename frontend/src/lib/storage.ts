import type { CheckIn } from "./checkin";
import type { PlanResult } from "./types";

// Everything stays in this browser. Nothing is sent to or stored on a server.
const KEY = "carebridge:v1";

export interface Saved {
  result: PlanResult;
  checkIns: CheckIn[];
}

function isSaved(value: unknown): value is Saved {
  const saved = value as Saved;
  return Boolean(saved?.result?.plan && Array.isArray(saved.result.plan.warning_signs) && Array.isArray(saved.checkIns));
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
