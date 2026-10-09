/**
 * Kannada speech output / input helpers.
 *
 * Output: prefers an installed Kannada (kn) voice via the browser's
 * speechSynthesis (offline on most systems). If none is installed, an OPTIONAL
 * online fallback (backend /api/tts using gTTS -> Google) can be enabled by the
 * user; it sends the text over the internet.
 *
 * Input: the Web Speech API's SpeechRecognition (Chrome/Edge) sends microphone
 * audio to the browser vendor's cloud service. It is only started on request.
 */

export function kannadaVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith("kn")) ?? null;
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!("speechSynthesis" in window)) return () => undefined;
  window.speechSynthesis.addEventListener("voiceschanged", cb);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", cb);
}

export async function speakKannada(text: string, allowOnline: boolean): Promise<"local" | "online"> {
  const clean = text.trim();
  if (!clean) throw new Error("Nothing to speak.");
  const voice = kannadaVoice();
  if (voice) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
    return "local";
  }
  if (!allowOnline) {
    throw new Error(
      "No Kannada voice is installed on this computer. Install one (Windows Settings → Time & language → Speech → Add voices → Kannada) or enable the online TTS option.",
    );
  }
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: clean }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Online TTS unavailable: ${detail}`);
  }
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  await audio.play();
  return "online";
}

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function speechRecognitionSupported(): boolean {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenKannada(onText: (t: string) => void, onError: (e: string) => void, onEnd: () => void): () => void {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onError("Speech recognition is not supported in this browser.");
    onEnd();
    return () => undefined;
  }
  const rec = new Ctor();
  rec.lang = "kn-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (ev) => onText(ev.results[0][0].transcript);
  rec.onerror = (ev) => onError(`Speech input error: ${ev.error}`);
  rec.onend = onEnd;
  rec.start();
  return () => rec.stop();
}
