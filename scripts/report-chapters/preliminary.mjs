// Preliminary Pages (10 Pages: Outer Cover + Pages i to ix)
// Strictly formatted per B.M.S. College of Engineering (Autonomous Institute Affiliated to VTU)
// Department of Computer Science and Business Systems (CSBS) B.E. Project Report Guidelines

export function buildPreliminaryPages(meta) {
  const {
    title,
    shortTitle,
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

  // 1. OUTER COVER PAGE (Unnumbered)
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

  // 2. INNER TITLE PAGE (White) — Page i
  const innerTitlePage = String.raw`
  <section class="report-page prelim-page" data-roman="i">
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
    <div class="page-footer-roman">i</div>
  </section>`;

  // 3. CERTIFICATE PAGE — Page ii (Exact layout from CSBS_Project_Cover_Page__Format__1__5a665890.pdf Page 2)
  const certificatePage = String.raw`
  <section class="report-page prelim-page" data-roman="ii">
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
    <div class="page-footer-roman">ii</div>
  </section>`;

  // 4. DECLARATION BY STUDENTS & ACKNOWLEDGEMENT — Page iii
  const declarationAndAckPage = String.raw`
  <section class="report-page prelim-page" data-roman="iii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>Declaration &amp; Acknowledgement</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">DECLARATION BY STUDENTS</div>
    <p>
      We hereby declare that the project report entitled <strong>“<span class="report-project-title">${title}</span>”</strong> submitted to the <strong>Department of Computer Science and Business Systems, B.M.S. College of Engineering, Bangalore</strong>, in partial fulfillment of the requirements for the award of the degree of <strong>Bachelor of Engineering in Computer Science and Business Systems</strong> under <strong>Visvesvaraya Technological University (VTU), Belagavi</strong> during the academic year <strong>${academicYear}</strong>, is an authentic record of our own engineering and research work carried out under the supervision of <strong>${guideName}</strong>, ${guideDesignation}, Department of CSBS.
    </p>
    <p>
      We further declare that the matter embodied in this project report has not been submitted previously by us or any other candidate for the award of any other degree or diploma in any university or institution, and all external datasets (Amrita SLR, INCLUDE, and ISL-CSLTR under CC BY 4.0) and published literature have been duly cited in the References section.
    </p>
    <div style="display:flex; justify-content:space-between; margin:10pt 0 14pt 0; font-size:11.2pt;">
      <div>
        <strong>Place:</strong> Bangalore<br/>
        <strong>Date:</strong> November 2026
      </div>
      <div style="text-align:right; line-height:1.45;">
        ${students.map((s) => `<div><strong>${s.name}</strong> (${s.usn})</div>`).join("")}
      </div>
    </div>

    <hr style="border:none; border-top:1px solid #888; margin:10pt 0;" />

    <div class="chapter-title-center" style="margin-top:4pt; margin-bottom:8pt;">ACKNOWLEDGEMENT</div>
    <p>
      The successful completion of this major engineering project required technical guidance, institutional support, and encouragement from several distinguished individuals. We express our deep sense of gratitude to our respected Principal, <strong>${principalName}</strong>, B.M.S. College of Engineering, Bangalore, for providing an outstanding academic and research environment.
    </p>
    <p>
      We extend our sincere thanks to <strong>${hodName}</strong>, Professor and Head, Department of Computer Science and Business Systems, BMSCE, for continuous support, constructive reviews, and access to departmental computing resources throughout all phases of the project.
    </p>
    <p>
      We are profoundly grateful to our Project Guide, <strong>${guideName}</strong>, ${guideDesignation}, Department of Computer Science and Business Systems, BMSCE, whose technical mentorship, rigorous emphasis on signer-independent statistical evaluation, and thoughtful feedback shaped every architectural decision of <em>Silent Bridge</em>.
    </p>
    <p>
      We also thank the Project Coordinator, panel evaluators, faculty members, and non-teaching staff of the Department of Computer Science and Business Systems, as well as the creators and deaf signers of the open-access Amrita SLR, INCLUDE, and ISL-CSLTR corpora whose public contributions made authentic Indian Sign Language research possible.
    </p>
    <div class="page-footer-roman">iii</div>
  </section>`;

  // 5. PUBLICATION CERTIFICATE & ABSTRACT (SYNOPSIS) — Page iv
  const publicationAndAbstractPage = String.raw`
  <section class="report-page prelim-page" data-roman="iv">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>Publication Certificate &amp; Abstract</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:6pt;">PUBLICATION CERTIFICATE</div>
    <div style="border:1.5px solid #1e293b; padding:8pt 12pt; margin-bottom:9pt; background:#f8fafc;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #cbd5e1; padding-bottom:4pt; margin-bottom:5pt; font-size:9.8pt; line-height:1.35;">
        <div>
          <strong>From:</strong> Editor IJDDT &lt;<code>ijddtjournal@gmail.com</code>&gt;<br/>
          <strong>To:</strong> ${studentInlineCert} &nbsp;|&nbsp; <strong>Guide:</strong> ${guideName}, ${guideDesignation}
        </div>
        <div style="text-align:right; white-space:nowrap;">
          <strong>Date:</strong> Sun, Oct 4, 10:04 AM<br/>
          <strong>ISSN:</strong> 0975-4415 (Scopus Q3)
        </div>
      </div>
      <div style="text-align:center; font-weight:700; font-size:11.5pt; color:#0f172a; margin-bottom:4pt;">
        Congratulations on Your Publication! — International Journal of Drug Delivery Technologies (IJDDT)
      </div>
      <p style="font-size:9.8pt; line-height:1.38; margin-bottom:4pt; text-indent:0;">
        We are delighted to congratulate you on the successful publication of your research article in the <strong>International Journal of Drug Delivery Technologies (ISSN: 0975-4415)</strong>, an <strong>Active Scopus Indexed Q3 journal for 2026</strong>. The article is published in <strong>Volume 16, No. 7, 2026</strong> (the issue comprises 190 articles): <code>https://ijddt.com/volume16issue7/</code>
      </p>
      <p style="font-size:9.6pt; line-height:1.36; margin-bottom:4pt; text-indent:0;">
        Your research is now part of the global scholarly community, contributing valuable knowledge and inspiring future research. This achievement reflects your dedication, hard work and academic excellence. We encourage you to share your published article across your social media platforms and professional networks (Facebook, Instagram, WhatsApp Groups, Telegram Groups, WhatsApp Status and LinkedIn), and request you to cite your published article in your future research publications whenever relevant and appropriate. Once again, congratulations on this significant milestone!
      </p>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:9.6pt; line-height:1.3; margin-top:4pt; padding-top:3pt; border-top:0.5px dashed #94a3b8;">
        <div><strong>Article Title:</strong> <em>“<span class="report-project-title">${title}</span>”</em></div>
        <div style="text-align:right; white-space:nowrap; margin-left:8pt;">
          <strong>Regards, Managing Editor</strong><br/>
          International Journal of Drug Delivery Technologies (<code>https://ijddt.com</code>)
        </div>
      </div>
    </div>

    <div class="chapter-title-center" style="margin-top:4pt; margin-bottom:8pt;">ABSTRACT (SYNOPSIS)</div>
    <div style="border:1.5px solid #0f172a; padding:10pt 14pt; margin-bottom:10pt; background:#ffffff;">
      <p style="font-size:12pt; line-height:1.5; text-align:justify; text-indent:0; margin:0;">
        <strong>Silent Bridge</strong> is a real-time, privacy-preserving bidirectional assistive platform connecting Indian Sign Language (ISL) signers and Kannada speakers on commodity hardware. Using in-browser MediaPipe hand and face landmarks (147-D <code>hands-face-v2</code> schema), motion segmentation, and a Bidirectional GRU with 3-view Test-Time Augmentation, isolated-sign accuracy on unseen signers improved from 54.5% to 76.5% ($p=0.003$, overall 81.5%, macro-F1 0.800). A fused BiGRU-CTC and sentence classifier decodes continuous ISL sentences, while a multi-tier SOV grammar engine and a procedural 3D avatar with analytic inverse kinematics translate Kannada text into continuous ISL signing with zero mid-sign arm drops.
      </p>
    </div>
    <p style="font-size:11pt; line-height:1.45; text-indent:0; margin:0;">
      <strong>Keywords:</strong> Indian Sign Language (ISL), Kannada Translation, MediaPipe Landmarks, Bidirectional GRU, Connectionist Temporal Classification (CTC), ONNX WebAssembly, 3D Inverse Kinematics Avatar, Assistive Technology, UN SDGs 3, 4, 8, 9, 10.
    </p>
    <div class="page-footer-roman">iv</div>
  </section>`;

  // 6. TABLE OF CONTENTS (Part 1) — Page v
  const tocPage1 = String.raw`
  <section class="report-page prelim-page" data-roman="v">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>Table of Contents</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:8pt;">TABLE OF CONTENTS</div>
    <table class="toc-table">
      <thead>
        <tr>
          <th style="width:16%; text-align:left;">Section</th>
          <th style="width:72%; text-align:left;">Title</th>
          <th style="width:12%; text-align:right;">Page No.</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>i.</td><td>Inner Title Page</td><td class="r">i</td></tr>
        <tr><td>ii.</td><td>Certificate</td><td class="r">ii</td></tr>
        <tr><td>iii.</td><td>Declaration by Students &amp; Acknowledgement</td><td class="r">iii</td></tr>
        <tr><td>iv.</td><td>Publication Certificate &amp; Abstract (Synopsis)</td><td class="r">iv</td></tr>
        <tr><td>v.</td><td>Table of Contents</td><td class="r">v</td></tr>
        <tr><td>vi.</td><td>List of Figures &amp; List of Tables</td><td class="r">vii</td></tr>
        <tr><td>vii.</td><td>List of Abbreviations and Acronyms</td><td class="r">viii</td></tr>
        <tr><td>viii.</td><td>List of Symbols / Notations</td><td class="r">ix</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 1: INTRODUCTION</td><td class="r">1</td></tr>
        <tr><td>1.1</td><td>Background and Context of the Project</td><td class="r">1</td></tr>
        <tr><td>1.2</td><td>Project Domain Overview</td><td class="r">1</td></tr>
        <tr><td>1.3</td><td>Motivation</td><td class="r">2</td></tr>
        <tr><td>1.4</td><td>Problem Statement</td><td class="r">3</td></tr>
        <tr><td>1.5</td><td>Aim and Objectives</td><td class="r">3</td></tr>
        <tr><td>1.6</td><td>Scope of the Project</td><td class="r">4</td></tr>
        <tr><td>1.7</td><td>Significance and Expected Contribution</td><td class="r">4</td></tr>
        <tr><td>1.8</td><td>Industry and Societal Relevance</td><td class="r">5</td></tr>
        <tr><td>1.9</td><td>Sustainable Development Goals (SDGs) Addressed</td><td class="r">5</td></tr>
        <tr><td class="sub">1.9.1</td><td>Identification of Relevant SDGs</td><td class="r">5</td></tr>
        <tr><td class="sub">1.9.2</td><td>Selected SDG Targets</td><td class="r">5</td></tr>
        <tr><td class="sub">1.9.3</td><td>Alignment of Project Objectives with SDGs</td><td class="r">6</td></tr>
        <tr><td class="sub">1.9.4</td><td>Expected Social, Economic and Environmental Impact</td><td class="r">6</td></tr>
        <tr><td>1.10</td><td>Constraints and Limitations</td><td class="r">7</td></tr>
        <tr><td>1.11</td><td>Organization of the Report</td><td class="r">8</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 2: LITERATURE REVIEW AND RELATED WORK</td><td class="r">9</td></tr>
        <tr><td>2.1</td><td>Introduction</td><td class="r">9</td></tr>
        <tr><td>2.2</td><td>Review of Existing Systems / Research Studies</td><td class="r">9</td></tr>
        <tr><td>2.3</td><td>Comparative Analysis of Existing Approaches</td><td class="r">13</td></tr>
        <tr><td>2.4</td><td>Identified Research / Application Gap</td><td class="r">15</td></tr>
        <tr><td>2.5</td><td>Summary of the Literature Review</td><td class="r">16</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 3: REQUIREMENTS ANALYSIS AND PROJECT PLANNING</td><td class="r">17</td></tr>
        <tr><td>3.1</td><td>Introduction</td><td class="r">17</td></tr>
        <tr><td>3.2</td><td>Stakeholder Identification and User Needs</td><td class="r">17</td></tr>
        <tr><td>3.3</td><td>Problem / Opportunity Analysis from User and Business Perspectives</td><td class="r">18</td></tr>
        <tr><td>3.4</td><td>Functional Requirements</td><td class="r">18</td></tr>
        <tr><td>3.5</td><td>Non-Functional Requirements</td><td class="r">19</td></tr>
        <tr><td>3.6</td><td>Hardware and Software Requirements</td><td class="r">20</td></tr>
        <tr><td>3.7</td><td>Feasibility Analysis</td><td class="r">21</td></tr>
        <tr><td class="sub">3.7.1</td><td>Technical Feasibility</td><td class="r">21</td></tr>
        <tr><td class="sub">3.7.2</td><td>Economic / Cost Feasibility</td><td class="r">21</td></tr>
        <tr><td class="sub">3.7.3</td><td>Operational and Schedule Feasibility</td><td class="r">21</td></tr>
        <tr><td>3.8</td><td>Project Plan, Milestones and Task Allocation</td><td class="r">22</td></tr>
        <tr><td>3.9</td><td>Risk Assessment and Mitigation</td><td class="r">23</td></tr>
        <tr><td>3.10</td><td>Data Privacy, Security, and Compliance Requirements</td><td class="r">24</td></tr>
      </tbody>
    </table>
    <div class="page-footer-roman">v</div>
  </section>`;

  // 7. TABLE OF CONTENTS (Part 2) — Page vi
  const tocPage2 = String.raw`
  <section class="report-page prelim-page" data-roman="vi">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>Table of Contents</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:6pt;">TABLE OF CONTENTS (Continued)</div>
    <table class="toc-table">
      <thead>
        <tr>
          <th style="width:16%; text-align:left;">Section</th>
          <th style="width:72%; text-align:left;">Title</th>
          <th style="width:12%; text-align:right;">Page No.</th>
        </tr>
      </thead>
      <tbody>
        <tr class="toc-ch"><td colspan="2">CHAPTER 4: BUSINESS MODEL AND SUSTAINABILITY FRAMEWORK</td><td class="r">25</td></tr>
        <tr><td>4.1</td><td>Introduction to the Proposed Business / Solution</td><td class="r">25</td></tr>
        <tr><td>4.2</td><td>Identification of Target Users and Customer Segments</td><td class="r">25</td></tr>
        <tr><td>4.3</td><td>Customer Problem and Value Proposition</td><td class="r">26</td></tr>
        <tr><td>4.4</td><td>Business Model Canvas</td><td class="r">27</td></tr>
        <tr><td>4.5</td><td>Market / User Adoption Potential</td><td class="r">28</td></tr>
        <tr><td>4.6</td><td>Cost-Benefit Analysis</td><td class="r">28</td></tr>
        <tr><td>4.7</td><td>Revenue Generation and Pricing Model</td><td class="r">29</td></tr>
        <tr><td>4.8</td><td>Business Feasibility and Viability</td><td class="r">29</td></tr>
        <tr><td>4.9</td><td>Scalability and Long-Term Sustainability</td><td class="r">30</td></tr>
        <tr><td>4.10</td><td>SDG Impact Pathway and Measurable Indicators</td><td class="r">31</td></tr>
        <tr><td>4.11</td><td>Summary</td><td class="r">31</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 5: SYSTEM DESIGN AND METHODOLOGY</td><td class="r">32</td></tr>
        <tr><td>5.1</td><td>Proposed Solution / System Overview</td><td class="r">32</td></tr>
        <tr><td>5.2</td><td>System Architecture</td><td class="r">32</td></tr>
        <tr><td>5.3</td><td>Module Description</td><td class="r">33</td></tr>
        <tr><td>5.4</td><td>Workflow / Process Design</td><td class="r">34</td></tr>
        <tr><td>5.5</td><td>Data Design / Database Design (if applicable)</td><td class="r">35</td></tr>
        <tr><td>5.6</td><td>UML / DFD / ER Diagrams (as applicable)</td><td class="r">36</td></tr>
        <tr><td>5.7</td><td>Algorithm / Model / Business Logic Design</td><td class="r">38</td></tr>
        <tr><td>5.8</td><td>User Interface and Interaction Design</td><td class="r">41</td></tr>
        <tr><td>5.9</td><td>Security, Privacy, Ethics and Responsible Use</td><td class="r">41</td></tr>
        <tr><td>5.10</td><td>Methodology and Evaluation Strategy</td><td class="r">42</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 6: IMPLEMENTATION AND INTEGRATION</td><td class="r">43</td></tr>
        <tr><td>6.1</td><td>Development Environment and Technology Stack</td><td class="r">43</td></tr>
        <tr><td>6.2</td><td>Implementation Approach</td><td class="r">43</td></tr>
        <tr><td>6.3</td><td>Module-wise Implementation</td><td class="r">44</td></tr>
        <tr><td>6.4</td><td>Database / API / Model Integration (as applicable)</td><td class="r">49</td></tr>
        <tr><td>6.5</td><td>Key Screens / System Demonstration</td><td class="r">50</td></tr>
        <tr><td>6.6</td><td>Integration and Deployment</td><td class="r">50</td></tr>
        <tr><td>6.7</td><td>Challenges Encountered and Solutions</td><td class="r">51</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 7: TESTING, RESULTS AND DISCUSSION</td><td class="r">52</td></tr>
        <tr><td>7.1</td><td>Testing Strategy</td><td class="r">52</td></tr>
        <tr><td>7.2</td><td>Test Environment and Test Data</td><td class="r">52</td></tr>
        <tr><td>7.3</td><td>Test Cases and Test Results</td><td class="r">53</td></tr>
        <tr><td>7.4</td><td>Functional and Non-Functional Testing</td><td class="r">54</td></tr>
        <tr><td>7.5</td><td>Performance / Model Evaluation (as applicable)</td><td class="r">55</td></tr>
        <tr><td>7.6</td><td>Results and Observations</td><td class="r">59</td></tr>
        <tr><td>7.7</td><td>Comparison with Existing / Baseline Approach</td><td class="r">59</td></tr>
        <tr><td>7.8</td><td>Achievement of Project Objectives</td><td class="r">59</td></tr>
        <tr><td>7.9</td><td>Business Model Validation and User Feedback</td><td class="r">60</td></tr>
        <tr><td>7.10</td><td>Business, Social and Environmental Impact</td><td class="r">60</td></tr>
        <tr><td>7.11</td><td>Contribution to Selected SDG Targets</td><td class="r">60</td></tr>
        <tr><td>7.12</td><td>Measurement of SDG Outcomes and Impact Indicators</td><td class="r">60</td></tr>
        <tr><td>7.13</td><td>Limitations and Threats to Validity</td><td class="r">60</td></tr>

        <tr class="toc-ch"><td colspan="2">CHAPTER 8: CONCLUSION AND FUTURE ENHANCEMENTS</td><td class="r">61</td></tr>
        <tr><td>8.1</td><td>Summary of the Project</td><td class="r">61</td></tr>
        <tr><td>8.2</td><td>Conclusions</td><td class="r">61</td></tr>
        <tr><td>8.3</td><td>Achievement of Project Objectives</td><td class="r">62</td></tr>
        <tr><td>8.4</td><td>Key Technical and Business Contributions</td><td class="r">62</td></tr>
        <tr><td>8.5</td><td>Future Scope and Enhancements</td><td class="r">63</td></tr>
        <tr class="toc-ch"><td colspan="2">REFERENCES</td><td class="r">64</td></tr>
        <tr class="toc-ch"><td colspan="2">PUBLICATIONS: Published Journal/Conference/Patent</td><td class="r">65</td></tr>
        <tr class="toc-ch"><td colspan="2">APPENDIX A: 144-Class ISL Vocabulary &amp; Kannada Lexicon</td><td class="r">66</td></tr>
      </tbody>
    </table>
    <div class="page-footer-roman">vi</div>
  </section>`;

  // 8. LIST OF FIGURES & LIST OF TABLES — Page vii
  const listOfFiguresAndTablesPage = String.raw`
  <section class="report-page prelim-page" data-roman="vii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>List of Figures &amp; Tables</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:6pt;">LIST OF FIGURES</div>
    <table class="toc-table" style="margin-bottom:8pt;">
      <thead>
        <tr>
          <th style="width:16%; text-align:left;">Figure No.</th>
          <th style="width:72%; text-align:left;">Caption</th>
          <th style="width:12%; text-align:right;">Page No.</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Fig. 1.1</td><td>Bidirectional ISL-to-Kannada and Kannada-to-ISL Communication Paradigm</td><td class="r">2</td></tr>
        <tr><td>Fig. 2.1</td><td>Taxonomy of Sign Language Recognition and Avatar Synthesis Approaches</td><td class="r">14</td></tr>
        <tr><td>Fig. 3.1</td><td>11-Phase Project Engineering Schedule and Gantt Timeline</td><td class="r">22</td></tr>
        <tr><td>Fig. 4.1</td><td>Silent Bridge 9-Block Business Model Canvas</td><td class="r">27</td></tr>
        <tr><td>Fig. 5.1</td><td>Silent Bridge End-to-End System Architecture (Landmark-Only Privacy Boundary)</td><td class="r">32</td></tr>
        <tr><td>Fig. 5.2</td><td>Forward Sign-to-Kannada and Reverse Kannada-to-Avatar Process Flowcharts</td><td class="r">34</td></tr>
        <tr><td>Fig. 5.3</td><td>Level-0 Context DFD and Level-1 Subsystem Data Flow Diagram</td><td class="r">36</td></tr>
        <tr><td>Fig. 5.4</td><td>UML Use Case, Runtime Sequence, and Entity-Relationship Schema Diagrams</td><td class="r">37</td></tr>
        <tr><td>Fig. 7.1</td><td>Valid Training Recordings per Sign for the Active 64-Sign Model by Source Dataset</td><td class="r">52</td></tr>
        <tr><td>Fig. 7.2</td><td>Top-1 Accuracy Progression of Successive Models on Held-Out Videos</td><td class="r">55</td></tr>
        <tr><td>Fig. 7.3</td><td>Precision, Recall, and Coverage Curve Against Confidence Threshold (1,435 OOF Predictions)</td><td class="r">55</td></tr>
        <tr><td>Fig. 7.4</td><td>Per-Sign F1-Score of the Active Model Across 60 Held-Out Test Classes</td><td class="r">56</td></tr>
        <tr><td>Fig. 7.5</td><td>Sign Error Rate (SER) of Segmentation Variants on 50 Five-Sign Streams</td><td class="r">57</td></tr>
        <tr><td>Fig. 7.6</td><td>Top-1 Accuracy Under Synthetic Landmark Perturbations on 268 Held-Out Videos</td><td class="r">57</td></tr>
      </tbody>
    </table>

    <div class="chapter-title-center" style="margin-top:4pt; margin-bottom:6pt;">LIST OF TABLES</div>
    <table class="toc-table">
      <thead>
        <tr>
          <th style="width:16%; text-align:left;">Table No.</th>
          <th style="width:72%; text-align:left;">Caption</th>
          <th style="width:12%; text-align:right;">Page No.</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Table 1.1</td><td>Alignment of Silent Bridge Objectives with UN SDG Targets</td><td class="r">6</td></tr>
        <tr><td>Table 1.2</td><td>Chapter-Wise Structural Summary of the B.E. Project Report</td><td class="r">8</td></tr>
        <tr><td>Table 2.1</td><td>Comparative Analysis of Existing Sign Language Recognition &amp; Avatar Systems</td><td class="r">13</td></tr>
        <tr><td>Table 2.2</td><td>Feature-Level Architectural Comparison Across 12 Benchmark Studies</td><td class="r">14</td></tr>
        <tr><td>Table 3.1</td><td>Stakeholder Identification, Needs, and System Value Delivery</td><td class="r">17</td></tr>
        <tr><td>Table 3.2</td><td>Minimum and Recommended Hardware Specifications</td><td class="r">20</td></tr>
        <tr><td>Table 3.3</td><td>Software and Library Stack Specifications</td><td class="r">20</td></tr>
        <tr><td>Table 3.4</td><td>11-Phase Project Engineering Schedule, Milestones, and Key Deliverables</td><td class="r">22</td></tr>
        <tr><td>Table 3.5</td><td>Risk Assessment and Mitigation Matrix (FMEA)</td><td class="r">23</td></tr>
        <tr><td>Table 4.1–4.6</td><td>Customer Segments, Value Proposition, Cost-Benefit, Pricing, Financials &amp; SDG KPIs</td><td class="r">25–31</td></tr>
        <tr><td>Table 5.1–5.2</td><td>Subsystem Modules and 147-Dimensional <code>hands-face-v2</code> Feature Schema</td><td class="r">33–35</td></tr>
        <tr><td>Table 6.1–6.3</td><td>Production Stack, REST/WebSocket API Specification, and Engineering Challenges</td><td class="r">43–51</td></tr>
        <tr><td>Table 7.1–7.14</td><td>Datasets, 24 Test Cases, Parity, Latency, Isolated/Sentence Results &amp; SDG Outcomes</td><td class="r">52–60</td></tr>
        <tr><td>Table 8.1</td><td>Summary of Key Technical, Algorithmic, and Business Contributions</td><td class="r">62</td></tr>
      </tbody>
    </table>
    <div class="page-footer-roman">vii</div>
  </section>`;

  // 9. LIST OF ABBREVIATIONS AND ACRONYMS — Page viii
  const abbreviationsPage = String.raw`
  <section class="report-page prelim-page" data-roman="viii">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>List of Abbreviations</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">LIST OF ABBREVIATIONS AND ACRONYMS</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:22%;">Acronym</th>
          <th style="width:78%;">Full Expansion and Technical Meaning</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>ISL</strong></td><td>Indian Sign Language — Natural visual-spatial language used by the deaf community in India</td></tr>
        <tr><td><strong>SLR / SLT</strong></td><td>Sign Language Recognition / Sign Language Translation</td></tr>
        <tr><td><strong>CSLR</strong></td><td>Continuous Sign Language Recognition (unsegmented multi-sign stream decoding)</td></tr>
        <tr><td><strong>BiGRU</strong></td><td>Bidirectional Gated Recurrent Unit neural network architecture</td></tr>
        <tr><td><strong>CTC</strong></td><td>Connectionist Temporal Classification alignment-free sequence loss and decoder</td></tr>
        <tr><td><strong>TTA</strong></td><td>Test-Time Augmentation (3-view ensemble over full, 3-tap denoised, and 84% core-stroke crops)</td></tr>
        <tr><td><strong>ONNX</strong></td><td>Open Neural Network Exchange portable cross-platform model format</td></tr>
        <tr><td><strong>WASM</strong></td><td>WebAssembly binary instruction format for near-native in-browser execution</td></tr>
        <tr><td><strong>IK</strong></td><td>Inverse Kinematics (analytic two-bone shoulder-elbow-wrist solver for 3D avatar arms)</td></tr>
        <tr><td><strong>SOV</strong></td><td>Subject–Object–Verb canonical constituent word order of Kannada</td></tr>
        <tr><td><strong>NMM</strong></td><td>Non-Manual Markers (eyebrow raise/furrow, head tilt/shake, mouthing in ISL grammar)</td></tr>
        <tr><td><strong>EMA</strong></td><td>Exponential Moving Average temporal filter for landmark and probability smoothing</td></tr>
        <tr><td><strong>SER / GER</strong></td><td>Sign Error Rate / Gloss Error Rate (Levenshtein edit distance normalized by reference length)</td></tr>
        <tr><td><strong>OOF</strong></td><td>Out-of-Fold cross-validation predictions used for unbiased confidence threshold calibration</td></tr>
        <tr><td><strong>OOD</strong></td><td>Out-of-Distribution / Non-sign motion rejection via calibrated confidence gating</td></tr>
        <tr><td><strong>MCP / PIP / DIP</strong></td><td>Metacarpophalangeal, Proximal Interphalangeal, and Distal Interphalangeal finger joints</td></tr>
        <tr><td><strong>TTS</strong></td><td>Text-to-Speech synthesis (Web Speech API <code>kn-IN</code> voice with optional gTTS fallback)</td></tr>
        <tr><td><strong>PWA</strong></td><td>Progressive Web Application with Service Worker offline asset caching</td></tr>
        <tr><td><strong>DPDP</strong></td><td>Digital Personal Data Protection Act, 2023 (India privacy framework)</td></tr>
        <tr><td><strong>SDG</strong></td><td>United Nations Sustainable Development Goals (2030 Agenda)</td></tr>
        <tr><td><strong>BMC</strong></td><td>Business Model Canvas (Osterwalder 9-block strategic enterprise framework)</td></tr>
        <tr><td><strong>TAM / SAM / SOM</strong></td><td>Total Addressable Market / Serviceable Addressable Market / Serviceable Obtainable Market</td></tr>
        <tr><td><strong>FMEA / RPN</strong></td><td>Failure Mode and Effects Analysis / Risk Priority Number ($\text{Severity} \times \text{Occurrence} \times \text{Detection}$)</td></tr>
        <tr><td><strong>CRC-32 / MD5</strong></td><td>Cyclic Redundancy Check (32-bit) / Message-Digest 5 cryptographic integrity checksums</td></tr>
      </tbody>
    </table>
    <div class="page-footer-roman">viii</div>
  </section>`;

  // 10. LIST OF SYMBOLS / NOTATIONS — Page ix
  const symbolsPage = String.raw`
  <section class="report-page prelim-page" data-roman="ix">
    <div class="page-running-header">
      <span class="report-project-title">${title}</span>
      <span>List of Symbols &amp; Notations</span>
    </div>
    <div class="chapter-title-center" style="margin-top:0; margin-bottom:10pt;">LIST OF SYMBOLS AND NOTATIONS</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:24%;">Symbol</th>
          <th style="width:58%;">Mathematical Definition</th>
          <th style="width:18%;">SI Unit / Dim.</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>$\mathbf{p}_i = (x_i, y_i, z_i)$</td><td>3D MediaPipe landmark coordinates for hand joint $i \in \{0,\dots,20\}$</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$\mathbf{p}_0$</td><td>Wrist root landmark coordinate (anchor of hand coordinate frame)</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$s_{\text{palm}}$</td><td>Apparent palm scale $\max(\|\mathbf{p}_9 - \mathbf{p}_0\|_2, 10^{-3})$</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$\mathbf{c}_{\text{face}}, w_{\text{face}}, h_{\text{face}}$</td><td>Face bounding-box center $(c_x, c_y)$ and dimensions $(w, h)$</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$\hat{\mathbf{d}}, \hat{\mathbf{n}}$</td><td>Orthonormal finger direction unit vector and palm normal unit vector</td><td>Unit vector $\in \mathbb{R}^3$</td></tr>
        <tr><td>$\mathbf{f}_t \in \mathbb{R}^{147}$</td><td>Single-frame feature vector under schema <code>hands-face-v2</code> at time $t$</td><td>$147$ (dimensionless)</td></tr>
        <tr><td>$T$</td><td>Resampled temporal sequence length ($T = 24$ frames for active model)</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$\mathbf{x} \in \mathbb{R}^{3668}$</td><td>Flattened segment feature vector ($147 T + 6(T-1) + 2 = 3,668$)</td><td>$3,668$ (dimensionless)</td></tr>
        <tr><td>$m_t$</td><td>Inter-frame 21-landmark displacement rate normalized to $30\text{ Hz}$</td><td>$\text{s}^{-1}$ ($\text{Hz}$)</td></tr>
        <tr><td>$\theta_{\text{start}}, \theta_{\text{still}}$</td><td>Motion onset threshold ($0.014\text{ s}^{-1}$) and stillness threshold ($0.006\text{ s}^{-1}$)</td><td>$\text{s}^{-1}$</td></tr>
        <tr><td>$T_{\text{still}}$</td><td>Required stillness hold duration to close an active sign segment ($0.28\text{ s}$)</td><td>$\text{s}$ ($\text{ms} = 10^{-3}\text{ s}$)</td></tr>
        <tr><td>$\tau^*$</td><td>Validation-calibrated confidence rejection threshold ($\tau^* = 0.50$)</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$P_{\text{CTC}}(g_s \mid \mathbf{X})$</td><td>CTC sequence probability of gloss sequence $g_s$ given frame matrix $\mathbf{X}$</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$P_{\text{cls}}(s \mid \mathbf{X})$</td><td>Sentence classifier probability for corpus sentence $s \in \{1,\dots,101\}$</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$\lambda$</td><td>Log-likelihood fusion weight between CTC and sentence classifier ($\lambda = 1.0$)</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$S_{\text{block}}(\mathbf{u}, \mathbf{v})$</td><td>Block-balanced cosine similarity across 5 semantic feature subspaces</td><td>Dimensionless ($1$)</td></tr>
        <tr><td>$L_1, L_2$</td><td>Upper-arm length ($0.29\text{ m}$) and forearm length ($0.27\text{ m}$) in 3D avatar rig</td><td>Meter ($\text{m}$)</td></tr>
        <tr><td>$\theta_{\text{elbow}}$</td><td>Interior elbow flexion angle solved via Law of Cosines in analytic 2-bone IK</td><td>Radian ($\text{rad}$)</td></tr>
        <tr><td>$\Delta\mathbf{p}_{\text{arc}}(u)$</td><td>Ballistic co-articulation transition offset at normalized phase $u \in [0,1]$</td><td>Meter ($\text{m}$)</td></tr>
        <tr><td>$\chi^2, p$</td><td>Exact paired McNemar test statistic and two-sided statistical $p$-value</td><td>Dimensionless ($1$)</td></tr>
      </tbody>
    </table>
    <div class="page-footer-roman">ix</div>
  </section>`;

  return [
    coverPage,
    innerTitlePage,
    certificatePage,
    declarationAndAckPage,
    publicationAndAbstractPage,
    tocPage1,
    tocPage2,
    listOfFiguresAndTablesPage,
    abbreviationsPage,
    symbolsPage,
  ].join("\n");
}
