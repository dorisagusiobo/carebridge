import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { planResult } from "@/test/fixtures";

import CarePlanView from "./CarePlanView";

function renderPlan(overrides: Partial<typeof planResult> = {}) {
  const onStartOver = vi.fn();
  const result = { ...planResult, ...overrides };
  render(<CarePlanView plan={result.plan} dropped={result.dropped} onStartOver={onStartOver} />);
  return { onStartOver };
}

describe("CarePlanView", () => {
  it("shows the reason and summary", () => {
    renderPlan();
    expect(screen.getByRole("heading", { name: "What to do at home" })).toBeInTheDocument();
    expect(screen.getByText(/isn't pumping as strongly/)).toBeInTheDocument();
  });

  it("groups warning signs by what to do, most urgent first", () => {
    renderPlan();
    const groups = screen.getAllByRole("heading", { level: 3 }).filter((h) => h.textContent?.includes("if you have"));
    expect(groups.map((h) => h.textContent)).toEqual([
      "Call 911 right away if you have:",
      "Call your doctor or care team if you have:",
    ]);
    const urgent = groups[0].parentElement as HTMLElement;
    expect(within(urgent).getByText("Chest pain")).toBeInTheDocument();
  });

  it("files raised signs under their new action and says why", () => {
    renderPlan();
    const urgent = screen.getByRole("heading", { name: "Call 911 right away if you have:" }).parentElement as HTMLElement;

    expect(within(urgent).getByText("Lips turn blue")).toBeInTheDocument();
    expect(within(urgent).getByText(/Moved up by CareBridge: blue or grey skin can be a sign of an emergency/)).toHaveTextContent(
      "Your instructions said: call your care team.",
    );
    const call = screen.getByRole("heading", { name: "Call your doctor or care team if you have:" })
      .parentElement as HTMLElement;
    expect(within(call).queryByText("Lips turn blue")).not.toBeInTheDocument();
  });

  it("labels medicine changes and explains stopped medicines", () => {
    renderPlan();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Stop taking")).toBeInTheDocument();
    expect(screen.getByText("Don't take this any more.")).toBeInTheDocument();
    expect(screen.getByText("Water pill")).toBeInTheDocument();
  });

  it("hides source quotes until asked", async () => {
    renderPlan();
    expect(screen.queryByText("STOP: Ibuprofen.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Show where each line came from"));

    expect(screen.getByText("STOP: Ibuprofen.")).toBeInTheDocument();
  });

  it("copies the questions for the care team", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderPlan();

    await user.click(screen.getByRole("button", { name: "Copy questions" }));

    expect(writeText).toHaveBeenCalledWith("- What time is my appointment?");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("leaves out empty sections and notes dropped items", () => {
    renderPlan({
      plan: { ...planResult.plan, appointments: [], questions_for_care_team: [] },
      dropped: ["medication: Aspirin 81 mg"],
    });
    expect(screen.queryByRole("heading", { name: "Appointments" })).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("We left out 1 item");
  });

  it("starts over", async () => {
    const { onStartOver } = renderPlan();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
