import { useEffect, useRef, useState } from "react";
import { AvatarView, type AvatarHandle, type PlaybackState } from "../avatar/AvatarView";
import { Icon } from "../components/Icon";
import { Btn, Card, Chip, Empty, Notice, Spinner } from "../components/ui";
import { api } from "../services/api";
import { listenKannada, speechRecognitionSupported } from "../services/speech";
import type { AnimationClip, TranslationItem, TranslationResult, TranslationSign } from "../services/types";

const EXAMPLES = ["ನಮಸ್ಕಾರ", "ನಿಮ್ಮ ಹೆಸರು ಏನು?", "ನನಗೆ ಸಹಾಯ ಬೇಕು", "ನನಗೆ ನೀರು ಬೇಕು", "ಧನ್ಯವಾದಗಳು"];

interface SeqSign {
  group: number;
  item: TranslationItem;
  sign: TranslationSign;
  clip: AnimationClip | null;
  error?: string;
}

function clipBadge(s: SeqSign) {
  if (!s.clip) return <Chip tone="warn" icon="alert">{s.error ? "clip failed to load" : "no animation yet"}</Chip>;
  if (s.clip.type === "captured") {
    const src = s.clip.dataset_source;
    const name = src ? ({ amrita_slr: "Amrita SLR", include: "INCLUDE", isl_csltr: "ISL-CSLTR" } as Record<string, string>)[src.dataset] ?? src.dataset : null;
    const where = src ? `extracted from ${name} video ${src.file ?? src.sample_id}` : "captured from a recording";
    return <Chip tone={s.clip.verified ? "ok" : "info"} title={`${s.clip.description ?? ""} Source: ${src ? `${src.dataset}/${src.sample_id} (${src.file ?? ""}, signer group ${src.signer_group ?? "?"})` : "your recording"}`}>{where}{s.clip.verified ? " · verified" : " · unverified ISL"}</Chip>;
  }
  return <Chip tone="sim" title={s.clip.description}>placeholder · not verified ISL</Chip>;
}

export function KannadaToSign() {
  const [text, setText] = useState(EXAMPLES[1]);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [sequence, setSequence] = useState<SeqSign[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({ playing: false, paused: false, index: -1, progress: 0 });
  const [playing, setPlaying] = useState<SeqSign[]>([]);
  const [speed, setSpeed] = useState(1);
  const [listening, setListening] = useState(false);
  const [speechMsg, setSpeechMsg] = useState("");
  const avatarRef = useRef<AvatarHandle | null>(null);
  const stopListenRef = useRef<() => void>(() => undefined);

  const [phrases, setPhrases] = useState<{ kannada: string; english: string; category: string; missing_animations: string[] }[]>([]);
  useEffect(() => {
    api.phrases().then((r) => setPhrases(r.phrases)).catch(() => undefined);
    return () => stopListenRef.current();
  }, []);
  const categories = Array.from(new Set(phrases.map((p) => p.category)));

  const playable = sequence.filter((s) => s.clip);
  const missing = sequence.filter((s) => !s.clip);

  const play = (list: SeqSign[]) => {
    setPlaying(list);
    avatarRef.current?.play(list.map((s) => s.clip!));
  };

  const translate = async () => {
    setError(null);
    setBusy(true);
    avatarRef.current?.stop();
    try {
      const res = await api.translate(text);
      setResult(res);
      const flat: SeqSign[] = [];
      res.items.forEach((item, group) => item.signs.forEach((sign) => flat.push({ group, item, sign, clip: null })));
      const loaded = await Promise.all(
        flat.map(async (s) => {
          if (!s.sign.animation.available) return s;
          try {
            return { ...s, clip: await api.animation(s.sign.sign_id) };
          } catch (err) {
            return { ...s, error: String((err as Error).message || err) };
          }
        }),
      );
      setSequence(loaded);
      const clips = loaded.filter((s) => s.clip);
      if (clips.length) play(clips);
    } catch (err) {
      setError(String((err as Error).message || err));
      setResult(null);
      setSequence([]);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setText("");
    setResult(null);
    setSequence([]);
    setPlaying([]);
    setError(null);
    avatarRef.current?.stop();
  };

  const toggleListen = () => {
    if (listening) return stopListenRef.current();
    setSpeechMsg("");
    setListening(true);
    stopListenRef.current = listenKannada(
      (t) => setText((prev) => (prev ? `${prev} ${t}` : t)),
      (e) => setSpeechMsg(e),
      () => setListening(false),
    );
  };

  const current = playback.playing && playback.index >= 0 ? playing[playback.index] : null;
  const groups = result?.items ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Kannada to Sign</h2>
          <p>Type Kannada text. Supported words and phrases are converted to an ordered ISL sign sequence and played on the avatar. Unsupported words are skipped and listed.</p>
        </div>
      </div>
      <div className="k2s-layout">
        <div className="stack">
          <Card title="Kannada text" icon="text">
            <textarea
              lang="kn"
              className="kn-input lg"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ಕನ್ನಡ ಪಠ್ಯವನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…"
              aria-label="Kannada text to translate"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
              }}
            />
            <div className="toolbar">
              <Btn icon="play" variant="primary" size="lg" onClick={translate} disabled={busy || !text.trim()}>
                {busy ? "Translating…" : "Translate to signs"}
              </Btn>
              <Btn icon="x" onClick={clear}>Clear</Btn>
              {speechRecognitionSupported() && (
                <Btn icon="mic" variant="ghost" onClick={toggleListen} title="Uses the browser's online speech service">
                  {listening ? "Stop listening" : "Speak Kannada"}
                </Btn>
              )}
            </div>
            <div className="examples">
              <span className="muted xs">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} className="example" lang="kn" onClick={() => setText(ex)}>{ex}</button>
              ))}
            </div>
            {phrases.length > 0 && (
              <details className="disclosure">
                <summary><Icon name="text" size={15} /> Phrase dictionary ({phrases.length} phrases, all unverified ISL glosses)</summary>
                <div className="disclosure-body">
                  {categories.map((cat) => (
                    <div key={cat} className="stack" style={{ gap: 6 }}>
                      <span className="xs muted" style={{ fontWeight: 700 }}>{cat}</span>
                      <div className="examples">
                        {phrases.filter((p) => p.category === cat).map((p) => (
                          <button key={p.kannada} className="example" lang="kn" onClick={() => setText(p.kannada)}
                            title={`${p.english}${p.missing_animations.length ? ` · no animation yet for: ${p.missing_animations.join(", ")}` : ""}`}>
                            {p.kannada}{p.missing_animations.length ? " ◌" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <span className="xs muted">◌ = at least one sign in this phrase has no avatar clip yet (it is skipped with a warning).</span>
                </div>
              </details>
            )}
            {speechRecognitionSupported() && <p className="muted xs">Speech input sends audio to the browser vendor's speech service. Typing works fully offline.</p>}
            {speechMsg && <Notice tone="warn">{speechMsg}</Notice>}
            {error && <Notice tone="bad">{error}</Notice>}
            {result?.unsupported_message && (
              <Notice tone="warn" title={<span lang="kn">ಸಂಜ್ಞೆ ಲಭ್ಯವಿಲ್ಲ · No sign available</span>}>
                <span lang="kn">{result.unsupported.join(", ")}</span>: these words are not in the supported dictionary and were skipped.
                {!result.contains_kannada && " The input does not appear to contain Kannada script."}
              </Notice>
            )}
            {missing.some((m) => m.item.supported) && (
              <Notice tone="warn" title={<span lang="kn">ಅನಿಮೇಷನ್ ಲಭ್ಯವಿಲ್ಲ · Animation unavailable</span>}>
                No avatar clip for: {missing.filter((m) => m.item.supported).map((m) => m.sign.isl_gloss || m.sign.sign_id).join(", ")}. These signs were skipped.
              </Notice>
            )}
          </Card>

          <Card title="Sign sequence" icon="layers" subtitle={result ? `${result.sign_count} sign(s) from ${result.supported_count} supported word/phrase(s)` : undefined}>
            {!result ? (
              <Empty icon="layers">The ISL sign sequence (gloss order) appears here after translation.</Empty>
            ) : (
              <>
              <div className="plan-preview">
                <div className="meaning-row"><span className="meaning-label">Meaning</span><span>{result.english_meaning || "—"}</span></div>
                <div className="meaning-row"><span className="meaning-label">ISL plan</span>
                  <span>{(result.gloss_sequence ?? []).map((g, i) => <span key={i} className="gloss-seg gloss-phrase">{g}</span>)}</span>
                </div>
                <div className="muted xs">The sign order comes from the phrase mappings (proposed ISL order), never from English word order. All mappings are unverified until reviewed by an ISL user.</div>
              </div>
              <ol className="timeline">
                {groups.map((item, g) => (
                  <li key={g} className={`tl-group ${item.supported ? "" : "unsupported"}`}>
                    <div className="tl-head">
                      <span className="tl-word" lang="kn">{item.text}</span>
                      {item.supported ? (
                        <span className="toolbar">
                          {item.phrase && <Chip tone="info" title={item.notes}>phrase</Chip>}
                          <Chip tone="muted" title={item.source ?? ""}>mapping unverified</Chip>
                        </span>
                      ) : (
                        <Chip tone="bad" icon="x">unsupported · skipped</Chip>
                      )}
                    </div>
                    {item.supported && (
                      <div className="muted xs">
                        {result.meaning_items?.[g]?.english && <>“{result.meaning_items[g].english}” · </>}
                        mapping: {item.source ?? "unspecified"}
                      </div>
                    )}
                    {item.supported && (
                      <div className="tl-signs">
                        {sequence.filter((s) => s.group === g).map((s) => {
                          const idx = playing.indexOf(s);
                          const active = current === s;
                          return (
                            <span key={s.sign.sign_id + idx} className={`tl-sign ${active ? "active" : ""}`}>
                              <span className="num">{playable.indexOf(s) + 1 || "–"}</span>
                              <span>
                                <span className="tl-gloss">{s.sign.isl_gloss || s.sign.sign_id}</span>
                                <span className="muted"> · {s.sign.english}</span>
                              </span>
                              {clipBadge(s)}
                              {s.clip && (
                                <button className="btn btn-ghost btn-sm" onClick={() => play([s])} aria-label={`Play sign ${s.sign.isl_gloss}`}>
                                  <Icon name="play" size={13} />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {item.phrase && item.notes && <span className="muted xs">{item.notes}</span>}
                  </li>
                ))}
              </ol>
              </>
            )}
            {result && <p className="muted xs">{result.note}</p>}
          </Card>
        </div>

        <div className="avatar-col">
          <Card title="Sign avatar" icon="hand" actions={<Chip tone="sim" title="Procedural Three.js avatar built for this prototype">Prototype avatar</Chip>}>
            <div className="avatar-stage">
              <AvatarView ref={avatarRef} onState={setPlayback} speed={speed} />
              {busy && <div className="avatar-loading"><Spinner label="Loading sign animations…" /></div>}
              <div className="avatar-hud">
                <div className="avatar-now" aria-live="polite">
                  {current ? (
                    <>
                      <span className="kn" lang="kn">{current.sign.kannada || current.item.text}</span>
                      <span className="gloss">{current.sign.isl_gloss} · {current.clip?.type === "captured" ? "captured clip" : "placeholder motion"}</span>
                    </>
                  ) : (
                    <span className="muted small">{playable.length ? "Ready, press Replay" : "Neutral pose"}</span>
                  )}
                </div>
                {playback.playing && <span className="chip chip-muted">{playback.index + 1} / {playing.length}</span>}
              </div>
            </div>
            <div className="progress" aria-label="Sequence progress"><div style={{ width: `${Math.round(playback.progress * 100)}%` }} /></div>
            <div className="toolbar">
              {playback.playing && !playback.paused && <Btn icon="pause" onClick={() => avatarRef.current?.pause()}>Pause</Btn>}
              {playback.playing && playback.paused && <Btn icon="play" variant="primary" onClick={() => avatarRef.current?.resume()}>Resume</Btn>}
              <Btn icon="replay" onClick={() => play(playable)} disabled={!playable.length}>Replay all</Btn>
              <Btn icon="stop" onClick={() => avatarRef.current?.stop()} disabled={!playback.playing}>Stop</Btn>
              <span className="grow" />
              <div className="seg" role="group" aria-label="Playback speed">
                {[0.5, 0.75, 1, 1.25].map((v) => (
                  <button key={v} className={speed === v ? "on" : ""} onClick={() => setSpeed(v)}>{v}×</button>
                ))}
              </div>
            </div>
            <p className="muted xs">
              Drag to rotate. Placeholder motions are illustrative only and are <strong>not verified Indian Sign Language</strong>. Capture clips from verified demonstrations on Dataset &amp; Model to replace them.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
