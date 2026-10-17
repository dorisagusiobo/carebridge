"use client";

import { useEffect, useRef, useState } from "react";

import CarePlanView from "@/components/CarePlanView";
import CheckInForm from "@/components/CheckInForm";
import CheckInResult from "@/components/CheckInResult";
import InstructionsForm from "@/components/InstructionsForm";
import LanguageBar from "@/components/LanguageBar";
import ProgressLog from "@/components/ProgressLog";
import ReadAloud from "@/components/ReadAloud";
import { createPlan, fetchSamples, translateTexts } from "@/lib/api";
import { today, upsert, type CheckIn } from "@/lib/checkin";
import { EN, languageFor, type UI } from "@/lib/i18n";
import { planToSpeech } from "@/lib/speech";
import * as storage from "@/lib/storage";
import { applyInterface, applyTexts, collectTexts, interfaceTexts, type Translation } from "@/lib/translation";
import type { PlanResult, Sample } from "@/lib/types";

type View = "plan" | "checkin" | "progress";

interface Translated {
  labels: UI;
  sampleTitles: Record<string, string>;
  translation: Translation | null;
}

/** Translate the interface (and sample titles), plus the plan if there is one.
 * Interface text is public and sent as cacheable; plan text never is. */
async function translateAll(code: string, plan: PlanResult | null, samples: Sample[]): Promise<Translated> {
  const labels = interfaceTexts();
  const titles = samples.map((sample) => sample.title);
  const planTexts = plan ? collectTexts(plan.plan).slice(labels.length) : [];

  const [shared, planPart] = await Promise.all([
    translateTexts(code, [...labels, ...titles], true),
    planTexts.length ? translateTexts(code, planTexts) : Promise.resolve({ texts: [], kept_english: [] }),
  ]);

  const translatedLabels = shared.texts.slice(0, labels.length);
  const sampleTitles = Object.fromEntries(
    samples.map((sample, index) => [sample.id, shared.texts[labels.length + index]]),
  );
  const translation = plan
    ? applyTexts(
        plan.plan,
        [...translatedLabels, ...planPart.texts],
        shared.kept_english.filter((index) => index < labels.length).length + planPart.kept_english.length,
      )
    : null;
  return { labels: applyInterface(translatedLabels), sampleTitles, translation };
}

export default function Home() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [view, setView] = useState<View>("plan");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [languageCode, setLanguageCode] = useState("en");
  const [labels, setLabels] = useState<UI | null>(null);
  const [sampleTitles, setSampleTitles] = useState<Record<string, string>>({});
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const applyLanguage = async (code: string, plan: PlanResult | null, sampleList: Sample[], entries: CheckIn[]) => {
    setTranslateError(null);
    storage.saveLanguage(code);
    if (code === "en") {
      setLanguageCode("en");
      setLabels(null);
      setSampleTitles({});
      setTranslation(null);
      if (plan) setSaved(storage.save({ result: plan, checkIns: entries }));
      return;
    }
    setTranslating(true);
    try {
      const next = await translateAll(code, plan, sampleList);
      setLanguageCode(code);
      setLabels(next.labels);
      setSampleTitles(next.sampleTitles);
      setTranslation(next.translation);
      if (plan && next.translation) {
        setSaved(storage.save({ result: plan, checkIns: entries, language: code, translation: next.translation }));
      }
    } catch (caught) {
      setTranslateError(caught instanceof Error ? caught.message : "The translation didn't work. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    // Pick up a plan or language saved on this device. Loaded after mount
    // because the page is pre-rendered without access to the browser's storage.
    const stored = storage.load();
    const preferred = storage.loadLanguage();
    Promise.resolve().then(() => {
      if (stored) {
        setResult(stored.result);
        setCheckIns(stored.checkIns);
        if (stored.language && stored.translation) {
          setLanguageCode(stored.language);
          setTranslation(stored.translation);
          setLabels(stored.translation.ui);
        }
      }
    });
    fetchSamples()
      .catch(() => [] as Sample[])
      .then((list) => {
        setSamples(list);
        if (!stored && preferred !== "en") applyLanguage(preferred, null, list, []);
      });
    // Runs once on mount; applyLanguage only uses its arguments and setters.
  }, []);

  const submit = async (instructions: string) => {
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan(instructions);
      setResult(plan);
      setCheckIns([]);
      setView("plan");
      setTranslation(null);
      setSaved(storage.save({ result: plan, checkIns: [] }));
      topRef.current?.scrollIntoView({ block: "start" });
      // A language chosen on the first screen carries over to the plan.
      if (languageCode !== "en") await applyLanguage(languageCode, plan, samples, []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const ui = translation?.ui ?? labels ?? EN;
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

  const startOver = () => {
    if (!window.confirm(ui.startOverConfirm)) return;
    storage.clear();
    setResult(null);
    setCheckIns([]);
    setError(null);
    // Keep the chosen language for the first screen, without the old plan.
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
  const languageBar = (
    <LanguageBar
      value={languageCode}
      translating={translating}
      onChange={(code) => applyLanguage(code, result, samples, checkIns)}
      ui={ui}
    />
  );
  const languageError = translateError && (
    <p className="error" role="alert">
      {translateError}
    </p>
  );

  return (
    <div ref={topRef} className="page">
      <header className="site-header no-print">
        <button type="button" className="brand" onClick={() => setView("plan")}>
          <svg viewBox="0 0 64 24" aria-hidden="true" className="brand-mark">
            <path d="M4 18 C 16 4, 48 4, 60 18" />
          </svg>
          CareBridge
        </button>
        <span className="tag" lang={language.code}>
          {ui.tagDemo}
        </span>
      </header>

      <main id="main" lang={language.code} dir={language.dir}>
        {result && shownPlan ? (
          <>
            {languageBar}
            {languageError}
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
          </>
        ) : (
          <>
            {languageBar}
            {languageError}
            {labels && <p className="translated-notice">{ui.introTranslated}</p>}
            <section className="intro">
              <h1>{ui.introTitle}</h1>
              <p className="lede">{ui.introLede}</p>
            </section>
            <InstructionsForm
              samples={samples}
              busy={busy || translating}
              onSubmit={submit}
              ui={ui}
              sampleTitles={sampleTitles}
            />
            {busy && (
              <p className="status" role="status">
                {ui.reading}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="disclaimer">{ui.introDisclaimer}</p>
          </>
        )}
      </main>
    </div>
  );
}
