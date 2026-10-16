"use client";

import { useState } from "react";

import { medsToCheck, today, type CheckIn, type DoseStatus } from "@/lib/checkin";
import type { CarePlan } from "@/lib/types";

interface Props {
  plan: CarePlan;
  existing?: CheckIn;
  onSave: (checkIn: CheckIn) => void;
}

function toggle(list: string[], item: string, on: boolean): string[] {
  return on ? [...list, item] : list.filter((value) => value !== item);
}

export default function CheckInForm({ plan, existing, onSave }: Props) {
  const [meds, setMeds] = useState<Record<string, DoseStatus>>(existing?.meds ?? {});
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [done, setDone] = useState<string[]>(existing?.done ?? []);
  const [note, setNote] = useState(existing?.note ?? "");
  const medications = medsToCheck(plan);

  return (
    <form
      className="checkin"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ date: existing?.date ?? today(), meds, symptoms, done, note: note.trim() });
      }}
    >
      {plan.warning_signs.length > 0 && (
        <fieldset>
          <legend>Do you have any of these today?</legend>
          <p className="hint">Tick anything you have right now.</p>
          {plan.warning_signs.map((sign) => (
            <label key={sign.sign} className="check">
              <input
                type="checkbox"
                checked={symptoms.includes(sign.sign)}
                onChange={(e) => setSymptoms(toggle(symptoms, sign.sign, e.target.checked))}
              />
              {sign.sign}
            </label>
          ))}
        </fieldset>
      )}

      {medications.length > 0 && (
        <fieldset>
          <legend>Your medicines today</legend>
          {medications.map((med) => (
            <div key={med.name} className="dose" role="radiogroup" aria-label={med.name}>
              <span className="dose-name">
                <strong>{med.name}</strong>
                <span className="muted">{[med.dose, med.when].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="dose-options">
                {(["taken", "missed"] as const).map((status) => (
                  <label key={status} className="pill">
                    <input
                      type="radio"
                      name={`dose-${med.name}`}
                      checked={meds[med.name] === status}
                      onChange={() => setMeds({ ...meds, [med.name]: status })}
                    />
                    {status === "taken" ? "Taken" : "Missed"}
                  </label>
                ))}
              </span>
            </div>
          ))}
        </fieldset>
      )}

      {plan.self_care.length > 0 && (
        <fieldset>
          <legend>Taking care of yourself</legend>
          {plan.self_care.map((item) => (
            <label key={item.text} className="check">
              <input
                type="checkbox"
                checked={done.includes(item.text)}
                onChange={(e) => setDone(toggle(done, item.text, e.target.checked))}
              />
              {item.text}
            </label>
          ))}
        </fieldset>
      )}

      <label className="intake-label" htmlFor="note">
        Anything else to note? <span className="hint">(optional)</span>
      </label>
      <textarea
        id="note"
        rows={3}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="For example: weight this morning, how you slept"
      />

      <button type="submit" className="button">
        Save today&apos;s check-in
      </button>
    </form>
  );
}
