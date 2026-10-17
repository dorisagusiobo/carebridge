import type { PlanResult } from "@/lib/types";

export const planResult: PlanResult = {
  plan: {
    reason_for_stay: "Your heart isn't pumping as strongly as it should.",
    reason_source: "Acute on chronic systolic heart failure",
    key_points: [{ text: "Weigh yourself every morning.", source: "Weigh yourself every morning" }],
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
      { sign: "Dizziness", instructed_action: "call_care_team", action: "call_care_team", red_flag: "", source: "dizziness" },
      { sign: "Chest pain", instructed_action: "call_911", action: "call_911", red_flag: "", source: "CALL 911 IF: chest pain" },
      {
        sign: "Lips turn blue",
        instructed_action: "call_care_team",
        action: "call_911",
        red_flag: "blue or grey skin",
        source: "lips turning blue",
      },
    ],
    questions_for_care_team: ["What time is my appointment?"],
  },
  dropped: [],
};
