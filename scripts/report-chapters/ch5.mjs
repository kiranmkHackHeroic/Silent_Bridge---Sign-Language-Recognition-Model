// Chapter 5: System Design and Methodology (Pages 32–42)
// Strictly adheres to BMSCE CSBS B.E. Project Report Guidelines

export function buildChapter5(figSrcs) {
  const { figArch } = figSrcs;

  const page32 = String.raw`
  <section class="report-page body-page" data-page="32">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>
    <div class="chapter-num-header">CHAPTER 5</div>
    <div class="chapter-title-center">SYSTEM DESIGN AND METHODOLOGY</div>

    <div class="sec-h1">5.1 Proposed Solution / System Overview</div>
    <p>
      <strong>Kannada SignBridge</strong> is architected as a modular, privacy-preserving, bidirectional translation and visualization system connecting Indian Sign Language (ISL) and Kannada. Rather than streaming high-bandwidth, privacy-sensitive webcam video to remote GPU servers, the browser front end extracts 3D hand and facial landmarks locally at $30\text{ FPS}$ using MediaPipe Tasks Vision WebAssembly. In the forward direction (<em>ISL Signer &rarr; Kannada</em>), landmark streams are segmented by motion activity, encoded into 3,668-dimensional spatio-temporal tensors, classified via a Bidirectional GRU with 3-view Test-Time Augmentation (or decoded at sentence level via fused BiGRU-CTC + sentence classification), gated by an out-of-fold calibrated threshold, translated into grammatical SOV Kannada sentences, and spoken aloud via Kannada TTS. In the reverse direction (<em>Kannada Text &rarr; 3D ISL Avatar</em>), Unicode NFC Kannada input is matched against a 187-phrase and 144-sign lexicon, planned into ISL gloss order, and rendered continuously on a procedural 3D Pixar-style character rig solved with analytic two-bone inverse kinematics, ballistic co-articulation arcs, and Kannada phonetic viseme mouthing.
    </p>

    <div class="sec-h1">5.2 System Architecture</div>
    <p>
      Fig. 5.1 depicts the end-to-end architecture of <strong>Kannada SignBridge</strong>, highlighting the strict client-side privacy boundary across both WebSocket backend mode and 100% In-Browser ONNX WebAssembly mode.
    </p>

    <div class="figure-box">
      <img src="${figArch}" alt="Kannada SignBridge System Architecture" style="width:100%; max-height:310px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; padding:4px; background:#fff;" />
      <div class="figure-caption">Fig. 5.1 Kannada SignBridge system architecture. Camera frames never leave the browser; top path performs ISL-to-Kannada recognition and speech; bottom path performs Kannada-to-ISL 3D avatar synthesis.</div>
    </div>
    <div class="page-footer-arabic">32</div>
  </section>`;

  const page33 = String.raw`
  <section class="report-page body-page" data-page="33">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.3 Module Description</div>
    <p>
      The system is decomposed into eight loosely coupled, high-cohesion functional modules with strict TypeScript and Python interface contracts (Table 5.1):
    </p>

    <div class="table-caption">Table 5.1 Core Subsystem Modules, Source Files, and Technical Responsibilities</div>
    <table class="data-table" style="font-size:9.6pt;">
      <thead>
        <tr>
          <th style="width:20%;">Module Name</th>
          <th style="width:28%;">Primary Repository Files</th>
          <th style="width:52%;">Core Algorithmic &amp; Functional Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Browser Vision &amp; Face-Lock Tracker</strong></td>
          <td><code>services/vision.ts</code>,<br/><code>services/useVision.ts</code></td>
          <td>Loads local MediaPipe Hand &amp; Face Landmarker WASM models; extracts 21 3D keypoints/hand + 52 facial blendshapes; applies EMA face-box smoothing ($\alpha=0.35$) &amp; occlusion hold.</td>
        </tr>
        <tr>
          <td><strong>2. 147-D Feature &amp; Cleaning Engine</strong></td>
          <td><code>backend_ts/features.ts</code>,<br/><code>recognition/landmarks.py</code></td>
          <td>Encodes <code>hands-face-v2</code> (147 floats/frame); repairs 1–2 frame handedness flips (<code>stabilizeSingleHandSlots</code>); imputes occluded face-relative coords; resamples to $T=24$ ($3,668$-D).</td>
        </tr>
        <tr>
          <td><strong>3. Motion Activity Segmenter</strong></td>
          <td><code>backend_ts/features.ts</code>,<br/><code>recognition/segmenter.py</code></td>
          <td>Tracks wrist displacement $m_t$; triggers sign onset above $\theta_{\text{start}}$ with 4-frame preroll; trims trailing motionless hold frames ($T_{\text{still}}$); detects motion-minimum dips for multi-sign streams.</td>
        </tr>
        <tr>
          <td><strong>4. Isolated BiGRU + 3-View TTA Engine</strong></td>
          <td><code>services/onnxInference.ts</code>,<br/><code>training/temporal_models.py</code></td>
          <td>Executes 2-direction BiGRU (96 hidden units, mean+max pool) across 3 TTA views (full $0.50$, 3-tap denoised $0.30$, 84% core crop $0.20$) in both Node/Python and browser WASM ONNX.</td>
        </tr>
        <tr>
          <td><strong>5. Continuous Sentence CTC Decoder</strong></td>
          <td><code>continuous/model.py</code>,<br/><code>continuous/recognizer.py</code></td>
          <td>Runs 2-layer BiGRU-CTC (128 units/dir, 168 glosses + blank) fused with 32-step logistic sentence classifier ($\lambda=1.0$) over 101 ISL-CSLTR sentences with posterior gate $0.50$.</td>
        </tr>
        <tr>
          <td><strong>6. Few-Shot Custom Sign Prototypes</strong></td>
          <td><code>services/customSigns.ts</code>,<br/><code>server.ts</code></td>
          <td>Computes outlier-resistant 3,668-D class centroids from 3–5 user recordings; matches via 5-block balanced cosine similarity and temperature-scaled ($\tau=0.07$) neural-prototype fusion.</td>
        </tr>
        <tr>
          <td><strong>7. Kannada SOV &amp; Non-Manual Grammar</strong></td>
          <td><code>backend_ts/translation.ts</code>,<br/><code>nonManualGrammar.ts</code></td>
          <td>Normalizes Unicode NFC; matches 187-phrase table by longest prefix; applies SOV constituent reordering &amp; Kannada case suffixes; integrates eyebrow/head NMMs; drives <code>kn-IN</code> TTS.</td>
        </tr>
        <tr>
          <td><strong>8. Procedural 3D Pixar Avatar &amp; IK</strong></td>
          <td><code>avatar/AvatarRig.ts</code>,<br/><code>avatar/animation.ts</code>,<br/><code>avatar/lipSync.ts</code></td>
          <td>Builds stylized 3D character in tailored suit &amp; round glasses; solves analytic 2-bone arm IK; applies $0.2\text{ s}$ ballistic co-articulation arcs, Kannada phonetic visemes &amp; spontaneous blinking.</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">33</div>
  </section>`;

  const page34 = String.raw`
  <section class="report-page body-page" data-page="34">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.4 Workflow / Process Design</div>
    <p>
      Fig. 5.2 illustrates the complete runtime execution workflows for both the forward <em>Sign-to-Kannada</em> pipeline and the reverse <em>Kannada-to-3D-Avatar</em> pipeline, showing how invalid frames, tracking gaps, low-confidence predictions, and unsupported words are deterministically handled at each stage.
    </p>

    <div class="figure-box">
      <svg viewBox="0 0 760 440" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <defs>
          <marker id="wfArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
          </marker>
        </defs>
        <!-- Left Column: Forward Sign-to-Kannada Workflow -->
        <rect x="10" y="8" width="355" height="424" rx="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>
        <text x="187" y="26" text-anchor="middle" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#1e3a8a">A. Forward Workflow: Live ISL → Kannada Text &amp; Speech</text>

        <rect x="65" y="38" width="245" height="34" rx="4" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="187" y="59" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">1. 30 FPS Webcam Frame (In-Browser Only)</text>
        <line x1="187" y1="72" x2="187" y2="88" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="50" y="88" width="275" height="40" rx="4" fill="#eff6ff" stroke="#1d4ed8"/>
        <text x="187" y="105" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">2. MediaPipe Hands + Face &amp; FaceTracker EMA</text>
        <text x="187" y="120" text-anchor="middle" font-family="Times New Roman" font-size="9">Extract 147-D hands-face-v2 + 52 Blendshapes</text>
        <line x1="187" y1="128" x2="187" y2="144" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="50" y="144" width="275" height="42" rx="4" fill="#eff6ff" stroke="#1d4ed8"/>
        <text x="187" y="161" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">3. Activity Segmenter &amp; Sequence Cleaning</text>
        <text x="187" y="176" text-anchor="middle" font-family="Times New Roman" font-size="9">Slot stabilize → Gap fill → Still-tail trim → T=24 (3,668-D)</text>
        <line x1="187" y1="186" x2="187" y2="202" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="45" y="202" width="285" height="44" rx="4" fill="#eff6ff" stroke="#1d4ed8"/>
        <text x="187" y="219" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">4. 3-View TTA BiGRU + Prototype Fusion</text>
        <text x="187" y="235" text-anchor="middle" font-family="Times New Roman" font-size="9">0.50 Full + 0.30 Denoised + 0.20 Core Crop + Custom Centroids</text>
        <line x1="187" y1="246" x2="187" y2="264" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <polygon points="187,264 285,292 187,320 89,292" fill="#fef3c7" stroke="#d97706" stroke-width="1.3"/>
        <text x="187" y="290" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">Confidence p ≥ τ* (0.50)?</text>
        <text x="187" y="302" text-anchor="middle" font-family="Times New Roman" font-size="8.5">&amp; Not _none background?</text>

        <!-- Uncertain branch -->
        <line x1="285" y1="292" x2="348" y2="292" stroke="#b45309" stroke-width="1.2"/>
        <line x1="348" y1="292" x2="348" y2="352" stroke="#b45309" stroke-width="1.2" marker-end="url(#wfArr)"/>
        <rect x="235" y="352" width="120" height="36" rx="3" fill="#fffbeb" stroke="#d97706"/>
        <text x="295" y="367" text-anchor="middle" font-family="Times New Roman" font-size="8.8" font-weight="bold">Uncertain Tray</text>
        <text x="295" y="380" text-anchor="middle" font-family="Times New Roman" font-size="8">Show Top-3 Choices</text>

        <!-- Accepted branch -->
        <line x1="187" y1="320" x2="120" y2="352" stroke="#15803d" stroke-width="1.3" marker-end="url(#wfArr)"/>
        <rect x="22" y="352" width="198" height="36" rx="3" fill="#dcfce7" stroke="#15803d"/>
        <text x="121" y="367" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Pending / Confirmed Token</text>
        <text x="121" y="380" text-anchor="middle" font-family="Times New Roman" font-size="8.2">600 ms Duplicate Gate</text>

        <line x1="121" y1="388" x2="187" y2="398" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>
        <rect x="40" y="398" width="295" height="28" rx="4" fill="#1e3a8a" stroke="#1e3a8a"/>
        <text x="187" y="416" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold" fill="#fff">5. 187-Phrase SOV Kannada Meaning + kn-IN Speech</text>

        <!-- Right Column: Reverse Kannada-to-Sign Workflow -->
        <rect x="395" y="8" width="355" height="424" rx="5" fill="#fffaf5" stroke="#fdba74" stroke-width="1.2"/>
        <text x="572" y="26" text-anchor="middle" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#9a3412">B. Reverse Workflow: Kannada Text → 3D Avatar ISL Signing</text>

        <rect x="445" y="38" width="255" height="36" rx="4" fill="#ffedd5" stroke="#c2410c"/>
        <text x="572" y="54" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">1. Kannada Text / Phrase Input</text>
        <text x="572" y="67" text-anchor="middle" font-family="Times New Roman" font-size="9">Unicode NFC Normalization &amp; Punctuation Strip</text>
        <line x1="572" y1="74" x2="572" y2="94" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="435" y="94" width="275" height="44" rx="4" fill="#fff7ed" stroke="#c2410c"/>
        <text x="572" y="111" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">2. Greedy Longest-Prefix Phrase &amp; Stem Matcher</text>
        <text x="572" y="127" text-anchor="middle" font-family="Times New Roman" font-size="9">Match 187 Phrase Rules + 144 Lexicon Stems + Suffix Strip</text>
        <line x1="572" y1="138" x2="572" y2="158" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="435" y="158" width="275" height="44" rx="4" fill="#fff7ed" stroke="#c2410c"/>
        <text x="572" y="175" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">3. ISL Gloss Sequence &amp; Grammar Planner</text>
        <text x="572" y="191" text-anchor="middle" font-family="Times New Roman" font-size="9">Order Glosses (Time → Place → Topic → Action + Question/Neg)</text>
        <line x1="572" y1="202" x2="572" y2="222" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="435" y="222" width="275" height="46" rx="4" fill="#fff7ed" stroke="#c2410c"/>
        <text x="572" y="239" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">4. Cleaned Dataset Motion Clip Retrieval</text>
        <text x="572" y="255" text-anchor="middle" font-family="Times New Roman" font-size="9">161 Retargeted Clips (0.4s Gap Interp + σ=1.5 Smooth)</text>
        <line x1="572" y1="268" x2="572" y2="288" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="435" y="288" width="275" height="46" rx="4" fill="#fff7ed" stroke="#c2410c"/>
        <text x="572" y="305" text-anchor="middle" font-family="Times New Roman" font-size="10" font-weight="bold">5. Continuous Timeline &amp; Co-Articulation</text>
        <text x="572" y="321" text-anchor="middle" font-family="Times New Roman" font-size="9">0.2s Ballistic Arc Transitions + Kannada Viseme Schedule</text>
        <line x1="572" y1="334" x2="572" y2="354" stroke="#1e293b" stroke-width="1.3" marker-end="url(#wfArr)"/>

        <rect x="425" y="354" width="295" height="72" rx="4" fill="#9a3412" stroke="#7c2d12"/>
        <text x="572" y="374" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#fff">6. 60 FPS Three.js Pixar-Style 3D Character Rig</text>
        <text x="572" y="391" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#ffedd5">• Analytic Two-Bone Shoulder-Elbow-Wrist IK</text>
        <text x="572" y="405" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#ffedd5">• 20-Joint Finger Curl + Brow NMMs + Lip Mouthing</text>
        <text x="572" y="419" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#ffedd5">• Returns to Neutral Rest Pose Once After Final Sign</text>
      </svg>
      <div class="figure-caption">Fig. 5.2 Detailed process flowcharts for (A) Forward ISL-to-Kannada recognition and (B) Reverse Kannada-to-ISL 3D avatar synthesis.</div>
    </div>
    <div class="page-footer-arabic">34</div>
  </section>`;

  const page35 = String.raw`
  <section class="report-page body-page" data-page="35">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.5 Data Design / Database Design</div>
    <p>
      To guarantee zero-dependency portability across Windows, Linux, macOS, and offline browser environments, <strong>Kannada SignBridge</strong> uses deterministic, version-controlled JSON document stores on disk paired with browser <code>localStorage</code> for client-side custom sign prototypes. The cornerstone of the data design is the <strong>147-dimensional per-frame feature schema (<code>hands-face-v2</code>)</strong> defined identically in <code>backend/app/recognition/landmarks.py</code>, <code>backend_ts/features.ts</code>, and <code>frontend/src/services/onnxInference.ts</code> (Table 5.2).
    </p>

    <div class="table-caption">Table 5.2 Exact 147-Dimensional Per-Frame Feature Vector Layout (Schema: <code>hands-face-v2</code>)</div>
    <table class="data-table" style="font-size:9.6pt;">
      <thead>
        <tr>
          <th style="width:16%;">Index Range</th>
          <th style="width:12%; text-align:center;">Dim.</th>
          <th style="width:24%;">Feature Block Name</th>
          <th style="width:48%;">Mathematical &amp; Anatomical Specification</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>[0 .. 59]</code><br/>(Slot 0: Left)</td>
          <td class="c">60</td>
          <td><strong>Slot 0 Hand Shape</strong><br/>(<code>HAND_SHAPE_DIM</code>)</td>
          <td>For landmarks $i \in \{1,\dots,20\}$, wrist-centered coordinates normalized by palm scale: $(\mathbf{p}_i - \mathbf{p}_0) / s_{\text{palm}}$, where $s_{\text{palm}} = \max(\|\mathbf{p}_9 - \mathbf{p}_0\|_2, 10^{-3})$.</td>
        </tr>
        <tr>
          <td><code>[60 .. 62]</code></td>
          <td class="c">3</td>
          <td><strong>Slot 0 Image Position</strong><br/>(<code>POS_OFFSET</code>)</td>
          <td>Normalized image coordinates of the wrist root $(x_0, y_0, z_0) \in [0,1]^3$.</td>
        </tr>
        <tr>
          <td><code>[63 .. 65]</code></td>
          <td class="c">3</td>
          <td><strong>Slot 0 Face-Relative Pos</strong><br/>(<code>FACEREL_OFFSET</code>)</td>
          <td>Wrist position relative to face center scaled by face size: $\big((x_0 - c_x)/s_{\text{face}}, (y_0 - c_y)/s_{\text{face}}, s_{\text{palm}}/s_{\text{face}}\big)$, imputed via median anchor if occluded.</td>
        </tr>
        <tr>
          <td><code>[66 .. 71]</code></td>
          <td class="c">6</td>
          <td><strong>Slot 0 Palm Orientation</strong><br/>(<code>ORIENT_OFFSET</code>)</td>
          <td>Unit finger direction vector $\hat{\mathbf{d}} \in \mathbb{R}^3$ (wrist $\mathbf{p}_0 \to$ middle MCP $\mathbf{p}_9$) and unit palm normal $\hat{\mathbf{n}} = \widehat{(\mathbf{p}_5 - \mathbf{p}_0) \times (\mathbf{p}_{17} - \mathbf{p}_0)} \in \mathbb{R}^3$.</td>
        </tr>
        <tr>
          <td><code>[72]</code></td>
          <td class="c">1</td>
          <td><strong>Slot 0 Presence Flag</strong></td>
          <td>Binary indicator $1.0$ if Slot 0 hand is tracked ($\ge 0.5$ after resampling), else $0.0$ (entire 73-dim slot masked to zero).</td>
        </tr>
        <tr>
          <td><code>[73 .. 145]</code><br/>(Slot 1: Right)</td>
          <td class="c">73</td>
          <td><strong>Slot 1 Hand Features</strong><br/>(Right / Second Hand)</td>
          <td>Identical 73-float structure (<code>60 shape + 3 pos + 3 face_rel + 6 orient + 1 presence</code>) for the second hand slot.</td>
        </tr>
        <tr>
          <td><code>[146]</code></td>
          <td class="c">1</td>
          <td><strong>Face Visibility Flag</strong></td>
          <td>$1.0$ if face bounding box is detected or held by <code>FaceTracker</code> EMA lock, else $0.0$.</td>
        </tr>
        <tr>
          <td><strong>Total Frame</strong></td>
          <td class="c"><strong>147</strong></td>
          <td><strong>Per-Frame Vector $\mathbf{f}_t$</strong></td>
          <td>$73 \text{ (Left)} + 73 \text{ (Right)} + 1 \text{ (Face Flag)} = \mathbf{147\text{ floats/frame}}$.</td>
        </tr>
        <tr>
          <td><strong>Segment Tensor</strong></td>
          <td class="c"><strong>3,668</strong></td>
          <td><strong>Resampled Segment $\mathbf{x}$</strong></td>
          <td>$T=24$ frames ($24 \times 147 = 3,528$) + inter-frame wrist velocities ($23 \times 6 = 138$) + 2D wrist path lengths ($2$) = <strong>3,668 floats</strong>.</td>
        </tr>
      </tbody>
    </table>

    <p style="margin-top:8pt;">
      In addition to the feature schema, five persistent JSON data stores govern system state: (1) <code>backend/data/labels.json</code> (144 vocabulary entries with <code>id</code>, <code>kannada</code>, <code>english</code>, <code>isl_gloss</code>, <code>category</code>, and <code>emit</code> flags), (2) <code>backend/data/kannada_sign_mapping.json</code> (187 phrase rules and morphological stems), (3) <code>backend/data/animation_mapping.json</code> (index of 161 cleaned 3D keyframe clips in <code>backend/data/animations/captured/*.json</code>), (4) <code>backend/models/registry/&lt;version&gt;/</code> (immutable model checkpoints, <code>model_meta.json</code>, <code>metrics.json</code>, and <code>status.json</code>), and (5) browser <code>localStorage["silentbridge_custom_signs_v1"]</code> storing user-recorded 3,668-D custom sign prototypes.
    </p>
    <div class="page-footer-arabic">35</div>
  </section>`;

  const page36 = String.raw`
  <section class="report-page body-page" data-page="36">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.6 UML / DFD / ER Diagrams</div>
    <p>
      Fig. 5.3 presents both the <strong>Level-0 Context Data Flow Diagram (DFD)</strong> and the <strong>Level-1 Subsystem Data Flow Diagram</strong>, illustrating data transformations and persistent stores across the platform.
    </p>

    <div class="figure-box">
      <svg viewBox="0 0 760 460" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <defs>
          <marker id="dfdA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
          </marker>
        </defs>
        <!-- Level 0 DFD -->
        <text x="14" y="20" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#1e3a8a">A. Level-0 Context Data Flow Diagram (DFD)</text>
        <rect x="20" y="42" width="150" height="68" rx="4" fill="#f1f5f9" stroke="#334155" stroke-width="1.4"/>
        <text x="95" y="68" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold">Deaf ISL Signer</text>
        <text x="95" y="84" text-anchor="middle" font-family="Times New Roman" font-size="9">(External Entity)</text>

        <ellipse cx="380" cy="76" rx="115" ry="44" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.6"/>
        <text x="380" y="68" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold">0.0 Kannada SignBridge</text>
        <text x="380" y="83" text-anchor="middle" font-family="Times New Roman" font-size="9.2">Bidirectional ISL &leftrightarrow; Kannada</text>
        <text x="380" y="96" text-anchor="middle" font-family="Times New Roman" font-size="8.8">Edge AI Platform</text>

        <rect x="590" y="42" width="150" height="68" rx="4" fill="#f1f5f9" stroke="#334155" stroke-width="1.4"/>
        <text x="665" y="68" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold">Kannada Speaker</text>
        <text x="665" y="84" text-anchor="middle" font-family="Times New Roman" font-size="9">(External Entity)</text>

        <line x1="170" y1="62" x2="266" y2="62" stroke="#1e293b" stroke-width="1.3" marker-end="url(#dfdA)"/>
        <text x="218" y="55" text-anchor="middle" font-family="Times New Roman" font-size="8.5">ISL Gestures &amp; NMMs</text>

        <line x1="266" y1="90" x2="170" y2="90" stroke="#1e293b" stroke-width="1.3" marker-end="url(#dfdA)"/>
        <text x="218" y="103" text-anchor="middle" font-family="Times New Roman" font-size="8.5">3D Avatar ISL + Top-3</text>

        <line x1="495" y1="62" x2="590" y2="62" stroke="#1e293b" stroke-width="1.3" marker-end="url(#dfdA)"/>
        <text x="542" y="55" text-anchor="middle" font-family="Times New Roman" font-size="8.5">Kannada Text &amp; Speech</text>

        <line x1="590" y1="90" x2="495" y2="90" stroke="#1e293b" stroke-width="1.3" marker-end="url(#dfdA)"/>
        <text x="542" y="103" text-anchor="middle" font-family="Times New Roman" font-size="8.5">Kannada Reply Text</text>

        <line x1="10" y1="132" x2="750" y2="132" stroke="#94a3b8" stroke-dasharray="4,4"/>

        <!-- Level 1 DFD -->
        <text x="14" y="152" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#1e3a8a">B. Level-1 Subsystem Data Flow Diagram (DFD)</text>

        <!-- Processes -->
        <rect x="20" y="170" width="135" height="54" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="87" y="191" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P1.0 Landmark &amp;</text>
        <text x="87" y="204" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">147-D Feature Engine</text>
        <text x="87" y="217" text-anchor="middle" font-family="Times New Roman" font-size="8.2">FaceTracker + Slot Lock</text>

        <rect x="195" y="170" width="135" height="54" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="262" y="191" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P2.0 Activity</text>
        <text x="262" y="204" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">Segmenter &amp; T=24</text>
        <text x="262" y="217" text-anchor="middle" font-family="Times New Roman" font-size="8.2">Still-Trim + Dip Split</text>

        <rect x="370" y="170" width="165" height="54" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="452" y="191" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P3.0 BiGRU 3-View TTA</text>
        <text x="452" y="204" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">&amp; Fused CTC Decoder</text>
        <text x="452" y="217" text-anchor="middle" font-family="Times New Roman" font-size="8.2">+ Prototype Blending</text>

        <rect x="575" y="170" width="165" height="54" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="657" y="191" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P4.0 Kannada SOV</text>
        <text x="657" y="204" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">Meaning &amp; Speech</text>
        <text x="657" y="217" text-anchor="middle" font-family="Times New Roman" font-size="8.2">187 Phrases + kn-IN TTS</text>

        <line x1="155" y1="197" x2="195" y2="197" stroke="#1e293b" stroke-width="1.2" marker-end="url(#dfdA)"/>
        <line x1="330" y1="197" x2="370" y2="197" stroke="#1e293b" stroke-width="1.2" marker-end="url(#dfdA)"/>
        <line x1="535" y1="197" x2="575" y2="197" stroke="#1e293b" stroke-width="1.2" marker-end="url(#dfdA)"/>

        <!-- Data Stores (Middle Row) -->
        <line x1="25" y1="265" x2="225" y2="265" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="25" y1="292" x2="225" y2="292" stroke="#0f172a" stroke-width="1.5"/>
        <text x="125" y="283" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">D1: Custom Sign Prototypes (3,668-D)</text>

        <line x1="265" y1="265" x2="495" y2="265" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="265" y1="292" x2="495" y2="292" stroke="#0f172a" stroke-width="1.5"/>
        <text x="380" y="283" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">D2: Model Registry &amp; sign_model.onnx</text>

        <line x1="530" y1="265" x2="740" y2="265" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="530" y1="292" x2="740" y2="292" stroke="#0f172a" stroke-width="1.5"/>
        <text x="635" y="283" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">D3: labels.json &amp; 187 Phrase Rules</text>

        <line x1="125" y1="265" x2="410" y2="224" stroke="#475569" stroke-width="1.1" marker-end="url(#dfdA)"/>
        <line x1="420" y1="265" x2="452" y2="224" stroke="#475569" stroke-width="1.1" marker-end="url(#dfdA)"/>
        <line x1="657" y1="265" x2="657" y2="224" stroke="#475569" stroke-width="1.1" marker-end="url(#dfdA)"/>

        <!-- Bottom Row: Reverse & Governance Processes -->
        <rect x="20" y="345" width="215" height="58" rx="10" fill="#fff7ed" stroke="#c2410c" stroke-width="1.3"/>
        <text x="127" y="366" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P5.0 Kannada-to-Sign Planner</text>
        <text x="127" y="381" text-anchor="middle" font-family="Times New Roman" font-size="8.8">Unicode NFC → Longest Phrase Match</text>
        <text x="127" y="394" text-anchor="middle" font-family="Times New Roman" font-size="8.5">→ ISL Gloss Sequence Plan</text>

        <rect x="275" y="345" width="220" height="58" rx="10" fill="#fff7ed" stroke="#c2410c" stroke-width="1.3"/>
        <text x="385" y="366" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P6.0 3D Pixar Avatar &amp; 2-Bone IK</text>
        <text x="385" y="381" text-anchor="middle" font-family="Times New Roman" font-size="8.8">Ballistic Co-Articulation + Visemes</text>
        <text x="385" y="394" text-anchor="middle" font-family="Times New Roman" font-size="8.5">+ Eyebrow NMMs (60 FPS WebGL)</text>

        <rect x="530" y="345" width="210" height="58" rx="10" fill="#f0fdf4" stroke="#15803d" stroke-width="1.3"/>
        <text x="635" y="366" text-anchor="middle" font-family="Times New Roman" font-size="9.5" font-weight="bold">P7.0 Dataset &amp; McNemar Gate</text>
        <text x="635" y="381" text-anchor="middle" font-family="Times New Roman" font-size="8.8">HTTP Range Import + BiGRU Train</text>
        <text x="635" y="394" text-anchor="middle" font-family="Times New Roman" font-size="8.5">→ Held-Out Promotion / Rollback</text>

        <line x1="235" y1="374" x2="275" y2="374" stroke="#1e293b" stroke-width="1.2" marker-end="url(#dfdA)"/>

        <line x1="275" y1="422" x2="495" y2="422" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="275" y1="446" x2="495" y2="446" stroke="#0f172a" stroke-width="1.5"/>
        <text x="385" y="438" text-anchor="middle" font-family="Times New Roman" font-size="9.2" font-weight="bold">D4: 161 Cleaned 3D Clips (captured/*.json)</text>
        <line x1="385" y1="422" x2="385" y2="403" stroke="#475569" stroke-width="1.1" marker-end="url(#dfdA)"/>
      </svg>
      <div class="figure-caption">Fig. 5.3 (A) Level-0 Context DFD and (B) Level-1 Subsystem Data Flow Diagram of Kannada SignBridge.</div>
    </div>
    <div class="page-footer-arabic">36</div>
  </section>`;

  const page37 = String.raw`
  <section class="report-page body-page" data-page="37">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <p>
      Fig. 5.4 presents the <strong>UML Use Case Diagram</strong>, the <strong>Runtime Sequence Diagram</strong> for live sign recognition and confirmation, and the <strong>Entity-Relationship (ER) Schema Diagram</strong> of the underlying data entities.
    </p>

    <div class="figure-box">
      <svg viewBox="0 0 760 475" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <!-- Top Left: UML Use Case -->
        <rect x="8" y="8" width="360" height="218" rx="4" fill="#f8fafc" stroke="#64748b"/>
        <text x="188" y="24" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">A. UML Use Case Diagram</text>

        <text x="36" y="75" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Deaf Signer</text>
        <circle cx="36" cy="48" r="8" fill="none" stroke="#1e293b" stroke-width="1.3"/>
        <line x1="36" y1="56" x2="36" y2="66" stroke="#1e293b" stroke-width="1.3"/>

        <text x="36" y="175" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">ML Admin</text>
        <circle cx="36" cy="148" r="8" fill="none" stroke="#1e293b" stroke-width="1.3"/>
        <line x1="36" y1="156" x2="36" y2="166" stroke="#1e293b" stroke-width="1.3"/>

        <text x="334" y="120" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Kannada</text>
        <text x="334" y="130" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Speaker</text>
        <circle cx="334" cy="95" r="8" fill="none" stroke="#1e293b" stroke-width="1.3"/>
        <line x1="334" y1="103" x2="334" y2="112" stroke="#1e293b" stroke-width="1.3"/>

        <ellipse cx="185" cy="50" rx="88" ry="15" fill="#eff6ff" stroke="#1d4ed8"/>
        <text x="185" y="54" text-anchor="middle" font-family="Times New Roman" font-size="8.8">UC1: Sign Live ISL (ONNX / WS)</text>

        <ellipse cx="185" cy="86" rx="88" ry="15" fill="#eff6ff" stroke="#1d4ed8"/>
        <text x="185" y="90" text-anchor="middle" font-family="Times New Roman" font-size="8.8">UC2: Confirm / Edit Transcript</text>

        <ellipse cx="185" cy="122" rx="88" ry="15" fill="#fff7ed" stroke="#c2410c"/>
        <text x="185" y="126" text-anchor="middle" font-family="Times New Roman" font-size="8.8">UC3: Play 3D Avatar from Kannada</text>

        <ellipse cx="185" cy="158" rx="88" ry="15" fill="#f0fdf4" stroke="#15803d"/>
        <text x="185" y="162" text-anchor="middle" font-family="Times New Roman" font-size="8.8">UC4: Register Few-Shot Custom Sign</text>

        <ellipse cx="185" cy="194" rx="88" ry="15" fill="#f0fdf4" stroke="#15803d"/>
        <text x="185" y="198" text-anchor="middle" font-family="Times New Roman" font-size="8.8">UC5: Train &amp; Gate Model Versions</text>

        <line x1="55" y1="52" x2="97" y2="50" stroke="#475569"/>
        <line x1="55" y1="56" x2="97" y2="86" stroke="#475569"/>
        <line x1="55" y1="62" x2="97" y2="158" stroke="#475569"/>
        <line x1="305" y1="100" x2="273" y2="86" stroke="#475569"/>
        <line x1="305" y1="106" x2="273" y2="122" stroke="#475569"/>
        <line x1="55" y1="160" x2="97" y2="194" stroke="#475569"/>

        <!-- Top Right: ER Schema Diagram -->
        <rect x="382" y="8" width="370" height="218" rx="4" fill="#f8fafc" stroke="#64748b"/>
        <text x="567" y="24" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">B. Entity-Relationship (ER) Schema Diagram</text>

        <rect x="394" y="36" width="155" height="78" fill="#fff" stroke="#1d4ed8" stroke-width="1.2"/>
        <rect x="394" y="36" width="155" height="18" fill="#1d4ed8"/>
        <text x="471" y="49" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold" fill="#fff">VocabularySign (labels.json)</text>
        <text x="400" y="66" font-family="Times New Roman" font-size="8.3">PK label: string (144 classes)</text>
        <text x="400" y="78" font-family="Times New Roman" font-size="8.3">   kannada: string (NFC)</text>
        <text x="400" y="90" font-family="Times New Roman" font-size="8.3">   english, isl_gloss: string</text>
        <text x="400" y="102" font-family="Times New Roman" font-size="8.3">   category: string, emit: bool</text>

        <rect x="585" y="36" width="155" height="78" fill="#fff" stroke="#c2410c" stroke-width="1.2"/>
        <rect x="585" y="36" width="155" height="18" fill="#c2410c"/>
        <text x="662" y="49" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold" fill="#fff">AvatarClip (captured/*.json)</text>
        <text x="591" y="66" font-family="Times New Roman" font-size="8.3">PK sign_id: string (161 clips)</text>
        <text x="591" y="78" font-family="Times New Roman" font-size="8.3">   fps: number, duration: number</text>
        <text x="591" y="90" font-family="Times New Roman" font-size="8.3">   frames: HandPoseKeyframe[]</text>
        <text x="591" y="102" font-family="Times New Roman" font-size="8.3">   dataset_source: string</text>

        <rect x="394" y="134" width="155" height="80" fill="#fff" stroke="#15803d" stroke-width="1.2"/>
        <rect x="394" y="134" width="155" height="18" fill="#15803d"/>
        <text x="471" y="147" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold" fill="#fff">LandmarkSample (*.json)</text>
        <text x="400" y="164" font-family="Times New Roman" font-size="8.3">PK sample_id: string</text>
        <text x="400" y="176" font-family="Times New Roman" font-size="8.3">FK label: string</text>
        <text x="400" y="188" font-family="Times New Roman" font-size="8.3">   purpose: train | eval_only</text>
        <text x="400" y="200" font-family="Times New Roman" font-size="8.3">   frames: Frame147D[]</text>

        <rect x="585" y="134" width="155" height="80" fill="#fff" stroke="#6d28d9" stroke-width="1.2"/>
        <rect x="585" y="134" width="155" height="18" fill="#6d28d9"/>
        <text x="662" y="147" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold" fill="#fff">ModelVersion (registry/*)</text>
        <text x="591" y="164" font-family="Times New Roman" font-size="8.3">PK version: string</text>
        <text x="591" y="176" font-family="Times New Roman" font-size="8.3">   threshold: float (0.50)</text>
        <text x="591" y="188" font-family="Times New Roman" font-size="8.3">   macro_f1, accuracy: float</text>
        <text x="591" y="200" font-family="Times New Roman" font-size="8.3">   decision: promoted | rejected</text>

        <line x1="549" y1="75" x2="585" y2="75" stroke="#333" stroke-width="1.2"/>
        <text x="567" y="70" text-anchor="middle" font-family="Times New Roman" font-size="8">1 : 1</text>
        <line x1="471" y1="114" x2="471" y2="134" stroke="#333" stroke-width="1.2"/>
        <text x="485" y="127" font-family="Times New Roman" font-size="8">1 : N</text>

        <!-- Bottom: UML Sequence Diagram -->
        <rect x="8" y="236" width="744" height="230" rx="4" fill="#ffffff" stroke="#64748b"/>
        <text x="380" y="253" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">C. UML Runtime Sequence Diagram (Live Sign Recognition → SOV Meaning → Speech)</text>

        <!-- Lifelines -->
        <rect x="28" y="264" width="105" height="24" rx="3" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="80" y="279" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Browser Vision</text>
        <line x1="80" y1="288" x2="80" y2="455" stroke="#64748b" stroke-dasharray="3,3"/>

        <rect x="180" y="264" width="115" height="24" rx="3" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="237" y="279" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Segmenter + Clean</text>
        <line x1="237" y1="288" x2="237" y2="455" stroke="#64748b" stroke-dasharray="3,3"/>

        <rect x="342" y="264" width="120" height="24" rx="3" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="402" y="279" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">BiGRU 3-View TTA</text>
        <line x1="402" y1="288" x2="402" y2="455" stroke="#64748b" stroke-dasharray="3,3"/>

        <rect x="505" y="264" width="105" height="24" rx="3" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="557" y="279" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">Pending / UI Gate</text>
        <line x1="557" y1="288" x2="557" y2="455" stroke="#64748b" stroke-dasharray="3,3"/>

        <rect x="642" y="264" width="96" height="24" rx="3" fill="#dbeafe" stroke="#1d4ed8"/>
        <text x="690" y="279" text-anchor="middle" font-family="Times New Roman" font-size="9" font-weight="bold">SOV &amp; TTS</text>
        <line x1="690" y1="288" x2="690" y2="455" stroke="#64748b" stroke-dasharray="3,3"/>

        <line x1="80" y1="308" x2="237" y2="308" stroke="#1e293b" stroke-width="1.2"/>
        <text x="158" y="303" text-anchor="middle" font-family="Times New Roman" font-size="8.3">1. parseFrame(hands, faceEMA) [147-D]</text>

        <line x1="237" y1="336" x2="402" y2="336" stroke="#1e293b" stroke-width="1.2"/>
        <text x="319" y="331" text-anchor="middle" font-family="Times New Roman" font-size="8.3">2. finishSegment() → 3 Views × 3,668-D</text>

        <line x1="402" y1="364" x2="557" y2="364" stroke="#1e293b" stroke-width="1.2"/>
        <text x="479" y="359" text-anchor="middle" font-family="Times New Roman" font-size="8.3">3. probs + prototypeBlend (p ≥ τ*, 3.8 ms)</text>

        <line x1="557" y1="394" x2="690" y2="394" stroke="#1e293b" stroke-width="1.2"/>
        <text x="623" y="389" text-anchor="middle" font-family="Times New Roman" font-size="8.3">4. commitPending() → gloss sequence</text>

        <line x1="690" y1="424" x2="557" y2="424" stroke="#15803d" stroke-width="1.2"/>
        <text x="623" y="419" text-anchor="middle" font-family="Times New Roman" font-size="8.3">5. SOV Kannada Sentence + kn-IN Audio</text>
      </svg>
      <div class="figure-caption">Fig. 5.4 (A) UML Use Case diagram, (B) Entity-Relationship schema diagram, and (C) Runtime sequence diagram.</div>
    </div>
    <div class="page-footer-arabic">37</div>
  </section>`;

  const page38 = String.raw`
  <section class="report-page body-page" data-page="38">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.7 Algorithm / Model / Business Logic Design</div>
    <div class="sec-h2">5.7.1 Mathematical Formulation of the 147-D Feature Schema &amp; Sequence Resampling</div>
    <p>
      Let $\mathbf{p}_i = (x_i, y_i, z_i) \in \mathbb{R}^3$ denote the 3D MediaPipe hand landmark for joint $i \in \{0, \dots, 20\}$, where $\mathbf{p}_0$ is the wrist root and $\mathbf{p}_9$ is the middle finger MCP joint. To achieve scale and translation invariance across different camera distances, the apparent palm size $s_{\text{palm}}$ and normalized wrist-relative shape coordinates $\tilde{\mathbf{p}}_i$ ($60$ floats per hand) are computed as:
    </p>
    <div class="eq-row">
      <span>$$s_{\text{palm}} = \max\!\left(\|\mathbf{p}_9 - \mathbf{p}_0\|_2,\; 10^{-3}\right), \qquad \tilde{\mathbf{p}}_i = \frac{\mathbf{p}_i - \mathbf{p}_0}{s_{\text{palm}}} \quad \forall i \in \{1, \dots, 20\}$$</span>
      <span class="eq-num">(5.1)</span>
    </div>
    <p>
      To capture location relative to the signer’s head, let $\mathbf{b}_t = (c_x, c_y, w_{\text{face}}, h_{\text{face}})$ denote the face bounding box at frame $t$. Because hand-to-face signs (e.g., <em>eat, drink, water, mother, father</em>) frequently occlude the face for $1\text{–}15$ frames, our <code>FaceTracker</code> maintains an Exponential Moving Average (EMA) anchor with a $45$-frame occlusion lock:
    </p>
    <div class="eq-row">
      <span>$$\hat{\mathbf{b}}_t = \begin{cases} \alpha_{\text{face}}\,\mathbf{b}_t + (1 - \alpha_{\text{face}})\,\hat{\mathbf{b}}_{t-1}, & \text{if face detected } (\alpha_{\text{face}} = 0.35) \\ \hat{\mathbf{b}}_{t-1}, & \text{if occluded for } k \le 45 \text{ frames} \end{cases}$$</span>
      <span class="eq-num">(5.2)</span>
    </div>
    <p>
      Given face scale $s_{\text{face}} = \max(\hat{w}_{\text{face}}, \hat{h}_{\text{face}}, 0.02)$, the 3D face-relative wrist vector $\mathbf{r}_{\text{face}}$ is:
    </p>
    <div class="eq-row">
      <span>$$\mathbf{r}_{\text{face}} = \left(\frac{x_0 - \hat{c}_x}{s_{\text{face}}},\; \frac{y_0 - \hat{c}_y}{s_{\text{face}}},\; \frac{s_{\text{palm}}}{s_{\text{face}}}\right) \in \mathbb{R}^3$$</span>
      <span class="eq-num">(5.3)</span>
    </div>
    <p>
      The 6D palm orientation block consists of the unit finger axis $\hat{\mathbf{d}}$ and unit palmar normal $\hat{\mathbf{n}}$ (inverted for the left hand so mirrored hands share consistent chirality):
    </p>
    <div class="eq-row">
      <span>$$\hat{\mathbf{d}} = \frac{\mathbf{p}_9 - \mathbf{p}_0}{\|\mathbf{p}_9 - \mathbf{p}_0\|_2 + \epsilon}, \qquad \hat{\mathbf{n}} = \pm \frac{(\mathbf{p}_5 - \mathbf{p}_0) \times (\mathbf{p}_{17} - \mathbf{p}_0)}{\|(\mathbf{p}_5 - \mathbf{p}_0) \times (\mathbf{p}_{17} - \mathbf{p}_0)\|_2 + \epsilon}$$</span>
      <span class="eq-num">(5.4)</span>
    </div>
    <p>
      After stabilizing isolated 1–2 frame single-hand slot flips (<code>stabilizeSingleHandSlots</code>), linearly interpolating gaps of $\le 3$ frames with unit re-normalization of $(\hat{\mathbf{d}}, \hat{\mathbf{n}})$, and imputing missing face-relative coordinates across the segment via the median visible face anchor, a variable-length segment of $M$ active frames is linearly resampled to $T = 24$ steps. Any hand slot whose interpolated presence flag falls below $0.5$ has all $73$ slot features strictly zeroed:
    </p>
    <div class="eq-row">
      <span>$$\text{if } \tilde{\mathbf{F}}_{\tau}[\text{slot\_presence}] &lt; 0.5 \implies \tilde{\mathbf{F}}_{\tau}[73s : 73(s+1)] \leftarrow \mathbf{0}, \quad s \in \{0, 1\}$$</span>
      <span class="eq-num">(5.5)</span>
    </div>
    <p>
      Appending inter-frame wrist velocities $\Delta\mathbf{p}_{0,\tau} \in \mathbb{R}^{(T-1)\times 6}$ and cumulative 2D wrist path lengths $\mathbf{L}_{2\text{D}} \in \mathbb{R}^2$ yields the final segment input dimension $D$:
    </p>
    <div class="eq-row">
      <span>$$D = 147\,T + 6\,(T - 1) + 2 = 147(24) + 6(23) + 2 = 3,528 + 138 + 2 = 3,668$$</span>
      <span class="eq-num">(5.6)</span>
    </div>
    <div class="page-footer-arabic">38</div>
  </section>`;

  const page39 = String.raw`
  <section class="report-page body-page" data-page="39">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h2">5.7.2 BiGRU Classifier, 3-View TTA, Prototype Fusion &amp; Continuous CTC Decoding</div>
    <p>
      For isolated sign classification, each frame $\tilde{\mathbf{f}}_\tau \in \mathbb{R}^{147}$ ($\tau = 1,\dots,T$) is projected through a linear layer with LayerNorm and dropout into a $96$-unit embedding $\mathbf{e}_\tau$, then processed by a two-direction Bidirectional GRU [16], [17] ($96$ hidden units per direction, $\mathbf{h}_\tau = [\overrightarrow{\mathbf{h}}_\tau \,\|\, \overleftarrow{\mathbf{h}}_\tau] \in \mathbb{R}^{192}$). Temporal mean pooling and max pooling are concatenated with global motion summaries $\mathbf{g}_{\text{mot}}$:
    </p>
    <div class="eq-row">
      <span>$$\mathbf{z} = \left[\frac{1}{T}\sum_{\tau=1}^T \mathbf{h}_\tau \;\Big\|\; \max_{\tau=1}^T \mathbf{h}_\tau \;\Big\|\; \mathbf{g}_{\text{mot}}\right], \qquad \mathbf{p}_{\text{BiGRU}}(\mathbf{x}) = \mathrm{softmax}(\mathbf{W}_o \mathbf{z} + \mathbf{b}_o)$$</span>
      <span class="eq-num">(5.7)</span>
    </div>
    <p>
      During live and ONNX inference, <strong>3-View Test-Time Augmentation (TTA)</strong> evaluates three complementary temporal views of the cleaned segment $\mathbf{M}$: (1) $\mathbf{x}_{\text{full}}$ (weight $w_1 = 0.50$), (2) $\mathbf{x}_{\text{smooth}}$ after a zero-phase 3-tap temporal filter $\tilde{\mathbf{M}}_t = 0.2\mathbf{M}_{t-1} + 0.6\mathbf{M}_t + 0.2\mathbf{M}_{t+1}$ and idle-tail trimming ($w_2 = 0.30$), and (3) $\mathbf{x}_{\text{core}}$ cropped to the central $84\%$ stroke window ($w_3 = 0.20$):
    </p>
    <div class="eq-row">
      <span>$$\mathbf{p}_{\text{TTA}}(\mathbf{M}) = 0.50\,\mathbf{p}(\mathbf{x}_{\text{full}}) + 0.30\,\mathbf{p}(\mathbf{x}_{\text{smooth}}) + 0.20\,\mathbf{p}(\mathbf{x}_{\text{core}})$$</span>
      <span class="eq-num">(5.8)</span>
    </div>
    <p>
      To support <strong>Few-Shot Custom Signs</strong> and user prototype adaptation without letting the $1,440$ hand-shape dimensions overwhelm face-relative location ($144$ dims) or velocity ($140$ dims), we define the <strong>5-Block Balanced Cosine Similarity</strong> $S_{\text{block}}(\mathbf{u}, \mathbf{v})$ across semantic subspaces $B \in \{\text{shape}, \text{pos}, \text{face}, \text{orient}, \text{vel}\}$ with weights $(0.42, 0.06, 0.18, 0.16, 0.18)$:
    </p>
    <div class="eq-row">
      <span>$$S_{\text{block}}(\mathbf{u}, \mathbf{v}) = 0.35\,\cos(\mathbf{u}, \mathbf{v}) + 0.65 \sum_{B} w_B \frac{\langle \mathbf{u}_B, \mathbf{v}_B \rangle}{\|\mathbf{u}_B\|_2\,\|\mathbf{v}_B\|_2}$$</span>
      <span class="eq-num">(5.9)</span>
    </div>
    <p>
      For <strong>Continuous Sentence Recognition</strong> over the 101 corpus sentences $\mathcal{S}$, a 2-layer BiGRU-CTC network outputs per-step distributions over $168$ glosses plus blank $\epsilon$, while a sentence classifier outputs $P_{\text{cls}}(s \mid \mathbf{X})$. The fused decoder scores each sentence $s \in \mathcal{S}$ with gloss sequence $g_s$ as:
    </p>
    <div class="eq-row">
      <span>$$\mathrm{score}(s \mid \mathbf{X}) = \log P_{\text{CTC}}(g_s \mid \mathbf{X}) + \lambda \log P_{\text{cls}}(s \mid \mathbf{X}), \qquad \lambda = 1.0$$</span>
      <span class="eq-num">(5.10)</span>
    </div>

    <div class="alg-box">
      <div class="alg-title">Algorithm 5.1: Live Motion Segmentation with Preroll, Still-Tail Trimming &amp; Dip Splitting</div>
      <ol style="margin:2pt 0 0 16pt; font-size:10pt; line-height:1.42;">
        <li><strong>Input:</strong> Frame stream $f_t$ with landmarks; thresholds $\theta_{\text{start}}=0.014, \theta_{\text{still}}=0.006, T_{\text{still}}=280\text{ ms}$.</li>
        <li>Compute 30-FPS normalized 21-landmark displacement $m_t = \max_{h,i} \|\mathbf{p}_{t,h,i} - \mathbf{p}_{t-1,h,i}\|_2 \cdot (33.3 / \Delta t_{\text{ms}})$.</li>
        <li><strong>if</strong> state is <code>IDLE</code> <strong>and</strong> hands present <strong>and</strong> $m_t &gt; \theta_{\text{start}}$ <strong>then</strong> initialize segment with last 4 preroll frames + $f_t$.</li>
        <li><strong>else if</strong> state is <code>ACTIVE</code> <strong>then</strong> append $f_t$; track stillness onset $t_{\text{still}}$ when $m_t &lt; \theta_{\text{still}}$ and interior motion minima (dips).</li>
        <li><strong>if</strong> $(t - t_{\text{still}} \ge T_{\text{still}})$ <strong>or</strong> hands absent $\ge 200\text{ ms}$ <strong>or</strong> duration $\ge 4.0\text{ s}$ <strong>then</strong> trim trailing frames after $t_{\text{still}}$, run 3-View TTA classification (Eq. 5.8), apply OOF threshold $\tau^* = 0.50$, and reset to <code>IDLE</code>.</li>
      </ol>
    </div>
    <div class="page-footer-arabic">39</div>
  </section>`;

  const page40 = String.raw`
  <section class="report-page body-page" data-page="40">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h2">5.7.3 Analytic Two-Bone Inverse Kinematics, Ballistic Co-Articulation &amp; Viseme Lip-Sync</div>
    <p>
      In the reverse direction (<em>Kannada Text &rarr; 3D Avatar</em>), each sign clip stores cleaned wrist targets $\mathbf{w}_{\text{target}} \in \mathbb{R}^3$, finger direction $\hat{\mathbf{d}}$, palm normal $\hat{\mathbf{n}}$, and per-finger flexion curls $c_f \in [0,1]^5$. Given shoulder position $\mathbf{s} \in \mathbb{R}^3$, upper-arm length $L_1 = 0.29\text{ m}$, and forearm length $L_2 = 0.27\text{ m}$, let $\mathbf{r} = \mathbf{w}_{\text{target}} - \mathbf{s}$ and clamped reach $d = \mathrm{clamp}(\|\mathbf{r}\|_2, |L_1 - L_2| + 10^{-3}, L_1 + L_2 - 10^{-3})$. By the <strong>Law of Cosines</strong>, the interior shoulder bend angle $\alpha$ and elbow flexion angle $\theta_{\text{elbow}}$ have the exact closed-form solution:
    </p>
    <div class="eq-row">
      <span>$$\cos\alpha = \frac{L_1^2 + d^2 - L_2^2}{2\,L_1\,d}, \qquad \cos\theta_{\text{elbow}} = \frac{L_1^2 + L_2^2 - d^2}{2\,L_1\,L_2}$$</span>
      <span class="eq-num">(5.11)</span>
    </div>
    <p>
      Using anatomical elbow-pole hint $\mathbf{h}_{\text{pole}} = (\pm 0.55, -0.80, -0.22)$ orthogonalized against $\hat{\mathbf{r}} = \mathbf{r}/d$ to form bend plane normal $\hat{\mathbf{b}}_{\perp}$, the exact 3D elbow joint position $\mathbf{e}_{\text{joint}}$ and wrist orientation basis $\mathbf{R}_{\text{wrist}} \in \mathrm{SO}(3)$ are solved at $60\text{ FPS}$ without iterative Jacobian drift:
    </p>
    <div class="eq-row">
      <span>$$\mathbf{e}_{\text{joint}} = \mathbf{s} + L_1\left(\hat{\mathbf{r}}\cos\alpha + \hat{\mathbf{b}}_{\perp}\sin\alpha\right), \qquad \mathbf{R}_{\text{wrist}} = \begin{bmatrix} \hat{\mathbf{d}} \times \hat{\mathbf{n}} & \hat{\mathbf{d}} & \hat{\mathbf{n}} \end{bmatrix}$$</span>
      <span class="eq-num">(5.12)</span>
    </div>
    <p>
      When transitioning between consecutive signs $A \to B$ over duration $T_{\text{trans}} = 0.20\text{ s}$ ($u \in [0,1]$), linear interpolation makes hands cut unnaturally through the torso. We therefore apply minimum-jerk smoothstep $s(u) = u^2(3 - 2u)$ plus a <strong>ballistic co-articulation arc</strong> $\Delta\mathbf{p}_{\text{arc}}(u)$ scaled by inter-sign distance $\delta = \|\mathbf{w}_B(0) - \mathbf{w}_A(1)\|_2$:
    </p>
    <div class="eq-row">
      <span>$$\mathbf{w}(u) = (1 - s(u))\,\mathbf{w}_A(1) + s(u)\,\mathbf{w}_B(0) + \sin(\pi u)\cdot\min(0.06, 0.18\,\delta)\begin{bmatrix} 0 \\ -0.65 \\ 0.45 \end{bmatrix}$$</span>
      <span class="eq-num">(5.13)</span>
    </div>
    <p>
      Simultaneously, the Kannada word string is parsed into phonetic syllables (Mapping <code>ಅ/ಆ</code> $\to$ open vowel, <code>ಇ/ಈ/ಎ</code> $\to$ spread, <code>ಉ/ಊ/ಒ</code> $\to$ rounded, <code>ಪ/ಬ/ಮ</code> $\to$ bilabial closure) driving jaw aperture and lip rounding alongside spontaneous eye blinks ($3.4\text{ s}$ cycle) and ISL grammatical eyebrow tilts.
    </p>

    <div class="alg-box">
      <div class="alg-title">Algorithm 5.2: Five-Stage Dataset Avatar Clip Cleaning (Eliminating Mid-Sign Arm Drops)</div>
      <ol style="margin:2pt 0 0 16pt; font-size:10pt; line-height:1.42;">
        <li><strong>Input:</strong> Raw per-frame MediaPipe hand poses $p_1, \dots, p_N$ from an authentic ISL dataset video.</li>
        <li><strong>Presence Gate:</strong> If a hand is present in $&lt; 15\%$ of frames, discard that hand track as detector noise.</li>
        <li><strong>Tracking Gap Interpolation:</strong> Linearly interpolate missing intervals of $\le 0.4\text{ s}$ between tracked frames and re-orthonormalize $(\hat{\mathbf{d}}, \hat{\mathbf{n}})$ via Gram–Schmidt.</li>
        <li><strong>Gaussian Temporal Smoothing:</strong> Convolve wrist position, finger direction, palm normal, and finger curls with a 1D Gaussian kernel ($\sigma = 1.5$ frames) within each continuous run.</li>
        <li><strong>Idle Trim &amp; Keyframe Resampling:</strong> Trim motionless preparation/retraction tails (retaining $0.12\text{ s}$ pad) and resample to $15$ keyframes/s. (Result: $367 \to 0$ arm drops across 144 clips).</li>
      </ol>
    </div>
    <div class="page-footer-arabic">40</div>
  </section>`;

  const page41 = String.raw`
  <section class="report-page body-page" data-page="41">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.8 User Interface and Interaction Design</div>
    <p>
      The user interface of <strong>Kannada SignBridge</strong> is designed around six task-focused workspaces accessible from the top navigation bar, supporting both light and dark high-contrast studio themes:
    </p>
    <ol>
      <li><strong>Live Recognition Workspace (<code>LiveRecognition.tsx</code>):</strong> Features a mirrored camera viewport with real-time 21-point hand skeleton and face bounding-box overlays, a live facial expression and ISL non-manual grammar HUD (Statement, Yes/No Question, Wh-Question, Negation), a hero card displaying the latest recognised sign with confidence and ISL gloss, a <em>Pending Word Confirmation Bar</em> with auto-confirm countdown and top-3 clickable alternatives, an editable Unicode Kannada transcript with punctuation chips and <code>kn-IN</code> speech output, a phrase-level <em>Meaning Panel</em>, and a collapsible 6-stage <em>Pipeline Diagnostics</em> drawer.</li>
      <li><strong>Few-Shot Custom Signs Studio (<code>CustomSigns.tsx</code>):</strong> Allows users to enter a custom identifier, Kannada script label, and English gloss, record 3–5 webcam repetitions with automatic motion-triggered capture, inspect sample count, and export/import custom sign JSON packs.</li>
      <li><strong>Kannada to Sign 3D Avatar Studio (<code>KannadaToSign.tsx</code>):</strong> Provides Kannada text input, quick-insert phrase chips, gloss sequence breakdown (showing matched vs. unsupported words), emotion/grammar preset selectors (Neutral, Happy/Smile, Question/Surprised), playback speed controls ($0.5\times$ to $1.5\times$), and an interactive Three.js viewport rendering the Pixar-style 3D character in a charcoal suit and round glasses.</li>
      <li><strong>Sign Reference Browser (<code>SignReference.tsx</code>):</strong> Displays searchable cards across all supported signs with authentic dataset video playback so users can learn the exact regional ISL variant recognized by the model.</li>
      <li><strong>Dataset &amp; Model Governance Studio (<code>DatasetModel.tsx</code>):</strong> Enables guided sample recording (with training vs. evaluation-only separation), video upload, one-click model training, version registry comparison, and instant rollback.</li>
      <li><strong>About, Testing &amp; B.E. Report Portal (<code>AboutTesting.tsx</code>):</strong> Presents live evaluation cards, benchmark metrics, segmentation and parity reports, and full access to this structured B.E. Project Report.</li>
    </ol>

    <div class="sec-h1">5.9 Security, Privacy, Ethics and Responsible Use</div>
    <p>
      Three ethical and responsible-AI principles are enforced by design: (i) <strong>Zero Biometric Video Storage</strong> (camera frames never leave the browser memory), (ii) <strong>Anti-Hallucination Honesty</strong> (low-confidence signs are never inserted silently, and Kannada words without a verified ISL clip are explicitly listed as unsupported rather than guessed), and (iii) <strong>Transparent Labeling of Unverified Clips</strong> (all dataset-retargeted 3D avatar clips carry an explicit <em>unverified</em> metadata flag until reviewed by native deaf ISL signers).
    </p>
    <div class="page-footer-arabic">41</div>
  </section>`;

  const page42 = String.raw`
  <section class="report-page body-page" data-page="42">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 5: System Design and Methodology</span>
    </div>

    <div class="sec-h1">5.10 Methodology and Evaluation Strategy</div>
    <p>
      To prevent optimistic bias and data leakage, our experimental methodology enforces four strict rules across every model experiment:
    </p>
    <ol>
      <li><strong>Signer-Independent &amp; Round-Independent Splits:</strong> For isolated signs, all videos of two complete Amrita SLR signer groups ($213$ videos) plus INCLUDE’s official test split ($55$ videos before expansion, $101$ after, totaling $268$ to $314$ held-out videos) are locked away as the test set. Hyperparameters and model architectures are selected solely using 3-fold signer-grouped cross-validation on the development set. For continuous sentences (ISL-CSLTR), recording rounds 4 and 5 ($154$ videos) form the unseen test set, round 2 ($73$ videos) the validation set, and rounds 1 and 3 ($265$ videos) the training set.</li>
      <li><strong>Out-of-Fold Confidence Threshold Calibration:</strong> Rather than choosing an arbitrary confidence cutoff, out-of-fold probabilities are computed across all $1,435$ development videos and swept over $\tau \in \{0.05, 0.10, \dots, 0.95\}$ to maximize the F1-score of accepted signs, where any non-sign accepted as a sign is penalized as a false positive ($\tau^* = 0.50$).</li>
      <li><strong>Exact Paired McNemar Statistical Testing:</strong> Given two models evaluated on the exact same $N$ held-out videos with discordant counts $n_{01}$ (only new model right) and $n_{10}$ (only old model right), the two-sided exact binomial $p$-value is computed as:
        <div class="eq-row">
          <span>$$p_{\text{McNemar}} = 2 \sum_{k=0}^{\min(n_{01}, n_{10})} \binom{n_{01} + n_{10}}{k} 0.5^{\,n_{01} + n_{10}}$$</span>
          <span class="eq-num">(5.14)</span>
        </div>
      </li>
      <li><strong>Pre-Registered Promotion Gate:</strong> A newly trained model version $M_{\text{cand}}$ replaces the active model $M_{\text{active}}$ if and only if: (a) $\text{Macro-F1}(M_{\text{cand}}) \ge 0.40$, (b) $\text{Acc}(M_{\text{cand}}) \ge \text{Acc}(M_{\text{active}}) - 0.02$ on the shared held-out test videos, and (c) it passes an automated live-pipeline smoke test.</li>
    </ol>

    <div class="alg-box">
      <div class="alg-title">Algorithm 5.3: Selective HTTP-Range &amp; CRC-32 Verified Archive Member Downloader</div>
      <ol style="margin:2pt 0 0 16pt; font-size:10pt; line-height:1.42;">
        <li><strong>Input:</strong> Remote Zenodo/Mendeley ZIP archive URLs $U$, target vocabulary class folders $W$.</li>
        <li><strong>for each</strong> remote archive $u \in U$ <strong>do</strong> fetch the last $64\text{ KB}$ via HTTP <code>Range: bytes=-65536</code> to locate the End-of-Central-Directory (EOCD) record and read only the Central Directory header bytes.</li>
        <li><strong>for each</strong> archive member $e$ whose folder matches $W$ and is not yet on disk <strong>do</strong> fetch its local header + compressed byte range via HTTP <code>Range</code>, decompress, verify byte size and 32-bit <code>CRC-32</code> checksum, and write atomically to disk. (Downloaded $5.96\text{ GB}$ instead of $44.7\text{ GB}$ with $0$ corrupted files).</li>
      </ol>
    </div>
    <div class="page-footer-arabic">42</div>
  </section>`;

  return [
    page32,
    page33,
    page34,
    page35,
    page36,
    page37,
    page38,
    page39,
    page40,
    page41,
    page42,
  ].join("\n");
}
