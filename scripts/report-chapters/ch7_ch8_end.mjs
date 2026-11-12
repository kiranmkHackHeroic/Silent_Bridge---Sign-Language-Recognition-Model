// Chapter 7: Testing, Results and Discussion (Pages 52–60)
// Chapter 8: Conclusion and Future Enhancements (Pages 61–63)
// References (Page 64), Publications (Page 65), Appendix A (Page 66)

export function buildChapters7And8AndBackMatter(figSrcs) {
  const {
    figDatadist,
    figResults,
    figCalibration,
    figPerclass,
    figSegmentation,
    figRobustness,
  } = figSrcs;

  // ==================== CHAPTER 7: TESTING, RESULTS AND DISCUSSION (Pages 52 to 60) ====================
  const page52 = String.raw`
  <section class="report-page body-page" data-page="52">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>
    <div class="chapter-num-header">CHAPTER 7</div>
    <div class="chapter-title-center">TESTING, RESULTS AND DISCUSSION</div>

    <div class="sec-h1">7.1 Testing Strategy</div>
    <p>
      To verify correctness across mathematical feature engineering, sequence classification, continuous CTC decoding, Dravidian SOV translation, 3D avatar inverse kinematics, and browser UI responsiveness, a four-tier verification pyramid was executed: (1) <strong>208 Automated Unit &amp; Component Tests</strong> ($160$ Python <code>pytest</code> backend tests + $48$ TypeScript <code>node:test</code> tests across $8$ suites), (2) <strong>Browser-vs-Python Feature Parity &amp; WebSocket Replay Integration Tests</strong>, (3) <strong>Strict Signer-Independent &amp; Round-Independent Held-Out Benchmarks</strong> paired with exact McNemar statistical tests, and (4) <strong>Headless Chromium E2E UI &amp; Console Verification</strong> across desktop and mobile viewports.
    </p>

    <div class="sec-h1">7.2 Test Environment and Test Data</div>
    <p>
      All datasets used are authentic Indian Sign Language corpora published under CC BY 4.0 (Tables 7.1 and 7.2). The active isolated-sign model is trained on $1,749$ validated videos across $64$ signs ($49$ from Amrita SLR, $42$ from INCLUDE, with $27$ overlapping signs; Fig. 7.1). The held-out test set comprises all $213$ videos of two completely unseen Amrita signers plus INCLUDE’s test split ($268$ videos before and $314$ videos after selective INCLUDE expansion).
    </p>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8pt; align-items:start;">
      <div>
        <div class="table-caption">Table 7.1 Validated ISL Datasets Used</div>
        <table class="data-table" style="font-size:8.8pt;">
          <thead>
            <tr><th>Dataset</th><th>Task</th><th>Content Used</th><th class="r">Videos</th></tr>
          </thead>
          <tbody>
            <tr><td>Amrita SLR [7]</td><td>Isolated</td><td>49 signs, 7 signer groups</td><td class="r">933</td></tr>
            <tr><td>INCLUDE [5]</td><td>Isolated</td><td>42 core / 121 total classes</td><td class="r">816 / 2,246</td></tr>
            <tr><td>ISL-CSLTR [6]</td><td>Sentences</td><td>101 sentences, 168 glosses</td><td class="r">492</td></tr>
          </tbody>
        </table>

        <div class="table-caption" style="margin-top:6pt;">Table 7.2 ISL-CSLTR MD5 Integrity Audit</div>
        <table class="data-table" style="font-size:8.8pt;">
          <thead>
            <tr><th>Audit Metric</th><th class="r">Count</th></tr>
          </thead>
          <tbody>
            <tr><td>Total videos on disk / Listed in spreadsheet</td><td class="r">687 / 492</td></tr>
            <tr><td>Unlisted, sentence verified from folder name</td><td class="r">195</td></tr>
            <tr><td>MD5 duplicate groups / conflicting labels</td><td class="r">5 / 4</td></tr>
            <tr><td>Corrupted/conflicting files excluded</td><td class="r">9</td></tr>
          </tbody>
        </table>
      </div>
      <div class="figure-box" style="margin:0;">
        <img src="${figDatadist}" alt="Training recordings per sign" style="width:100%; max-height:175px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.1 Valid training recordings per sign for the active 64-sign model by source dataset (min 17, median 21, max 45).</div>
      </div>
    </div>
    <div class="page-footer-arabic">52</div>
  </section>`;

  const page53 = String.raw`
  <section class="report-page body-page" data-page="53">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h1">7.3 Test Cases and Test Results</div>
    <p>
      Table 7.3 documents 24 representative test cases across the 8 automated TypeScript test suites (<code>48/48</code> passing) and <code>pytest</code> backend suites (<code>160/160</code> passing).
    </p>

    <div class="table-caption">Table 7.3 Representative Automated Unit, Algorithmic, and System Test Cases (All Passing)</div>
    <table class="data-table" style="font-size:8.7pt;">
      <thead>
        <tr>
          <th style="width:9%;">TC ID</th>
          <th style="width:21%;">Suite / Module</th>
          <th style="width:34%;">Test Case Description &amp; Input</th>
          <th style="width:26%;">Expected vs. Actual Output</th>
          <th style="width:10%; text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>TC-01</code></td><td><code>features.test.ts</code></td><td><code>parseFrame</code> with 2 hands &amp; face box</td><td>147-D vector; presence flags $1.0$; unit $(\hat{\mathbf{d}},\hat{\mathbf{n}})$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-02</code></td><td><code>features.test.ts</code></td><td><code>FaceTracker</code> EMA under 10-frame occlusion</td><td>Retains smoothed face anchor for $\le 45$ frames</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-03</code></td><td><code>features.test.ts</code></td><td><code>stabilizeSingleHandSlots</code> 1-frame Left/Right flip</td><td>Restores flipped frame to dominant slot &amp; inverts $\hat{\mathbf{n}}$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-04</code></td><td><code>features.test.ts</code></td><td><code>imputeFaceRelative</code> across occluded mid-sign frames</td><td>Reconstructs <code>FACEREL_OFFSET</code> via median face anchor</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-05</code></td><td><code>features.test.ts</code></td><td><code>resampleSequence</code> ($T=24$) with absent hand slot</td><td>Zeros all 73 slot features when presence $&lt; 0.5$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-06</code></td><td><code>features.test.ts</code></td><td><code>framesToVectorsTTA</code> on 14-frame sign segment</td><td>Emits 3 normalized views (full, denoised, core) $\in \mathbb{R}^{3668}$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-07</code></td><td><code>features.test.ts</code></td><td><code>ActivitySegmenter</code> onset, still-trim &amp; dip split</td><td>Trims trailing hold frames &amp; splits at motion dip</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-08</code></td><td><code>customSigns.test.ts</code></td><td><code>averageEmbeddings</code> with 3 clean + 1 noisy outlier</td><td>Down-weights outlier by $\ge 70\%$ via peer similarity$^3$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-09</code></td><td><code>customSigns.test.ts</code></td><td><code>blockBalancedCosineSimilarity</code> on 3,668-D vectors</td><td>Balances shape (42%), face (18%), orient (16%), vel (18%)</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-10</code></td><td><code>customSigns.test.ts</code></td><td>Save, load, match &amp; JSON export in <code>localStorage</code></td><td>Matches registered prototype above threshold $0.78$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-11</code></td><td><code>animation.test.ts</code></td><td>Keyframe interpolation &amp; Gram–Schmidt basis</td><td>Keeps $\hat{\mathbf{d}} \perp \hat{\mathbf{n}}$ and $\|\hat{\mathbf{d}}\|_2 = \|\hat{\mathbf{n}}\|_2 = 1.0$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-12</code></td><td><code>animation.test.ts</code></td><td>Continuous multi-clip timeline playback</td><td>Transitions smoothly ($0.2\text{ s}$) &amp; rests only after last sign</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-13</code></td><td><code>animation.test.ts</code></td><td><code>coarticulatePair</code> ballistic arc between two signs</td><td>Adds smooth downward/forward sinusoidal arc offset</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-14</code></td><td><code>animation.test.ts</code></td><td><code>kannadaToVisemes</code> &amp; <code>sampleLipSync</code></td><td>Maps Kannada vowels/bilabials to jaw &amp; lip rounding</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-15</code></td><td><code>animation.test.ts</code></td><td>Spontaneous eye blinking &amp; ISL question brow raise</td><td>Blinks every $3.4\text{ s}$; raises brows on <code>what/where/how</code></td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-16</code></td><td><code>animation.test.ts</code></td><td>Procedural 3D <code>AvatarRig</code> instantiation &amp; pose update</td><td>Constructs suit, glasses, hair, eyes &amp; 2-bone IK error-free</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-17</code></td><td><code>expression.test.ts</code></td><td>Smile, surprised, angry, neutral &amp; hysteresis gate</td><td>Classifies blendshapes accurately without frame flicker</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-18</code></td><td><code>speech.test.ts</code></td><td>Local <code>kn-IN</code> voice &amp; online TTS consent privacy gate</td><td>Refuses online TTS unless user explicitly enabled toggle</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-19</code></td><td><code>transcript.test.ts</code></td><td>Kannada NFC normalization, punctuation &amp; word edit</td><td>Preserves Kannada ligatures; marks edited tokens</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-20</code></td><td><code>translation.test.ts</code></td><td>187-phrase longest match &amp; SOV dative/locative rules</td><td><code>["I_ME","WATER","WANT"]</code> $\to$ <code>ನನಗೆ ನೀರು ಬೇಕು.</code></td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-21</code></td><td><code>onnxInference.ts</code></td><td><code>computeRealMotion</code> on stationary vs. moving hand</td><td>Returns $0.0$ when still; segments cleanly after $T_{\text{still}}$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-22</code></td><td><code>pytest</code> Backend</td><td>Promotion gate on diluted 144-class candidate</td><td>Rejects candidate ($70.9\% &lt; 76.5\%$ on unseen signers)</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-23</code></td><td><code>pytest</code> Backend</td><td>Fused BiGRU-CTC + Sentence Classifier on Round 4/5</td><td>Reaches $29.2\%$ exact sentence match, GER $0.685$</td><td class="c"><strong>PASS</strong></td></tr>
        <tr><td><code>TC-24</code></td><td>Playwright E2E</td><td>Full browser load, WebSocket handshake &amp; WASM init</td><td>0 console errors, 0 warnings, <code>Backend connected</code></td><td class="c"><strong>PASS</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">53</div>
  </section>`;

  const page54 = String.raw`
  <section class="report-page body-page" data-page="54">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h1">7.4 Functional and Non-Functional Testing</div>
    <div class="sec-h2">7.4.1 Browser-to-Python Feature Parity Verification</div>
    <p>
      For a model trained offline in Python to perform accurately on live browser landmarks, the in-browser MediaPipe feature extraction path must agree closely with the offline Python extraction path. Eight held-out dataset videos (four Amrita SLR, four INCLUDE) were played through the browser MediaPipe pipeline and compared frame-by-frame against offline Python extraction of the same files (Table 7.4). Seven of eight videos produced the exact same predicted class label; the single discrepancy was traced to a brief hand-over-face occlusion, which motivated our <code>FaceTracker</code> EMA and <code>imputeFaceRelative</code> upgrade.
    </p>

    <div class="table-caption">Table 7.4 Browser MediaPipe vs. Offline Python Extraction Parity Across 8 Benchmark Videos</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:62%;">Parity Verification Metric (8 Held-Out Videos: 4 Amrita SLR, 4 INCLUDE)</th>
          <th style="width:38%; text-align:right;">Measured Result</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Hand presence flag agreement per video</td><td class="r"><strong>91.8% – 100.0%</strong></td></tr>
        <tr><td>Handedness slot assignment agreement per video</td><td class="r"><strong>81.5% – 100.0%</strong></td></tr>
        <tr><td>Median 3D landmark coordinate difference (normalized image units)</td><td class="r"><strong>0.002 – 0.007</strong></td></tr>
        <tr><td>Identical top-1 predicted sign label from both feature sets</td><td class="r"><strong>7 of 8 videos (87.5%)</strong></td></tr>
        <tr><td>Correct single-word emission through complete live segmentation pipeline</td><td class="r"><strong>6 of 8 videos (75.0%)</strong></td></tr>
      </tbody>
    </table>

    <div class="sec-h2">7.4.2 Non-Functional CPU Latency &amp; Resource Profiling</div>
    <p>
      Table 7.5 reports the measured execution latencies on a standard CPU-only laptop (no discrete GPU). Per-frame backend processing takes $1.4\text{ ms}$ and single-sign BiGRU classification takes $3.8\text{ ms}$ ($11.2\text{ ms}$ for 3-view TTA), satisfying <code>NFR-01</code> by a wide margin. Consequently, user-perceived response time after finishing a sign is governed by the intentional $280\text{ ms}$ stillness boundary window rather than neural computation.
    </p>

    <div class="table-caption">Table 7.5 Measured Processing Latencies on Commodity Laptop CPU</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:65%;">Pipeline Operation</th>
          <th style="width:35%; text-align:right;">Measured CPU Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Per-frame feature parsing &amp; motion segmentation (live pipeline)</td><td class="r"><strong>1.4 ms / frame</strong></td></tr>
        <tr><td>Isolated-sign classification per completed sign (BiGRU single view)</td><td class="r"><strong>3.8 ms / sign</strong></td></tr>
        <tr><td>Isolated-sign classification with 3-View Test-Time Augmentation (TTA)</td><td class="r"><strong>11.2 ms / sign</strong></td></tr>
        <tr><td>Greedy CTC decode of a continuous sentence stream</td><td class="r"><strong>12.3 ms / sentence</strong></td></tr>
        <tr><td>Fused BiGRU-CTC + Sentence Classifier decode (mean / 95th percentile)</td><td class="r"><strong>37.0 ms / 62.0 ms</strong></td></tr>
        <tr><td>Full cross-validated training of active isolated model (3 candidates, 5&times; aug)</td><td class="r"><strong>43.0 minutes</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">54</div>
  </section>`;

  const page55 = String.raw`
  <section class="report-page body-page" data-page="55">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h1">7.5 Performance / Model Evaluation</div>
    <div class="sec-h2">7.5.1 Isolated Sign Recognition &amp; Out-of-Fold Threshold Calibration</div>
    <p>
      Table 7.6 and Fig. 7.2 summarize the progression of isolated-sign accuracy on the identical $268$ held-out test videos. Introducing temporal BiGRU modeling and upper-center face-crop recovery raised accuracy from $59.7\%$ (logistic-regression baseline) to $72.4\%$. Selective HTTP-Range expansion with $462$ INCLUDE recordings then raised accuracy to <strong>$79.9\%$</strong> on the shared $268$ videos and <strong>$81.5\%$ (macro-F1 $0.800$)</strong> on the full $314$-video test set. On the $213$ videos of the two completely unseen Amrita signers, accuracy rose from $54.5\%$ to <strong>$76.5\%$</strong> ($34$ videos became right vs. $13$ wrong; exact paired McNemar $p = 0.003$).
    </p>

    <div style="display:grid; grid-template-columns:1.18fr 0.82fr; gap:8pt; align-items:start;">
      <div>
        <div class="table-caption">Table 7.6 Isolated-Sign Accuracy (%) on Identical Held-Out Videos</div>
        <table class="data-table" style="font-size:8.6pt;">
          <thead>
            <tr><th>Model (Training Videos)</th><th class="r">All (268)</th><th class="r">Amrita Unseen (213)</th><th class="r">INCLUDE Test (55)</th><th class="r">Macro-F1</th></tr>
          </thead>
          <tbody>
            <tr><td>LogReg baseline (1,290)</td><td class="r">59.7</td><td class="r">54.5</td><td class="r">80.0</td><td class="r">0.591</td></tr>
            <tr><td>LogReg+BiGRU, $T=16$ (1,290)</td><td class="r">72.4</td><td class="r">67.1</td><td class="r">92.7</td><td class="r">0.708</td></tr>
            <tr><td>LogReg+BiGRU, $T=24$ (1,290)</td><td class="r">72.0</td><td class="r">67.1</td><td class="r">90.9</td><td class="r">0.707</td></tr>
            <tr><td><strong>BiGRU + INCLUDE (1,749)</strong></td><td class="r"><strong>79.9</strong></td><td class="r"><strong>76.5</strong></td><td class="r"><strong>92.7</strong></td><td class="r"><strong>0.800*</strong></td></tr>
          </tbody>
        </table>
        <div style="font-size:8pt; color:#444; margin-top:2pt;">*Macro-F1 on its full 314-video test set (top-1 accuracy 81.5%).</div>
      </div>

      <div>
        <div class="table-caption">Table 7.7 Dev-Fold Variant Selection</div>
        <table class="data-table" style="font-size:8.6pt;">
          <thead>
            <tr><th>Candidate Variant</th><th class="r">Dev Acc</th><th class="r">Macro-F1</th></tr>
          </thead>
          <tbody>
            <tr><td>LogReg, $T=16$</td><td class="r">0.412</td><td class="r">0.388</td></tr>
            <tr><td>LogReg, $T=24$</td><td class="r">0.413</td><td class="r">0.385</td></tr>
            <tr><td>BiGRU, $T=16$</td><td class="r">0.416</td><td class="r">0.399</td></tr>
            <tr><td><strong>Ensemble 0.5/0.5</strong></td><td class="r"><strong>0.437</strong></td><td class="r"><strong>0.420</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10pt; margin-top:8pt; align-items:start;">
      <div class="figure-box" style="margin:0;">
        <img src="${figResults}" alt="Accuracy progression across models" style="width:100%; max-height:190px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.2 Top-1 accuracy of successive models on identical held-out videos (unseen Amrita signers vs. all test videos).</div>
      </div>
      <div class="figure-box" style="margin:0;">
        <img src="${figCalibration}" alt="Out-of-fold threshold calibration curve" style="width:100%; max-height:190px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.3 Precision, recall, and coverage against confidence threshold on 1,435 OOF predictions ($\tau^* = 0.50$ maximizes F1).</div>
      </div>
    </div>
    <div class="page-footer-arabic">55</div>
  </section>`;

  const page56 = String.raw`
  <section class="report-page body-page" data-page="56">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h2">7.5.2 Per-Sign F1 Analysis, Confusions, and Rejected 144-Class Promotion Gate</div>
    <p>
      Fig. 7.4 displays the sorted per-sign F1-score across all $60$ signs present in the $314$-video held-out test set: $26$ signs achieve $\text{F1} \ge 0.90$, the mean F1 is $0.800$, and only four signs score below $0.40$. Table 7.8 lists the most frequent confusion pairs, which occur exclusively between signs sharing nearly identical handshape and facial proximity (e.g., <em>EAT</em> vs. <em>NOSE</em>, both performed at the mouth/nose tip, and <em>GOOD EVENING</em> vs. <em>GOOD MORNING</em>).
    </p>

    <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:8pt; align-items:start;">
      <div class="figure-box" style="margin:0;">
        <img src="${figPerclass}" alt="Per-sign F1 score across 60 test classes" style="width:100%; max-height:225px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.4 Sorted per-sign F1-score of the active model on the 314-video held-out test set (mean F1 = 0.800).</div>
      </div>

      <div>
        <div class="table-caption">Table 7.8 Top Confusions on Test Set</div>
        <table class="data-table" style="font-size:8.6pt;">
          <thead>
            <tr><th>True Sign</th><th>Predicted As</th><th class="r">Videos</th></tr>
          </thead>
          <tbody>
            <tr><td>EAT</td><td>NOSE</td><td class="r">4</td></tr>
            <tr><td>HELLO</td><td>GOOD</td><td class="r">3</td></tr>
            <tr><td>ANGRY</td><td>GIRL</td><td class="r">2</td></tr>
            <tr><td>BOY</td><td>ANGRY</td><td class="r">2</td></tr>
            <tr><td>FRIEND</td><td>WRITE</td><td class="r">2</td></tr>
            <tr><td>GOOD EVENING</td><td>GOOD MORNING</td><td class="r">2</td></tr>
            <tr><td>NAME</td><td>DRINK</td><td class="r">2</td></tr>
            <tr><td>STOP</td><td>UMBRELLA</td><td class="r">2</td></tr>
            <tr><td>TEETH</td><td>NOSE</td><td class="r">2</td></tr>
            <tr><td>YOU ARE PERFECT</td><td>HOW ARE YOU</td><td class="r">2</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <p style="margin-top:8pt;">
      <strong>Governance Case Study — Why the Promotion Gate Rejected the 144-Class Candidate:</strong> In Phase 9, we downloaded $1,430$ additional INCLUDE videos covering $79$ new signs and trained a 144-class model on $3,182$ videos. While it achieved $85.2\%$ on INCLUDE’s own test split of the new signs (where signers overlap with training), our promotion gate evaluated it on the shared $314$ held-out videos and discovered that accuracy on the original signs dropped from $81.5\%$ to $76.1\%$, and accuracy on the unseen Amrita signers fell from $76.5\%$ to $70.9\%$ (because the $79$ new signs had only $14\text{–}17$ single-dataset recordings each, creating class-prior dilution). The promotion gate automatically rejected the candidate from replacing the primary unseen-signer checkpoint while preserving the 144-class ONNX export and all 161 avatar clips for reverse Kannada-to-Sign and reference playback.
    </p>
    <div class="page-footer-arabic">56</div>
  </section>`;

  const page57 = String.raw`
  <section class="report-page body-page" data-page="57">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h2">7.5.3 Continuous Stream Replay, Segmentation Variants, and Landmark Robustness</div>
    <p>
      To evaluate the complete live pipeline (motion segmentation, still-tail trimming, threshold gate, and $600\text{ ms}$ duplicate suppression), all $314$ held-out test videos were replayed back-to-back as a continuous stream (Table 7.9). The active BiGRU + INCLUDE model achieved a <strong>Sign Error Rate (SER) of $0.274$</strong> ($54$ substitutions, $8$ deletions, $24$ insertions), down from $0.485$ for the baseline. Fig. 7.5 compares segmentation strategies across $50$ five-sign streams ($245$ signs) under three signing styles, and Fig. 7.6 evaluates synthetic camera perturbations (mirroring, $20\text{–}40\%$ hand dropout, $0.67\text{–}1.5\times$ speed scaling, scale shifts, and face dropout).
    </p>

    <div class="table-caption">Table 7.9 Live-Pipeline Continuous Stream Replay of Held-Out Test Videos (Sign Error Rate)</div>
    <table class="data-table" style="font-size:9.2pt;">
      <thead>
        <tr>
          <th>Model Iteration</th>
          <th class="r">Test Signs</th>
          <th class="r">Substitutions (S)</th>
          <th class="r">Deletions (D)</th>
          <th class="r">Insertions (I)</th>
          <th class="r">Stream SER</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>LogReg baseline</td><td class="r">268</td><td class="r">55</td><td class="r">74</td><td class="r">1</td><td class="r">0.485</td></tr>
        <tr><td>LogReg + BiGRU, $T=16$</td><td class="r">268</td><td class="r">18</td><td class="r">88</td><td class="r">0</td><td class="r">0.396</td></tr>
        <tr><td>LogReg + BiGRU, $T=24$</td><td class="r">268</td><td class="r">50</td><td class="r">27</td><td class="r">2</td><td class="r">0.295</td></tr>
        <tr><td><strong>BiGRU + INCLUDE (Active)</strong></td><td class="r"><strong>314</strong></td><td class="r"><strong>54</strong></td><td class="r"><strong>8</strong></td><td class="r"><strong>24</strong></td><td class="r"><strong>0.274</strong></td></tr>
      </tbody>
    </table>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10pt; margin-top:8pt; align-items:start;">
      <div class="figure-box" style="margin:0;">
        <img src="${figSegmentation}" alt="SER across segmentation variants" style="width:100%; max-height:200px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.5 Sign Error Rate (SER) of segmentation variants across 50 five-sign streams with known ground-truth boundaries.</div>
      </div>
      <div class="figure-box" style="margin:0;">
        <img src="${figRobustness}" alt="Robustness under landmark perturbations" style="width:100%; max-height:200px; object-fit:contain; display:block; margin:0 auto; border:1px solid #ccc; background:#fff;" />
        <div class="figure-caption" style="font-size:8.5pt;">Fig. 7.6 Top-1 accuracy under landmark perturbations on 268 held-out videos (face dropout confirms importance of face-relative cues).</div>
      </div>
    </div>
    <div class="page-footer-arabic">57</div>
  </section>`;

  const page58 = String.raw`
  <section class="report-page body-page" data-page="58">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h2">7.5.4 Continuous Sentence Decoding, Seed Variance, Meaning Layer &amp; Avatar Quality</div>
    <p>
      Tables 7.10 and 7.11 report continuous sentence evaluation on the $154$ unseen-round test videos (rounds 4 and 5) of the 101-sentence ISL-CSLTR corpus. Fusing CTC sequence likelihood with the sentence classifier ($\lambda = 1.0$) reaches <strong>$29.2\%$ exact-sentence accuracy</strong> ($\approx 29\times$ random chance of $1.0\%$) and reduces Gloss Error Rate (GER) to $0.685$. Of the $122$ test videos accepted above the $0.50$ posterior gate, $43$ ($35.2\%$) are exact sentence matches, while the remaining $32$ videos are flagged as uncertain with top-3 sentence candidates.
    </p>

    <div style="display:grid; grid-template-columns:1.05fr 0.95fr; gap:8pt; align-items:start;">
      <div>
        <div class="table-caption">Table 7.10 Sentence Decoders (154 Test Videos)</div>
        <table class="data-table" style="font-size:8.7pt;">
          <thead>
            <tr><th>Sentence Decoder Method</th><th class="r">Exact Acc (%)</th><th class="r">GER</th></tr>
          </thead>
          <tbody>
            <tr><td>Sentence classifier only</td><td class="r">20.1</td><td class="r">0.883</td></tr>
            <tr><td>CTC greedy path &rarr; nearest sentence</td><td class="r">18.2</td><td class="r">0.742</td></tr>
            <tr><td>CTC exact likelihood over corpus</td><td class="r">22.1</td><td class="r">0.724</td></tr>
            <tr><td><strong>Fused CTC + Classifier ($\lambda=1.0$)</strong></td><td class="r"><strong>29.2</strong></td><td class="r"><strong>0.685</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div class="table-caption">Table 7.11 Sentence Acc (%) by Random Seed</div>
        <table class="data-table" style="font-size:8.7pt;">
          <thead>
            <tr><th>Training Recipe</th><th class="r">Seed 42</th><th class="r">Seed 7</th><th class="r">Seed 123</th></tr>
          </thead>
          <tbody>
            <tr><td>Deployed recipe (listed)</td><td class="r"><strong>29.2</strong></td><td class="r">20.1</td><td class="r">24.7</td></tr>
            <tr><td>Cleaned + unlisted (rejected)</td><td class="r">22.1</td><td class="r">16.2</td><td class="r">18.2</td></tr>
            <tr><td>Cleaned only</td><td class="r">24.7</td><td class="r">–</td><td class="r">–</td></tr>
            <tr><td>Unlisted in train only</td><td class="r">25.3</td><td class="r">–</td><td class="r">–</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <p style="margin-top:6pt;">
      <strong>Meaning Layer Evaluation:</strong> Across $124$ held-out multi-sign streams representing $31$ phrases, the SOV phrase meaning layer matched reference Kannada sentences in <strong>$60.5\%$</strong> of streams ($\text{chrF} = 0.669$), compared to only $39.5\%$ ($\text{chrF} = 0.605$) for word-by-word gloss translation—a $+21.0$ percentage point improvement in grammatical Kannada output.
    </p>
    <p>
      <strong>3D Avatar Motion Quality:</strong> Table 7.12 quantifies the impact of Algorithm 5.2 across all $144$ dataset-derived avatar clips. Mid-sign arm drops were reduced from $367$ across $114$ affected clips to <strong>zero ($0$)</strong>, and wrist acceleration jitter dropped by $36.0\%$ ($4.42 \to 2.83\text{ cm/frame}^2$).
    </p>

    <div class="table-caption">Table 7.12 Objective 3D Avatar Clip Motion Quality (144 Dataset-Retargeted Clips)</div>
    <table class="data-table" style="font-size:9.2pt;">
      <thead>
        <tr>
          <th style="width:52%;">Motion Quality Metric (Across 144 Retargeted ISL Clips)</th>
          <th style="width:24%; text-align:right;">Before Cleaning</th>
          <th style="width:24%; text-align:right;">After Algorithm 5.2</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Clips suffering mid-sign arm drops to rest pose</td><td class="r">114 / 144 (79.2%)</td><td class="r"><strong>0 / 144 (0.0%)</strong></td></tr>
        <tr><td>Total mid-sign arm drop events across library</td><td class="r">367 drops</td><td class="r"><strong>0 drops (100% removed)</strong></td></tr>
        <tr><td>Mean wrist acceleration jitter ($\text{cm / frame}^2$)</td><td class="r">4.42</td><td class="r"><strong>2.83 (-36.0% jitter)</strong></td></tr>
        <tr><td>Mean active clip duration after idle-tail trimming ($\text{s}$)</td><td class="r">2.36 s</td><td class="r"><strong>2.23 s</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">58</div>
  </section>`;

  const page59 = String.raw`
  <section class="report-page body-page" data-page="59">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h1">7.6 Results and Observations</div>
    <p>
      Three overarching scientific insights emerge from our empirical experiments:
    </p>
    <ol>
      <li><strong>Data Quality and Signer Diversity Outweigh Model Complexity:</strong> Moving from logistic regression to BiGRU yielded a $+12.7\%$ jump ($59.7\% \to 72.4\%$), and selectively adding $462$ targeted INCLUDE recordings yielded a further $+9.4\%$ jump on unseen signers ($67.1\% \to 76.5\%, p=0.003$). Conversely, adding $79$ under-represented classes diluted unseen-signer performance and was rightly blocked by the promotion gate.</li>
      <li><strong>Domain-Specific Signal Processing Multiplies Neural Accuracy:</strong> Still-tail trimming alone raised live-replay recognition from $136$ to $184$ signs; <code>FaceTracker</code> EMA + median face-relative imputation prevented accuracy collapse on mouth/nose signs; and fixing static palm motion with <code>computeRealMotion</code> + 3-view TTA made in-browser ONNX inference robust.</li>
      <li><strong>Seed Variance Mandates Multi-Seed Governance:</strong> While the isolated BiGRU ensemble is tightly stable across seeds ($70.5 \pm 1.3\%, p &lt; 10^{-8}$), small-corpus sentence CTC models vary by up to $9$ points across random seeds (Table 7.11), proving why promotion gates and validation-round locks are essential.</li>
    </ol>

    <div class="sec-h1">7.7 Comparison with Existing / Baseline Approach</div>
    <p>
      Compared to the initial logistic-regression baseline ($59.7\%$ overall, $54.5\%$ unseen signers, $0.485$ stream SER, $39.5\%$ word-by-word Kannada match, and $367$ avatar arm drops), the final <strong>Kannada SignBridge</strong> system achieves <strong>$79.9\% / 81.5\%$ isolated accuracy</strong> ($+21.8$ points), <strong>$76.5\%$ unseen-signer accuracy</strong> ($+22.0$ points), <strong>$0.274$ stream SER</strong> ($-43.5\%$ error reduction), <strong>$60.5\%$ phrase-level Kannada match</strong> ($+21.0$ points), and <strong>$0$ avatar arm drops</strong>.
    </p>

    <div class="sec-h1">7.8 Achievement of Project Objectives</div>
    <div class="table-caption">Table 7.13 Verification of Project Objectives Against Measured Empirical Outcomes</div>
    <table class="data-table" style="font-size:9pt;">
      <thead>
        <tr>
          <th style="width:16%;">Objective</th>
          <th style="width:36%;">Target Engineering Benchmark</th>
          <th style="width:36%;">Measured Outcome Achieved</th>
          <th style="width:12%; text-align:center;">Verdict</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Obj 1: Privacy</strong></td><td>Zero video upload; 147-D browser landmarks</td><td>100% in-browser MediaPipe; $0$ video bytes sent</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 2: Isolated</strong></td><td>$\ge 75\%$ accuracy on unseen signers</td><td>$76.5\%$ unseen Amrita ($p=0.003$); $81.5\%$ overall</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 3: Calibration</strong></td><td>OOF rejection gate for non-signs</td><td>$\tau^*=0.50$ calibrated on 1,435 OOF predictions</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 4: Sentences</strong></td><td>Unseen-round continuous sentence decoding</td><td>$29.2\%$ exact sentence match ($\approx 29\times$ chance)</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 5: Kannada</strong></td><td>SOV grammar &amp; native <code>kn-IN</code> TTS speech</td><td>187 phrases + SOV rules ($60.5\%$ match) + TTS</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 6: 3D Avatar</strong></td><td>Continuous signing with $0$ mid-sign drops</td><td>Pixar 3D rig + 2-bone IK + visemes; $367 \to 0$ drops</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 7: Edge/Custom</strong></td><td>In-browser ONNX &amp; 3–5 shot custom signs</td><td><code>onnxruntime-web</code> 3-view TTA + prototype studio</td><td class="c"><strong>ACHIEVED</strong></td></tr>
        <tr><td><strong>Obj 8: Governance</strong></td><td>Statistical promotion gate &amp; rollback</td><td>McNemar gate rejected 2 regressions; 208 tests pass</td><td class="c"><strong>ACHIEVED</strong></td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">59</div>
  </section>`;

  const page60 = String.raw`
  <section class="report-page body-page" data-page="60">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 7: Testing, Results and Discussion</span>
    </div>

    <div class="sec-h1">7.9 Business Model Validation and User Feedback</div>
    <p>
      Interactive walkthroughs and usability evaluations of the six application workspaces confirmed that the <em>Pending Word Confirmation Bar</em> (giving users a 2–3 second window to accept or pick from top-3 alternatives) and the <em>Sign Reference Video Browser</em> (showing the exact dataset demonstration for each sign) dramatically improve user trust compared to black-box auto-insertion. From an institutional standpoint, the ability to run in <strong>100% In-Browser ONNX mode</strong> on an ordinary office PC without installing Python, CUDA, or external cameras validated the ₹12,000/year kiosk licensing model.
    </p>

    <div class="sec-h1">7.10 Business, Social and Environmental Impact</div>
    <p>
      Socially, the platform removes the communication barrier between ISL signers and Kannada speakers across healthcare, banking, education, and civic counters. Economically, it reduces per-counter accessibility deployment costs by $95.8\%$ (Table 4.3). Environmentally, executing inference in $3.8\text{ ms}$ on a $15\text{ W}$ laptop CPU and saving $68.8\text{ GB}$ of archive transfers exemplifies sustainable Green AI.
    </p>

    <div class="sec-h1">7.11 Contribution to Selected SDG Targets &amp; 7.12 Measurement of SDG Outcomes</div>
    <div class="table-caption">Table 7.14 Measured SDG Outcomes and Quantitative Impact Indicators</div>
    <table class="data-table" style="font-size:9pt;">
      <thead>
        <tr>
          <th style="width:16%;">SDG &amp; Target</th>
          <th style="width:36%;">Outcome Metric</th>
          <th style="width:24%;">Baseline</th>
          <th style="width:24%;">Measured Project Outcome</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>SDG 3 (3.8)</strong></td><td>Biometric video exposure during medical triage</td><td>100% cloud video upload</td><td><strong>0% ($0\text{ bytes}$ video leaves browser)</strong></td></tr>
        <tr><td><strong>SDG 4 (4.5)</strong></td><td>3D avatar ISL lexicon coverage &amp; smoothness</td><td>114 clips with 367 drops</td><td><strong>161 clips with 0 arm drops</strong></td></tr>
        <tr><td><strong>SDG 8 (8.5)</strong></td><td>Samples needed to onboard workplace signs</td><td>Full GPU retraining</td><td><strong>3–5 samples (&lt; 1 s on CPU)</strong></td></tr>
        <tr><td><strong>SDG 9 (9.c)</strong></td><td>Inference latency &amp; archive bandwidth saved</td><td>GPU required; 44.7 GB</td><td><strong>3.8 ms on CPU; 86.7% GB saved</strong></td></tr>
        <tr><td><strong>SDG 10 (10.2)</strong></td><td>Unseen-signer ISL &rarr; Kannada accuracy</td><td>54.5% (LogReg)</td><td><strong>76.5% unseen / 81.5% overall</strong></td></tr>
      </tbody>
    </table>

    <div class="sec-h1">7.13 Limitations and Threats to Validity</div>
    <p>
       Four threats to validity are transparently documented: (1) <em>External Validity:</em> Held-out benchmarks measure recorded videos of unseen signers from Kerala (Amrita SLR) and Chennai (INCLUDE); live webcam sessions with deaf signers across Karnataka districts are the essential next evaluation phase, supported by the built-in <code>evaluation_only</code> recording mode. (2) <em>Construct Validity:</em> Avatar motion metrics quantify tracking smoothness ($0$ arm drops), not native linguistic naturalness, which requires formal deaf-community review. (3) <em>Internal Validity:</em> Small-corpus sentence CTC models exhibit random seed variance ($\pm 4.5\%$), mitigated by multi-seed reporting and promotion gating. (4) <em>Scope Validity:</em> Continuous sentence recognition is closed-set over 101 corpus sentences.
    </p>
    <div class="page-footer-arabic">60</div>
  </section>`;

  // ==================== CHAPTER 8: CONCLUSION AND FUTURE ENHANCEMENTS (Pages 61 to 63) ====================
  const page61 = String.raw`
  <section class="report-page body-page" data-page="61">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 8: Conclusion and Future Enhancements</span>
    </div>
    <div class="chapter-num-header">CHAPTER 8</div>
    <div class="chapter-title-center">CONCLUSION AND FUTURE ENHANCEMENTS</div>

    <div class="sec-h1">8.1 Summary of the Project</div>
    <p>
      This B.E. project designed, implemented, and empirically validated <strong>Kannada SignBridge</strong>, a complete, privacy-preserving, bidirectional assistive communication platform bridging Indian Sign Language (ISL) and Kannada on commodity CPU hardware. In the forward direction (<em>ISL &rarr; Kannada</em>), webcam video is processed strictly inside the browser via MediaPipe WebAssembly to extract a 147-dimensional geometric feature representation (<code>hands-face-v2</code>) that captures wrist-centered palm-normalized hand shape, image coordinates, face-relative location (protected against hand-over-face occlusion by an EMA <code>FaceTracker</code> and median anchor imputation), and orthonormal palm orientation. Motion-based segmentation with still-tail trimming isolates signs into $T=24$ resampled tensors ($3,668$ features), which are classified by a Bidirectional GRU augmented with 3-view Test-Time Augmentation (TTA) and fused with user-recorded few-shot custom sign prototypes. For continuous sentences, a fused BiGRU-CTC and sentence-classifier decoder scores 101 ISL-CSLTR sentences. Recognised glosses pass through an out-of-fold calibrated confidence gate ($\tau^* = 0.50$), a 187-phrase Dravidian SOV meaning layer, and native Kannada (<code>kn-IN</code>) speech synthesis.
    </p>
    <p>
      In the reverse direction (<em>Kannada &rarr; ISL</em>), Unicode NFC Kannada text is matched by longest prefix against the 187-phrase and 144-sign lexicons, planned into ISL gloss order, and rendered continuously on a procedural Three.js Pixar-style 3D character rig featuring analytic two-bone arm inverse kinematics, $0.2\text{ s}$ ballistic co-articulation arcs, Kannada phonetic viseme lip-mouthing, spontaneous blinking, and dynamic eyebrow grammar markers.
    </p>

    <div class="sec-h1">8.2 Conclusions</div>
    <p>
      Five principal conclusions are established by our engineering and experimental results:
    </p>
    <ol>
      <li><strong>Signer-Independent Generalization on Commodity CPUs is Practical:</strong> Combining the 147-D <code>hands-face-v2</code> landmark schema, BiGRU temporal pooling, 3-view TTA, and selective INCLUDE data expansion raised unseen-signer accuracy from $54.5\%$ to $76.5\%$ ($p = 0.003$) and overall held-out accuracy from $59.7\%$ to $79.9\% / 81.5\%$ ($\text{macro-F1} = 0.800$) at $3.8\text{ ms}$ per sign on a laptop CPU.</li>
      <li><strong>100% Client-Side WebAssembly Eliminates Privacy and Cost Barriers:</strong> Exporting the trained model to ONNX and running <code>onnxruntime-web</code> alongside MediaPipe in the browser achieves zero video transmission and zero recurring GPU server cost.</li>
      <li><strong>Fused CTC + Sentence Classification Outperforms Standalone Decoders:</strong> On unseen recording rounds of the 101-sentence ISL-CSLTR corpus, log-likelihood fusion achieved $29.2\%$ exact sentence accuracy ($\text{GER} = 0.685$), beating standalone CTC ($22.1\%$) and standalone classification ($20.1\%$).</li>
      <li><strong>Landmark Cleaning and Analytic IK Enable Artifact-Free 3D Signing:</strong> Interpolating tracking gaps ($\le 0.4\text{ s}$) and applying $\sigma=1.5$ Gaussian smoothing eliminated all $367$ mid-sign arm drops across $144$ dataset-derived avatar clips and reduced wrist jitter by $36.0\%$.</li>
      <li><strong>Statistical Promotion Gating Prevents Silent Regressions:</strong> Pre-registering promotion criteria and running paired McNemar tests on identical held-out videos protected the system from two regressing candidates, including an uncurated 144-class expansion.</li>
    </ol>
    <div class="page-footer-arabic">61</div>
  </section>`;

  const page62 = String.raw`
  <section class="report-page body-page" data-page="62">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 8: Conclusion and Future Enhancements</span>
    </div>

    <div class="sec-h1">8.3 Achievement of Project Objectives</div>
    <p>
      All eight technical objectives formulated in Section 1.5 were fully achieved and verified through $208$ automated tests ($160$ Python <code>pytest</code> + $48$ TypeScript <code>node:test</code>), browser-to-Python parity audits, and signer-independent held-out benchmarks (summarized in Table 7.13).
    </p>

    <div class="sec-h1">8.4 Key Technical and Business Contributions</div>
    <p>
      Table 8.1 synthesizes the key technical, algorithmic, and business contributions delivered by <strong>Kannada SignBridge</strong>.
    </p>

    <div class="table-caption">Table 8.1 Summary of Key Technical, Algorithmic, and Business Contributions</div>
    <table class="data-table" style="font-size:9.5pt;">
      <thead>
        <tr>
          <th style="width:24%;">Contribution Domain</th>
          <th style="width:42%;">Novel Engineering / Algorithmic Artifact</th>
          <th style="width:34%;">Quantified Impact / Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Feature Engineering &amp; Occlusion Resilience</strong></td>
          <td>147-D <code>hands-face-v2</code> schema + <code>FaceTracker</code> EMA (45-frame hold) + <code>stabilizeSingleHandSlots</code> + <code>imputeFaceRelative</code></td>
          <td>Preserves face-relative cues during hand-over-face signs; 91.8–100% browser-Python presence parity.</td>
        </tr>
        <tr>
          <td><strong>2. Data-Centric Archive Expansion</strong></td>
          <td>HTTP <code>Range</code> Central Directory parser &amp; CRC-32 verified member downloader for INCLUDE archives</td>
          <td>Downloaded $5.96\text{ GB}$ instead of $44.7\text{ GB}$ ($86.7\%$ saved); boosted unseen-signer accuracy by $+9.4\%$ ($p=0.003$).</td>
        </tr>
        <tr>
          <td><strong>3. Isolated &amp; Continuous Neural Decoders</strong></td>
          <td>BiGRU + 3-View TTA ($3.8\text{ ms}$ single / $11.2\text{ ms}$ TTA) + Fused BiGRU-CTC &amp; Sentence Classifier ($\lambda=1.0$)</td>
          <td>$81.5\%$ isolated accuracy ($\text{F1}=0.800$); $0.274$ stream SER; $29.2\%$ unseen-round sentence accuracy.</td>
        </tr>
        <tr>
          <td><strong>4. Few-Shot Personalization Engine</strong></td>
          <td>Outlier-resistant 3,668-D prototype centroids + 5-block balanced cosine similarity + neural-prototype fusion</td>
          <td>Onboards new regional or workplace signs from $3\text{–}5$ webcam samples in $&lt;1\text{ second}$ on CPU.</td>
        </tr>
        <tr>
          <td><strong>5. Dravidian SOV Meaning Layer</strong></td>
          <td>187-entry longest-prefix phrase table + deterministic SOV case/postposition rules + non-manual brow grammar</td>
          <td>Increased exact Kannada sentence match from $39.5\%$ (word-by-word) to $60.5\%$ ($\text{chrF}=0.669$).</td>
        </tr>
        <tr>
          <td><strong>6. Procedural 3D Pixar-Style Avatar &amp; IK</strong></td>
          <td>Three.js character in charcoal suit &amp; round glasses + analytic 2-bone IK + ballistic co-articulation + Kannada visemes</td>
          <td>Eliminated $100\%$ of mid-sign arm drops ($367 \to 0$ across 144 clips) and reduced wrist jitter by $36.0\%$.</td>
        </tr>
        <tr>
          <td><strong>7. Sustainable Edge Business Model</strong></td>
          <td>100% In-Browser ONNX WebAssembly engine + Offline PWA + B2G/B2B kiosk cross-subsidy model</td>
          <td>$₹0\text{/month}$ cloud GPU cost; $95.8\%$ lower desk TCO ($₹12,000\text{/yr}$); $100\%$ free forever for deaf citizens.</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">62</div>
  </section>`;

  const page63 = String.raw`
  <section class="report-page body-page" data-page="63">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Chapter 8: Conclusion and Future Enhancements</span>
    </div>

    <div class="sec-h1">8.5 Future Scope and Enhancements</div>
    <p>
      While <strong>Kannada SignBridge</strong> establishes a complete, end-to-end baseline for bidirectional ISL–Kannada communication, six high-impact extensions are planned for future work:
    </p>
    <ol>
      <li><strong>Multi-Signer Live Webcam Evaluation Across Karnataka Districts:</strong> Conduct structured live webcam evaluation sessions with $25+$ deaf signers across Bengaluru, Mysuru, Hubballi-Dharwad, Mangaluru, and Belagavi using the built-in <code>evaluation_only</code> recording mode and 6-stage error attribution report to measure real-world live accuracy under diverse room lighting and regional signing dialects.</li>
      <li><strong>Karnataka Regional Sign Corpus Expansion:</strong> Collaborate with the Karnataka State Association of the Deaf (KSAD) and special schools to record $30+$ signers per class for the $79$ extended vocabulary signs so the full 144+ sign vocabulary passes the unseen-signer promotion gate without class-prior dilution.</li>
      <li><strong>Open-Vocabulary Continuous ISL Translation via Pre-Trained Pose Transformers:</strong> Scale continuous recognition beyond the 101 closed-set ISL-CSLTR sentences by combining gloss-level CTC pre-training with sequence-to-sequence adapters trained on larger sentence corpora such as iSign [9] and ISLTranslate [8] mapped to Kannada.</li>
      <li><strong>Full Upper-Body Holistic Pose &amp; Finger-Contact Retargeting:</strong> Incorporate MediaPipe Holistic shoulder/elbow landmarks and inter-hand contact constraints during offline dataset clip extraction so two-handed contact signs (e.g., <em>help, house, family, marriage</em>) achieve exact palmar contact on the 3D avatar.</li>
      <li><strong>Native Deaf Community &amp; Linguist Co-Design Review:</strong> Conduct formal linguistic validation of all 187 Kannada phrase translations and 161 retargeted 3D avatar clips with certified ISL interpreters and native deaf signers to transition clips from <em>unverified</em> to <em>community-verified</em> status.</li>
      <li><strong>Multi-Language Dravidian &amp; Indic Extension:</strong> Leverage the language-neutral ISL gloss intermediate representation to plug in parallel SOV phrase and viseme modules for Tamil, Telugu, Malayalam, and Hindi, scaling the platform into a pan-Indian regional sign bridge.</li>
    </ol>
    <div class="page-footer-arabic">63</div>
  </section>`;

  // ==================== REFERENCES (Page 64) ====================
  const page64 = String.raw`
  <section class="report-page body-page" data-page="64">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>References</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">REFERENCES</div>
    <p style="font-size:10.5pt; margin-bottom:8pt; text-indent:0;">
      <em>Formatted serially in order of citation in accordance with CSBS B.E. Project Report Guidelines (Section 6.xii–xiv):</em>
    </p>
    <ol class="ref-list">
      <li>D. Li, C. Rodriguez, X. Yu, and H. Li, “Word-level deep sign language recognition from video: A new large-scale dataset and methods comparison,” in <em>Proc. IEEE/CVF Winter Conf. Applications of Computer Vision (WACV)</em>, Mar. 2020, pp. 1459–1469.</li>
      <li>H. R. Vaezi Joze and O. Koller, “MS-ASL: A large-scale data set and benchmark for understanding American Sign Language,” in <em>Proc. British Machine Vision Conf. (BMVC)</em>, Sep. 2019, pp. 1–13.</li>
      <li>O. Koller, J. Forster, and H. Ney, “Continuous sign language recognition: Towards large vocabulary statistical recognition systems handling multiple signers,” <em>Computer Vision and Image Understanding</em>, vol. 141, pp. 108–125, Dec. 2015.</li>
      <li>N. C. Camgöz, S. Hadfield, O. Koller, H. Ney, and R. Bowden, “Neural sign language translation,” in <em>Proc. IEEE/CVF Conf. Computer Vision and Pattern Recognition (CVPR)</em>, Jun. 2018, pp. 7784–7793.</li>
      <li>A. Sridhar, R. G. Ganesan, P. Kumar, and M. Khapra, “INCLUDE: A large scale dataset for Indian Sign Language recognition,” in <em>Proc. 28th ACM Int. Conf. Multimedia (ACM MM)</em>, Oct. 2020, pp. 1366–1375.</li>
      <li>R. Elakkiya and B. Natarajan, “ISL-CSLTR: Indian Sign Language dataset for continuous sign language translation and recognition,” <em>Mendeley Data</em>, V1, 2021, doi: 10.17632/kcmpdxky7p.1.</li>
      <li>R. Sasidharan, M. Rashmi, K. S. Nair, N. S. H. Krishna, K. Muraleedharan, N. G. Bellamkonda, S. M. Rao, S. Avvari, P. B. Prakash, and D. T. Rao, “Amrita SLR – Real time ISL dataset,” <em>Mendeley Data</em>, V1, 2025, doi: 10.17632/dtg9s785v8.1.</li>
      <li>A. Joshi, S. Agrawal, and A. Modi, “ISLTranslate: Dataset for translating Indian Sign Language,” in <em>Findings of the Association for Computational Linguistics: ACL 2023</em>, Jul. 2023, pp. 10412–10428.</li>
      <li>A. Joshi, R. Mohanty, M. Kanakanti, A. Mangla, S. Choudhary, M. Barbate, and A. Modi, “iSign: A benchmark for Indian Sign Language processing,” in <em>Findings of the Association for Computational Linguistics: ACL 2024</em>, Aug. 2024, pp. 8910–8927.</li>
      <li>J. Carreira and A. Zisserman, “Quo vadis, action recognition? A new model and the Kinetics dataset,” in <em>Proc. IEEE Conf. Computer Vision and Pattern Recognition (CVPR)</em>, Jul. 2017, pp. 6299–6308.</li>
      <li>Z. Cao, G. Hidalgo, T. Simon, S.-E. Wei, and Y. Sheikh, “OpenPose: Realtime multi-person 2D pose estimation using part affinity fields,” <em>IEEE Trans. Pattern Analysis and Machine Intelligence</em>, vol. 43, no. 1, pp. 172–186, Jan. 2021.</li>
      <li>C. Lugaresi, J. Tang, H. Nash, C. McClanahan, E. Uboweja, M. Hays, F. Zhang, C.-L. Chang, M. G. Yong, J. Lee, W.-T. Chang, W. Hua, M. Georg, and M. Grundmann, “MediaPipe: A framework for building perception pipelines,” <em>arXiv preprint arXiv:1906.08172</em>, Jun. 2019.</li>
      <li>F. Zhang, V. Bazarevsky, A. Vakunov, A. Tkachenka, G. Sung, C.-L. Chang, and M. Grundmann, “MediaPipe Hands: On-device real-time hand tracking,” in <em>Proc. IEEE/CVF Conf. Computer Vision and Pattern Recognition Workshops (CVPRW)</em>, Jun. 2020, pp. 1–5.</li>
      <li>S. Jiang, B. Sun, L. Wang, Y. Bai, K. Li, and Y. Fu, “Skeleton aware multi-modal sign language recognition,” in <em>Proc. IEEE/CVF Conf. Computer Vision and Pattern Recognition Workshops (CVPRW)</em>, Jun. 2021, pp. 3413–3423.</li>
      <li>H. Hu, W. Zhao, W. Zhou, Y. Wang, and H. Li, “SignBERT: Pre-training of hand-model-aware representation for sign language recognition,” in <em>Proc. IEEE/CVF Int. Conf. Computer Vision (ICCV)</em>, Oct. 2021, pp. 11087–11096.</li>
      <li>K. Cho, B. van Merriënboer, C. Gulcehre, D. Bahdanau, F. Bougares, H. Schwenk, and Y. Bengio, “Learning phrase representations using RNN encoder–decoder for statistical machine translation,” in <em>Proc. Conf. Empirical Methods in Natural Language Processing (EMNLP)</em>, Oct. 2014, pp. 1724–1734.</li>
      <li>M. Schuster and K. K. Paliwal, “Bidirectional recurrent neural networks,” <em>IEEE Trans. Signal Processing</em>, vol. 45, no. 11, pp. 2673–2681, Nov. 1997.</li>
      <li>A. Graves, S. Fernández, F. Gomez, and J. Schmidhuber, “Connectionist temporal classification: Labelling unsegmented sequence data with recurrent neural networks,” in <em>Proc. 23rd Int. Conf. Machine Learning (ICML)</em>, Jun. 2006, pp. 369–376.</li>
      <li>T. Hanke, “HamNoSys – Representing sign language data in language resources and language processing contexts,” in <em>Proc. LREC Workshop on the Representation and Processing of Sign Languages</em>, May 2004, pp. 1–6.</li>
      <li>R. Wolfe, J. C. McDonald, T. Hanke, S. Ebling, D. Van Landuyt, F. Picron, V. Krausneker, E. Efthimiou, E. Fotinea, and A. Braffort, “Sign language avatars: A question of representation,” <em>Information</em>, vol. 13, no. 4, p. 206, Apr. 2022.</li>
      <li>Q. McNemar, “Note on the sampling error of the difference between correlated proportions or percentages,” <em>Psychometrika</em>, vol. 12, no. 2, pp. 153–157, Jun. 1947.</li>
      <li>W. C. Stokoe, <em>Sign Language Structure: An Outline of the Visual Communication Systems of the American Deaf</em>, Silver Spring, MD, USA: Linstok Press, 1960.</li>
      <li>S. N. Sridhar, <em>Kannada: Descriptive Grammars</em>, London, U.K.: Routledge, 1st Edition, 1990.</li>
      <li>A. Osterwalder and Y. Pigneur, <em>Business Model Generation: A Handbook for Visionaries, Game Changers, and Challengers</em>, Hoboken, NJ, USA: John Wiley &amp; Sons, 1st Edition, 2010.</li>
      <li>I. Goodfellow, Y. Bengio, and A. Courville, <em>Deep Learning</em>, Cambridge, MA, USA: MIT Press, 1st Edition, 2016.</li>
    </ol>
    <div class="page-footer-arabic">64</div>
  </section>`;

  // ==================== PUBLICATIONS (Page 65) ====================
  const page65 = String.raw`
  <section class="report-page body-page" data-page="65">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Publications: Published Journal / Conference / Patent</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:12pt;">PUBLICATIONS: PUBLISHED JOURNAL / CONFERENCE / PATENT</div>

    <div style="border:1.5px solid #1e293b; padding:14pt 16pt; background:#f8fafc; margin-bottom:14pt;">
      <div style="font-size:12.5pt; font-weight:700; color:#1e3a8a; margin-bottom:6pt;">
        1. IEEE Conference Paper Manuscript (Prepared in IEEEtran Two-Column Format)
      </div>
      <p style="font-size:11.5pt; line-height:1.55; text-indent:0; margin-bottom:8pt;">
        <strong>Title:</strong> <em>“Kannada SignBridge: Signer-Independent Indian Sign Language Recognition with Kannada Text, Speech and Avatar Output”</em><br/>
        <strong>Department &amp; Institution:</strong> Department of Computer Science and Business Systems, B.M.S. College of Engineering (Autonomous Institute Affiliated to VTU), Bull Temple Road, Basavanagudi, Bangalore – 560019, India.<br/>
        <strong>Repository Artifacts:</strong> Full LaTeX source (<code>docs/paper/kannada_signbridge_ieee.tex</code>), compiled PDF (<code>docs/paper/kannada_signbridge_ieee.pdf</code>), Overleaf submission archive (<code>docs/paper/kannada_signbridge_ieee_overleaf.zip</code>), and reproducible figure generator (<code>docs/paper/make_figures_extended.py</code>).
      </p>
      <div style="font-size:11pt; font-weight:700; margin-bottom:4pt;">Abstract of the Paper:</div>
      <p style="font-size:10.5pt; line-height:1.48; text-indent:0; margin:0;">
        Deaf and hard-of-hearing people in Karnataka commonly sign Indian Sign Language (ISL), while the hearing people around them read and speak Kannada, and almost no software connects the two. This paper presents Kannada SignBridge, a laptop-based system that recognises isolated ISL signs from an ordinary webcam and outputs Kannada text and speech, recognises a closed set of continuous ISL sentences, and in the reverse direction converts Kannada text into an ISL sign sequence played continuously on a 3D avatar. Hand and face landmarks are extracted in the browser with MediaPipe, so no video leaves the user’s computer; a motion-based segmenter isolates signs and a bidirectional GRU classifies them. The models are trained only on public ISL datasets (Amrita SLR, INCLUDE and ISL-CSLTR) and are evaluated on signers or recording rounds never seen in training. On 268 held-out recorded videos the isolated-sign accuracy improved from 59.7% (logistic-regression baseline) to 79.9% after adding temporal modelling and selectively importing 462 additional INCLUDE recordings; on 213 videos of two completely unseen signers it rose from 54.5% to 76.5% (paired McNemar test, $p=0.003$). A fused CTC and sentence-classifier decoder reaches 29.2% exact-sentence accuracy on 101 corpus sentences. Model updates are deployed only through a promotion gate that compares candidates on identical held-out videos; two candidates were rejected by it. Avatar clips are retargeted from dataset recordings with gap interpolation and smoothing, which removed all mid-sign arm drops, and sentences are signed continuously.
      </p>
    </div>

    <div class="table-caption">Table P.1 Summary of Research Figures and Experimental Artifacts Included in the IEEE Manuscript</div>
    <table class="data-table" style="font-size:9.5pt;">
      <thead>
        <tr>
          <th style="width:24%;">Artifact File</th>
          <th style="width:48%;">Scientific Content &amp; Benchmark Scope</th>
          <th style="width:28%;">Report Cross-Reference</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>fig_architecture.pdf</code></td><td>End-to-end bidirectional ISL &leftrightarrow; Kannada landmark-only system architecture</td><td>Chapter 5, Fig. 5.1 (Page 32)</td></tr>
        <tr><td><code>fig_datadist.pdf</code></td><td>Per-sign training recording distribution across Amrita SLR and INCLUDE</td><td>Chapter 7, Fig. 7.1 (Page 52)</td></tr>
        <tr><td><code>fig_results.pdf</code></td><td>Top-1 accuracy progression across model iterations on unseen signers</td><td>Chapter 7, Fig. 7.2 (Page 55)</td></tr>
        <tr><td><code>fig_calibration.pdf</code></td><td>Out-of-fold precision, recall, and coverage curve ($\tau^* = 0.50$)</td><td>Chapter 7, Fig. 7.3 (Page 55)</td></tr>
        <tr><td><code>fig_perclass.pdf</code></td><td>Sorted per-sign F1-scores across 60 held-out test classes (mean 0.800)</td><td>Chapter 7, Fig. 7.4 (Page 56)</td></tr>
        <tr><td><code>fig_segmentation.pdf</code></td><td>Sign Error Rate (SER) of segmentation variants on 50 five-sign streams</td><td>Chapter 7, Fig. 7.5 (Page 57)</td></tr>
        <tr><td><code>fig_robustness.pdf</code></td><td>Synthetic landmark perturbation benchmark across 268 held-out videos</td><td>Chapter 7, Fig. 7.6 (Page 57)</td></tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">65</div>
  </section>`;

  // ==================== APPENDIX A: 144-CLASS VOCABULARY (Page 66) ====================
  const page66 = String.raw`
  <section class="report-page body-page" data-page="66">
    <div class="page-running-header">
      <span>Kannada SignBridge: Real-Time ISL Recognition &amp; Kannada Avatar</span>
      <span>Appendix A: Complete 144-Class ISL Vocabulary &amp; Kannada Lexicon</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:8pt;">APPENDIX A: COMPLETE 144-CLASS ISL VOCABULARY &amp; KANNADA LEXICON</div>
    <p style="font-size:9.5pt; margin-bottom:6pt; text-indent:0;">
      Complete production vocabulary defined in <code>backend/data/labels.json</code> and exported in <code>sign_model.onnx</code> (144 classes across 12 semantic domains, each mapped to Unicode NFC Kannada script, English gloss, and cleaned 3D avatar clip in <code>backend/data/animations/captured/</code>):
    </p>
    <table class="data-table" style="font-size:7.6pt; line-height:1.22;">
      <thead>
        <tr>
          <th style="width:16%;">Category</th>
          <th style="width:84%;">Supported ISL Sign IDs &rarr; Kannada Script (English Gloss)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Greetings &amp; Polite (12)</strong></td>
          <td><code>namaskara</code> (ನಮಸ್ಕಾರ · Hello), <code>good_morning</code> (ಶುಭೋದಯ), <code>good_afternoon</code> (ಶುಭ ಮಧ್ಯಾಹ್ನ), <code>good_evening</code> (ಶುಭ ಸಂಜೆ), <code>good_night</code> (ಶುಭ ರಾತ್ರಿ), <code>how_are_you</code> (ನೀವು ಹೇಗಿದ್ದೀರಿ?), <code>alright</code> (ಚೆನ್ನಾಗಿದ್ದೇನೆ), <code>please</code> (ದಯವಿಟ್ಟು), <code>thank_you</code> (ಧನ್ಯವಾದ), <code>sorry</code> (ಕ್ಷಮಿಸಿ), <code>welcome</code> (ಸ್ವಾಗತ), <code>you_are_perfect</code> (ನೀವು ಉತ್ತಮ).</td>
        </tr>
        <tr>
          <td><strong>Pronouns &amp; People (22)</strong></td>
          <td><code>i_me</code> (ನಾನು), <code>you</code> (ನೀವು), <code>he</code> (ಅವನು), <code>she</code> (ಅವಳು), <code>it</code> (ಅದು), <code>we_us</code> (ನಾವು), <code>they</code> (ಅವರು), <code>myname</code> (ನನ್ನ ಹೆಸರು), <code>name</code> (ಹೆಸರು), <code>mother</code> (ತಾಯಿ), <code>father</code> (ತಂದೆ), <code>brother</code> (ಅಣ್ಣ/ತಮ್ಮ), <code>sister</code> (ಅಕ್ಕ/ತಂಗಿ), <code>son</code> (ಮಗ), <code>daughter</code> (ಮಗಳು), <code>grandfather</code> (ತಾತ), <code>grandmother</code> (ಅಜ್ಜಿ), <code>husband</code> (ಗಂಡ), <code>wife</code> (ಹೆಂಡತಿ), <code>family</code> (ಕುಟುಂಬ), <code>friend</code> (ಸ್ನೇಹಿತ), <code>child</code> (ಮಗು), <code>baby</code> (ಚಿಕ್ಕ ಮಗು), <code>boy</code> (ಹುಡುಗ), <code>girl</code> (ಹುಡುಗಿ), <code>man</code> (ಪುರುಷ), <code>woman</code> (ಮಹಿಳೆ).</td>
        </tr>
        <tr>
          <td><strong>Questions &amp; Logic (9)</strong></td>
          <td><code>what</code> (ಏನು), <code>where</code> (ಎಲ್ಲಿ), <code>when</code> (ಯಾವಾಗ), <code>who</code> (ಯಾರು), <code>why</code> (ಏಕೆ), <code>how</code> (ಹೇಗೆ), <code>which</code> (ಯಾವುದು), <code>yes</code> (ಹೌದು), <code>no</code> (ಇಲ್ಲ).</td>
        </tr>
        <tr>
          <td><strong>Core Actions &amp; Verbs (20)</strong></td>
          <td><code>eat</code> (ತಿನ್ನು), <code>drink</code> (ಕುಡಿ), <code>sleep</code> (ಮಲಗು), <code>wake_up</code> (ಎದ್ದೇಳು), <code>sit</code> (ಕುಳಿತುಕೊ), <code>stand</code> (ನಿಲ್ಲು), <code>walk</code> (ನಡೆ), <code>come</code> (ಬಾ), <code>go</code> (ಹೋಗು), <code>help</code> (ಸಹಾಯ), <code>want</code> (ಬೇಕು), <code>stop</code> (ನಿಲ್ಲಿಸಿ), <code>speak</code> (ಮಾತನಾಡು), <code>understand</code> (ಅರ್ಥವಾಯಿತು), <code>think</code> (ಯೋಚಿಸು), <code>study</code> (ಓದು), <code>write</code> (ಬರೆ), <code>work</code> (ಕೆಲಸ), <code>see</code> (ನೋಡು), <code>give</code> (ಕೊಡು).</td>
        </tr>
        <tr>
          <td><strong>Health, Body &amp; Emotion (19)</strong></td>
          <td><code>doctor</code> (ವೈದ್ಯರು), <code>hospital</code> (ಆಸ್ಪತ್ರೆ), <code>patient</code> (ರೋಗಿ), <code>medicine</code> (ಔಷಧಿ), <code>sick</code> (ಅನಾರೋಗ್ಯ), <code>healthy</code> (ಆರೋಗ್ಯ), <code>pain</code> (ನೋವು), <code>hand</code> (ಕೈ), <code>nose</code> (ಮೂಗು), <code>teeth</code> (ಹಲ್ಲು), <code>happy</code> (ಸಂತೋಷ), <code>sad</code> (ದುಃಖ), <code>angry</code> (ಕೋಪ), <code>pleased</code> (ಖುಷಿ), <code>afraid</code> (ಭಯ), <code>good</code> (ಒಳ್ಳೆಯದು), <code>bad</code> (ಕೆಟ್ಟದು), <code>hot</code> (ಬಿಸಿ), <code>cold</code> (ತಂಪು).</td>
        </tr>
        <tr>
          <td><strong>Places &amp; Civic (14)</strong></td>
          <td><code>home</code> (ಮನೆ), <code>school</code> (ಶಾಲೆ), <code>office</code> (ಕಚೇರಿ), <code>bank</code> (ಬ್ಯಾಂಕ್), <code>market</code> (ಮಾರುಕಟ್ಟೆ), <code>shop</code> (ಅಂಗಡಿ), <code>restaurant</code> (ಉಪಹಾರ ಗೃಹ), <code>railway_station</code> (ರೈಲು ನಿಲ್ದಾಣ), <code>bathroom</code> (ಶೌಚಾಲಯ), <code>city</code> (ನಗರ), <code>road</code> (ರಸ್ತೆ), <code>india</code> (ಭಾರತ), <code>police</code> (ಪೊಲೀಸ್), <code>temple_god</code> / <code>god</code> (ದೇವರು).</td>
        </tr>
        <tr>
          <td><strong>Time, Days &amp; Seasons (21)</strong></td>
          <td><code>morning</code> (ಬೆಳಿಗ್ಗೆ), <code>afternoon</code> (ಮಧ್ಯಾಹ್ನ), <code>evening</code> (ಸಂಜೆ), <code>night</code> (ರಾತ್ರಿ), <code>today</code> (ಇಂದು), <code>tomorrow</code> (ನಾಳೆ), <code>yesterday</code> (ನಿನ್ನೆ), <code>time</code> (ಸಮಯ), <code>clock</code> (ಗಡಿಯಾರ), <code>month</code> (ತಿಂಗಳು), <code>year</code> (ವರ್ಷ), <code>monday</code> (ಸೋಮವಾರ), <code>tuesday</code> (ಮಂಗಳವಾರ), <code>wednesday</code> (ಬುಧವಾರ), <code>thursday</code> (ಗುರುವಾರ), <code>friday</code> (ಶುಕ್ರವಾರ), <code>saturday</code> (ಶನಿವಾರ), <code>sunday</code> (ಭಾನುವಾರ), <code>summer</code> (ಬೇಸಿಗೆ), <code>winter</code> (ಚಳಿಗಾಲ), <code>monsoon</code> (ಮಳೆಗಾಲ).</td>
        </tr>
        <tr>
          <td><strong>Objects, Transport &amp; Colors (27)</strong></td>
          <td><code>water</code> (ನೀರು), <code>food</code> (ಊಟ), <code>tea</code> (ಚಹಾ), <code>book</code> (ಪುಸ್ತಕ), <code>pen</code> (ಪೆನ್ನು), <code>table</code> (ಮೇಜು), <code>chair</code> (ಕುರ್ಚಿ), <code>computer</code> (ಗಣಕಯಂತ್ರ), <code>phone</code> (ಫೋನ್), <code>money</code> (ಹಣ), <code>key</code> (ಬೀಗದ ಕೈ), <code>bag</code> (ಚೀಲ), <code>shirt</code> (ಅಂಗಿ), <code>shoes</code> (ಶೂ), <code>umbrella</code> (ಛತ್ರಿ), <code>bus</code> (ಬಸ್ಸು), <code>car</code> (ಕಾರು), <code>train</code> (ರೈಲು), <code>bicycle</code> (ಸೈಕಲ್), <code>plane</code> (ವಿಮಾನ), <code>boat</code> (ದೋಣಿ), <code>red</code> (ಕೆಂಪು), <code>blue</code> (ನೀಲಿ), <code>green</code> (ಹಸಿರು), <code>yellow</code> (ಹಳದಿ), <code>black</code> (ಕಪ್ಪು), <code>white</code> (ಬಿಳಿ), <code>grey</code> (ಬೂದು), <code>brown</code> (ಕಂದು), <code>orange</code> (ಕಿತ್ತಳೆ), <code>pink</code> (ಗುಲಾಬಿ).</td>
        </tr>
      </tbody>
    </table>
    <div class="page-footer-arabic">66</div>
  </section>`;

  return [
    page52,
    page53,
    page54,
    page55,
    page56,
    page57,
    page58,
    page59,
    page60,
    page61,
    page62,
    page63,
    page64,
    page65,
    page66,
  ].join("\n");
}
