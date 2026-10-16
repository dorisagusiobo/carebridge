import { afterEach, describe, expect, it, vi } from "vitest";

import { planResult } from "@/test/fixtures";

import { clear, load, save } from "./storage";

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
  });
});
