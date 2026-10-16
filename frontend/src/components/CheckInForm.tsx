"use client";

import { useState } from "react";

import { medsToCheck, today, type CheckIn, type DoseStatus } from "@/lib/checkin";
import { EN, type UI } from "@/lib/i18n";
import type { CarePlan } from "@/lib/types";

interface Props {
  plan: CarePlan;
  existing?: CheckIn;
  onSave: (checkIn: CheckIn) => void;
  ui?: UI;
}

function toggle(list: number[], item: number, on: boolean): number[] {
  return on ? [...list, item] : list.filter((value) => value !== item);
}

export default function CheckInForm({ plan, existing, onSave, ui = EN }: Props) {
  const [meds, setMeds] = useState<Record<string, DoseStatus>>(existing?.meds ?? {});
  const [symptoms, setSymptoms] = useState<number[]>(existing?.symptoms ?? []);
  const [done, setDone] = useState<number[]>(existing?.done ?? []);
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
          <legend>{ui.anyToday}</legend>
          <p className="hint">{ui.tickHint}</p>
          {plan.warning_signs.map((sign, index) => (
            <label key={sign.sign + sign.source} className="check">
              <input
                type="checkbox"
                checked={symptoms.includes(index)}
                onChange={(e) => setSymptoms(toggle(symptoms, index, e.target.checked))}
              />
              {sign.sign}
            </label>
          ))}
        </fieldset>
      )}

      {medications.length > 0 && (
        <fieldset>
          <legend>{ui.medsToday}</legend>
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
                    {status === "taken" ? ui.taken : ui.missed}
                  </label>
                ))}
              </span>
            </div>
          ))}
        </fieldset>
      )}

      {plan.self_care.length > 0 && (
        <fieldset>
          <legend>{ui.selfCare}</legend>
          {plan.self_care.map((item, index) => (
            <label key={item.text + item.source} className="check">
              <input
                type="checkbox"
                checked={done.includes(index)}
                onChange={(e) => setDone(toggle(done, index, e.target.checked))}
              />
              {item.text}
            </label>
          ))}
        </fieldset>
      )}

      <label className="intake-label" htmlFor="note">
        {ui.noteLabel} <span className="hint">{ui.optional}</span>
      </label>
      <textarea
        id="note"
        rows={3}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={ui.notePlaceholder}
      />

      <button type="submit" className="button">
        {ui.saveCheckin}
      </button>
    </form>
  );
}
