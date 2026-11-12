import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const TITLE =
  "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

function buildIeeePages() {
  // ============================================================================
  // PAGE 1: Title, 4-Author IEEE Block, Abstract, Index Terms, Sec I (Intro) & Sec II-A
  // ============================================================================
  const page1 = String.raw`
  <section class="ieee-page" data-page="1">
    <div class="ieee-top-banner">
      <span>B.M.S. COLLEGE OF ENGINEERING · DEPARTMENT OF COMPUTER SCIENCE AND BUSINESS SYSTEMS (CSBS)</span>
      <span>IEEE TWO-COLUMN RESEARCH MANUSCRIPT</span>
    </div>

    <div class="ieee-title-area">
      <h1 class="ieee-paper-title report-project-title">${TITLE}</h1>

      <div class="ieee-authors-grid">
        <div class="ieee-author-card">
          <div class="ieee-author-name">H S Thanush</div>
          <div class="ieee-author-affil">Dept. of Computer Science &amp; Business Systems</div>
          <div class="ieee-author-affil">B.M.S. College of Engineering</div>
          <div class="ieee-author-affil">Bangalore – 560019, India</div>
          <div class="ieee-author-id">USN: 1BM23CB066</div>
        </div>
        <div class="ieee-author-card">
          <div class="ieee-author-name">Kiran M K</div>
          <div class="ieee-author-affil">Dept. of Computer Science &amp; Business Systems</div>
          <div class="ieee-author-affil">B.M.S. College of Engineering</div>
          <div class="ieee-author-affil">Bangalore – 560019, India</div>
          <div class="ieee-author-id">USN: 1BM23CB068</div>
        </div>
        <div class="ieee-author-card">
          <div class="ieee-author-name">Manoj G U</div>
          <div class="ieee-author-affil">Dept. of Computer Science &amp; Business Systems</div>
          <div class="ieee-author-affil">B.M.S. College of Engineering</div>
          <div class="ieee-author-affil">Bangalore – 560019, India</div>
          <div class="ieee-author-id">USN: 1BM24CB401</div>
        </div>
        <div class="ieee-author-card">
          <div class="ieee-author-name">Tejaswini K</div>
          <div class="ieee-author-affil">Assistant Professor &amp; Project Guide</div>
          <div class="ieee-author-affil">Dept. of Computer Science &amp; Business Systems</div>
          <div class="ieee-author-affil">B.M.S. College of Engineering</div>
          <div class="ieee-author-id">Bangalore – 560019, India</div>
        </div>
      </div>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <p class="ieee-abstract">
          <strong><em>Abstract</em>: Deaf and hard-of-hearing citizens in Karnataka communicate primarily through Indian Sign Language (ISL), a complete visual-spatial natural language, whereas public service counters, hospitals, banks, and schools operate in spoken and written Kannada. Almost no assistive software bridges ISL and Kannada bidirectionally on commodity hardware without privacy-invasive video uploads. This paper presents <em>Silent Bridge</em>, a real-time, privacy-preserving edge-AI assistive platform that (i) recognizes isolated ISL signs and continuous ISL sentences from a standard webcam and outputs grammatical Kannada text and speech, (ii) supports user-extensible few-shot custom sign enrollment in the browser via ONNX WebAssembly, and (iii) translates Kannada text into continuous ISL signing on a procedural 3D avatar. Hand and facial landmarks (147-D schema <code>hands-face-v2</code>) are extracted entirely in the browser via MediaPipe Tasks (v0.10.21) so raw camera frames never leave the client device. Trained exclusively on checksum-verified public ISL corpora (Amrita SLR, INCLUDE, and ISL-CSLTR) and evaluated strictly on unseen signers and unseen recording rounds, a Bidirectional GRU with 3-view Test-Time Augmentation (TTA) and selective HTTP-range INCLUDE expansion improved isolated-sign accuracy on 268 identical held-out videos from 59.7% (logistic regression baseline) to 79.9% (81.5% across all 314 held-out test videos, macro-F1 0.800), and on 213 videos of two completely unseen signers from 54.5% to 76.5% (exact paired McNemar <em>p</em> = 0.003). For continuous signing, a log-likelihood fusion of a 2-layer BiGRU-CTC decoder and a sentence classifier achieves 29.2% exact-sentence accuracy (GER 0.685) across 101 corpus sentences on unseen rounds. In the reverse direction, a multi-tier Kannada Subject–Object–Verb (SOV) grammar engine and an analytic two-bone Inverse Kinematics (IK) 3D avatar pipeline with Gaussian trajectory smoothing eliminated all 367 mid-sign arm drops across 144 dataset-derived clips and reduced wrist acceleration jitter by 36.0%.</strong>
        </p>
        <p class="ieee-keywords">
          <strong><em>Index Terms</em>: Indian Sign Language (ISL), Kannada translation, MediaPipe landmarks, Bidirectional GRU (BiGRU), Connectionist Temporal Classification (CTC), ONNX WebAssembly, Inverse Kinematics (IK) signing avatar, assistive technology.</strong>
        </p>

        <h2 class="ieee-sec">I. INTRODUCTION</h2>
        <p>
          Sign languages are independent natural languages possessing their own phonological, morphological, and syntactic structures; they are not word-for-word manual encodings of spoken languages [1], [2]. In India, over 63 million individuals experience significant auditory impairment according to World Health Organization estimates, and in Karnataka more than 300,000 deaf and hard-of-hearing citizens rely on Indian Sign Language (ISL) for daily communication. However, India has fewer than 400 certified ISL interpreters nationwide. When a deaf citizen visits a Primary Health Centre (PHC), a banking counter, a municipal office, or a classroom in Karnataka, a severe two-way linguistic barrier arises: the deaf citizen signs in ISL (which uses topic-comment spatial syntax, two-handed symmetric/asymmetric articulations, and facial Non-Manual Markers), while the hearing counter officer speaks and reads Kannada (a morphologically rich Dravidian language with Subject–Object–Verb constituent order).
        </p>
        <p>
          Existing automatic Sign Language Recognition (SLR) literature focuses overwhelmingly on American Sign Language (WLASL [1], MS-ASL [2]) and German Sign Language (RWTH-PHOENIX-Weather [3], [4]), mapping visual inputs only to English or German text. In addition, deep 3D convolutional video networks such as I3D [10] require dedicated GPUs and transmit raw camera video to cloud servers, which conflicts with medical and financial privacy standards under India’s Digital Personal Data Protection (DPDP) Act 2023.
        </p>
      </div>

      <div class="ieee-col">
        <h3 class="ieee-subsec">A. Problem Formulation</h3>
        <p>
          Given a commodity CPU-only laptop or public-service kiosk equipped with an ordinary 30 fps webcam ($\mathcal{V} = \{I_1, \dots, I_N\}$), the engineering problem addressed by <em>Silent Bridge</em> comprises four coupled tasks:
        </p>
        <ol class="ieee-list">
          <li><strong>Privacy-Preserving Feature Extraction:</strong> Map each RGB frame $I_t$ in-browser to a scale-, translation-, and orientation-normalized landmark vector $\mathbf{f}_t \in \mathbb{R}^{147}$ such that zero pixel data leaves the client device.</li>
          <li><strong>Signer-Independent Isolated &amp; Continuous Recognition:</strong> Segment active signing intervals $[t_s, t_e]$ from continuous live motion, classify isolated signs across $C = 64$ active classes (and 144 lexicon classes) with calibrated out-of-distribution (OOD) rejection threshold $\tau^*$, and decode unsegmented multi-sign streams over 101 continuous sentences (168 glosses).</li>
          <li><strong>Grammatical ISL-to-Kannada Meaning Translation:</strong> Transform recognized ISL gloss sequences $\mathbf{g} = (g_1, \dots, g_k)$ into natural Unicode NFC Kannada sentences and synthesized <code>kn-IN</code> speech.</li>
          <li><strong>Reverse Kannada-to-ISL 3D Avatar Synthesis:</strong> Parse Kannada text or speech into an ISL-ordered gloss plan with Non-Manual Markers (NMMs) and drive a 60 fps Three.js humanoid avatar with analytic two-bone Inverse Kinematics (IK) and zero mid-sign arm drops.</li>
        </ol>

        <h3 class="ieee-subsec">B. Key Technical Contributions</h3>
        <ul class="ieee-list">
          <li><strong>End-to-End Bidirectional Edge Platform:</strong> A complete ISL $\leftrightarrow$ Kannada system executing MediaPipe Tasks v0.10.21 and ONNX Runtime WebAssembly in-browser, backed by a deterministic FastAPI verification and training engine.</li>
          <li><strong>147-D Face-Relative Geometric Schema (<code>hands-face-v2</code>):</strong> Combines palm-scaled 3D hand coordinates, image coordinates, face-relative vectors (with upper-center high-resolution face-crop fallback), orthonormal palm-normal vectors, and temporal velocity/path features ($D = 3{,}668$ for $T = 24$).</li>
          <li><strong>Selective HTTP-Range Archive Acquisition:</strong> A bandwidth-frugal downloader that reads remote ZIP central directories via HTTP Range requests and fetches only target class videos with CRC-32 verification (downloading 5.96 GB instead of 44.7 GB of INCLUDE archives), boosting unseen-signer accuracy by +9.4 percentage points ($p = 0.003$).</li>
          <li><strong>Fused BiGRU-CTC + Sentence Classifier Decoder:</strong> Combines frame-level CTC sequence log-likelihood with a 32-step sentence classifier ($\lambda = 1.0$), improving unseen-round sentence accuracy from 18.2% (greedy CTC) to 29.2% (GER 0.685).</li>
          <li><strong>Statistical Promotion Gate &amp; Negative-Result Governance:</strong> Enforces paired McNemar significance testing and non-regression gates on identical held-out videos, rejecting two over-parameterized or high-variance candidates (including a 144-class model that degraded unseen-signer accuracy from 76.5% to 70.9%).</li>
          <li><strong>Cleaned Dataset-Retargeted 3D Avatar with Analytic IK:</strong> Eliminates 100% of mid-sign arm drops (367 $\rightarrow$ 0) across 144 real ISL clips and reduces wrist acceleration jitter by 36.0% (4.42 $\rightarrow$ 2.83 $\text{cm/frame}^2$).</li>
        </ul>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>B.M.S. College of Engineering · Dept. of Computer Science and Business Systems (CSBS) · Guide: Tejaswini K · HoD: Dr. R Ashok Kumar · Principal: Dr. Beemsha Arya</span>
      <span>Page 1 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 2: Sec II (Related Work + Table I & Table II) & Sec III (Datasets & Protocol)
  // ============================================================================
  const page2 = String.raw`
  <section class="ieee-page" data-page="2">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h2 class="ieee-sec" style="margin-top:0;">II. RELATED WORK AND COMPARATIVE ANALYSIS</h2>
        <h3 class="ieee-subsec">A. Sign Language Benchmarks and ISL Corpora</h3>
        <p>
          Large-scale isolated sign benchmarks such as WLASL (2,000 ASL words) [1] and MS-ASL (1,000 ASL words) [2], along with continuous corpora such as RWTH-PHOENIX-Weather [3], have catalyzed deep learning research for Western sign languages. For Indian Sign Language, Sridhar <em>et al.</em> [5] introduced INCLUDE (4,287 videos across 263 isolated signs recorded in Chennai), Elakkiya and Natarajan [6] released ISL-CSLTR (687 sentence videos across 101 sentences and 168 glosses), and Sasidharan <em>et al.</em> [7] published the Amrita SLR dataset (isolated signs across 7 signer groups in Kerala). More recently, Joshi <em>et al.</em> introduced ISLTranslate [8] and iSign [9], providing large parallel video-to-English corpora without frame-level gloss annotations.
        </p>

        <h3 class="ieee-subsec">B. Appearance-Based vs. Landmark-Based Recognition</h3>
        <p>
          Appearance-based 3D CNNs (e.g., I3D [10]) and video Vision Transformers process raw RGB tensors directly, requiring gigabytes of GPU memory and exhibiting high sensitivity to background clutter, clothing, and lighting. Conversely, pose-based pipelines extract skeletal keypoints via OpenPose [11] or MediaPipe Hands/Face [12], [13], compressing each frame by over $10^3\times$. Skeleton-aware architectures such as SAM-SLR [14] and SignBERT [15] demonstrate strong accuracy, while recurrent Gated Recurrent Units (GRUs) [16] and Bidirectional RNNs [17] trained with Connectionist Temporal Classification (CTC) [18] enable CPU-real-time sequence modeling on modest dataset sizes.
        </p>

        <h3 class="ieee-subsec">C. Signing Avatars and Identified Research Gaps</h3>
        <p>
          Traditional signing avatars synthesize motion from symbolic notation systems such as HamNoSys [19], which Wolfe <em>et al.</em> [20] note often appear robotic due to rigid piecewise-linear interpolation and missing Non-Manual Markers. Table I summarizes the validated ISL datasets used in this study, and Table II contrasts <em>Silent Bridge</em> against representative prior systems. Three critical gaps motivated our architecture: (i) the absence of a bidirectional ISL $\leftrightarrow$ Kannada system, (ii) widespread signer leakage in random 80/20 evaluation splits in prior ISL papers, and (iii) severe mid-sign arm drops when retargeting raw 2D/3D MediaPipe landmarks to humanoid avatars.
        </p>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE I<br/>PUBLIC ISL CORPORA USED (AFTER CHECKSUM &amp; INTEGRITY VALIDATION)</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Dataset &amp; License</th>
                <th>Task Scope</th>
                <th>Validated Content Used</th>
                <th class="r">Videos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Amrita SLR [7] (CC BY 4.0)</td>
                <td>Isolated signs</td>
                <td>49 signs, 7 signer groups (2 held-out)</td>
                <td class="r">933</td>
              </tr>
              <tr>
                <td>INCLUDE [5] (CC BY 4.0)</td>
                <td>Isolated signs</td>
                <td>42 active classes (122 total), official split</td>
                <td class="r">816</td>
              </tr>
              <tr>
                <td>ISL-CSLTR [6] (CC BY 4.0)</td>
                <td>Sentences</td>
                <td>101 sentences, 168 glosses, 5 rounds</td>
                <td class="r">678</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Combined Active Corpus</td>
                <td>Bidirectional</td>
                <td>64 active / 144 lexicon signs + 101 sents</td>
                <td class="r">2,427</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="ieee-col">
        <div class="ieee-table-wrap" style="margin-top:0;">
          <div class="ieee-table-cap">TABLE II<br/>COMPARATIVE ANALYSIS OF EXISTING SLR &amp; AVATAR SYSTEMS VS. SILENT BRIDGE</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>System / Study</th>
                <th>Modality</th>
                <th>Split Protocol</th>
                <th>Kannada</th>
                <th>3D Avatar</th>
                <th class="r">Metric</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>WLASL I3D [1]</td>
                <td>RGB 3D-CNN</td>
                <td>Official ASL</td>
                <td>No</td>
                <td>No</td>
                <td class="r">62.6% Top-1</td>
              </tr>
              <tr>
                <td>INCLUDE Baseline [5]</td>
                <td>Pose + BiLSTM</td>
                <td>Official ISL</td>
                <td>No</td>
                <td>No</td>
                <td class="r">85.6% (263 c)</td>
              </tr>
              <tr>
                <td>ISL-CSLTR [6]</td>
                <td>CNN-LSTM</td>
                <td>Random 80/20</td>
                <td>No</td>
                <td>No</td>
                <td class="r">24.3 BLEU</td>
              </tr>
              <tr>
                <td>Amrita SLR [7]</td>
                <td>MediaPipe+MLP</td>
                <td>Random split</td>
                <td>No</td>
                <td>No</td>
                <td class="r">88.4% (seen)</td>
              </tr>
              <tr>
                <td>HamNoSys Avatar [19]</td>
                <td>Rule notation</td>
                <td>N/A</td>
                <td>No</td>
                <td>Keyframed</td>
                <td class="r">Qualitative</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Silent Bridge (Ours)</td>
                <td>147-D Edge BiGRU</td>
                <td>Unseen Signers</td>
                <td>Yes (SOV)</td>
                <td>IK + NMM</td>
                <td class="r">81.5% / 76.5%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 class="ieee-sec">III. DATASETS, SELECTIVE ARCHIVE PROTOCOL AND DATA INTEGRITY</h2>
        <h3 class="ieee-subsec">A. Signer-Independent Isolated Sign Protocol</h3>
        <p>
          The active isolated-sign model is trained on 1,749 validated videos across 64 ISL signs (49 from Amrita SLR, 42 from INCLUDE, with 27 overlapping signs present in both datasets). Fig. 2 illustrates the per-sign valid recording distribution (minimum 17, median 21, maximum 45 recordings per sign). Because Amrita SLR does not provide explicit signer IDs, signer identities were reconstructed from camera metadata and file-naming conventions into 7 disjoint signer groups. All recordings of two complete Amrita signers (213 videos) plus INCLUDE’s official test split (55 initial, 101 expanded videos) form the strictly held-out test set (268 initial, 314 expanded videos). Model architecture and hyperparameters are selected exclusively via 3-fold signer-grouped cross-validation on the development set.
        </p>

        <div class="ieee-fig-box">
          <img src="/report/fig_datadist.png" alt="Fig. 2. Valid training recordings per sign" />
          <div class="ieee-fig-cap">Fig. 2. Valid training recordings per sign for the active 64-sign model by source dataset (Amrita SLR vs. INCLUDE).</div>
        </div>

        <h3 class="ieee-subsec">B. Selective HTTP-Range INCLUDE Archive Downloader</h3>
        <p>
          The INCLUDE corpus is hosted on Zenodo as monolithic multi-gigabyte category ZIP archives totaling 56.8 GB, whereas only specific vocabulary classes were required. Exploiting the ZIP specification (which stores the End-of-Central-Directory [EOCD] record in the final 64 KB of the archive), we implemented an HTTP Range-request downloader (Algorithm 1) that parses remote central directories, fetches only matching member byte ranges, and validates every extracted video against its header CRC-32 checksum. As detailed in Table IV (Page 3), this reduced network transfer from 44.7 GB to 5.96 GB (86.7% bandwidth savings) with zero corrupted files.
        </p>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 2 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 3: Fig. 1 (Full-width Architecture), Alg 1, Table IV, Table V, Sec IV (Architecture)
  // ============================================================================
  const page3 = String.raw`
  <section class="ieee-page" data-page="3">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-fig-wide">
      <img src="/report/fig_architecture.png" alt="Fig. 1. Silent Bridge End-to-End Bidirectional Architecture" style="max-height:175px; width:100%; object-fit:contain;" />
      <div class="ieee-fig-cap">Fig. 1. Silent Bridge end-to-end bidirectional architecture. Raw camera frames remain strictly inside the browser; only 147-D MediaPipe landmark vectors cross the privacy boundary. Top path: ISL video to Kannada text and speech. Bottom path: Kannada text/voice to continuous 3D avatar signing.</div>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <div class="ieee-alg-box">
          <div class="ieee-alg-title"><strong>Algorithm 1:</strong> Selective HTTP-Range ZIP Archive Member Acquisition</div>
          <div class="ieee-alg-body">
            <div><strong>Require:</strong> Remote archive URLs $\mathcal{U}$, target vocabulary class paths $\mathcal{W}$</div>
            <div><strong>Ensure:</strong> Checksum-verified local video files on disk</div>
            <div>1: <strong>for each</strong> archive $u \in \mathcal{U}$ containing classes in $\mathcal{W}$ <strong>do</strong></div>
            <div>2: &nbsp;&nbsp;Fetch final 65,536 bytes of $u$ via HTTP <code>Range: bytes=-65536</code></div>
            <div>3: &nbsp;&nbsp;Locate EOCD signature <code>0x06054b50</code> and parse Central Directory offset</div>
            <div>4: &nbsp;&nbsp;Fetch Central Directory byte range and enumerate member headers $e \in u$</div>
            <div>5: &nbsp;&nbsp;<strong>for each</strong> member $e$ whose normalized class folder $\in \mathcal{W}$ <strong>do</strong></div>
            <div>6: &nbsp;&nbsp;&nbsp;&nbsp;<strong>if</strong> target file already exists on disk with matching size <strong>then continue</strong></div>
            <div>7: &nbsp;&nbsp;&nbsp;&nbsp;Fetch local header + compressed payload bytes of $e$ via HTTP Range</div>
            <div>8: &nbsp;&nbsp;&nbsp;&nbsp;Decompress stream and compute $\text{CRC32}(\text{payload})$</div>
            <div>9: &nbsp;&nbsp;&nbsp;&nbsp;<strong>if</strong> $\text{CRC32} \neq e.\text{crc32}$ <strong>or</strong> $\text{len} \neq e.\text{uncompressed\_size}$ <strong>then</strong></div>
            <div>10: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Abort member write and log integrity failure</div>
            <div>11: &nbsp;&nbsp;&nbsp;&nbsp;<strong>else</strong> write atomically via <code>.part</code> temporary file rename</div>
            <div>12: &nbsp;&nbsp;<strong>end for</strong></div>
            <div>13: <strong>end for</strong></div>
          </div>
        </div>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE IV<br/>SELECTIVE HTTP-RANGE INCLUDE DOWNLOADS &amp; BANDWIDTH SAVINGS</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Acquisition Phase &amp; Purpose</th>
                <th class="r">Videos</th>
                <th class="r">Fetched</th>
                <th class="r">Full ZIPs</th>
                <th class="r">Saved</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Phase 1: Expand 24 core signs + 1</td>
                <td class="r">462</td>
                <td class="r">5.96 GB</td>
                <td class="r">44.7 GB</td>
                <td class="r">86.7%</td>
              </tr>
              <tr>
                <td>Phase 2: 79 new signs + <em>home</em></td>
                <td class="r">1,430</td>
                <td class="r">18.59 GB</td>
                <td class="r">48.7 GB</td>
                <td class="r">61.8%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="ieee-subsec">C. Continuous Sentence Split and MD5 Integrity Audit</h3>
        <p>
          For continuous sentence recognition on ISL-CSLTR [6], recording rounds 4 and 5 form the held-out test set (154 videos), round 2 forms the validation set (73 videos), and rounds 1 and 3 form the training set (265 listed videos). A cryptographic MD5 audit of all 687 video files on disk (Table V) uncovered 5 duplicate byte-identical file groups, 4 of which carried conflicting sentence labels across folders; all 9 conflicted files were quarantined and excluded from training.
        </p>
      </div>

      <div class="ieee-col">
        <div class="ieee-table-wrap" style="margin-top:0;">
          <div class="ieee-table-cap">TABLE V<br/>ISL-CSLTR CORPUS CRYPTOGRAPHIC MD5 INTEGRITY AUDIT</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Audit Verification Metric</th>
                <th class="r">Video Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total raw video files discovered on disk</td>
                <td class="r">687</td>
              </tr>
              <tr>
                <td>Videos listed in official corpus metadata spreadsheet</td>
                <td class="r">492</td>
              </tr>
              <tr>
                <td>Unlisted videos with verified folder-name convention</td>
                <td class="r">195</td>
              </tr>
              <tr>
                <td>Folder-name label agreement on listed videos</td>
                <td class="r">492 / 492 (100%)</td>
              </tr>
              <tr>
                <td>MD5 byte-duplicate groups / conflicting sentence labels</td>
                <td class="r">5 groups / 4 conflicts</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Corrupted/conflicted files excluded from training</td>
                <td class="r">9</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 class="ieee-sec">IV. END-TO-END BIDIRECTIONAL SYSTEM ARCHITECTURE</h2>
        <p>
          As depicted in Fig. 1, <em>Silent Bridge</em> is structured around a strict client-side privacy boundary:
        </p>
        <p>
          <strong>1) Forward Path (ISL Video $\rightarrow$ Kannada Text &amp; Speech):</strong> The React 18 / TypeScript client captures 30 fps webcam video and executes MediaPipe Hand Landmarker (2 hands $\times$ 21 3D joints) and Face Landmarker (478 3D mesh points) via WebAssembly/WebGL. Only the extracted 147-D feature vector $\mathbf{f}_t$ is processed by the motion segmenter and classified either in-browser via <code>onnxruntime-web</code> (<code>sign_model.onnx</code>) with few-shot cosine prototype fusion or streamed over WebSocket to the Python FastAPI backend for BiGRU-CTC continuous decoding. Accepted glosses are translated via a 187-entry phrase meaning table and SOV grammar rules into Unicode NFC Kannada text and spoken aloud via the Web Speech API (<code>kn-IN</code>) with a server-side <code>gTTS</code> fallback.
        </p>
        <p>
          <strong>2) Reverse Path (Kannada Text/Speech $\rightarrow$ 3D ISL Avatar):</strong> Kannada input is normalized to Unicode NFC, stripped of agglutinative case suffixes (<em>-alli, -inda, -ge, -annu</em>), matched by longest-phrase priority, reordered into ISL Topic–Comment–Verb-Final constituent order, annotated with Non-Manual Markers (interrogative brow raise, wh-furrow, negation headshake), and rendered at 60 fps on a Three.js humanoid rig using dataset-retargeted keyframes and analytic two-bone Inverse Kinematics.
        </p>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 3 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 4: Sec V (Mathematical Formulation & Methodology: Equations 1-10, Table III, Alg 2, Fig 3)
  // ============================================================================
  const page4 = String.raw`
  <section class="ieee-page" data-page="4">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h2 class="ieee-sec" style="margin-top:0;">V. MATHEMATICAL FORMULATION AND METHODOLOGY</h2>
        <h3 class="ieee-subsec">A. 147-D Geometric Landmark Schema (<code>hands-face-v2</code>)</h3>
        <p>
          Let $\mathbf{p}_i = (x_i, y_i, z_i) \in \mathbb{R}^3$ denote the raw MediaPipe coordinates of hand joint $i \in \{0, \dots, 20\}$, where $\mathbf{p}_0$ is the wrist root and $\mathbf{p}_9$ is the middle-finger MCP joint. To achieve invariance to camera distance and hand size, we normalize all 20 non-wrist joints by the apparent palm scale $s_{\text{palm}} = \max(\|\mathbf{p}_9 - \mathbf{p}_0\|_2, 10^{-3})$:
        </p>
        <div class="ieee-eq">
          <span>$\tilde{\mathbf{p}}_i = \frac{\mathbf{p}_i - \mathbf{p}_0}{s_{\text{palm}}}, \quad i \in \{1, \dots, 20\} \implies 60\text{ dims/hand.}$</span>
          <span class="ieee-eq-num">(1)</span>
        </div>
        <p>
          Many ISL signs are distinguished solely by hand height relative to the head (e.g., <em>MOTHER</em> vs. <em>FATHER</em>, or <em>EAT</em> vs. <em>NOSE</em>). Given the face bounding box center $\mathbf{c}_{\text{face}} = (c_x, c_y)$ and dimensions $(w_{\text{face}}, h_{\text{face}})$, the face-relative wrist vector $\mathbf{r}_{\text{face}} \in \mathbb{R}^3$ is:
        </p>
        <div class="ieee-eq">
          <span>$\mathbf{r}_{\text{face}} = \left(\frac{p_{0,x} - c_x}{\max(w_{\text{face}}, 10^{-3})},\; \frac{p_{0,y} - c_y}{\max(h_{\text{face}}, 10^{-3})},\; p_{0,z} - c_z\right).$</span>
          <span class="ieee-eq-num">(2)</span>
        </div>
        <p>
          Three-dimensional hand rotation is captured via the unit finger-axis vector $\hat{\mathbf{d}}$ and unit palm-normal vector $\hat{\mathbf{n}}$:
        </p>
        <div class="ieee-eq">
          <span>$\hat{\mathbf{d}} = \frac{\mathbf{p}_9 - \mathbf{p}_0}{\|\mathbf{p}_9 - \mathbf{p}_0\|_2}, \quad \hat{\mathbf{n}} = \frac{(\mathbf{p}_5 - \mathbf{p}_0) \times (\mathbf{p}_{17} - \mathbf{p}_0)}{\|(\mathbf{p}_5 - \mathbf{p}_0) \times (\mathbf{p}_{17} - \mathbf{p}_0)\|_2}.$</span>
          <span class="ieee-eq-num">(3)</span>
        </div>
        <p>
          Concatenating left and right hand descriptors ($2 \times 73 = 146$) with the binary face-visibility indicator $v_{\text{face}} \in \{0, 1\}$ yields $\mathbf{f}_t \in \mathbb{R}^{147}$ (Table III). A variable-length sign segment of $L$ frames is temporally resampled via linear interpolation to $T = 24$ steps and augmented with inter-frame wrist velocities $\Delta \mathbf{p}_{0,t} \in \mathbb{R}^{6(T-1)}$ and cumulative path lengths $\ell_L, \ell_R \in \mathbb{R}^2$, yielding total segment dimension:
        </p>
        <div class="ieee-eq">
          <span>$D = 147\,T + 6\,(T - 1) + 2 = 3{,}668 \quad (\text{for } T = 24).$</span>
          <span class="ieee-eq-num">(4)</span>
        </div>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE III<br/>147-D LANDMARK FEATURE SCHEMA (<code>hands-face-v2</code>) PER FRAME</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Feature Sub-Block</th>
                <th>Mathematical Definition</th>
                <th class="r">Dims</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Wrist-relative shape</td>
                <td>$(\mathbf{p}_i - \mathbf{p}_0)/s_{\text{palm}}$ for $i=1\dots20$ ($\times 2$ hands)</td>
                <td class="r">120</td>
              </tr>
              <tr>
                <td>Image wrist position</td>
                <td>Normalized $(p_{0,x}, p_{0,y}, p_{0,z})$ ($\times 2$ hands)</td>
                <td class="r">6</td>
              </tr>
              <tr>
                <td>Face-relative wrist</td>
                <td>$\mathbf{r}_{\text{face}}$ scaled by face width/height ($\times 2$ hands)</td>
                <td class="r">6</td>
              </tr>
              <tr>
                <td>Palm orientation</td>
                <td>Orthonormal $(\hat{\mathbf{d}}, \hat{\mathbf{n}}) \in \mathbb{R}^6$ ($\times 2$ hands)</td>
                <td class="r">12</td>
              </tr>
              <tr>
                <td>Visibility flags</td>
                <td>Left hand $v_L$, right hand $v_R$, face $v_{\text{face}}$</td>
                <td class="r">3</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Total Frame / Segment</td>
                <td>$\mathbf{f}_t \in \mathbb{R}^{147}$ per frame; $\mathbf{x} \in \mathbb{R}^{3668}$ at $T=24$</td>
                <td class="r">147</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="ieee-col">
        <h3 class="ieee-subsec" style="margin-top:0;">B. BiGRU Classifier &amp; 3-View Test-Time Augmentation</h3>
        <p>
          Each frame $\mathbf{f}_t \in \mathbb{R}^{147}$ is projected through a LayerNorm-ReLU linear embedding to $\mathbf{e}_t \in \mathbb{R}^{96}$ and processed by a 2-layer Bidirectional GRU (96 hidden units per direction, $\mathbf{h}_t \in \mathbb{R}^{192}$). Temporal mean pooling and max pooling are concatenated with summary wrist velocity statistics $\mathbf{s}_{\text{vel}} \in \mathbb{R}^{14}$ to form $\mathbf{z} \in \mathbb{R}^{398}$:
        </p>
        <div class="ieee-eq">
          <span>$\mathbf{z} = \left[\frac{1}{T}\sum_{t=1}^{T}\mathbf{h}_t \;\Big\|\; \max_{1\le t\le T}\mathbf{h}_t \;\Big\|\; \mathbf{s}_{\text{vel}}\right] \in \mathbb{R}^{398}.$</span>
          <span class="ieee-eq-num">(5)</span>
        </div>
        <p>
          At inference, 3-view Test-Time Augmentation (TTA) averages probabilities over the raw segment $\mathbf{X}^{(1)}$, a 3-tap temporally denoised segment $\mathbf{X}^{(2)}$, and an 84% central core-stroke crop $\mathbf{X}^{(3)}$:
        </p>
        <div class="ieee-eq">
          <span>$\overline{\mathbf{P}}(y \mid \mathbf{X}) = \frac{1}{3}\sum_{v=1}^{3} \text{Softmax}\!\left(\mathbf{W}_{\text{cls}}\,\mathbf{z}(\mathbf{X}^{(v)}) + \mathbf{b}_{\text{cls}}\right).$</span>
          <span class="ieee-eq-num">(6)</span>
        </div>

        <h3 class="ieee-subsec">C. Out-of-Fold Threshold Calibration &amp; Live Segmentation</h3>
        <p>
          To reject non-sign gestures and ambiguous motions, we compute out-of-fold (OOF) cross-validation probabilities on all 1,435 development videos and select threshold $\tau^*$ maximizing accepted-word $F_1(\tau)$:
        </p>
        <div class="ieee-eq">
          <span>$\tau^* = \arg\max_{\tau \in [0.05, 0.95]} \frac{2\,\text{Prec}(\tau)\,\text{Rec}(\tau)}{\text{Prec}(\tau) + \text{Rec}(\tau)} = 0.50.$</span>
          <span class="ieee-eq-num">(7)</span>
        </div>

        <div class="ieee-fig-box">
          <img src="/report/fig_calibration.png" alt="Fig. 3. Precision, recall, and coverage calibration curve" />
          <div class="ieee-fig-cap">Fig. 3. Precision, recall, and coverage of accepted signs against confidence threshold $\tau$ across 1,435 out-of-fold development predictions; $\tau^* = 0.50$ maximizes F1.</div>
        </div>

        <div class="ieee-alg-box">
          <div class="ieee-alg-title"><strong>Algorithm 2:</strong> Motion Segmentation with Still-Tail Trimming</div>
          <div class="ieee-alg-body">
            <div>1: <strong>for each</strong> incoming frame $\mathbf{f}_t$ with inter-frame wrist speed $m_t$ <strong>do</strong></div>
            <div>2: &nbsp;&nbsp;<strong>if</strong> state = IDLE <strong>and</strong> hands present <strong>and</strong> $m_t > \theta_{\text{start}} (0.014\text{ s}^{-1})$ <strong>then</strong></div>
            <div>3: &nbsp;&nbsp;&nbsp;&nbsp;state $\leftarrow$ ACTIVE; initialize buffer $\mathcal{B} \leftarrow [\mathbf{f}_t]$</div>
            <div>4: &nbsp;&nbsp;<strong>else if</strong> state = ACTIVE <strong>then</strong> append $\mathbf{f}_t$ to $\mathcal{B}$</div>
            <div>5: &nbsp;&nbsp;&nbsp;&nbsp;<strong>if</strong> ($m_t < \theta_{\text{still}}$ for $T_{\text{still}}$) <strong>or</strong> hands absent $\ge 200\text{ ms}$ <strong>or</strong> $|\mathcal{B}| > 4\text{ s}$ <strong>then</strong></div>
            <div>6: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Trim trailing stillness tail where $m_k < \theta_{\text{still}}$; classify $\mathcal{B}$ via Eq. (6)</div>
            <div>7: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>if</strong> $\max_y \overline{P}(y) \ge \tau^*$ <strong>then</strong> emit Kannada word; <strong>else</strong> mark uncertain</div>
            <div>8: &nbsp;&nbsp;&nbsp;&nbsp;<strong>end if</strong></div>
            <div>9: &nbsp;&nbsp;<strong>end if</strong></div>
            <div>10: <strong>end for</strong></div>
          </div>
        </div>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 4 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 5: Sec V-D..F (Continuous CTC Fusion, Block-Balanced Few-Shot, Avatar IK, Alg 3) & Sec VI (Implementation)
  // ============================================================================
  const page5 = String.raw`
  <section class="ieee-page" data-page="5">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h3 class="ieee-subsec" style="margin-top:0;">D. Continuous Sentence Recognition via BiGRU-CTC Fusion</h3>
        <p>
          For continuous unsegmented ISL sentences, a 2-layer BiGRU (128 units per direction) processes every second frame of sequence $\mathbf{X}$ and outputs per-step probabilities over 168 glosses plus the CTC blank token $\epsilon$ [18]. Because pure CTC decoding can produce ungrammatical gloss combinations on small corpora, we fuse the exact CTC prefix log-likelihood of each candidate corpus sentence $s \in \{1, \dots, 101\}$ (with gloss sequence $g_s$) with a sentence-level classifier $P_{\text{cls}}(s \mid \mathbf{X})$ operating on $\mathbf{X}$ resampled to 32 steps:
        </p>
        <div class="ieee-eq">
          <span>$\text{score}(s) = \log P_{\text{CTC}}(g_s \mid \mathbf{X}) + \lambda \log P_{\text{cls}}(s \mid \mathbf{X}), \quad \lambda = 1.0.$</span>
          <span class="ieee-eq-num">(8)</span>
        </div>
        <p>
          Sentences whose posterior $\text{Softmax}(\text{score}(s)) < 0.50$ are flagged as uncertain with top-3 candidates rather than silently misclassified.
        </p>

        <h3 class="ieee-subsec">E. Block-Balanced Few-Shot Custom Sign Enrollment</h3>
        <p>
          To allow deaf users and domain officers to enroll custom regional signs in 3–5 webcam repetitions without retraining the neural network, we compute a block-balanced cosine similarity across $B = 5$ semantic feature subspaces (left handshape, right handshape, face-relative position, palm orientation, and velocity trajectory) so the 120-D handshape block does not drown out the 6-D face-relative location cue:
        </p>
        <div class="ieee-eq">
          <span>$S_{\text{block}}(\mathbf{u}, \mathbf{v}) = \sum_{b=1}^{5} w_b \frac{\langle \mathbf{u}^{(b)}, \mathbf{v}^{(b)} \rangle}{\|\mathbf{u}^{(b)}\|_2\,\|\mathbf{v}^{(b)}\|_2 + 10^{-8}}, \quad \sum_{b=1}^{5} w_b = 1.$</span>
          <span class="ieee-eq-num">(9)</span>
        </div>

        <h3 class="ieee-subsec">F. 3D Avatar Clip Cleaning &amp; Analytic Two-Bone Inverse Kinematics</h3>
        <p>
          Given upper-arm length $L_1 = 0.29\text{ m}$, forearm length $L_2 = 0.27\text{ m}$, shoulder position $\mathbf{p}_s$, and target 3D wrist position $\mathbf{p}_w$ retargeted from dataset landmarks (with clamping $d = \min(\|\mathbf{p}_w - \mathbf{p}_s\|_2, 0.995(L_1 + L_2))$), the interior elbow flexion angle $\theta_{\text{elbow}}$ is solved analytically via the Law of Cosines:
        </p>
        <div class="ieee-eq">
          <span>$\cos\theta_{\text{elbow}} = \text{clip}\!\left(\frac{L_1^2 + L_2^2 - d^2}{2\,L_1\,L_2},\; -1,\; 1\right).$</span>
          <span class="ieee-eq-num">(10)</span>
        </div>
        <p>
          Consecutive signs in a sentence are joined by a $0.20\text{ s}$ minimum-jerk Quintic Hermite spline $h(u) = 10u^3 - 15u^4 + 6u^5$ ($u \in [0, 1]$) with an outward/upward ballistic clearance arc $\Delta\mathbf{p}_{\text{arc}}(u) = 4u(1-u)(0, 0.035, 0.045)\text{ m}$ to prevent torso mesh self-intersection:
        </p>
        <div class="ieee-eq">
          <span>$\mathbf{p}_w(u) = (1 - h(u))\,\mathbf{p}_{\text{end}}^{(k)} + h(u)\,\mathbf{p}_{\text{start}}^{(k+1)} + \Delta\mathbf{p}_{\text{arc}}(u).$</span>
          <span class="ieee-eq-num">(11)</span>
        </div>

        <div class="ieee-alg-box">
          <div class="ieee-alg-title"><strong>Algorithm 3:</strong> Avatar Landmark Trajectory Cleaning (Per Hand)</div>
          <div class="ieee-alg-body">
            <div><strong>Require:</strong> Raw per-frame hand poses $\mathbf{p}_1, \dots, \mathbf{p}_n$ (or missing)</div>
            <div>1: <strong>if</strong> hand is present in $&lt; 15\%$ of clip frames <strong>then return</strong> no track (detector noise)</div>
            <div>2: Linearly interpolate tracking dropout gaps of duration $\le 0.40\text{ s}$ between valid frames</div>
            <div>3: Apply 1D Gaussian smoothing ($\sigma = 1.5$ frames) to wrist $\mathbf{p}_w$, $\hat{\mathbf{d}}$, $\hat{\mathbf{n}}$, and 15 finger curls</div>
            <div>4: Trim leading and trailing motionless frames (retaining $0.12\text{ s}$ onset/offset context)</div>
            <div>5: Resample trajectory to at most 15 keyframes/s and serialize compact JSON clip</div>
          </div>
        </div>
      </div>

      <div class="ieee-col">
        <h3 class="ieee-subsec" style="margin-top:0;">G. Paired McNemar Test &amp; Non-Regression Promotion Gate</h3>
        <p>
          Every candidate model is evaluated against the active production model on the exact same held-out test videos. Let $n_{10}$ denote videos where only the new candidate is correct and $n_{01}$ denote videos where only the active model is correct. Statistical significance is evaluated via the exact two-sided McNemar test [21]:
        </p>
        <div class="ieee-eq">
          <span>$p = 2 \sum_{k=\max(n_{10}, n_{01})}^{n_{10}+n_{01}} \binom{n_{10}+n_{01}}{k} 0.5^{n_{10}+n_{01}}.$</span>
          <span class="ieee-eq-num">(12)</span>
        </div>
        <p>
          A candidate is promoted to active status only if (i) its held-out macro-F1 $\ge 0.40$, (ii) its accuracy on shared test videos does not regress by more than $0.02$, and (iii) it passes an automated live-pipeline smoke test.
        </p>

        <h2 class="ieee-sec">VI. FULL-STACK IMPLEMENTATION AND EDGE-WASM ENGINE</h2>
        <p>
          <em>Silent Bridge</em> is implemented as a modular 7-view web platform (Live Recognition, Custom Signs Studio, Kannada-to-Sign 3D Avatar, Sign Reference Dictionary, Dataset &amp; Model Governance Registry, About &amp; Testing Benchmark Suite, and CSBS/IEEE Report Viewer).
        </p>
        <p>
          <strong>1) Client-Side ONNX WebAssembly Inference:</strong> The trained PyTorch BiGRU is exported to ONNX opset 17 (<code>sign_model.onnx</code>, 3.1 MB) and executed in the browser via <code>onnxruntime-web</code> WASM SIMD threads. When offline or disconnected from the Python server, the browser executes the full 6-stage pipeline (MediaPipe landmarking, 147-D feature extraction, Algorithm 2 segmentation, 3-view TTA ONNX inference, few-shot custom prototype matching, and Kannada SOV translation) locally on the client CPU.
        </p>
        <p>
          <strong>2) Sovereign Kannada Linguistic Engine:</strong> In the forward direction, recognized gloss sequences are matched against a 187-entry phrase meaning table that resolves ISL topic-comment syntax into natural Kannada sentences (e.g., <code>[YOU, NAME, WHAT]</code> $\rightarrow$ ನಿನ್ನ ಹೆಸರು ಏನು?). In the reverse direction, Kannada input undergoes Unicode NFC canonicalization, regex agglutinative suffix stripping, longest-phrase matching across 162 vocabulary entries, SOV-to-ISL reordering (placing temporal nouns first and wh-interrogatives/negations at the clause boundary), and procedural Kannada finger-spelling for out-of-vocabulary proper nouns.
        </p>
        <p>
          <strong>3) Expressive 3D Avatar Rig:</strong> Built in Three.js (<code>AvatarCanvas.tsx</code>), the humanoid character features anatomical proportions, dual-hemisphere studio lighting, 55-joint hierarchical skeleton (hips, spine, neck, head, clavicles, upper/forearms, wrists, and 30 phalangeal finger joints), 6 Kannada mouth visemes, blink controller, and NMM brow/head tracks.
        </p>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 5 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 6: Sec VII (Experimental Evaluation: Isolated Signs, Ablation, Per-Sign F1, Streams)
  // ============================================================================
  const page6 = String.raw`
  <section class="ieee-page" data-page="6">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h2 class="ieee-sec" style="margin-top:0;">VII. EXPERIMENTAL EVALUATION AND RESULTS</h2>
        <h3 class="ieee-subsec">A. Isolated-Sign Recognition on Unseen Signers</h3>
        <p>
          Table VI and Fig. 4 report the progression of isolated-sign top-1 accuracy on the identical 268 held-out test videos across four major engineering iterations. Adding temporal BiGRU modeling and upper-center face-crop fallback raised accuracy from 59.7% (multinomial logistic regression baseline) to 72.4%. Expanding the training set with 462 selectively downloaded INCLUDE recordings (Algorithm 1) further boosted accuracy on the same 268 videos to <strong>79.9%</strong> (and <strong>81.5%</strong> across the full 314-video test set, macro-F1 <strong>0.800</strong>). On the most challenging subset, consisting of 213 videos recorded by two completely unseen Amrita signers, accuracy rose from 54.5% to <strong>76.5%</strong> (+22.0 percentage points overall; +9.4 points from data expansion alone, with $n_{10}=34$ newly correct vs. $n_{01}=13$ regressed, exact paired McNemar $p = 0.003$).
        </p>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE VI<br/>ISOLATED-SIGN TOP-1 ACCURACY (%) ON IDENTICAL HELD-OUT VIDEOS</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Model Iteration (Train Videos)</th>
                <th class="r">All (268)</th>
                <th class="r">Amrita Unseen (213)</th>
                <th class="r">INCLUDE Test (55)</th>
                <th class="r">Macro-F1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>LogReg Baseline (1,290)</td>
                <td class="r">59.7</td>
                <td class="r">54.5</td>
                <td class="r">80.0</td>
                <td class="r">0.591</td>
              </tr>
              <tr>
                <td>LogReg + BiGRU, $T=16$ (1,290)</td>
                <td class="r">72.4</td>
                <td class="r">67.1</td>
                <td class="r">92.7</td>
                <td class="r">0.708</td>
              </tr>
              <tr>
                <td>LogReg + BiGRU, $T=24$ (1,290)</td>
                <td class="r">72.0</td>
                <td class="r">67.1</td>
                <td class="r">90.9</td>
                <td class="r">0.707</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>BiGRU + INCLUDE + TTA (1,749)</td>
                <td class="r">79.9</td>
                <td class="r">76.5</td>
                <td class="r">92.7</td>
                <td class="r">0.800*</td>
              </tr>
            </tbody>
          </table>
          <div class="ieee-table-foot">*Macro-F1 on full 314-video held-out test set (overall Top-1 accuracy: 81.5%).</div>
        </div>

        <div class="ieee-fig-box">
          <img src="/report/fig_results.png" alt="Fig. 4. Top-1 accuracy progression across model iterations" />
          <div class="ieee-fig-cap">Fig. 4. Top-1 accuracy progression of successive models on identical held-out test videos (all 268 videos vs. 213 unseen Amrita signer videos).</div>
        </div>

        <h3 class="ieee-subsec">B. Validation Ablation &amp; Multi-Seed Stability</h3>
        <p>
          Table VII summarizes the 3-fold signer-grouped validation comparison used to select temporal length $T$ and classifier weighting prior to test evaluation. Retraining the baseline and the BiGRU ensemble across three random seeds (7, 11, 23) yielded $62.2 \pm 2.1\%$ vs. $70.5 \pm 1.3\%$ test accuracy ($n_{10}=102$ vs. $n_{01}=35$ pooled, McNemar $p &lt; 10^{-8}$), confirming seed-invariant improvement.
        </p>
      </div>

      <div class="ieee-col">
        <div class="ieee-table-wrap" style="margin-top:0;">
          <div class="ieee-table-cap">TABLE VII<br/>3-FOLD SIGNER-GROUPED VALIDATION ABLATION (DEVELOPMENT DATA)</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Architecture &amp; Resampling Variant</th>
                <th class="r">Val Acc</th>
                <th class="r">Val Macro-F1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Multinomial LogReg, $T = 12$</td>
                <td class="r">0.398</td>
                <td class="r">0.377</td>
              </tr>
              <tr>
                <td>Multinomial LogReg, $T = 16$</td>
                <td class="r">0.412</td>
                <td class="r">0.388</td>
              </tr>
              <tr>
                <td>Multinomial LogReg, $T = 24$</td>
                <td class="r">0.413</td>
                <td class="r">0.385</td>
              </tr>
              <tr>
                <td>Multinomial LogReg, $T = 32$</td>
                <td class="r">0.416</td>
                <td class="r">0.391</td>
              </tr>
              <tr>
                <td>Standalone BiGRU, $T = 16$</td>
                <td class="r">0.416</td>
                <td class="r">0.399</td>
              </tr>
              <tr>
                <td>Ensemble (0.7 LogReg + 0.3 BiGRU)</td>
                <td class="r">0.424</td>
                <td class="r">0.402</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Ensemble (0.5 LogReg + 0.5 BiGRU, selected)</td>
                <td class="r">0.437</td>
                <td class="r">0.420</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="ieee-subsec">C. Per-Sign F1 Distribution &amp; Rejected 144-Class Candidate</h3>
        <p>
          Fig. 5 plots the sorted F1-score across all 60 signs with test videos: 26 signs achieve $\text{F1} \ge 0.90$ (mean $0.800$), while confusions concentrate among minimal pairs sharing facial location (e.g., <em>EAT</em> vs. <em>NOSE</em>, 4 videos; <em>HELLO</em> vs. <em>GOOD</em>, 3 videos). When a 144-class candidate (3,182 training videos) was trained, it achieved 85.2% on 210 INCLUDE test videos of the new classes but regressed on the original 64 signs from 81.5% to 76.1% (and from 76.5% to 70.9% on unseen Amrita signers); the promotion gate automatically rejected it from replacing the active recognizer while preserving all 144 clips for the reverse avatar direction.
        </p>

        <div class="ieee-fig-box">
          <img src="/report/fig_perclass.png" alt="Fig. 5. Per-sign F1-score across 60 held-out test classes" />
          <div class="ieee-fig-cap">Fig. 5. Sorted per-sign F1-scores of the active model across the 60 signs with held-out test videos (mean F1 = 0.800).</div>
        </div>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE VIII<br/>LIVE-PIPELINE BACK-TO-BACK STREAM REPLAY (SIGN ERROR RATE)</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Model Pipeline</th>
                <th class="r">Signs</th>
                <th class="r">Sub (S)</th>
                <th class="r">Del (D)</th>
                <th class="r">Ins (I)</th>
                <th class="r">SER</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>LogReg Baseline</td>
                <td class="r">268</td>
                <td class="r">55</td>
                <td class="r">74</td>
                <td class="r">1</td>
                <td class="r">0.485</td>
              </tr>
              <tr>
                <td>LogReg+BiGRU ($T=16$)</td>
                <td class="r">268</td>
                <td class="r">18</td>
                <td class="r">88</td>
                <td class="r">0</td>
                <td class="r">0.396</td>
              </tr>
              <tr>
                <td>LogReg+BiGRU ($T=24$)</td>
                <td class="r">268</td>
                <td class="r">50</td>
                <td class="r">27</td>
                <td class="r">2</td>
                <td class="r">0.295</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>BiGRU + INCLUDE + Trim</td>
                <td class="r">314</td>
                <td class="r">54</td>
                <td class="r">8</td>
                <td class="r">24</td>
                <td class="r">0.274</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 6 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 7: Sec VII-D..H (Segmentation Fig 6, Robustness Fig 7, Parity Table IX, Sentences Table X, Avatar Table XI)
  // ============================================================================
  const page7 = String.raw`
  <section class="ieee-page" data-page="7">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h3 class="ieee-subsec" style="margin-top:0;">D. Continuous Stream Segmentation &amp; Perturbation Robustness</h3>
        <p>
          Replaying all 314 held-out test videos back-to-back through the live segmenter (Algorithm 2) reduced the stream Sign Error Rate (SER) from 0.485 to <strong>0.274</strong> (Table VIII), with still-tail trimming cutting deletions from 88 to 8. Fig. 6 evaluates five segmentation strategies across 50 synthetic five-sign streams (245 signs) under three boundary regimes: short pause, back-to-back, and hands never lowered. The default stillness/absence gate ($800/200\text{ ms}$) achieved the lowest test-signer SER ($0.474$) when signers pause briefly between words.
        </p>

        <div class="ieee-fig-box">
          <img src="/report/fig_segmentation.png" alt="Fig. 6. Sign Error Rate of segmentation variants" />
          <div class="ieee-fig-cap">Fig. 6. Sign Error Rate (SER) of five segmentation variants on 50 test streams of five signs (245 total signs) with known ground-truth boundaries.</div>
        </div>

        <p>
          Fig. 7 evaluates synthetic landmark perturbations across 268 held-out videos: left-right mirroring, 20–40% random frame drops, $0.67\times\text{–}1.5\times$ speed scaling, $\pm 15\%$ scale variation, and Gaussian coordinate noise degrade top-1 accuracy by at most $1.5$ percentage points. Removing face landmarks drops accuracy by $19.0$ points ($66.8\% \rightarrow 47.8\%$), proving the importance of the face-relative vector $\mathbf{r}_{\text{face}}$ in Eq. (2).
        </p>

        <div class="ieee-fig-box">
          <img src="/report/fig_robustness.png" alt="Fig. 7. Top-1 accuracy under synthetic landmark perturbations" />
          <div class="ieee-fig-cap">Fig. 7. Top-1 accuracy under synthetic landmark perturbations across 268 held-out test videos; removing face landmarks causes the largest drop.</div>
        </div>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE IX<br/>BROWSER MEDIAPIPE VS. OFFLINE PYTHON FEATURE EXTRACTION PARITY</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Cross-Runtime Parity Metric ($N = 8$ Reference Videos)</th>
                <th class="r">Measured Agreement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hand presence detection agreement per video</td>
                <td class="r">91.8% – 100.0%</td>
              </tr>
              <tr>
                <td>Handedness (Left/Right) label agreement</td>
                <td class="r">81.5% – 100.0%</td>
              </tr>
              <tr>
                <td>Median 3D landmark coordinate discrepancy</td>
                <td class="r">0.002 – 0.007 units</td>
              </tr>
              <tr>
                <td>Identical top-1 predicted sign label</td>
                <td class="r">7 / 8 (87.5%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="ieee-col">
        <h3 class="ieee-subsec" style="margin-top:0;">E. Continuous Sentence Decoding &amp; Meaning Layer Impact</h3>
        <p>
          Table X compares four continuous sentence decoders on the 154 held-out test videos of unseen recording rounds (rounds 4 and 5) across 101 ISL-CSLTR sentences (~1.0% random chance). Log-likelihood fusion of the BiGRU-CTC decoder and the 32-step sentence classifier (Eq. 8) achieves <strong>29.2%</strong> exact-sentence accuracy and reduces Gloss Error Rate (GER) from 0.883 to <strong>0.685</strong>. On 124 held-out multi-sign phrase streams, the Kannada phrase meaning layer achieved 60.5% exact Kannada sentence match (chrF 0.669) compared to 39.5% (chrF 0.605) for word-by-word gloss translation.
        </p>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE X<br/>CONTINUOUS SENTENCE DECODERS ON 154 UNSEEN-ROUND TEST VIDEOS</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Sentence Decoding Strategy (101 Classes)</th>
                <th class="r">Exact Acc (%)</th>
                <th class="r">GER $\downarrow$</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>32-Step Sentence Classifier Only</td>
                <td class="r">20.1</td>
                <td class="r">0.883</td>
              </tr>
              <tr>
                <td>BiGRU-CTC Greedy Path $\rightarrow$ Nearest Sentence</td>
                <td class="r">18.2</td>
                <td class="r">0.742</td>
              </tr>
              <tr>
                <td>BiGRU-CTC Prefix Likelihood Scoring Only</td>
                <td class="r">22.1</td>
                <td class="r">0.724</td>
              </tr>
              <tr class="ieee-row-bold">
                <td>Fused BiGRU-CTC + Classifier ($\lambda = 1.0$)</td>
                <td class="r">29.2</td>
                <td class="r">0.685</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="ieee-subsec">F. 3D Avatar Motion Quality &amp; Real-Time CPU Latency</h3>
        <p>
          Table XI quantifies the impact of Algorithm 3 across all 144 dataset-derived 3D avatar clips. Gap interpolation ($\le 0.40\text{ s}$) and Gaussian trajectory smoothing ($\sigma = 1.5$) eliminated 100% of mid-sign arm drops (from 367 drops across 114 clips down to <strong>0</strong>) and reduced second-derivative wrist acceleration jitter by <strong>36.0%</strong> ($4.42 \rightarrow 2.83\text{ cm/frame}^2$). Table XII confirms that isolated sign classification requires only <strong>3.8 ms</strong> on a commodity CPU, well within real-time interactive budgets.
        </p>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE XI<br/>3D AVATAR MOTION QUALITY BEFORE &amp; AFTER CLEANING (144 CLIPS)</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Objective Kinematic Metric</th>
                <th class="r">Raw Landmarks</th>
                <th class="r">Cleaned (Alg. 3)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Clips exhibiting mid-sign arm drops</td>
                <td class="r">114 / 144 (79.2%)</td>
                <td class="r"><strong>0 / 144 (0.0%)</strong></td>
              </tr>
              <tr>
                <td>Total mid-sign arm drop artefacts</td>
                <td class="r">367</td>
                <td class="r"><strong>0 (-100%)</strong></td>
              </tr>
              <tr>
                <td>Mean wrist jitter ($\text{cm/frame}^2$)</td>
                <td class="r">4.42</td>
                <td class="r"><strong>2.83 (-36.0%)</strong></td>
              </tr>
              <tr>
                <td>Mean active clip duration (s)</td>
                <td class="r">2.36 s</td>
                <td class="r"><strong>2.23 s</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="ieee-table-wrap">
          <div class="ieee-table-cap">TABLE XII<br/>MEASURED PROCESSING LATENCY ON COMMODITY LAPTOP CPU</div>
          <table class="ieee-table">
            <thead>
              <tr>
                <th>Pipeline Stage / Operation</th>
                <th class="r">Measured Latency</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Per-frame feature &amp; segmenter processing</td>
                <td class="r">1.4 ms / frame</td>
              </tr>
              <tr>
                <td>Isolated-sign BiGRU inference (with 3-view TTA)</td>
                <td class="r">3.8 ms / sign</td>
              </tr>
              <tr>
                <td>Continuous greedy CTC decode per sentence</td>
                <td class="r">12.3 ms</td>
              </tr>
              <tr>
                <td>Fused CTC + classifier decode (mean / p95)</td>
                <td class="r">37.0 / 62.0 ms</td>
              </tr>
              <tr>
                <td>3D Avatar IK + Quintic co-articulation render</td>
                <td class="r">60 fps (16.6 ms)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 7 of 8</span>
    </div>
  </section>`;

  // ============================================================================
  // PAGE 8: Sec VIII (Business & SDG Impact), Sec IX (Conclusion), Acknowledgment, 25 IEEE References
  // ============================================================================
  const page8 = String.raw`
  <section class="ieee-page" data-page="8">
    <div class="ieee-running-header">
      <span class="report-project-title">${TITLE}</span>
      <span>DEPT. OF CSBS · B.M.S. COLLEGE OF ENGINEERING, BANGALORE</span>
    </div>

    <div class="ieee-two-col">
      <div class="ieee-col">
        <h2 class="ieee-sec" style="margin-top:0;">VIII. PUBLIC SERVICE DEPLOYMENT, LIMITATIONS AND SDG IMPACT</h2>
        <p>
          <strong>1) Edge Economics &amp; Sustainable Development Goals:</strong> By executing MediaPipe landmarking and ONNX WebAssembly inference directly on existing client CPUs, <em>Silent Bridge</em> eliminates recurring cloud GPU inference costs (~₹1.80 lakh/year per kiosk) and operates offline as a Progressive Web App (PWA). A cross-subsidized social enterprise model provides the B2C community app free forever (₹0) while licensing B2G/B2B service-counter kiosks at ₹12,000/terminal/year (92% lower than on-site human interpretation costs of ₹3.60 lakh/year). The platform directly advances UN SDG 3 (Target 3.8: accessible healthcare triage), SDG 4 (Target 4.5 &amp; 4.a: bilingual ISL–Kannada deaf education), SDG 8 (Target 8.5: inclusive employment), SDG 9 (Target 9.c: frugal edge AI), and SDG 10 (Target 10.2: social and civic inclusion).
        </p>
        <p>
          <strong>2) Limitations &amp; Threats to Validity:</strong> First, all reported recognition accuracies are measured on held-out recorded videos of unseen signers; live webcam accuracy depends on lighting, camera placement, and regional ISL dialect variation (Kerala in Amrita SLR, Chennai in INCLUDE vs. Karnataka). Second, continuous sentence decoding is currently closed-set over 101 corpus sentences, and single training runs exhibit seed variance ($\pm 4.5\%$). Third, avatar clips retargeted from 2D/3D hand/face landmarks estimate depth heuristically from palm scale and require formal linguistic validation by native deaf signers.
        </p>

        <h2 class="ieee-sec">IX. CONCLUSION AND FUTURE WORK</h2>
        <p>
          This paper presented <em>Silent Bridge</em>, a real-time, privacy-preserving bidirectional Indian Sign Language and Kannada translation platform with a procedural 3D signing avatar running on commodity CPU hardware. Through our 147-D face-relative geometric schema, motion segmentation with still-tail trimming, 3-view Test-Time Augmentation, and selective HTTP-range INCLUDE dataset expansion, unseen-signer isolated recognition rose from 54.5% to 76.5% ($p = 0.003$, overall 81.5%, macro-F1 0.800), while fused BiGRU-CTC decoding achieved 29.2% exact-sentence accuracy on unseen rounds and trajectory cleaning eliminated all 367 mid-sign avatar arm drops. Future work includes (i) multi-signer live webcam clinical trials in Karnataka hospitals and civic centers, (ii) open-vocabulary Transformer-CTC translation trained on iSign [9], and (iii) full upper-body pose integration with native deaf community co-design.
        </p>

        <h2 class="ieee-sec">ACKNOWLEDGMENT</h2>
        <p>
          The authors express their sincere gratitude to <strong>Dr. Beemsha Arya</strong> (Principal, B.M.S. College of Engineering), <strong>Dr. R Ashok Kumar</strong> (Professor &amp; Head, Dept. of CSBS, BMSCE), and Project Guide <strong>Tejaswini K</strong> (Assistant Professor, Dept. of CSBS, BMSCE) for their guidance and institutional support. We also thank the creators and deaf signers of the open-access Amrita SLR, INCLUDE, and ISL-CSLTR corpora.
        </p>
      </div>

      <div class="ieee-col">
        <h2 class="ieee-sec" style="margin-top:0;">REFERENCES</h2>
        <ol class="ieee-refs">
          <li><span>[1]</span><span>D. Li, C. Rodriguez, X. Yu, and H. Li, “Word-level deep sign language recognition from video: A new large-scale dataset and methods comparison,” in <em>Proc. IEEE/CVF Winter Conf. Appl. Comput. Vis. (WACV)</em>, Mar. 2020, pp. 1459–1469.</span></li>
          <li><span>[2]</span><span>H. R. Vaezi Joze and O. Koller, “MS-ASL: A large-scale data set and benchmark for understanding American Sign Language,” in <em>Proc. Brit. Mach. Vis. Conf. (BMVC)</em>, Sep. 2019, pp. 1–13.</span></li>
          <li><span>[3]</span><span>O. Koller, J. Forster, and H. Ney, “Continuous sign language recognition: Towards large vocabulary statistical recognition systems handling multiple signers,” <em>Comput. Vis. Image Underst.</em>, vol. 141, pp. 108–125, Dec. 2015.</span></li>
          <li><span>[4]</span><span>N. C. Camgoz, S. Hadfield, O. Koller, H. Ney, and R. Bowden, “Neural sign language translation,” in <em>Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)</em>, Jun. 2018, pp. 7784–7793.</span></li>
          <li><span>[5]</span><span>A. Sridhar, R. G. Ganesan, P. Kumar, and M. Khapra, “INCLUDE: A large scale dataset for Indian Sign Language recognition,” in <em>Proc. 28th ACM Int. Conf. Multimedia (ACM MM)</em>, Oct. 2020, pp. 1366–1375.</span></li>
          <li><span>[6]</span><span>R. Elakkiya and B. Natarajan, “ISL-CSLTR: Indian Sign Language dataset for continuous sign language translation and recognition,” <em>Mendeley Data</em>, vol. 1, 2021, doi: 10.17632/kcmpdxky7p.1.</span></li>
          <li><span>[7]</span><span>R. Sasidharan <em>et al.</em>, “Amrita SLR: Real-time Indian Sign Language dataset,” <em>Mendeley Data</em>, vol. 1, 2025, doi: 10.17632/dtg9s785v8.1.</span></li>
          <li><span>[8]</span><span>A. Joshi, S. Agrawal, and A. Modi, “ISLTranslate: Dataset for translating Indian Sign Language,” in <em>Findings Assoc. Comput. Linguist. (ACL)</em>, Jul. 2023, pp. 10412–10428.</span></li>
          <li><span>[9]</span><span>A. Joshi <em>et al.</em>, “iSign: A benchmark for Indian Sign Language processing,” in <em>Findings Assoc. Comput. Linguist. (ACL)</em>, Aug. 2024, pp. 8920–8938.</span></li>
          <li><span>[10]</span><span>J. Carreira and A. Zisserman, “Quo vadis, action recognition? A new model and the Kinetics dataset,” in <em>Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR)</em>, Jul. 2017, pp. 6299–6308.</span></li>
          <li><span>[11]</span><span>Z. Cao, G. Hidalgo, T. Simon, S.-E. Wei, and Y. Sheikh, “OpenPose: Realtime multi-person 2D pose estimation using Part Affinity Fields,” <em>IEEE Trans. Pattern Anal. Mach. Intell.</em>, vol. 43, no. 1, pp. 172–186, Jan. 2021.</span></li>
          <li><span>[12]</span><span>C. Lugaresi <em>et al.</em>, “MediaPipe: A framework for building perception pipelines,” in <em>Proc. IEEE/CVF CVPR Workshop Real-Time Comput. Vis.</em>, Jun. 2019, pp. 1–9.</span></li>
          <li><span>[13]</span><span>F. Zhang <em>et al.</em>, “MediaPipe Hands: On-device real-time hand tracking,” in <em>Proc. IEEE/CVF CVPR Workshop Comput. Vis. AR/VR</em>, Jun. 2020, pp. 1–7.</span></li>
          <li><span>[14]</span><span>S. Jiang, B. Sun, L. Wang, Y. Bai, K. Li, and Y. Fu, “Skeleton aware multi-modal sign language recognition,” in <em>Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. Workshops (CVPRW)</em>, Jun. 2021, pp. 3413–3423.</span></li>
          <li><span>[15]</span><span>H. Hu, W. Zhao, W. Zhou, Y. Wang, and H. Li, “SignBERT: Pre-training of hand-model-aware representation for sign language recognition,” in <em>Proc. IEEE/CVF Int. Conf. Comput. Vis. (ICCV)</em>, Oct. 2021, pp. 11087–11096.</span></li>
          <li><span>[16]</span><span>K. Cho <em>et al.</em>, “Learning phrase representations using RNN encoder-decoder for statistical machine translation,” in <em>Proc. Conf. Empirical Methods Natural Lang. Process. (EMNLP)</em>, Oct. 2014, pp. 1724–1734.</span></li>
          <li><span>[17]</span><span>M. Schuster and K. K. Paliwal, “Bidirectional recurrent neural networks,” <em>IEEE Trans. Signal Process.</em>, vol. 45, no. 11, pp. 2673–2681, Nov. 1997.</span></li>
          <li><span>[18]</span><span>A. Graves, S. Fernández, F. Gomez, and J. Schmidhuber, “Connectionist temporal classification: Labelling unsegmented sequence data with recurrent neural networks,” in <em>Proc. 23rd Int. Conf. Mach. Learn. (ICML)</em>, Jun. 2006, pp. 369–376.</span></li>
          <li><span>[19]</span><span>T. Hanke, “HamNoSys—Representing sign language data in language resources and language processing contexts,” in <em>Proc. LREC Workshop Represent. Process. Sign Lang.</em>, May 2004, pp. 1–6.</span></li>
          <li><span>[20]</span><span>R. Wolfe <em>et al.</em>, “Sign language avatars: A question of representation,” <em>Information</em>, vol. 13, no. 4, p. 206, Apr. 2022.</span></li>
          <li><span>[21]</span><span>Q. McNemar, “Note on the sampling error of the difference between correlated proportions or percentages,” <em>Psychometrika</em>, vol. 12, no. 2, pp. 153–157, Jun. 1947.</span></li>
          <li><span>[22]</span><span>I. Loshchilov and F. Hutter, “Decoupled weight decay regularization,” in <em>Proc. Int. Conf. Learn. Represent. (ICLR)</em>, May 2019, pp. 1–18.</span></li>
          <li><span>[23]</span><span>M. Popović, “chrF: Character n-gram F-score for automatic MT evaluation,” in <em>Proc. 10th Workshop Stat. Mach. Transl. (WMT)</em>, Sep. 2015, pp. 392–395.</span></li>
          <li><span>[24]</span><span>U. Zeshan, <em>Sign Languages in Indo-Pakistan: A Description of a Signed Language</em>. Amsterdam, Netherlands: John Benjamins Publishing, 2000.</span></li>
          <li><span>[25]</span><span>S. N. Sridhar, <em>Kannada: Descriptive Grammars</em>. London, U.K.: Routledge, 1990.</span></li>
        </ol>
      </div>
    </div>

    <div class="ieee-page-footer">
      <span>SILENT BRIDGE · Dept. of Computer Science and Business Systems (CSBS), B.M.S. College of Engineering, Bangalore – 560019</span>
      <span>Page 8 of 8</span>
    </div>
  </section>`;

  return [page1, page2, page3, page4, page5, page6, page7, page8].join("\n");
}

function convertMathInHtml(rawHtml) {
  const symbols = [
    ["\\leftrightarrow", "↔"],
    ["\\rightarrow", "→"],
    ["\\implies", "⇒"],
    ["\\downarrow", "↓"],
    ["\\uparrow", "↑"],
    ["\\{", "{"],
    ["\\}", "}"],
    ["\\_", "_"],
    ["\\%", "%"],
    ["\\mid", "|"],
    ["\\le", "≤"],
    ["\\ge", "≥"],
    ["\\neq", "≠"],
    ["\\pm", "±"],
    ["\\times", "×"],
    ["\\cdot", "·"],
    ["\\dots", "…"],
    ["\\ldots", "…"],
    ["\\in", "∈"],
    ["\\notin", "∉"],
    ["\\forall", "∀"],
    ["\\exists", "∃"],
    ["\\sum", "∑"],
    ["\\prod", "∏"],
    ["\\infty", "∞"],
    ["\\partial", "∂"],
    ["\\nabla", "∇"],
    ["\\approx", "≈"],
    ["\\equiv", "≡"],
    ["\\propto", "∝"],
    ["\\langle", "⟨"],
    ["\\rangle", "⟩"],
    ["\\|", "‖"],
    ["\\alpha", "α"],
    ["\\beta", "β"],
    ["\\gamma", "γ"],
    ["\\delta", "δ"],
    ["\\Delta", "Δ"],
    ["\\epsilon", "ε"],
    ["\\varepsilon", "ε"],
    ["\\zeta", "ζ"],
    ["\\eta", "η"],
    ["\\theta", "θ"],
    ["\\Theta", "Θ"],
    ["\\kappa", "κ"],
    ["\\lambda", "λ"],
    ["\\Lambda", "Λ"],
    ["\\mu", "μ"],
    ["\\nu", "ν"],
    ["\\xi", "ξ"],
    ["\\pi", "π"],
    ["\\rho", "ρ"],
    ["\\sigma", "σ"],
    ["\\Sigma", "Σ"],
    ["\\tau", "τ"],
    ["\\phi", "φ"],
    ["\\Phi", "Φ"],
    ["\\chi", "χ"],
    ["\\psi", "ψ"],
    ["\\omega", "ω"],
    ["\\Omega", "Ω"],
    ["\\ell", "ℓ"],
  ];

  return rawHtml.replace(/\$([^$]+)\$/g, (_m, expr) => {
    let s = expr.trim();
    s = s.replace(/\{,\}/g, ",");
    s = s.replace(/\\mathbb\{R\}/g, "ℝ");
    s = s.replace(/\\mathcal\{([A-Z])\}/g, "$1");
    s = s.replace(/\\text\{([^{}]+)\}/g, '<span style="font-style:normal;">$1</span>');
    s = s.replace(/\\mathrm\{([^{}]+)\}/g, '<span style="font-style:normal;">$1</span>');
    s = s.replace(/\\mathbf\{([^{}]+)\}/g, "<strong>$1</strong>");
    s = s.replace(/\\hat\{([^{}]+)\}/g, "$1&#770;");
    s = s.replace(/\\tilde\{([^{}]+)\}/g, "$1&#771;");
    s = s.replace(/\\overline\{([^{}]+)\}/g, '<span style="text-decoration:overline;">$1</span>');

    for (const [k, v] of symbols) {
      s = s.split(k).join(v);
    }

    s = s.replace(/\\left\s*/g, "");
    s = s.replace(/\\right\s*/g, "");
    s = s.replace(/\\Big\s*/g, "");
    s = s.replace(/\\big\s*/g, "");
    s = s.replace(/\\!/g, "");
    s = s.replace(/\\quad/g, " &nbsp;&nbsp; ");
    s = s.replace(/\\;/g, " ");
    s = s.replace(/\\,/g, "&#8201;");
    s = s.replace(/\\max/g, '<span style="font-style:normal;">max</span>');
    s = s.replace(/\\min/g, '<span style="font-style:normal;">min</span>');
    s = s.replace(/\\arg/g, '<span style="font-style:normal;">arg</span>');
    s = s.replace(/\\log/g, '<span style="font-style:normal;">log</span>');
    s = s.replace(/\\cos/g, '<span style="font-style:normal;">cos</span>');
    s = s.replace(/\\sin/g, '<span style="font-style:normal;">sin</span>');

    for (let pass = 0; pass < 3; pass++) {
      s = s.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
      s = s.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
    }
    s = s.replace(/_([a-zA-Z0-9*+-]+)/g, "<sub>$1</sub>");
    s = s.replace(/\^([a-zA-Z0-9*+-]+)/g, "<sup>$1</sup>");

    for (let pass = 0; pass < 2; pass++) {
      s = s.replace(/\\binom\{([^{}]+)\}\{([^{}]+)\}/g, "C($1, $2)");
      s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
    }

    return `<span class="ieee-math">${s}</span>`;
  });
}

const bodyHtml = convertMathInHtml(buildIeeePages());

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IEEE Format Research Paper — ${TITLE}</title>
  <style>
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman"), local("TimesNewRomanPSMT"), url("/report/fonts/LiberationSerif-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), url("/report/fonts/LiberationSerif-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman Italic"), local("TimesNewRomanPS-ItalicMT"), url("/report/fonts/LiberationSerif-Italic.ttf") format("truetype");
      font-weight: 400;
      font-style: italic;
      font-display: block;
    }
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman Bold Italic"), local("TimesNewRomanPS-BoldItalicMT"), url("/report/fonts/LiberationSerif-BoldItalic.ttf") format("truetype");
      font-weight: 700;
      font-style: italic;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Times";
      src: local("Times New Roman"), local("TimesNewRomanPSMT"), url("/report/fonts/LiberationSerif-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Times";
      src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), url("/report/fonts/LiberationSerif-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Times";
      src: local("Times New Roman Italic"), local("TimesNewRomanPS-ItalicMT"), url("/report/fonts/LiberationSerif-Italic.ttf") format("truetype");
      font-weight: 400;
      font-style: italic;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Times";
      src: local("Times New Roman Bold Italic"), local("TimesNewRomanPS-BoldItalicMT"), url("/report/fonts/LiberationSerif-BoldItalic.ttf") format("truetype");
      font-weight: 700;
      font-style: italic;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Kannada";
      src: url("/report/fonts/NotoSerifKannada-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: "CSBS-Kannada";
      src: url("/report/fonts/NotoSerifKannada-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #1e293b;
      color: #000000;
      font-size: 9.5pt;
      line-height: 1.24;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
    }

    @media print {
      html, body {
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      .ieee-page {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .ieee-page:last-of-type {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }

    /* Top Preview Toolbar */
    .ieee-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #334155;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      font-size: 13px;
    }
    .ieee-toolbar a, .ieee-toolbar button {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .ieee-toolbar a.secondary, .ieee-toolbar button.secondary {
      background: #334155;
    }

    /* Exact A4 IEEE Two-Column Page */
    .ieee-page {
      width: 210mm;
      height: 297mm;
      padding: 0.52in 0.55in 0.48in 0.55in;
      margin: 20px auto;
      background: #ffffff;
      color: #000000;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* Banner on Page 1 & Running Header on Pages 2-8 */
    .ieee-top-banner, .ieee-running-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 6.2pt;
      font-style: italic;
      color: #1e293b;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 2.5pt;
      margin-bottom: 6pt;
      flex-shrink: 0;
      letter-spacing: 0.1px;
    }
    .ieee-running-header {
      font-size: 5.5pt;
    }
    .ieee-running-header > span:first-child {
      font-weight: 700;
      color: #000000;
      white-space: nowrap;
    }
    .ieee-running-header > span:last-child {
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Title & 4-Author IEEE Header Block */
    .ieee-title-area {
      text-align: center;
      margin-bottom: 8pt;
      flex-shrink: 0;
    }
    .ieee-paper-title {
      font-size: 15.5pt;
      font-weight: 700;
      line-height: 1.18;
      margin: 2pt 0 8pt 0;
      letter-spacing: 0.15px;
      color: #000000;
    }
    .ieee-authors-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6pt;
      border-bottom: 0.6px solid #cbd5e1;
      padding-bottom: 6pt;
    }
    .ieee-author-card {
      text-align: center;
      line-height: 1.22;
    }
    .ieee-author-name {
      font-size: 10pt;
      font-weight: 700;
      margin-bottom: 1.5pt;
    }
    .ieee-author-affil {
      font-size: 8pt;
      font-style: italic;
      color: #1e293b;
    }
    .ieee-author-id {
      font-size: 8pt;
      font-weight: 700;
      margin-top: 1pt;
    }

    /* Two-Column Balanced Grid */
    .ieee-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.20in;
      flex: 1 1 auto;
      min-height: 0;
      align-content: start;
      overflow: hidden;
    }
    .ieee-col {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-width: 0;
    }

    /* Abstract & Index Terms (IEEE 9pt Bold Italic Lead-In) */
    .ieee-abstract {
      font-size: 8.6pt;
      line-height: 1.22;
      text-align: justify;
      text-indent: 0 !important;
      margin: 0 0 5pt 0;
    }
    .ieee-keywords {
      font-size: 8.5pt;
      line-height: 1.20;
      text-align: justify;
      text-indent: 0 !important;
      margin: 0 0 6pt 0;
    }

    /* IEEE Section (Roman Numeral Centered Small-Caps) & Subsection (Italic Lettered) */
    .ieee-sec {
      font-size: 9.8pt;
      font-weight: 700;
      font-variant: small-caps;
      text-align: center;
      margin: 6pt 0 3pt 0;
      letter-spacing: 0.3px;
      color: #000000;
    }
    .ieee-subsec {
      font-size: 9.2pt;
      font-weight: 700;
      font-style: italic;
      text-align: left;
      margin: 4.5pt 0 2pt 0;
      color: #000000;
    }

    p {
      font-size: 9.1pt;
      line-height: 1.24;
      text-align: justify;
      text-indent: 1em;
      margin: 0 0 3.5pt 0;
    }

    .ieee-list {
      font-size: 8.9pt;
      line-height: 1.22;
      text-align: justify;
      margin: 1.5pt 0 4pt 0;
      padding-left: 13pt;
    }
    .ieee-list li {
      margin-bottom: 2pt;
    }

    code {
      font-style: normal;
      font-size: inherit;
    }

    .ieee-math {
      font-style: italic;
    }

    /* IEEE Equations */
    .ieee-eq {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.2pt 6pt;
      margin: 2.5pt 0;
      background: #f8fafc;
      border-left: 2px solid #0f172a;
      font-size: 8.8pt;
    }
    .ieee-eq-num {
      font-weight: 700;
      margin-left: 8pt;
      white-space: nowrap;
    }

    /* IEEE Tables (Caption Above, Roman Numeral, Small Caps, Top/Bottom Rules) */
    .ieee-table-wrap {
      margin: 4.5pt 0;
      width: 100%;
    }
    .ieee-table-cap {
      font-size: 7.8pt;
      font-weight: 700;
      font-variant: small-caps;
      text-align: center;
      line-height: 1.18;
      margin-bottom: 2.5pt;
      letter-spacing: 0.2px;
    }
    .ieee-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      line-height: 1.18;
      border-top: 1.2px solid #000000;
      border-bottom: 1.2px solid #000000;
    }
    .ieee-table th {
      border-bottom: 0.8px solid #000000;
      padding: 2pt 3pt;
      text-align: left;
      font-weight: 700;
      background: #f8fafc;
    }
    .ieee-table td {
      padding: 1.8pt 3pt;
      border-bottom: 0.4px solid #cbd5e1;
      text-align: left;
      vertical-align: top;
    }
    .ieee-table th.r, .ieee-table td.r {
      text-align: right;
      white-space: nowrap;
    }
    .ieee-row-bold td {
      font-weight: 700;
      background: #f1f5f9;
      border-top: 0.6px solid #000000;
    }
    .ieee-table-foot {
      font-size: 7.2pt;
      font-style: italic;
      margin-top: 1.5pt;
    }

    /* IEEE Figures */
    .ieee-fig-box {
      margin: 4pt 0;
      padding: 3pt;
      border: 0.6px solid #cbd5e1;
      background: #ffffff;
      text-align: center;
    }
    .ieee-fig-box img {
      width: 100%;
      max-height: 138px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .ieee-fig-wide {
      margin: 0 0 6pt 0;
      padding: 3pt 6pt;
      border: 0.6px solid #cbd5e1;
      background: #ffffff;
      text-align: center;
      flex-shrink: 0;
    }
    .ieee-fig-cap {
      font-size: 7.8pt;
      line-height: 1.18;
      text-align: justify;
      margin-top: 2.5pt;
    }

    /* IEEE Algorithms */
    .ieee-alg-box {
      border-top: 1.2px solid #000000;
      border-bottom: 1.2px solid #000000;
      margin: 4pt 0;
      background: #f8fafc;
      font-size: 7.8pt;
      line-height: 1.20;
    }
    .ieee-alg-title {
      padding: 2pt 4pt;
      border-bottom: 0.6px solid #000000;
      background: #f1f5f9;
    }
    .ieee-alg-body {
      padding: 2.5pt 5pt;
    }

    /* IEEE References */
    .ieee-refs {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 7.6pt;
      line-height: 1.17;
    }
    .ieee-refs li {
      display: grid;
      grid-template-columns: 18pt 1fr;
      margin-bottom: 2.2pt;
      text-align: justify;
    }
    .ieee-refs li > span:first-child {
      font-weight: 700;
    }

    /* Page Footer */
    .ieee-page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.5pt;
      border-top: 0.6px solid #64748b;
      padding-top: 2.5pt;
      margin-top: 4pt;
      color: #1e293b;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="ieee-toolbar no-print">
    <div>
      <strong>IEEE Two-Column Research Paper — ${TITLE}</strong>
      <span style="margin-left:10px; color:#cbd5e1;">8 Pages · IEEEtran Standard · Times New Roman · 12 Tables · 7 Figures · 25 References</span>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <a href="/api/paper/download-docx" download="SILENT_BRIDGE_IEEE_Research_Paper.docx">⬇ Download IEEE Word (.docx)</a>
      <a class="secondary" href="/api/paper/download-pdf" download="SILENT_BRIDGE_IEEE_Research_Paper.pdf">⬇ Download IEEE Paper PDF</a>
      <a class="secondary" href="/api/paper/download-tex" download="SILENT_BRIDGE_IEEE_Paper.tex">⬇ Download LaTeX (.tex)</a>
      <button class="secondary" onclick="window.print()">🖨 Print / Save as PDF</button>
    </div>
  </div>

  ${bodyHtml}
</body>
</html>
`;

const outPublicPath = path.join(ROOT, "frontend", "public", "report", "SILENT_BRIDGE_IEEE_Research_Paper.html");
const outDocsPath = path.join(ROOT, "docs", "paper", "kannada_signbridge_ieee.html");

fs.mkdirSync(path.dirname(outPublicPath), { recursive: true });
fs.writeFileSync(outPublicPath, fullHtml, "utf8");

console.log("[generate-ieee-paper] Generated 8-page IEEE Research Paper ->", outPublicPath);
