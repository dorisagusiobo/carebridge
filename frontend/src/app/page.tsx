"use client";

import { useEffect, useRef, useState } from "react";

import CarePlanView from "@/components/CarePlanView";
import InstructionsForm from "@/components/InstructionsForm";
import { createPlan, fetchSamples } from "@/lib/api";
import type { PlanResult, Sample } from "@/lib/types";

export default function Home() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  const submit = async (instructions: string) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await createPlan(instructions));
      topRef.current?.scrollIntoView({ block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={topRef} className="page">
      <header className="site-header no-print">
        <button
          type="button"
          className="brand"
          onClick={() => {
            setResult(null);
            setError(null);
          }}
        >
          <svg viewBox="0 0 64 24" aria-hidden="true" className="brand-mark">
            <path d="M4 18 C 16 4, 48 4, 60 18" />
          </svg>
          CareBridge
        </button>
        <span className="tag">Demo · fictional patients only</span>
      </header>

      <main id="main">
        {result ? (
          <CarePlanView plan={result.plan} dropped={result.dropped} onStartOver={() => setResult(null)} />
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
