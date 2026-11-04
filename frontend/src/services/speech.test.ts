import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { speakKannada } from "./speech";

const TEXT = "ನಿಮ್ಮ ಹೆಸರೇನು? ನನ್ನ ತಾಯಿ";
const origFetch = globalThis.fetch;

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
  globalThis.fetch = origFetch;
});

describe("Kannada speech output", () => {
  it("sends the exact Kannada text to an installed Kannada voice", async () => {
    const spoken = mockSpeech([{ lang: "en-US" }, { lang: "kn-IN" }]);
    assert.equal(await speakKannada(`  ${TEXT}  `, false), "local");
    assert.deepEqual(spoken, [{ text: TEXT, lang: "kn-IN" }]);
  });

  it("refuses to send text online unless the user allowed it", async () => {
    mockSpeech([{ lang: "en-US" }]);
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response();
    }) as typeof fetch;
    await assert.rejects(() => speakKannada(TEXT, false), /No Kannada voice/);
    assert.equal(called, false);
  });

  it("keeps Kannada Unicode intact in the online TTS request", async () => {
    mockSpeech([]);
    let capturedBody = "";
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
      return { ok: false, statusText: "offline", json: async () => ({ detail: "offline" }) } as Response;
    }) as typeof fetch;
    await assert.rejects(() => speakKannada(TEXT, true), /Online TTS unavailable/);
    const body = JSON.parse(capturedBody);
    assert.equal(body.text, TEXT);
    assert.equal(body.text.normalize("NFC"), body.text);
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
    assert.equal(await pending, "local");
    assert.deepEqual(spoken, [{ text: TEXT, lang: "kn-IN" }]);
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
    utter!.onerror!({ error: "interrupted" });
    assert.deepEqual(errors, ["The Kannada voice could not speak (network)."]);
  });

  it("rejects empty text", async () => {
    mockSpeech([{ lang: "kn-IN" }]);
    await assert.rejects(() => speakKannada("   ", true), /Nothing to speak/);
  });
});
