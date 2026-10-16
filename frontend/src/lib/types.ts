export type Change = "new" | "changed" | "continue" | "stop" | "not_stated";
export type Action = "call_911" | "go_to_er" | "call_care_team" | "not_stated";

export interface Medication {
  name: string;
  dose: string;
  when: string;
  purpose: string;
  purpose_source: string;
  change: Change;
  source: string;
}

export interface Appointment {
  with_whom: string;
  when: string;
  purpose: string;
  source: string;
}

export interface Instruction {
  text: string;
  source: string;
}

export interface WarningSign {
  sign: string;
  /** What the instructions say to do. */
  instructed_action: Action;
  /** What to do: the instructed action, raised by a red-flag rule if needed. */
  action: Action;
  /** The emergency sign that raised the action, or "". */
  red_flag: string;
  source: string;
}

export interface CarePlan {
  reason_for_stay: string;
  summary: string;
  medications: Medication[];
  appointments: Appointment[];
  avoid: Instruction[];
  self_care: Instruction[];
  warning_signs: WarningSign[];
  questions_for_care_team: string[];
}

export interface PlanResult {
  plan: CarePlan;
  dropped: string[];
}

export interface Sample {
  id: string;
  title: string;
  patient: string;
  instructions: string;
}
