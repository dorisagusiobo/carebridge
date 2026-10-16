import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { planResult } from "@/test/fixtures";

import Home from "./page";

const instructions = "Furosemide 40 mg PO once daily in the morning. Weigh yourself every morning.";

function mockFetch(planResponse: Response) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input) =>
    String(input).endsWith("/api/samples")
      ? Response.json([{ id: "hf", title: "Heart failure", patient: "Fictional", instructions }])
      : planResponse,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Home", () => {
  it("turns a sample into a care plan and can start over", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);

    await user.click(await screen.findByRole("button", { name: "Heart failure" }));
    await user.click(screen.getByRole("button", { name: "Make my care plan" }));

    expect(await screen.findByRole("heading", { name: "What to do at home" })).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(String(init?.body))).toEqual({ instructions });

    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "Understand your hospital instructions" })).toBeInTheDocument();
  });

  it("shows the server's error message", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json({ detail: "The AI service couldn't make a plan. Please try again." }, { status: 502 }));
    render(<Home />);

    await user.click(await screen.findByRole("button", { name: "Heart failure" }));
    await user.click(screen.getByRole("button", { name: "Make my care plan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't make a plan");
  });

  it("explains a too-short paste", async () => {
    const user = userEvent.setup();
    mockFetch(new Response(null, { status: 422 }));
    render(<Home />);

    await user.click(await screen.findByRole("button", { name: "Heart failure" }));
    await user.click(screen.getByRole("button", { name: "Make my care plan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please paste the full instructions");
  });
});
