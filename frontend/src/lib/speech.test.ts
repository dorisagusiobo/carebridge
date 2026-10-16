import { describe, expect, it } from "vitest";

import { planResult } from "@/test/fixtures";

import { EN } from "./i18n";
import { planToSpeech } from "./speech";

describe("planToSpeech", () => {
  it("reads the most urgent warning signs first, then medicines", () => {
    const lines = planToSpeech(planResult.plan, EN);

    expect(lines[0]).toBe(EN.planTitle);
    const help = lines.indexOf(EN.whenToGetHelp);
    expect(lines[help + 1]).toBe(`${EN.ifCall911}: Chest pain, Lips turn blue.`);
    expect(lines[help + 2]).toBe(`${EN.ifCall}: Dizziness.`);
    expect(lines).toContain("Furosemide. 40 mg, Every morning");
    expect(lines).toContain(`Ibuprofen. ${EN.stopped}`);
    expect(lines).toContain("What time is my appointment?");
  });

  it("skips empty sections", () => {
    const lines = planToSpeech({ ...planResult.plan, appointments: [], questions_for_care_team: [] }, EN);
    expect(lines).not.toContain(EN.appointments);
    expect(lines).not.toContain(EN.questions);
  });
});
