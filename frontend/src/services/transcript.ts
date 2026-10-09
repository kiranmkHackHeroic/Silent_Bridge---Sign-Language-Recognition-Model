/**
 * Kannada transcript model (pure functions, unit-tested).
 *
 * Items are recognized signs (Kannada gloss words) or punctuation the user
 * inserted. The output is a Kannada *gloss* of the supported vocabulary in the
 * order signed, not a grammatical translation. Text is always NFC-normalized and
 * never passed through ASCII-only filtering.
 */
import type { TranscriptToken } from "./types";

export type ItemSource = "model" | "simulated" | "edited" | "manual";

export interface TranscriptItem {
  id: string;
  kind: "sign" | "punct";
  label: string;
  kannada: string;
  english: string;
  confidence: number | null;
  source: ItemSource;
}

export const PUNCTUATION = [
  { mark: "?", name: "Question mark" },
  { mark: ".", name: "Full stop" },
  { mark: ",", name: "Comma" },
  { mark: "!", name: "Exclamation" },
] as const;

let counter = 0;
const nextId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

export function nfc(text: string): string {
  return text.normalize("NFC");
}

export function fromServerToken(t: TranscriptToken): TranscriptItem {
  return {
    id: nextId(),
    kind: "sign",
    label: t.label,
    kannada: nfc(t.kannada),
    english: t.english,
    confidence: t.source === "simulated" ? null : t.confidence,
    source: t.source,
  };
}

export function punctuation(mark: string): TranscriptItem {
  return { id: nextId(), kind: "punct", label: mark, kannada: mark, english: mark, confidence: null, source: "manual" };
}

/** Words separated by single spaces; punctuation attaches to the previous word. */
export function joinTranscript(items: TranscriptItem[]): string {
  let out = "";
  for (const item of items) {
    const text = nfc(item.kannada.trim());
    if (!text) continue;
    if (item.kind === "punct" || out === "") out += text;
    else out += ` ${text}`;
  }
  return out.trim();
}

export function removeAt(items: TranscriptItem[], index: number): TranscriptItem[] {
  return items.filter((_, i) => i !== index);
}

export function correctAt(
  items: TranscriptItem[],
  index: number,
  entry: { label: string; kannada: string; english: string },
): TranscriptItem[] {
  return items.map((it, i) =>
    i === index && it.kind === "sign"
      ? { ...it, label: entry.label, kannada: nfc(entry.kannada), english: entry.english, source: "edited" }
      : it,
  );
}

/** Inserts punctuation after `index` (or at the end); never two punctuation marks in a row. */
export function insertPunctuation(items: TranscriptItem[], mark: string, index = items.length - 1): TranscriptItem[] {
  if (!items.length) return items;
  const at = Math.min(Math.max(index, 0), items.length - 1);
  if (items[at].kind === "punct") return items.map((it, i) => (i === at ? { ...it, label: mark, kannada: mark, english: mark } : it));
  return [...items.slice(0, at + 1), punctuation(mark), ...items.slice(at + 1)];
}

/** Text exported to the clipboard / speech: NFC, tidy spacing, no stray spaces before punctuation. */
export function exportText(text: string): string {
  return nfc(text)
    .replace(/[ \t]+/g, " ")
    .replace(/ ([?.,!।])/g, "$1")
    .trim();
}
