import { useEffect, useRef, useState } from "react";
import { AvatarView, type AvatarHandle, type PlaybackState } from "../avatar/AvatarView";
import { Card, Chip, Notice, Spinner } from "../components/ui";
import { api } from "../services/api";
import { listenKannada, speechRecognitionSupported } from "../services/speech";
import type { AnimationClip, TranslationItem, TranslationResult } from "../services/types";

const EXAMPLES = ["ನಮಸ್ಕಾರ ನಾನು ನೀರು ದಯವಿಟ್ಟು", "ಧನ್ಯವಾದಗಳು", "ಕ್ಷಮಿಸಿ ಸಹಾಯ", "ನೀವು ಒಳ್ಳೆಯದು ಹೌದು"];

interface SeqItem {
  item: TranslationItem;
  clip: AnimationClip | null;
}

function animBadge(clip: AnimationClip | null, item: TranslationItem) {
  if (!item.supported) return <Chip tone="bad">unsupported · skipped</Chip>;
  if (!clip) return <Chip tone="warn">no animation</Chip>;
  if (clip.type === "captured") return <Chip tone="ok" title={clip.description}>captured clip{clip.verified ? " · verified" : " · unverified"}</Chip>;
  return <Chip tone="sim" title={clip.description}>placeholder · not verified ISL</Chip>;
}

export function KannadaToSign() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [sequence, setSequence] = useState<SeqItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({ playing: false, paused: false, index: -1, progress: 0 });
  const [playingClips, setPlayingClips] = useState<SeqItem[]>([]);
  const [speed, setSpeed] = useState(1);
  const [listening, setListening] = useState(false);
  const [speechMsg, setSpeechMsg] = useState("");
  const avatarRef = useRef<AvatarHandle | null>(null);
  const stopListenRef = useRef<() => void>(() => undefined);

  useEffect(() => () => stopListenRef.current(), []);

  const playable = sequence.filter((s) => s.clip);

  const translate = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.translate(text);
      setResult(res);
      const items: SeqItem[] = await Promise.all(
        res.items.map(async (item) => {
          if (!item.supported || !item.sign_id || !item.animation.available) return { item, clip: null };
          try {
            return { item, clip: await api.animation(item.sign_id) };
          } catch {
            return { item, clip: null };
          }
        }),
      );
      setSequence(items);
      const clips = items.filter((s) => s.clip);
      setPlayingClips(clips);
      if (clips.length) avatarRef.current?.play(clips.map((s) => s.clip!));
    } catch (err) {
      setError(String((err as Error).message || err));
      setResult(null);
      setSequence([]);
    } finally {
      setBusy(false);
    }
  };

  const replayAll = () => {
    setPlayingClips(playable);
    avatarRef.current?.play(playable.map((s) => s.clip!));
  };
  const replayOne = (s: SeqItem) => {
    if (!s.clip) return;
    setPlayingClips([s]);
    avatarRef.current?.play([s.clip]);
  };
  const clear = () => {
    setText("");
    setResult(null);
    setSequence([]);
    setPlayingClips([]);
    avatarRef.current?.stop();
  };
  const toggleListen = () => {
    if (listening) {
      stopListenRef.current();
      return;
    }
    setSpeechMsg("");
    setListening(true);
    stopListenRef.current = listenKannada(
      (t) => setText((prev) => (prev ? `${prev} ${t}` : t)),
      (e) => setSpeechMsg(e),
      () => setListening(false),
    );
  };

  const current = playback.playing && playback.index >= 0 ? playingClips[playback.index] : null;

  return (
    <div className="page-grid k2s-grid">
      <Card title="Kannada text input" className="span-input">
        <textarea
          lang="kn"
          className="kn-text big"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ಕನ್ನಡ ಪಠ್ಯವನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ (e.g. ನಮಸ್ಕಾರ ನಾನು)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
          }}
        />
        <div className="toolbar">
          <button className="btn btn-primary" onClick={translate} disabled={busy || !text.trim()}>
            {busy ? <Spinner /> : null} Translate to signs
          </button>
          <button className="btn" onClick={clear}>Clear</button>
          {speechRecognitionSupported() && (
            <button className="btn" onClick={toggleListen} title="Uses the browser's online speech service">
              {listening ? "■ Stop listening" : "🎤 Speak Kannada"}
            </button>
          )}
        </div>
        {speechRecognitionSupported() && (
          <p className="muted small-text">Speech input uses your browser's speech service (audio is sent to the browser vendor's servers). Typing works fully offline.</p>
        )}
        {speechMsg && <Notice tone="warn">{speechMsg}</Notice>}
        <div className="examples">
          Examples:
          {EXAMPLES.map((ex) => (
            <button key={ex} className="btn btn-small btn-ghost" lang="kn" onClick={() => setText(ex)}>{ex}</button>
          ))}
        </div>
        {error && <Notice tone="bad">{error}</Notice>}
        {result && result.unsupported.length > 0 && (
          <Notice tone="warn">
            Not in the supported sign dictionary (skipped): <strong lang="kn">{result.unsupported.join(", ")}</strong>
            {!result.contains_kannada && " — the input does not appear to contain Kannada script."}
          </Notice>
        )}
        {result && <p className="muted small-text">{result.note}</p>}
      </Card>

      <Card
        title="Sign avatar"
        className="span-avatar"
        actions={<Chip tone="sim" title="Built from primitives; see About page">Procedural prototype avatar</Chip>}
      >
        <div className="avatar-box">
          <AvatarView ref={avatarRef} onState={setPlayback} speed={speed} />
          <div className="avatar-caption">
            {current ? (
              <>
                <span lang="kn" className="cap-kn">{current.item.text}</span>
                <span className="cap-en">{current.item.english} · {current.clip?.type === "captured" ? "captured clip" : "placeholder motion"}</span>
              </>
            ) : (
              <span className="muted">{playable.length ? "Ready" : "Translate text to play signs"}</span>
            )}
          </div>
        </div>
        <div className="progress" aria-label="Sequence progress"><div style={{ width: `${Math.round(playback.progress * 100)}%` }} /></div>
        <div className="toolbar">
          {playback.playing && !playback.paused && <button className="btn" onClick={() => avatarRef.current?.pause()}>❚❚ Pause</button>}
          {playback.playing && playback.paused && <button className="btn btn-primary" onClick={() => avatarRef.current?.resume()}>▶ Resume</button>}
          <button className="btn" onClick={replayAll} disabled={!playable.length}>↻ Replay all</button>
          <button className="btn" onClick={() => avatarRef.current?.stop()} disabled={!playback.playing}>■ Stop</button>
          <label className="inline-range">
            Speed {speed.toFixed(2)}×
            <input type="range" min={0.5} max={1.5} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
        </div>
        <p className="muted small-text">Drag to rotate the view. Placeholder motions are illustrative only and are <strong>not verified Indian Sign Language</strong>; record and capture verified demonstrations to replace them.</p>
      </Card>

      <Card title="Sign sequence timeline" className="span-timeline">
        {sequence.length === 0 ? (
          <span className="muted">The ordered list of signs will appear here after translation.</span>
        ) : (
          <ol className="timeline">
            {sequence.map((s, i) => {
              const active = current && current === s;
              return (
                <li key={i} className={`tl-item ${s.item.supported ? "" : "tl-unsupported"} ${active ? "tl-active" : ""}`}>
                  <div className="tl-kn" lang="kn">{s.item.text}</div>
                  <div className="tl-meta">{s.item.sign_id ?? "—"}{s.item.english ? ` · ${s.item.english}` : ""}</div>
                  <div>{animBadge(s.clip, s.item)}</div>
                  {s.clip && <button className="btn btn-small btn-ghost" onClick={() => replayOne(s)}>▶ Play this sign</button>}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
