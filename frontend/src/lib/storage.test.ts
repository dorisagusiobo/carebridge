import { afterEach, describe, expect, it, vi } from "vitest";

import { planResult } from "@/test/fixtures";

import { clear, load, loadLanguage, save, saveLanguage } from "./storage";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("storage", () => {
  it("saves, loads and clears the plan and check-ins", () => {
    const saved = { result: planResult, checkIns: [] };
    expect(save(saved)).toBe(true);
    expect(load()).toEqual(saved);
    clear();
    expect(load()).toBeNull();
  });

  it("ignores corrupt or unexpected data", () => {
    localStorage.setItem("carebridge:v1", "{not json");
    expect(load()).toBeNull();
    localStorage.setItem("carebridge:v1", JSON.stringify({ hello: "world" }));
    expect(load()).toBeNull();
    const oldPlan: Partial<typeof planResult.plan> = { ...planResult.plan };
    delete oldPlan.key_points;
    localStorage.setItem("carebridge:v1", JSON.stringify({ result: { ...planResult, plan: oldPlan }, checkIns: [] }));
    expect(load()).toBeNull();
  });

  it("remembers the chosen language, and forgets English", () => {
    expect(loadLanguage()).toBe("en");
    saveLanguage("vi");
    expect(loadLanguage()).toBe("vi");
    saveLanguage("en");
    expect(localStorage.getItem("carebridge:language")).toBeNull();
  });

  it("copes when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(save({ result: planResult, checkIns: [] })).toBe(false);
    expect(load()).toBeNull();
    expect(() => clear()).not.toThrow();
    expect(loadLanguage()).toBe("en");
    expect(() => saveLanguage("es")).not.toThrow();
  });
});
