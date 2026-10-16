"use client";

import { useEffect, useRef, useState } from "react";

import CarePlanView from "@/components/CarePlanView";
import CheckInForm from "@/components/CheckInForm";
import CheckInResult from "@/components/CheckInResult";
import InstructionsForm from "@/components/InstructionsForm";
import ProgressLog from "@/components/ProgressLog";
import ReadAloud from "@/components/ReadAloud";
import { createPlan, fetchSamples, translateTexts } from "@/lib/api";
import { today, upsert, type CheckIn } from "@/lib/checkin";
import { EN, LANGUAGES, languageFor } from "@/lib/i18n";
import { planToSpeech } from "@/lib/speech";
import * as storage from "@/lib/storage";
import { applyTexts, collectTexts, interfaceTextCount, type Translation } from "@/lib/translation";
import type { PlanResult, Sample } from "@/lib/types";

type View = "plan" | "checkin" | "progress";

export default function Home() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [view, setView] = useState<View>("plan");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [languageCode, setLanguageCode] = useState("en");
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
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
        if (stored.language && stored.translation) {
          setLanguageCode(stored.language);
          setTranslation(stored.translation);
        }
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
      setLanguageCode("en");
      setTranslation(null);
      setSaved(storage.save({ result: plan, checkIns: [] }));
      topRef.current?.scrollIntoView({ block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const ui = translation?.ui ?? EN;
  const language = languageFor(languageCode);
  const persist = (next: Partial<storage.Saved>) => {
    if (!result) return;
    const english = languageCode === "en";
    setSaved(
      storage.save({
        result,
        checkIns,
        ...(english ? {} : { language: languageCode, translation: translation ?? undefined }),
        ...next,
      }),
    );
  };

  const chooseLanguage = async (code: string) => {
    if (!result) return;
    setTranslateError(null);
    if (code === "en") {
      setLanguageCode("en");
      setTranslation(null);
      setSaved(storage.save({ result, checkIns }));
      return;
    }
    setTranslating(true);
    try {
      // Interface labels and plan text go separately (and in parallel): the
      // server may cache the labels, but never the patient's plan.
      const texts = collectTexts(result.plan);
      const split = interfaceTextCount();
      const [labels, planText] = await Promise.all([
        translateTexts(code, texts.slice(0, split), true),
        translateTexts(code, texts.slice(split)),
      ]);
      const next = applyTexts(
        result.plan,
        [...labels.texts, ...planText.texts],
        labels.kept_english.length + planText.kept_english.length,
      );
      setLanguageCode(code);
      setTranslation(next);
      setSaved(storage.save({ result, checkIns, language: code, translation: next }));
    } catch (caught) {
      setTranslateError(caught instanceof Error ? caught.message : "The translation didn't work. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  const startOver = () => {
    if (!window.confirm(ui.startOverConfirm)) return;
    storage.clear();
    setResult(null);
    setCheckIns([]);
    setError(null);
    setLanguageCode("en");
    setTranslation(null);
  };

  const saveCheckIn = (checkIn: CheckIn) => {
    if (!result) return;
    const next = upsert(checkIns, checkIn);
    setCheckIns(next);
    setEditing(false);
    persist({ checkIns: next });
  };

  const todays = checkIns.find((checkIn) => checkIn.date === today());
  const shownPlan = translation?.plan ?? result?.plan;
  const tabs: { view: View; label: string }[] = [
    { view: "plan", label: ui.tabPlan },
    { view: "checkin", label: ui.tabCheckin },
    { view: "progress", label: ui.tabProgress },
  ];

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
        {result && shownPlan ? (
          <div lang={language.code} dir={language.dir}>
            <div className="language-bar no-print">
              <label htmlFor="language">{ui.language}</label>
              <select
                id="language"
                value={languageCode}
                disabled={translating}
                onChange={(event) => chooseLanguage(event.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code} lang={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
              {translating && (
                <span className="hint" role="status">
                  {ui.translating}
                </span>
              )}
            </div>
            {translateError && (
              <p className="error" role="alert">
                {translateError}
              </p>
            )}
            {translation && (
              <p className="translated-notice">
                {ui.translatedNotice}
                {translation.keptEnglish > 0 && ` ${ui.keptEnglish}`}
              </p>
            )}

            <nav className="tabs no-print" aria-label="Care plan sections">
              {tabs.map((tab) => (
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
              <CarePlanView
                plan={shownPlan}
                dropped={result.dropped}
                onStartOver={startOver}
                ui={ui}
                tools={<ReadAloud lines={planToSpeech(shownPlan, ui)} language={language} ui={ui} />}
              />
            )}

            {view === "checkin" && (
              <section className="plan-section">
                <h1>{ui.checkinTitle}</h1>
                {todays && !editing ? (
                  <CheckInResult plan={shownPlan} checkIn={todays} onEdit={() => setEditing(true)} ui={ui} />
                ) : (
                  <CheckInForm key={languageCode} plan={shownPlan} existing={todays} onSave={saveCheckIn} ui={ui} />
                )}
              </section>
            )}

            {view === "progress" && (
              <section className="plan-section">
                <h1>{ui.progressTitle}</h1>
                <ProgressLog plan={shownPlan} checkIns={checkIns} ui={ui} locale={language.code} />
              </section>
            )}

            <p className="device-note no-print">{saved ? ui.savedHere : ui.notSaved}</p>
          </div>
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
