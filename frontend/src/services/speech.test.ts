import { afterEach, describe, expect, it, vi } from "vitest";
import { speakKannada } from "./speech";

const TEXT = "ನಿಮ್ಮ ಹೆಸರೇನು? ನನ್ನ ತಾಯಿ";

function mockSpeech(voices: { lang: string }[]) {
  const spoken: { text: string; lang: string }[] = [];
  class Utterance {
    voice: unknown = null;
    lang = "";
    rate = 1;
    constructor(public text: string) {}
  }
  const g = globalThis as Record<string, unknown>;
  g.SpeechSynthesisUtterance = Utterance;
  g.window = {
    speechSynthesis: {
      getVoices: () => voices,
      cancel: () => undefined,
      speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.lang }),
    },
  };
  return spoken;
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.SpeechSynthesisUtterance;
  vi.unstubAllGlobals();
});

describe("Kannada speech output", () => {
  it("sends the exact Kannada text to an installed Kannada voice", async () => {
    const spoken = mockSpeech([{ lang: "en-US" }, { lang: "kn-IN" }]);
    expect(await speakKannada(`  ${TEXT}  `, false)).toBe("local");
    expect(spoken).toEqual([{ text: TEXT, lang: "kn-IN" }]);
  });

  it("refuses to send text online unless the user allowed it", async () => {
    mockSpeech([{ lang: "en-US" }]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(speakKannada(TEXT, false)).rejects.toThrow(/No Kannada voice/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps Kannada Unicode intact in the online TTS request", async () => {
    mockSpeech([]);
    const fetchSpy = vi.fn(async () => ({ ok: false, statusText: "offline", json: async () => ({ detail: "offline" }) }));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(speakKannada(TEXT, true)).rejects.toThrow(/Online TTS unavailable/);
    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.text).toBe(TEXT);
    expect(body.text.normalize("NFC")).toBe(body.text);
  });

  it("waits for a voice list that loads after the page opens", async () => {
    const spoken: { text: string; lang: string }[] = [];
    let voices: { lang: string }[] = [];
    const listeners: (() => void)[] = [];
    class Utterance { voice: unknown = null; lang = ""; rate = 1; constructor(public text: string) {} }
    const g = globalThis as Record<string, unknown>;
    g.SpeechSynthesisUtterance = Utterance;
    g.window = {
      speechSynthesis: {
        getVoices: () => voices,
        cancel: () => undefined,
        speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.lang }),
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: () => undefined,
      },
    };
    const pending = speakKannada(TEXT, false);
    voices = [{ lang: "kn-IN" }];
    listeners.forEach((cb) => cb());
    expect(await pending).toBe("local");
    expect(spoken).toEqual([{ text: TEXT, lang: "kn-IN" }]);
  });

  it("reports a voice that fails after speaking started", async () => {
    let utter: { onerror?: (e: { error: string }) => void } | null = null;
    class Utterance { voice: unknown = null; lang = ""; rate = 1; onerror?: (e: { error: string }) => void; constructor(public text: string) {} }
    const g = globalThis as Record<string, unknown>;
    g.SpeechSynthesisUtterance = Utterance;
    g.window = { speechSynthesis: { getVoices: () => [{ lang: "kn-IN" }], cancel: () => undefined, speak: (u: Utterance) => { utter = u; } } };
    const errors: string[] = [];
    await speakKannada(TEXT, false, (m) => errors.push(m));
    utter!.onerror!({ error: "network" });
    utter!.onerror!({ error: "interrupted" });            // stopping playback is not an error
    expect(errors).toEqual(["The Kannada voice could not speak (network)."]);
  });

  it("rejects empty text", async () => {
    mockSpeech([{ lang: "kn-IN" }]);
    await expect(speakKannada("   ", true)).rejects.toThrow(/Nothing to speak/);
  });
});
