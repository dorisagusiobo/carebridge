import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import InstructionsForm from "./InstructionsForm";

const samples = [{ id: "s1", title: "Pneumonia", patient: "Fictional", instructions: "Amoxicillin 875 mg twice a day for 5 more days." }];

describe("InstructionsForm", () => {
  it("keeps the button disabled until there's enough text", async () => {
    const onSubmit = vi.fn();
    render(<InstructionsForm samples={[]} busy={false} onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: "Make my care plan" });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Paste your discharge instructions"), "Take one pill.");
    expect(button).toBeDisabled();
  });

  it("fills a sample and submits the trimmed text", async () => {
    const onSubmit = vi.fn();
    render(<InstructionsForm samples={samples} busy={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Pneumonia" }));
    await userEvent.click(screen.getByRole("button", { name: "Make my care plan" }));

    expect(onSubmit).toHaveBeenCalledWith(samples[0].instructions);
  });

  it("shows progress while busy", () => {
    render(<InstructionsForm samples={samples} busy onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Making your plan…" })).toBeDisabled();
  });
});
