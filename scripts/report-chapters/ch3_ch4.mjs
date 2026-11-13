// Chapter 3: Requirements Analysis and Project Planning (Pages 17–24)
// Chapter 4: Business Model and Sustainability Framework (Pages 25–31)

export function buildChapters3And4() {
  // ==================== CHAPTER 3: REQUIREMENTS ANALYSIS (Pages 17 to 24) ====================
  const page17 = String.raw`
  <section class="report-page body-page" data-page="17">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>
    <div class="chapter-num-header">CHAPTER 3</div>
    <div class="chapter-title-center">REQUIREMENTS ANALYSIS AND PROJECT PLANNING</div>

    <div class="sec-h1">3.1 Introduction</div>
    <p>
      Engineering an assistive communication system that operates reliably in real-world Karnataka institutions requires systematic requirements analysis before architectural design. Unlike batch offline machine learning scripts, an interactive bidirectional sign-language bridge must satisfy simultaneous constraints on real-time latency ($&lt;5\text{ ms}$ classifier response), strict camera privacy, linguistic fidelity in Kannada Unicode rendering, accessibility for deaf users, and statistical safety against model regressions. This chapter presents the stakeholder analysis, user and business opportunity assessment, eighteen formal Functional Requirements (<code>FR-01</code> to <code>FR-18</code>), twelve Non-Functional Requirements (<code>NFR-01</code> to <code>NFR-12</code>), hardware and software specifications, three-dimensional feasibility analysis, an 11-phase project schedule, Failure Mode and Effects Analysis (FMEA), and regulatory privacy compliance.
    </p>

    <div class="sec-h1">3.2 Stakeholder Identification and User Needs</div>
    <p>
      Five primary stakeholder groups interact directly or indirectly with <strong>Silent Bridge</strong>. Table 3.1 summarizes their operational context, core communication pain points, and required system capabilities.
    </p>

    <div class="table-caption">Table 3.1 Stakeholder Identification, Needs Analysis, and System Value Delivery</div>
    <table class="data-table" style="font-size:10pt;">
      <thead>
        <tr>
          <th style="width:18%;">Stakeholder Group</th>
          <th style="width:24%;">Role &amp; Operational Context</th>
          <th style="width:30%;">Primary Needs &amp; Pain Points</th>
          <th style="width:28%;">Silent Bridge Solution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Deaf &amp; Hard-of-Hearing Signers</strong></td>
          <td>Primary end-users signing ISL at clinics, banks, schools, or home</td>
          <td>Need accurate recognition without recording private video; need visual feedback when a sign is uncertain; need regional custom signs</td>
          <td>Landmark-only browser privacy; Pending confirmation with top-3 choices; Custom Signs studio; Sign Reference video library</td>
        </tr>
        <tr>
          <td><strong>2. Kannada-Speaking Interlocutors</strong></td>
          <td>Doctors, nurses, bank clerks, teachers, family members</td>
          <td>Do not know ISL; need clear Kannada text and spoken audio; need a way to reply in Kannada that the deaf person can see in ISL</td>
          <td>Kannada SOV meaning panel + <code>kn-IN</code> TTS speech + Reverse Kannada-to-Sign 3D Pixar-style Avatar</td>
        </tr>
        <tr>
          <td><strong>3. Special Educators &amp; ISL Trainers</strong></td>
          <td>Teachers at deaf schools &amp; vocational centers in Karnataka</td>
          <td>Need visual side-by-side reference of authentic ISL recordings and 3D articulated hand/finger movements</td>
          <td>144 dataset reference videos + 161 cleaned 3D avatar clips with slow-motion &amp; camera orbit controls</td>
        </tr>
        <tr>
          <td><strong>4. Public Sector &amp; Enterprise Admins</strong></td>
          <td>IT officers at hospitals, Karnataka One kiosks, banks</td>
          <td>Cannot purchase expensive GPU servers or depth sensors; require offline operation &amp; DPDP Act compliance</td>
          <td>Runs on standard CPU laptop/kiosk; 100% in-browser ONNX WASM mode; zero external cloud dependency</td>
        </tr>
        <tr>
          <td><strong>5. ML Engineers &amp; Researchers</strong></td>
          <td>Developers maintaining vocabulary &amp; models</td>
          <td>Need reproducible dataset audits, live pipeline diagnostics, and protection against bad model deployments</td>
          <td>6-stage Pipeline Diagnostics, Evaluation-only recording mode, McNemar promotion gate &amp; version rollback</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">17</div>
  </section>`;

  const page18 = String.raw`
  <section class="report-page body-page" data-page="18">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.3 Problem / Opportunity Analysis from User and Business Perspectives</div>
    <p>
      From the <strong>User Perspective</strong>, existing communication workarounds (such as writing notes on paper, relying on family members as ad-hoc interpreters, or scheduling scarce human interpreters days in advance) create chronic friction and social exclusion. A deaf user needs an instant, self-contained application that respects ISL’s visual-spatial grammar (including facial expressions and eyebrow markers) and transparently indicates when a sign is ambiguous rather than guessing blindly.
    </p>
    <p>
      From the <strong>Business and Institutional Perspective</strong>, organizations in Karnataka face both regulatory mandates under the <em>RPwD Act 2016</em> and ESG/diversity commitments to make customer-facing counters and internal workplaces accessible. Traditional hardware solutions (specialized RGB-D cameras or wearable sensor gloves costing ₹40,000–₹1,20,000 per unit) suffer from hygiene, calibration, and maintenance failures, while cloud-hosted video AI incurs recurring GPU bandwidth costs and legal liability under India’s <em>Digital Personal Data Protection (DPDP) Act 2023</em>. <strong>Silent Bridge</strong> transforms any existing front-desk PC or tablet into an offline-capable ISL–Kannada communication terminal at zero marginal hardware or cloud cost.
    </p>

    <div class="sec-h1">3.4 Functional Requirements</div>
    <p>
      The functional specifications of the system are organized into eighteen testable requirements across six core operational subsystems:
    </p>
    <ul>
      <li><strong>FR-01 (In-Browser Landmark Extraction):</strong> The browser client shall capture webcam frames at $30\text{ FPS}$ and execute MediaPipe Hand Landmarker (up to 2 hands, 21 3D points each) and Face Landmarker (478 points + 52 blendshapes) locally via WebAssembly.</li>
      <li><strong>FR-02 (147-D Feature Construction &amp; Occlusion Lock):</strong> Each frame shall be encoded into the 147-float <code>hands-face-v2</code> schema with EMA face-bounding-box tracking ($45$-frame occlusion retention), single-hand slot stabilization, and median face-relative imputation.</li>
      <li><strong>FR-03 (Motion-Based Activity Segmentation):</strong> The segmenter shall detect sign onset when wrist motion exceeds $\theta_{\text{start}}$, include a 4-frame preroll, trim trailing motionless hold frames ($T_{\text{still}}$), and optionally split multi-sign streams at motion-minimum dips.</li>
      <li><strong>FR-04 (Isolated Sign BiGRU + 3-View TTA Classification):</strong> Completed segments shall be resampled to $T=24$ frames ($3,668$ features) and classified using a 3-view Test-Time Augmentation ensemble (full $0.50$, 3-tap denoised $0.30$, $84\%$ core crop $0.20$).</li>
      <li><strong>FR-05 (100% In-Browser ONNX Runtime Mode):</strong> The user shall be able to switch between the WebSocket backend and a 100% client-side <code>onnxruntime-web</code> engine executing <code>sign_model.onnx</code> directly in the browser.</li>
      <li><strong>FR-06 (Calibrated Confidence Gate &amp; Pending Word Workflow):</strong> Predictions below the validation-calibrated threshold ($\tau^*$) shall be routed to an <em>Uncertain</em> tray with top-3 candidates; accepted predictions shall support auto-confirm countdown, manual confirm, or immediate insertion.</li>
      <li><strong>FR-07 (Continuous ISL Sentence Decoding):</strong> In sentence mode, the system shall score unsegmented sentence streams over the 101 ISL-CSLTR sentences by fusing BiGRU-CTC log-likelihood with a sentence classifier log-posterior ($\lambda = 1.0$).</li>
      <li><strong>FR-08 (Facial Expression &amp; ISL Non-Manual Grammar Classification):</strong> The system shall classify facial blendshapes into emotion states and ISL grammatical markers (yes/no question brow raise, wh-question brow furrow, negation head shake).</li>
      <li><strong>FR-09 (Few-Shot Custom Sign Registration &amp; Prototype Matching):</strong> Users shall be able to record $3\text{–}5$ webcam samples of custom signs, compute outlier-resistant 3,668-D prototypes in <code>localStorage</code>, and match them via block-balanced cosine similarity.</li>
    </ul>
    <div class="page-footer-arabic">18</div>
  </section>`;

  const page19 = String.raw`
  <section class="report-page body-page" data-page="19">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>
    <ul>
      <li><strong>FR-10 (Kannada Transcript Builder &amp; Editing):</strong> Recognised signs shall be assembled into a Unicode NFC-normalized Kannada transcript with one-click punctuation attachment, inline word correction, deletion, and clipboard export.</li>
      <li><strong>FR-11 (Multi-Tier Kannada SOV Meaning Layer):</strong> Gloss sequences shall be translated into natural Kannada sentences using a 187-entry longest-prefix phrase table and a rule-based SOV grammar engine with dative/locative case markers.</li>
      <li><strong>FR-12 (Kannada Speech Synthesis):</strong> The system shall vocalize Kannada text using the browser’s local <code>kn-IN</code> Web Speech API voice, with an explicit opt-in fallback to online TTS.</li>
      <li><strong>FR-13 (Reverse Kannada-to-Sign Gloss Planner):</strong> In the <em>Kannada to Sign</em> view, input Kannada text shall be normalized, matched against the 187-phrase and 144-sign lexicons by longest match, and ordered into an ISL gloss execution plan, explicitly listing any unsupported words.</li>
      <li><strong>FR-14 (Procedural 3D Pixar-Style Avatar &amp; Continuous IK Playback):</strong> Planned ISL glosses shall be rendered continuously on a procedural Three.js 3D character rig featuring analytic 2-bone arm IK, $0.2\text{ s}$ ballistic co-articulation transitions, Kannada phonetic viseme mouthing, spontaneous blinking, and eyebrow grammar.</li>
      <li><strong>FR-15 (Sign Reference Video Browser):</strong> Users shall be able to browse and play authentic dataset video recordings for all supported signs to inspect regional signing variants.</li>
      <li><strong>FR-16 (Dataset Recording, Validation &amp; Selective Import):</strong> The <em>Dataset &amp; Model</em> studio shall support guided webcam sample recording (separated into training vs. evaluation-only splits) and CRC-32-verified HTTP Range downloading of INCLUDE archives.</li>
      <li><strong>FR-17 (Model Registry, Promotion Gate &amp; Rollback):</strong> Model candidates shall be evaluated on held-out unseen signers via paired McNemar tests and promoted only if they pass the governance gate, with instant rollback to previous versions.</li>
      <li><strong>FR-18 (6-Stage Live Pipeline Diagnostics):</strong> The UI shall provide real-time telemetry across Camera, Detection, Features, Segmentation, Classification, and Translation stages, plus snapshot export.</li>
    </ul>

    <div class="sec-h1">3.5 Non-Functional Requirements</div>
    <ul>
      <li><strong>NFR-01 (Inference Latency):</strong> Single-sign BiGRU classification shall complete in $&lt; 10\text{ ms}$ on a laptop CPU (measured: $3.8\text{ ms}$), and per-frame backend processing shall remain $&lt; 3\text{ ms}$ (measured: $1.4\text{ ms}$).</li>
      <li><strong>NFR-02 (Zero-Video-Transmission Privacy):</strong> Under no circumstances shall raw camera images or video streams leave the client browser; only numeric landmark coordinates may be processed.</li>
      <li><strong>NFR-03 (Offline Progressive Web App Capability):</strong> All fonts (Inter, Noto Sans Kannada), MediaPipe WASM binaries, ONNX WASM binaries, and the <code>sign_model.onnx</code> model shall be served locally so the app functions without internet access.</li>
      <li><strong>NFR-04 (Signer-Independent Generalization):</strong> The active isolated-sign model must achieve $\ge 75\%$ top-1 accuracy on held-out videos of signers completely unseen during training (achieved: $76.5\%$ on unseen Amrita signers, $81.5\%$ overall).</li>
      <li><strong>NFR-05 (Avatar Motion Smoothness):</strong> Retargeted 3D avatar clips shall exhibit zero mid-sign arm drops ($0 / 144$ clips) and render smoothly at $60\text{ FPS}$ on integrated WebGL graphics.</li>
      <li><strong>NFR-06 (Unicode Integrity):</strong> All Kannada text processing, storage, and speech synthesis requests shall preserve canonical Unicode NFC encoding without character corruption.</li>
      <li><strong>NFR-07 to NFR-12 (Reliability, Maintainability, Portability, Accessibility, Auditability &amp; Recoverability):</strong> The codebase shall enforce strict TypeScript typing (<code>tsc --noEmit</code> with $0$ errors), pass $208$ automated unit/integration tests, support high-contrast light/dark themes, and retain immutable dataset SHA/MD5 checksums.</li>
    </ul>
    <div class="page-footer-arabic">19</div>
  </section>`;

  const page20 = String.raw`
  <section class="report-page body-page" data-page="20">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.6 Hardware and Software Requirements</div>
    <p>
      Because <strong>Silent Bridge</strong> is engineered specifically for resource-constrained public institutions, classrooms, and personal laptops across Karnataka, its hardware footprint requires no dedicated GPU. Tables 3.2 and 3.3 detail the hardware and software specifications.
    </p>

    <div class="table-caption">Table 3.2 Minimum and Recommended Hardware Specifications</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:24%;">Hardware Component</th>
          <th style="width:38%;">Minimum Specification (Edge Inference)</th>
          <th style="width:38%;">Recommended Specification (Development &amp; Training)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Processor (CPU)</strong></td><td>Dual-Core x86_64 or ARM64 CPU @ 2.0 GHz (Intel Core i3 / AMD Ryzen 3)</td><td>Quad-Core / Octa-Core CPU @ 2.8+ GHz (Intel Core i5/i7 or Apple M-Series)</td></tr>
        <tr><td><strong>Graphics (GPU)</strong></td><td>Integrated GPU with WebGL 2.0 support (No discrete GPU required)</td><td>Integrated WebGL 2.0 / WebGPU (CPU training takes 43 min; no CUDA required)</td></tr>
        <tr><td><strong>System Memory (RAM)</strong></td><td>4 GB DDR4 RAM</td><td>8 GB – 16 GB DDR4/DDR5 RAM</td></tr>
        <tr><td><strong>Camera Input</strong></td><td>Integrated 720p USB/Built-in Webcam @ 24–30 FPS</td><td>720p / 1080p Webcam @ 30 FPS with standard indoor illumination</td></tr>
        <tr><td><strong>Storage Space</strong></td><td>500 MB free disk space (PWA + ONNX + MediaPipe + Avatar clips)</td><td>25 GB SSD (to store selective INCLUDE &amp; Amrita SLR video datasets)</td></tr>
        <tr><td><strong>Audio Output</strong></td><td>Standard laptop speakers / 3.5 mm audio jack for Kannada TTS</td><td>Stereo speakers or public-counter audio amplifier</td></tr>
      </tbody>
    </table>

    <div class="table-caption" style="margin-top:10pt;">Table 3.3 Software and Library Stack Specifications</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:26%;">Software Layer</th>
          <th style="width:34%;">Technology / Package</th>
          <th style="width:40%;">Version &amp; Architectural Role</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Operating System</strong></td><td>Windows 10/11, Ubuntu Linux 22.04+, or macOS</td><td>64-bit OS hosting browser and Node.js / Python runtime</td></tr>
        <tr><td><strong>Frontend Framework</strong></td><td>React + TypeScript + Vite</td><td>React 18.3.1, TypeScript 5.6.3, Vite 5.4.10 SPA bundler</td></tr>
        <tr><td><strong>Browser Vision Runtime</strong></td><td><code>@mediapipe/tasks-vision</code> (WASM)</td><td>v0.10.17 / 0.10.21 local Hand &amp; Face Landmarker models</td></tr>
        <tr><td><strong>In-Browser Neural Engine</strong></td><td><code>onnxruntime-web</code> (WASM SIMD)</td><td>v1.21.0 client-side BiGRU ONNX inference engine</td></tr>
        <tr><td><strong>3D Avatar Engine</strong></td><td><code>three</code> (Three.js WebGL)</td><td>v0.170.0 procedural Pixar-style character rig &amp; 2-bone IK solver</td></tr>
        <tr><td><strong>Backend Runtime</strong></td><td>Node.js / Express 5 + <code>ws</code> + Python FastAPI</td><td>Express 5.1.0, <code>onnxruntime-node</code> 1.21.0, FastAPI training suite</td></tr>
        <tr><td><strong>Deep Learning &amp; ML</strong></td><td>PyTorch (CPU) + scikit-learn</td><td>BiGRU sequence classifier, BiGRU-CTC decoder, LogReg ensemble</td></tr>
        <tr><td><strong>Typography &amp; PWA</strong></td><td><code>@fontsource/noto-sans-kannada</code>, <code>inter</code></td><td>Bundled offline Kannada &amp; Latin fonts + Service Worker caching</td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">20</div>
  </section>`;

  const page21 = String.raw`
  <section class="report-page body-page" data-page="21">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.7 Feasibility Analysis</div>
    <p>
      Before committing to full-scale implementation, a three-pillar feasibility study was conducted covering Technical, Economic, and Operational/Schedule dimensions.
    </p>

    <div class="sec-h2">3.7.1 Technical Feasibility</div>
    <p>
      The primary technical risk was achieving real-time, signer-independent recognition of 3D manual and facial articulators on a CPU-only laptop while simultaneously rendering a 60 FPS 3D character avatar. Empirical prototyping confirmed technical feasibility across four fronts:
    </p>
    <ul>
      <li><strong>Landmark Compression Ratio:</strong> Extracting 21 3D hand landmarks per hand and a face bounding box via MediaPipe WebAssembly takes $14\text{–}22\text{ ms}$ per frame in the browser and compresses a $921\text{ KB}$ RGB frame into a $147 \times 4 = 588\text{ byte}$ feature vector—a $1,560\times$ reduction in dimensionality.</li>
      <li><strong>CPU BiGRU Latency:</strong> A 2-direction BiGRU with 96 hidden units operating on $T=24$ resampled frames ($3,668$ features) requires only $3.8\text{ ms}$ per sign in Python/ONNX and $\approx 11\text{ ms}$ for a full 3-view TTA ensemble in browser WebAssembly.</li>
      <li><strong>Bandwidth-Feasible Dataset Curation:</strong> By parsing the central directory of remote INCLUDE ZIP archives via HTTP <code>Range</code> requests, we downloaded $462$ targeted videos in $5.96\text{ GB}$ instead of $44.7\text{ GB}$, making multi-dataset training feasible on a standard home connection.</li>
      <li><strong>Procedural Three.js Avatar:</strong> Constructing the 3D character entirely from procedural Three.js geometries (physical skin shaders, round glasses, wavy hair strands, charcoal suit, and analytic 2-bone IK) eliminated bloated external GLTF downloads and guaranteed instant offline startup.</li>
    </ul>

    <div class="sec-h2">3.7.2 Economic / Cost Feasibility</div>
    <p>
      <strong>Silent Bridge</strong> was built using $100\%$ open-source software (React, TypeScript, Three.js, MediaPipe, PyTorch, ONNX Runtime) and open-access CC BY 4.0 datasets (Amrita SLR, INCLUDE, ISL-CSLTR). Development required zero expenditure on proprietary software licenses, zero cloud GPU training bills (full cross-validated model training completes in $43\text{ minutes}$ on a laptop CPU), and zero specialized hardware sensors. In deployment, the 100% in-browser ONNX mode reduces server hosting costs to static file serving ($₹0\text{/month}$ on institutional intranets or static CDNs), yielding high cost efficiency.
    </p>

    <div class="sec-h2">3.7.3 Operational and Schedule Feasibility</div>
    <p>
      Operationally, the user interface is designed for non-technical users: Kannada speakers interact with familiar text boxes and speech buttons, while deaf signers receive immediate visual feedback via a mirrored camera canvas with skeletal overlays, a pending-word confirmation bar with top-3 alternatives, and authentic Sign Reference videos. From a schedule perspective, decomposing the engineering lifecycle into 11 sequential, test-gated phases ensured on-time completion within the academic calendar.
    </p>
    <div class="page-footer-arabic">21</div>
  </section>`;

  const page22 = String.raw`
  <section class="report-page body-page" data-page="22">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.8 Project Plan, Milestones and Task Allocation</div>
    <p>
      The project was executed across eleven structured engineering phases, each producing verifiable code, test suites, and empirical reports (archived in <code>docs/PHASE5_REPORT.md</code> through <code>docs/PHASE11_REPORT.md</code>). Table 3.4 and Fig. 3.1 detail the milestone schedule.
    </p>

    <div class="table-caption">Table 3.4 11-Phase Project Engineering Schedule, Milestones, and Key Deliverables</div>
    <table class="data-table" style="font-size:9.6pt;">
      <thead>
        <tr>
          <th style="width:12%;">Phase</th>
          <th style="width:28%;">Milestone Title</th>
          <th style="width:14%;">Duration</th>
          <th style="width:46%;">Key Engineering Deliverables &amp; Verification</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Phase 1–2</strong></td><td>Requirements, Dataset Audit &amp; Baseline</td><td>Weeks 1–3</td><td>Amrita SLR &amp; INCLUDE ingestion; signer-grouped split; LogReg baseline (59.7% held-out accuracy).</td></tr>
        <tr><td><strong>Phase 3–4</strong></td><td>147-D <code>hands-face-v2</code> &amp; Motion Segmenter</td><td>Weeks 4–6</td><td>Palm-normalized shape, face-crop recovery, still-tail trimming (136 &rarr; 184 live replay signs).</td></tr>
        <tr><td><strong>Phase 5</strong></td><td>BiGRU Temporal Modeling &amp; Calibration</td><td>Weeks 7–8</td><td>BiGRU + LogReg ensemble (72.4% accuracy); OOF threshold calibration ($\tau^* = 0.50$).</td></tr>
        <tr><td><strong>Phase 6</strong></td><td>Robustness, Feature Parity &amp; Seed Audit</td><td>Weeks 9–10</td><td>Perturbation benchmarks; browser-vs-Python parity verification; multi-seed McNemar ($p &lt; 10^{-8}$).</td></tr>
        <tr><td><strong>Phase 7–8</strong></td><td>Selective INCLUDE Expansion &amp; Avatar Cleaning</td><td>Weeks 11–13</td><td>HTTP Range ZIP downloader (+462 videos &rarr; 79.9% / 81.5% accuracy, $p=0.003$); avatar arm drops $367 \rightarrow 0$.</td></tr>
        <tr><td><strong>Phase 9–10</strong></td><td>144-Class Gate Test &amp; Continuous Sentence CTC</td><td>Weeks 14–16</td><td>Promotion gate rejection of diluted 144-class model; MD5 audit of ISL-CSLTR; fused CTC+Classifier (29.2%).</td></tr>
        <tr><td><strong>Phase 11</strong></td><td>Pixar 3D Avatar, In-Browser ONNX &amp; 3-View TTA</td><td>Weeks 17–20</td><td>Procedural Pixar-style 3D avatar with 2-bone IK &amp; visemes; ONNX WASM engine; 3-view TTA; Few-Shot Custom Signs; 208 tests passing.</td></tr>
      </tbody>
    </table>

    <div class="figure-box" style="margin-top:8pt;">
      <svg viewBox="0 0 760 185" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <text x="380" y="18" text-anchor="middle" font-family="Times New Roman" font-size="11.5" font-weight="bold">Gantt Timeline Across 20 Academic Project Weeks</text>
        <!-- Grid lines -->
        <line x1="210" y1="28" x2="740" y2="28" stroke="#888" stroke-width="1"/>
        <text x="235" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W1–W3</text>
        <text x="312" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W4–W6</text>
        <text x="388" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W7–W8</text>
        <text x="462" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W9–W10</text>
        <text x="536" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W11–W13</text>
        <text x="615" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W14–W16</text>
        <text x="690" y="40" font-family="Times New Roman" font-size="9" font-weight="bold">W17–W20</text>
        <line x1="210" y1="45" x2="740" y2="45" stroke="#888" stroke-width="1"/>

        <!-- Rows -->
        <text x="10" y="62" font-family="Times New Roman" font-size="9.5">1. Corpus Audit &amp; LogReg Baseline</text>
        <rect x="215" y="51" width="75" height="14" rx="2" fill="#1d4ed8"/>

        <text x="10" y="81" font-family="Times New Roman" font-size="9.5">2. 147-D Schema &amp; Motion Segmenter</text>
        <rect x="290" y="70" width="75" height="14" rx="2" fill="#2563eb"/>

        <text x="10" y="100" font-family="Times New Roman" font-size="9.5">3. BiGRU Modeling &amp; OOF Calibration</text>
        <rect x="365" y="89" width="72" height="14" rx="2" fill="#3b82f6"/>

        <text x="10" y="119" font-family="Times New Roman" font-size="9.5">4. Robustness, Parity &amp; Seed Audits</text>
        <rect x="437" y="108" width="75" height="14" rx="2" fill="#0284c7"/>

        <text x="10" y="138" font-family="Times New Roman" font-size="9.5">5. HTTP-Range INCLUDE &amp; Avatar Clean</text>
        <rect x="512" y="127" width="80" height="14" rx="2" fill="#0d9488"/>

        <text x="10" y="157" font-family="Times New Roman" font-size="9.5">6. Promotion Gate &amp; Continuous CTC</text>
        <rect x="592" y="146" width="74" height="14" rx="2" fill="#d97706"/>

        <text x="10" y="176" font-family="Times New Roman" font-size="9.5">7. 3D Pixar Rig, ONNX WASM &amp; TTA</text>
        <rect x="666" y="165" width="70" height="14" rx="2" fill="#15803d"/>
      </svg>
      <div class="figure-caption">Fig. 3.1 11-Phase project execution schedule and milestone progression across the 20-week engineering cycle.</div>
    </div>
    <div class="page-footer-arabic">22</div>
  </section>`;

  const page23 = String.raw`
  <section class="report-page body-page" data-page="23">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.9 Risk Assessment and Mitigation</div>
    <p>
      A quantitative Failure Mode and Effects Analysis (FMEA) was performed to identify technical, data, operational, and algorithmic risks, scoring each by Severity ($S$), Occurrence ($O$), and Detection difficulty ($D$) on a scale of $1$ to $10$ to compute the Risk Priority Number:
    </p>
    <div class="eq-row">
      <span>$$\mathrm{RPN} = S \times O \times D, \qquad S, O, D \in \{1, 2, \dots, 10\}$$</span>
      <span class="eq-num">(3.1)</span>
    </div>

    <div class="table-caption">Table 3.5 Risk Assessment and Mitigation Matrix (FMEA)</div>
    <table class="data-table" style="font-size:9.6pt;">
      <thead>
        <tr>
          <th style="width:8%;">ID</th>
          <th style="width:22%;">Identified Risk / Failure Mode</th>
          <th style="width:12%; text-align:center;">S &times; O &times; D = RPN</th>
          <th style="width:32%;">Implemented Engineering Mitigation</th>
          <th style="width:26%;">Residual Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>R-01</strong></td>
          <td>Accuracy collapse on new signers due to signer leakage in splits</td>
          <td class="c">$9 \times 7 \times 5 = 315$</td>
          <td>Enforced strict signer-group splitting (2 unseen Amrita signers + INCLUDE test) and 3-fold signer-grouped CV.</td>
          <td>Mitigated ($76.5\%$ on unseen signers, $p=0.003$)</td>
        </tr>
        <tr>
          <td><strong>R-02</strong></td>
          <td>Hand-over-face occlusion drops face box during mouth/nose signs</td>
          <td class="c">$8 \times 7 \times 5 = 280$</td>
          <td>Added upper-center face crop fallback offline + <code>FaceTracker</code> EMA ($45$-frame hold) + median <code>imputeFaceRelative</code> live.</td>
          <td>Mitigated (Face-relative features preserved)</td>
        </tr>
        <tr>
          <td><strong>R-03</strong></td>
          <td>Model expansion degrades accuracy on existing core vocabulary</td>
          <td class="c">$8 \times 6 \times 5 = 240$</td>
          <td>Implemented pre-registered promotion gate requiring $\Delta\text{Macro-F1} \ge -0.02$ on shared test videos + rollback.</td>
          <td>Mitigated (Rejected diluted 144-class candidate)</td>
        </tr>
        <tr>
          <td><strong>R-04</strong></td>
          <td>MediaPipe tracking gaps cause 3D avatar arms to drop mid-sign</td>
          <td class="c">$7 \times 8 \times 4 = 224$</td>
          <td>Built 5-stage clip cleaner ($\le 0.4\text{ s}$ gap interpolation + $\sigma=1.5$ Gaussian filter + idle trim).</td>
          <td>Mitigated ($367 \rightarrow 0$ arm drops across 144 clips)</td>
        </tr>
        <tr>
          <td><strong>R-05</strong></td>
          <td>In-browser ONNX never segments due to static palm-size motion metric</td>
          <td class="c">$9 \times 5 \times 4 = 180$</td>
          <td>Replaced static palm metric with <code>computeRealMotion</code> measuring 21-landmark frame-to-frame displacement at 30 FPS.</td>
          <td>Mitigated (Verified by unit tests &amp; live browser)</td>
        </tr>
        <tr>
          <td><strong>R-06</strong></td>
          <td>Duplicate/conflicting videos in public ISL-CSLTR corrupt CTC training</td>
          <td class="c">$8 \times 5 \times 4 = 160$</td>
          <td>Executed full MD5 checksum audit across 687 files; isolated 5 duplicate groups and excluded 9 conflicting files.</td>
          <td>Mitigated (100% hash-verified training split)</td>
        </tr>
        <tr>
          <td><strong>R-07</strong></td>
          <td>False positive insertions during non-sign hand movements</td>
          <td class="c">$7 \times 6 \times 3 = 126$</td>
          <td>Calibrated OOF rejection threshold ($\tau^*=0.50$) + Pending confirmation bar with countdown &amp; top-3 alternatives.</td>
          <td>Mitigated (Zero unconfirmed auto-insertions)</td>
        </tr>
        <tr>
          <td><strong>R-08</strong></td>
          <td>Regional Karnataka sign variations differ from Kerala/Chennai datasets</td>
          <td class="c">$6 \times 6 \times 3 = 108$</td>
          <td>Built Few-Shot Custom Signs studio (3–5 user samples &rarr; 3,668-D prototype fusion) + Sign Reference video viewer.</td>
          <td>Mitigated (Instant user personalization)</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">23</div>
  </section>`;

  const page24 = String.raw`
  <section class="report-page body-page" data-page="24">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 3: Requirements Analysis and Project Planning</span>
    </div>

    <div class="sec-h1">3.10 Data Privacy, Security, and Compliance Requirements</div>
    <p>
      Assistive communication systems deployed in hospitals, banks, courts, and classrooms handle sensitive personal interactions and biometric appearance data (the user’s face and hands). <strong>Silent Bridge</strong> enforces a comprehensive privacy, security, and legal compliance architecture aligned with India’s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>Rights of Persons with Disabilities (RPwD) Act, 2016</strong>:
    </p>
    <ol>
      <li><strong>Zero-Video-Transmission Architecture (Privacy by Design):</strong> Camera frames are captured via <code>navigator.mediaDevices.getUserMedia</code> into an in-memory HTML5 <code>&lt;video&gt;</code> element and processed locally inside the browser’s WebAssembly sandbox by MediaPipe. Raw pixel buffers are discarded immediately after each frame. Even when using the WebSocket backend mode, only normalized floating-point landmark coordinates are transmitted; when using the <strong>100% In-Browser ONNX mode</strong>, zero network packets leave the browser tab.</li>
      <li><strong>Explicit Opt-In Consent for Data Recording &amp; Online TTS:</strong> No landmark sequence is ever written to disk during live recognition unless the user navigates to the <em>Dataset &amp; Model</em> or <em>Custom Signs</em> page, selects an explicit purpose (<code>training</code> vs. <code>evaluation_only</code>), and clicks <em>Record</em>. Similarly, sending Kannada text to Google’s online TTS API is blocked by default unless the user explicitly checks the <em>Online TTS fallback</em> consent toggle (verified by unit test <code>refuses to send text online unless the user allowed it</code> in <code>speech.test.ts</code>).</li>
      <li><strong>Strict Isolation of Evaluation Recordings:</strong> Recordings captured with the <code>evaluation_only</code> flag are stored in <code>backend/data/eval_recordings</code> and are programmatically excluded from all model training scripts to prevent test-set contamination and protect benchmark integrity.</li>
      <li><strong>Input Validation &amp; Path-Traversal Prevention:</strong> All REST and WebSocket endpoints validate label identifiers against the strict regular expression <code>/^[A-Za-z0-9_-]{1,64}$/</code> (<code>SAFE_ID</code>) and enforce payload size limits (<code>express.json({ limit: "50mb" })</code>) and WebSocket backpressure dropping (<code>ws.bufferedAmount &gt; 256 * 1024</code>) to prevent memory exhaustion or directory traversal attacks.</li>
      <li><strong>Open-Access Dataset Provenance &amp; License Compliance:</strong> Every training video and retargeted avatar clip originates from peer-reviewed datasets published under the <strong>Creative Commons Attribution 4.0 International (CC BY 4.0)</strong> license (Amrita SLR [7], INCLUDE [5], and ISL-CSLTR [6]), with full attribution preserved in the application UI and metadata registry.</li>
    </ol>
    <div class="page-footer-arabic">24</div>
  </section>`;

  // ==================== CHAPTER 4: BUSINESS MODEL & SUSTAINABILITY (Pages 25 to 31) ====================
  const page25 = String.raw`
  <section class="report-page body-page" data-page="25">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>
    <div class="chapter-num-header">CHAPTER 4</div>
    <div class="chapter-title-center">BUSINESS MODEL AND SUSTAINABILITY FRAMEWORK</div>

    <div class="sec-h1">4.1 Introduction to the Proposed Business / Solution</div>
    <p>
      As a flagship capstone project in the <strong>Computer Science and Business Systems (CSBS)</strong> curriculum, <strong>Silent Bridge</strong> is designed not merely as an isolated academic algorithm, but as an economically self-sustaining, scalable social-enterprise product. Many assistive technology prototypes fail to transition from university laboratories to real-world adoption because their unit economics depend on expensive proprietary hardware (such as ₹80,000 sensor gloves) or high-burn cloud GPU inference servers ($₹15,000\text{–}₹40,000\text{/month}$ per concurrent video stream).
    </p>
    <p>
      By shifting neural inference and 3D avatar rendering entirely to the client edge via WebAssembly (<code>onnxruntime-web</code> + MediaPipe + Three.js), <strong>Silent Bridge</strong> achieves <strong>near-zero marginal cloud inference cost per active user</strong>. This architectural breakthrough enables a sustainable dual-engine business model: <em>100% free open-access availability for individual deaf citizens and students (B2C)</em>, cross-subsidized by <em>affordable institutional kiosk licensing, enterprise accessibility compliance suites, and custom domain vocabulary onboarding for government and corporate organizations (B2G &amp; B2B)</em>.
    </p>

    <div class="sec-h1">4.2 Identification of Target Users and Customer Segments</div>
    <p>
      Table 4.1 segments the target market into four distinct customer archetypes across Karnataka and India, distinguishing between end-users (beneficiaries) and paying institutional customers.
    </p>

    <div class="table-caption">Table 4.1 Target Customer Segments, Deployment Archetypes, and Acquisition Channels</div>
    <table class="data-table" style="font-size:10pt;">
      <thead>
        <tr>
          <th style="width:18%;">Segment Tier</th>
          <th style="width:26%;">Target Organizations / Users</th>
          <th style="width:30%;">Primary Use Case</th>
          <th style="width:26%;">Acquisition &amp; Delivery Channel</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. B2G Public Infrastructure</strong><br/>(Primary Revenue)</td>
          <td>Government hospitals (Victoria, Bowring, Taluk PHCs), <em>Karnataka One / Bangalore One</em> centers, Police &amp; Court helpdesks, KSRTC/BMTC &amp; Metro counters</td>
          <td>Front-desk two-way communication kiosk between deaf citizens and Kannada-speaking public officers</td>
          <td>State Dept. for Empowerment of Differently Abled &amp; Senior Citizens; GeM Portal &amp; Smart City tenders</td>
        </tr>
        <tr>
          <td><strong>2. B2B Enterprise Accessibility</strong><br/>(High Margin)</td>
          <td>Public &amp; private banks (SBI, Canara, Karnataka Bank), retail chains, corporate DEI &amp; HR onboarding desks</td>
          <td>RPwD Act compliance at branch counters; inclusive workplace communication for deaf employees</td>
          <td>CSR partnerships, Enterprise SaaS/On-Premise Kiosk annual subscriptions</td>
        </tr>
        <tr>
          <td><strong>3. B2B2C Education &amp; NGOs</strong><br/>(Ecosystem Partner)</td>
          <td>Deaf schools (e.g., Sheila Kothavala Institute, Red Cross schools), special B.Ed colleges, vocational centers</td>
          <td>Bilingual ISL–Kannada classroom instruction, Sign Reference study, and 3D avatar practice</td>
          <td>CSR-sponsored institutional licenses &amp; NGO distribution partnerships</td>
        </tr>
        <tr>
          <td><strong>4. B2C Individual Users</strong><br/>(Community Core)</td>
          <td>300,000+ deaf &amp; hard-of-hearing individuals and their families in Karnataka</td>
          <td>Daily personal communication, self-paced learning, and custom family/local sign creation</td>
          <td>Free offline-installable Progressive Web App (PWA) via mobile/laptop browser</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">25</div>
  </section>`;

  const page26 = String.raw`
  <section class="report-page body-page" data-page="26">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.3 Customer Problem and Value Proposition</div>
    <p>
      Using Osterwalder’s Value Proposition Design framework, we map the acute pains of both deaf citizens and institutional service providers against the concrete pain relievers and gain creators engineered into <strong>Silent Bridge</strong>:
    </p>
    <ul>
      <li><strong>Customer Pains Resolved:</strong>
        <ol>
          <li><em>Severe Interpreter Bottleneck:</em> Human ISL interpreters charge ₹1,500–₹3,000 per session, require advance booking, and rarely specialize in technical banking or clinical Kannada terminology.</li>
          <li><em>Privacy &amp; Compliance Liability:</em> Hospitals and banks cannot legally stream customer face videos to third-party cloud APIs without complex DPDP Act data-processing agreements.</li>
          <li><em>Hardware &amp; Connectivity Fragility:</em> Rural PHCs and taluk offices experience intermittent internet connectivity and run budget desktop PCs without GPUs.</li>
          <li><em>Unidirectional Frustration:</em> Speech-to-text apps do not help sign-primary deaf users whose first language is visual-spatial ISL rather than written Kannada script.</li>
        </ol>
      </li>
      <li><strong>Core Value Proposition Statement:</strong>
        <em>“For public service counters, healthcare providers, educational institutions, and deaf citizens in Karnataka, Silent Bridge is the only zero-hardware, privacy-first bidirectional ISL &leftrightarrow; Kannada platform that runs 100% locally on any standard webcam laptop—delivering signer-independent recognition (81.5% accuracy), natural Kannada SOV translation and speech, instant few-shot custom sign adaptation, and an expressive 3D Pixar-style signing avatar at less than 5% of the cost of cloud or hardware alternatives.”</em>
      </li>
    </ul>

    <div class="table-caption">Table 4.2 Value Proposition Canvas Alignment (Customer Jobs, Pains, Gains vs. Product Features)</div>
    <table class="data-table" style="font-size:10pt;">
      <thead>
        <tr>
          <th style="width:22%;">Dimension</th>
          <th style="width:39%;">Customer Profile (Deaf Citizen &amp; Institution)</th>
          <th style="width:39%;">Value Map (Silent Bridge Feature)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Functional Jobs</strong></td>
          <td>Communicate symptoms, banking requests, or classroom lessons accurately between ISL and Kannada in real time.</td>
          <td>Dual-engine BiGRU+TTA recognition, 187-phrase SOV Kannada translator, <code>kn-IN</code> TTS, and 161-clip 3D IK Avatar.</td>
        </tr>
        <tr>
          <td><strong>Pain Relievers</strong></td>
          <td>Eliminate video privacy leaks, cloud GPU fees, internet outages, and mid-sign avatar glitches.</td>
          <td>In-browser MediaPipe + ONNX WASM ($0$ video bytes sent), PWA offline mode, and cleaned avatar clips ($0$ arm drops).</td>
        </tr>
        <tr>
          <td><strong>Gain Creators</strong></td>
          <td>Adapt to organization-specific terms (e.g., bank/hospital names) and audit system reliability transparently.</td>
          <td>Few-Shot Custom Signs studio (3–5 samples), 6-stage Pipeline Diagnostics, and McNemar promotion gate.</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">26</div>
  </section>`;

  const page27 = String.raw`
  <section class="report-page body-page" data-page="27">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.4 Business Model Canvas</div>
    <p>
      Fig. 4.1 illustrates the complete nine-block Osterwalder <strong>Business Model Canvas (BMC)</strong> [24] for <strong>Silent Bridge</strong>, integrating partnerships, activities, resources, value propositions, customer relationships, channels, segments, cost structure, and revenue streams.
    </p>

    <div class="figure-box">
      <svg viewBox="0 0 760 390" style="width:100%; height:auto; display:block; background:#fff; border:1.5px solid #1e293b;">
        <!-- Top 5 Columns -->
        <!-- Key Partners -->
        <rect x="0" y="0" width="152" height="275" fill="#f8fafc" stroke="#334155" stroke-width="1.2"/>
        <text x="8" y="18" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">1. KEY PARTNERS</text>
        <text x="8" y="36" font-family="Times New Roman" font-size="8.8">• Dept. for Empowerment</text>
        <text x="14" y="47" font-family="Times New Roman" font-size="8.8">of Differently Abled (GoK)</text>
        <text x="8" y="62" font-family="Times New Roman" font-size="8.8">• Karnataka One &amp; PHCs</text>
        <text x="8" y="77" font-family="Times New Roman" font-size="8.8">• Deaf Associations (NAD,</text>
        <text x="14" y="88" font-family="Times New Roman" font-size="8.8">KSAD) &amp; Special Schools</text>
        <text x="8" y="103" font-family="Times New Roman" font-size="8.8">• Open Corpus Creators</text>
        <text x="14" y="114" font-family="Times New Roman" font-size="8.8">(INCLUDE, Amrita, CSLTR)</text>
        <text x="8" y="129" font-family="Times New Roman" font-size="8.8">• Corporate CSR Foundations</text>
        <text x="14" y="140" font-family="Times New Roman" font-size="8.8">(Infosys, Wipro, Biocon)</text>

        <!-- Key Activities -->
        <rect x="152" y="0" width="152" height="138" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
        <text x="160" y="18" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">2. KEY ACTIVITIES</text>
        <text x="160" y="35" font-family="Times New Roman" font-size="8.8">• BiGRU/CTC Model Training</text>
        <text x="160" y="49" font-family="Times New Roman" font-size="8.8">• Karnataka Sign Collection</text>
        <text x="160" y="63" font-family="Times New Roman" font-size="8.8">• 3D Avatar Clip Cleaning</text>
        <text x="160" y="77" font-family="Times New Roman" font-size="8.8">• Kannada Grammar Curation</text>
        <text x="160" y="91" font-family="Times New Roman" font-size="8.8">• Kiosk Deployment &amp; Audits</text>

        <!-- Key Resources -->
        <rect x="152" y="138" width="152" height="137" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
        <text x="160" y="156" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">3. KEY RESOURCES</text>
        <text x="160" y="173" font-family="Times New Roman" font-size="8.8">• 147-D hands-face-v2 IP</text>
        <text x="160" y="187" font-family="Times New Roman" font-size="8.8">• Calibrated ONNX Models</text>
        <text x="160" y="201" font-family="Times New Roman" font-size="8.8">• 161 Cleaned 3D Avatar Clips</text>
        <text x="160" y="215" font-family="Times New Roman" font-size="8.8">• 187-Phrase Kannada Lexicon</text>
        <text x="160" y="229" font-family="Times New Roman" font-size="8.8">• McNemar Governance Suite</text>

        <!-- Value Propositions -->
        <rect x="304" y="0" width="152" height="275" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.5"/>
        <text x="312" y="18" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">4. VALUE PROPOSITIONS</text>
        <text x="312" y="36" font-family="Times New Roman" font-size="8.8" font-weight="bold">• Bidirectional ISL &leftrightarrow; Kannada</text>
        <text x="318" y="47" font-family="Times New Roman" font-size="8.5">Text, Speech &amp; 3D Avatar</text>
        <text x="312" y="62" font-family="Times New Roman" font-size="8.8" font-weight="bold">• 100% Privacy-Preserving</text>
        <text x="318" y="73" font-family="Times New Roman" font-size="8.5">Zero camera video leaves PC</text>
        <text x="312" y="88" font-family="Times New Roman" font-size="8.8" font-weight="bold">• Commodity CPU &amp; Offline</text>
        <text x="318" y="99" font-family="Times New Roman" font-size="8.5">3.8 ms inference; no GPU needed</text>
        <text x="312" y="114" font-family="Times New Roman" font-size="8.8" font-weight="bold">• Signer-Independent (81.5%)</text>
        <text x="318" y="125" font-family="Times New Roman" font-size="8.5">76.5% on unseen signers</text>
        <text x="312" y="140" font-family="Times New Roman" font-size="8.8" font-weight="bold">• Few-Shot Custom Signs</text>
        <text x="318" y="151" font-family="Times New Roman" font-size="8.5">Learn new signs in 3–5 samples</text>
        <text x="312" y="166" font-family="Times New Roman" font-size="8.8" font-weight="bold">• Expressive Pixar 3D Avatar</text>
        <text x="318" y="177" font-family="Times New Roman" font-size="8.5">0 arm drops + Kannada visemes</text>

        <!-- Customer Relationships -->
        <rect x="456" y="0" width="152" height="138" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
        <text x="464" y="18" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">5. RELATIONSHIPS</text>
        <text x="464" y="35" font-family="Times New Roman" font-size="8.8">• Self-Service Offline PWA</text>
        <text x="464" y="49" font-family="Times New Roman" font-size="8.8">• Dedicated Kiosk SLA (B2G)</text>
        <text x="464" y="63" font-family="Times New Roman" font-size="8.8">• Co-Design with Deaf Users</text>
        <text x="464" y="77" font-family="Times New Roman" font-size="8.8">• Custom Domain Onboarding</text>

        <!-- Channels -->
        <rect x="456" y="138" width="152" height="137" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
        <text x="464" y="156" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">6. CHANNELS</text>
        <text x="464" y="173" font-family="Times New Roman" font-size="8.8">• Direct Web / PWA Install</text>
        <text x="464" y="187" font-family="Times New Roman" font-size="8.8">• GeM &amp; State E-Governance</text>
        <text x="464" y="201" font-family="Times New Roman" font-size="8.8">• Bank &amp; Hospital Intranets</text>
        <text x="464" y="215" font-family="Times New Roman" font-size="8.8">• Special School Labs</text>

        <!-- Customer Segments -->
        <rect x="608" y="0" width="152" height="275" fill="#f8fafc" stroke="#334155" stroke-width="1.2"/>
        <text x="616" y="18" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#1e3a8a">7. CUSTOMER SEGMENTS</text>
        <text x="616" y="36" font-family="Times New Roman" font-size="8.8" font-weight="bold">• B2G Civic Counters:</text>
        <text x="620" y="47" font-family="Times New Roman" font-size="8.5">PHCs, Hospitals, Karnataka One</text>
        <text x="616" y="64" font-family="Times New Roman" font-size="8.8" font-weight="bold">• B2B Enterprises:</text>
        <text x="620" y="75" font-family="Times New Roman" font-size="8.5">Banks, Retail, IT/ITES HR Desks</text>
        <text x="616" y="92" font-family="Times New Roman" font-size="8.8" font-weight="bold">• B2B2C Education:</text>
        <text x="620" y="103" font-family="Times New Roman" font-size="8.5">Deaf Schools &amp; Training NGOs</text>
        <text x="616" y="120" font-family="Times New Roman" font-size="8.8" font-weight="bold">• B2C Community:</text>
        <text x="620" y="131" font-family="Times New Roman" font-size="8.5">300k+ Deaf Signers in KA</text>

        <!-- Bottom 2 Columns -->
        <!-- Cost Structure -->
        <rect x="0" y="275" width="380" height="115" fill="#fff7ed" stroke="#334155" stroke-width="1.2"/>
        <text x="10" y="294" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#9a3412">8. COST STRUCTURE (Ultra-Lean Edge Architecture)</text>
        <text x="10" y="312" font-family="Times New Roman" font-size="9">• R&amp;D and Native Signer Verification Stipends (~45% of budget)</text>
        <text x="10" y="327" font-family="Times New Roman" font-size="9">• Kiosk Packaging, On-Premise Installer &amp; Accessibility Audits (~25%)</text>
        <text x="10" y="342" font-family="Times New Roman" font-size="9">• Static CDN / Registry Hosting: Near-Zero (₹0 GPU cost via client-side ONNX WASM)</text>
        <text x="10" y="357" font-family="Times New Roman" font-size="9">• Customer Support &amp; Institutional Training Workshops (~20%)</text>

        <!-- Revenue Streams -->
        <rect x="380" y="275" width="380" height="115" fill="#f0fdf4" stroke="#334155" stroke-width="1.2"/>
        <text x="390" y="294" font-family="Times New Roman" font-size="10.5" font-weight="bold" fill="#15803d">9. REVENUE STREAMS (Cross-Subsidized Social Enterprise)</text>
        <text x="390" y="312" font-family="Times New Roman" font-size="9">• B2C Individual &amp; Student Tier: ₹0 (100% Free Forever Offline PWA)</text>
        <text x="390" y="327" font-family="Times New Roman" font-size="9">• B2G / B2B Kiosk License: ₹12,000 / terminal / year (Hospitals, Banks, Civic Centers)</text>
        <text x="390" y="342" font-family="Times New Roman" font-size="9">• Enterprise SDK &amp; Custom Sign Pack Onboarding: ₹75,000 – ₹1,50,000 per org</text>
        <text x="390" y="357" font-family="Times New Roman" font-size="9">• CSR-Sponsored School &amp; District Bundles: ₹2,50,000 per 25-school cluster</text>
      </svg>
      <div class="figure-caption">Fig. 4.1 Nine-block Osterwalder Business Model Canvas for Silent Bridge.</div>
    </div>
    <p style="margin-top:8pt;">
      As shown in Blocks 8 and 9 of Fig. 4.1, executing MediaPipe landmark extraction, 3-view TTA BiGRU classification, and Three.js avatar synthesis directly inside the user's browser reduces per-session server GPU compute to zero. Because each additional free community user adds negligible bandwidth cost, institutional B2G/B2B kiosk licenses (Rs. 12,000 per counter annually) cross-subsidize unrestricted offline PWA access for deaf students, families, and community clinics without degrading unit margins.
    </p>
    <div class="page-footer-arabic">27</div>
  </section>`;

  const page28 = String.raw`
  <section class="report-page body-page" data-page="28">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.5 Market / User Adoption Potential</div>
    <p>
      To quantify the addressable market for <strong>Silent Bridge</strong> across institutional and consumer channels, a bottom-up TAM–SAM–SOM market sizing analysis was conducted:
    </p>
    <ul>
      <li><strong>Total Addressable Market (TAM: India-Wide Institutional &amp; Assistive Sector):</strong> India has over $1,50,000$ public health facilities, $1,60,000$ bank branches, $25,000$ citizen service centers, and $3,500+$ special education and inclusive vocational institutes. At an average institutional software valuation of ₹12,000/year per facility, the national TAM across Indian regional sign bridges is approximately <strong>₹408 Crore/year</strong> ($5\text{M+}$ deaf citizens).</li>
      <li><strong>Serviceable Addressable Market (SAM: Karnataka Kannada-Speaking Ecosystem):</strong> Focusing specifically on Karnataka (where Kannada is the official administrative language), there are $2,500+$ primary health centers and district hospitals, $11,000+$ bank branches, $1,200+$ <em>Karnataka One / Bangalore One / Grama One</em> citizen centers, and $280+$ special schools and inclusive colleges, representing a regional SAM of <strong>₹18.0 Crore/year</strong> serving $3,00,000+$ deaf residents.</li>
      <li><strong>Serviceable Obtainable Market (SOM: Initial 3-Year Target):</strong> Capturing just $3.5\%$ of Karnataka’s institutional counters ($525$ active kiosk terminals across urban hospitals, banks, and civic centers plus $12$ enterprise/CSR contracts) yields a realistic 3-year SOM of <strong>₹78.0 Lakhs/year</strong> in recurring annual revenue.</li>
    </ul>

    <div class="sec-h1">4.6 Cost-Benefit Analysis</div>
    <p>
      Table 4.3 compares the total annual cost of ownership (TCO) for a public hospital or bank branch operating a service desk 8 hours/day (2,000 hours/year) across three alternatives: (1) Full-time on-site human interpreter, (2) Cloud GPU video-streaming SLR API, and (3) <strong>Silent Bridge</strong> running in local WebAssembly ONNX mode on an existing front-desk PC.
    </p>

    <div class="table-caption">Table 4.3 Annual Cost-Benefit Comparison per Service Counter (2,000 Operational Hours/Year)</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:25%;">Cost / Benefit Dimension</th>
          <th style="width:25%;">On-Site Human Interpreter</th>
          <th style="width:25%;">Cloud GPU Video SLR System</th>
          <th style="width:25%;">Silent Bridge (Proposed)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Specialized Hardware CapEx</strong></td><td>₹0</td><td>₹45,000 (Depth Camera / Mini-GPU)</td><td><strong>₹0</strong> (Uses existing PC webcam)</td></tr>
        <tr><td><strong>Cloud Compute &amp; Bandwidth</strong></td><td>₹0</td><td>₹1,80,000/yr (GPU instance + egress)</td><td><strong>₹0/yr</strong> (100% In-Browser WASM)</td></tr>
        <tr><td><strong>Annual Staffing / License Fee</strong></td><td>₹4,20,000 – ₹6,00,000/yr</td><td>₹60,000/yr SaaS fee</td><td><strong>₹12,000/yr</strong> Institutional License</td></tr>
        <tr><td><strong>Total 1st-Year Cost per Desk</strong></td><td><strong>₹4,20,000+</strong></td><td><strong>₹2,85,000</strong></td><td><strong>₹12,000 (95.8% Cost Saving)</strong></td></tr>
        <tr><td><strong>24&times;7 Availability &amp; Privacy</strong></td><td>Limited shifts; third-party present</td><td>Requires high-speed internet; video uploaded</td><td><strong>24&times;7 Offline; 0 bytes video uploaded</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">28</div>
  </section>`;

  const page29 = String.raw`
  <section class="report-page body-page" data-page="29">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.7 Revenue Generation and Pricing Model</div>
    <p>
      To maximize social impact while maintaining healthy financial margins, <strong>Silent Bridge</strong> employs a four-tier pricing architecture (Table 4.4). Individual deaf users, families, and students always receive the full application free of charge.
    </p>

    <div class="table-caption">Table 4.4 Multi-Tier Pricing and Packaging Architecture</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:20%;">Pricing Tier</th>
          <th style="width:20%;">Target Customer</th>
          <th style="width:22%;">Price (INR)</th>
          <th style="width:38%;">Included Capabilities &amp; Support</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tier 1: Community Edition</strong></td>
          <td>Individual Deaf Users, Students, Families</td>
          <td><strong>₹0 (Free Forever)</strong></td>
          <td>Full In-Browser ONNX recognition, Kannada TTS, 3D Pixar Avatar, Sign Reference, up to 25 local Custom Signs, Offline PWA.</td>
        </tr>
        <tr>
          <td><strong>Tier 2: Civic &amp; Clinic Kiosk</strong></td>
          <td>Hospitals, PHCs, Schools, Citizen Desks</td>
          <td><strong>₹12,000 / year</strong><br/>(₹1,000 / month)</td>
          <td>Everything in Tier 1 + Kiosk lockdown mode, domain phrase pack (Medical/Civic), unlimited Custom Signs, diagnostics &amp; SLA support.</td>
        </tr>
        <tr>
          <td><strong>Tier 3: Enterprise Branch Suite</strong></td>
          <td>Banks, Retail Chains, Corporate Offices</td>
          <td><strong>₹24,000 / year</strong><br/>per branch</td>
          <td>Centralized custom sign distribution across branches, custom brand avatar attire, audit logs, and staff onboarding training.</td>
        </tr>
        <tr>
          <td><strong>Tier 4: CSR Cluster Grant</strong></td>
          <td>Corporate CSR &amp; State District Rollouts</td>
          <td><strong>₹2,50,000 / year</strong><br/>(25 Kiosk Licenses)</td>
          <td>Turnkey deployment across 25 deaf schools or rural PHCs with quarterly impact &amp; SDG measurement reports.</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-h1">4.8 Business Feasibility and Viability</div>
    <p>
      Table 4.5 presents the conservative 3-year financial projection for spinning out <strong>Silent Bridge</strong> as an incubate social-enterprise startup. Because client-side WebAssembly eliminates cloud GPU servers, gross margins exceed $88\%$, and the venture reaches cash-flow break-even in <strong>Month 11 of Year 1</strong> with just $95$ kiosk licenses.
    </p>

    <div class="table-caption">Table 4.5 Three-Year Financial Projection and Unit Economics (in INR Lakhs)</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:36%;">Financial Metric</th>
          <th style="width:21%; text-align:right;">Year 1</th>
          <th style="width:21%; text-align:right;">Year 2</th>
          <th style="width:22%; text-align:right;">Year 3</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Active Free B2C Community Users</td><td class="r">2,500</td><td class="r">12,000</td><td class="r">35,000</td></tr>
        <tr><td>Paid Kiosk Licenses (Tier 2 &amp; Tier 3)</td><td class="r">80</td><td class="r">240</td><td class="r">525</td></tr>
        <tr><td>CSR Cluster Grants (Tier 4 Bundles)</td><td class="r">2</td><td class="r">5</td><td class="r">9</td></tr>
        <tr><td><strong>Total Gross Revenue (₹ Lakhs)</strong></td><td class="r"><strong>₹14.60 L</strong></td><td class="r"><strong>₹41.30 L</strong></td><td class="r"><strong>₹85.50 L</strong></td></tr>
        <tr><td>Cloud &amp; Static Registry Infrastructure Cost</td><td class="r">₹0.60 L</td><td class="r">₹1.10 L</td><td class="r">₹1.80 L</td></tr>
        <tr><td>Engineering, Signer Stipends &amp; Field Operations</td><td class="r">₹11.50 L</td><td class="r">₹24.00 L</td><td class="r">₹42.00 L</td></tr>
        <tr><td><strong>Net Operating Surplus / EBITDA (₹ Lakhs)</strong></td><td class="r"><strong>₹2.50 L</strong></td><td class="r"><strong>₹16.20 L</strong></td><td class="r"><strong>₹41.70 L</strong></td></tr>
        <tr><td><strong>Operating Margin (%)</strong></td><td class="r"><strong>17.1%</strong></td><td class="r"><strong>39.2%</strong></td><td class="r"><strong>48.8%</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">29</div>
  </section>`;

  const page30 = String.raw`
  <section class="report-page body-page" data-page="30">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.9 Scalability and Long-Term Sustainability</div>
    <p>
      Long-term technical and operational sustainability is engineered into <strong>Silent Bridge</strong> across four structural dimensions:
    </p>
    <ol>
      <li><strong>Compute Scalability via Edge WebAssembly:</strong> In conventional cloud AI startups, doubling the user base doubles the monthly GPU bill, creating a fragile cost curve for free assistive tools. In <strong>Silent Bridge</strong>, every new laptop or tablet brings its own CPU and WebGL GPU. Whether $100$ or $1,00,000$ concurrent users run the 100% In-Browser ONNX engine and 3D Pixar-style avatar, server compute load remains zero.</li>
      <li><strong>Vocabulary Scalability via Few-Shot Prototype Fusion &amp; Governance:</strong> Expanding the vocabulary does not require retraining the entire neural network from scratch for every local workplace sign. Users can immediately add custom signs via 3,668-D prototype centroids (<code>CustomSigns.tsx</code> &amp; <code>ModelManager.blendWithPrototypes</code>). When batch dataset expansions are trained, the automated promotion gate (checking held-out macro-F1 and paired McNemar significance) ensures that new models never degrade existing sign accuracy.</li>
      <li><strong>Linguistic Scalability Across Dravidian &amp; Indic Languages:</strong> Because the recognition pipeline outputs canonical language-neutral ISL glosses (e.g., <code>namaskara</code>, <code>i_me</code>, <code>water</code>, <code>hospital</code>) before invoking the modular meaning layer (<code>backend_ts/translation.ts</code>), extending the platform to Tamil, Telugu, Malayalam, or Hindi requires only adding a target-language phrase table and SOV suffix rules without modifying the vision or BiGRU models.</li>
      <li><strong>Environmental Sustainability (Low-Carbon Edge AI):</strong> By executing all landmark extraction and sequence classification within a $15\text{ W}$ client CPU envelope and avoiding redundant multi-gigabyte archive downloads through HTTP <code>Range</code> requests, the system maintains a minimal carbon footprint throughout both training and multi-year kiosk operation.</li>
    </ol>
    <div class="page-footer-arabic">30</div>
  </section>`;

  const page31 = String.raw`
  <section class="report-page body-page" data-page="31">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 4: Business Model and Sustainability Framework</span>
    </div>

    <div class="sec-h1">4.10 SDG Impact Pathway and Measurable Indicators</div>
    <p>
      To ensure that social impact is systematically tracked alongside financial viability, Table 4.6 defines the formal <strong>SDG Theory of Change (Inputs &rarr; Activities &rarr; Outputs &rarr; Outcomes &rarr; Long-Term Impact)</strong> and quantitative Key Performance Indicators (KPIs) for <strong>Silent Bridge</strong>.
    </p>

    <div class="table-caption">Table 4.6 SDG Impact Pathway and Measurable Key Performance Indicators (KPIs)</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:15%;">Target SDG</th>
          <th style="width:27%;">Impact Pathway (Input &rarr; Output)</th>
          <th style="width:30%;">Quantitative Indicator (KPI)</th>
          <th style="width:28%;">Measured Project Baseline / Target</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>SDG 3</strong><br/>(Target 3.8)</td>
          <td>Deploy offline medical ISL–Kannada triage kiosks at PHCs &amp; hospitals</td>
          <td>1. Consultation privacy leak rate<br/>2. Medical sign recognition F1</td>
          <td>1. <strong>0% video leak</strong> (100% browser local)<br/>2. <strong>&gt; 0.80 F1</strong> on core health signs</td>
        </tr>
        <tr>
          <td><strong>SDG 4</strong><br/>(Target 4.5, 4.a)</td>
          <td>Provide free bilingual Sign Reference &amp; 3D Avatar tool to deaf schools</td>
          <td>1. Supported ISL avatar lexicon coverage<br/>2. Mid-sign avatar tracking drop rate</td>
          <td>1. <strong>161 / 162 signs (99.4%)</strong> with 3D clips<br/>2. <strong>0% arm drops</strong> (reduced from 367 to 0)</td>
        </tr>
        <tr>
          <td><strong>SDG 8</strong><br/>(Target 8.5)</td>
          <td>Enable custom workplace sign onboarding in 3–5 webcam samples</td>
          <td>1. Samples required per custom sign<br/>2. Onboarding latency on CPU</td>
          <td>1. <strong>3–5 samples</strong> (outlier-filtered centroid)<br/>2. <strong>&lt; 1 second</strong> instant registration</td>
        </tr>
        <tr>
          <td><strong>SDG 9</strong><br/>(Target 9.c)</td>
          <td>Eliminate GPU &amp; broadband dependency via WASM &amp; HTTP Range</td>
          <td>1. Per-sign CPU inference latency<br/>2. Archive download bandwidth saved</td>
          <td>1. <strong>3.8 ms</strong> (server) / <strong>~11 ms</strong> (browser TTA)<br/>2. <strong>86.7% saved</strong> (5.96 GB vs 44.7 GB)</td>
        </tr>
        <tr>
          <td><strong>SDG 10</strong><br/>(Target 10.2)</td>
          <td>Deliver accurate signer-independent ISL &leftrightarrow; Kannada translation</td>
          <td>1. Unseen-signer isolated accuracy<br/>2. Phrase-level Kannada match gain</td>
          <td>1. <strong>76.5% unseen / 81.5% overall</strong> ($p=0.003$)<br/>2. <strong>+21.0% gain</strong> (60.5% vs 39.5% word-level)</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-h1">4.11 Summary</div>
    <p>
      This chapter demonstrated that <strong>Silent Bridge</strong> combines compelling technical performance with a financially viable, ultra-lean business model. By eliminating proprietary hardware and recurring cloud GPU costs through in-browser WebAssembly, the platform reduces per-desk accessibility costs by $95.8\%$ compared to cloud alternatives, reaches financial break-even within 11 months under a B2G/B2B kiosk licensing model, and keeps the core application 100% free for every deaf citizen and student in Karnataka. Chapter 5 now presents the complete mathematical, algorithmic, and architectural design of the system.
    </p>
    <div class="page-footer-arabic">31</div>
  </section>`;

  return [
    page17,
    page18,
    page19,
    page20,
    page21,
    page22,
    page23,
    page24,
    page25,
    page26,
    page27,
    page28,
    page29,
    page30,
    page31,
  ].join("\n");
}
