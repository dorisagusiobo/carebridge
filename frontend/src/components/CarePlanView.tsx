"use client";

import { useState, type ReactNode } from "react";

import { EN, fill, type UI } from "@/lib/i18n";
import { ACTION_ORDER, ACTION_TONE, actionTitle, changeLabel, instructedLabel } from "@/lib/labels";
import type { CarePlan } from "@/lib/types";

function Source({ text, show }: { text: string; show: boolean }) {
  if (!show || !text) return null;
  return (
    <q className="source" lang="en" dir="ltr" aria-label="From your instructions">
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
  ui?: UI;
  /** Extra controls for the toolbar, such as read aloud. */
  tools?: ReactNode;
}

export default function CarePlanView({ plan, dropped, onStartOver, ui = EN, tools }: Props) {
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
        <p className="eyebrow">{ui.eyebrow}</p>
        <h1 id="plan-title">{ui.planTitle}</h1>
        {plan.reason_for_stay && (
          <p className="lede">
            {plan.reason_for_stay}
            <Source text={plan.reason_source} show={showSources} />
          </p>
        )}
        {plan.key_points.length > 0 && (
          <ul className="summary" aria-label={ui.keyPoints}>
            {plan.key_points.map((point) => (
              <li key={point.text + point.source}>
                {point.text}
                <Source text={point.source} show={showSources} />
              </li>
            ))}
          </ul>
        )}
        <div className="plan-tools no-print">
          <label className="toggle">
            <input type="checkbox" checked={showSources} onChange={(e) => setShowSources(e.target.checked)} />
            {ui.showSources}
          </label>
          {tools}
          <button type="button" className="button-secondary" onClick={() => window.print()}>
            {ui.print}
          </button>
          <button type="button" className="button-secondary" onClick={onStartOver}>
            {ui.startOver}
          </button>
        </div>
      </header>

      <Section title={ui.whenToGetHelp} empty={plan.warning_signs.length === 0}>
        <div className="warnings">
          {ACTION_ORDER.map((action) => {
            const signs = plan.warning_signs.filter((sign) => sign.action === action);
            if (signs.length === 0) return null;
            return (
              <div key={action} className={`warning warning-${ACTION_TONE[action]}`}>
                <h3>{actionTitle(action, ui)}:</h3>
                <ul>
                  {signs.map((sign) => (
                    <li key={sign.sign + sign.source}>
                      {sign.sign}
                      {sign.red_flag && (
                        <span className="raised">
                          {fill(ui.movedUp, {
                            flag: sign.red_flag,
                            instructed: instructedLabel(sign.instructed_action, ui),
                          })}
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

      <Section title={ui.medicines} empty={plan.medications.length === 0}>
        <ul className="meds">
          {plan.medications.map((med) => {
            const label = changeLabel(med.change, ui);
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
                {med.change === "stop" && <p className="med-dose">{med.when || ui.stopped}</p>}
                {med.purpose && <p className="med-purpose">{med.purpose}</p>}
                <Source text={med.source} show={showSources} />
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={ui.appointments} empty={plan.appointments.length === 0}>
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

      <Section title={ui.selfCare} empty={plan.self_care.length === 0}>
        <ul className="list">
          {plan.self_care.map((item) => (
            <li key={item.text + item.source}>
              {item.text}
              <Source text={item.source} show={showSources} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={ui.avoid} empty={plan.avoid.length === 0}>
        <ul className="list list-avoid">
          {plan.avoid.map((item) => (
            <li key={item.text + item.source}>
              {item.text}
              <Source text={item.source} show={showSources} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={ui.questions} empty={plan.questions_for_care_team.length === 0}>
        <p className="hint">{ui.questionsHint}</p>
        <ol className="list questions">
          {plan.questions_for_care_team.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <button type="button" className="button-secondary no-print" onClick={copyQuestions}>
          {copied ? ui.copied : ui.copyQuestions}
        </button>
      </Section>

      {dropped.length > 0 && (
        <p className="dropped" role="note">
          {fill(ui.dropped, { count: dropped.length })}
        </p>
      )}

      <p className="disclaimer">{ui.planDisclaimer}</p>
    </article>
  );
}
