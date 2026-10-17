import { EN, type UI } from "./i18n";
import type { CarePlan } from "./types";

export interface Translation {
  plan: CarePlan;
  ui: UI;
  keptEnglish: number;
}

type Visit = (value: string, set: (translated: string) => void) => void;

/** Every translatable string in the interface and the plan, in a fixed order.
 * Medicine names, doses, actions and source quotes are left out on purpose. */
function walk(plan: CarePlan, ui: UI, visit: Visit) {
  const field = <T extends object>(obj: T, key: keyof T) => {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) visit(value, (translated) => (obj[key] = translated as T[keyof T]));
  };

  (Object.keys(ui) as (keyof UI)[]).forEach((key) => field(ui, key));
  field(plan, "reason_for_stay");
  plan.key_points.forEach((point) => field(point, "text"));
  plan.medications.forEach((med) => {
    field(med, "when");
    field(med, "purpose");
  });
  plan.appointments.forEach((appt) => {
    field(appt, "with_whom");
    field(appt, "when");
    field(appt, "purpose");
  });
  plan.avoid.forEach((item) => field(item, "text"));
  plan.self_care.forEach((item) => field(item, "text"));
  plan.warning_signs.forEach((sign) => {
    field(sign, "sign");
    field(sign, "red_flag");
  });
  plan.questions_for_care_team.forEach((_, index, list) => {
    if (list[index].trim()) visit(list[index], (translated) => (list[index] = translated));
  });
}

/** How many of the collected texts (at the start) are interface labels. These
 * are the same for every plan, so the server may cache their translations. */
export function interfaceTextCount(): number {
  return Object.values(EN).filter((text) => text.trim()).length;
}

export function collectTexts(plan: CarePlan): string[] {
  const texts: string[] = [];
  walk(structuredClone(plan), structuredClone(EN), (value) => texts.push(value));
  return texts;
}

export function applyTexts(plan: CarePlan, translated: string[], keptEnglish: number): Translation {
  const copy = structuredClone(plan);
  const ui = structuredClone(EN);
  let index = 0;
  walk(copy, ui, (_, set) => set(translated[index++]));
  if (index !== translated.length) throw new Error("Translation doesn't match this plan");
  return { plan: copy, ui, keptEnglish };
}
