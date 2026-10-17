import { ACTION_ORDER, actionTitle } from "./labels";
import type { UI } from "./i18n";
import type { CarePlan } from "./types";

/** The plan as short paragraphs to read aloud, most important first. */
export function planToSpeech(plan: CarePlan, ui: UI): string[] {
  const lines: string[] = [ui.planTitle, plan.reason_for_stay, ...plan.key_points.map((point) => point.text)];

  if (plan.warning_signs.length) {
    lines.push(ui.whenToGetHelp);
    for (const action of ACTION_ORDER) {
      const signs = plan.warning_signs.filter((sign) => sign.action === action);
      if (signs.length) lines.push(`${actionTitle(action, ui)}: ${signs.map((sign) => sign.sign).join(", ")}.`);
    }
  }
  if (plan.medications.length) {
    lines.push(ui.medicines);
    for (const med of plan.medications) {
      const detail = med.change === "stop" ? ui.stopped : [med.dose, med.when].filter(Boolean).join(", ");
      lines.push(`${med.name}. ${detail}`);
    }
  }
  const lists: [string, string[]][] = [
    [ui.appointments, plan.appointments.map((appt) => `${appt.with_whom}: ${appt.when}`)],
    [ui.selfCare, plan.self_care.map((item) => item.text)],
    [ui.avoid, plan.avoid.map((item) => item.text)],
    [ui.questions, plan.questions_for_care_team],
  ];
  for (const [title, items] of lists) {
    if (items.length) lines.push(title, ...items);
  }
  return lines.filter((line) => line.trim());
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function findVoice(prefixes: string[]): SpeechSynthesisVoice | undefined {
  if (!speechSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix.toLowerCase())));
}
