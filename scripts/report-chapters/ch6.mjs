// Chapter 6: Implementation and Integration (Pages 43–51)
// Strictly adheres to BMSCE CSBS B.E. Project Report Guidelines

export function buildChapter6(figSrcs = {}) {
  const {
    figUiLive = "/report/fig_ui_live.png",
    figUiCustom = "/report/fig_ui_custom.png",
    figUiAvatar = "/report/fig_ui_avatar.png",
    figUiReference = "/report/fig_ui_reference.png",
    figUiDataset = "/report/fig_ui_dataset.png",
    figUiTesting = "/report/fig_ui_testing.png",
  } = figSrcs;
  const page43 = String.raw`
  <section class="report-page body-page" data-page="43">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>
    <div class="chapter-num-header">CHAPTER 6</div>
    <div class="chapter-title-center">IMPLEMENTATION AND INTEGRATION</div>

    <div class="sec-h1">6.1 Development Environment and Technology Stack</div>
    <p>
      <strong>Silent Bridge</strong> is implemented as a full-stack, cross-platform TypeScript and Python repository with bit-accurate parity between offline Python training scripts and the real-time TypeScript/Node.js and in-browser WebAssembly inference engines. Table 6.1 details the complete production technology stack.
    </p>

    <div class="table-caption">Table 6.1 Production Technology Stack Across Frontend, Vision, Neural Runtime, and Backend</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:24%;">Subsystem Layer</th>
          <th style="width:30%;">Packages &amp; Versions</th>
          <th style="width:46%;">Implementation Details in Repository</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Frontend SPA &amp; Build</strong></td>
          <td>React 18.3.1, TypeScript 5.6.3, Vite 5.4.10</td>
          <td>Strict-mode functional hooks architecture in <code>frontend/src/</code>; local bundled fonts (<code>@fontsource/noto-sans-kannada</code>, <code>inter</code>).</td>
        </tr>
        <tr>
          <td><strong>Browser Vision WASM</strong></td>
          <td><code>@mediapipe/tasks-vision</code> 0.10.17</td>
          <td>Offline WASM binaries in <code>public/mediapipe-wasm/</code> and task bundles <code>hand_landmarker.task</code> &amp; <code>face_landmarker.task</code>.</td>
        </tr>
        <tr>
          <td><strong>In-Browser Neural Engine</strong></td>
          <td><code>onnxruntime-web</code> 1.21.0 (WASM SIMD)</td>
          <td>Executes <code>public/models/sign_model.onnx</code> (3,668-D input &rarr; 144 classes) with 3-view TTA directly in browser memory.</td>
        </tr>
        <tr>
          <td><strong>3D Character Avatar</strong></td>
          <td><code>three</code> 0.170.0 (Three.js WebGL 2.0)</td>
          <td>Procedural Pixar-style character rig (<code>AvatarRig.ts</code>), analytic 2-bone IK (<code>animation.ts</code>), Kannada visemes (<code>lipSync.ts</code>).</td>
        </tr>
        <tr>
          <td><strong>Real-Time Server &amp; WS</strong></td>
          <td>Node.js 22, Express 5.1.0, <code>ws</code> 8.18.0, <code>onnxruntime-node</code> 1.21.0</td>
          <td>Unified server (<code>server.ts</code>) + <code>backend_ts/features.ts</code> &amp; <code>translation.ts</code> + Python FastAPI training suite (<code>backend/app/</code>).</td>
        </tr>
        <tr>
          <td><strong>Automated Verification</strong></td>
          <td><code>node:test</code> (tsx), <code>pytest</code>, Playwright CLI</td>
          <td>48 TypeScript unit tests across 8 suites + 160 Python backend tests + headless Chromium E2E verification.</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-h1">6.2 Implementation Approach</div>
    <p>
      A core architectural principle of our implementation is <strong>Pure Logic Decoupling and Cross-Runtime Parity</strong>:
    </p>
    <ul>
      <li>All mathematical feature extraction (<code>hands-face-v2</code>), sequence cleaning, motion segmentation, 3-view TTA cropping, block-balanced cosine similarity, transcript editing, facial expression heuristics, and 3D avatar inverse kinematics are written as pure, deterministic functions free of DOM or network side effects.</li>
      <li>Every pure module is paired with an automated unit test suite (<code>features.test.ts</code>, <code>customSigns.test.ts</code>, <code>animation.test.ts</code>, <code>expressionClassifier.test.ts</code>, <code>speech.test.ts</code>, <code>transcript.test.ts</code>) runnable in under $1.5\text{ seconds}$ via <code>npx tsx --test</code>.</li>
      <li>During build and installation, <code>scripts/copy-mediapipe-wasm.mjs</code> copies MediaPipe and ONNX Runtime WebAssembly binaries into <code>frontend/public/</code> and patches Emscripten’s C++ <code>stderr</code> logger so informational TensorFlow Lite XNNPACK messages are routed to <code>console.debug</code> rather than triggering false console errors.</li>
    </ul>
    <div class="page-footer-arabic">43</div>
  </section>`;

  const page44 = String.raw`
  <section class="report-page body-page" data-page="44">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h1">6.3 Module-wise Implementation</div>
    <div class="sec-h2">6.3.1 147-D Feature Extraction, Occlusion Imputation &amp; 3-View TTA (backend_ts/features.ts)</div>
    <p>
      In <code>backend_ts/features.ts</code>, incoming landmark frames are processed through <code>FaceTracker</code> (maintaining an $\alpha=0.35$ EMA bounding box across up to $45$ occluded frames), <code>stabilizeSingleHandSlots</code> (correcting isolated 1–2 frame MediaPipe left/right handedness label flips and inverting the palm normal $\hat{\mathbf{n}}$), <code>imputeFaceRelative</code> (reconstructing missing <code>FACEREL_OFFSET</code> coordinates using the segment’s median visible face anchor), and <code>framesToVectorsTTA</code>. Listing 6.1 shows the core implementation of <code>stabilizeSingleHandSlots</code> and <code>framesToVectorsTTA</code>.
    </p>

    <div class="code-box">
      <div class="code-title">Listing 6.1: Single-Hand Slot Stabilization and 3-View Test-Time Augmentation (backend_ts/features.ts)</div>
      <pre class="code-pre">export function stabilizeSingleHandSlots(matrix: number[][]): void {
  const n = matrix.length;
  if (n &lt; 3) return;
  const p0 = (t: number) =&gt; matrix[t][PRESENCE_OFFSET] &gt; 0.5;
  const p1 = (t: number) =&gt; matrix[t][HAND_DIM + PRESENCE_OFFSET] &gt; 0.5;
  let singleHandFrames = 0, slot0Count = 0, slot1Count = 0;
  for (let t = 0; t &lt; n; t++) {
    if (p0(t) !== p1(t)) {
      singleHandFrames++;
      if (p0(t)) slot0Count++; else slot1Count++;
    }
  }
  if (singleHandFrames &lt; Math.floor(n * 0.7)) return;
  const dominantSlot = slot0Count &gt;= slot1Count ? 0 : 1;
  const otherSlot = 1 - dominantSlot;
  for (let t = 1; t &lt; n - 1; t++) {
    const domPresent = matrix[t][dominantSlot * HAND_DIM + PRESENCE_OFFSET] &gt; 0.5;
    const othPresent = matrix[t][otherSlot * HAND_DIM + PRESENCE_OFFSET] &gt; 0.5;
    if (!domPresent &amp;&amp; othPresent) {
      const dstBase = dominantSlot * HAND_DIM, srcBase = otherSlot * HAND_DIM;
      for (let k = 0; k &lt; HAND_DIM; k++) {
        matrix[t][dstBase + k] = matrix[t][srcBase + k];
        matrix[t][srcBase + k] = 0;
      }
      // Invert palm normal chirality when swapping Left &lt;-&gt; Right slot
      for (let k = 3; k &lt; 6; k++) matrix[t][dstBase + ORIENT_OFFSET + k] *= -1;
    }
  }
}

export function framesToVectorsTTA(
  frames: FrameFeatures[], cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): Array&lt;{ vector: Float32Array; weight: number; view: string }&gt; | null {
  const cleaned = cleanSequence(frames.map((f) =&gt; [...f.vector]), cfg);
  if (!cleaned) return null;
  const views: Array&lt;{ vector: Float32Array; weight: number; view: string }&gt; = [];
  views.push({ vector: matrixToVector(cleaned, cfg), weight: 0.50, view: "full" });
  const denoised = trimIdleEnds(smoothSequenceMatrix(cleaned), cfg);
  views.push({ vector: matrixToVector(denoised, cfg), weight: 0.30, view: "denoised" });
  if (cleaned.length &gt;= 8) {
    const cut = Math.max(1, Math.floor(cleaned.length * 0.08));
    const core = cleaned.slice(cut, cleaned.length - cut);
    if (core.length &gt;= cfg.min_frames) {
      views.push({ vector: matrixToVector(smoothSequenceMatrix(core), cfg), weight: 0.20, view: "core" });
    }
  }
  const totalW = views.reduce((s, v) =&gt; s + v.weight, 0);
  for (const v of views) v.weight /= totalW;
  return views;
}</pre>
    </div>
    <div class="page-footer-arabic">44</div>
  </section>`;

  const page45 = String.raw`
  <section class="report-page body-page" data-page="45">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h2">6.3.2 100% In-Browser ONNX Engine &amp; Real 21-Landmark Motion (onnxInference.ts)</div>
    <p>
      The client-side neural engine (<code>frontend/src/services/onnxInference.ts</code>) loads <code>/models/sign_model.onnx</code> via <code>onnxruntime-web</code> and performs segmentation, sequence cleaning, and 3-view TTA inference entirely inside the browser. A critical accuracy fix implemented in this module was replacing a static palm-size proxy with <code>computeRealMotion</code>, which computes true frame-to-frame Euclidean displacement across all 21 hand landmarks normalized to a $30\text{ FPS}$ ($33.3\text{ ms}$) frame interval. Listing 6.2 shows the real motion computation and in-browser TTA ensemble classifier.
    </p>

    <div class="code-box">
      <div class="code-title">Listing 6.2: Frame-to-Frame 21-Landmark Motion &amp; Browser ONNX TTA Inference (onnxInference.ts)</div>
      <pre class="code-pre">private computeRealMotion(prev: ParsedBrowserFrame | null, curr: ParsedBrowserFrame): number {
  if (!prev) return 0.0;
  const dt = Math.max(curr.t - prev.t, 1);
  const values: number[] = [];
  for (const slot of ["0", "1"]) {
    const a = prev.points[slot], b = curr.points[slot];
    if (!a || !b || !a.length || !b.length) continue;
    let total = 0.0, count = Math.min(a.length, b.length);
    for (let i = 0; i &lt; count; i++) total += Math.hypot(b[i][0] - a[i][0], b[i][1] - a[i][1], b[i][2] - a[i][2]);
    values.push(total / count);
  }
  return values.length ? Math.max(...values) * (33.3 / Math.min(dt, 200.0)) : 0.0;
}

public async classifySegmentFrames(segmentFrames: ParsedBrowserFrame[]): Promise&lt;OnnxPrediction | null&gt; {
  const cleaned = this.cleanSequence(segmentFrames.map((f) =&gt; [...f.vector]));
  if (!cleaned || !this.session) return null;
  const views = [{ vec: this.matrixToVector(cleaned), weight: this.useTTA ? 0.50 : 1.0 }];
  if (this.useTTA) {
    views.push({ vec: this.matrixToVector(this.trimIdleEnds(this.smoothSequenceMatrix(cleaned))), weight: 0.30 });
    const cut = Math.max(1, Math.floor(cleaned.length * 0.08)), core = cleaned.slice(cut, -cut);
    if (core.length &gt;= this.minFrames) views.push({ vec: this.matrixToVector(this.smoothSequenceMatrix(core)), weight: 0.20 });
  }
  const combinedProbs = new Float32Array(this.classes.length);
  const weightSum = views.reduce((s, v) =&gt; s + v.weight, 0);
  for (const v of views) {
    const probs = await this.runVectorInference(v.vec);
    if (!probs) return null;
    for (let i = 0; i &lt; combinedProbs.length; i++) combinedProbs[i] += (v.weight / weightSum) * probs[i];
  }
  return this.resolveTopPrediction(combinedProbs, cleaned);
}</pre>
    </div>

    <div class="figure-box" style="margin-top:6pt;">
      <img src="${figUiLive}" alt="Fig. 6.1 Live ISL-to-Kannada Recognition Studio Workflow" style="width:100%; max-height:285px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
      <div class="figure-caption">Fig. 6.1 Actual Website Workflow — Live ISL-to-Kannada Recognition Studio showing real-time camera stream status, 144-class trained model indicator, Kannada transcript editor, and SOV meaning panel.</div>
    </div>
    <div class="page-footer-arabic">45</div>
  </section>`;

  const page46 = String.raw`
  <section class="report-page body-page" data-page="46">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h2">6.3.3 Few-Shot Custom Signs &amp; Outlier-Resistant Prototype Matching (customSigns.ts)</div>
    <p>
      To allow users and institutions to register domain-specific or regional Karnataka signs from just $3\text{–}5$ webcam demonstrations without retraining the BiGRU network, <code>frontend/src/services/customSigns.ts</code> implements 5-block balanced cosine similarity (Eq. 5.9) and consensus-weighted centroid computation that automatically down-weights noisy outlier recordings when $\ge 3$ samples exist (Listing 6.3).
    </p>

    <div class="code-box">
      <div class="code-title">Listing 6.3: Outlier-Resistant Prototype Centroid &amp; Block-Balanced Similarity (customSigns.ts)</div>
      <pre class="code-pre">export function averageEmbeddings(samples: number[][]): number[] {
  if (samples.length === 0) return [];
  const dim = samples[0].length, k = samples.length, weights = new Array(k).fill(1.0);
  if (k &gt;= 3) {
    for (let i = 0; i &lt; k; i++) {
      let sumSim = 0;
      for (let j = 0; j &lt; k; j++) if (i !== j) sumSim += cosineSimilarity(samples[i], samples[j]);
      weights[i] = Math.max(0.15, Math.pow(Math.max(0, sumSim / (k - 1)), 3));
    }
  }
  const wTotal = weights.reduce((a, b) =&gt; a + b, 0) || 1.0, avg = new Array(dim).fill(0);
  for (let i = 0; i &lt; k; i++) {
    for (let d = 0; d &lt; dim; d++) avg[d] += (weights[i] / wTotal) * samples[i][d];
  }
  return avg;
}</pre>
    </div>

    <div class="sec-h2">6.3.4 Multi-Tier Kannada SOV Grammar &amp; Phrase Engine (backend_ts/translation.ts)</div>
    <p>
      In <code>backend_ts/translation.ts</code>, <code>SemanticTranslator</code> bridges ISL gloss order and Kannada Subject–Object–Verb (SOV) syntax across three tiers: (1) Greedy longest-prefix matching against the 187-entry phrase dictionary (mapping multi-gloss idioms such as <code>["HOW_ARE_YOU"]</code> $\to$ <code>ನೀವು ಹೇಗಿದ್ದೀರಿ?</code> or <code>["I_ME", "WATER", "WANT"]</code> $\to$ <code>ನನಗೆ ನೀರು ಬೇಕು.</code>), (2) Deterministic SOV syntactic reordering that places temporal adjuncts first, attaches locative suffix <code>-ದಲ್ಲಿ / -ಲ್ಲಿ</code> to place nouns (e.g., <code>ಶಾಲೆ</code> $\to$ <code>ಶಾಲೆಯಲ್ಲಿ</code>, <code>ಮನೆ</code> $\to$ <code>ಮನೆಯಲ್ಲಿ</code>), converts pronouns to dative case (<code>ನಾನು</code> $\to$ <code>ನನಗೆ</code>) before experiential predicates (<em>want, happy, sick, cold</em>), and places verbs/modals at the clause end, and (3) Non-manual facial marker integration that converts statements into Kannada interrogatives (appending <code>ಏನು?</code> / <code>?</code>) when brow-raise or brow-furrow grammar markers are active.
    </p>

    <div class="figure-box" style="margin-top:6pt;">
      <img src="${figUiCustom}" alt="Fig. 6.2 Few-Shot Custom Signs Studio Workflow" style="width:100%; max-height:230px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
      <div class="figure-caption">Fig. 6.2 Actual Website Workflow — Custom Signs &amp; Personalization Studio for recording 3 repetitions of user-defined regional or personal signs and matching 3,668-D landmark centroids in-browser.</div>
    </div>
    <div class="page-footer-arabic">46</div>
  </section>`;

  const page47 = String.raw`
  <section class="report-page body-page" data-page="47">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h2">6.3.5 Procedural 3D Pixar-Style Character Rig &amp; Analytic 2-Bone IK (AvatarRig.ts)</div>
    <p>
      The 3D signing avatar (<code>frontend/src/avatar/AvatarRig.ts</code>, <code>animation.ts</code>, and <code>lipSync.ts</code>) is constructed 100% procedurally using Three.js geometries and physically based materials (<code>MeshPhysicalMaterial</code>) with zero external GLTF model dependencies:
    </p>
    <ul>
      <li><strong>Stylized Head, Eyes &amp; Facial Features:</strong> Warm peach skin shader (<code>roughness: 0.45, clearcoat: 0.1, sheen: 0.35</code>), rosy cheek blush spheres, button nose, sculpted ears, large Pixar-style eyes with white sclera, warm brown irises (<code>#4a2511</code>), dark pupils, dual white specular catchlights, animated upper eyelids for spontaneous blinking, and dynamic dark-brown eyebrows above round matte-black eyeglass frames (<code>TorusGeometry</code> with transparent lenses <code>transmission: 0.85</code>).</li>
      <li><strong>Sculpted Wavy Hair &amp; Classic Tailored Suit:</strong> Volumetric layered dark-brown wavy hair (<code>#3b2214</code> with <code>#54321d</code> strand highlights) and a tailored charcoal-black suit jacket (<code>#1e2024</code>) with notched lapels, crisp white dress shirt collar (<code>#f8fafc</code>), knotted black necktie (<code>#111317</code>), white pocket square, and crisp white shirt cuffs at the wrists so the warm skin-toned hands and 20 articulated finger joints stand out with maximum visual contrast during fast ISL signing.</li>
      <li><strong>Three-Point Studio Lighting &amp; Analytic IK:</strong> Warm key light, cool rim/back light for 3D silhouette separation, hemisphere fill light, and contact shadow plane. Listing 6.4 shows the analytic 2-bone IK solver and facial expression/viseme update loop in <code>AvatarRig.ts</code>.</li>
    </ul>

    <div class="code-box">
      <div class="code-title">Listing 6.4: Analytic Two-Bone Arm Inverse Kinematics Solver (frontend/src/avatar/AvatarRig.ts)</div>
      <pre class="code-pre">private updateArm(arm: ArmRig, pose: HandPose) {
  const target = new THREE.Vector3(...pose.wrist).clamp(MIN_BOUNDS, MAX_BOUNDS);
  const shoulder = arm.shoulder.position, toTarget = target.clone().sub(shoulder);
  const dist = THREE.MathUtils.clamp(toTarget.length(), Math.abs(UPPER_ARM - FOREARM) + 0.01, UPPER_ARM + FOREARM - 0.004);
  const dir = toTarget.lengthSq() &gt; 1e-6 ? toTarget.normalize() : new THREE.Vector3(0, -1, 0);
  const cosAlpha = THREE.MathUtils.clamp((UPPER_ARM ** 2 + dist ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * dist), -1, 1);
  const alpha = Math.acos(cosAlpha), pole = new THREE.Vector3(arm.side * 0.55, -0.80, -0.22).normalize();
  const bendAxis = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (bendAxis.lengthSq() &lt; 1e-5) bendAxis.set(0, 0, -1); else bendAxis.normalize();
  const upperDir = dir.clone().multiplyScalar(Math.cos(alpha)).add(bendAxis.multiplyScalar(Math.sin(alpha))).normalize();
  const elbowPos = shoulder.clone().addScaledVector(upperDir, UPPER_ARM);
  const foreDir = target.clone().sub(elbowPos).normalize();
  // Orient upper arm, forearm, wrist basis (dir, normal), and 5x3 finger phalanges...
}</pre>
    </div>

    <div class="figure-box" style="margin-top:6pt;">
      <img src="${figUiAvatar}" alt="Fig. 6.3 Kannada-to-Sign 3D Avatar Studio Workflow" style="width:100%; max-height:230px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
      <div class="figure-caption">Fig. 6.3 Actual Website Workflow — Kannada-to-Sign 3D Avatar Studio translating Kannada text (ನಿಮ್ಮ ಹೆಸರು ಏನು?) into ordered ISL gloss sequences and rendering continuous 3D humanoid signing with analytic 2-bone IK.</div>
    </div>
    <div class="page-footer-arabic">47</div>
  </section>`;

  const page48 = String.raw`
  <section class="report-page body-page" data-page="48">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h2">6.3.6 Co-Articulation Ballistic Transitions &amp; Kannada Viseme Lip-Sync (lipSync.ts)</div>
    <p>
      To ensure continuous multi-sign Kannada sentences transition naturally on the 3D avatar, <code>frontend/src/avatar/animation.ts</code> and <code>frontend/src/avatar/lipSync.ts</code> implement two complementary biomechanical controllers (Listing 6.5):
    </p>
    <ul>
      <li><code>coarticulatePair(a, b, u)</code>: Computes a smoothstep $s(u) = u^2(3 - 2u)$ interpolation between the terminal pose of sign $A$ and initial pose of sign $B$, adding a downward-and-forward sinusoidal arc $\sin(\pi u)\min(0.06, 0.18\,\delta)$ so the hands follow a natural human ballistic path rather than slicing linearly across the chest.</li>
      <li><code>kannadaToVisemes(kannadaText)</code> and <code>sampleLipSync(visemes, progress, active)</code>: Scans the Unicode Kannada word character-by-character, classifying independent vowels (<code>ಅ–ಔ</code>), dependent vowel matras (<code>ಾ–ೌ</code>), and bilabial/dental/velar consonants into phonetic viseme targets (<code>aperture</code> and <code>round</code>), driving smooth jaw and lip morphing synchronized with sign execution.</li>
    </ul>

    <div class="code-box">
      <div class="code-title">Listing 6.5: Ballistic Co-Articulation &amp; Kannada Phonetic Viseme Engine (animation.ts &amp; lipSync.ts)</div>
      <pre class="code-pre">export function coarticulatePair(a: HandPose | null, b: HandPose | null, side: -1 | 1, u: number): HandPose {
  const s = smoothstep(u);
  const pa = a ?? neutralHand(side), pb = b ?? neutralHand(side);
  const base = interpolateHand(pa, pb, s);
  const dist = Math.hypot(pb.wrist[0] - pa.wrist[0], pb.wrist[1] - pa.wrist[1], pb.wrist[2] - pa.wrist[2]);
  const arcMag = Math.sin(Math.PI * clamp(u, 0, 1)) * Math.min(0.06, dist * 0.18);
  base.wrist = [base.wrist[0], base.wrist[1] - arcMag * 0.65, base.wrist[2] + arcMag * 0.45];
  return base;
}

export function kannadaToVisemes(text: string): Viseme[] {
  const clean = text.trim();
  if (!clean) return [{ aperture: 0, round: 0 }];
  const out: Viseme[] = [];
  for (let i = 0; i &lt; clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code === 0x0c85 || code === 0x0c86 || code === 0x0cbe) out.push({ aperture: 0.85, round: 0.10 }); // ಅ/ಆ/ಾ
    else if (code &gt;= 0x0c87 &amp;&amp; code &lt;= 0x0c88 || code === 0x0cbf) out.push({ aperture: 0.42, round: 0.05 }); // ಇ/ಈ/ಿ
    else if (code &gt;= 0x0c89 &amp;&amp; code &lt;= 0x0c8a || code === 0x0cc1) out.push({ aperture: 0.50, round: 0.85 }); // ಉ/ಊ/ು
    else if (code &gt;= 0x0caa &amp;&amp; code &lt;= 0x0cae) out.push({ aperture: 0.06, round: 0.25 }); // ಪ/ಫ/ಬ/ಭ/ಮ (bilabial)
    else if (code &gt;= 0x0c95 &amp;&amp; code &lt;= 0x0cb9) out.push({ aperture: 0.52, round: 0.22 }); // other consonants
  }
  return out.length &gt; 0 ? out : [{ aperture: 0.45, round: 0.2 }];
}</pre>
    </div>
    <div class="page-footer-arabic">48</div>
  </section>`;

  const page49 = String.raw`
  <section class="report-page body-page" data-page="49">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h1">6.4 Database / API / Model Integration</div>
    <p>
      The backend server (<code>server.ts</code> / <code>backend/app/main.py</code>) exposes $28$ RESTful HTTP endpoints and a real-time full-duplex WebSocket endpoint (<code>/ws/recognition</code>). Table 6.2 documents the primary API contracts integrating the frontend, model registry, dataset store, and 3D avatar library.
    </p>

    <div class="table-caption">Table 6.2 Core REST API Endpoints and WebSocket Protocol Specification</div>
    <table class="data-table" style="font-size:9.5pt;">
      <thead>
        <tr>
          <th style="width:14%;">Method</th>
          <th style="width:32%;">Endpoint / Channel</th>
          <th style="width:54%;">Request / Response Contract &amp; Integration Purpose</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>WS</code></td><td><code>/ws/recognition</code></td><td>Bidirectional stream: receives <code>frame</code>, <code>config</code>, <code>pause</code>, <code>reset</code>, <code>demo</code>, <code>model_reload</code>; emits <code>hello</code>, <code>state</code>, <code>sign</code>, <code>uncertain</code>, <code>sentence</code>, <code>segment</code>.</td></tr>
        <tr><td><code>GET</code></td><td><code>/api/health</code></td><td>Returns server health, active model version, loaded class count ($144$), and continuous CTC status.</td></tr>
        <tr><td><code>GET</code></td><td><code>/api/vocabulary</code></td><td>Returns all 144 vocabulary entries from <code>labels.json</code> enriched with 3D avatar clip availability and reference video flags.</td></tr>
        <tr><td><code>POST</code></td><td><code>/api/translate/glosses</code></td><td>Translates an array of ISL glosses + non-manual markers into English meaning, Kannada SOV sentence, and word-by-word breakdown.</td></tr>
        <tr><td><code>POST</code></td><td><code>/api/kannada-to-sign</code></td><td>Normalizes Kannada text (NFC), runs greedy longest-match over 187 phrases &amp; 144 signs, and returns ordered 3D avatar clip payloads.</td></tr>
        <tr><td><code>GET</code></td><td><code>/api/animations/:signId</code></td><td>Returns cleaned 15-FPS 3D hand-pose keyframe JSON for the requested sign ID from <code>backend/data/animations/captured/</code>.</td></tr>
        <tr><td><code>GET</code></td><td><code>/api/reference/:label/video</code></td><td>Streams authentic dataset reference MP4 video with HTTP <code>Range</code> support for the Sign Reference viewer.</td></tr>
        <tr><td><code>POST</code></td><td><code>/api/dataset/samples</code></td><td>Validates and saves a user-recorded landmark sample (<code>training</code> vs <code>evaluation_only</code>) and refreshes class prototype centroid.</td></tr>
        <tr><td><code>GET</code></td><td><code>/api/model/versions</code></td><td>Lists all model registry versions with held-out accuracy, macro-F1, promotion gate decision, and active/previous flags.</td></tr>
        <tr><td><code>POST</code></td><td><code>/api/model/activate/:ver</code> &amp; <code>/rollback</code></td><td>Activates a verified model version or rolls back atomically to the previous active version in <code>backend/models/active.json</code>.</td></tr>
        <tr><td><code>POST</code></td><td><code>/api/diagnostics/snapshot</code></td><td>Saves a ring-buffer diagnostic snapshot of the last 180 frames and 60 pipeline stage events for error attribution.</td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">49</div>
  </section>`;

  const page50 = String.raw`
  <section class="report-page body-page" data-page="50">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h1">6.5 Key Screens / System Demonstration</div>
    <p>
      The integrated web application provides six cohesive operational screens, all verified in headless Chromium at <code>1280&times;800</code> desktop and <code>390&times;844</code> mobile viewports across both Light and Dark themes:
    </p>
    <ol>
      <li><strong>Screen 1 — Live Recognition Studio:</strong> Displays connection &amp; model badges (<code>Backend connected · Trained model · 144 classes</code>), the live camera canvas with MediaPipe skeletal overlays and Expression HUD, Recognition Settings (switching between <em>FastAPI/Express WebSocket</em> and <em>100% In-Browser ONNX</em>, toggling <em>3-View TTA + 3-Tap Denoising + Face-Occlusion Lock</em>, adjusting stillness duration and confidence threshold), the Current Sign hero card, the Pending Confirmation bar with top-3 alternatives, the Kannada Transcript editor with native speech output, the SOV Meaning panel, and the Face &amp; Non-Manual Grammar card.</li>
      <li><strong>Screen 2 — Few-Shot Custom Signs Studio:</strong> Interactive 3-step wizard to define a new sign’s ID, Kannada text, and English gloss, capture 3–5 webcam repetitions with real-time motion meter feedback, and manage/export custom sign prototypes stored in browser storage.</li>
      <li><strong>Screen 3 — Kannada to Sign 3D Avatar Studio:</strong> Features Kannada text input with quick-select conversational sentences (e.g., <em>ನಮಸ್ಕಾರ, ನನ್ನ ಹೆಸರು ರಾಮು / ನಿಮ್ಮ ಹೆಸರು ಏನು?</em>), gloss sequence chips, facial expression/grammar toggles (Neutral, Smile, Question), and the studio-lit 3D Pixar-style character performing continuous co-articulated ISL signing with synchronized Kannada lip mouthing.</li>
      <li><strong>Screen 4 — Sign Reference Library:</strong> Filterable grid of all 144 vocabulary signs categorized by domain (Greetings, Family, Food, Health, Transport, Colors, Pronouns, Time) with embedded dataset reference videos and 3D avatar preview.</li>
      <li><strong>Screen 5 — Dataset &amp; Model Governance:</strong> End-to-end ML workbench showing per-class sample counts, guided variation recording, model training launcher, version registry table with promotion gate verdicts, and one-click rollback.</li>
      <li><strong>Screen 6 — About, Testing &amp; B.E. Report Viewer:</strong> Displays empirical benchmark charts, segmentation and parity matrices, live evaluation error attribution, and the interactive CSBS B.E. Project Report viewer &amp; Word/PDF downloader (Fig. 6.4–Fig. 6.6).</li>
    </ol>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8pt; margin:4pt 0;">
      <div class="figure-box" style="margin:0;">
        <img src="${figUiReference}" alt="Fig. 6.4 Sign Reference Library Workflow" style="width:100%; max-height:145px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
        <div class="figure-caption">Fig. 6.4 Actual Website Workflow — 144-Class Bilingual Sign Reference Library with searchable Kannada/English glosses and signing guidelines.</div>
      </div>
      <div class="figure-box" style="margin:0;">
        <img src="${figUiDataset}" alt="Fig. 6.5 Dataset and Model Governance Workbench Workflow" style="width:100%; max-height:145px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
        <div class="figure-caption">Fig. 6.5 Actual Website Workflow — Dataset &amp; Model Governance Workbench showing active checkpoint v20261103-195651 (144 classes, 3,182 valid samples).</div>
      </div>
    </div>

    <div class="sec-h1">6.6 Integration and Deployment</div>
    <p>
      In production and development, <code>server.ts</code> serves both the REST/WebSocket API and the Vite-built React frontend on port <code>3000</code>, with explicit MIME-type headers (<code>application/wasm</code> and <code>text/javascript</code>) for <code>/onnx-wasm/*</code> and <code>/mediapipe-wasm/*</code> before SPA fallback routing. A Service Worker (<code>frontend/public/sw.js</code>) and Web App Manifest (<code>manifest.webmanifest</code>) enable offline Progressive Web App installation on any desktop or tablet.
    </p>
    <div class="page-footer-arabic">50</div>
  </section>`;

  const page51 = String.raw`
  <section class="report-page body-page" data-page="51">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 6: Implementation and Integration</span>
    </div>

    <div class="sec-h1">6.7 Challenges Encountered and Solutions</div>
    <p>
      During the engineering and integration of <strong>Silent Bridge</strong>, seven non-trivial technical challenges were encountered, diagnosed, and resolved with verified code fixes (Table 6.3 and Fig. 6.6).
    </p>

    <div class="table-caption">Table 6.3 Summary of Major Engineering Challenges, Root Causes, and Verified Solutions</div>
    <table class="data-table" style="font-size:9.0pt;">
      <thead>
        <tr>
          <th style="width:18%;">Challenge</th>
          <th style="width:36%;">Root Cause Diagnosed</th>
          <th style="width:46%;">Implemented Engineering Solution &amp; Impact</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Browser ONNX Never Segmenting</strong></td>
          <td><code>OnnxInferenceEngine.computeMotion</code> initially returned static palm size $\times 0.05$ ($\approx 0.005 &gt; \theta_{\text{still}}$), so segments never closed while a hand was visible.</td>
          <td>Implemented <code>computeRealMotion</code> using true 21-landmark frame-to-frame Euclidean displacement normalized to 30 FPS ($33.3/\Delta t$). Fixed browser ONNX segmentation completely.</td>
        </tr>
        <tr>
          <td><strong>2. Ghost Hand Shapes After Resampling</strong></td>
          <td>Linear interpolation across frames where a hand entered/left view left small non-zero coordinates when interpolated presence was $&lt; 0.5$.</td>
          <td>Updated <code>resampleSequence</code> in <code>features.ts</code> and <code>onnxInference.ts</code> to zero out all 73 slot features whenever interpolated presence $&lt; 0.5$, achieving exact Python parity.</td>
        </tr>
        <tr>
          <td><strong>3. Hand-Over-Face Occlusion Dropouts</strong></td>
          <td>Signs near the mouth/nose (<em>eat, drink, mother, water</em>) occlude the face for 1–15 frames, causing MediaPipe Face Landmarker to return <code>null</code>.</td>
          <td>Built <code>FaceTracker</code> EMA ($\alpha=0.35$) with a 45-frame occlusion hold + <code>imputeFaceRelative</code> median anchor reconstruction + offline upper-center face crop fallback.</td>
        </tr>
        <tr>
          <td><strong>4. Single-Hand MediaPipe Slot Flips</strong></td>
          <td>Fast wrist rotation occasionally caused MediaPipe to flip a single right hand to <code>Left</code> for 1–2 frames, creating a huge false velocity spike.</td>
          <td>Implemented <code>stabilizeSingleHandSlots</code> to detect dominant single-hand tracks, move isolated flipped frames back to the dominant slot, and invert palm normal chirality.</td>
        </tr>
        <tr>
          <td><strong>5. 367 Mid-Sign Avatar Arm Drops</strong></td>
          <td>Raw dataset recordings had 2–8 frame MediaPipe hand-tracking dropouts, causing the 3D avatar arm to snap down to rest and back mid-sign.</td>
          <td>Engineered 5-stage clip cleaner ($\le 0.4\text{ s}$ gap interpolation + $\sigma=1.5$ Gaussian filter + idle trim). Reduced mid-sign arm drops from $367 \to 0$ across all 144 clips.</td>
        </tr>
        <tr>
          <td><strong>6. 56.8 GB INCLUDE Archive Bottleneck</strong></td>
          <td>Downloading full Zenodo ZIP archives ($44.7\text{ GB}$) over broadband to get 24 vocabulary classes was prohibitively slow.</td>
          <td>Built HTTP <code>Range</code> Central Directory parser &amp; CRC-32 verified member extractor, downloading only $5.96\text{ GB}$ ($86.7\%$ bandwidth saved) with $0$ failures.</td>
        </tr>
        <tr>
          <td><strong>7. MediaPipe WASM C++ Stderr Traps</strong></td>
          <td>Emscripten’s <code>vision_wasm_internal.js</code> binds C++ <code>stderr</code> to <code>console.error</code>, reporting <code>INFO: Created TensorFlow Lite XNNPACK delegate</code> as an error.</td>
          <td>Patched WASM loader in <code>copy-mediapipe-wasm.mjs</code> and <code>main.tsx</code> to route informational C++ <code>INFO:/WARNING:/XNNPACK</code> notices to <code>console.debug</code>.</td>
        </tr>
      </tbody>
    </table>

    <div class="figure-box" style="margin-top:4pt;">
      <img src="${figUiTesting}" alt="Fig. 6.6 About and Testing Workflow Dashboard" style="width:100%; max-height:155px; object-fit:contain; display:block; margin:0 auto; border:1px solid #cbd5e1;" />
      <div class="figure-caption">Fig. 6.6 Actual Website Workflow — System Architecture &amp; Empirical Testing Dashboard summarizing the 6-stage bidirectional pipeline and downloadable report artifacts.</div>
    </div>
    <div class="page-footer-arabic">51</div>
  </section>`;

  return [
    page43,
    page44,
    page45,
    page46,
    page47,
    page48,
    page49,
    page50,
    page51,
  ].join("\n");
}
