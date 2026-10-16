import type { PlanResult, Sample } from "./types";

export class ApiError extends Error {}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // Fall through to the generic message.
  }
  return "Something went wrong. Please try again.";
}

export async function fetchSamples(): Promise<Sample[]> {
  const response = await fetch("/api/samples");
  if (!response.ok) throw new ApiError(await readError(response));
  return response.json();
}

export async function createPlan(instructions: string): Promise<PlanResult> {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instructions }),
  });
  if (response.status === 422) {
    throw new ApiError("Please paste the full instructions (at least a few sentences).");
  }
  if (!response.ok) throw new ApiError(await readError(response));
  return response.json();
}

export async function translateTexts(
  language: string,
  texts: string[],
  cacheable = false,
): Promise<{ texts: string[]; kept_english: number[] }> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, texts, cacheable }),
  });
  if (!response.ok) throw new ApiError(await readError(response));
  return response.json();
}
