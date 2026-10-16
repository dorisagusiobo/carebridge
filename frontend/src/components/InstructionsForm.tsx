"use client";

import { useState } from "react";

import type { Sample } from "@/lib/types";

export const MIN_CHARS = 40;
export const MAX_CHARS = 12_000;

interface Props {
  samples: Sample[];
  busy: boolean;
  onSubmit: (instructions: string) => void;
}

export default function InstructionsForm({ samples, busy, onSubmit }: Props) {
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
        Paste your discharge instructions
      </label>
      <p className="hint" id="instructions-hint">
        Copy the text from your hospital paperwork or patient portal. Leave out your name, date of birth and record
        numbers.
      </p>
      <textarea
        id="instructions"
        aria-describedby="instructions-hint"
        value={text}
        maxLength={MAX_CHARS}
        rows={10}
        onChange={(event) => setText(event.target.value)}
        placeholder="For example: Furosemide 40 mg PO once daily in the morning…"
      />

      {samples.length > 0 && (
        <div className="samples">
          <p className="hint">Or try a fictional patient:</p>
          <ul>
            {samples.map((sample) => (
              <li key={sample.id}>
                <button type="button" className="chip" onClick={() => setText(sample.instructions)}>
                  {sample.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="intake-actions">
        <button type="submit" className="button" disabled={tooShort || busy}>
          {busy ? "Making your plan…" : "Make my care plan"}
        </button>
        <span className="hint">
          {trimmed.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
        </span>
      </div>
    </form>
  );
}
