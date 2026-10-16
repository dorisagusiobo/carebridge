"use client";

import { useState, type ReactNode } from "react";

import type { Action, CarePlan, Change } from "@/lib/types";

const CHANGE_LABELS: Record<Change, string | null> = {
  new: "New",
  changed: "Changed",
  continue: "Keep taking",
  stop: "Stop taking",
  not_stated: null,
};

// Most urgent first.
export const ACTIONS: { action: Action; title: string; tone: string }[] = [
  { action: "call_911", title: "Call 911 right away if you have", tone: "urgent" },
  { action: "go_to_er", title: "Go to the emergency room if you have", tone: "er" },
  { action: "call_care_team", title: "Call your doctor or care team if you have", tone: "call" },
  { action: "not_stated", title: "Ask your care team what to do if you have", tone: "ask" },
];

const INSTRUCTED_LABELS: Record<Action, string> = {
  call_911: "call 911",
  go_to_er: "go to the emergency room",
  call_care_team: "call your care team",
  not_stated: "nothing specific",
};

function Source({ text, show }: { text: string; show: boolean }) {
  if (!show || !text) return null;
  return (
    <q className="source" aria-label="From your instructions">
      {text}
    </q>
  );
}

function Section({ title, children, empty }: { title: string; children: ReactNode; empty: boolean }) {
  if (empty) return null;
  return (
    <section className="plan-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

interface Props {
  plan: CarePlan;
  dropped: string[];
  onStartOver: () => void;
}

export default function CarePlanView({ plan, dropped, onStartOver }: Props) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(plan.questions_for_care_team.map((q) => `- ${q}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="plan" aria-labelledby="plan-title">
      <header className="plan-header">
        <p className="eyebrow">Your care plan</p>
        <h1 id="plan-title">What to do at home</h1>
        <p className="lede">{plan.reason_for_stay}</p>
        <p className="summary">{plan.summary}</p>
        <div className="plan-tools no-print">
          <label className="toggle">
            <input type="checkbox" checked={showSources} onChange={(e) => setShowSources(e.target.checked)} />
            Show where each line came from
          </label>
          <button type="button" className="button-secondary" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="button-secondary" onClick={onStartOver}>
            Start over
          </button>
        </div>
      </header>

      <Section title="When to get help" empty={plan.warning_signs.length === 0}>
        <div className="warnings">
          {ACTIONS.map(({ action, title, tone }) => {
            const signs = plan.warning_signs.filter((sign) => sign.action === action);
            if (signs.length === 0) return null;
            return (
              <div key={action} className={`warning warning-${tone}`}>
                <h3>{title}:</h3>
                <ul>
                  {signs.map((sign) => (
                    <li key={sign.sign + sign.source}>
                      {sign.sign}
                      {sign.red_flag && (
                        <span className="raised">
                          Moved up by CareBridge: {sign.red_flag} can be a sign of an emergency. Your instructions
                          said: {INSTRUCTED_LABELS[sign.instructed_action]}.
                        </span>
                      )}
                      <Source text={sign.source} show={showSources} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Your medicines" empty={plan.medications.length === 0}>
        <ul className="meds">
          {plan.medications.map((med) => {
            const label = CHANGE_LABELS[med.change];
            return (
              <li key={med.name + med.source} className={`med med-${med.change}`}>
                <div className="med-head">
                  <h3>{med.name}</h3>
                  {label && <span className={`badge badge-${med.change}`}>{label}</span>}
                </div>
                {med.change !== "stop" && (
                  <p className="med-dose">
                    {med.dose && <strong>{med.dose}</strong>}
                    {med.dose && med.when && " · "}
                    {med.when}
                  </p>
                )}
                {med.change === "stop" && <p className="med-dose">{med.when || "Don't take this any more."}</p>}
                {med.purpose && <p className="med-purpose">{med.purpose}</p>}
                <Source text={med.source} show={showSources} />
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Appointments" empty={plan.appointments.length === 0}>
        <ul className="list">
          {plan.appointments.map((appt) => (
            <li key={appt.with_whom + appt.source}>
              <strong>{appt.with_whom}</strong>: {appt.when}
              {appt.purpose && <span className="muted"> ({appt.purpose})</span>}
              <Source text={appt.source} show={showSources} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Taking care of yourself" empty={plan.self_care.length === 0}>
        <ul className="list">
          {plan.self_care.map((item) => (
            <li key={item.text}>
              {item.text}
              <Source text={item.source} show={showSources} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Things to avoid" empty={plan.avoid.length === 0}>
        <ul className="list list-avoid">
          {plan.avoid.map((item) => (
            <li key={item.text}>
              {item.text}
              <Source text={item.source} show={showSources} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Questions to ask your care team" empty={plan.questions_for_care_team.length === 0}>
        <p className="hint">Your instructions didn&apos;t answer these. Bring them to your next call or visit.</p>
        <ol className="list questions">
          {plan.questions_for_care_team.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <button type="button" className="button-secondary no-print" onClick={copyQuestions}>
          {copied ? "Copied" : "Copy questions"}
        </button>
      </Section>

      {dropped.length > 0 && (
        <p className="dropped" role="note">
          We left out {dropped.length} {dropped.length === 1 ? "item" : "items"} we couldn&apos;t match to your
          instructions. Check your original paperwork too.
        </p>
      )}

      <p className="disclaimer">
        CareBridge explains your instructions in plain words. It doesn&apos;t give medical advice. If anything here
        doesn&apos;t match what your care team told you, follow your care team. In an emergency, call 911.
      </p>
    </article>
  );
}
