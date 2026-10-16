import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EN, languageFor } from "@/lib/i18n";

import ReadAloud from "./ReadAloud";

const spoken: { text: string; lang: string }[] = [];

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installSpeech(voices: { lang: string }[]) {
  const synth = {
    getVoices: () => voices,
    speak: vi.fn((u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang })),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  return synth;
}

beforeEach(() => {
  spoken.length = 0;
});

afterEach(() => {
  // @ts-expect-error test cleanup
  delete window.speechSynthesis;
  // @ts-expect-error test cleanup
  delete window.SpeechSynthesisUtterance;
});

describe("ReadAloud", () => {
  it("reads each line with a voice for the language, and stops", async () => {
    const synth = installSpeech([{ lang: "en-US" }, { lang: "es-MX" }]);
    render(<ReadAloud lines={["Uno", "Dos"]} language={languageFor("es")} ui={EN} />);

    await userEvent.click(screen.getByRole("button", { name: EN.readAloud }));
    expect(spoken).toEqual([
      { text: "Uno", lang: "es-MX" },
      { text: "Dos", lang: "es-MX" },
    ]);

    await userEvent.click(screen.getByRole("button", { name: EN.stopReading }));
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("says so when there's no voice for the language", () => {
    installSpeech([{ lang: "en-US" }]);
    render(<ReadAloud lines={["Bonjou"]} language={languageFor("ht")} ui={EN} />);
    expect(screen.getByText(EN.noVoice)).toBeInTheDocument();
  });

  it("renders nothing without speech support", () => {
    const { container } = render(<ReadAloud lines={["Hi"]} language={languageFor("en")} ui={EN} />);
    expect(container).toBeEmptyDOMElement();
  });
});
