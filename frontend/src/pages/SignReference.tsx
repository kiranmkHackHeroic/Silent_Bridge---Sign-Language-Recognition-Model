import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarView, type AvatarHandle } from "../avatar/AvatarView";
import { Icon } from "../components/Icon";
import { Btn, Card, Chip, Empty, Notice, Spinner } from "../components/ui";
import { api } from "../services/api";
import type { SignReference as Reference, VocabEntry } from "../services/types";

const SPEEDS = [0.5, 0.75, 1];

/**
 * Shows how each sign looks in the real ISL dataset recordings the model was trained on, so a user can sign it
 * the same way. These recordings define what the model recognises; they are not a verified ISL dictionary.
 */
export function SignReference() {
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [ref, setRef] = useState<Reference | null>(null);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [speed, setSpeed] = useState(0.75);
  const [mirror, setMirror] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<AvatarHandle>(null);

  useEffect(() => {
    api.vocabulary()
      .then((v) => {
        const signs = v.labels.filter((e) => e.label !== "_none");
        setVocab(signs);
        const first = signs.find((e) => e.trained) ?? signs[0];
        if (first) setSelected((cur) => cur ?? first.label);
      })
      .catch((e) => setError(`Could not load the sign list: ${String(e.message || e)}. Is the backend running?`));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setRef(null);
    setSampleIdx(0);
    setVideoError(false);
    avatarRef.current?.stop();
    api.reference(selected)
      .then(setRef)
      .catch((e) => setError(`Could not load the reference for “${selected}”: ${String(e.message || e)}`))
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, sampleIdx, ref]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? vocab.filter((v) => [v.label, v.english, v.kannada, v.isl_gloss].some((s) => (s || "").toLowerCase().includes(q)))
      : vocab;
    return [...list].sort((a, b) => Number(Boolean(b.trained)) - Number(Boolean(a.trained)) || a.english.localeCompare(b.english));
  }, [vocab, query]);

  const sample = ref?.samples[sampleIdx] ?? null;

  const playAvatar = async () => {
    if (!ref) return;
    try {
      const clip = await api.animation(ref.label);
      avatarRef.current?.play([clip]);
    } catch (e) {
      setError(`No avatar clip for “${ref.label}”: ${String((e as Error).message || e)}`);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Sign Reference</h2>
          <p>How each sign looks in the Indian Sign Language dataset recordings the model learned from. Sign it the same way (handshape, position and movement) for the best live recognition.</p>
        </div>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="ref-layout">
        <Card title="Signs" icon="hand" subtitle={`${vocab.filter((v) => v.trained).length} recognised by the model`}>
          <input
            className="ref-search"
            type="search"
            id="ref-search"
            placeholder="Search English, Kannada or gloss…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search signs"
          />
          <ul className="ref-list" role="listbox" aria-label="Signs">
            {filtered.map((v) => (
              <li key={v.label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === v.label}
                  className={`ref-item ${selected === v.label ? "on" : ""}`}
                  onClick={() => setSelected(v.label)}
                >
                  <span className="kn" lang="kn">{v.kannada || "—"}</span>
                  <span className="ref-en">{v.english}</span>
                  {!v.trained && <span className="chip chip-muted">not in model</span>}
                </button>
              </li>
            ))}
            {!filtered.length && <li className="muted small">No sign matches “{query}”.</li>}
          </ul>
        </Card>

        <div className="stack">
          <Card
            title={ref ? <span><span className="kn" lang="kn">{ref.kannada}</span> · {ref.english}</span> : "Reference"}
            icon="eye"
            actions={ref && (ref.trained ? <Chip tone="ok">recognised by the model</Chip> : <Chip tone="warn">not trained yet</Chip>)}
          >
            {loading && <Spinner label="Loading reference…" />}
            {ref && (
              <>
                <div className="ref-meta">
                  <span>ISL gloss <code>{ref.isl_gloss}</code></span>
                  <span>{ref.dataset_recordings} dataset recording{ref.dataset_recordings === 1 ? "" : "s"}</span>
                </div>
                {sample ? (
                  <>
                    {ref.samples.length > 1 && (
                      <div className="seg" role="tablist" aria-label="Reference recordings">
                        {ref.samples.map((s, i) => (
                          <button key={s.sample_id} role="tab" aria-selected={i === sampleIdx} className={i === sampleIdx ? "on" : ""}
                            onClick={() => { setSampleIdx(i); setVideoError(false); }}>
                            Signer {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    {videoError ? (
                      <Empty icon="cameraOff">This browser cannot play <code>{sample.file}</code>. Try another signer, or use Chrome or Edge.</Empty>
                    ) : (
                      <video
                        key={sample.sample_id}
                        ref={videoRef}
                        className={`ref-video ${mirror ? "mirror" : ""}`}
                        src={sample.video_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        onLoadedMetadata={(e) => { e.currentTarget.playbackRate = speed; }}
                        onCanPlay={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => undefined); }}
                        onError={() => setVideoError(true)}
                        aria-label={`Reference recording of ${ref.english}`}
                      />
                    )}
                    <div className="toolbar">
                      <div className="seg" aria-label="Playback speed">
                        {SPEEDS.map((s) => (
                          <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}×</button>
                        ))}
                      </div>
                      <label className="switch">
                        <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror (copy it like a mirror)
                      </label>
                    </div>
                    <p className="muted xs">
                      Signer group <code>{sample.signer_group}</code> · <code>{sample.file}</code> · {sample.duration_s} s · {sample.citation}
                    </p>
                  </>
                ) : (
                  <Empty icon="info">
                    {ref.dataset_recordings
                      ? "The original dataset videos are not on this computer (they are not part of the Git repository). Download and import the datasets to see them here, or watch the avatar below."
                      : "No dataset recording exists for this sign. It was added to the vocabulary by a user; the model only learns it from your own recordings."}
                  </Empty>
                )}
              </>
            )}
          </Card>

          <Card title="How to sign for the best recognition" icon="info">
            <ol className="ref-tips">
              <li>Start with your hands down, sign <strong>once</strong> at the speed shown, then <strong>lower your hands</strong> or pause before the next sign.</li>
              <li>Copy the handshape, where the hand is (near the face, chest or side) and the direction of movement. These matter most to the model.</li>
              <li>Keep your face and both hands in the frame, 1–1.5 m from the camera, with light in front of you.</li>
              <li>If your own (regional) way of signing differs from these recordings, the model will often miss it: it only knows the versions in the Amrita SLR (Kerala) and INCLUDE (Chennai) datasets. Record your version as training data on Dataset &amp; Model to teach it.</li>
            </ol>
            <p className="muted xs">These are real dataset recordings, not a verified ISL dictionary: they show what the model was trained on.</p>
          </Card>

          <Card title="Avatar version" icon="layers" actions={ref && ref.animation.available && <Chip tone="sim">{ref.animation.type}{ref.animation.verified ? " ✓" : " · unverified"}</Chip>}>
            <div className="avatar-stage ref-avatar">
              <AvatarView ref={avatarRef} speed={speed} />
            </div>
            <div className="toolbar">
              <Btn icon="play" variant="primary" onClick={playAvatar} disabled={!ref?.animation.available}>Play on avatar</Btn>
              {!ref?.animation.available && ref && <span className="muted xs"><Icon name="info" size={13} /> No avatar clip yet. Create one on Dataset &amp; Model (“Use as avatar clip”).</span>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
