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

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

async function makePlan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Heart failure" }));
  await user.click(screen.getByRole("button", { name: "Make my care plan" }));
  await screen.findByRole("heading", { name: "What to do at home" });
}

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

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "Understand your hospital instructions" })).toBeInTheDocument();
    expect(localStorage.getItem("carebridge:v1")).toBeNull();
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

describe("Daily check-in", () => {
  it("alerts with the escalated action for a reported warning sign", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);
    await makePlan(user);

    await user.click(screen.getByRole("button", { name: "Daily check-in" }));
    await user.click(screen.getByLabelText("Lips turn blue"));
    await user.click(screen.getByRole("radio", { name: "Missed" }));
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Call 911 now.");
    expect(screen.getByRole("alert")).toHaveTextContent("lips turn blue");
    expect(screen.getByText(/You missed Furosemide/)).toHaveTextContent("Ask your care team or pharmacist");

    await user.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText("0 of 1 taken")).toBeInTheDocument();
    expect(screen.getByText("Lips turn blue")).toBeInTheDocument();
  });

  it("reassures when nothing needs a call, and keeps everything after a reload", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    const { unmount } = render(<Home />);
    await makePlan(user);

    await user.click(screen.getByRole("button", { name: "Daily check-in" }));
    await user.click(screen.getByRole("radio", { name: "Taken" }));
    await user.type(screen.getByLabelText(/Anything else to note/), "Weight 180 lbs");
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing you reported needs a call right now");

    unmount();
    render(<Home />);
    await user.click(await screen.findByRole("button", { name: "Progress" }));
    expect(screen.getByText("1 of 1 taken")).toBeInTheDocument();
    expect(screen.getByText("Weight 180 lbs")).toBeInTheDocument();
  });

  it("lets you change today's answers", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);
    await makePlan(user);

    await user.click(screen.getByRole("button", { name: "Daily check-in" }));
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }));
    await user.click(screen.getByRole("button", { name: "Change today's answers" }));
    await user.click(screen.getByLabelText("Dizziness"));
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Call your doctor or care team today.");
  });

  it("keeps the plan when start over is cancelled", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);
    await makePlan(user);

    vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "What to do at home" })).toBeInTheDocument();
  });
});
