import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { planResult } from "@/test/fixtures";

import ProgressLog from "./ProgressLog";

describe("ProgressLog", () => {
  it("explains an empty log", () => {
    render(<ProgressLog plan={planResult.plan} checkIns={[]} />);
    expect(screen.getByText(/No check-ins yet/)).toBeInTheDocument();
  });

  it("summarizes each day", () => {
    render(
      <ProgressLog
        plan={planResult.plan}
        checkIns={[
          { date: "2026-10-16", meds: { Furosemide: "taken" }, symptoms: [], done: [0], note: "" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/October 16/);
    expect(screen.getByText("1 of 1 taken")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("1 of 1 done")).toBeInTheDocument();
  });
});
