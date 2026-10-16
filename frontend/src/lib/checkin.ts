import type { Action, CarePlan, Medication, WarningSign } from "./types";

export type DoseStatus = "taken" | "missed";

export interface CheckIn {
  /** Local date, YYYY-MM-DD. One check-in per day. */
  date: string;
  /** Medicine name → whether today's doses were taken. */
  meds: Record<string, DoseStatus>;
  /** Indexes into plan.warning_signs the patient has today. Stored by position
   * rather than wording so check-ins still match after switching language. */
  symptoms: number[];
  /** Indexes into plan.self_care done today. */
  done: number[];
  note: string;
}

export const ACTION_RANK: Record<Action, number> = { not_stated: 0, call_care_team: 1, go_to_er: 2, call_911: 3 };

export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Medicines to ask about: everything except the ones to stop. */
export function medsToCheck(plan: CarePlan): Medication[] {
  return plan.medications.filter((med) => med.change !== "stop");
}

/** Warning signs the patient reported, grouped by what to do, most urgent first. */
export function urgentFindings(plan: CarePlan, checkIn: CheckIn): { action: Action; signs: WarningSign[] }[] {
  const reported = plan.warning_signs.filter((_, index) => checkIn.symptoms.includes(index));
  const actions = [...new Set(reported.map((sign) => sign.action))].sort((a, b) => ACTION_RANK[b] - ACTION_RANK[a]);
  return actions.map((action) => ({ action, signs: reported.filter((sign) => sign.action === action) }));
}

export function missedMeds(checkIn: CheckIn): string[] {
  return Object.entries(checkIn.meds)
    .filter(([, status]) => status === "missed")
    .map(([name]) => name);
}

/** Add or replace the check-in for its date, newest first. */
export function upsert(checkIns: CheckIn[], checkIn: CheckIn): CheckIn[] {
  return [checkIn, ...checkIns.filter((c) => c.date !== checkIn.date)].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(date: string, locale?: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
