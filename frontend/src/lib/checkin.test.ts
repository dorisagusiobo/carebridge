import { describe, expect, it } from "vitest";

import { planResult } from "@/test/fixtures";

import { medsToCheck, missedMeds, today, upsert, urgentFindings, type CheckIn } from "./checkin";

const plan = planResult.plan;
const base: CheckIn = { date: "2026-10-16", meds: {}, symptoms: [], done: [], note: "" };

describe("check-in logic", () => {
  it("formats today's local date", () => {
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("asks about every medicine except the ones to stop", () => {
    expect(medsToCheck(plan).map((m) => m.name)).toEqual(["Furosemide"]);
  });

  it("groups reported signs by action, most urgent first", () => {
    const findings = urgentFindings(plan, { ...base, symptoms: [0, 2, 1] });
    expect(findings.map((f) => f.action)).toEqual(["call_911", "call_care_team"]);
    expect(findings[0].signs.map((s) => s.sign)).toEqual(["Chest pain", "Lips turn blue"]);
  });

  it("uses the escalated action, not the instructed one", () => {
    const [finding] = urgentFindings(plan, { ...base, symptoms: [2] });
    expect(finding.action).toBe("call_911");
  });

  it("has no findings when nothing is reported", () => {
    expect(urgentFindings(plan, base)).toEqual([]);
  });

  it("lists missed medicines", () => {
    expect(missedMeds({ ...base, meds: { Furosemide: "missed", Lisinopril: "taken" } })).toEqual(["Furosemide"]);
  });

  it("keeps one check-in per day, newest first", () => {
    const first = { ...base, date: "2026-10-15" };
    const second = { ...base, date: "2026-10-16", note: "a" };
    const redo = { ...base, date: "2026-10-16", note: "b" };
    expect(upsert(upsert(upsert([], first), second), redo).map((c) => [c.date, c.note])).toEqual([
      ["2026-10-16", "b"],
      ["2026-10-15", ""],
    ]);
  });
});
