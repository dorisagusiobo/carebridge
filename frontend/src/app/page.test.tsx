import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { planResult } from "@/test/fixtures";

import Home from "./page";

const instructions = "Furosemide 40 mg PO once daily in the morning. Weigh yourself every morning.";

function mockFetch(planResponse: Response) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/samples")) {
      return Response.json([{ id: "hf", title: "Heart failure", patient: "Fictional", instructions }]);
    }
    if (url.endsWith("/api/translate")) {
      const { texts, cacheable } = JSON.parse(String(init?.body));
      expect(cacheable).toBe(texts.includes("Your plan"));
      return Response.json({ texts: texts.map((text: string) => `ES ${text}`), kept_english: [] });
    }
    return planResponse;
  });
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

describe("Language", () => {
  it("translates the whole screen, keeps check-ins, and survives a reload", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    const { unmount } = render(<Home />);
    await makePlan(user);

    await user.click(screen.getByRole("button", { name: "Daily check-in" }));
    await user.click(screen.getByLabelText("Lips turn blue"));
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }));

    await user.selectOptions(screen.getByLabelText("Language"), "es");
    expect(await screen.findByRole("heading", { name: "ES How are you today?" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("ES Call 911 now.");
    expect(screen.getByRole("alert")).toHaveTextContent("es lips turn blue");
    expect(screen.getByText(/ES Translated by AI/)).toBeInTheDocument();
    expect(document.querySelector('[lang="es"]')).not.toBeNull();

    unmount();
    render(<Home />);
    expect(await screen.findByRole("button", { name: "ES Your plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ES What to do at home" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("ES Language"), "en");
    expect(screen.getByRole("heading", { name: "What to do at home" })).toBeInTheDocument();
  });

  it("shows right-to-left languages right to left", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);
    await makePlan(user);

    await user.selectOptions(screen.getByLabelText("Language"), "ar");
    await screen.findByRole("heading", { name: "ES What to do at home" });
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull();
  });

  it("explains a failed translation and stays in English", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/samples")) {
        return Response.json([{ id: "hf", title: "Heart failure", patient: "Fictional", instructions }]);
      }
      if (url.endsWith("/api/translate")) {
        return Response.json({ detail: "The translation service is unavailable. Please try again." }, { status: 502 });
      }
      return Response.json(planResult);
    });
    Element.prototype.scrollIntoView = vi.fn();
    render(<Home />);
    await makePlan(user);

    await user.selectOptions(screen.getByLabelText("Language"), "vi");
    expect(await screen.findByRole("alert")).toHaveTextContent("translation service is unavailable");
    expect(screen.getByRole("heading", { name: "What to do at home" })).toBeInTheDocument();
  });
});

describe("First screen language", () => {
  it("translates the first screen, carries the language into the plan, and remembers it", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    Element.prototype.scrollIntoView = vi.fn();
    const { unmount } = render(<Home />);
    await screen.findByRole("button", { name: "Heart failure" });

    await user.selectOptions(screen.getByLabelText("Language"), "es");
    expect(await screen.findByRole("heading", { name: "ES Understand your hospital instructions" })).toBeInTheDocument();
    expect(screen.getByLabelText("ES Paste your discharge instructions")).toBeInTheDocument();
    expect(screen.getByText(/ES Translated by AI. The plan will be in this language too./)).toBeInTheDocument();
    expect(document.querySelector("main")?.getAttribute("lang")).toBe("es");

    await user.click(screen.getByRole("button", { name: "ES Heart failure" }));
    await user.click(screen.getByRole("button", { name: "ES Make my care plan" }));
    expect(await screen.findByRole("heading", { name: "ES What to do at home" })).toBeInTheDocument();
    expect(screen.getByText(/ES Translated by AI from English/)).toBeInTheDocument();

    // Start over keeps the language for the next plan.
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "ES Start over" }));
    expect(screen.getByRole("heading", { name: "ES Understand your hospital instructions" })).toBeInTheDocument();

    unmount();
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "ES Understand your hospital instructions" })).toBeInTheDocument();
  });

  it("lays out right-to-left languages from the first screen, and switches back to English", async () => {
    const user = userEvent.setup();
    mockFetch(Response.json(planResult));
    render(<Home />);
    await screen.findByRole("button", { name: "Heart failure" });

    await user.selectOptions(screen.getByLabelText("Language"), "ar");
    await screen.findByRole("heading", { name: "ES Understand your hospital instructions" });
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("rtl");

    await user.selectOptions(screen.getByLabelText("ES Language"), "en");
    expect(screen.getByRole("heading", { name: "Understand your hospital instructions" })).toBeInTheDocument();
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("ltr");
    expect(localStorage.getItem("carebridge:language")).toBeNull();
  });
});
