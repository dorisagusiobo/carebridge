import type { PlanResult } from "@/lib/types";

export const planResult: PlanResult = {
  plan: {
    reason_for_stay: "Your heart isn't pumping as strongly as it should.",
    summary: "Weigh yourself every morning.",
    medications: [
      {
        name: "Furosemide",
        dose: "40 mg",
        when: "Every morning",
        purpose: "Water pill",
        purpose_source: "(water pill)",
        change: "new",
        source: "Furosemide 40 mg PO once daily",
      },
      {
        name: "Ibuprofen",
        dose: "",
        when: "",
        purpose: "",
        purpose_source: "",
        change: "stop",
        source: "STOP: Ibuprofen.",
      },
    ],
    appointments: [{ with_whom: "Dr. Reyes", when: "In 7 days", purpose: "", source: "Dr. Reyes in 7 days" }],
    avoid: [{ text: "Don't lift more than 10 pounds.", source: "No heavy lifting over 10 lbs" }],
    self_care: [{ text: "Weigh yourself every morning.", source: "Weigh yourself every morning" }],
    warning_signs: [
      { sign: "Dizziness", instructed_action: "call_care_team", source: "dizziness" },
      { sign: "Chest pain", instructed_action: "call_911", source: "CALL 911 IF: chest pain" },
    ],
    questions_for_care_team: ["What time is my appointment?"],
  },
  dropped: [],
};
