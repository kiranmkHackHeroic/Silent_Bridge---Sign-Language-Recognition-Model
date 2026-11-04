import fs from "node:fs";

export const LABEL_RE = /^[a-z0-9_]{1,40}$/;
export const NONE_LABEL = "_none";

export interface VocabEntry {
  label: string;
  english: string;
  kannada: string;
  emit: boolean;
  isl_gloss: string;
  verified: boolean;
  notes: string;
  kannada_review?: Record<string, any> | null;
}

export function cleanDisplayText(text: string): string {
  const nfc = String(text ?? "").normalize("NFC").replace(/[\u200B\uFEFF\u2060]/g, "");
  return nfc.split(/\s+/).filter(Boolean).join(" ");
}

export function normalizeKannada(text: string): string {
  const nfc = String(text ?? "").normalize("NFC").replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  // Keep letters (L) and marks (M - Kannada vowel signs & virama) and numbers (N); turn punctuation/symbols/spaces into space
  const cleaned = nfc.replace(/[^\p{L}\p{M}\p{N}]+/gu, " ");
  return cleaned.split(/\s+/).filter(Boolean).join(" ");
}

export function isKannada(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0c80 && code <= 0x0cff) return true;
  }
  return false;
}

export class Vocabulary {
  public labelsFile: string;
  public entries: Map<string, VocabEntry> = new Map();

  constructor(labelsFile: string) {
    this.labelsFile = labelsFile;
    this.load();
  }

  load(): void {
    const data = JSON.parse(fs.readFileSync(this.labelsFile, "utf-8"));
    this.entries.clear();
    const list = data.labels ?? data.signs ?? [];
    for (const item of list) {
      const label = String(item.label ?? "").trim();
      if (!LABEL_RE.test(label)) continue;
      this.entries.set(label, {
        label,
        english: String(item.english ?? label),
        kannada: cleanDisplayText(String(item.kannada ?? "")),
        emit: item.emit !== undefined ? Boolean(item.emit) : label !== NONE_LABEL,
        isl_gloss: String(item.isl_gloss ?? label.toUpperCase()),
        verified: Boolean(item.verified ?? false),
        notes: String(item.notes ?? ""),
        kannada_review: item.kannada_review ?? null,
      });
    }
    if (!this.entries.has(NONE_LABEL)) {
      this.entries.set(NONE_LABEL, {
        label: NONE_LABEL,
        english: "(no sign)",
        kannada: "",
        emit: false,
        isl_gloss: "_NONE",
        verified: false,
        notes: "",
        kannada_review: null,
      });
    }
  }

  reload(): void {
    this.load();
  }

  save(): void {
    const data = JSON.parse(fs.readFileSync(this.labelsFile, "utf-8"));
    data.labels = Array.from(this.entries.values()).map((e) => {
      const out: Record<string, any> = { ...e };
      if (out.emit === true) delete out.emit;
      if (out.kannada_review === null || out.kannada_review === undefined) delete out.kannada_review;
      return out;
    });
    fs.writeFileSync(this.labelsFile, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  upsert(label: string, english: string, kannada: string, islGloss = ""): VocabEntry {
    const clean = (label || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!LABEL_RE.test(clean) || clean === NONE_LABEL) {
      throw new Error("label must be 1-40 chars of a-z, 0-9 or _ and not '_none'");
    }
    const kn = cleanDisplayText(kannada);
    if (!kn || !isKannada(kn)) {
      throw new Error("Kannada text (in Kannada script) is required");
    }
    const entry: VocabEntry = {
      label: clean,
      english: (english || "").trim() || clean,
      kannada: kn,
      emit: true,
      isl_gloss: (islGloss || "").trim() || clean.toUpperCase(),
      verified: false,
      notes: "added from the Dataset & Model page",
      kannada_review: null,
    };
    this.entries.set(clean, entry);
    this.save();
    return entry;
  }

  get(label: string): VocabEntry | undefined {
    return this.entries.get(label);
  }

  kannadaFor(label: string): string | null {
    const e = this.entries.get(label);
    return e && e.kannada ? e.kannada : null;
  }

  emittable(label: string): boolean {
    const e = this.entries.get(label);
    return Boolean(e && e.emit && e.kannada);
  }

  toList(): VocabEntry[] {
    return Array.from(this.entries.values());
  }

  asList(opts: { includeSpecial?: boolean } = {}): VocabEntry[] {
    return Array.from(this.entries.values()).filter((e) => opts.includeSpecial || !e.label.startsWith("_"));
  }
}

export interface MappingEntry {
  sign_ids: string[];
  verified: boolean;
  source: string;
  notes: string;
  english: string;
  category: string;
  display: string;
}

export class KannadaSignMapper {
  public mappingFile: string;
  public entries: Map<string, MappingEntry> = new Map();
  public maxWords = 1;

  constructor(mappingFile: string) {
    this.mappingFile = mappingFile;
    this.load();
  }

  load(): void {
    const data = JSON.parse(fs.readFileSync(this.mappingFile, "utf-8"));
    const rawEntries = data.entries ?? data;
    this.entries.clear();
    let maxW = 1;
    for (const [key, value] of Object.entries<any>(rawEntries)) {
      if (key.startsWith("_") || !value || typeof value !== "object") continue;
      const signIds: string[] = Array.isArray(value.sign_ids)
        ? value.sign_ids
        : value.sign_id
          ? [value.sign_id]
          : [];
      const norm = normalizeKannada(key);
      if (norm && signIds.length > 0) {
        this.entries.set(norm, {
          sign_ids: [...signIds],
          verified: Boolean(value.verified ?? false),
          source: String(value.source ?? "unspecified"),
          notes: String(value.notes ?? ""),
          english: String(value.english ?? ""),
          category: String(value.category ?? ""),
          display: cleanDisplayText(String(value.display || key)),
        });
        const wc = norm.split(" ").length;
        if (wc > maxW) maxW = wc;
      }
    }
    this.maxWords = maxW;
  }

  reload(): void {
    this.load();
  }

  add(word: string, signId: string, source: string): boolean {
    const norm = normalizeKannada(word);
    if (!norm || this.entries.has(norm)) return false;
    const data = JSON.parse(fs.readFileSync(this.mappingFile, "utf-8"));
    if (!data.entries) data.entries = {};
    data.entries[norm] = { sign_ids: [signId], verified: false, source, notes: "" };
    fs.writeFileSync(this.mappingFile, JSON.stringify(data, null, 2) + "\n", "utf-8");
    this.load();
    return true;
  }

  phrases(): Array<Record<string, any>> {
    const out: Array<Record<string, any>> = [];
    for (const e of this.entries.values()) {
      if (e.category) {
        out.push({
          kannada: e.display,
          english: e.english,
          category: e.category,
          sign_ids: e.sign_ids,
          verified: e.verified,
        });
      }
    }
    return out;
  }

  translate(text: string): Array<Record<string, any>> {
    const tokens = normalizeKannada(text).split(" ").filter(Boolean);
    const items: Array<Record<string, any>> = [];
    let i = 0;
    while (i < tokens.length) {
      let match: [string, number] | null = null;
      for (let n = Math.min(this.maxWords, tokens.length - i); n > 0; n--) {
        const phrase = tokens.slice(i, i + n).join(" ");
        if (this.entries.has(phrase)) {
          match = [phrase, n];
          break;
        }
      }
      if (match) {
        const [phrase, n] = match;
        const entry = this.entries.get(phrase)!;
        items.push({
          text: phrase,
          supported: true,
          phrase: n > 1,
          ...entry,
        });
        i += n;
      } else {
        items.push({
          text: tokens[i],
          supported: false,
          phrase: false,
          sign_ids: [],
          verified: false,
          source: null,
          notes: "",
          english: "",
          category: "",
          display: tokens[i],
        });
        i += 1;
      }
    }
    return items;
  }
}

interface PhraseRecord {
  key: string;
  sign_ids: string[];
  english: string;
  kannada: string;
  category: string;
  verified: boolean;
  source: string;
  notes: string;
}

// Rule-based natural Kannada post-processor (port of backend/app/translation/llm_kannada.py)
const PRONOUN_DATIVE: Record<string, string> = {
  ನಾನು: "ನನಗೆ",
  ನೀವು: "ನಿಮಗೆ",
  ನೀನು: "ನಿನಗೆ",
  ಅವನು: "ಅವನಿಗೆ",
  ಅವಳು: "ಅವಳಿಗೆ",
  ನಾವು: "ನಮಗೆ",
  ಅವರು: "ಅವರಿಗೆ",
};

const NEED_VERBS = new Set(["ಬೇಕು", "ಬೇಡ", "ಹುಷಾರಿಲ್ಲ", "ಸಂತೋಷ", "ಗೊತ್ತು", "ಅರ್ಥವಾಯಿತು"]);

export function refineKannadaGrammar(
  glossTokens: string[],
  baselineKannada: string,
  nonManual?: Record<string, any> | string[] | null
): { kannada: string; method: string; latency_ms: number; cached: boolean; error: string | null } {
  const t0 = performance.now();
  let text = cleanDisplayText(baselineKannada);
  if (!text) {
    return { kannada: "", method: "passthrough", latency_ms: 0, cached: false, error: null };
  }

  const words = text.split(" ");
  if (words.length >= 2 && words[0] in PRONOUN_DATIVE && words.some((w) => NEED_VERBS.has(w))) {
    words[0] = PRONOUN_DATIVE[words[0]];
    text = words.join(" ");
  }

  // Non-manual markers (can be dict { sentence_type, negation } or string[])
  const nmList = Array.isArray(nonManual)
    ? nonManual
    : nonManual && typeof nonManual === "object"
      ? [nonManual.sentence_type, nonManual.negation ? "negation" : ""].filter(Boolean)
      : [];

  const isNeg = nmList.includes("head_shake") || nmList.includes("negation");
  const isQ =
    nmList.includes("eyebrow_raise") ||
    nmList.includes("brow_furrow") ||
    nmList.includes("question") ||
    nmList.includes("yes_no_question") ||
    nmList.includes("wh_question");

  if (isNeg) {
    if (text.includes("ಬೇಕು")) {
      text = text.replace(/ಬೇಕು/g, "ಬೇಡ");
    } else if (!text.includes("ಇಲ್ಲ") && !text.includes("ಬೇಡ") && !text.includes("ಅಲ್ಲ")) {
      text = text.replace(/[.?!]+$/, "") + " ಇಲ್ಲ.";
    }
  }
  if (isQ && !text.endsWith("?")) {
    text = text.replace(/[.!]+$/, "") + "?";
  } else if (!/[.?!]$/.test(text)) {
    text += ".";
  }

  return {
    kannada: text,
    method: "rules",
    latency_ms: Math.round((performance.now() - t0) * 100) / 100,
    cached: false,
    error: null,
  };
}

export class SemanticTranslator {
  public vocab: Vocabulary;
  public mapper: KannadaSignMapper;
  public trained: Set<string>;
  private bySigns: Map<string, PhraseRecord[]> = new Map();
  private maxLen = 1;

  constructor(vocab: Vocabulary, mapper: KannadaSignMapper, trainedClasses?: Iterable<string>) {
    this.vocab = vocab;
    this.mapper = mapper;
    this.trained = new Set(trainedClasses ?? []);
    this.reload();
  }

  reload(): void {
    this.bySigns.clear();
    let maxL = 1;
    for (const [key, e] of this.mapper.entries.entries()) {
      if (!e.category || !e.english) continue;
      const sigKey = e.sign_ids.join("|");
      const ph: PhraseRecord = {
        key,
        sign_ids: [...e.sign_ids],
        english: e.english,
        kannada: e.display,
        category: e.category,
        verified: e.verified,
        source: e.source,
        notes: e.notes,
      };
      const arr = this.bySigns.get(sigKey) ?? [];
      arr.push(ph);
      this.bySigns.set(sigKey, arr);
      if (e.sign_ids.length > maxL) maxL = e.sign_ids.length;
    }
    this.maxLen = maxL;
  }

  normalizeGlosses(labels: string[]): Array<Record<string, any>> {
    const out: Array<Record<string, any>> = [];
    for (const raw of labels) {
      const lab = (raw || "").trim();
      if (!lab || lab === NONE_LABEL) continue;
      const entry = this.vocab.get(lab);
      if (!entry) {
        out.push({
          sign_id: lab,
          gloss: lab.toUpperCase(),
          known: false,
          english: "",
          kannada: "",
          recognisable: false,
        });
      } else {
        out.push({
          sign_id: lab,
          gloss: entry.isl_gloss || lab.toUpperCase(),
          known: true,
          english: entry.english,
          kannada: entry.kannada,
          recognisable: this.trained.size === 0 || this.trained.has(lab),
          verified: entry.verified,
        });
      }
    }
    return out;
  }

  directKannada(labels: string[]): string {
    return this.normalizeGlosses(labels)
      .map((g) => g.kannada)
      .filter(Boolean)
      .join(" ");
  }

  translate(labels: string[], nonManual?: any): Record<string, any> {
    const glosses = this.normalizeGlosses(labels);
    const ids = glosses.map((g) => g.sign_id);
    const segments: Array<Record<string, any>> = [];
    let i = 0;

    while (i < ids.length) {
      let match: [number, PhraseRecord[]] | null = null;
      for (let n = Math.min(this.maxLen, ids.length - i); n > 0; n--) {
        const key = ids.slice(i, i + n).join("|");
        const cands = this.bySigns.get(key);
        if (cands && cands.length > 0) {
          match = [n, cands];
          break;
        }
      }
      if (match) {
        const [n, cands] = match;
        const main = cands[0];
        segments.push({
          type: "phrase",
          sign_ids: [...main.sign_ids],
          glosses: glosses.slice(i, i + n).map((g) => g.gloss),
          english: main.english,
          kannada: main.kannada,
          category: main.category,
          verified: main.verified,
          source: main.source,
          notes: main.notes,
          ambiguous: cands.length > 1,
          alternatives: cands.slice(1).map((c) => ({
            english: c.english,
            kannada: c.kannada,
            notes: c.notes,
          })),
        });
        i += n;
      } else {
        const g = glosses[i];
        if (g.known) {
          segments.push({
            type: "word",
            sign_ids: [g.sign_id],
            glosses: [g.gloss],
            english: g.english,
            kannada: g.kannada,
            verified: false,
            source: "word gloss (labels.json)",
            ambiguous: false,
            alternatives: [],
          });
        } else {
          segments.push({
            type: "unknown",
            sign_ids: [g.sign_id],
            glosses: [g.gloss],
            english: "",
            kannada: "",
            verified: false,
            source: null,
            ambiguous: false,
            alternatives: [],
          });
        }
        i += 1;
      }
    }

    const phraseSigns = segments
      .filter((s) => s.type === "phrase")
      .reduce((acc, s) => acc + s.sign_ids.length, 0);
    const n = ids.length;
    let status = "word_by_word";
    if (n === 0) status = "empty";
    else if (segments.some((s) => s.type === "unknown")) status = "unsupported";
    else if (phraseSigns === n && segments.length === 1) status = "phrase";
    else if (phraseSigns === n) status = "phrases";
    else if (phraseSigns > 0) status = "partial";

    const englishText = segments
      .map((s) => {
        if (s.type === "phrase") return s.english;
        if (s.type === "word") return `[${String(s.english).split("/")[0].trim().toLowerCase()}]`;
        return `[unknown sign ${s.glosses[0]}]`;
      })
      .join(" ");

    const kannadaText = cleanDisplayText(
      segments
        .map((s) => s.kannada)
        .filter(Boolean)
        .join(" ")
    );

    const llm =
      glosses.length === 0
        ? { kannada: "", method: "passthrough", latency_ms: 0, cached: false, error: null }
        : refineKannadaGrammar(
            glosses.map((g) => g.gloss),
            kannadaText,
            nonManual
          );

    return {
      gloss_sequence: glosses.map((g) => g.gloss),
      sign_ids: ids,
      english_text: englishText,
      kannada_text: kannadaText,
      segments,
      status,
      phrase_coverage: n ? Math.round((phraseSigns / n) * 1000) / 1000 : 0.0,
      ambiguous: segments.some((s) => s.ambiguous),
      unknown: segments.filter((s) => s.type === "unknown").map((s) => s.glosses[0]),
      verified: segments.length > 0 && segments.every((s) => s.verified),
      method: "phrase table (sequence-level), English meaning and Kannada from the same entry",
      natural_kannada: llm.kannada,
      llm_method: llm.method,
      llm_latency_ms: llm.latency_ms,
      llm_cached: llm.cached,
      llm_error: llm.error,
      non_manual: nonManual ?? null,
    };
  }

  reverse(text: string): Record<string, any> {
    const items = this.mapper.translate(normalizeKannada(text));
    const plan: Array<Record<string, any>> = [];
    for (const it of items) {
      let english = it.english || "";
      if (it.supported && !english) {
        english = (it.sign_ids as string[])
          .map((s) => this.vocab.get(s)?.english)
          .filter(Boolean)
          .join(" ");
      }
      plan.push({
        text: it.text,
        supported: it.supported,
        phrase: it.phrase,
        english,
        sign_ids: it.sign_ids,
        glosses: (it.sign_ids as string[]).map((s) => this.vocab.get(s)?.isl_gloss ?? s.toUpperCase()),
        mapping_source: it.source,
        verified: Boolean(it.verified),
      });
    }
    return {
      items: plan,
      english_meaning: plan
        .map((p) => p.english)
        .filter(Boolean)
        .join(" "),
      gloss_sequence: plan.flatMap((p) => p.glosses),
      unsupported: plan.filter((p) => !p.supported).map((p) => p.text),
    };
  }
}

export interface TranscriptToken {
  label: string;
  kannada: string;
  english: string;
  confidence: number;
  source: string;
  t: number;
}

export class SentenceBuilder {
  private vocab: Vocabulary;
  private minRepeatMs: number;
  public tokens: TranscriptToken[] = [];

  constructor(vocab: Vocabulary, minRepeatMs = 600.0) {
    this.vocab = vocab;
    this.minRepeatMs = minRepeatMs;
  }

  add(label: string, confidence: number, t: number, source = "model"): TranscriptToken | null {
    if (!this.vocab.emittable(label)) return null;
    if (this.tokens.length > 0) {
      const last = this.tokens[this.tokens.length - 1];
      if (last.label === label && t - last.t < this.minRepeatMs) {
        return null;
      }
    }
    const entry = this.vocab.get(label);
    if (!entry) return null;
    const token: TranscriptToken = {
      label,
      kannada: entry.kannada,
      english: entry.english,
      confidence: Math.round(Number(confidence) * 10000) / 10000,
      source,
      t,
    };
    this.tokens.push(token);
    return token;
  }

  text(): string {
    return this.tokens.map((tok) => tok.kannada).join(" ");
  }

  clear(): void {
    this.tokens = [];
  }
}
