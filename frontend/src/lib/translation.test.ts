import { describe, expect, it } from "vitest";

import { planResult } from "@/test/fixtures";

import { EN } from "./i18n";
import { applyInterface, applyTexts, collectTexts, interfaceTextCount, interfaceTexts } from "./translation";

const plan = planResult.plan;

describe("translation", () => {
  it("collects interface and plan text but never names, doses, actions or quotes", () => {
    const texts = collectTexts(plan);
    expect(texts).toContain(EN.now911);
    expect(texts).toContain(plan.reason_for_stay);
    expect(texts).toContain("Lips turn blue");
    expect(texts).toContain("blue or grey skin");
    expect(texts).not.toContain("Furosemide");
    expect(texts).not.toContain("40 mg");
    expect(texts).not.toContain("call_911");
    expect(texts).not.toContain("lips turning blue");
    expect(texts.every((text) => text.trim())).toBe(true);
  });

  it("puts translations back in the same places without touching the original", () => {
    const texts = collectTexts(plan);
    const result = applyTexts(plan, texts.map((text) => `ES ${text}`), 1);

    expect(result.ui.now911).toBe(`ES ${EN.now911}`);
    expect(result.plan.key_points[0].text).toBe(`ES ${plan.key_points[0].text}`);
    expect(result.plan.key_points[0].source).toBe(plan.key_points[0].source);
    expect(result.plan.reason_source).toBe(plan.reason_source);
    expect(result.plan.medications[0].name).toBe("Furosemide");
    expect(result.plan.medications[0].dose).toBe("40 mg");
    expect(result.plan.warning_signs[2].action).toBe("call_911");
    expect(result.plan.warning_signs[2].source).toBe("lips turning blue");
    expect(result.keptEnglish).toBe(1);
    expect(plan.key_points[0].text).not.toMatch(/^ES /);
  });

  it("puts the interface labels first, so they can be sent separately", () => {
    const texts = collectTexts(plan);
    const split = interfaceTextCount();
    expect(texts.slice(0, split)).toEqual(Object.values(EN));
    expect(texts[split]).toBe(plan.reason_for_stay);
  });

  it("translates the interface on its own, before there's a plan", () => {
    const ui = applyInterface(interfaceTexts().map((text) => `ES ${text}`));
    expect(ui.introTitle).toBe(`ES ${EN.introTitle}`);
    expect(ui.now911).toBe(`ES ${EN.now911}`);
    expect(() => applyInterface(["too short"])).toThrow();
  });

  it("rejects a translation of a different length", () => {
    expect(() => applyTexts(plan, ["too", "short"], 0)).toThrow();
  });
});
