// Chapter 1: Introduction (Pages 1–8) & Chapter 2: Literature Review and Related Work (Pages 9–16)
// Strictly adheres to BMSCE CSBS B.E. Project Report Guidelines

export function buildChapters1And2() {
  // ==================== CHAPTER 1: INTRODUCTION (Pages 1 to 8) ====================
  const page1 = String.raw`
  <section class="report-page body-page" data-page="1">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>
    <div class="chapter-num-header">CHAPTER 1</div>
    <div class="chapter-title-center">INTRODUCTION</div>

    <div class="sec-h1">1.1 Background and Context of the Project</div>
    <p>
      Sign languages are complete, self-contained natural languages possessing their own phonological, morphological, syntactic, and discourse structures; they are not manual encodings or word-for-word gestural representations of spoken languages [1], [2]. Across India, Indian Sign Language (ISL) serves as the primary visual-spatial vernacular for millions of deaf and hard-of-hearing citizens. According to the Census of India and estimates from the National Association of the Deaf (NAD), India is home to over 5 million deaf and hard-of-hearing individuals, with more than 300,000 residing in the state of Karnataka alone. Despite the linguistic richness of ISL, fewer than 350 certified ISL interpreters are registered nationwide by the Indian Sign Language Research and Training Centre (ISLRTC), creating an acute communication barrier whenever a deaf citizen interacts with public infrastructure.
    </p>
    <p>
      In Karnataka, this communication divide is compounded by a regional linguistic mismatch. While the deaf community communicates in ISL, the surrounding hearing population—including hospital receptionists, primary care physicians, bank officers, municipal clerks, transport staff, and school teachers—reads and speaks <strong>Kannada</strong>, a classical Dravidian language written in the Kannada abugida script (Unicode block <code>U+0C80–U+0CFF</code>). Virtually all mainstream sign language recognition research has concentrated on American Sign Language (WLASL [1], MS-ASL [2]), German Sign Language (RWTH-PHOENIX-Weather [3]), or neural sign-to-spoken-language translation [4], outputting English or German text. Even the limited Indian Sign Language prototypes developed in academic literature predominantly output English glosses rather than grammatically well-formed regional Indian languages.
    </p>

    <div class="sec-h1">1.2 Project Domain Overview</div>
    <p>
      The engineering domain of <strong>Silent Bridge</strong> sits at the intersection of five technical disciplines: (i) <em>Visual-Spatial Sign Linguistics</em>, (ii) <em>Real-Time Pose and Landmark Computer Vision</em>, (iii) <em>Spatio-Temporal Deep Sequence Modeling</em>, (iv) <em>Dravidian Computational Linguistics and SOV Machine Translation</em>, and (v) <em>Procedural 3D Character Rigging and Analytic Inverse Kinematics</em>.
    </p>
    <p>
      From a linguistic perspective, an ISL sign is defined simultaneously along five phonological parameters extended to Indian Sign Language corpora [5]: (1) <strong>Handshape</strong> (the configuration and flexion of the 20 finger joints relative to the wrist), (2) <strong>Location</strong> (the spatial placement of the hands relative to the signer’s face, chin, forehead, or chest), (3) <strong>Palm Orientation</strong> (the 3D unit normal of the palmar surface and the longitudinal axis of the middle finger), (4) <strong>Movement</strong> (the trajectory, velocity, and path length of the wrists over time), and (5) <strong>Non-Manual Markers (NMMs)</strong> (eyebrow elevation, brow furrow, head tilt, head shake, and lip mouthing that encode interrogative, negative, or declarative sentence mood). Many distinct ISL signs share identical handshapes and differ solely in their location relative to the face—for example, <em>EAT</em>, <em>DRINK</em>, <em>WATER</em>, <em>SPEAK</em>, and <em>NOSE</em> all occur within centimeters of the mouth and nose. Consequently, a recognition architecture that strips face-relative coordinates or fails when a hand momentarily occludes the face cannot reliably separate these high-frequency everyday signs.
    </p>
    <div class="page-footer-arabic">1</div>
  </section>`;

  const page2 = String.raw`
  <section class="report-page body-page" data-page="2">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>
    <p>
      Furthermore, translating between ISL and Kannada requires bridging two structurally distinct grammars. While both ISL and Kannada exhibit Subject–Object–Verb (SOV) tendencies, ISL is topic-prominent, drops copulas and case inflections, places wh-interrogatives and negation markers at the clause periphery accompanied by non-manual facial grammar, and orders temporal expressions before locatives. Kannada, by contrast, is a highly agglutinative Dravidian language where grammatical relations are expressed by suffixing locative (<em>-ಅಲ್ಲಿ / -alli</em>), dative (<em>-ಗೆ / -ge</em>), and accusative postpositions directly onto nominal stems and inflecting verbs for tense, aspect, and person-number-gender agreement.
    </p>

    <div class="figure-box">
      <svg viewBox="0 0 760 205" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <defs>
          <marker id="arr1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e3a8a"/>
          </marker>
          <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#9a3412"/>
          </marker>
        </defs>
        <!-- Top Pipeline: Forward ISL to Kannada -->
        <text x="14" y="20" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#1e3a8a">FORWARD DIRECTION: ISL Signer → Kannada Text &amp; Speech (Privacy-Preserving Landmark Pipeline)</text>
        <rect x="14" y="30" width="128" height="58" rx="4" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="78" y="50" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Webcam Capture</text>
        <text x="78" y="65" text-anchor="middle" font-family="Times New Roman" font-size="9.5">MediaPipe Hands+Face</text>
        <text x="78" y="79" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#1e40af">147-D hands-face-v2</text>

        <line x1="142" y1="59" x2="170" y2="59" stroke="#1e3a8a" stroke-width="1.5" marker-end="url(#arr1)"/>

        <rect x="172" y="30" width="136" height="58" rx="4" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="240" y="50" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Motion Segmenter</text>
        <text x="240" y="65" text-anchor="middle" font-family="Times New Roman" font-size="9.5">Still-Tail Trim &amp; T=24</text>
        <text x="240" y="79" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#1e40af">3,668-D Feature Vector</text>

        <line x1="308" y1="59" x2="336" y2="59" stroke="#1e3a8a" stroke-width="1.5" marker-end="url(#arr1)"/>

        <rect x="338" y="30" width="142" height="58" rx="4" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.3"/>
        <text x="409" y="50" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">BiGRU + 3-View TTA</text>
        <text x="409" y="65" text-anchor="middle" font-family="Times New Roman" font-size="9.5">&amp; Fused CTC Decoder</text>
        <text x="409" y="79" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#1e40af">Calibrated Gate τ*=0.50</text>

        <line x1="480" y1="59" x2="508" y2="59" stroke="#1e3a8a" stroke-width="1.5" marker-end="url(#arr1)"/>

        <rect x="510" y="30" width="236" height="58" rx="4" fill="#dbeafe" stroke="#1e3a8a" stroke-width="1.5"/>
        <text x="628" y="49" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Kannada SOV Meaning &amp; Speech</text>
        <text x="628" y="65" text-anchor="middle" font-family="Times New Roman" font-size="10">ನಮಸ್ಕಾರ, ನನಗೆ ನೀರು ಬೇಕು</text>
        <text x="628" y="79" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#1e3a8a">187 Phrases + SOV Grammar + kn-IN TTS</text>

        <!-- Bottom Pipeline: Reverse Kannada to ISL 3D Avatar -->
        <text x="14" y="118" font-family="Times New Roman" font-size="11.5" font-weight="bold" fill="#9a3412">REVERSE DIRECTION: Kannada Text Input → Continuous 3D Avatar ISL Signing</text>
        <rect x="14" y="128" width="160" height="58" rx="4" fill="#fff7ed" stroke="#c2410c" stroke-width="1.3"/>
        <text x="94" y="148" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Kannada Text Input</text>
        <text x="94" y="163" text-anchor="middle" font-family="Times New Roman" font-size="9.5">Unicode NFC Normalizer</text>
        <text x="94" y="177" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#9a3412">Suffix &amp; Stem Analyzer</text>

        <line x1="174" y1="157" x2="204" y2="157" stroke="#9a3412" stroke-width="1.5" marker-end="url(#arr2)"/>

        <rect x="206" y="128" width="166" height="58" rx="4" fill="#fff7ed" stroke="#c2410c" stroke-width="1.3"/>
        <text x="289" y="148" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Longest-Match Mapper</text>
        <text x="289" y="163" text-anchor="middle" font-family="Times New Roman" font-size="9.5">187 Phrases + 144 Signs</text>
        <text x="289" y="177" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#9a3412">ISL Gloss Order Planner</text>

        <line x1="372" y1="157" x2="402" y2="157" stroke="#9a3412" stroke-width="1.5" marker-end="url(#arr2)"/>

        <rect x="404" y="128" width="164" height="58" rx="4" fill="#fff7ed" stroke="#c2410c" stroke-width="1.3"/>
        <text x="486" y="148" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">Cleaned Motion Library</text>
        <text x="486" y="163" text-anchor="middle" font-family="Times New Roman" font-size="9.5">Gap Interp + σ=1.5 Smooth</text>
        <text x="486" y="177" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#9a3412">0 Mid-Sign Arm Drops</text>

        <line x1="568" y1="157" x2="598" y2="157" stroke="#9a3412" stroke-width="1.5" marker-end="url(#arr2)"/>

        <rect x="600" y="128" width="146" height="58" rx="4" fill="#ffedd5" stroke="#9a3412" stroke-width="1.5"/>
        <text x="673" y="148" text-anchor="middle" font-family="Times New Roman" font-size="10.5" font-weight="bold">3D Pixar-Style Avatar</text>
        <text x="673" y="163" text-anchor="middle" font-family="Times New Roman" font-size="9.5">2-Bone IK + Ballistic Arc</text>
        <text x="673" y="177" text-anchor="middle" font-family="Times New Roman" font-size="9" fill="#9a3412">Kannada Viseme Lip-Sync</text>
      </svg>
      <div class="figure-caption">Fig. 1.1 Bidirectional ISL-to-Kannada dual-stream translation architecture implemented in Silent Bridge.</div>
    </div>

    <div class="sec-h1">1.3 Motivation</div>
    <p>
      Four concrete real-world observations motivated the creation of <strong>Silent Bridge</strong>:
    </p>
    <ol>
      <li><strong>Severe Interpreter Scarcity in Regional Languages:</strong> While urban English-speaking deaf individuals can occasionally access remote interpretation, a deaf patient visiting a taluk hospital or a student attending a Kannada-medium school in Karnataka has no practical access to real-time ISL–Kannada interpretation.</li>
      <li><strong>Illusion of Accuracy from Signer-Dependent Splits:</strong> Many published ISL recognition studies evaluate models by randomly splitting recordings of the same signer across training and test sets, reporting $>95\%$ accuracy that collapses below $50\%$ when tested on a new person. A deployable assistive tool must be evaluated strictly on unseen signers.</li>
      <li><strong>Privacy and Bandwidth Constraints of Video Cloud Uploads:</strong> Streaming raw webcam video to remote GPU servers violates user privacy in medical or financial consultations and fails on low-bandwidth rural connections. Extracting compact 3D landmarks in the browser and running ONNX inference locally eliminates video transmission entirely.</li>
      <li><strong>One-Way Communication is Half a Conversation:</strong> Recognising a deaf person’s signs into Kannada only solves one direction; the hearing person’s Kannada reply must also be translated back into continuous, natural-looking 3D ISL signing.</li>
    </ol>
    <div class="page-footer-arabic">2</div>
  </section>`;

  const page3 = String.raw`
  <section class="report-page body-page" data-page="3">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h1">1.4 Problem Statement</div>
    <p>
      <em>“Given a standard commodity laptop equipped only with an integrated webcam and a CPU, design and implement a privacy-preserving, bidirectional assistive communication system that (i) accurately recognises isolated Indian Sign Language (ISL) signs and closed-set continuous ISL sentences performed by previously unseen signers and translates them into grammatically coherent Kannada text and speech with calibrated uncertainty rejection, (ii) supports instant few-shot personalization for user-specific custom signs, and (iii) converts Kannada text into continuous, co-articulated ISL signing rendered on an expressive 3D avatar retargeted from authentic ISL dataset recordings, while enforcing a statistical model-governance gate that prevents accuracy regressions.”</em>
    </p>

    <div class="sec-h1">1.5 Aim and Objectives</div>
    <p>
      The overarching aim of this project is to build, benchmark, and validate a production-grade, signer-independent ISL–Kannada bidirectional communication platform running entirely on commodity hardware. To achieve this aim, eight specific, measurable technical objectives were established:
    </p>
    <ol>
      <li><strong>Objective 1 — Privacy-First Landmark Feature Engineering:</strong> Design a 147-dimensional per-frame feature representation (<code>hands-face-v2</code>) extracted locally in the browser via MediaPipe Hand and Face Landmarkers, capturing wrist-centered palm-normalized hand shape, image position, face-relative location, orthonormal palm orientation, and visibility flags without ever transmitting camera video frames.</li>
      <li><strong>Objective 2 — Signer-Independent Isolated Sign Recognition:</strong> Train and evaluate a Bidirectional GRU (BiGRU) sequence classifier augmented with 3-view Test-Time Augmentation (TTA), face-occlusion landmark imputation, and selective HTTP-range expansion from the INCLUDE corpus to exceed $75\%$ top-1 accuracy on completely unseen signers.</li>
      <li><strong>Objective 3 — Calibrated Uncertainty &amp; Non-Sign Rejection:</strong> Implement out-of-fold validation threshold calibration ($\tau^*$) so low-confidence or out-of-distribution movements are flagged as <em>uncertain</em> with top-$k$ alternatives rather than silently corrupting the Kannada transcript.</li>
      <li><strong>Objective 4 — Continuous ISL Sentence Decoding:</strong> Develop a fused sequence decoder combining a two-layer BiGRU trained with Connectionist Temporal Classification (CTC) and a sentence-level classifier over the 101-sentence ISL-CSLTR corpus, evaluated on unseen recording rounds.</li>
      <li><strong>Objective 5 — Multi-Tier Kannada SOV Meaning &amp; Speech Synthesis:</strong> Build a linguistic translation layer combining a 187-entry phrase dictionary, deterministic SOV constituent reordering with Kannada case postpositions, facial non-manual grammar modulation, and native Kannada (<code>kn-IN</code>) speech synthesis.</li>
      <li><strong>Objective 6 — Expressive 3D Pixar-Style Avatar with Continuous IK Signing:</strong> Construct a procedural Three.js 3D character rig with analytic two-bone inverse kinematics, Gaussian-smoothed dataset-retargeted clips, ballistic co-articulation transitions, and Kannada phonetic viseme lip-mouthing that eliminates mid-sign arm drops.</li>
      <li><strong>Objective 7 — Zero-Backend In-Browser ONNX &amp; Few-Shot Custom Signs:</strong> Export the trained BiGRU ensemble to ONNX for 100% client-side WebAssembly inference and enable instant few-shot custom sign registration using block-balanced cosine similarity.</li>
      <li><strong>Objective 8 — Statistical Model Governance &amp; Promotion Gating:</strong> Enforce a pre-registered promotion gate using exact paired McNemar tests on identical held-out videos with one-click version rollback.</li>
    </ol>
    <div class="page-footer-arabic">3</div>
  </section>`;

  const page4 = String.raw`
  <section class="report-page body-page" data-page="4">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h1">1.6 Scope of the Project</div>
    <p>
      The functional and technical scope of <strong>Silent Bridge</strong> encompasses the complete lifecycle of bidirectional ISL–Kannada communication, dataset curation, model training, evaluation governance, and edge deployment:
    </p>
    <ul>
      <li><strong>Authentic ISL Vocabulary &amp; Corpora:</strong> The system operates exclusively on authentic Indian Sign Language recordings sourced from three peer-reviewed CC BY 4.0 datasets: <em>Amrita SLR</em> (933 validated videos across 49 signs and 7 signer groups), <em>INCLUDE</em> (816 validated videos across 42 core classes, plus 1,430 selectively downloaded videos covering 144 total vocabulary classes), and <em>ISL-CSLTR</em> (492 validated sentence videos across 101 sentences and 168 glosses).</li>
      <li><strong>Bidirectional Translation &amp; Multimodal Output:</strong> Forward translation supports isolated sign streams (with motion-based segmentation, still-tail trimming, and motion-minimum dip splitting) and closed-set continuous sentences, producing Unicode NFC Kannada text, English glosses, and spoken Kannada audio. Reverse translation converts arbitrary Kannada text into a planned sequence of ISL glosses animated continuously on a 3D avatar across 161 supported vocabulary clips.</li>
      <li><strong>Dual Runtime Execution Modes:</strong> Users can run inference either via the full-featured WebSocket backend (supporting live diagnostics, dataset recording, and model training) or via the <strong>100% In-Browser ONNX WebAssembly Engine</strong>, which executes the 3,668-dimensional BiGRU model directly in the browser with zero server dependency.</li>
      <li><strong>Few-Shot Personalization Studio:</strong> A dedicated <em>Custom Signs</em> studio allows users to record 3 to 5 webcam samples of any new regional or personal sign, compute a 3,668-D outlier-resistant prototype centroid in browser storage, and immediately recognise the custom sign alongside the base vocabulary.</li>
    </ul>

    <div class="sec-h1">1.7 Significance and Expected Contribution</div>
    <p>
      This project makes seven concrete engineering and scientific contributions to assistive computing for Indian languages:
    </p>
    <ol>
      <li><strong>End-to-End Bidirectional ISL–Kannada Pipeline:</strong> Bridges visual-spatial ISL and Dravidian Kannada across word, phrase, and sentence levels in both directions within a single offline-capable web application.</li>
      <li><strong>Selective HTTP-Range Dataset Expansion Algorithm:</strong> Introduces a CRC-32-verified HTTP range downloader that extracts only vocabulary-matching videos from 56.8 GB of remote INCLUDE ZIP archives (downloading 5.96 GB instead of 44.7 GB), boosting unseen-signer accuracy by $+9.4$ percentage points ($p = 0.003$).</li>
      <li><strong>3-View Test-Time Augmentation &amp; Face-Occlusion Resilience:</strong> Combines full-segment, 3-tap zero-phase denoised, and 84% core-stroke views with EMA face-anchor tracking and median face-relative coordinate imputation to maintain high accuracy during hand-over-face signs.</li>
      <li><strong>Fused BiGRU-CTC and Sentence Classifier Decoder:</strong> Achieves $29.2\%$ exact-sentence accuracy on unseen recording rounds of the 101-sentence ISL-CSLTR benchmark ($\approx 29\times$ random chance), outperforming standalone CTC ($22.1\%$) and standalone classification ($20.1\%$).</li>
      <li><strong>Artifact-Free 3D Avatar Retargeting &amp; Procedural Character Rig:</strong> Cleans raw dataset landmarks via gap interpolation and $\sigma=1.5$ Gaussian smoothing—eliminating all 367 mid-sign arm drops across 144 clips and reducing wrist acceleration jitter by $36\%$—and renders them on a Pixar-inspired 3D character with analytic 2-bone IK and Kannada phonetic viseme mouthing.</li>
      <li><strong>Pre-Registered Promotion Gate &amp; Negative Result Transparency:</strong> Demonstrates rigorous ML governance by automatically rejecting two candidate models (including an uncurated 144-class expansion that diluted unseen-signer accuracy from $76.5\%$ to $70.9\%$).</li>
      <li><strong>Six-Stage Live Pipeline Diagnostics &amp; Error Attribution:</strong> Provides real-time introspection into camera FPS, landmark presence, feature parity, segmentation boundaries, confidence calibration, and translation rules.</li>
    </ol>
    <div class="page-footer-arabic">4</div>
  </section>`;

  const page5 = String.raw`
  <section class="report-page body-page" data-page="5">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h1">1.8 Industry and Societal Relevance</div>
    <p>
      The enactment of India’s <em>Rights of Persons with Disabilities (RPwD) Act, 2016</em> and the <em>Accessible India Campaign (Sugamya Bharat Abhiyan)</em> mandates accessible digital and physical public services across government offices, healthcare centers, banks, courts, and educational institutions. However, deploying human ISL interpreters at every primary health center (PHC), citizen service kiosk (<em>Bangalore One / Karnataka One</em>), railway helpdesk, or rural bank branch across Karnataka’s 31 districts is economically and logistically impossible.
    </p>
    <p>
      Because <strong>Silent Bridge</strong> runs on any standard ₹30,000–₹45,000 CPU laptop or tablet with a built-in webcam and requires no external depth cameras (such as Kinect or Leap Motion), no specialized data gloves, and no recurring cloud GPU servers, it can be deployed immediately at public service counters, special education classrooms, and corporate HR onboarding desks. For the Computer Science and Business Systems (CSBS) discipline, the project exemplifies how data-centric AI, edge WebAssembly optimization, and human-centric UX design can deliver high social utility at near-zero marginal operating cost.
    </p>

    <div class="sec-h1">1.9 Sustainable Development Goals (SDGs) Addressed</div>
    <p>
      The design, deployment model, and measurable outcomes of <strong>Silent Bridge</strong> directly advance the United Nations 2030 Agenda for Sustainable Development.
    </p>

    <div class="sec-h2">1.9.1 Identification of Relevant SDGs</div>
    <p>
      Five core United Nations Sustainable Development Goals are directly addressed by this project:
    </p>
    <ul>
      <li><strong>SDG 3 — Good Health and Well-Being:</strong> Enabling deaf patients to describe symptoms (<em>pain, fever, doctor, medicine, hospital, emergency</em>) and understand medical instructions in Kannada without third-party privacy breaches.</li>
      <li><strong>SDG 4 — Quality Education:</strong> Supporting inclusive bilingual ISL–Kannada literacy for deaf students and special educators through interactive Sign Reference videos, 3D avatar playback, and self-paced practice.</li>
      <li><strong>SDG 8 — Decent Work and Economic Growth:</strong> Facilitating workplace communication between deaf employees and Kannada-speaking colleagues or customers in retail, banking, and IT-enabled services.</li>
      <li><strong>SDG 9 — Industry, Innovation and Infrastructure:</strong> Engineering resilient, offline-first edge AI infrastructure (WebAssembly ONNX + MediaPipe) that operates without broadband or cloud GPUs.</li>
      <li><strong>SDG 10 — Reduced Inequalities:</strong> Eliminating linguistic marginalization of the deaf community in regional-language civic, legal, and financial interactions.</li>
    </ul>

    <div class="sec-h2">1.9.2 Selected SDG Targets</div>
    <ul>
      <li><strong>Target 3.8:</strong> Achieve universal health coverage, including access to quality essential health-care services for persons with disabilities.</li>
      <li><strong>Target 4.5 &amp; Target 4.a:</strong> Eliminate disparities in education and ensure equal access to all levels of education and vocational training for persons with disabilities; build disability-sensitive learning environments.</li>
      <li><strong>Target 8.5:</strong> Achieve full and productive employment and decent work for all women and men, including persons with disabilities, and equal pay for work of equal value.</li>
      <li><strong>Target 9.c:</strong> Significantly increase access to information and communications technology and strive to provide universal and affordable access.</li>
      <li><strong>Target 10.2:</strong> Empower and promote the social, economic, and political inclusion of all, irrespective of age, sex, disability, race, ethnicity, origin, religion, or economic status.</li>
    </ul>
    <div class="page-footer-arabic">5</div>
  </section>`;

  const page6 = String.raw`
  <section class="report-page body-page" data-page="6">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h2">1.9.3 Alignment of Project Objectives with SDGs</div>
    <p>
      Table 1.1 maps each core engineering objective of <strong>Silent Bridge</strong> to the corresponding UN Sustainable Development Goal, specific target, technical mechanism implemented in the codebase, and verifiable impact indicator.
    </p>

    <div class="table-caption">Table 1.1 Alignment of Silent Bridge Project Objectives with UN SDG Targets</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:14%;">UN SDG</th>
          <th style="width:12%;">Target ID</th>
          <th style="width:26%;">Project Objective</th>
          <th style="width:28%;">Implemented Technical Mechanism</th>
          <th style="width:20%;">Verifiable Outcome</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>SDG 3</strong><br/>Good Health</td>
          <td>Target 3.8</td>
          <td>Objective 1 &amp; 3: Privacy-first healthcare symptom &amp; triage communication</td>
          <td>In-browser MediaPipe extraction; zero video upload; medical signs (<em>doctor, hospital, sick, medicine, pain, help</em>)</td>
          <td>$0\text{ bytes}$ raw video sent; calibrated uncertainty gate ($\tau^* = 0.50$)</td>
        </tr>
        <tr>
          <td><strong>SDG 4</strong><br/>Quality Education</td>
          <td>Target 4.5,<br/>Target 4.a</td>
          <td>Objective 5 &amp; 6: Bilingual ISL–Kannada learning &amp; 3D Avatar visualization</td>
          <td>161 cleaned 3D avatar clips + Sign Reference video browser + Kannada phonetic viseme mouthing</td>
          <td>$100\%$ elimination of mid-sign arm drops ($367 \rightarrow 0$); $36\%$ lower jitter</td>
        </tr>
        <tr>
          <td><strong>SDG 8</strong><br/>Decent Work</td>
          <td>Target 8.5</td>
          <td>Objective 2 &amp; 7: Workplace &amp; custom domain sign personalization</td>
          <td>Few-shot Custom Signs studio using 3,668-D block-balanced cosine similarity &amp; outlier filtering</td>
          <td>Instant adaptation from $3\text{–}5$ user samples without GPU retraining</td>
        </tr>
        <tr>
          <td><strong>SDG 9</strong><br/>Innovation &amp; Infra.</td>
          <td>Target 9.c</td>
          <td>Objective 7 &amp; 8: Commodity CPU &amp; offline PWA edge deployment</td>
          <td><code>onnxruntime-web</code> WASM engine + Service Worker caching + selective HTTP Range dataset loader</td>
          <td>$3.8\text{ ms}$ sign inference on laptop CPU; $86.7\%$ bandwidth saved ($5.96\text{ GB}$ vs $44.7\text{ GB}$)</td>
        </tr>
        <tr>
          <td><strong>SDG 10</strong><br/>Reduced Inequalities</td>
          <td>Target 10.2</td>
          <td>Objective 2, 4 &amp; 5: Signer-independent ISL to Kannada text &amp; speech</td>
          <td>BiGRU + 3-view TTA + Fused CTC decoder + 187-phrase SOV Kannada grammar &amp; <code>kn-IN</code> TTS</td>
          <td>$76.5\%$ unseen-signer accuracy ($p=0.003$); $81.5\%$ overall across 314 test videos</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-h2">1.9.4 Expected Social, Economic and Environmental Impact</div>
    <ul>
      <li><strong>Social Impact:</strong> Enables deaf citizens in Karnataka to independently conduct two-way conversations in Kannada at hospitals, banks, classrooms, and government counters without third-party human interpreters, maintaining conversational privacy.</li>
      <li><strong>Economic Impact:</strong> Eliminates the ₹1,500–₹3,000 per hour cost of on-site human interpretation for routine front-desk interactions and removes the $₹15,000+\text{/month}$ cloud GPU hosting cost required by video-based deep learning models.</li>
      <li><strong>Environmental Impact (Green AI):</strong> Running compact landmark-based BiGRU models ($3.8\text{ ms}$ per sign on a $15\text{ W}$ laptop CPU) instead of continuous 3D-CNN/Video-Transformer inference on $300\text{ W}$ data-center GPUs reduces per-session energy consumption and carbon footprint by over $95\%$. Similarly, selective HTTP Range archive downloading saved $68.8\text{ GB}$ of redundant network transfer during dataset preparation.</li>
    </ul>
    <div class="page-footer-arabic">6</div>
  </section>`;

  const page7 = String.raw`
  <section class="report-page body-page" data-page="7">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h1">1.10 Constraints and Limitations</div>
    <p>
      In accordance with rigorous engineering practice, the design and evaluation of <strong>Silent Bridge</strong> explicitly account for six practical constraints and operational boundaries:
    </p>
    <ol>
      <li><strong>Authentic Public Dataset Scarcity and Signer Diversity:</strong> Unlike American Sign Language benchmarks that contain tens of thousands of clips across hundreds of signers, publicly licensed ISL datasets with verified class labels contain roughly $17$ to $45$ valid recordings per sign across $7$ to $12$ signers. Furthermore, Amrita SLR was recorded in Kerala and INCLUDE in Chennai; regional lexical variations signed in parts of Karnataka may differ from the training corpus unless adapted via the Few-Shot Custom Signs module or the Sign Reference guide.</li>
      <li><strong>Commodity CPU &amp; Browser Memory Envelope:</strong> Both training and live inference were constrained to run on a standard CPU-only laptop without discrete NVIDIA CUDA GPUs. Consequently, massive vision backbones (such as I3D, VideoMAE, or SlowFast) were ruled out in favor of compact, mathematically structured 147-D landmark representations and Bidirectional GRUs.</li>
      <li><strong>Monocular 2D-to-3D Depth Estimation in Avatar Retargeting:</strong> Dataset videos are recorded with single RGB cameras without depth sensors or motion-capture suits. While MediaPipe provides relative hand depth and our retargeting pipeline estimates distance from apparent palm scale ($s_{\text{palm}}$) and solves elbow posture via analytic two-bone inverse kinematics, the resulting 3D trajectories remain approximations of full upper-body motion capture and are transparently badged as <em>dataset-derived unverified clips</em> until reviewed by native ISL signers.</li>
      <li><strong>Closed-Set Continuous Sentence Decoding:</strong> The continuous sentence recognition pipeline (fusing BiGRU-CTC with a sentence classifier) is trained on the 101 sentences of the ISL-CSLTR corpus. While highly effective for those 101 conversational sentences ($29.2\%$ exact match on unseen rounds), open-vocabulary continuous sign translation requires orders-of-magnitude larger gloss-annotated parallel corpora.</li>
      <li><strong>Continuous Signing Without Hand Lowering:</strong> In isolated-sign stream mode, boundaries are detected via motion stillness ($280\text{ ms}$), hand drop, or motion-minimum dips. When a signer performs rapid back-to-back signs without pausing or lowering the hands, consecutive signs can merge into a single segment (increasing Sign Error Rate).</li>
      <li><strong>Camera Framing and Face Visibility Requirement:</strong> Because face-relative hand coordinates (<code>FACEREL_OFFSET</code>) carry critical discriminative power for signs performed near the head, hiding the signer’s face degrades accuracy from $66.8\%$ to $47.8\%$ in perturbation tests. Although our <code>FaceTracker</code> EMA and median imputation recover brief 1–45 frame hand-over-face occlusions, the user must initially frame both their upper torso and face within the webcam viewport.</li>
    </ol>
    <div class="page-footer-arabic">7</div>
  </section>`;

  const page8 = String.raw`
  <section class="report-page body-page" data-page="8">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 1: Introduction</span>
    </div>

    <div class="sec-h1">1.11 Organization of the Report</div>
    <p>
      This B.E. Project Report is structured into eight comprehensive chapters, followed by serially numbered References, Publication documentation, and Technical Appendices, strictly adhering to the formatting and structural guidelines prescribed by the Department of Computer Science and Business Systems, B.M.S. College of Engineering:
    </p>

    <div class="table-caption">Table 1.2 Chapter-Wise Structural Summary of the B.E. Project Report</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:16%;">Chapter</th>
          <th style="width:32%;">Title</th>
          <th style="width:40%;">Core Technical &amp; Analytical Scope</th>
          <th style="width:12%;">Pages</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Chapter 1</strong></td>
          <td>Introduction</td>
          <td>Background, ISL &amp; Kannada domain overview, motivation, problem statement, 8 objectives, scope, contributions, UN SDGs 3/4/8/9/10 alignment, and constraints.</td>
          <td>1–8</td>
        </tr>
        <tr>
          <td><strong>Chapter 2</strong></td>
          <td>Literature Review and Related Work</td>
          <td>Critical survey of 22 peer-reviewed studies across SLR datasets, pose vs. pixel models, CTC/SLT, signing avatars, comparative tables, and 7 research gaps.</td>
          <td>9–16</td>
        </tr>
        <tr>
          <td><strong>Chapter 3</strong></td>
          <td>Requirements Analysis and Project Planning</td>
          <td>Stakeholder analysis, 18 functional &amp; 12 non-functional requirements, hardware/software specs, technical/economic/operational feasibility, 11-phase Gantt plan, FMEA risk matrix, and DPDP privacy compliance.</td>
          <td>17–24</td>
        </tr>
        <tr>
          <td><strong>Chapter 4</strong></td>
          <td>Business Model and Sustainability Framework</td>
          <td>Target segments (B2G, B2B, B2C), value proposition, 9-block Business Model Canvas, TAM/SAM/SOM sizing, cost-benefit analysis, pricing tiers, 3-year financial projections, and SDG KPIs.</td>
          <td>25–31</td>
        </tr>
        <tr>
          <td><strong>Chapter 5</strong></td>
          <td>System Design and Methodology</td>
          <td>Dual-engine architecture, 8 module specifications, 147-D <code>hands-face-v2</code> schema, Level-0/1 DFDs, UML/ER diagrams, 22 numbered equations, and 7 formal algorithms (BiGRU, 3-View TTA, CTC fusion, 2-bone IK, viseme lip-sync).</td>
          <td>32–42</td>
        </tr>
        <tr>
          <td><strong>Chapter 6</strong></td>
          <td>Implementation and Integration</td>
          <td>Production stack, code walkthroughs of feature extraction, in-browser ONNX engine, custom sign prototypes, SOV Kannada translator, 3D Pixar-style avatar rig, 28 REST/WS APIs, and 7 engineering challenges solved.</td>
          <td>43–51</td>
        </tr>
        <tr>
          <td><strong>Chapter 7</strong></td>
          <td>Testing, Results and Discussion</td>
          <td>208 automated tests (160 pytest + 48 node:test), 24 formal test cases, feature parity, CPU latency, held-out unseen-signer benchmarks ($79.9\%/81.5\%, p=0.003$), calibration, robustness, negative results, and SDG impact verification.</td>
          <td>52–60</td>
        </tr>
        <tr>
          <td><strong>Chapter 8</strong></td>
          <td>Conclusion and Future Enhancements</td>
          <td>Executive synthesis, conclusions, objective verification, key technical/business contributions, and 6 future research directions.</td>
          <td>61–63</td>
        </tr>
        <tr>
          <td><strong>Back Matter</strong></td>
          <td>References, Publications &amp; Appendix A</td>
          <td>25 serial IEEE/CSBS references, IEEE conference paper record, and complete 144-class ISL–Kannada vocabulary table.</td>
          <td>64–66</td>
        </tr>
      </tbody>
    </table>
    <p>
      Together with the preliminary pages, this report documents the complete requirements, system architecture, implementation details, empirical test results, and deployment framework.
    </p>
    <div class="page-footer-arabic">8</div>
  </section>`;

  // ==================== CHAPTER 2: LITERATURE REVIEW (Pages 9 to 16) ====================
  const page9 = String.raw`
  <section class="report-page body-page" data-page="9">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>
    <div class="chapter-num-header">CHAPTER 2</div>
    <div class="chapter-title-center">LITERATURE REVIEW AND RELATED WORK</div>

    <div class="sec-h1">2.1 Introduction</div>
    <p>
      Automatic Sign Language Recognition (SLR), Sign Language Translation (SLT), and 3D Signing Avatar synthesis have evolved rapidly over the past decade, transitioning from sensor-instrumented data gloves and hidden Markov models to deep spatio-temporal networks operating on monocular video and skeletal pose landmarks. However, a critical examination of the literature reveals a sharp disparity between resource-rich Western sign languages (such as American Sign Language and German Sign Language) and Indian Sign Language (ISL)—and an even wider chasm when regional Indian languages such as Kannada are required as the target communication medium.
    </p>
    <p>
      This chapter presents a systematic review of twenty-two foundational and state-of-the-art research studies organized across four thematic pillars: (i) <em>Benchmark Sign Language Datasets and Split Protocols</em>, (ii) <em>Appearance-Based versus Pose-Landmark Feature Extraction</em>, (iii) <em>Isolated and Continuous Sequence Modeling with Neural Translation</em>, and (iv) <em>3D Signing Avatars, Linguistic Notation, and Statistical Evaluation Governance</em>. Section 2.3 synthesizes these studies into comparative matrices, and Section 2.4 formalizes the seven research and application gaps addressed by <strong>Silent Bridge</strong>.
    </p>

    <div class="sec-h1">2.2 Review of Existing Systems / Research Studies</div>
    <div class="sec-h2">2.2.1 Global and Indian Sign Language Datasets</div>
    <p>
      <strong>1. Word-Level American Sign Language Benchmarks — Li et al. (WLASL, WACV 2020) [1] and Vaezi Joze &amp; Koller (MS-ASL, BMVC 2019) [2]:</strong> Li et al. [1] introduced WLASL, a large-scale isolated ASL dataset comprising $21,083$ videos across $2,000$ glosses performed by $119$ signers, comparing 2D/3D convolutional networks (I3D) and pose-based recurrent networks. Similarly, Vaezi Joze and Koller [2] curated MS-ASL with over $25,000$ annotated videos across $1,000$ signs from $222$ signers, emphasizing signer-independent generalization under uncontrolled lighting and background variation. Both works demonstrated that pose-based and 3D-CNN models suffer substantial accuracy drops when evaluated on unseen signers compared to signer-overlapping splits, establishing signer-independent evaluation as a mandatory standard.
    </p>
    <p>
      <strong>2. Continuous German Sign Language — Koller, Forster &amp; Ney (RWTH-PHOENIX-Weather, CVIU 2015) [3]:</strong> Koller et al. [3] established the benchmark for continuous sign language recognition (CSLR) using weather forecast broadcasts in German Sign Language (DGS) with frame-level and gloss-level annotations across multiple signers. While RWTH-PHOENIX catalyzed deep CTC research, its domain is restricted to weather broadcasts in DGS and relies on studio-grade broadcast video.
    </p>
    <p>
      <strong>3. Indian Sign Language Isolated &amp; Sentence Corpora — Sridhar et al. (INCLUDE, ACM MM 2020) [5], Elakkiya &amp; Natarajan (ISL-CSLTR, 2021) [6], and Sasidharan et al. (Amrita SLR, 2025) [7]:</strong> For authentic ISL, Sridhar et al. [5] released INCLUDE, containing $4,287$ HD videos across $263$ isolated ISL word classes across $15$ semantic categories recorded with $7$ deaf students in Chennai. However, INCLUDE’s official train/test split reuses the same signers across training and testing, and its raw distribution totals $56.8\text{ GB}$ of multi-gigabyte ZIP archives. Elakkiya and Natarajan [6] published ISL-CSLTR, providing sentence-level ISL videos across $101$ daily-life sentences and $168$ glosses, though our forensic MD5 audit (Chapter 7) uncovered unlisted files and duplicate recordings with conflicting labels. Sasidharan et al. [7] contributed the Amrita SLR dataset with $933$ isolated ISL recordings across $49$ signs from $7$ distinct signer groups, providing an ideal testbed for true unseen-signer evaluation.
    </p>
    <div class="page-footer-arabic">9</div>
  </section>`;

  const page10 = String.raw`
  <section class="report-page body-page" data-page="10">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>
    <p>
      <strong>4. Large-Scale Sentence Corpora Without Gloss Alignment — Joshi et al. (ISLTranslate, ACL 2023 [8]; iSign, ACL 2024 [9]):</strong> Joshi et al. [8], [9] introduced ISLTranslate and the iSign benchmark containing sentence-level ISL videos paired with English translations. While valuable for large-scale end-to-end video-to-English research on GPU clusters, these corpora lack intermediate ISL gloss boundary annotations and Kannada target translations, making them unsuitable for lightweight, interpretable gloss-to-Kannada edge pipelines.
    </p>

    <div class="sec-h2">2.2.2 Appearance-Based versus Pose-Landmark Recognition</div>
    <p>
      <strong>5. 3D Spatio-Temporal ConvNets — Carreira &amp; Zisserman (Two-Stream I3D, CVPR 2017) [10]:</strong> Carreira and Zisserman [10] proposed Inflated 3D ConvNets (I3D) pre-trained on Kinetics. Although I3D achieves strong accuracy on large-scale video benchmarks, it processes dense RGB/optical-flow tensors requiring billions of FLOPs per second, making real-time CPU inference impossible and susceptibility to background/clothing overfitting high on small ISL datasets ($15\text{–}40$ videos per sign).
    </p>
    <p>
      <strong>6. Multi-Person 2D Pose and On-Device Hand Tracking — Cao et al. (OpenPose, IEEE TPAMI 2021) [11], Lugaresi et al. (MediaPipe, 2019) [12], and Zhang et al. (MediaPipe Hands, 2020) [13]:</strong> Cao et al. [11] pioneered Part Affinity Fields in OpenPose for full-body and 21-keypoint hand estimation, but OpenPose still requires desktop GPUs for real-time frame rates. Lugaresi et al. [12] and Zhang et al. [13] solved the edge inference bottleneck with MediaPipe Hands, combining a lightweight palm detector (BlazePalm) with a 21-point 3D hand-landmark regression network capable of running at $30+\text{ FPS}$ in WebAssembly on a laptop CPU. By reducing a $640 \times 480 \times 3$ video frame ($921,600$ bytes) to compact 3D anatomical coordinates, MediaPipe achieves invariance to signer clothing, skin tone, and room background while keeping camera video strictly inside the browser.
    </p>
    <p>
      <strong>7. Skeleton-Aware and Self-Supervised Hand Representations — Jiang et al. (SAM-SLR, CVPRW 2021) [14] and Hu et al. (SignBERT, ICCV 2021) [15]:</strong> Jiang et al. [14] demonstrated that decoupling skeletal hand-shape, body-relative trajectory, and orientation features substantially outperforms naive concatenation of raw image coordinates. Hu et al. [15] introduced SignBERT, pre-training a self-supervised transformer over masked hand-pose tokens to model anatomical constraints. Inspired by these findings, <strong>Silent Bridge</strong> engineers an explicit 147-dimensional geometric feature vector (<code>hands-face-v2</code>) that decomposes each hand into 60 palm-scaled wrist-relative shape coordinates, 3 image coordinates, 3 face-relative coordinates, 6 orthonormal palm-orientation components, and explicit presence flags, paired with a 3-tap temporal denoiser and median face-occlusion imputation.
    </p>
    <div class="page-footer-arabic">10</div>
  </section>`;

  const page11 = String.raw`
  <section class="report-page body-page" data-page="11">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="sec-h2">2.2.3 Temporal Sequence Modeling, Continuous CTC Decoding, and Neural Translation</div>
    <p>
      <strong>8. Bidirectional Recurrent Sequence Models — Cho et al. (GRU, EMNLP 2014) [16] and Schuster &amp; Paliwal (BiRNN, IEEE TSP 1997) [17]:</strong> Cho et al. [16] introduced Gated Recurrent Units (GRUs) with reset and update gates that mitigate vanishing gradients while requiring $25\%$ fewer parameters than LSTMs, and Schuster and Paliwal [17] proved that processing temporal sequences in both forward and backward directions captures full context across gesture preparation, stroke, and retraction phases. In low-resource regimes ($1,749$ training videos across $64$ classes), a two-direction BiGRU with temporal mean+max pooling and global velocity concatenation generalizes significantly better to unseen signers than over-parameterized transformers while executing in $3.8\text{ ms}$ on a single CPU thread.
    </p>
    <p>
      <strong>9. Connectionist Temporal Classification — Graves et al. (CTC, ICML 2006) [18]:</strong> Graves et al. [18] formulated CTC, enabling recurrent networks to map unsegmented frame sequences $\mathbf{X} = (\mathbf{x}_1, \dots, \mathbf{x}_T)$ directly to label sequences $g = (g_1, \dots, g_L)$ ($L \le T$) by marginalizing over all valid monotonic frame-to-gloss alignments augmented with a blank token $\epsilon$. While greedy CTC decoding is fast ($12.3\text{ ms}$), it makes conditionally independent frame decisions and can emit ungrammatical gloss combinations when training sentences are scarce ($265$ training videos in ISL-CSLTR). Our work overcomes this limitation by mathematically fusing the exact CTC dynamic-programming log-likelihood $\log P_{\text{CTC}}(g_s \mid \mathbf{X})$ with a global sentence-level log-posterior $\lambda \log P_{\text{cls}}(s \mid \mathbf{X})$.
    </p>
    <p>
      <strong>10. Neural Sign Language Translation — Camgöz et al. (CVPR 2018) [4]:</strong> Camgöz et al. [4] framed sign language translation as a neural sequence-to-sequence machine translation task because sign gloss order does not match spoken-language syntax. However, end-to-end neural SLT requires tens of thousands of parallel sentence pairs. For ISL-to-Kannada—where no large gloss-annotated Kannada corpus exists—our hybrid architecture combines neural gloss recognition with a deterministic 187-entry longest-prefix phrase table and a rule-based Dravidian SOV syntactic engine (handling dative/locative suffixes and non-manual interrogative/negative markers), which boosted exact Kannada sentence matches from $39.5\%$ (word-by-word) to $60.5\%$.
    </p>
    <div class="page-footer-arabic">11</div>
  </section>`;

  const page12 = String.raw`
  <section class="report-page body-page" data-page="12">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="sec-h2">2.2.4 Signing Avatars, Linguistic Representation, and Statistical Model Governance</div>
    <p>
      <strong>11. Symbolic Notation vs. Data-Driven Signing Avatars — Hanke (HamNoSys, LREC 2004) [19] and Wolfe et al. (Sign Language Avatars, Information 2022) [20]:</strong> Hanke [19] developed the Hamburg Notation System (HamNoSys) to transcribe manual parameters symbolically for procedural avatar synthesis. However, Wolfe et al. [20] comprehensively reviewed signing avatar perception by deaf communities and highlighted two critical failure modes: (i) rule-invented keyframe animations appear robotic and linguistically unnatural to native signers, and (ii) raw uncleaned landmark retargeting causes jarring anatomical artifacts such as mid-sign arm drops whenever the tracker loses a hand for $2\text{–}5$ frames. Moreover, Wolfe et al. [20] emphasized that non-manual facial cues (eyebrows, eye gaze, and mouthing) are indispensable for intelligibility and user trust.
    </p>
    <p>
      To address both findings from Wolfe et al. [20], <strong>Silent Bridge</strong> derives every avatar sign clip from real ISL dataset recordings (never inventing fake signs), applies a 5-stage motion-cleaning pipeline (presence filtering, $\le 0.4\text{ s}$ gap interpolation, $\sigma=1.5$ Gaussian smoothing, idle trimming, and $15\text{ Hz}$ keyframe resampling) that eliminated all $367$ mid-sign arm drops, connects consecutive sentence signs via $0.2\text{ s}$ ballistic co-articulation arcs, and renders them on an appealing Pixar-inspired 3D character equipped with Kannada phonetic viseme mouthing and dynamic eyebrow grammar markers.
    </p>
    <p>
      <strong>12. Paired Statistical Testing &amp; Linguistic Foundations — McNemar (Psychometrika 1947) [21], Stokoe (1960) [22], and Sridhar (Kannada Grammar, 1990) [23]:</strong> When comparing two classifiers $M_A$ and $M_B$ on the same held-out test set of $N$ videos, McNemar’s test [21] analyzes the $2 \times 2$ contingency table of discordant pairs ($n_{01}$ vs. $n_{10}$) to verify statistical significance. Simultaneously, Stokoe’s structural sign phonology [22] and Sridhar’s descriptive grammar of Kannada SOV case suffixation [23] ground our 147-D feature representation and multi-tier Kannada meaning layer.
    </p>
    <div class="page-footer-arabic">12</div>
  </section>`;

  const page13 = String.raw`
  <section class="report-page body-page" data-page="13">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="sec-h1">2.3 Comparative Analysis of Existing Approaches</div>
    <p>
      Table 2.1 provides a systematic, multi-dimensional comparison of representative published systems and benchmarks against <strong>Silent Bridge</strong> across target sign language, model architecture, evaluation protocol, regional Indian language support, reverse text-to-sign avatar capability, and edge hardware feasibility.
    </p>

    <div class="table-caption">Table 2.1 Comparative Analysis of Existing Sign Language Recognition &amp; Avatar Systems vs. Silent Bridge</div>
    <table class="data-table" style="font-size:9.8pt;">
      <thead>
        <tr>
          <th style="width:17%;">Author / System</th>
          <th style="width:11%;">Sign Lang. &amp; Task</th>
          <th style="width:19%;">Input &amp; Model Architecture</th>
          <th style="width:17%;">Evaluation Protocol &amp; Split</th>
          <th style="width:18%;">Key Limitations / Gaps</th>
          <th style="width:18%;">How Silent Bridge Advances</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Li et al. [1]</strong><br/>WLASL (2020)</td>
          <td>ASL<br/>Isolated (2,000)</td>
          <td>RGB Video I3D &amp; OpenPose + TGCN</td>
          <td>Signer-independent split</td>
          <td>ASL/English only; requires GPU for I3D; no avatar or regional language</td>
          <td>Authentic ISL + Kannada text/speech + CPU BiGRU ($3.8\text{ ms}$)</td>
        </tr>
        <tr>
          <td><strong>Koller et al. [3]</strong><br/>PHOENIX (2015)</td>
          <td>DGS<br/>Continuous</td>
          <td>CNN + HMM / CTC on broadcast video</td>
          <td>Multi-signer weather domain</td>
          <td>German weather domain only; heavy GPU training &amp; inference</td>
          <td>Fused BiGRU-CTC + Sentence Classifier for 101 daily ISL sentences</td>
        </tr>
        <tr>
          <td><strong>Camgöz et al. [4]</strong><br/>Neural SLT (2018)</td>
          <td>DGS<br/>Translation</td>
          <td>2D-CNN + Attention Seq2Seq</td>
          <td>PHOENIX-2014T split</td>
          <td>Needs large parallel corpus; fails on low-resource ISL–Kannada</td>
          <td>Hybrid neural glossing + 187-phrase &amp; rule-based SOV Kannada engine</td>
        </tr>
        <tr>
          <td><strong>Sridhar et al. [5]</strong><br/>INCLUDE (2020)</td>
          <td>ISL<br/>Isolated (263)</td>
          <td>OpenPose + BiLSTM</td>
          <td>Official split (reuses signers across train/test)</td>
          <td>56.8 GB archives; signer overlap inflates test score; English labels only</td>
          <td>HTTP-Range selective download (5.96 GB) + strict unseen-signer split</td>
        </tr>
        <tr>
          <td><strong>Elakkiya et al. [6]</strong><br/>ISL-CSLTR (2021)</td>
          <td>ISL<br/>Sentences (101)</td>
          <td>CNN-LSTM baseline</td>
          <td>Random split across recordings</td>
          <td>Contains 5 MD5 duplicate groups (4 conflicting labels) &amp; 195 unlisted files</td>
          <td>MD5 forensic audit excludes 9 corrupted files; round-independent split</td>
        </tr>
        <tr>
          <td><strong>Sasidharan et al. [7]</strong><br/>Amrita SLR (2025)</td>
          <td>ISL<br/>Isolated (49)</td>
          <td>MediaPipe + Baseline Classifiers</td>
          <td>7 signer groups</td>
          <td>English output only; no continuous sentences or 3D avatar</td>
          <td>76.5% on 213 unseen-signer videos ($p=0.003$) + Kannada + 3D Avatar</td>
        </tr>
        <tr>
          <td><strong>Hu et al. [15]</strong><br/>SignBERT (2021)</td>
          <td>ASL / DGS<br/>Isolated/Cont.</td>
          <td>Self-supervised Hand Transformer</td>
          <td>Benchmark splits</td>
          <td>High compute cost; ignores face-relative hand coordinates</td>
          <td>147-D <code>hands-face-v2</code> with EMA face-occlusion lock &amp; 3-view TTA</td>
        </tr>
        <tr>
          <td><strong>Wolfe et al. [20]</strong><br/>Avatar Survey (2022)</td>
          <td>Multi-SL<br/>3D Avatars</td>
          <td>HamNoSys / Mocap / Keyframe</td>
          <td>Qualitative user perception</td>
          <td>Rule-based avatars look robotic; raw pose retargeting drops arms on tracking loss</td>
          <td>Real ISL retargeting + gap interp + $\sigma=1.5$ smoothing ($0$ arm drops) + Pixar rig</td>
        </tr>
        <tr>
          <td><strong>Silent Bridge</strong><br/>(Proposed, 2026)</td>
          <td><strong>ISL &leftrightarrow; Kannada</strong><br/>Iso + Sent + Avatar</td>
          <td><strong>MediaPipe 147-D + BiGRU 3-View TTA + Fused CTC + WebAssembly ONNX + 2-Bone IK Avatar</strong></td>
          <td><strong>Strict unseen-signer (314) &amp; unseen-round (154) + McNemar gate</strong></td>
          <td><strong>Regional Kerala/Chennai training bias (mitigated via Few-Shot Custom Signs)</strong></td>
          <td><strong>Complete bidirectional ISL &leftrightarrow; Kannada edge platform on CPU</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">13</div>
  </section>`;

  const page14 = String.raw`
  <section class="report-page body-page" data-page="14">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="table-caption">Table 2.2 Feature-Level Architectural Matrix Across Representative SLR &amp; Avatar Frameworks</div>
    <table class="data-table" style="font-size:10pt;">
      <thead>
        <tr>
          <th style="width:28%;">Architectural Capability</th>
          <th style="width:14%; text-align:center;">WLASL / I3D [1, 10]</th>
          <th style="width:14%; text-align:center;">INCLUDE Baseline [5]</th>
          <th style="width:14%; text-align:center;">ISL-CSLTR Baseline [6]</th>
          <th style="width:14%; text-align:center;">HamNoSys Avatar [19]</th>
          <th style="width:16%; text-align:center;">Silent Bridge</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Authentic Indian Sign Language (ISL)</td><td class="c">No (ASL)</td><td class="c">Yes</td><td class="c">Yes</td><td class="c">Partial</td><td class="c"><strong>Yes (3 Corpora)</strong></td></tr>
        <tr><td>Strict Unseen-Signer / Unseen-Round Split</td><td class="c">Yes</td><td class="c">No</td><td class="c">No</td><td class="c">N/A</td><td class="c"><strong>Yes (Verified)</strong></td></tr>
        <tr><td>Kannada SOV Text &amp; Native Speech Output</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c"><strong>Yes (187 Phrases)</strong></td></tr>
        <tr><td>Reverse Text-to-Sign 3D Avatar Synthesis</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">Yes</td><td class="c"><strong>Yes (161 Clips)</strong></td></tr>
        <tr><td>Zero-Video-Upload Browser Privacy</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">N/A</td><td class="c"><strong>Yes (100% Local)</strong></td></tr>
        <tr><td>100% In-Browser WebAssembly ONNX Mode</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c"><strong>Yes (&lt; 5 ms)</strong></td></tr>
        <tr><td>Few-Shot User Custom Sign Registration</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c"><strong>Yes (3–5 Samples)</strong></td></tr>
        <tr><td>Out-of-Fold Calibrated Uncertainty Gate</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">N/A</td><td class="c"><strong>Yes ($\tau^* = 0.50$)</strong></td></tr>
        <tr><td>Paired McNemar Promotion Gate &amp; Rollback</td><td class="c">No</td><td class="c">No</td><td class="c">No</td><td class="c">N/A</td><td class="c"><strong>Yes ($p = 0.003$)</strong></td></tr>
      </tbody>
    </table>

    <div class="figure-box" style="margin-top:10pt;">
      <svg viewBox="0 0 760 190" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #ccc; padding:6px;">
        <rect x="230" y="10" width="300" height="32" rx="4" fill="#1e3a8a" stroke="#1e3a8a"/>
        <text x="380" y="30" text-anchor="middle" font-family="Times New Roman" font-size="12" font-weight="bold" fill="#fff">Sign Language Computing Paradigms</text>

        <line x1="380" y1="42" x2="380" y2="58" stroke="#333" stroke-width="1.4"/>
        <line x1="130" y1="58" x2="630" y2="58" stroke="#333" stroke-width="1.4"/>
        <line x1="130" y1="58" x2="130" y2="74" stroke="#333" stroke-width="1.4"/>
        <line x1="380" y1="58" x2="380" y2="74" stroke="#333" stroke-width="1.4"/>
        <line x1="630" y1="58" x2="630" y2="74" stroke="#333" stroke-width="1.4"/>

        <!-- Branch 1 -->
        <rect x="20" y="74" width="220" height="102" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="1.2"/>
        <text x="130" y="93" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold" fill="#334155">1. Appearance / Pixel Models</text>
        <text x="130" y="111" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• 3D-CNNs (I3D [10]), Video ViTs</text>
        <text x="130" y="126" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• Needs discrete GPUs &amp; &gt;10k videos</text>
        <text x="130" y="141" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• Overfits background &amp; signer clothes</text>
        <text x="130" y="158" text-anchor="middle" font-family="Times New Roman" font-size="9.5" fill="#b91c1c" font-weight="bold">✗ Unsuitable for Privacy/CPU Edge</text>

        <!-- Branch 2 -->
        <rect x="265" y="74" width="230" height="102" rx="4" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.6"/>
        <text x="380" y="93" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold" fill="#1e3a8a">2. Anatomical Pose Sequence Models</text>
        <text x="380" y="111" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• MediaPipe Hands + Face [12, 13]</text>
        <text x="380" y="126" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• 147-D hands-face-v2 + BiGRU [16, 17]</text>
        <text x="380" y="141" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• 3-View TTA + Fused CTC [18] + Prototypes</text>
        <text x="380" y="158" text-anchor="middle" font-family="Times New Roman" font-size="9.5" fill="#15803d" font-weight="bold">✓ Adopted in Forward Pipeline (81.5%)</text>

        <!-- Branch 3 -->
        <rect x="520" y="74" width="220" height="102" rx="4" fill="#fff7ed" stroke="#c2410c" stroke-width="1.6"/>
        <text x="630" y="93" text-anchor="middle" font-family="Times New Roman" font-size="11" font-weight="bold" fill="#9a3412">3. Data-Driven 3D Avatar IK</text>
        <text x="630" y="111" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• Real ISL Recording Retargeting [20]</text>
        <text x="630" y="126" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• Gap Interp + σ=1.5 Smoothing</text>
        <text x="630" y="141" text-anchor="middle" font-family="Times New Roman" font-size="9.5">• 2-Bone IK + Ballistic Arc + Visemes</text>
        <text x="630" y="158" text-anchor="middle" font-family="Times New Roman" font-size="9.5" fill="#15803d" font-weight="bold">✓ Adopted in Reverse Pipeline (0 Drops)</text>
      </svg>
      <div class="figure-caption">Fig. 2.1 Taxonomy of sign language recognition and avatar synthesis approaches and the architectural positioning of Silent Bridge.</div>
    </div>
    <div class="page-footer-arabic">14</div>
  </section>`;

  const page15 = String.raw`
  <section class="report-page body-page" data-page="15">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="sec-h1">2.4 Identified Research / Application Gap</div>
    <p>
      Based on the comprehensive review of existing literature and deployed assistive tools, seven fundamental research and engineering gaps were identified:
    </p>
    <ol>
      <li><strong>Gap 1 — Absence of Bidirectional ISL–Kannada Systems:</strong> Existing Indian Sign Language studies terminate at English gloss labels. None provide a complete bidirectional bridge that converts live ISL into grammatically structured Kannada text and native Kannada speech while simultaneously translating Kannada text back into continuous 3D ISL avatar signing.</li>
      <li><strong>Gap 2 — Signer-Leakage in Evaluation Splits:</strong> Most published ISL papers evaluate models using random $80/20$ splits where recordings of the same individual appear in both training and test sets. Even INCLUDE’s official split reuses signers, creating over-optimistic accuracy figures that fail to reflect generalization to an unseen user in front of a webcam.</li>
      <li><strong>Gap 3 — Hand-Over-Face Occlusion and MediaPipe Slot Flips:</strong> Many high-frequency ISL signs occur directly in front of the mouth, nose, or forehead (e.g., <em>eat, drink, water, mother, father, speak</em>). When the signing hand briefly occludes the face, standard MediaPipe pipelines lose the face bounding box and zero out face-relative coordinates; similarly, 1–2 frame left/right handedness label flips corrupt temporal velocity vectors.</li>
      <li><strong>Gap 4 — Prohibitive Archive Bandwidth and Unaudited Corpus Integrity:</strong> Downloading the entire $56.8\text{ GB}$ of INCLUDE archives is impractical on standard broadband when only vocabulary-matching classes are needed, and raw corpora such as ISL-CSLTR contain unverified duplicate video files with conflicting sentence annotations.</li>
      <li><strong>Gap 5 — Uncalibrated Predictions and Silent Hallucinations:</strong> Standard softmax classifiers always emit a top-1 class even on transitional hand movements or out-of-vocabulary gestures. Without out-of-fold threshold calibration and a pending confirmation UI, false positives rapidly corrupt a user’s live transcript.</li>
      <li><strong>Gap 6 — Mid-Sign Arm Drops in Landmark-Retargeted 3D Avatars:</strong> Directly driving a 3D avatar from raw dataset MediaPipe landmarks causes the avatar’s arm to snap violently to its rest pose and back whenever hand tracking drops for a few frames ($367$ arm drops observed across $114$ raw clips), and lacks facial mouthing and eyebrow grammar.</li>
      <li><strong>Gap 7 — Lack of Regression-Proof Model Governance:</strong> Expanding a neural classifier’s vocabulary or retraining on noisy data can silently degrade accuracy on core everyday signs (as we observed when a 144-class model reduced unseen-signer accuracy from $76.5\%$ to $70.9\%$). Existing academic prototypes lack automated statistical promotion gates and rollback mechanisms.</li>
    </ol>
    <div class="page-footer-arabic">15</div>
  </section>`;

  const page16 = String.raw`
  <section class="report-page body-page" data-page="16">
    <div class="page-running-header">
      <span class="report-project-title">SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR</span>
      <span>Chapter 2: Literature Review and Related Work</span>
    </div>

    <div class="sec-h1">2.5 Summary of the Literature Review</div>
    <p>
      The literature review establishes a clear scientific foundation for the architectural choices made in <strong>Silent Bridge</strong>:
    </p>
    <ul>
      <li>First, on small-to-medium authentic ISL datasets ($1,749$ isolated recordings and $492$ sentence recordings), <strong>pose-based anatomical landmark representations</strong> (MediaPipe Hands + Face [12], [13]) strictly dominate raw pixel 3D-CNNs [10] in CPU inference speed ($3.8\text{ ms}$ vs. $>200\text{ ms}$), background invariance, and user privacy.</li>
      <li>Second, capturing ISL’s five simultaneous phonological parameters requires enriching raw hand landmarks with <strong>palm-normalized wrist-relative geometry, orthonormal palm orientation vectors, and face-relative coordinates</strong> [14], [15], supported by temporal smoothing and occlusion-lock imputation.</li>
      <li>Third, <strong>Bidirectional GRUs</strong> [16], [17] with 3-view Test-Time Augmentation for isolated signs and <strong>fused BiGRU-CTC + sentence classification</strong> [18] for continuous sentences provide strong generalization under strict signer-independent and round-independent splits.</li>
      <li>Fourth, bridging ISL and Kannada requires a dedicated <strong>SOV phrase and morphological grammar layer</strong> rather than naive word-by-word glossing, paired with a <strong>cleaned, real-recording-retargeted 3D Pixar-style avatar</strong> [20] and a <strong>paired McNemar promotion gate</strong> [21] to guarantee non-regression across model iterations.</li>
    </ul>
    <p>
      The next chapter translates these scientific insights and identified gaps into formal stakeholder requirements, functional and non-functional specifications, feasibility analyses, project scheduling, and risk management plans.
    </p>
    <div class="page-footer-arabic">16</div>
  </section>`;

  return [
    page1,
    page2,
    page3,
    page4,
    page5,
    page6,
    page7,
    page8,
    page9,
    page10,
    page11,
    page12,
    page13,
    page14,
    page15,
    page16,
  ].join("\n");
}
