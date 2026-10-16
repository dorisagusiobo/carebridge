"use client";

import { useEffect, useRef, useState } from "react";

import CarePlanView from "@/components/CarePlanView";
import CheckInForm from "@/components/CheckInForm";
import CheckInResult from "@/components/CheckInResult";
import InstructionsForm from "@/components/InstructionsForm";
import ProgressLog from "@/components/ProgressLog";
import { createPlan, fetchSamples } from "@/lib/api";
import { today, upsert, type CheckIn } from "@/lib/checkin";
import * as storage from "@/lib/storage";
import type { PlanResult, Sample } from "@/lib/types";

type View = "plan" | "checkin" | "progress";

const TABS: { view: View; label: string }[] = [
  { view: "plan", label: "Your plan" },
  { view: "checkin", label: "Daily check-in" },
  { view: "progress", label: "Progress" },
];

export default function Home() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [view, setView] = useState<View>("plan");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pick up a plan saved on this device. Loaded after mount because the page
    // is pre-rendered without access to the browser's storage.
    Promise.resolve(storage.load()).then((stored) => {
      if (stored) {
        setResult(stored.result);
        setCheckIns(stored.checkIns);
      }
    });
    fetchSamples()
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  const submit = async (instructions: string) => {
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan(instructions);
      setResult(plan);
      setCheckIns([]);
      setView("plan");
      setSaved(storage.save({ result: plan, checkIns: [] }));
      topRef.current?.scrollIntoView({ block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    if (!window.confirm("Start over? This deletes your plan and check-ins from this device.")) return;
    storage.clear();
    setResult(null);
    setCheckIns([]);
    setError(null);
  };

  const saveCheckIn = (checkIn: CheckIn) => {
    if (!result) return;
    const next = upsert(checkIns, checkIn);
    setCheckIns(next);
    setEditing(false);
    setSaved(storage.save({ result, checkIns: next }));
  };

  const todays = checkIns.find((checkIn) => checkIn.date === today());

  return (
    <div ref={topRef} className="page">
      <header className="site-header no-print">
        <button type="button" className="brand" onClick={() => setView("plan")}>
          <svg viewBox="0 0 64 24" aria-hidden="true" className="brand-mark">
            <path d="M4 18 C 16 4, 48 4, 60 18" />
          </svg>
          CareBridge
        </button>
        <span className="tag">Demo · fictional patients only</span>
      </header>

      <main id="main">
        {result ? (
          <>
            <nav className="tabs no-print" aria-label="Care plan sections">
              {TABS.map((tab) => (
                <button
                  key={tab.view}
                  type="button"
                  aria-current={view === tab.view ? "page" : undefined}
                  onClick={() => setView(tab.view)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {view === "plan" && (
              <CarePlanView plan={result.plan} dropped={result.dropped} onStartOver={startOver} />
            )}

            {view === "checkin" && (
              <section className="plan-section">
                <h1>How are you today?</h1>
                {todays && !editing ? (
                  <CheckInResult plan={result.plan} checkIn={todays} onEdit={() => setEditing(true)} />
                ) : (
                  <CheckInForm plan={result.plan} existing={todays} onSave={saveCheckIn} />
                )}
              </section>
            )}

            {view === "progress" && (
              <section className="plan-section">
                <h1>Your progress</h1>
                <ProgressLog plan={result.plan} checkIns={checkIns} />
              </section>
            )}

            <p className="device-note no-print">
              {saved
                ? "Your plan and check-ins are saved on this device only. Nothing is stored on our servers."
                : "This browser isn't letting us save, so your plan will be gone if you close this page."}
            </p>
          </>
        ) : (
          <>
            <section className="intro">
              <h1>Understand your hospital instructions</h1>
              <p className="lede">
                Paste the instructions you got when you left the hospital. CareBridge turns them into a clear plan:
                what to take, what to avoid, and when to get help.
              </p>
            </section>
            <InstructionsForm samples={samples} busy={busy} onSubmit={submit} />
            {busy && (
              <p className="status" role="status">
                Reading your instructions. This usually takes about 10 seconds.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="disclaimer">
              CareBridge explains instructions in plain words. It doesn&apos;t diagnose or give medical advice, and it
              doesn&apos;t replace your care team. In an emergency, call 911.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
