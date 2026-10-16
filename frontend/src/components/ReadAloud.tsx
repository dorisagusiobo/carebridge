"use client";

import { useEffect, useState } from "react";

import { type Language, type UI } from "@/lib/i18n";
import { findVoice, speechSupported } from "@/lib/speech";

interface Props {
  lines: string[];
  language: Language;
  ui: UI;
}

export default function ReadAloud({ lines, language, ui }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      setVoice(findVoice(language.voices));
      setReady(true);
    };
    pick();
    // Browsers load voices asynchronously.
    synth.addEventListener("voiceschanged", pick);
    return () => {
      synth.removeEventListener("voiceschanged", pick);
      synth.cancel();
    };
  }, [language]);

  if (!speechSupported()) return null;
  if (ready && !voice) return <span className="hint">{ui.noVoice}</span>;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const start = () => {
    window.speechSynthesis.cancel();
    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? language.code;
      utterance.rate = 0.95;
      if (index === lines.length - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      }
      window.speechSynthesis.speak(utterance);
    });
    setSpeaking(true);
  };

  return (
    <button type="button" className="button-secondary" aria-pressed={speaking} onClick={speaking ? stop : start}>
      {speaking ? ui.stopReading : ui.readAloud}
    </button>
  );
}
