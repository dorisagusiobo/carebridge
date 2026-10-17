"use client";

import { useState } from "react";

import { EN, fill, type UI } from "@/lib/i18n";
import type { Sample } from "@/lib/types";

export const MIN_CHARS = 40;
export const MAX_CHARS = 12_000;

interface Props {
  samples: Sample[];
  busy: boolean;
  onSubmit: (instructions: string) => void;
  ui?: UI;
  /** Sample id → title in the chosen language. */
  sampleTitles?: Record<string, string>;
}

export default function InstructionsForm({ samples, busy, onSubmit, ui = EN, sampleTitles = {} }: Props) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_CHARS;

  return (
    <form
      className="intake"
      onSubmit={(event) => {
        event.preventDefault();
        if (!tooShort && !busy) onSubmit(trimmed);
      }}
    >
      <label htmlFor="instructions" className="intake-label">
        {ui.pasteLabel}
      </label>
      <p className="hint" id="instructions-hint">
        {ui.pasteHint}
      </p>
      <textarea
        id="instructions"
        aria-describedby="instructions-hint"
        value={text}
        maxLength={MAX_CHARS}
        rows={10}
        onChange={(event) => setText(event.target.value)}
        placeholder={ui.pastePlaceholder}
      />

      {samples.length > 0 && (
        <div className="samples">
          <p className="hint">{ui.trySample}</p>
          <ul>
            {samples.map((sample) => (
              <li key={sample.id}>
                <button type="button" className="chip" onClick={() => setText(sample.instructions)}>
                  {sampleTitles[sample.id] ?? sample.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="intake-actions">
        <button type="submit" className="button" disabled={tooShort || busy}>
          {busy ? ui.makingPlan : ui.makePlan}
        </button>
        <span className="hint">
          {fill(ui.charCount, { count: trimmed.length.toLocaleString(), max: MAX_CHARS.toLocaleString() })}
        </span>
      </div>
    </form>
  );
}
