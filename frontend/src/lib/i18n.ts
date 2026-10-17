// Every piece of interface text, in English. Translations are made by the
// /api/translate endpoint and cached, so the whole screen (including "Call 911
// now") appears in the patient's language. {placeholders} are kept by the
// translator and filled in with `fill`.
export const EN = {
  tabPlan: "Your plan",
  tabCheckin: "Daily check-in",
  tabProgress: "Progress",
  language: "Language",
  translating: "Translating…",
  translatedNotice:
    "Translated by AI from English. If anything is unclear, ask your care team for a free medical interpreter.",
  keptEnglish: "A few lines stayed in English so their numbers couldn't change.",
  readAloud: "Read aloud",
  stopReading: "Stop reading",
  noVoice: "This device doesn't have a voice for this language.",

  eyebrow: "Your care plan",
  planTitle: "What to do at home",
  keyPoints: "Most important",
  showSources: "Show where each line came from",
  print: "Print",
  startOver: "Start over",
  startOverConfirm: "Start over? This deletes your plan and check-ins from this device.",
  whenToGetHelp: "When to get help",
  ifCall911: "Call 911 right away if you have",
  ifEr: "Go to the emergency room if you have",
  ifCall: "Call your doctor or care team if you have",
  ifAsk: "Ask your care team what to do if you have",
  movedUp: "Moved up by CareBridge: {flag} can be a sign of an emergency. Your instructions said: {instructed}.",
  saidCall911: "call 911",
  saidEr: "go to the emergency room",
  saidCall: "call your care team",
  saidNothing: "nothing specific",
  medicines: "Your medicines",
  changeNew: "New",
  changeChanged: "Changed",
  changeContinue: "Keep taking",
  changeStop: "Stop taking",
  stopped: "Don't take this any more.",
  appointments: "Appointments",
  selfCare: "Taking care of yourself",
  avoid: "Things to avoid",
  questions: "Questions to ask your care team",
  questionsHint: "Your instructions didn't answer these. Bring them to your next call or visit.",
  copyQuestions: "Copy questions",
  copied: "Copied",
  dropped: "We left out {count} items we couldn't match to your instructions. Check your original paperwork too.",
  planDisclaimer:
    "CareBridge explains your instructions in plain words. It doesn't give medical advice. If anything here doesn't match what your care team told you, follow your care team. In an emergency, call 911.",

  checkinTitle: "How are you today?",
  anyToday: "Do you have any of these today?",
  tickHint: "Tick anything you have right now.",
  medsToday: "Your medicines today",
  taken: "Taken",
  missed: "Missed",
  noteLabel: "Anything else to note?",
  optional: "(optional)",
  notePlaceholder: "For example: weight this morning, how you slept",
  saveCheckin: "Save today's check-in",
  now911: "Call 911 now.",
  nowEr: "Go to the emergency room now.",
  nowCall: "Call your doctor or care team today.",
  nowAsk: "Call your care team and ask what to do.",
  youHave: "You said you have: {signs}.",
  missedNotice:
    "You missed {meds}. Don't take extra to catch up unless your care team says to. Ask your care team or pharmacist what to do.",
  savedOk: "Saved. Nothing you reported needs a call right now. Check in again tomorrow.",
  changeAnswers: "Change today's answers",

  progressTitle: "Your progress",
  noCheckins: "No check-ins yet. Your daily check-ins will show up here.",
  logMedicines: "Medicines",
  logTaken: "{taken} of {total} taken",
  logWarnings: "Warning signs",
  logNone: "None",
  logSelfCare: "Self-care",
  logDone: "{done} of {total} done",
  logNote: "Note",

  savedHere: "Your plan and check-ins are saved on this device only. Nothing is stored on our servers.",
  notSaved: "This browser isn't letting us save, so your plan will be gone if you close this page.",
};

export type UI = typeof EN;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export interface Language {
  code: string;
  /** The language's own name, so people can find it. */
  name: string;
  dir: "ltr" | "rtl";
  /** Prefixes of BCP 47 tags that match a speech voice for this language. */
  voices: string[];
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", dir: "ltr", voices: ["en"] },
  { code: "es", name: "Español", dir: "ltr", voices: ["es"] },
  { code: "zh-Hans", name: "简体中文", dir: "ltr", voices: ["zh-CN", "zh-Hans", "cmn"] },
  { code: "vi", name: "Tiếng Việt", dir: "ltr", voices: ["vi"] },
  { code: "tl", name: "Tagalog", dir: "ltr", voices: ["fil", "tl"] },
  { code: "ar", name: "العربية", dir: "rtl", voices: ["ar"] },
  { code: "ko", name: "한국어", dir: "ltr", voices: ["ko"] },
  { code: "ru", name: "Русский", dir: "ltr", voices: ["ru"] },
  { code: "ht", name: "Kreyòl ayisyen", dir: "ltr", voices: ["ht"] },
  { code: "pt", name: "Português", dir: "ltr", voices: ["pt"] },
  { code: "fr", name: "Français", dir: "ltr", voices: ["fr"] },
];

export function languageFor(code: string): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
