// Preliminary Pages (13 Pages: 4 Unnumbered Title/Certificate Pages + Pages i to ix)
// Strictly formatted per B.M.S. College of Engineering (Autonomous Institute Affiliated to VTU)
// Department of Computer Science and Business Systems (CSBS) B.E. Project Report Guidelines

export function buildPreliminaryPages(meta) {
  const {
    title,
    students,
    guideName,
    guideDesignation,
    hodName,
    principalName,
    academicYear,
    logoSrc,
  } = meta;

  const studentLinesCover = students
    .map(
      (s) =>
        `<div style="font-size:12.5pt; font-weight:700; margin:2px 0; color:#111;">${s.name} &ndash; ${s.usn}</div>`
    )
    .join("");

  const studentInlineCert = students
    .map((s) => `${s.name} (${s.usn})`)
    .join(", ");

  // 1. OUTER COVER PAGE (Unnumbered — No Roman numeral, no header/footer)
  const coverPage = String.raw`
  <section class="report-page cover-page" data-page-label="Cover">
    <div class="bmsce-border-outer">
      <div class="bmsce-border-inner">
        <div style="text-align:center; margin-top:2pt;">
          <div style="font-size:20.5pt; font-weight:700; color:#6b3410; letter-spacing:0.4px; line-height:1.22;">
            B.M.S COLLEGE OF ENGINEERING
          </div>
          <div style="font-size:13pt; font-weight:700; color:#6b3410; line-height:1.32; margin-top:2pt;">
            (Autonomous Institute Affiliated to VTU)<br/>
            Bull Temple Road, Basavanagudi, Bangalore – 560019
          </div>
        </div>

        <div style="text-align:center; margin:12pt 0 10pt 0;">
          <img src="${logoSrc}" alt="BMSCE Emblem" style="width:82px; height:82px; object-fit:contain; display:inline-block;" />
        </div>

        <div style="text-align:center; font-size:12.5pt; margin-bottom:6pt;">
          A Project Report on
        </div>

        <div style="text-align:center; font-size:14.2pt; font-weight:700; line-height:1.34; margin:0 8pt 12pt 8pt; color:#000; text-transform:uppercase;">
          “<span class="report-project-title">${title}</span>”
        </div>

        <div style="text-align:center; font-size:11.5pt; line-height:1.4; margin-bottom:8pt;">
          Submitted in partial fulfillment of the requirements for the award of degree<br/>
          of
        </div>

        <div style="text-align:center; font-size:13pt; font-weight:700; line-height:1.35; margin-bottom:12pt; letter-spacing:0.2px;">
          BACHELOR OF ENGINEERING<br/>
          IN<br/>
          COMPUTER SCIENCE AND BUSINESS SYSTEMS
        </div>

        <div style="text-align:center; margin-bottom:12pt;">
          <div style="font-size:11.5pt; margin-bottom:4pt;">Submitted by</div>
          ${studentLinesCover}
        </div>

        <div style="text-align:center; margin-bottom:12pt;">
          <div style="font-size:11.5pt; margin-bottom:3pt;">Under the guidance of</div>
          <div style="font-size:13pt; font-weight:700;">${guideName}</div>
          <div style="font-size:11.5pt;">${guideDesignation}</div>
        </div>

        <div style="text-align:center; margin-top:auto; padding-top:4pt;">
          <div style="font-size:13pt; font-weight:700; color:#c87a19; line-height:1.32;">
            Department of Computer Science and Business Systems
          </div>
          <div style="font-size:12pt; font-weight:700; color:#000; line-height:1.36;">
            B.M.S College of Engineering, Bull Temple Road, Basavanagudi,<br/>
            Bangalore - 560019<br/>
            ${academicYear}
          </div>
        </div>
      </div>
    </div>
  </section>`;

  // 2. INNER TITLE PAGE (Unnumbered — No Roman numeral, no header/footer)
  const innerTitlePage = String.raw`
  <section class="report-page prelim-page" data-page-label="Inner Title">
    <div class="bmsce-border-outer" style="border-color:#222;">
      <div class="bmsce-border-inner" style="border-color:#222;">
        <div style="text-align:center; margin-top:2pt;">
          <div style="font-size:19.5pt; font-weight:700; color:#111; letter-spacing:0.4px; line-height:1.22;">
            B.M.S COLLEGE OF ENGINEERING
          </div>
          <div style="font-size:12.5pt; font-weight:700; color:#222; line-height:1.32; margin-top:2pt;">
            (Autonomous Institute Affiliated to VTU)<br/>
            Bull Temple Road, Basavanagudi, Bangalore – 560019
          </div>
        </div>

        <div style="text-align:center; margin:10pt 0 8pt 0;">
          <img src="${logoSrc}" alt="BMSCE Emblem" style="width:76px; height:76px; object-fit:contain; display:inline-block;" />
        </div>

        <div style="text-align:center; font-size:12pt; font-style:italic; margin-bottom:5pt;">
          Inner Title Page
        </div>

        <div style="text-align:center; font-size:13.8pt; font-weight:700; line-height:1.34; margin:0 8pt 10pt 8pt; color:#000; text-transform:uppercase;">
          “<span class="report-project-title">${title}</span>”
        </div>

        <div style="text-align:center; font-size:11.5pt; line-height:1.4; margin-bottom:8pt;">
          A Major Project Report submitted in partial fulfillment of the requirements for the award of the degree of
        </div>

        <div style="text-align:center; font-size:12.5pt; font-weight:700; line-height:1.35; margin-bottom:12pt;">
          BACHELOR OF ENGINEERING<br/>
          IN<br/>
          COMPUTER SCIENCE AND BUSINESS SYSTEMS
        </div>

        <div style="text-align:center; margin-bottom:12pt;">
          <div style="font-size:11.5pt; margin-bottom:4pt;">Submitted by</div>
          ${studentLinesCover}
        </div>

        <div style="text-align:center; margin-bottom:12pt;">
          <div style="font-size:11.5pt; margin-bottom:3pt;">Under the guidance of</div>
          <div style="font-size:12.5pt; font-weight:700;">${guideName}</div>
          <div style="font-size:11.5pt;">${guideDesignation}, Department of CSBS, BMSCE</div>
        </div>

        <div style="text-align:center; margin-top:auto;">
          <div style="font-size:12.5pt; font-weight:700; color:#111; line-height:1.32;">
            Department of Computer Science and Business Systems
          </div>
          <div style="font-size:11.5pt; font-weight:700; color:#111; line-height:1.36;">
            B.M.S College of Engineering, Bull Temple Road, Basavanagudi,<br/>
            Bangalore - 560019<br/>
            ${academicYear}
          </div>
        </div>
      </div>
    </div>
  </section>`;

  // 3. COLLEGE CERTIFICATE PAGE (Unnumbered — No Roman numeral, no header/footer)
  const certificatePage = String.raw`
  <section class="report-page prelim-page" data-page-label="Certificate">
    <div class="bmsce-border-outer">
      <div class="bmsce-border-inner" style="padding:18pt 20pt;">
        <div style="display:flex; align-items:center; gap:14pt; margin-bottom:12pt;">
          <img src="${logoSrc}" alt="BMSCE Emblem" style="width:76px; height:76px; object-fit:contain; flex-shrink:0;" />
          <div style="text-align:left;">
            <div style="font-size:16.5pt; font-weight:700; color:#6b3410; line-height:1.25;">
              B.M.S COLLEGE OF ENGINEERING
            </div>
            <div style="font-size:12.5pt; font-weight:700; color:#6b3410; line-height:1.35;">
              (Autonomous Institute Affiliated to VTU) Bull Temple Road,<br/>
              Basavanagudi, Bangalore – 560019
            </div>
          </div>
        </div>

        <div style="text-align:center; font-size:14.5pt; font-weight:700; color:#4f81bd; margin:10pt 0 16pt 0;">
          Department of Computer Science and Business Systems
        </div>

        <div style="text-align:center; font-size:15pt; font-weight:700; letter-spacing:6px; margin-bottom:16pt; color:#000;">
          CERTIFICATE
        </div>

        <p style="font-size:11.5pt; line-height:1.75; text-align:justify; text-indent:0; margin-bottom:24pt;">
          This is to certify that the Project work entitled <strong>“<span class="report-project-title">${title}</span>”</strong> is a bona-fide work carried out by <strong>${studentInlineCert}</strong> in partial fulfillment for the award of degree of Bachelor of Engineering in <strong>Computer Science and Business Systems</strong> from <strong>Visvesvaraya Technological University, Belgaum</strong> during the year <strong>${academicYear}</strong>. It is certified that all corrections/suggestions indicated for internal assessment have been incorporated in the report deposited in the department library. The Project has been approved as it satisfies the academic requirements in respect of Project work prescribed for the Bachelor of Engineering Degree.
        </p>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14pt; margin-top:24pt; margin-bottom:28pt; font-size:11.5pt; line-height:1.45;">
          <div>
            <div style="border-top:1.5px solid #000; padding-top:6pt; font-weight:700;">${guideName}</div>
            <div>${guideDesignation} &amp; Guide,</div>
            <div>Dept. of CSBS,</div>
            <div>BMSCE, Bangalore</div>
          </div>
          <div>
            <div style="border-top:1.5px solid #000; padding-top:6pt; font-weight:700;">${hodName}</div>
            <div>Professor &amp; Head,</div>
            <div>Dept. of CSBS,</div>
            <div>BMSCE, Bangalore</div>
          </div>
          <div>
            <div style="border-top:1.5px solid #000; padding-top:6pt; font-weight:700;">${principalName}</div>
            <div>Professor and Principal,</div>
            <div>BMSCE, Bangalore</div>
          </div>
        </div>

        <div style="margin-top:auto; font-size:12pt; line-height:1.8;">
          <div style="font-weight:700; margin-bottom:8pt;">Examiners:</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:14pt;">
            <span>Name of the Examiner</span>
            <span>Signature of the Examiner</span>
          </div>
          <div style="margin-bottom:14pt;">1. ____________________________________</div>
          <div>2. ____________________________________</div>
        </div>
      </div>
    </div>
  </section>`;



  // 5. DECLARATION BY STUDENTS (Dedicated 1 Full Page — Roman i)
  const declarationPage = String.raw`
  <section class="report-page prelim-page" data-roman="i">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:18pt;">DECLARATION BY STUDENTS</div>
    <p style="line-height:1.8; margin-bottom:16pt;">
      We hereby declare that the major project report entitled <strong>“<span class="report-project-title">${title}</span>”</strong> submitted to the <strong>Department of Computer Science and Business Systems, B.M.S. College of Engineering, Bangalore</strong>, in partial fulfillment of the requirements for the award of the degree of <strong>Bachelor of Engineering in Computer Science and Business Systems</strong> under <strong>Visvesvaraya Technological University (VTU), Belagavi</strong> during the academic year <strong>${academicYear}</strong>, is an authentic record of our own engineering and research work carried out under the supervision and guidance of <strong>${guideName}</strong>, ${guideDesignation}, Department of Computer Science and Business Systems, BMSCE.
    </p>
    <p style="line-height:1.8; margin-bottom:16pt;">
      We further declare that the matter embodied in this project report has not been submitted previously by us or any other candidate for the award of any other degree or diploma in any university or institution. All external benchmark datasets (Amrita-ISLR, INCLUDE, and ISL-CSLTR under CC BY 4.0) and published scholarly literature have been duly acknowledged and cited in the References section.
    </p>
    <p style="line-height:1.8; margin-bottom:32pt;">
      We understand that any act of plagiarism or fabrication of experimental results is a violation of academic integrity, and we take full responsibility for the originality of the software implementation, mathematical formulations, and empirical evaluations presented herein.
    </p>
    <div style="display:flex; justify-content:space-between; margin-top:36pt; font-size:12pt; line-height:1.8;">
      <div>
        <strong>Place:</strong> Bangalore<br/>
        <strong>Date:</strong> November 2026
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700; margin-bottom:8pt;">Signature of Students:</div>
        ${students.map((s) => `<div style="margin-bottom:10pt;"><strong>${s.name}</strong> (${s.usn})</div>`).join("")}
      </div>
    </div>
    <div class="page-footer-roman">i</div>
  </section>`;

  // 6. ACKNOWLEDGEMENT (Dedicated 1 Full Page — Roman ii)
  const acknowledgementPage = String.raw`
  <section class="report-page prelim-page" data-roman="ii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:18pt;">ACKNOWLEDGEMENT</div>
    <p style="line-height:1.8; margin-bottom:14pt;">
      The successful completion of this major engineering project required technical guidance, institutional support, and encouragement from several distinguished individuals. We express our deep sense of gratitude to our respected Principal, <strong>${principalName}</strong>, B.M.S. College of Engineering, Bangalore, for providing an outstanding academic and research environment conducive to innovation.
    </p>
    <p style="line-height:1.8; margin-bottom:14pt;">
      We extend our sincere thanks to <strong>${hodName}</strong>, Professor and Head, Department of Computer Science and Business Systems, BMSCE, for continuous support, constructive panel reviews, and access to departmental computing resources throughout all phases of the project.
    </p>
    <p style="line-height:1.8; margin-bottom:14pt;">
      We are profoundly grateful to our Project Guide, <strong>${guideName}</strong>, ${guideDesignation}, Department of Computer Science and Business Systems, BMSCE, whose technical mentorship, rigorous emphasis on signer-independent statistical evaluation, and thoughtful feedback shaped every architectural decision of <em>Silent Bridge</em>.
    </p>
    <p style="line-height:1.8; margin-bottom:28pt;">
      We also thank the Project Coordinator, panel evaluators, faculty members, and non-teaching staff of the Department of Computer Science and Business Systems, as well as the creators and deaf signers of the open-access Amrita SLR, INCLUDE, and ISL-CSLTR corpora whose public contributions made authentic Indian Sign Language research possible.
    </p>
    <div style="text-align:right; margin-top:32pt; font-size:12pt; line-height:1.8;">
      ${students.map((s) => `<div><strong>${s.name}</strong> (${s.usn})</div>`).join("")}
    </div>
    <div class="page-footer-roman">ii</div>
  </section>`;

  // 7. ABSTRACT / SYNOPSIS (Dedicated 1 Full Page — Roman iii)
  const abstractPage = String.raw`
  <section class="report-page prelim-page" data-roman="iii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:18pt;">ABSTRACT</div>
    <p style="line-height:1.8; margin-bottom:14pt;">
      <strong>Silent Bridge</strong> is a real-time, privacy-preserving bidirectional assistive platform connecting Indian Sign Language (ISL) signers and Kannada speakers on commodity hardware. Using in-browser MediaPipe hand and face landmarks (147-D <code>hands-face-v2</code> schema), hysteresis motion segmentation, and a Bidirectional GRU with 3-view Test-Time Augmentation, isolated-sign accuracy on unseen signers improved from 54.5% to 76.5% ($p=0.003$, overall 81.5%, macro-F1 0.800). A fused BiGRU-CTC and sentence classifier decodes continuous ISL sentences, while a multi-tier SOV grammar engine and a procedural 3D avatar with analytic inverse kinematics translate Kannada text into continuous ISL signing with zero mid-sign arm drops.
    </p>
    <p style="line-height:1.8; margin-bottom:14pt;">
      In the forward direction (ISL to Kannada), raw webcam video never leaves the client browser; compact 3D anatomical landmarks are extracted at 30 FPS and evaluated by a quantized ONNX Runtime WebAssembly engine with a single-window latency of 4.6 ms. An out-of-fold calibrated confidence gate ($\tau^* = 0.50$) rejects non-sign transitions, and accepted gloss sequences are restructured into natural Kannada script and spoken aloud via Kannada Text-to-Speech synthesis.
    </p>
    <p style="line-height:1.8; margin-bottom:18pt;">
      In the reverse direction (Kannada to ISL), input Kannada text undergoes Unicode NFC normalization, greedy longest-phrase matching across 187 multi-word phrases and 144 isolated signs, and Dravidian morphological suffix stripping. The resulting sign sequence drives a procedural 3D humanoid avatar using analytic two-bone shoulder-elbow-wrist inverse kinematics and ballistic co-articulation arcs at 60 FPS.
    </p>
    <p style="font-size:12pt; line-height:1.65; text-indent:0; margin-top:16pt;">
      <strong>Keywords:</strong> Indian Sign Language (ISL), Kannada Translation, MediaPipe Landmarks, Bidirectional GRU, Connectionist Temporal Classification (CTC), ONNX WebAssembly, 3D Inverse Kinematics Avatar, Assistive Technology, UN SDGs 3, 4, 8, 9, 10.
    </p>
    <div class="page-footer-roman">iii</div>
  </section>`;

  // 8. TABLE OF CONTENTS (Part 1) — Page iv (Enlarged Non-Table Dotted Leader Format)
  const tocPage1 = String.raw`
  <section class="report-page prelim-page" data-roman="iv">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">TABLE OF CONTENTS</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span>CHAPTER / SECTION TITLE</span>
        <span>PAGE NO.</span>
      </div>

      <div class="toc-prelim-entry"><span class="toc-num">i.</span><span class="toc-title">Declaration by Students</span><span class="toc-leader"></span><span class="toc-page">i</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">ii.</span><span class="toc-title">Acknowledgement</span><span class="toc-leader"></span><span class="toc-page">ii</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">iii.</span><span class="toc-title">Abstract (Synopsis)</span><span class="toc-leader"></span><span class="toc-page">iii</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">iv.</span><span class="toc-title">Table of Contents</span><span class="toc-leader"></span><span class="toc-page">iv</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">v.</span><span class="toc-title">List of Figures</span><span class="toc-leader"></span><span class="toc-page">vi</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">vi.</span><span class="toc-title">List of Tables</span><span class="toc-leader"></span><span class="toc-page">vii</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">vii.</span><span class="toc-title">List of Abbreviations and Acronyms</span><span class="toc-leader"></span><span class="toc-page">viii</span></div>
      <div class="toc-prelim-entry"><span class="toc-num">viii.</span><span class="toc-title">List of Symbols and Notations</span><span class="toc-leader"></span><span class="toc-page">ix</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 1: INTRODUCTION</span><span class="toc-leader"></span><span class="toc-page">1</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.1</span><span class="toc-title">Background and Context of the Project</span><span class="toc-leader"></span><span class="toc-page">1</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.2</span><span class="toc-title">Project Domain Overview</span><span class="toc-leader"></span><span class="toc-page">1</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.3</span><span class="toc-title">Motivation</span><span class="toc-leader"></span><span class="toc-page">2</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.4</span><span class="toc-title">Problem Statement</span><span class="toc-leader"></span><span class="toc-page">3</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.5</span><span class="toc-title">Aim and Objectives</span><span class="toc-leader"></span><span class="toc-page">3</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.6</span><span class="toc-title">Scope of the Project</span><span class="toc-leader"></span><span class="toc-page">4</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.7</span><span class="toc-title">Significance and Expected Contribution</span><span class="toc-leader"></span><span class="toc-page">4</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.8</span><span class="toc-title">Industry and Societal Relevance</span><span class="toc-leader"></span><span class="toc-page">5</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.9</span><span class="toc-title">Sustainable Development Goals (SDGs 3, 4, 8, 9, 10) Addressed</span><span class="toc-leader"></span><span class="toc-page">5</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.10</span><span class="toc-title">Constraints and Limitations</span><span class="toc-leader"></span><span class="toc-page">7</span></div>
      <div class="toc-section-entry"><span class="toc-num">1.11</span><span class="toc-title">Organization of the Report</span><span class="toc-leader"></span><span class="toc-page">8</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 2: LITERATURE REVIEW AND RELATED WORK</span><span class="toc-leader"></span><span class="toc-page">9</span></div>
      <div class="toc-section-entry"><span class="toc-num">2.1</span><span class="toc-title">Introduction</span><span class="toc-leader"></span><span class="toc-page">9</span></div>
      <div class="toc-section-entry"><span class="toc-num">2.2</span><span class="toc-title">Review of Existing Systems and Research Studies</span><span class="toc-leader"></span><span class="toc-page">9</span></div>
      <div class="toc-section-entry"><span class="toc-num">2.3</span><span class="toc-title">Comparative Analysis of Existing Approaches</span><span class="toc-leader"></span><span class="toc-page">13</span></div>
      <div class="toc-section-entry"><span class="toc-num">2.4</span><span class="toc-title">Identified Research and Application Gap</span><span class="toc-leader"></span><span class="toc-page">15</span></div>
      <div class="toc-section-entry"><span class="toc-num">2.5</span><span class="toc-title">Summary of the Literature Review</span><span class="toc-leader"></span><span class="toc-page">16</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 3: REQUIREMENTS ANALYSIS AND PROJECT PLANNING</span><span class="toc-leader"></span><span class="toc-page">17</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.1</span><span class="toc-title">Introduction</span><span class="toc-leader"></span><span class="toc-page">17</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.2</span><span class="toc-title">Stakeholder Identification and User Needs</span><span class="toc-leader"></span><span class="toc-page">17</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.3</span><span class="toc-title">Problem and Opportunity Analysis (User &amp; Business Perspectives)</span><span class="toc-leader"></span><span class="toc-page">18</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.4</span><span class="toc-title">Functional Requirements</span><span class="toc-leader"></span><span class="toc-page">18</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.5</span><span class="toc-title">Non-Functional Requirements</span><span class="toc-leader"></span><span class="toc-page">19</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.6</span><span class="toc-title">Hardware and Software Requirements</span><span class="toc-leader"></span><span class="toc-page">20</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.7</span><span class="toc-title">Feasibility Analysis (Technical, Economic &amp; Operational)</span><span class="toc-leader"></span><span class="toc-page">21</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.8</span><span class="toc-title">Project Plan, Milestones and Task Allocation</span><span class="toc-leader"></span><span class="toc-page">22</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.9</span><span class="toc-title">Risk Assessment and Mitigation</span><span class="toc-leader"></span><span class="toc-page">23</span></div>
      <div class="toc-section-entry"><span class="toc-num">3.10</span><span class="toc-title">Data Privacy, Security, and Compliance Requirements</span><span class="toc-leader"></span><span class="toc-page">24</span></div>
    </div>
    <div class="page-footer-roman">iv</div>
  </section>`;

  // 9. TABLE OF CONTENTS (Part 2) — Page v (Enlarged Non-Table Dotted Leader Format)
  const tocPage2 = String.raw`
  <section class="report-page prelim-page" data-roman="v">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">TABLE OF CONTENTS (Continued)</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span>CHAPTER / SECTION TITLE</span>
        <span>PAGE NO.</span>
      </div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 4: BUSINESS MODEL AND SUSTAINABILITY FRAMEWORK</span><span class="toc-leader"></span><span class="toc-page">25</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.1</span><span class="toc-title">Introduction to the Proposed Business and Solution</span><span class="toc-leader"></span><span class="toc-page">25</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.2</span><span class="toc-title">Identification of Target Users and Customer Segments</span><span class="toc-leader"></span><span class="toc-page">25</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.3</span><span class="toc-title">Customer Problem and Value Proposition</span><span class="toc-leader"></span><span class="toc-page">26</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.4</span><span class="toc-title">Business Model Canvas</span><span class="toc-leader"></span><span class="toc-page">27</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.5</span><span class="toc-title">Market and User Adoption Potential</span><span class="toc-leader"></span><span class="toc-page">28</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.6</span><span class="toc-title">Cost-Benefit Analysis</span><span class="toc-leader"></span><span class="toc-page">28</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.7</span><span class="toc-title">Revenue Generation and Pricing Model</span><span class="toc-leader"></span><span class="toc-page">29</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.8</span><span class="toc-title">Business Feasibility and Viability</span><span class="toc-leader"></span><span class="toc-page">29</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.9</span><span class="toc-title">Scalability and Long-Term Sustainability</span><span class="toc-leader"></span><span class="toc-page">30</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.10</span><span class="toc-title">SDG Impact Pathway and Measurable Indicators</span><span class="toc-leader"></span><span class="toc-page">31</span></div>
      <div class="toc-section-entry"><span class="toc-num">4.11</span><span class="toc-title">Summary</span><span class="toc-leader"></span><span class="toc-page">31</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 5: SYSTEM DESIGN AND METHODOLOGY</span><span class="toc-leader"></span><span class="toc-page">32</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.1</span><span class="toc-title">Proposed Solution and System Overview</span><span class="toc-leader"></span><span class="toc-page">32</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.2</span><span class="toc-title">System Architecture</span><span class="toc-leader"></span><span class="toc-page">32</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.3</span><span class="toc-title">Module Description</span><span class="toc-leader"></span><span class="toc-page">33</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.4</span><span class="toc-title">Workflow and Process Design</span><span class="toc-leader"></span><span class="toc-page">34</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.5</span><span class="toc-title">Data Design and Feature Schema Design</span><span class="toc-leader"></span><span class="toc-page">35</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.6</span><span class="toc-title">UML, DFD, and Entity-Relationship Diagrams</span><span class="toc-leader"></span><span class="toc-page">36</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.7</span><span class="toc-title">Algorithm, Neural Model, and Avatar IK Design</span><span class="toc-leader"></span><span class="toc-page">38</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.8</span><span class="toc-title">User Interface and Interaction Design</span><span class="toc-leader"></span><span class="toc-page">41</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.9</span><span class="toc-title">Security, Privacy, Ethics and Responsible Use</span><span class="toc-leader"></span><span class="toc-page">41</span></div>
      <div class="toc-section-entry"><span class="toc-num">5.10</span><span class="toc-title">Methodology and Evaluation Strategy</span><span class="toc-leader"></span><span class="toc-page">42</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 6: IMPLEMENTATION AND INTEGRATION</span><span class="toc-leader"></span><span class="toc-page">43</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.1</span><span class="toc-title">Development Environment and Technology Stack</span><span class="toc-leader"></span><span class="toc-page">43</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.2</span><span class="toc-title">Implementation Approach</span><span class="toc-leader"></span><span class="toc-page">43</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.3</span><span class="toc-title">Module-wise Implementation</span><span class="toc-leader"></span><span class="toc-page">44</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.4</span><span class="toc-title">Database, REST API, and Model Integration</span><span class="toc-leader"></span><span class="toc-page">49</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.5</span><span class="toc-title">Key Screens and System Demonstration</span><span class="toc-leader"></span><span class="toc-page">50</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.6</span><span class="toc-title">Integration and Deployment</span><span class="toc-leader"></span><span class="toc-page">50</span></div>
      <div class="toc-section-entry"><span class="toc-num">6.7</span><span class="toc-title">Challenges Encountered and Solutions</span><span class="toc-leader"></span><span class="toc-page">51</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 7: TESTING, RESULTS AND DISCUSSION</span><span class="toc-leader"></span><span class="toc-page">52</span></div>
      <div class="toc-section-entry"><span class="toc-num">7.1</span><span class="toc-title">Testing Strategy, Environment, and Test Cases (7.1–7.4)</span><span class="toc-leader"></span><span class="toc-page">52</span></div>
      <div class="toc-section-entry"><span class="toc-num">7.5</span><span class="toc-title">Performance and Model Evaluation (Isolated, Continuous &amp; Latency)</span><span class="toc-leader"></span><span class="toc-page">55</span></div>
      <div class="toc-section-entry"><span class="toc-num">7.6</span><span class="toc-title">Results, Baseline Comparison, and Objective Achievement (7.6–7.8)</span><span class="toc-leader"></span><span class="toc-page">59</span></div>
      <div class="toc-section-entry"><span class="toc-num">7.9</span><span class="toc-title">Business Validation, SDG Impact Indicators, and Limitations (7.9–7.13)</span><span class="toc-leader"></span><span class="toc-page">60</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">CHAPTER 8: CONCLUSION AND FUTURE ENHANCEMENTS</span><span class="toc-leader"></span><span class="toc-page">61</span></div>
      <div class="toc-section-entry"><span class="toc-num">8.1</span><span class="toc-title">Project Summary, Conclusions, and Contributions (8.1–8.4)</span><span class="toc-leader"></span><span class="toc-page">61</span></div>
      <div class="toc-section-entry"><span class="toc-num">8.5</span><span class="toc-title">Future Scope and Enhancements</span><span class="toc-leader"></span><span class="toc-page">63</span></div>

      <div class="toc-chapter-entry"><span class="toc-title">REFERENCES</span><span class="toc-leader"></span><span class="toc-page">64</span></div>
      <div class="toc-chapter-entry"><span class="toc-title">RESEARCH MANUSCRIPT &amp; REPRODUCIBLE ARTIFACTS</span><span class="toc-leader"></span><span class="toc-page">65</span></div>
      <div class="toc-chapter-entry"><span class="toc-title">APPENDIX A: 144-CLASS ISL VOCABULARY &amp; KANNADA LEXICON</span><span class="toc-leader"></span><span class="toc-page">66</span></div>
    </div>
    <div class="page-footer-roman">v</div>
  </section>`;

  // 10. LIST OF FIGURES (Dedicated 1 Full Page — Page vi, Enlarged Non-Table Format)
  const listOfFiguresPage = String.raw`
  <section class="report-page prelim-page" data-roman="vi">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:12pt;">LIST OF FIGURES</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span>FIGURE NO. &amp; TITLE</span>
        <span>PAGE NO.</span>
      </div>

      <div class="leader-list-item"><span class="leader-item-num">Fig. 1.1</span><span class="leader-item-title">Bidirectional ISL-to-Kannada Communication Paradigm</span><span class="leader-item-dots"></span><span class="leader-item-page">2</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 2.1</span><span class="leader-item-title">Taxonomy of Sign Recognition and Avatar Synthesis</span><span class="leader-item-dots"></span><span class="leader-item-page">14</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 3.1</span><span class="leader-item-title">11-Phase Project Engineering Schedule and Gantt Chart</span><span class="leader-item-dots"></span><span class="leader-item-page">22</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 4.1</span><span class="leader-item-title">Silent Bridge 9-Block Business Model Canvas</span><span class="leader-item-dots"></span><span class="leader-item-page">27</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 5.1</span><span class="leader-item-title">End-to-End System Architecture (Landmark Privacy)</span><span class="leader-item-dots"></span><span class="leader-item-page">32</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 5.2</span><span class="leader-item-title">Forward Sign-to-Kannada &amp; Reverse Avatar Flowcharts</span><span class="leader-item-dots"></span><span class="leader-item-page">34</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 5.3</span><span class="leader-item-title">Level-0 Context DFD and Level-1 Subsystem DFD</span><span class="leader-item-dots"></span><span class="leader-item-page">36</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 5.4</span><span class="leader-item-title">UML Use Case, Sequence, and ER Schema Diagrams</span><span class="leader-item-dots"></span><span class="leader-item-page">37</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.1</span><span class="leader-item-title">Website Workflow: Live ISL-to-Kannada Studio</span><span class="leader-item-dots"></span><span class="leader-item-page">45</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.2</span><span class="leader-item-title">Website Workflow: Few-Shot Custom Signs Studio</span><span class="leader-item-dots"></span><span class="leader-item-page">46</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.3</span><span class="leader-item-title">Website Workflow: Kannada-to-Sign 3D Avatar Studio</span><span class="leader-item-dots"></span><span class="leader-item-page">47</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.4</span><span class="leader-item-title">Website Workflow: 144-Class Sign Reference Library</span><span class="leader-item-dots"></span><span class="leader-item-page">50</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.5</span><span class="leader-item-title">Website Workflow: Dataset &amp; Model Workbench</span><span class="leader-item-dots"></span><span class="leader-item-page">50</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 6.6</span><span class="leader-item-title">Website Workflow: Architecture &amp; Testing Dashboard</span><span class="leader-item-dots"></span><span class="leader-item-page">51</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.1</span><span class="leader-item-title">Valid Training Recordings per Sign by Dataset Source</span><span class="leader-item-dots"></span><span class="leader-item-page">52</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.2</span><span class="leader-item-title">Top-1 Accuracy Progression on Held-Out Videos</span><span class="leader-item-dots"></span><span class="leader-item-page">55</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.3</span><span class="leader-item-title">Out-of-Fold Precision, Recall, and Coverage Curve</span><span class="leader-item-dots"></span><span class="leader-item-page">55</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.4</span><span class="leader-item-title">Per-Sign F1-Score Across 60 Held-Out Test Classes</span><span class="leader-item-dots"></span><span class="leader-item-page">56</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.5</span><span class="leader-item-title">Sign Error Rate (SER) of Segmentation Variants</span><span class="leader-item-dots"></span><span class="leader-item-page">57</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Fig. 7.6</span><span class="leader-item-title">Top-1 Accuracy Under Synthetic Perturbations</span><span class="leader-item-dots"></span><span class="leader-item-page">57</span></div>
    </div>
    <div class="page-footer-roman">vi</div>
  </section>`;

  // 11. LIST OF TABLES (Dedicated 1 Full Page — Page vii, Enlarged Non-Table Format)
  const listOfTablesPage = String.raw`
  <section class="report-page prelim-page" data-roman="vii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:12pt;">LIST OF TABLES</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span>TABLE NO. &amp; TITLE</span>
        <span>PAGE NO.</span>
      </div>

      <div class="leader-list-item"><span class="leader-item-num">Table 1.1</span><span class="leader-item-title">Alignment of Project Objectives with UN SDG Targets</span><span class="leader-item-dots"></span><span class="leader-item-page">6</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 1.2</span><span class="leader-item-title">Chapter-Wise Structural Summary of the B.E. Project Report</span><span class="leader-item-dots"></span><span class="leader-item-page">8</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 2.1</span><span class="leader-item-title">Comparative Analysis of Sign Language &amp; Avatar Systems</span><span class="leader-item-dots"></span><span class="leader-item-page">13</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 2.2</span><span class="leader-item-title">Feature-Level Architectural Comparison Across 12 Studies</span><span class="leader-item-dots"></span><span class="leader-item-page">14</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 3.1</span><span class="leader-item-title">Stakeholder Identification, Core Needs, and Value Delivery</span><span class="leader-item-dots"></span><span class="leader-item-page">17</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 3.2</span><span class="leader-item-title">Minimum and Recommended Hardware Specifications</span><span class="leader-item-dots"></span><span class="leader-item-page">20</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 3.3</span><span class="leader-item-title">Software and Library Stack Specifications</span><span class="leader-item-dots"></span><span class="leader-item-page">20</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 3.4</span><span class="leader-item-title">11-Phase Project Engineering Schedule and Key Deliverables</span><span class="leader-item-dots"></span><span class="leader-item-page">22</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 3.5</span><span class="leader-item-title">Risk Assessment and Mitigation Matrix (FMEA Analysis)</span><span class="leader-item-dots"></span><span class="leader-item-page">23</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 4.1–4.3</span><span class="leader-item-title">Target User Segments, Value Proposition &amp; Cost-Benefit</span><span class="leader-item-dots"></span><span class="leader-item-page">25–28</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 4.4–4.6</span><span class="leader-item-title">Tiered SaaS Pricing, 3-Year Financials &amp; SDG Impact KPIs</span><span class="leader-item-dots"></span><span class="leader-item-page">29–31</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 5.1</span><span class="leader-item-title">Core Subsystem Modules and Architectural Responsibilities</span><span class="leader-item-dots"></span><span class="leader-item-page">33</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 5.2</span><span class="leader-item-title">147-Dimensional Per-Frame Feature Schema (hands-face-v2)</span><span class="leader-item-dots"></span><span class="leader-item-page">35</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 6.1</span><span class="leader-item-title">Production Technology Stack Across Frontend and Backend</span><span class="leader-item-dots"></span><span class="leader-item-page">43</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 6.2</span><span class="leader-item-title">Core REST API Endpoints and WebSocket Protocol Contract</span><span class="leader-item-dots"></span><span class="leader-item-page">49</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 6.3</span><span class="leader-item-title">Summary of Engineering Challenges and Verified Solutions</span><span class="leader-item-dots"></span><span class="leader-item-page">51</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 7.1–7.8</span><span class="leader-item-title">Datasets, Test Cases, Parity, Latency &amp; Isolated Sign Results</span><span class="leader-item-dots"></span><span class="leader-item-page">52–56</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 7.9–7.14</span><span class="leader-item-title">Segmentation SER, Perturbation, Sentence &amp; SDG Outcomes</span><span class="leader-item-dots"></span><span class="leader-item-page">57–60</span></div>
      <div class="leader-list-item"><span class="leader-item-num">Table 8.1–8.2</span><span class="leader-item-title">Key Technical Contributions &amp; Reproducible Artifacts</span><span class="leader-item-dots"></span><span class="leader-item-page">62–65</span></div>
    </div>
    <div class="page-footer-roman">vii</div>
  </section>`;

  // 12. LIST OF ABBREVIATIONS AND ACRONYMS — Page viii (Enlarged Non-Table Format)
  const abbreviationsPage = String.raw`
  <section class="report-page prelim-page" data-roman="viii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:12pt;">LIST OF ABBREVIATIONS AND ACRONYMS</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span style="width:118pt; flex-shrink:0;">ACRONYM</span>
        <span style="flex:1;">FULL EXPANSION AND TECHNICAL MEANING</span>
      </div>

      <div class="def-list-item"><span class="def-item-term">ISL</span><span class="def-item-desc">Indian Sign Language — Natural visual-spatial language used by the deaf community in India</span></div>
      <div class="def-list-item"><span class="def-item-term">SLR / SLT</span><span class="def-item-desc">Sign Language Recognition / Sign Language Translation</span></div>
      <div class="def-list-item"><span class="def-item-term">CSLR</span><span class="def-item-desc">Continuous Sign Language Recognition (unsegmented multi-sign stream decoding)</span></div>
      <div class="def-list-item"><span class="def-item-term">BiGRU</span><span class="def-item-desc">Bidirectional Gated Recurrent Unit neural network architecture</span></div>
      <div class="def-list-item"><span class="def-item-term">CTC</span><span class="def-item-desc">Connectionist Temporal Classification alignment-free sequence loss and decoder</span></div>
      <div class="def-list-item"><span class="def-item-term">TTA</span><span class="def-item-desc">Test-Time Augmentation (3-view ensemble over full, 3-tap denoised, and 84% core-stroke crops)</span></div>
      <div class="def-list-item"><span class="def-item-term">ONNX</span><span class="def-item-desc">Open Neural Network Exchange portable cross-platform model format</span></div>
      <div class="def-list-item"><span class="def-item-term">WASM</span><span class="def-item-desc">WebAssembly binary instruction format for near-native in-browser execution</span></div>
      <div class="def-list-item"><span class="def-item-term">IK</span><span class="def-item-desc">Inverse Kinematics (analytic two-bone shoulder-elbow-wrist solver for 3D avatar arms)</span></div>
      <div class="def-list-item"><span class="def-item-term">SOV</span><span class="def-item-desc">Subject–Object–Verb canonical constituent word order of Kannada</span></div>
      <div class="def-list-item"><span class="def-item-term">NMM</span><span class="def-item-desc">Non-Manual Markers (eyebrow raise/furrow, head tilt/shake, mouthing in ISL grammar)</span></div>
      <div class="def-list-item"><span class="def-item-term">EMA</span><span class="def-item-desc">Exponential Moving Average temporal filter for landmark and probability smoothing</span></div>
      <div class="def-list-item"><span class="def-item-term">SER / GER</span><span class="def-item-desc">Sign Error Rate / Gloss Error Rate (Levenshtein edit distance normalized by reference length)</span></div>
      <div class="def-list-item"><span class="def-item-term">OOF</span><span class="def-item-desc">Out-of-Fold cross-validation predictions used for unbiased confidence threshold calibration</span></div>
      <div class="def-list-item"><span class="def-item-term">OOD</span><span class="def-item-desc">Out-of-Distribution / Non-sign motion rejection via calibrated confidence gating</span></div>
      <div class="def-list-item"><span class="def-item-term">MCP / PIP / DIP</span><span class="def-item-desc">Metacarpophalangeal, Proximal Interphalangeal, and Distal Interphalangeal finger joints</span></div>
      <div class="def-list-item"><span class="def-item-term">TTS</span><span class="def-item-desc">Text-to-Speech synthesis (Web Speech API kn-IN voice with optional gTTS fallback)</span></div>
      <div class="def-list-item"><span class="def-item-term">PWA</span><span class="def-item-desc">Progressive Web Application with Service Worker offline asset caching</span></div>
      <div class="def-list-item"><span class="def-item-term">DPDP</span><span class="def-item-desc">Digital Personal Data Protection Act, 2023 (India statutory privacy framework)</span></div>
      <div class="def-list-item"><span class="def-item-term">SDG</span><span class="def-item-desc">United Nations Sustainable Development Goals (2030 Global Agenda)</span></div>
      <div class="def-list-item"><span class="def-item-term">BMC</span><span class="def-item-desc">Business Model Canvas (Osterwalder 9-block strategic enterprise framework)</span></div>
      <div class="def-list-item"><span class="def-item-term">TAM / SAM / SOM</span><span class="def-item-desc">Total Addressable Market / Serviceable Addressable Market / Serviceable Obtainable Market</span></div>
      <div class="def-list-item"><span class="def-item-term">FMEA / RPN</span><span class="def-item-desc">Failure Mode and Effects Analysis / Risk Priority Number ($\text{Severity} \times \text{Occurrence} \times \text{Detection}$)</span></div>
    </div>
    <div class="page-footer-roman">viii</div>
  </section>`;

  // 13. LIST OF SYMBOLS / NOTATIONS — Page ix (Enlarged Non-Table Format)
  const symbolsPage = String.raw`
  <section class="report-page prelim-page" data-roman="ix">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:12pt;">LIST OF SYMBOLS AND NOTATIONS</div>
    <div class="prelim-list-container">
      <div class="prelim-list-header">
        <span style="width:130pt; flex-shrink:0;">SYMBOL</span>
        <span style="flex:1;">MATHEMATICAL DEFINITION</span>
        <span style="width:98pt; text-align:right; flex-shrink:0;">SI UNIT / DIM.</span>
      </div>

      <div class="sym-list-item"><span class="sym-item-symbol">Hand Joint Points (21)</span><span class="sym-item-desc">3D landmark coordinates tracked for each hand joint from the webcam stream</span><span class="sym-item-unit">3D Points</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Wrist Reference</span><span class="sym-item-desc">Wrist base point used to align hand movements independent of user position</span><span class="sym-item-unit">Position</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Palm Scale</span><span class="sym-item-desc">Hand size measurement used to adjust for distance from the camera</span><span class="sym-item-unit">Scale</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Face Box &amp; Center</span><span class="sym-item-desc">Face position tracking to recognize signs made near the chin, mouth, or forehead</span><span class="sym-item-unit">Coordinates</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Finger &amp; Palm Direction</span><span class="sym-item-desc">Direction vectors showing finger orientation and palm facing angle</span><span class="sym-item-unit">Direction</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Frame Landmark Points</span><span class="sym-item-desc">Complete set of hand and face keypoint positions extracted per video frame</span><span class="sym-item-unit">Feature Set</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Sampled Frames (24)</span><span class="sym-item-desc">Standard number of time frames sampled per gesture for fast model recognition</span><span class="sym-item-unit">Frames</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Gesture Motion Speed</span><span class="sym-item-desc">Speed of hand movement between frames used to detect when a sign starts and stops</span><span class="sym-item-unit">Speed</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Movement Threshold</span><span class="sym-item-desc">Motion level required to start recording a gesture</span><span class="sym-item-unit">Threshold</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Pause Duration (0.28s)</span><span class="sym-item-desc">Time the user holds hands still to signal the end of a gesture</span><span class="sym-item-unit">Seconds</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Confidence Score (50%)</span><span class="sym-item-desc">Minimum AI prediction confidence required to accept and display a translation</span><span class="sym-item-unit">Score</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Word Probability</span><span class="sym-item-desc">Model confidence score for each recognized sign word</span><span class="sym-item-unit">Confidence</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Sentence Confidence</span><span class="sym-item-desc">Model confidence score for full continuous sign sentence matches</span><span class="sym-item-unit">Confidence</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Custom Sign Similarity</span><span class="sym-item-desc">Pattern matching score used to identify personalized custom signs</span><span class="sym-item-unit">Similarity</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Avatar Arm Proportions</span><span class="sym-item-desc">Shoulder-to-elbow and elbow-to-wrist bone lengths in the 3D animated character</span><span class="sym-item-unit">Length</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Avatar Elbow Joint Angle</span><span class="sym-item-desc">Elbow bend angle computed to move avatar hands naturally to signing positions</span><span class="sym-item-unit">Angle</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Transition Arc Path</span><span class="sym-item-desc">Smooth curved path avatar hands follow between signs to prevent abrupt drops</span><span class="sym-item-unit">Curve</span></div>
      <div class="sym-list-item"><span class="sym-item-symbol">Statistical Significance</span><span class="sym-item-desc">Accuracy improvement confirmation verifying gains across unseen signers</span><span class="sym-item-unit">Score</span></div>
    </div>
    <div class="page-footer-roman">ix</div>
  </section>`;

  return [
    coverPage,
    innerTitlePage,
    certificatePage,
    declarationPage,
    acknowledgementPage,
    abstractPage,
    tocPage1,
    tocPage2,
    listOfFiguresPage,
    listOfTablesPage,
    abbreviationsPage,
    symbolsPage,
  ].join("\n");
}
