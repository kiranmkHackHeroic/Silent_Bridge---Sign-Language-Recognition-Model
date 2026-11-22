#!/usr/bin/env node
/**
 * Generates the Bold & Impressive 12-Slide Widescreen (16:9) Executive Presentation Deck
 * for SILENT BRIDGE: Real-Time Bidirectional Indian Sign Language and Kannada Translation
 * with 3D Avatar (B.M.S. College of Engineering — Department of CSBS).
 *
 * Covers ALL project & research contents in a crisp, varied 12-slide layout:
 *  1. Bold Cover Slide (Deep Navy Executive Hero + Headline KPIs + Sorted Team USNs)
 *  2. Motivation, Problem Statement & Engineering Objectives
 *  3. Literature Survey & Research Gap Matrix
 *  4. End-to-End System Architecture (Full-Width Architectural Diagram + 3-Tier Breakdown)
 *  5. Proposed Methodology: 147-D hands-face-v2 Schema & Dual Bidirectional Pipelines
 *  6. Deep Learning Architecture: GRU, BiGRU & CTC (Isolated vs. Continuous Distinction)
 *  7. Software/Hardware Stack, Audited Datasets & 16 Implementation Modules
 *  8. Live Application Showcase (Dual UI Gallery: Live ISL->Kannada & 3D Avatar)
 *  9. Quantitative Results (1/2): Isolated Sign Accuracy (64-Sign -> Promoted 144-Sign)
 * 10. Quantitative Results (2/2): Per-Class F1, Confusions, Ablation, Latency & Avatar Audit
 * 11. Comparison with Existing Research, 5-Axis Scalability & Deaf ISL User Study (#study)
 * 12. Academic Deliverables (6p NCDTE Paper & 79p Report), Conclusion & Thank You
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "frontend", "public", "report");
const DOCS_PAPER_DIR = path.join(ROOT, "docs", "paper");

const FONT_DISPLAY = "Georgia";
const FONT_BODY = "Calibri";
const FONT_MONO = "Consolas";
const TOTAL_SLIDES = 12;

const PALETTE = {
  navy: "0B192C",
  navyMid: "162C46",
  lapis: "1E3A8A",
  teal: "0F766E",
  tealLight: "F0FDFA",
  gold: "D97706",
  goldSoft: "FEF3C7",
  ink: "0F172A",
  body: "1E293B",
  muted: "475569",
  subtle: "64748B",
  surface: "F8FAFC",
  surfaceAlt: "F1F5F9",
  border: "CBD5E1",
  borderLight: "E2E8F0",
  white: "FFFFFF",
};

function readImageDataUri(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${base64}`;
}

const IMAGES = {
  logo: readImageDataUri(path.join(REPORT_DIR, "bmsce_logo.jpg")),
  figArchitecture: readImageDataUri(path.join(REPORT_DIR, "fig_architecture.png")),
  figResults: readImageDataUri(path.join(REPORT_DIR, "fig_results.png")),
  figPerclass: readImageDataUri(path.join(REPORT_DIR, "fig_perclass.png")),
  figRobustness: readImageDataUri(path.join(REPORT_DIR, "fig_robustness.png")),
  figUiLive: readImageDataUri(path.join(REPORT_DIR, "fig_ui_live.png")),
  figUiAvatar: readImageDataUri(path.join(REPORT_DIR, "fig_ui_avatar.png")),
};

function addBoldHeader(slide, pptx, slideNum, kicker, title, subtitle) {
  slide.background = { color: PALETTE.white };

  // Crisp 0.08 in top institutional accent stripe
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.08,
    fill: { color: PALETTE.navy },
    line: { color: PALETTE.navy, width: 0 },
  });
  // Gold accent segment on top stripe proportional to progress
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: Number(((13.333 * slideNum) / TOTAL_SLIDES).toFixed(3)),
    h: 0.08,
    fill: { color: PALETTE.teal },
    line: { color: PALETTE.teal, width: 0 },
  });

  // Kicker text (clean unboxed metadata)
  slide.addText(`${String(slideNum).padStart(2, "0")}  /  ${kicker}`, {
    x: 0.55,
    y: 0.2,
    w: 9.5,
    h: 0.22,
    fontFace: FONT_BODY,
    fontSize: 9.5,
    bold: true,
    color: PALETTE.teal,
    valign: "middle",
  });

  // Slide title
  slide.addText(title, {
    x: 0.55,
    y: 0.42,
    w: 11.5,
    h: 0.42,
    fontFace: FONT_DISPLAY,
    fontSize: 21,
    bold: true,
    color: PALETTE.navy,
    valign: "middle",
  });

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55,
      y: 0.84,
      w: 12.2,
      h: 0.24,
      fontFace: FONT_BODY,
      fontSize: 10.5,
      color: PALETTE.muted,
      valign: "middle",
    });
  }

  // Subtle hairline rule
  slide.addShape(pptx.ShapeType.line, {
    x: 0.55,
    y: 1.12,
    w: 12.23,
    h: 0,
    line: { color: PALETTE.border, width: 0.8 },
  });

  // Quiet bottom institutional footer + slide number
  slide.addShape(pptx.ShapeType.line, {
    x: 0.55,
    y: 7.08,
    w: 12.23,
    h: 0,
    line: { color: PALETTE.borderLight, width: 0.6 },
  });
  slide.addText("SILENT BRIDGE · Real-Time Bidirectional ISL & Kannada Translation · Dept. of CSBS, BMSCE", {
    x: 0.55,
    y: 7.12,
    w: 10.2,
    h: 0.24,
    fontFace: FONT_BODY,
    fontSize: 8.5,
    color: PALETTE.subtle,
    valign: "middle",
  });
  slide.addText(`${slideNum} / ${TOTAL_SLIDES}`, {
    x: 11.6,
    y: 7.12,
    w: 1.18,
    h: 0.24,
    fontFace: FONT_BODY,
    fontSize: 9.5,
    bold: true,
    color: PALETTE.navy,
    align: "right",
    valign: "middle",
  });
}

function addSectionLabel(slide, pptx, x, y, w, text, color = PALETTE.navy) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.26,
    fontFace: FONT_DISPLAY,
    fontSize: 12.5,
    bold: true,
    color,
    valign: "middle",
  });
  slide.addShape(pptx.ShapeType.line, {
    x,
    y: y + 0.27,
    w,
    h: 0,
    line: { color: PALETTE.border, width: 0.75 },
  });
}

function addKpiCard(slide, pptx, x, y, w, h, value, label, sub, dark = false) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: dark ? PALETTE.navy : PALETTE.surface },
    line: { color: dark ? PALETTE.navyMid : PALETTE.border, width: 0.8 },
  });
  slide.addText(value, {
    x: x + 0.14,
    y: y + 0.08,
    w: w - 0.28,
    h: 0.36,
    fontFace: FONT_DISPLAY,
    fontSize: 19,
    bold: true,
    color: dark ? PALETTE.white : PALETTE.navy,
    valign: "middle",
  });
  slide.addText(label, {
    x: x + 0.14,
    y: y + 0.44,
    w: w - 0.28,
    h: 0.22,
    fontFace: FONT_BODY,
    fontSize: 9.5,
    bold: true,
    color: dark ? "5EEAD4" : PALETTE.teal,
    valign: "middle",
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.14,
      y: y + 0.65,
      w: w - 0.28,
      h: 0.22,
      fontFace: FONT_BODY,
      fontSize: 8.2,
      color: dark ? "CBD5E1" : PALETTE.muted,
      valign: "middle",
    });
  }
}

function hCell(text) {
  return {
    text,
    options: {
      bold: true,
      fill: { color: PALETTE.navy },
      color: PALETTE.white,
    },
  };
}

function bCell(text, color = PALETTE.ink) {
  return { text, options: { bold: true, color } };
}

async function generatePptxFile() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pptx.author = "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)";
  pptx.company = "B.M.S. College of Engineering — Department of CSBS";
  pptx.subject = "Silent Bridge — 12-Slide Executive Presentation";
  pptx.title =
    "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

  // =========================================================================
  // SLIDE 1: BOLD EXECUTIVE COVER SLIDE (DEEP NAVY HERO)
  // =========================================================================
  {
    const s = pptx.addSlide();
    s.background = { color: PALETTE.navy };

    // Left vertical geometric accent band (subtle structural depth)
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.22,
      h: 7.5,
      fill: { color: PALETTE.teal },
      line: { color: PALETTE.teal, width: 0 },
    });
    // Top subtle gold hairline
    s.addShape(pptx.ShapeType.rect, {
      x: 0.72,
      y: 0.56,
      w: 1.4,
      h: 0.05,
      fill: { color: PALETTE.gold },
      line: { color: PALETTE.gold, width: 0 },
    });

    // Institution header
    s.addText("B.M.S. COLLEGE OF ENGINEERING, BENGALURU", {
      x: 0.72,
      y: 0.72,
      w: 9.8,
      h: 0.34,
      fontFace: FONT_BODY,
      fontSize: 13,
      bold: true,
      color: "E2E8F0",
      charSpacing: 1.5,
    });
    s.addText("Department of Computer Science and Business Systems  ·  B.E. Final Year Project & NCDTE Conference Research", {
      x: 0.72,
      y: 1.05,
      w: 10.0,
      h: 0.26,
      fontFace: FONT_BODY,
      fontSize: 10.5,
      color: "94A3B8",
    });

    // BMSCE Emblem framed cleanly on top-right
    if (IMAGES.logo) {
      s.addShape(pptx.ShapeType.rect, {
        x: 11.45,
        y: 0.52,
        w: 1.24,
        h: 1.24,
        fill: { color: PALETTE.white },
        line: { color: "334155", width: 1 },
      });
      s.addImage({ data: IMAGES.logo, x: 11.55, y: 0.62, w: 1.04, h: 1.04 });
    }

    // Dominant Hero Title
    s.addText("SILENT BRIDGE", {
      x: 0.72,
      y: 1.68,
      w: 11.8,
      h: 0.78,
      fontFace: FONT_DISPLAY,
      fontSize: 42,
      bold: true,
      color: PALETTE.white,
    });
    s.addText("Real-Time Bidirectional Indian Sign Language and\nKannada Translation with 3D Avatar", {
      x: 0.72,
      y: 2.52,
      w: 11.5,
      h: 1.05,
      fontFace: FONT_DISPLAY,
      fontSize: 22,
      color: "CBD5E1",
      lineSpacingMultiple: 1.2,
    });

    // 4-Metric Proof Strip right below hero title
    const coverStats = [
      ["87.2%", "Promoted 144-Sign Accuracy", "81.7% unseen Amrita · F1 0.850"],
      ["147-D", "Browser-Local Landmarks", "Zero raw video leaves device"],
      ["161 Clips", "3D Analytic IK Avatar", "367 → 0 arm drops · 60 fps"],
      ["6p + 79p", "NCDTE Paper & CSBS Report", "6% AI iThenticate · #study live"],
    ];
    coverStats.forEach(([val, lbl, sub], i) => {
      const cx = 0.72 + i * 3.04;
      s.addShape(pptx.ShapeType.rect, {
        x: cx,
        y: 3.92,
        w: 2.86,
        h: 1.06,
        fill: { color: PALETTE.navyMid },
        line: { color: "26415E", width: 1 },
      });
      s.addText(val, {
        x: cx + 0.16,
        y: 4.02,
        w: 2.54,
        h: 0.4,
        fontFace: FONT_DISPLAY,
        fontSize: 21,
        bold: true,
        color: "5EEAD4",
      });
      s.addText(lbl, {
        x: cx + 0.16,
        y: 4.44,
        w: 2.54,
        h: 0.24,
        fontFace: FONT_BODY,
        fontSize: 10,
        bold: true,
        color: PALETTE.white,
      });
      s.addText(sub, {
        x: cx + 0.16,
        y: 4.68,
        w: 2.54,
        h: 0.22,
        fontFace: FONT_BODY,
        fontSize: 8.5,
        color: "94A3B8",
      });
    });

    // Bottom horizontal divider
    s.addShape(pptx.ShapeType.line, {
      x: 0.72,
      y: 5.34,
      w: 11.96,
      h: 0,
      line: { color: "26415E", width: 1 },
    });

    // Bottom Left: Guidance & Leadership
    s.addText("UNDER THE GUIDANCE OF", {
      x: 0.72,
      y: 5.5,
      w: 5.6,
      h: 0.22,
      fontFace: FONT_BODY,
      fontSize: 9,
      bold: true,
      color: "F59E0B",
      charSpacing: 1.2,
    });
    s.addText("Prof. Tejaswini K", {
      x: 0.72,
      y: 5.75,
      w: 5.6,
      h: 0.32,
      fontFace: FONT_DISPLAY,
      fontSize: 15,
      bold: true,
      color: PALETTE.white,
    });
    s.addText("Assistant Professor, Department of CSBS\nHoD: Dr. R Ashok Kumar  ·  Principal: Dr. Bheemsha Arya", {
      x: 0.72,
      y: 6.08,
      w: 5.8,
      h: 0.56,
      fontFace: FONT_BODY,
      fontSize: 10,
      color: "CBD5E1",
      lineSpacingMultiple: 1.3,
    });

    // Bottom Right: Student Team (strictly increasing USN order)
    s.addText("PRESENTED BY (TEAM CSBS)", {
      x: 6.9,
      y: 5.5,
      w: 5.78,
      h: 0.22,
      fontFace: FONT_BODY,
      fontSize: 9,
      bold: true,
      color: "F59E0B",
      align: "right",
      charSpacing: 1.2,
    });
    s.addText(
      "H S Thanush  —  1BM23CB066\nKiran M K  —  1BM23CB068\nManoj G U  —  1BM24CB401",
      {
        x: 6.9,
        y: 5.75,
        w: 5.78,
        h: 0.92,
        fontFace: FONT_BODY,
        fontSize: 12.5,
        bold: true,
        color: PALETTE.white,
        align: "right",
        lineSpacingMultiple: 1.32,
      }
    );

    s.addText("Academic Year 2026–2027", {
      x: 0.72,
      y: 7.05,
      w: 5.0,
      h: 0.26,
      fontFace: FONT_BODY,
      fontSize: 9.5,
      color: "94A3B8",
    });
    s.addText(`1 / ${TOTAL_SLIDES}`, {
      x: 11.6,
      y: 7.05,
      w: 1.08,
      h: 0.26,
      fontFace: FONT_BODY,
      fontSize: 9.5,
      bold: true,
      color: "94A3B8",
      align: "right",
    });
  }

  // =========================================================================
  // SLIDE 2: MOTIVATION, PROBLEM STATEMENT & OBJECTIVES
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      2,
      "CONTEXT & SCOPE",
      "Motivation, Problem Statement & Core Objectives",
      "Bridging the Real-Time Indian Sign Language and Regional Kannada Communication Divide"
    );

    // Left Column: Problem Statement & Regional Context
    addSectionLabel(s, pptx, 0.55, 1.26, 6.0, "The Communication & Technical Gap");
    s.addText(
      "Over 63 million people in India experience hearing loss, yet public counters (hospitals, banks, railway desks) in Karnataka lack certified ISL interpreters. Existing sign tools target English ASL only, require cloud GPUs, or evaluate only on seen signers.",
      {
        x: 0.55,
        y: 1.62,
        w: 6.0,
        h: 0.9,
        fontFace: FONT_BODY,
        fontSize: 10.5,
        color: PALETTE.body,
        lineSpacingMultiple: 1.25,
      }
    );

    const gaps = [
      ["One-Way & English-Only", "Most research outputs raw English glosses, excluding Kannada speakers."],
      ["Signer Overfitting", "Random frame/clip splits leak signer identity and fail on new users."],
      ["Missing Facial Cues", "Hands-only models misclassify location- and expression-dependent signs."],
      ["Cloud Privacy Risk", "Streaming raw webcam video to remote servers compromises user privacy."],
      ["Unnatural Avatars", "Raw retargeted clips suffer shoulder drops and frozen arm artifacts."],
    ];
    s.addTable(
      [[hCell("Core Bottleneck"), hCell("Real-World Impact")], ...gaps.map(([a, b]) => [bCell(a, PALETTE.navy), b])],
      {
        x: 0.55,
        y: 2.58,
        w: 6.0,
        colW: [1.95, 4.05],
        fontFace: FONT_BODY,
        fontSize: 9.4,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.44, 0.44, 0.44, 0.44, 0.44],
        margin: [0.04, 0.08, 0.04, 0.08],
        valign: "middle",
      }
    );

    // Right Column: 4 Numbered Engineering Objectives
    addSectionLabel(s, pptx, 6.85, 1.26, 5.93, "Four Engineering & Accessibility Objectives", PALETTE.teal);
    const objs = [
      ["01", "Signer-Independent ISL Recognition", "Build a lightweight 147-D BiGRU recognizer (64 → 144 signs) with unseen-signer splits, temperature calibration, and zero-retraining custom signs."],
      ["02", "Bidirectional Kannada SOV & Speech", "Translate ISL gloss streams into natural Kannada Subject-Object-Verb sentences with kn-IN Web Speech synthesis and reverse Kannada gloss planning."],
      ["03", "Real-Time 3D Analytic IK Avatar", "Retarget 161 cleaned dataset motion clips onto a Three.js humanoid rig at 60 fps, eliminating shoulder/arm drop artifacts (367 → 0 drops)."],
      ["04", "Privacy-First Edge & Rigorous Validation", "Keep all raw webcam frames browser-local (MediaPipe WASM + ONNX Runtime Web), governed by MD5 audits, McNemar tests, and live Deaf study harness (#study)."],
    ];
    objs.forEach(([num, head, desc], i) => {
      const oy = 1.65 + i * 1.05;
      s.addShape(pptx.ShapeType.rect, {
        x: 6.85,
        y: oy,
        w: 5.93,
        h: 0.94,
        fill: { color: i % 2 === 0 ? PALETTE.surface : PALETTE.white },
        line: { color: PALETTE.border, width: 0.7 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: 6.85,
        y: oy,
        w: 0.62,
        h: 0.94,
        fill: { color: PALETTE.navy },
        line: { color: PALETTE.navy, width: 0 },
      });
      s.addText(num, {
        x: 6.85,
        y: oy,
        w: 0.62,
        h: 0.94,
        fontFace: FONT_DISPLAY,
        fontSize: 16,
        bold: true,
        color: "5EEAD4",
        align: "center",
        valign: "middle",
      });
      s.addText(head, {
        x: 7.6,
        y: oy + 0.08,
        w: 5.05,
        h: 0.24,
        fontFace: FONT_BODY,
        fontSize: 11,
        bold: true,
        color: PALETTE.navy,
      });
      s.addText(desc, {
        x: 7.6,
        y: oy + 0.34,
        w: 5.05,
        h: 0.54,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.15,
      });
    });

    // Bottom Summary Band
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 5.96,
      w: 12.23,
      h: 0.92,
      fill: { color: PALETTE.navy },
      line: { color: PALETTE.navy, width: 0 },
    });
    const band = [
      ["Forward", "ISL Video → 147-D → BiGRU / CTC → Kannada SOV + kn-IN Speech"],
      ["Reverse", "Kannada Text/Voice → Morphological Stemmer → ISL Gloss → 3D Avatar"],
      ["Deployment", "Standard Laptop CPU · Zero Cloud GPU · Browser-Local Privacy"],
    ];
    band.forEach(([k, v], i) => {
      const bx = 0.75 + i * 4.02;
      s.addText(k.toUpperCase(), {
        x: bx,
        y: 6.06,
        w: 3.85,
        h: 0.22,
        fontFace: FONT_BODY,
        fontSize: 8.5,
        bold: true,
        color: "5EEAD4",
        charSpacing: 1,
      });
      s.addText(v, {
        x: bx,
        y: 6.3,
        w: 3.85,
        h: 0.48,
        fontFace: FONT_BODY,
        fontSize: 9.8,
        color: PALETTE.white,
        lineSpacingMultiple: 1.2,
      });
    });
  }

  // =========================================================================
  // SLIDE 3: LITERATURE SURVEY & RESEARCH GAP
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      3,
      "LITERATURE SURVEY",
      "Prior Research Landscape & Silent Bridge Differentiation",
      "Comparative Analysis of ISL Recognition, Continuous SLR, Regional NLP & 3D Sign Avatars"
    );

    const litRows = [
      [
        hCell("Work / System"),
        hCell("Domain & Scope"),
        hCell("Core Technique"),
        hCell("Observed Limitation"),
        hCell("Silent Bridge Advance"),
      ],
      [
        bCell("Sridhar et al. (2020)\nINCLUDE", PALETTE.navy),
        "263 isolated ISL signs (4,287 videos)",
        "Pose keypoints + BiLSTM / Transformer",
        "One-way English labels; no Kannada output or avatar",
        "Expands corpus via HTTP-Range (86.7% saved) + bidirectional Kannada",
      ],
      [
        bCell("Elakkiya et al. (2021)\nISL-CSLTR", PALETTE.navy),
        "100 continuous ISL sentences (7 signers)",
        "CNN-LSTM / BiGRU with CTC alignment",
        "Offline GPU focus; no browser-local inference or reverse path",
        "Separate 2-layer BiGRU-CTC + λ=1.0 fusion in 37.0 ms on CPU",
      ],
      [
        bCell("Camgoz et al. (2020)\nSign Language Trans.", PALETTE.navy),
        "PHOENIX-2014T (German DGS)",
        "Joint Transformer SLR + NMT (CTC)",
        "Heavy GPU weights; European language, not Dravidian SOV",
        "Lightweight ONNX BiGRU + Kannada agglutinative SOV meaning layer",
      ],
      [
        bCell("Lugaresi / Google\nMediaPipe Holistic", PALETTE.navy),
        "Real-time hand & face landmarking",
        "On-device WASM / WebGL landmarking",
        "Raw coordinates sensitive to scale, camera distance & hand drops",
        "147-D hands-face-v2 schema: wrist-centered, scale-norm + 21 face NMM",
      ],
      [
        bCell("Graves et al. (2006)\nCTC Decoding", PALETTE.navy),
        "Unsegmented sequence alignment",
        "Blank-symbol marginalization loss",
        "Frequently conflated with recurrent encoder in prior student work",
        "Strict modular split: Isolated BiGRU (no CTC) vs Continuous BiGRU-CTC",
      ],
      [
        bCell("WebGL / JASigning\nSign Avatars", PALETTE.navy),
        "Text-to-sign 3D visualization",
        "SiGML / keyframe skeletal playback",
        "Robotic interpolation, unnatural shoulder drops, English-only input",
        "161 cleaned dataset motion clips + Three.js Analytic IK (367→0 drops)",
      ],
    ];

    s.addTable(litRows, {
      x: 0.55,
      y: 1.28,
      w: 12.23,
      colW: [2.05, 1.95, 2.15, 2.88, 3.2],
      fontFace: FONT_BODY,
      fontSize: 9.2,
      color: PALETTE.body,
      border: { type: "solid", color: PALETTE.border, pt: 0.55 },
      rowH: [0.38, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72],
      margin: [0.05, 0.08, 0.05, 0.08],
      valign: "middle",
    });

    // Bottom Research Gap Synthesis Strip
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 6.18,
      w: 12.23,
      h: 0.76,
      fill: { color: PALETTE.tealLight },
      line: { color: PALETTE.teal, width: 0.8 },
    });
    s.addText(
      "Research Gap Closed:  No prior open system unifies (1) browser-local 147-D landmark extraction with zero video upload, (2) signer-independent 64→144 sign BiGRU + separate BiGRU-CTC continuous decoding on CPU, (3) Kannada SOV translation + kn-IN speech, (4) cleaned 3D Analytic IK avatar playback, and (5) an integrated Deaf ISL evaluation harness (#study).",
      {
        x: 0.72,
        y: 6.24,
        w: 11.9,
        h: 0.64,
        fontFace: FONT_BODY,
        fontSize: 9.8,
        bold: true,
        color: PALETTE.navy,
        valign: "middle",
        lineSpacingMultiple: 1.18,
      }
    );
  }

  // =========================================================================
  // SLIDE 4: SYSTEM ARCHITECTURE (PROMINENT FULL-WIDTH ARCHITECTURAL DIAGRAM)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      4,
      "SYSTEM ARCHITECTURE",
      "End-to-End Bidirectional Architecture & Privacy Boundary",
      "Browser-Local Feature Extraction, Parallel Isolated/Continuous Branches, and Reverse Kannada → 3D Avatar Pipeline"
    );

    // Framed Architectural Diagram Showcase (Full-Width Centerpiece)
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 1.24,
      w: 12.23,
      h: 3.74,
      fill: { color: PALETTE.white },
      line: { color: PALETTE.border, width: 1 },
    });
    if (IMAGES.figArchitecture) {
      s.addImage({
        data: IMAGES.figArchitecture,
        x: 0.7,
        y: 1.32,
        w: 11.93,
        h: 3.58,
        sizing: { type: "contain", w: 11.93, h: 3.58 },
      });
    }

    // 3-Tier Architectural Breakdown Cards directly beneath diagram
    const tiers = [
      [
        "TIER 1 · BROWSER EDGE (REACT + WASM)",
        "Webcam (~30 fps) → MediaPipe Hand + Face Landmarker extracts 147 floats/frame locally. Supports 100% browser-only ONNX inference or lightweight JSON landmark streaming over WebSocket (zero raw video transmitted).",
      ],
      [
        "TIER 2 · INTELLIGENCE BACKEND (FASTAPI)",
        "Motion-energy segmentation (280 ms stillness tail) routes windows to Isolated BiGRU (64→144 signs + cosine custom matcher ≥ 0.82) or Continuous BiGRU-CTC + λ=1.0 sentence fusion → Kannada SOV meaning & kn-IN speech.",
      ],
      [
        "TIER 3 · REVERSE 3D AVATAR & GOVERNANCE",
        "Kannada text/voice → NFC normalization & agglutinative stemmer → ISL gloss plan → 161 cleaned motion clips retargeted onto Three.js Analytic IK rig at 60 fps. Backed by MD5 corpus auditing & #study evaluation harness.",
      ],
    ];
    tiers.forEach(([title, body], i) => {
      const tx = 0.55 + i * 4.14;
      s.addShape(pptx.ShapeType.rect, {
        x: tx,
        y: 5.14,
        w: 3.95,
        h: 1.8,
        fill: { color: i === 1 ? PALETTE.navy : PALETTE.surface },
        line: { color: i === 1 ? PALETTE.navy : PALETTE.border, width: 0.8 },
      });
      s.addText(title, {
        x: tx + 0.14,
        y: 5.24,
        w: 3.67,
        h: 0.26,
        fontFace: FONT_BODY,
        fontSize: 9,
        bold: true,
        color: i === 1 ? "5EEAD4" : PALETTE.teal,
      });
      s.addText(body, {
        x: tx + 0.14,
        y: 5.52,
        w: 3.67,
        h: 1.34,
        fontFace: FONT_BODY,
        fontSize: 9.2,
        color: i === 1 ? "E2E8F0" : PALETTE.body,
        lineSpacingMultiple: 1.2,
      });
    });
  }

  // =========================================================================
  // SLIDE 5: PROPOSED METHODOLOGY (147-D SCHEMA & DUAL PIPELINES)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      5,
      "PROPOSED METHODOLOGY · PART 1",
      "147-D hands-face-v2 Schema & Bidirectional Pipelines",
      "Invariant Per-Frame Representation Feeding Seven-Step Forward (ISL → Kannada) and Six-Step Reverse (Kannada → 3D ISL) Flows"
    );

    // Top Visual Strip: 147-D Tensor Composition Breakdown
    addSectionLabel(s, pptx, 0.55, 1.24, 12.23, "147-Dimensional Per-Frame Feature Tensor (hands-face-v2 · T = 24 Resampled Frames)");
    const segments = [
      ["Right Hand · 63 dims (42.9%)", "21 landmarks × (x, y, z) · Wrist-centered & palm-scale normalized", 5.24, PALETTE.navy],
      ["Left Hand · 63 dims (42.9%)", "21 landmarks × (x, y, z) · Zero-padded cleanly on 1-hand signs", 5.24, PALETTE.lapis],
      ["Face NMM · 21 (14.2%)", "7 anchors (eyes, nose, mouth, chin)", 1.75, PALETTE.teal],
    ];
    let curX = 0.55;
    segments.forEach(([label, sub, w, fill]) => {
      s.addShape(pptx.ShapeType.rect, {
        x: curX,
        y: 1.6,
        w: w - 0.04,
        h: 0.78,
        fill: { color: fill },
        line: { color: PALETTE.white, width: 1 },
      });
      s.addText(label, {
        x: curX + 0.1,
        y: 1.66,
        w: w - 0.24,
        h: 0.26,
        fontFace: FONT_BODY,
        fontSize: 10,
        bold: true,
        color: PALETTE.white,
      });
      s.addText(sub, {
        x: curX + 0.1,
        y: 1.94,
        w: w - 0.24,
        h: 0.36,
        fontFace: FONT_BODY,
        fontSize: 8.3,
        color: "E2E8F0",
      });
      curX += w;
    });

    // Bottom Left: Forward Pipeline (Part A)
    addSectionLabel(s, pptx, 0.55, 2.56, 6.0, "Part A: Forward Pipeline (ISL → Kannada Speech)");
    const fwdSteps = [
      ["1. Capture", "Browser webcam (~30 fps) with MediaPipe Hand + Face WASM extraction."],
      ["2. Normalize", "147-D hands-face-v2 wrist-centered, scale-invariant coords + 7 facial anchors."],
      ["3. Segment", "Motion-energy trigger + 280 ms stillness tail trimming to isolate each sign."],
      ["4. Classify", "3-seed BiGRU ONNX ensemble + 3-view TTA (0.50 / 0.30 / 0.20) + Temp T scaling."],
      ["5. Custom Match", "Cosine similarity vs. user few-shot prototypes (accept if ≥ 0.82, zero retrain)."],
      ["6. Meaning", "ISL gloss buffer → SOV meaning rewriter (43-pattern bank, 39.5% → 60.5%)."],
      ["7. Output", "Verified Kannada Unicode script, kn-IN Web Speech TTS, & editable transcript."],
    ];
    s.addTable(
      fwdSteps.map(([st, d]) => [bCell(st, PALETTE.navy), d]),
      {
        x: 0.55,
        y: 2.92,
        w: 6.0,
        colW: [1.35, 4.65],
        fontFace: FONT_BODY,
        fontSize: 9.2,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.borderLight, pt: 0.5 },
        rowH: [0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Bottom Right: Reverse Pipeline (Part B)
    addSectionLabel(s, pptx, 6.85, 2.56, 5.93, "Part B: Reverse Pipeline (Kannada → 3D ISL Avatar)", PALETTE.teal);
    const revSteps = [
      ["1. Input", "Typed Kannada/English text or live Web Speech API voice dictation."],
      ["2. Normalize", "Unicode NFC normalization + punctuation cleanup + phrase-table lookup."],
      ["3. Stemmer", "Agglutinative Kannada suffix stripper (-ಅನ್ನು, -ಇಂದ, -ಗೆ, -ಅಲ್ಲಿ) to root lemmas."],
      ["4. Gloss Plan", "Longest-match ISL gloss ordering; flags unsupported words transparently."],
      ["5. Trajectory", "161 dataset-retargeted clips cleaned via cubic spline gap-fill (367→0 drops)."],
      ["6. 3D Playback", "Three.js humanoid with Analytic 2-Bone IK, SLERP smoothing & 0.5×–1.5× speed."],
    ];
    s.addTable(
      revSteps.map(([st, d]) => [bCell(st, PALETTE.teal), d]),
      {
        x: 6.85,
        y: 2.92,
        w: 5.93,
        colW: [1.32, 4.61],
        fontFace: FONT_BODY,
        fontSize: 9.2,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.borderLight, pt: 0.5 },
        rowH: [0.58, 0.58, 0.58, 0.58, 0.58, 0.58],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Small technical highlight box under Part B
    s.addShape(pptx.ShapeType.rect, {
      x: 6.85,
      y: 6.46,
      w: 5.93,
      h: 0.44,
      fill: { color: PALETTE.surfaceAlt },
      line: { color: PALETTE.border, width: 0.7 },
    });
    s.addText("Key Advantage: 147-D vectors are 400× smaller than 224×224 RGB frames → CPU real-time.", {
      x: 6.97,
      y: 6.5,
      w: 5.7,
      h: 0.36,
      fontFace: FONT_BODY,
      fontSize: 9.3,
      bold: true,
      color: PALETTE.navy,
      valign: "middle",
    });
  }

  // =========================================================================
  // SLIDE 6: DEEP LEARNING ARCHITECTURE — GRU, BiGRU & CTC
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      6,
      "PROPOSED METHODOLOGY · PART 2",
      "Deep Learning Design: GRU, BiGRU & CTC (BiGRU ≠ CTC)",
      "Architectural Separation Between Segmented Isolated Sign Classification and Unsegmented Continuous Sentence Decoding"
    );

    // Top 3 Conceptual Definition Cards
    const concepts = [
      [
        "GRU (Gated Recurrent Unit)",
        "Recurrent cell using update gate (z) for memory retention and reset gate (r) for candidate state modulation—fewer parameters and faster CPU execution than LSTM.",
      ],
      [
        "BiGRU (Bidirectional Encoder)",
        "Two parallel GRUs scan each gesture forward and backward, concatenating hidden states so every frame captures both starting handshape and ending location.",
      ],
      [
        "CTC (Alignment Loss & Decoder)",
        "Connectionist Temporal Classification is a loss & decoding rule—NOT a network layer. Uses a blank token to align unsegmented frames to glosses without frame labels.",
      ],
    ];
    concepts.forEach(([title, body], i) => {
      const cx = 0.55 + i * 4.14;
      s.addShape(pptx.ShapeType.rect, {
        x: cx,
        y: 1.26,
        w: 3.95,
        h: 1.46,
        fill: { color: i === 2 ? PALETTE.tealLight : PALETTE.surface },
        line: { color: i === 2 ? PALETTE.teal : PALETTE.border, width: 0.8 },
      });
      s.addText(title, {
        x: cx + 0.14,
        y: 1.35,
        w: 3.67,
        h: 0.26,
        fontFace: FONT_DISPLAY,
        fontSize: 11.5,
        bold: true,
        color: i === 2 ? PALETTE.teal : PALETTE.navy,
      });
      s.addText(body, {
        x: cx + 0.14,
        y: 1.64,
        w: 3.67,
        h: 1.0,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      });
    });

    // Bottom Left: Model A (Isolated BiGRU — NO CTC)
    addSectionLabel(s, pptx, 0.55, 2.9, 6.0, "Model A: Isolated Sign Classifier (No CTC)");
    s.addTable(
      [
        [hCell("Stage"), hCell("Tensor Shape / Operation")],
        [bCell("1. Input", PALETTE.navy), "24 × 147 resampled landmarks per segmented sign"],
        [bCell("2. Encoder", PALETTE.navy), "Forward GRU (96) ∥ Backward GRU (96) → 192-D/frame"],
        [bCell("3. Pooling", PALETTE.navy), "Temporal Mean + Max Pooling ⊕ Global Path & Velocity"],
        [bCell("4. Head", PALETTE.navy), "Dense Softmax (64 / 144 classes), Temp Calibration T"],
        [bCell("5. Runtime", PALETTE.navy), "3-Seed ONNX Ensemble + 3-View TTA (0.50/0.30/0.20) · 15.3 ms"],
      ],
      {
        x: 0.55,
        y: 3.26,
        w: 6.0,
        colW: [1.3, 4.7],
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.48, 0.48, 0.48, 0.48, 0.48],
        margin: [0.04, 0.08, 0.04, 0.08],
        valign: "middle",
      }
    );

    // Bottom Right: Model B (Continuous BiGRU + CTC)
    addSectionLabel(s, pptx, 6.85, 2.9, 5.93, "Model B: Continuous Sentence Model (BiGRU + CTC)", PALETTE.teal);
    s.addTable(
      [
        [hCell("Stage"), hCell("Tensor Shape / Operation")],
        [bCell("1. Input", PALETTE.teal), "Subsampled (every 2nd frame) full unsegmented sentence video"],
        [bCell("2. Encoder", PALETTE.teal), "2-Layer BiGRU (128 units/direction) across full clip"],
        [bCell("3. Projection", PALETTE.teal), "Linear head → 168 glosses + 1 CTC blank (169 symbols)"],
        [bCell("4. CTC Decode", PALETTE.teal), "Greedy / prefix-beam collapse of repeats & blanks (ONLY CTC)"],
        [bCell("5. Fusion", PALETTE.teal), "Score fusion (λ = 1.0) with sentence classifier → 101-set · 37 ms"],
      ],
      {
        x: 6.85,
        y: 3.26,
        w: 5.93,
        colW: [1.32, 4.61],
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.48, 0.48, 0.48, 0.48, 0.48],
        margin: [0.04, 0.08, 0.04, 0.08],
        valign: "middle",
      }
    );

    // Bottom Executive Rule Callout
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 6.22,
      w: 12.23,
      h: 0.68,
      fill: { color: PALETTE.navy },
      line: { color: PALETTE.navy, width: 0 },
    });
    s.addText(
      "Key Architectural Principle:  BiGRU extracts bidirectional temporal features in both models, whereas CTC is used strictly in Model B to align unsegmented continuous sentences without frame-level gloss annotations.",
      {
        x: 0.72,
        y: 6.28,
        w: 11.9,
        h: 0.56,
        fontFace: FONT_BODY,
        fontSize: 10.2,
        bold: true,
        color: PALETTE.white,
        valign: "middle",
      }
    );
  }

  // =========================================================================
  // SLIDE 7: REQUIREMENTS, AUDITED DATASETS & 16 IMPLEMENTATION MODULES
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      7,
      "ENGINEERING STACK & MODULES",
      "Tech Stack, Audited Corpora & 16 Implemented Modules",
      "CPU-Only Deployment Profile, Bandwidth-Efficient Dataset Governance, and Complete Modular Codebase"
    );

    // Left Column: Stack & Audited Datasets
    addSectionLabel(s, pptx, 0.55, 1.24, 5.15, "Software, Hardware & Audited Datasets");
    s.addTable(
      [
        [hCell("Layer"), hCell("Specification")],
        [bCell("Frontend", PALETTE.navy), "React 18, TypeScript, Vite, Three.js WebGL, MediaPipe WASM, ONNX Runtime Web"],
        [bCell("Backend", PALETTE.navy), "Python 3.11, FastAPI, Uvicorn WebSockets, PyTorch, NumPy, SciPy"],
        [bCell("Hardware", PALETTE.navy), "Commodity CPU laptop (no GPU required), 8 GB RAM, 720p 30 fps webcam"],
        [bCell("Isolated Corpus", PALETTE.navy), "Amrita + INCLUDE: 1,290 → 1,749 (64 cls) → 2,249 train / 524 held-out (144 cls)"],
        [bCell("Continuous Data", PALETTE.navy), "ISL-CSLTR: 101 closed sentences, 7 signers, unseen-round split protocol"],
        [bCell("Data Hygiene", PALETTE.navy), "MD5 duplicate audit + HTTP-Range ZIP ingestion saving 86.7% bandwidth"],
      ],
      {
        x: 0.55,
        y: 1.6,
        w: 5.15,
        colW: [1.38, 3.77],
        fontFace: FONT_BODY,
        fontSize: 9.0,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.72, 0.65, 0.65, 0.82, 0.68, 0.72],
        margin: [0.04, 0.07, 0.04, 0.07],
        valign: "middle",
      }
    );

    // Right Column: 16 Modules Organized in 4 Neat 2x2 Layer Cards
    addSectionLabel(s, pptx, 5.95, 1.24, 6.83, "16 Implemented Modules Across 4 Functional Layers", PALETTE.teal);
    const modGroups = [
      [
        "Layer 1 · Vision & Features (M1–M4)",
        "M1: Live Webcam & Frame Pacer (~30 fps)\nM2: Browser MediaPipe Hand + Face WASM\nM3: 147-D hands-face-v2 Normalizer\nM4: Motion-Energy Segmenter (280 ms tail)",
      ],
      [
        "Layer 2 · Recognition & Custom Signs (M5–M8)",
        "M5: Isolated 3-Seed BiGRU ONNX + 3-View TTA\nM6: Continuous 2-Layer BiGRU-CTC + λ=1.0 Fusion\nM7: Temperature Calibration & Abstention Gate\nM8: Few-Shot Custom Sign Recorder (cos ≥ 0.82)",
      ],
      [
        "Layer 3 · Kannada NLP & 3D Avatar (M9–M12)",
        "M9: ISL Gloss → Kannada SOV Meaning Rewriter\nM10: kn-IN Web Speech TTS & Editable Transcript\nM11: Kannada Stemmer & Gloss Planner\nM12: Three.js 3D Analytic IK Avatar (161 clips)",
      ],
      [
        "Layer 4 · Governance & Evaluation (M13–M16)",
        "M13: MD5 Manifest & HTTP-Range Corpus Ingestor\nM14: Evidence-Gated Checkpoint Promoter\nM15: Interactive Report/Paper/PPT Export Suite\nM16: Live Deaf ISL User Study Harness (#study)",
      ],
    ];
    modGroups.forEach(([title, body], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const gx = 5.95 + col * 3.48;
      const gy = 1.62 + row * 2.38;
      s.addShape(pptx.ShapeType.rect, {
        x: gx,
        y: gy,
        w: 3.35,
        h: 2.22,
        fill: { color: PALETTE.surface },
        line: { color: PALETTE.border, width: 0.8 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: gx,
        y: gy,
        w: 3.35,
        h: 0.36,
        fill: { color: idx === 3 ? PALETTE.teal : PALETTE.navy },
        line: { color: idx === 3 ? PALETTE.teal : PALETTE.navy, width: 0 },
      });
      s.addText(title, {
        x: gx + 0.1,
        y: gy + 0.03,
        w: 3.15,
        h: 0.3,
        fontFace: FONT_BODY,
        fontSize: 9.2,
        bold: true,
        color: PALETTE.white,
        valign: "middle",
      });
      s.addText(body, {
        x: gx + 0.12,
        y: gy + 0.44,
        w: 3.11,
        h: 1.7,
        fontFace: FONT_BODY,
        fontSize: 9.0,
        color: PALETTE.body,
        lineSpacingMultiple: 1.32,
        valign: "top",
      });
    });

    // Bottom note under right grid
    s.addText("All 16 modules run seamlessly in dual deployment modes: Standalone Browser-ONNX (offline-capable) or Full-Stack FastAPI WebSocket.", {
      x: 5.95,
      y: 6.46,
      w: 6.83,
      h: 0.42,
      fontFace: FONT_BODY,
      fontSize: 9.2,
      italic: true,
      color: PALETTE.muted,
      valign: "middle",
    });
  }

  // =========================================================================
  // SLIDE 8: LIVE APPLICATION SHOWCASE (DUAL UI GALLERY)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      8,
      "LIVE SYSTEM WALKTHROUGH",
      "Working Application Showcase: Forward & Reverse Interfaces",
      "Actual Rendered Screens of Live ISL → Kannada Translation, 3D Analytic IK Avatar, Custom Signs & Deaf Study Module"
    );

    // Left Showcase: Live ISL -> Kannada Recognition
    addSectionLabel(s, pptx, 0.55, 1.24, 5.95, "1. Live Sign → Kannada Translation Workspace");
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 1.58,
      w: 5.95,
      h: 3.55,
      fill: { color: PALETTE.surface },
      line: { color: PALETTE.border, width: 1 },
    });
    if (IMAGES.figUiLive) {
      s.addImage({
        data: IMAGES.figUiLive,
        x: 0.63,
        y: 1.66,
        w: 5.79,
        h: 3.39,
        sizing: { type: "contain", w: 5.79, h: 3.39 },
      });
    }
    s.addText(
      "Real-time MediaPipe 147-D skeleton overlay, calibrated top-k confidence meter, abstention threshold guard, Kannada SOV meaning composer, and one-click kn-IN Web Speech synthesis.",
      {
        x: 0.55,
        y: 5.2,
        w: 5.95,
        h: 0.62,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      }
    );

    // Right Showcase: Reverse Kannada -> 3D Avatar
    addSectionLabel(s, pptx, 6.83, 1.24, 5.95, "2. Reverse Kannada → 3D ISL Avatar Player", PALETTE.teal);
    s.addShape(pptx.ShapeType.rect, {
      x: 6.83,
      y: 1.58,
      w: 5.95,
      h: 3.55,
      fill: { color: PALETTE.surface },
      line: { color: PALETTE.border, width: 1 },
    });
    if (IMAGES.figUiAvatar) {
      s.addImage({
        data: IMAGES.figUiAvatar,
        x: 6.91,
        y: 1.66,
        w: 5.79,
        h: 3.39,
        sizing: { type: "contain", w: 5.79, h: 3.39 },
      });
    }
    s.addText(
      "Accepts typed or spoken Kannada/English, strips agglutinative suffixes, maps to ISL gloss timeline, and drives the Three.js Analytic IK humanoid across 161 cleaned motion clips at 60 fps.",
      {
        x: 6.83,
        y: 5.2,
        w: 5.95,
        h: 0.62,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      }
    );

    // Bottom 3-Column Feature Callout Strip
    const feats = [
      ["Zero-Retraining Custom Signs (#custom)", "Record 3–5 examples in browser; cosine prototype matcher (≥ 0.82) recognizes custom local vocabulary instantly."],
      ["Live Deaf ISL User Study (#study)", "Interactive 3-task evaluation harness: 18 blind 4-AFC avatar trials, 5 sentence checks, counter role-play & Brooke SUS export."],
      ["Integrated Academic Suite (#ppt / #paper)", "Live preview & verified export of 79p CSBS Report, 6p NCDTE Paper, and 12-Slide Deck directly from the platform."],
    ];
    feats.forEach(([h, b], i) => {
      const fx = 0.55 + i * 4.14;
      s.addShape(pptx.ShapeType.rect, {
        x: fx,
        y: 5.92,
        w: 3.95,
        h: 1.0,
        fill: { color: PALETTE.navy },
        line: { color: PALETTE.navy, width: 0 },
      });
      s.addText(h, {
        x: fx + 0.14,
        y: 6.0,
        w: 3.67,
        h: 0.24,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        bold: true,
        color: "5EEAD4",
      });
      s.addText(b, {
        x: fx + 0.14,
        y: 6.26,
        w: 3.67,
        h: 0.6,
        fontFace: FONT_BODY,
        fontSize: 8.8,
        color: "E2E8F0",
        lineSpacingMultiple: 1.18,
      });
    });
  }

  // =========================================================================
  // SLIDE 9: QUANTITATIVE RESULTS (1/2) — ISOLATED SIGN ACCURACY (64 -> 144)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      9,
      "EXPERIMENTAL RESULTS · PART 1",
      "Isolated Sign Accuracy: 64-Sign Baseline → Promoted 144-Sign",
      "Strict Signer-Independent Held-Out Evaluation Showing Statistically Significant Gains (McNemar p = 0.003)"
    );

    // Top 4 Bold KPI Cards
    addKpiCard(s, pptx, 0.55, 1.24, 2.92, 0.94, "87.2%", "144-Sign Full Held-Out", "457 / 524 videos (v20261103)", true);
    addKpiCard(s, pptx, 3.65, 1.24, 2.92, 0.94, "81.7%", "Unseen Amrita Signers", "+27.2 pp over 54.5% LogReg", false);
    addKpiCard(s, pptx, 6.75, 1.24, 2.92, 0.94, "0.850", "Macro F1-Score (144)", "Up from 0.800 on 64-sign model", false);
    addKpiCard(s, pptx, 9.85, 1.24, 2.93, 0.94, "p = 0.003", "Paired McNemar Test", "34 fixed vs 13 regressed (unseen)", false);

    // Left: Accuracy Progression Bar Chart
    addSectionLabel(s, pptx, 0.55, 2.34, 6.2, "Accuracy Progression Across Feature & Model Stages");
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 2.68,
      w: 6.2,
      h: 3.62,
      fill: { color: PALETTE.white },
      line: { color: PALETTE.border, width: 0.8 },
    });
    if (IMAGES.figResults) {
      s.addImage({
        data: IMAGES.figResults,
        x: 0.65,
        y: 2.75,
        w: 6.0,
        h: 3.48,
        sizing: { type: "contain", w: 6.0, h: 3.48 },
      });
    }
    s.addText(
      "Training scale: 1,290 baseline → 1,749 (+462 INCLUDE) for 64 signs → 2,249 videos for promoted 144-sign checkpoint.",
      {
        x: 0.55,
        y: 6.38,
        w: 6.2,
        h: 0.48,
        fontFace: FONT_BODY,
        fontSize: 9.0,
        italic: true,
        color: PALETTE.muted,
      }
    );

    // Right: Verified 64-Sign vs Promoted 144-Sign Table + Calibration Insights
    addSectionLabel(s, pptx, 7.0, 2.34, 5.78, "Verified 64-Sign vs. Promoted 144-Sign Checkpoint", PALETTE.teal);
    s.addTable(
      [
        [hCell("Metric"), hCell("64-Sign Report"), hCell("144-Sign Promoted")],
        [bCell("Full Held-Out Acc.", PALETTE.navy), "81.5% (314 videos)", bCell("87.2% (457 / 524)", PALETTE.teal)],
        [bCell("Shared 314-Video Split", PALETTE.navy), "81.5%", bCell("84.7% (+3.2 pp)", PALETTE.teal)],
        [bCell("Unseen Amrita Signers", PALETTE.navy), "76.5% (213 clips)", bCell("81.7% (+5.2 pp)", PALETTE.teal)],
        [bCell("Macro Precision / Recall", PALETTE.navy), "84.4% / 81.1%", "Balanced across 144 cls"],
        [bCell("Macro F1-Score", PALETTE.navy), "0.800", bCell("0.850 (+0.050)", PALETTE.teal)],
        [bCell("CPU Inference Latency", PALETTE.navy), "11.2 ms (3-view)", "15.3 ms (3-seed ONNX)"],
      ],
      {
        x: 7.0,
        y: 2.7,
        w: 5.78,
        colW: [2.12, 1.74, 1.92],
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.36, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44],
        margin: [0.04, 0.08, 0.04, 0.08],
        valign: "middle",
      }
    );

    // Evidence-Gated Promotion Box
    s.addShape(pptx.ShapeType.rect, {
      x: 7.0,
      y: 5.84,
      w: 5.78,
      h: 1.04,
      fill: { color: PALETTE.surfaceAlt },
      line: { color: PALETTE.border, width: 0.8 },
    });
    s.addText("Evidence-Gated Promotion & Calibration", {
      x: 7.14,
      y: 5.92,
      w: 5.5,
      h: 0.24,
      fontFace: FONT_BODY,
      fontSize: 9.8,
      bold: true,
      color: PALETTE.navy,
    });
    s.addText(
      "• Expanding 2.25× in vocabulary (64 → 144 signs) improved—not degraded—accuracy on the identical shared 314-video benchmark (+3.2 pp).\n• Temperature scaling + abstention threshold suppresses low-confidence false commits.",
      {
        x: 7.14,
        y: 6.18,
        w: 5.5,
        h: 0.64,
        fontFace: FONT_BODY,
        fontSize: 9.0,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      }
    );
  }

  // =========================================================================
  // SLIDE 10: QUANTITATIVE RESULTS (2/2) — CONFUSIONS, ABLATION, LATENCY & AVATAR
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      10,
      "EXPERIMENTAL RESULTS · PART 2",
      "Ablations, Error Analysis, Continuous Latency & 3D Avatar Audit",
      "Face-Landmark Ablation Proof, Top Confused Pairs, CPU Latency Budget, Kannada SOV Gain & Trajectory Cleaning"
    );

    // Left Top: Per-Class F1 Chart
    addSectionLabel(s, pptx, 0.55, 1.24, 5.95, "Per-Class F1 Distribution & Face-Landmark Ablation");
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 1.56,
      w: 5.95,
      h: 2.52,
      fill: { color: PALETTE.white },
      line: { color: PALETTE.border, width: 0.8 },
    });
    if (IMAGES.figPerclass) {
      s.addImage({
        data: IMAGES.figPerclass,
        x: 0.62,
        y: 1.62,
        w: 5.81,
        h: 2.4,
        sizing: { type: "contain", w: 5.81, h: 2.4 },
      });
    }

    // Face Ablation Highlight Banner
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 4.18,
      w: 5.95,
      h: 0.62,
      fill: { color: PALETTE.navy },
      line: { color: PALETTE.navy, width: 0 },
    });
    s.addText(
      "Face-Landmark Ablation: Removing the 21 face-anchor features drops accuracy from 66.8% → 47.8% (−19.0 pp), proving facial reference anchors are essential.",
      {
        x: 0.68,
        y: 4.24,
        w: 5.7,
        h: 0.5,
        fontFace: FONT_BODY,
        fontSize: 9.2,
        bold: true,
        color: PALETTE.white,
        valign: "middle",
      }
    );

    // Left Bottom: Top Confused Pairs Table
    s.addTable(
      [
        [hCell("Confused Pair"), hCell("Count"), hCell("Physical Cause")],
        [bCell("EAT → NOSE", PALETTE.navy), "4", "Both touch face centerline near mouth/nose"],
        [bCell("HELLO → GOOD", PALETTE.navy), "3", "Open palm near head/chin with outward sweep"],
        [bCell("THANK YOU → SORRY", PALETTE.navy), "3", "Chin-to-chest trajectory overlap"],
        [bCell("WATER → DRINK", PALETTE.navy), "2", "Shared cup-handshape toward mouth"],
      ],
      {
        x: 0.55,
        y: 4.92,
        w: 5.95,
        colW: [1.82, 0.72, 3.41],
        fontFace: FONT_BODY,
        fontSize: 8.9,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.32, 0.4, 0.4, 0.4, 0.4],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Right Top: CPU Latency & Continuous Benchmarks Table
    addSectionLabel(s, pptx, 6.83, 1.24, 5.95, "Real-Time CPU Latency & Continuous Sentence Metrics", PALETTE.teal);
    s.addTable(
      [
        [hCell("Subsystem / Stage"), hCell("Measured Value"), hCell("Operating Context")],
        [bCell("Feature Extraction", PALETTE.navy), "1.4 ms / frame", "Browser MediaPipe WASM (~30 fps)"],
        [bCell("Isolated Single-View", PALETTE.navy), "3.8 ms / sign", "64-sign BiGRU ONNX on CPU"],
        [bCell("Isolated 3-View / 3-Seed", PALETTE.navy), "11.2 / 15.3 ms", "64-sign TTA / 144-sign Promoted"],
        [bCell("Continuous Greedy CTC", PALETTE.navy), "12.3 ms / clip", "2-layer BiGRU-CTC alignment"],
        [bCell("Fused Sentence (λ=1.0)", PALETTE.navy), "37.0 ms (p95: 62 ms)", "69.4% unseen-round / 101 closed set"],
        [bCell("Stillness Gate Window", PALETTE.navy), "280 ms tail", "Prevents premature sign splitting"],
      ],
      {
        x: 6.83,
        y: 1.58,
        w: 5.95,
        colW: [1.95, 1.65, 2.35],
        fontFace: FONT_BODY,
        fontSize: 9.0,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Right Bottom: Kannada SOV & 3D Avatar Trajectory Audit Cards
    addSectionLabel(s, pptx, 6.83, 4.62, 5.95, "Kannada Meaning Layer & 3D Avatar Trajectory Audit", PALETTE.teal);

    // 2 side-by-side impact blocks
    s.addShape(pptx.ShapeType.rect, {
      x: 6.83,
      y: 4.98,
      w: 2.88,
      h: 1.86,
      fill: { color: PALETTE.tealLight },
      line: { color: PALETTE.teal, width: 0.8 },
    });
    s.addText("39.5% → 60.5%", {
      x: 6.97,
      y: 5.08,
      w: 2.6,
      h: 0.4,
      fontFace: FONT_DISPLAY,
      fontSize: 18,
      bold: true,
      color: PALETTE.teal,
    });
    s.addText("Kannada SOV Fluency", {
      x: 6.97,
      y: 5.48,
      w: 2.6,
      h: 0.24,
      fontFace: FONT_BODY,
      fontSize: 10,
      bold: true,
      color: PALETTE.navy,
    });
    s.addText(
      "Natural grammatical phrasing across 43 counter/daily patterns vs. literal word-by-word gloss mapping, paired with kn-IN speech.",
      {
        x: 6.97,
        y: 5.76,
        w: 2.6,
        h: 0.98,
        fontFace: FONT_BODY,
        fontSize: 8.9,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      }
    );

    s.addShape(pptx.ShapeType.rect, {
      x: 9.9,
      y: 4.98,
      w: 2.88,
      h: 1.86,
      fill: { color: PALETTE.surface },
      line: { color: PALETTE.border, width: 0.8 },
    });
    s.addText("367 → 0 Drops", {
      x: 10.04,
      y: 5.08,
      w: 2.6,
      h: 0.4,
      fontFace: FONT_DISPLAY,
      fontSize: 18,
      bold: true,
      color: PALETTE.navy,
    });
    s.addText("3D Avatar Audit (161 Clips)", {
      x: 10.04,
      y: 5.48,
      w: 2.6,
      h: 0.24,
      fontFace: FONT_BODY,
      fontSize: 10,
      bold: true,
      color: PALETTE.teal,
    });
    s.addText(
      "Cubic spline gap-fill + wrist outlier clamping eliminated all 367 sudden arm drops across 161 clips, sustaining smooth 60 fps WebGL IK.",
      {
        x: 10.04,
        y: 5.76,
        w: 2.6,
        h: 0.98,
        fontFace: FONT_BODY,
        fontSize: 8.9,
        color: PALETTE.body,
        lineSpacingMultiple: 1.2,
      }
    );
  }

  // =========================================================================
  // SLIDE 11: COMPARISON, SCALABILITY ROADMAP & DEAF ISL USER STUDY
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      11,
      "BENCHMARKING & REVIEWER REVISIONS",
      "Comparison with Prior Work, Scaling Beyond 144 & Deaf ISL Study",
      "Addressing All Peer-Review Critiques Honestly: Vocabulary Scalability Roadmap & Live Pre-Registered Human Study (#study)"
    );

    // Top Table: Cross-Study Contextual Comparison
    addSectionLabel(s, pptx, 0.55, 1.24, 12.23, "Contextual Comparison with Existing Sign Language Systems");
    s.addTable(
      [
        [
          hCell("System"),
          hCell("Split Rigor"),
          hCell("Vocab / Task"),
          hCell("Bidirectional"),
          hCell("Regional Lang."),
          hCell("Edge CPU Privacy"),
        ],
        [
          bCell("INCLUDE (2020)", PALETTE.navy),
          "Clip-level / signer-mixed",
          "263 isolated ISL",
          "No (Sign → Eng)",
          "English only",
          "Offline GPU",
        ],
        [
          bCell("ISL-CSLTR (2021)", PALETTE.navy),
          "Multi-signer sentence",
          "100 continuous ISL",
          "No (Sign → Eng)",
          "English only",
          "Offline GPU",
        ],
        [
          bCell("Camgoz SLT (2020)", PALETTE.navy),
          "Signer-independent",
          "DGS continuous",
          "No (Sign → Ger)",
          "German only",
          "Cloud GPU",
        ],
        [
          bCell("Silent Bridge (Ours)", PALETTE.teal),
          bCell("Strict Unseen Signer", PALETTE.teal),
          bCell("144 Iso (87.2%) + 101 Sent", PALETTE.teal),
          bCell("Yes (3D Avatar)", PALETTE.teal),
          bCell("Kannada SOV + TTS", PALETTE.teal),
          bCell("Yes (147-D Browser)", PALETTE.teal),
        ],
      ],
      {
        x: 0.55,
        y: 1.58,
        w: 12.23,
        colW: [2.0, 2.05, 2.45, 1.8, 1.93, 2.0],
        fontFace: FONT_BODY,
        fontSize: 9.0,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.38, 0.38, 0.38, 0.42],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Bottom Left: 5-Axis Scalability Roadmap (Reviewer Revision 1)
    addSectionLabel(s, pptx, 0.55, 3.68, 6.0, "Revision 1 · Scaling Roadmap (144 → 500–2,000+ Signs)");
    const scaleAxes = [
      ["1. Proven 64 → 144 Jump", "2.25× vocabulary expansion raised shared-split accuracy from 81.5% → 84.7% and full held-out to 87.2%."],
      ["2. Metric Embeddings + HNSW", "Replace flat softmax with ArcFace/cosine embeddings + approximate nearest-neighbor retrieval for 2,000+ classes."],
      ["3. Phonological Factorization", "Auxiliary handshape, location & facial NMM heads resolve near-homophone confusions (EAT/NOSE, HELLO/GOOD)."],
      ["4. O(C·d) Linear Head Budget", "Backbone cost is constant; scaling output head to 2,000 signs adds < 0.4 ms on CPU."],
      ["5. HTTP-Range + Few-Shot", "Selective corpus streaming (86.7% saved) + instant browser prototype onboarding (cos ≥ 0.82)."],
    ];
    s.addTable(
      scaleAxes.map(([a, b]) => [bCell(a, PALETTE.navy), b]),
      {
        x: 0.55,
        y: 4.02,
        w: 6.0,
        colW: [2.0, 4.0],
        fontFace: FONT_BODY,
        fontSize: 8.8,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.borderLight, pt: 0.5 },
        rowH: [0.55, 0.55, 0.55, 0.55, 0.55],
        margin: [0.03, 0.07, 0.03, 0.07],
        valign: "middle",
      }
    );

    // Bottom Right: Pre-Registered Deaf ISL User Study (Reviewer Revision 2)
    addSectionLabel(s, pptx, 6.83, 3.68, 5.95, "Revision 2 · Live Deaf ISL User Study (#study)", PALETTE.teal);
    s.addShape(pptx.ShapeType.rect, {
      x: 6.83,
      y: 4.02,
      w: 5.95,
      h: 2.75,
      fill: { color: PALETTE.tealLight },
      line: { color: PALETTE.teal, width: 0.9 },
    });
    s.addText(
      "Implemented Live in Web App (#study) — Zero Fabricated Human Scores",
      {
        x: 6.99,
        y: 4.12,
        w: 5.65,
        h: 0.28,
        fontFace: FONT_BODY,
        fontSize: 10,
        bold: true,
        color: PALETTE.navy,
      }
    );
    const studyBullets = [
      "• Cohort & Ethics: Pre-registered N = 8–12 adult Deaf ISL signers in Bengaluru facilitated by an accredited ISL interpreter (informed consent + anonymized IDs).",
      "• Task 1 (Avatar Clarity): 18 blind randomized avatar clips — 4-AFC comprehension, 1–5 visual clarity Likert, and 5 structured error tags (handshape, speed, location, timing, missing NMM).",
      "• Task 2 (Sentence Gist): 5 bidirectional Kannada ↔ ISL sentences rated on gist accuracy & naturalness.",
      "• Task 3 (Counter Role-Play & SUS): End-to-end public desk scenario + standard 10-item Brooke SUS (0–100) with one-click JSON/CSV research export.",
      "• Integrity Rule: Paper & app report objective avatar metrics (367 → 0 drops) today and strictly await real IRB-consented sessions before publishing human SUS/comprehension means.",
    ];
    s.addText(studyBullets.join("\n"), {
      x: 6.99,
      y: 4.44,
      w: 5.65,
      h: 2.25,
      fontFace: FONT_BODY,
      fontSize: 8.85,
      color: PALETTE.body,
      lineSpacingMultiple: 1.22,
      valign: "top",
    });
  }

  // =========================================================================
  // SLIDE 12: DELIVERABLES, CONCLUSION & EXECUTIVE CLOSING
  // =========================================================================
  {
    const s = pptx.addSlide();
    addBoldHeader(
      s,
      pptx,
      12,
      "RESEARCH IMPACT & CONCLUSION",
      "Academic Deliverables, Key Contributions & Conclusion",
      "Verified 6-Page NCDTE Conference Manuscript, 79-Page BMSCE CSBS Report & Deployed Bidirectional System"
    );

    // Top Table: Verified Deliverables
    addSectionLabel(s, pptx, 0.55, 1.24, 12.23, "Verified Academic & Software Deliverables");
    s.addTable(
      [
        [hCell("Deliverable"), hCell("Verified Specification & Audit Status")],
        [
          bCell("NCDTE Conference Paper (6 Pages)", PALETTE.navy),
          "Single-column 12pt Times New Roman, 2.5/2.0 cm margins, 5 tables, 4 figures, 15 numbered references. Addressed all 3 reviewer revisions: (1) 144-sign promotion + 5-axis scaling, (2) Avatar audit + live #study protocol with zero fabricated scores, (3) Condensed from ~6,000 words to strict 6-page conference limit.",
        ],
        [
          bCell("B.E. Final Project Report (79 Pages)", PALETTE.navy),
          "77-page BMSCE CSBS thesis (27,910 words, 100% Times New Roman, 21 embedded figures/screens) + 2-page iThenticate certificate (6% AI index, submission trn:oid:::3618:158338407).",
        ],
        [
          bCell("Shipped Bidirectional Web Platform", PALETTE.navy),
          "16 modules live in React + Three.js + ONNX / FastAPI: 144-sign promoted BiGRU, 101-sentence BiGRU-CTC, Kannada SOV + kn-IN speech, 161-clip 3D avatar, few-shot custom signs, and live #study harness.",
        ],
      ],
      {
        x: 0.55,
        y: 1.58,
        w: 12.23,
        colW: [3.15, 9.08],
        fontFace: FONT_BODY,
        fontSize: 9.2,
        color: PALETTE.body,
        border: { type: "solid", color: PALETTE.border, pt: 0.5 },
        rowH: [0.34, 0.78, 0.56, 0.58],
        margin: [0.04, 0.08, 0.04, 0.08],
        valign: "middle",
      }
    );

    // Middle 2-Column Split: Conclusion & Honest Boundaries
    addSectionLabel(s, pptx, 0.55, 4.02, 6.0, "Core Takeaways");
    s.addText(
      "• Practical Real-Time Accessibility: Proves commodity laptops can run bidirectional ISL ↔ Kannada translation with 3D avatar feedback at sub-40 ms CPU latency and zero video upload.\n• Rigorous Empirical Governance: Unseen-signer evaluation, MD5 deduplication, McNemar validation (p = 0.003), and evidence-gated model promotion (64 → 144 signs).\n• Ready for Field Expansion: Extensible to Telugu, Tamil, Malayalam, offline rural clinic PWA tablets, and formal N = 8–12 Deaf community evaluation.",
      {
        x: 0.55,
        y: 4.38,
        w: 6.0,
        h: 1.32,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.25,
      }
    );

    addSectionLabel(s, pptx, 6.83, 4.02, 5.95, "Transparent Scope & Next Milestones", PALETTE.teal);
    s.addText(
      "• Continuous Decoding Scope: Current BiGRU-CTC fusion operates over a 101-sentence closed set; next step is open-vocabulary prefix-beam search with a Kannada LM.\n• Human Evaluation Execution: Live #study module is fully engineered and tested; next milestone is completing IRB-consented sessions with Bengaluru Deaf ISL signers.\n• Regional Dialect Coverage: Future collection targets multi-lighting webcam cohorts across Karnataka.",
      {
        x: 6.83,
        y: 4.38,
        w: 5.95,
        h: 1.32,
        fontFace: FONT_BODY,
        fontSize: 9.3,
        color: PALETTE.body,
        lineSpacingMultiple: 1.25,
      }
    );

    // Bold Deep Navy Closing Banner
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 5.84,
      w: 12.23,
      h: 1.08,
      fill: { color: PALETTE.navy },
      line: { color: PALETTE.navy, width: 0 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 5.84,
      w: 0.14,
      h: 1.08,
      fill: { color: PALETTE.gold },
      line: { color: PALETTE.gold, width: 0 },
    });
    s.addText("Thank You  —  Questions & Live System Demonstration", {
      x: 0.9,
      y: 5.94,
      w: 11.6,
      h: 0.42,
      fontFace: FONT_DISPLAY,
      fontSize: 19,
      bold: true,
      color: PALETTE.white,
      valign: "middle",
    });
    s.addText(
      "H S Thanush (1BM23CB066)  ·  Kiran M K (1BM23CB068)  ·  Manoj G U (1BM24CB401)   |   Guide: Prof. Tejaswini K   |   Dept. of CSBS, BMSCE",
      {
        x: 0.9,
        y: 6.42,
        w: 11.6,
        h: 0.34,
        fontFace: FONT_BODY,
        fontSize: 10.2,
        bold: true,
        color: "5EEAD4",
        valign: "middle",
      }
    );
  }

  const outPptx = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx");
  await pptx.writeFile({ fileName: outPptx });
  fs.mkdirSync(DOCS_PAPER_DIR, { recursive: true });
  fs.copyFileSync(outPptx, path.join(DOCS_PAPER_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx"));
  console.log(`[generate-ppt] Wrote bold 12-slide PPTX -> ${outPptx}`);
}

function slideChrome(num, kicker, title, subtitle, bodyHtml) {
  const pct = ((num / TOTAL_SLIDES) * 100).toFixed(2);
  return `
  <section class="ppt-slide">
    <div class="top-bar"><div class="top-bar-fill" style="width:${pct}%"></div></div>
    <header class="slide-head">
      <div class="kicker">${String(num).padStart(2, "0")} &nbsp;/&nbsp; ${kicker}</div>
      <h2>${title}</h2>
      <p class="subtitle">${subtitle}</p>
    </header>
    <div class="slide-body">
      ${bodyHtml}
    </div>
    <footer class="slide-foot">
      <span>SILENT BRIDGE · Real-Time Bidirectional ISL &amp; Kannada Translation · Dept. of CSBS, BMSCE</span>
      <span class="slide-num">${num} / ${TOTAL_SLIDES}</span>
    </footer>
  </section>`;
}

function generateHtmlDeck() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SILENT BRIDGE — 12-Slide Executive Presentation</title>
<style>
  @page { size: 13.333in 7.5in; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1e293b;
    font-family: 'Calibri', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    padding: 20px 0 36px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ppt-slide {
    width: 1280px;
    height: 720px;
    margin: 0 auto 24px;
    background: #ffffff;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 18px 42px rgba(2, 6, 23, 0.45);
  }
  .top-bar {
    height: 7px;
    width: 100%;
    background: #0b192c;
    flex-shrink: 0;
  }
  .top-bar-fill {
    height: 100%;
    background: #0f766e;
  }
  .slide-head {
    padding: 15px 46px 10px;
    border-bottom: 1px solid #cbd5e1;
    flex-shrink: 0;
  }
  .kicker {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #0f766e;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .slide-head h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    font-weight: 700;
    color: #0b192c;
    line-height: 1.18;
  }
  .slide-head .subtitle {
    font-size: 13px;
    color: #475569;
    margin-top: 3px;
  }
  .slide-body {
    flex: 1;
    padding: 14px 46px 10px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    min-height: 0;
  }
  .slide-foot {
    padding: 7px 46px 10px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    color: #64748b;
    flex-shrink: 0;
  }
  .slide-num {
    font-weight: 700;
    color: #0b192c;
    font-variant-numeric: tabular-nums;
  }

  /* Cover Slide */
  .ppt-slide.cover {
    background: #0b192c;
    color: #ffffff;
    padding: 44px 58px 28px 72px;
    justify-content: space-between;
  }
  .cover-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 20px;
    background: #0f766e;
  }
  .cover-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .gold-rule {
    width: 118px;
    height: 4px;
    background: #d97706;
    margin-bottom: 12px;
  }
  .cover-inst {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #e2e8f0;
  }
  .cover-dept {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 4px;
  }
  .cover-logo-box {
    width: 106px;
    height: 106px;
    background: #ffffff;
    padding: 8px;
    border: 1px solid #334155;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cover-logo-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .cover-hero h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 52px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #ffffff;
    line-height: 1.05;
  }
  .cover-hero .hero-sub {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    color: #cbd5e1;
    line-height: 1.28;
    margin-top: 10px;
    max-width: 980px;
  }
  .cover-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 6px;
  }
  .cover-stat {
    background: #162c46;
    border: 1px solid #26415e;
    padding: 13px 16px;
  }
  .cover-stat .val {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    font-weight: 700;
    color: #5eead4;
    font-variant-numeric: tabular-nums;
  }
  .cover-stat .lbl {
    font-size: 12.5px;
    font-weight: 700;
    color: #ffffff;
    margin-top: 4px;
  }
  .cover-stat .sub {
    font-size: 10.5px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .cover-meta {
    border-top: 1px solid #26415e;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .meta-kicker {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #f59e0b;
    margin-bottom: 5px;
  }
  .cover-guide-name {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 19px;
    font-weight: 700;
    color: #ffffff;
  }
  .cover-guide-sub {
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.45;
    margin-top: 3px;
  }
  .cover-team {
    text-align: right;
  }
  .cover-team-list {
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.45;
    font-variant-numeric: tabular-nums;
  }
  .cover-foot {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #94a3b8;
    margin-top: 6px;
  }

  /* Common Components */
  .sec-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 15px;
    font-weight: 700;
    color: #0b192c;
    padding-bottom: 4px;
    border-bottom: 1px solid #cbd5e1;
    margin-bottom: 7px;
  }
  .sec-title.teal { color: #0f766e; }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    flex: 1;
    min-height: 0;
  }
  .two-col-wide-left {
    display: grid;
    grid-template-columns: 1.08fr 0.92fr;
    gap: 24px;
    flex: 1;
    min-height: 0;
  }
  .two-col-wide-right {
    display: grid;
    grid-template-columns: 0.84fr 1.16fr;
    gap: 22px;
    flex: 1;
    min-height: 0;
  }
  .col {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  table.clean {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }
  table.clean th {
    background: #0b192c;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 9px;
    border: 1px solid #0b192c;
  }
  table.clean td {
    padding: 5.5px 9px;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
    line-height: 1.28;
  }
  table.clean tr:nth-child(even) td {
    background: #f8fafc;
  }
  table.compact td {
    padding: 4.5px 8px;
    font-size: 11.2px;
  }
  .lead-p {
    font-size: 12.2px;
    line-height: 1.38;
    color: #1e293b;
    margin-bottom: 8px;
  }
  .obj-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .obj-item {
    display: grid;
    grid-template-columns: 52px 1fr;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
  }
  .obj-item:nth-child(even) { background: #ffffff; }
  .obj-num {
    background: #0b192c;
    color: #5eead4;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 19px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .obj-body {
    padding: 7px 11px;
  }
  .obj-body strong {
    display: block;
    font-size: 12.8px;
    color: #0b192c;
    margin-bottom: 2px;
  }
  .obj-body p {
    font-size: 11.1px;
    line-height: 1.28;
    color: #334155;
  }
  .navy-band {
    background: #0b192c;
    color: #ffffff;
    padding: 10px 16px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    flex-shrink: 0;
  }
  .navy-band .bk {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #5eead4;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .navy-band .bv {
    font-size: 11.6px;
    line-height: 1.3;
    color: #f1f5f9;
  }
  .teal-callout {
    background: #f0fdfa;
    border: 1px solid #0f766e;
    padding: 9px 14px;
    font-size: 11.6px;
    line-height: 1.35;
    color: #0b192c;
    flex-shrink: 0;
  }
  .navy-callout {
    background: #0b192c;
    color: #ffffff;
    padding: 9px 14px;
    font-size: 11.8px;
    line-height: 1.35;
    flex-shrink: 0;
  }
  .arch-frame {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    padding: 8px 12px;
    height: 332px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .arch-frame img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .tier-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    flex: 1;
  }
  .tier-card {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 10px 13px;
  }
  .tier-card.dark {
    background: #0b192c;
    border-color: #0b192c;
    color: #e2e8f0;
  }
  .tier-card .tk {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #0f766e;
    margin-bottom: 5px;
  }
  .tier-card.dark .tk { color: #5eead4; }
  .tier-card p {
    font-size: 11.2px;
    line-height: 1.35;
  }
  .schema-bar {
    display: grid;
    grid-template-columns: 42.9fr 42.9fr 14.2fr;
    gap: 4px;
    flex-shrink: 0;
  }
  .schema-seg {
    padding: 9px 12px;
    color: #ffffff;
  }
  .schema-seg strong { display: block; font-size: 12px; }
  .schema-seg span { display: block; font-size: 10.2px; color: #e2e8f0; margin-top: 2px; }
  .seg-navy { background: #0b192c; }
  .seg-lapis { background: #1e3a8a; }
  .seg-teal { background: #0f766e; }

  .concept-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    flex-shrink: 0;
  }
  .concept-card {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 10px 13px;
  }
  .concept-card.teal {
    background: #f0fdfa;
    border-color: #0f766e;
  }
  .concept-card h4 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13.5px;
    color: #0b192c;
    margin-bottom: 4px;
  }
  .concept-card.teal h4 { color: #0f766e; }
  .concept-card p {
    font-size: 11.2px;
    line-height: 1.34;
    color: #334155;
  }

  .mod-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    flex: 1;
  }
  .mod-card {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
  }
  .mod-head {
    background: #0b192c;
    color: #ffffff;
    font-size: 11.2px;
    font-weight: 700;
    padding: 6px 10px;
  }
  .mod-head.teal { background: #0f766e; }
  .mod-card ul {
    list-style: none;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.48;
    color: #1e293b;
  }

  .ui-frame {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 6px;
    height: 318px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ui-frame img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .ui-cap {
    font-size: 11.2px;
    line-height: 1.34;
    color: #334155;
    margin-top: 6px;
  }
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    flex-shrink: 0;
  }
  .kpi-box {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 9px 13px;
  }
  .kpi-box.dark {
    background: #0b192c;
    border-color: #0b192c;
    color: #ffffff;
  }
  .kpi-box .kv {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 700;
    color: #0b192c;
    font-variant-numeric: tabular-nums;
  }
  .kpi-box.dark .kv { color: #ffffff; }
  .kpi-box .kl {
    font-size: 11.2px;
    font-weight: 700;
    color: #0f766e;
    margin-top: 2px;
  }
  .kpi-box.dark .kl { color: #5eead4; }
  .kpi-box .ks {
    font-size: 10px;
    color: #475569;
    margin-top: 2px;
  }
  .kpi-box.dark .ks { color: #cbd5e1; }

  .chart-frame {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    padding: 6px;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chart-frame img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .note-box {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    padding: 8px 11px;
    font-size: 11px;
    line-height: 1.35;
    color: #1e293b;
  }
  .mini-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    flex: 1;
  }
  .impact-box {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 10px 12px;
  }
  .impact-box.teal {
    background: #f0fdfa;
    border-color: #0f766e;
  }
  .impact-box .iv {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 20px;
    font-weight: 700;
    color: #0b192c;
  }
  .impact-box.teal .iv { color: #0f766e; }
  .impact-box .il {
    font-size: 11.5px;
    font-weight: 700;
    color: #0b192c;
    margin: 3px 0 4px;
  }
  .impact-box p {
    font-size: 10.8px;
    line-height: 1.34;
    color: #334155;
  }
  .study-panel {
    background: #f0fdfa;
    border: 1px solid #0f766e;
    padding: 10px 13px;
    flex: 1;
  }
  .study-panel h4 {
    font-size: 12px;
    color: #0b192c;
    margin-bottom: 6px;
  }
  .study-panel ul {
    list-style: disc;
    padding-left: 16px;
    font-size: 10.9px;
    line-height: 1.38;
    color: #1e293b;
  }
  .study-panel li + li { margin-top: 4px; }

  .bullet-list {
    list-style: disc;
    padding-left: 17px;
    font-size: 11.4px;
    line-height: 1.4;
    color: #1e293b;
  }
  .bullet-list li + li { margin-top: 5px; }
  .closing-banner {
    background: #0b192c;
    border-left: 10px solid #d97706;
    color: #ffffff;
    padding: 13px 20px;
    flex-shrink: 0;
  }
  .closing-banner h3 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    color: #ffffff;
  }
  .closing-banner p {
    font-size: 12px;
    font-weight: 700;
    color: #5eead4;
    margin-top: 5px;
  }
  .hl-teal { color: #0f766e; font-weight: 700; }
  .hl-navy { color: #0b192c; font-weight: 700; }

  @media print {
    body { background: #ffffff; padding: 0; }
    .ppt-slide {
      margin: 0;
      box-shadow: none;
      width: 13.333in;
      height: 7.5in;
      page-break-after: always;
      break-after: page;
    }
    .ppt-slide:last-child { page-break-after: auto; break-after: auto; }
  }
</style>
</head>
<body>

  <!-- SLIDE 1: BOLD EXECUTIVE COVER -->
  <section class="ppt-slide cover">
    <div class="cover-rail"></div>
    <div class="cover-top">
      <div>
        <div class="gold-rule"></div>
        <div class="cover-inst">B.M.S. COLLEGE OF ENGINEERING, BENGALURU</div>
        <div class="cover-dept">Department of Computer Science and Business Systems &nbsp;·&nbsp; B.E. Final Year Project &amp; NCDTE Conference Research</div>
      </div>
      ${IMAGES.logo ? `<div class="cover-logo-box"><img src="${IMAGES.logo}" alt="BMSCE Logo" /></div>` : ""}
    </div>

    <div class="cover-hero">
      <h1>SILENT BRIDGE</h1>
      <div class="hero-sub">
        <span class="report-project-title">Real-Time Bidirectional Indian Sign Language and Kannada Translation with 3D Avatar</span>
      </div>
    </div>

    <div class="cover-stats">
      <div class="cover-stat">
        <div class="val">87.2%</div>
        <div class="lbl">Promoted 144-Sign Accuracy</div>
        <div class="sub">81.7% unseen Amrita · F1 0.850</div>
      </div>
      <div class="cover-stat">
        <div class="val">147-D</div>
        <div class="lbl">Browser-Local Landmarks</div>
        <div class="sub">Zero raw video leaves device</div>
      </div>
      <div class="cover-stat">
        <div class="val">161 Clips</div>
        <div class="lbl">3D Analytic IK Avatar</div>
        <div class="sub">367 → 0 arm drops · 60 fps</div>
      </div>
      <div class="cover-stat">
        <div class="val">6p + 79p</div>
        <div class="lbl">NCDTE Paper &amp; CSBS Report</div>
        <div class="sub">6% AI iThenticate · #study live</div>
      </div>
    </div>

    <div>
      <div class="cover-meta">
        <div>
          <div class="meta-kicker">UNDER THE GUIDANCE OF</div>
          <div class="cover-guide-name">Prof. Tejaswini K</div>
          <div class="cover-guide-sub">
            Assistant Professor, Department of CSBS<br />
            HoD: Dr. R Ashok Kumar &nbsp;·&nbsp; Principal: Dr. Bheemsha Arya
          </div>
        </div>
        <div class="cover-team">
          <div class="meta-kicker">PRESENTED BY (TEAM CSBS)</div>
          <div class="cover-team-list">
            H S Thanush &nbsp;—&nbsp; 1BM23CB066<br />
            Kiran M K &nbsp;—&nbsp; 1BM23CB068<br />
            Manoj G U &nbsp;—&nbsp; 1BM24CB401
          </div>
        </div>
      </div>
      <div class="cover-foot">
        <span>Academic Year 2026–2027</span>
        <span style="font-weight:700">1 / ${TOTAL_SLIDES}</span>
      </div>
    </div>
  </section>

  <!-- SLIDE 2: MOTIVATION, PROBLEM STATEMENT & OBJECTIVES -->
  ${slideChrome(
    2,
    "CONTEXT &amp; SCOPE",
    "Motivation, Problem Statement &amp; Core Objectives",
    "Bridging the Real-Time Indian Sign Language and Regional Kannada Communication Divide",
    `
    <div class="two-col">
      <div class="col">
        <div class="sec-title">The Communication &amp; Technical Gap</div>
        <p class="lead-p">Over 63 million people in India experience hearing loss, yet public counters (hospitals, banks, railway desks) in Karnataka lack certified ISL interpreters. Existing sign tools target English ASL only, require cloud GPUs, or evaluate only on seen signers.</p>
        <table class="clean compact">
          <thead><tr><th style="width:34%">Core Bottleneck</th><th>Real-World Impact</th></tr></thead>
          <tbody>
            <tr><td class="hl-navy">One-Way &amp; English-Only</td><td>Most research outputs raw English glosses, excluding Kannada speakers.</td></tr>
            <tr><td class="hl-navy">Signer Overfitting</td><td>Random clip splits leak signer identity and fail on unseen users.</td></tr>
            <tr><td class="hl-navy">Missing Facial Cues</td><td>Hands-only models confuse location- and expression-dependent signs.</td></tr>
            <tr><td class="hl-navy">Cloud Privacy Risk</td><td>Uploading raw webcam video to remote servers compromises user privacy.</td></tr>
            <tr><td class="hl-navy">Unnatural Avatars</td><td>Raw retargeted clips suffer shoulder drops and frozen arm artifacts.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col">
        <div class="sec-title teal">Four Engineering &amp; Accessibility Objectives</div>
        <div class="obj-list">
          <div class="obj-item"><div class="obj-num">01</div><div class="obj-body"><strong>Signer-Independent ISL Recognition</strong><p>Lightweight 147-D BiGRU recognizer (64 → 144 signs) with unseen-signer splits, calibration, and zero-retraining custom signs.</p></div></div>
          <div class="obj-item"><div class="obj-num">02</div><div class="obj-body"><strong>Bidirectional Kannada SOV &amp; Speech</strong><p>Translate ISL gloss streams into natural Kannada SOV sentences with kn-IN Web Speech synthesis and reverse Kannada gloss planning.</p></div></div>
          <div class="obj-item"><div class="obj-num">03</div><div class="obj-body"><strong>Real-Time 3D Analytic IK Avatar</strong><p>Retarget 161 cleaned dataset motion clips onto a Three.js humanoid rig at 60 fps, eliminating shoulder/arm drop artifacts (367 → 0 drops).</p></div></div>
          <div class="obj-item"><div class="obj-num">04</div><div class="obj-body"><strong>Privacy-First Edge &amp; Rigorous Validation</strong><p>Browser-local MediaPipe WASM + ONNX Runtime Web governed by MD5 audits, McNemar tests, and live Deaf study harness (<code>#study</code>).</p></div></div>
        </div>
      </div>
    </div>
    <div class="navy-band">
      <div><div class="bk">Forward Path</div><div class="bv">ISL Video → 147-D → BiGRU / CTC → Kannada SOV + kn-IN Speech</div></div>
      <div><div class="bk">Reverse Path</div><div class="bv">Kannada Text/Voice → Morphological Stemmer → ISL Gloss → 3D Avatar</div></div>
      <div><div class="bk">Deployment</div><div class="bv">Standard Laptop CPU · Zero Cloud GPU · Browser-Local Privacy</div></div>
    </div>`
  )}

  <!-- SLIDE 3: LITERATURE SURVEY -->
  ${slideChrome(
    3,
    "LITERATURE SURVEY",
    "Prior Research Landscape &amp; Silent Bridge Differentiation",
    "Comparative Analysis of ISL Recognition, Continuous SLR, Regional NLP &amp; 3D Sign Avatars",
    `
    <table class="clean">
      <thead>
        <tr>
          <th style="width:17%">Work / System</th>
          <th style="width:16%">Domain &amp; Scope</th>
          <th style="width:18%">Core Technique</th>
          <th style="width:23%">Observed Limitation</th>
          <th style="width:26%">Silent Bridge Advance</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="hl-navy">Sridhar et al. (2020)<br/>INCLUDE</td><td>263 isolated ISL signs (4,287 videos)</td><td>Pose keypoints + BiLSTM / Transformer</td><td>One-way English labels; no Kannada output or avatar</td><td>Expands corpus via HTTP-Range (86.7% saved) + bidirectional Kannada</td></tr>
        <tr><td class="hl-navy">Elakkiya et al. (2021)<br/>ISL-CSLTR</td><td>100 continuous ISL sentences (7 signers)</td><td>CNN-LSTM / BiGRU with CTC alignment</td><td>Offline GPU focus; no browser-local inference or reverse path</td><td>Separate 2-layer BiGRU-CTC + λ=1.0 fusion in 37.0 ms on CPU</td></tr>
        <tr><td class="hl-navy">Camgoz et al. (2020)<br/>Sign Lang. Trans.</td><td>PHOENIX-2014T (German DGS)</td><td>Joint Transformer SLR + NMT (CTC)</td><td>Heavy GPU weights; European language, not Dravidian SOV</td><td>Lightweight ONNX BiGRU + Kannada agglutinative SOV meaning layer</td></tr>
        <tr><td class="hl-navy">Lugaresi / Google<br/>MediaPipe Holistic</td><td>Real-time hand &amp; face landmarking</td><td>On-device WASM / WebGL landmarking</td><td>Raw coordinates sensitive to scale, distance &amp; hand drops</td><td>147-D hands-face-v2 schema: wrist-centered, scale-norm + 21 face NMM</td></tr>
        <tr><td class="hl-navy">Graves et al. (2006)<br/>CTC Decoding</td><td>Unsegmented sequence alignment</td><td>Blank-symbol marginalization loss</td><td>Frequently conflated with recurrent encoder in prior work</td><td>Strict modular split: Isolated BiGRU (no CTC) vs Continuous BiGRU-CTC</td></tr>
        <tr><td class="hl-navy">WebGL / JASigning<br/>Sign Avatars</td><td>Text-to-sign 3D visualization</td><td>SiGML / keyframe skeletal playback</td><td>Robotic interpolation, unnatural shoulder drops, English-only</td><td>161 cleaned dataset motion clips + Three.js Analytic IK (367→0 drops)</td></tr>
      </tbody>
    </table>
    <div class="teal-callout">
      <strong>Research Gap Closed:</strong> No prior open system unifies (1) browser-local 147-D landmark extraction with zero video upload, (2) signer-independent 64→144 sign BiGRU + separate BiGRU-CTC continuous decoding on CPU, (3) Kannada SOV translation + kn-IN speech, (4) cleaned 3D Analytic IK avatar playback, and (5) an integrated Deaf ISL evaluation harness (<code>#study</code>).
    </div>`
  )}

  <!-- SLIDE 4: END-TO-END SYSTEM ARCHITECTURE (ARCHITECTURAL DIAGRAM) -->
  ${slideChrome(
    4,
    "SYSTEM ARCHITECTURE",
    "End-to-End Bidirectional Architecture &amp; Privacy Boundary",
    "Browser-Local Feature Extraction, Parallel Isolated/Continuous Branches, and Reverse Kannada → 3D Avatar Pipeline",
    `
    <div class="arch-frame">
      ${IMAGES.figArchitecture ? `<img src="${IMAGES.figArchitecture}" alt="Silent Bridge System Architecture Diagram" />` : ""}
    </div>
    <div class="tier-grid">
      <div class="tier-card">
        <div class="tk">TIER 1 · BROWSER EDGE (REACT + WASM)</div>
        <p>Webcam (~30 fps) → MediaPipe Hand + Face Landmarker extracts 147 floats/frame locally. Supports 100% browser-only ONNX inference or lightweight JSON landmark streaming over WebSocket (zero raw video leaves the device).</p>
      </div>
      <div class="tier-card dark">
        <div class="tk">TIER 2 · INTELLIGENCE BACKEND (FASTAPI)</div>
        <p>Motion-energy segmentation (280 ms stillness tail) routes windows to Isolated BiGRU (64→144 signs + cosine custom matcher ≥ 0.82) or Continuous BiGRU-CTC + λ=1.0 sentence fusion → Kannada SOV meaning &amp; kn-IN speech.</p>
      </div>
      <div class="tier-card">
        <div class="tk">TIER 3 · REVERSE 3D AVATAR &amp; GOVERNANCE</div>
        <p>Kannada text/voice → NFC normalization &amp; agglutinative stemmer → ISL gloss plan → 161 cleaned motion clips retargeted onto Three.js Analytic IK rig at 60 fps. Backed by MD5 corpus auditing &amp; <code>#study</code> harness.</p>
      </div>
    </div>`
  )}

  <!-- SLIDE 5: PROPOSED METHODOLOGY (1/2) -->
  ${slideChrome(
    5,
    "PROPOSED METHODOLOGY · PART 1",
    "147-D hands-face-v2 Schema &amp; Bidirectional Pipelines",
    "Invariant Per-Frame Representation Feeding Seven-Step Forward (ISL → Kannada) and Six-Step Reverse (Kannada → 3D ISL) Flows",
    `
    <div>
      <div class="sec-title">147-Dimensional Per-Frame Feature Tensor (hands-face-v2 · T = 24 Resampled Frames)</div>
      <div class="schema-bar">
        <div class="schema-seg seg-navy"><strong>Right Hand · 63 dims (42.9%)</strong><span>21 landmarks × (x, y, z) · Wrist-centered &amp; palm-scale normalized</span></div>
        <div class="schema-seg seg-lapis"><strong>Left Hand · 63 dims (42.9%)</strong><span>21 landmarks × (x, y, z) · Zero-padded cleanly on 1-hand signs</span></div>
        <div class="schema-seg seg-teal"><strong>Face NMM · 21 (14.2%)</strong><span>7 anchors (eyes, nose, mouth, chin)</span></div>
      </div>
    </div>
    <div class="two-col">
      <div class="col">
        <div class="sec-title">Part A: Forward Pipeline (ISL → Kannada Speech)</div>
        <table class="clean compact">
          <tbody>
            <tr><td class="hl-navy" style="width:24%">1. Capture</td><td>Browser webcam (~30 fps) with MediaPipe Hand + Face WASM extraction.</td></tr>
            <tr><td class="hl-navy">2. Normalize</td><td>147-D hands-face-v2 wrist-centered, scale-invariant coords + 7 facial anchors.</td></tr>
            <tr><td class="hl-navy">3. Segment</td><td>Motion-energy trigger + 280 ms stillness tail trimming to isolate each sign.</td></tr>
            <tr><td class="hl-navy">4. Classify</td><td>3-seed BiGRU ONNX ensemble + 3-view TTA (0.50 / 0.30 / 0.20) + Temp T scaling.</td></tr>
            <tr><td class="hl-navy">5. Custom Match</td><td>Cosine similarity vs. user few-shot prototypes (accept if ≥ 0.82, zero retrain).</td></tr>
            <tr><td class="hl-navy">6. Meaning</td><td>ISL gloss buffer → SOV meaning rewriter (43-pattern bank, 39.5% → 60.5%).</td></tr>
            <tr><td class="hl-navy">7. Output</td><td>Verified Kannada Unicode script, kn-IN Web Speech TTS, &amp; editable transcript.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col" style="justify-content:space-between">
        <div>
          <div class="sec-title teal">Part B: Reverse Pipeline (Kannada → 3D ISL Avatar)</div>
          <table class="clean compact">
            <tbody>
              <tr><td class="hl-teal" style="width:24%">1. Input</td><td>Typed Kannada/English text or live Web Speech API voice dictation.</td></tr>
              <tr><td class="hl-teal">2. Normalize</td><td>Unicode NFC normalization + punctuation cleanup + phrase-table lookup.</td></tr>
              <tr><td class="hl-teal">3. Stemmer</td><td>Agglutinative Kannada suffix stripper (-ಅನ್ನು, -ಇಂದ, -ಗೆ, -ಅಲ್ಲಿ) to root lemmas.</td></tr>
              <tr><td class="hl-teal">4. Gloss Plan</td><td>Longest-match ISL gloss ordering; flags unsupported words transparently.</td></tr>
              <tr><td class="hl-teal">5. Trajectory</td><td>161 dataset-retargeted clips cleaned via cubic spline gap-fill (367→0 drops).</td></tr>
              <tr><td class="hl-teal">6. 3D Playback</td><td>Three.js humanoid with Analytic 2-Bone IK, SLERP smoothing &amp; 0.5×–1.5× speed.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="note-box"><strong>Key Efficiency Advantage:</strong> 147-D landmark vectors are 400× smaller than 224×224 RGB frames, enabling real-time CPU execution without cloud GPUs.</div>
      </div>
    </div>`
  )}

  <!-- SLIDE 6: DEEP LEARNING ARCHITECTURE — GRU, BiGRU & CTC -->
  ${slideChrome(
    6,
    "PROPOSED METHODOLOGY · PART 2",
    "Deep Learning Design: GRU, BiGRU &amp; CTC (BiGRU ≠ CTC)",
    "Architectural Separation Between Segmented Isolated Sign Classification and Unsegmented Continuous Sentence Decoding",
    `
    <div class="concept-grid">
      <div class="concept-card">
        <h4>GRU (Gated Recurrent Unit)</h4>
        <p>Recurrent cell using update gate (z) for memory retention and reset gate (r) for candidate state modulation—fewer parameters and faster CPU execution than LSTM.</p>
      </div>
      <div class="concept-card">
        <h4>BiGRU (Bidirectional Encoder)</h4>
        <p>Two parallel GRUs scan each gesture forward and backward, concatenating hidden states so every frame captures both starting handshape and ending location.</p>
      </div>
      <div class="concept-card teal">
        <h4>CTC (Alignment Loss &amp; Decoder)</h4>
        <p>Connectionist Temporal Classification is a loss &amp; decoding rule—<strong>NOT</strong> a network layer. Uses a blank token to align unsegmented frames to glosses without frame labels.</p>
      </div>
    </div>
    <div class="two-col">
      <div class="col">
        <div class="sec-title">Model A: Isolated Sign Classifier (No CTC)</div>
        <table class="clean compact">
          <thead><tr><th style="width:24%">Stage</th><th>Tensor Shape / Operation</th></tr></thead>
          <tbody>
            <tr><td class="hl-navy">1. Input</td><td><code>24 × 147</code> resampled landmarks per segmented sign</td></tr>
            <tr><td class="hl-navy">2. Encoder</td><td>Forward GRU (96) ∥ Backward GRU (96) → 192-D/frame</td></tr>
            <tr><td class="hl-navy">3. Pooling</td><td>Temporal Mean + Max Pooling ⊕ Global Path &amp; Velocity</td></tr>
            <tr><td class="hl-navy">4. Head</td><td>Dense Softmax (64 / 144 classes), Temp Calibration T</td></tr>
            <tr><td class="hl-navy">5. Runtime</td><td>3-Seed ONNX Ensemble + 3-View TTA (0.50/0.30/0.20) · 15.3 ms</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col">
        <div class="sec-title teal">Model B: Continuous Sentence Model (BiGRU + CTC)</div>
        <table class="clean compact">
          <thead><tr><th style="width:25%">Stage</th><th>Tensor Shape / Operation</th></tr></thead>
          <tbody>
            <tr><td class="hl-teal">1. Input</td><td>Subsampled (every 2nd frame) full unsegmented sentence video</td></tr>
            <tr><td class="hl-teal">2. Encoder</td><td>2-Layer BiGRU (128 units/direction) across full clip</td></tr>
            <tr><td class="hl-teal">3. Projection</td><td>Linear head → 168 glosses + 1 CTC blank (169 symbols)</td></tr>
            <tr><td class="hl-teal">4. CTC Decode</td><td>Greedy / prefix-beam collapse of repeats &amp; blanks (ONLY CTC)</td></tr>
            <tr><td class="hl-teal">5. Fusion</td><td>Score fusion (λ = 1.0) with sentence classifier → 101-set · 37 ms</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="navy-callout">
      <strong>Key Architectural Principle:</strong> BiGRU extracts bidirectional temporal features in both models, whereas CTC is used strictly in Model B to align unsegmented continuous sentences without frame-level gloss annotations.
    </div>`
  )}

  <!-- SLIDE 7: TECH STACK, DATASETS & 16 MODULES -->
  ${slideChrome(
    7,
    "ENGINEERING STACK &amp; MODULES",
    "Tech Stack, Audited Corpora &amp; 16 Implemented Modules",
    "CPU-Only Deployment Profile, Bandwidth-Efficient Dataset Governance, and Complete Modular Codebase",
    `
    <div class="two-col-wide-right">
      <div class="col">
        <div class="sec-title">Software, Hardware &amp; Audited Datasets</div>
        <table class="clean compact">
          <thead><tr><th style="width:29%">Layer</th><th>Specification</th></tr></thead>
          <tbody>
            <tr><td class="hl-navy">Frontend</td><td>React 18, TypeScript, Vite, Three.js WebGL, MediaPipe WASM, ONNX Runtime Web</td></tr>
            <tr><td class="hl-navy">Backend</td><td>Python 3.11, FastAPI, Uvicorn WebSockets, PyTorch, NumPy, SciPy</td></tr>
            <tr><td class="hl-navy">Hardware</td><td>Commodity CPU laptop (no GPU required), 8 GB RAM, 720p 30 fps webcam</td></tr>
            <tr><td class="hl-navy">Isolated Data</td><td>Amrita + INCLUDE: 1,290 → 1,749 (64 cls) → 2,249 train / 524 held-out (144 cls)</td></tr>
            <tr><td class="hl-navy">Continuous</td><td>ISL-CSLTR: 101 closed sentences, 7 signers, unseen-round split protocol</td></tr>
            <tr><td class="hl-navy">Data Hygiene</td><td>MD5 duplicate audit + HTTP-Range ZIP ingestion saving 86.7% bandwidth</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col">
        <div class="sec-title teal">16 Implemented Modules Across 4 Functional Layers</div>
        <div class="mod-grid">
          <div class="mod-card">
            <div class="mod-head">Layer 1 · Vision &amp; Features (M1–M4)</div>
            <ul>
              <li><strong>M1:</strong> Live Webcam &amp; Frame Pacer (~30 fps)</li>
              <li><strong>M2:</strong> Browser MediaPipe Hand + Face WASM</li>
              <li><strong>M3:</strong> 147-D hands-face-v2 Normalizer</li>
              <li><strong>M4:</strong> Motion-Energy Segmenter (280 ms tail)</li>
            </ul>
          </div>
          <div class="mod-card">
            <div class="mod-head">Layer 2 · Recognition &amp; Custom (M5–M8)</div>
            <ul>
              <li><strong>M5:</strong> Isolated 3-Seed BiGRU ONNX + 3-View TTA</li>
              <li><strong>M6:</strong> Continuous BiGRU-CTC + λ=1.0 Fusion</li>
              <li><strong>M7:</strong> Temp Calibration &amp; Abstention Gate</li>
              <li><strong>M8:</strong> Few-Shot Custom Recorder (cos ≥ 0.82)</li>
            </ul>
          </div>
          <div class="mod-card">
            <div class="mod-head">Layer 3 · Kannada &amp; 3D Avatar (M9–M12)</div>
            <ul>
              <li><strong>M9:</strong> ISL Gloss → Kannada SOV Meaning Rewriter</li>
              <li><strong>M10:</strong> kn-IN Web Speech TTS &amp; Transcript</li>
              <li><strong>M11:</strong> Kannada Stemmer &amp; Gloss Planner</li>
              <li><strong>M12:</strong> Three.js 3D Analytic IK Avatar (161 clips)</li>
            </ul>
          </div>
          <div class="mod-card">
            <div class="mod-head teal">Layer 4 · Governance &amp; Study (M13–M16)</div>
            <ul>
              <li><strong>M13:</strong> MD5 Manifest &amp; HTTP-Range Ingestor</li>
              <li><strong>M14:</strong> Evidence-Gated Checkpoint Promoter</li>
              <li><strong>M15:</strong> Report / Paper / PPT Export Suite</li>
              <li><strong>M16:</strong> Live Deaf ISL User Study (<code>#study</code>)</li>
            </ul>
          </div>
        </div>
        <p style="font-size:11px;font-style:italic;color:#475569;margin-top:6px;">All 16 modules run seamlessly in dual deployment modes: Standalone Browser-ONNX (offline-capable) or Full-Stack FastAPI WebSocket.</p>
      </div>
    </div>`
  )}

  <!-- SLIDE 8: LIVE APPLICATION SHOWCASE -->
  ${slideChrome(
    8,
    "LIVE SYSTEM WALKTHROUGH",
    "Working Application Showcase: Forward &amp; Reverse Interfaces",
    "Actual Rendered Screens of Live ISL → Kannada Translation, 3D Analytic IK Avatar, Custom Signs &amp; Deaf Study Module",
    `
    <div class="two-col">
      <div class="col">
        <div class="sec-title">1. Live Sign → Kannada Translation Workspace</div>
        <div class="ui-frame">
          ${IMAGES.figUiLive ? `<img src="${IMAGES.figUiLive}" alt="Live ISL to Kannada Recognition Interface" />` : ""}
        </div>
        <p class="ui-cap">Real-time MediaPipe 147-D skeleton overlay, calibrated top-k confidence meter, abstention threshold guard, Kannada SOV meaning composer, and one-click kn-IN Web Speech synthesis.</p>
      </div>
      <div class="col">
        <div class="sec-title teal">2. Reverse Kannada → 3D ISL Avatar Player</div>
        <div class="ui-frame">
          ${IMAGES.figUiAvatar ? `<img src="${IMAGES.figUiAvatar}" alt="Reverse Kannada to 3D ISL Avatar Interface" />` : ""}
        </div>
        <p class="ui-cap">Accepts typed or spoken Kannada/English, strips agglutinative suffixes, maps to ISL gloss timeline, and drives the Three.js Analytic IK humanoid across 161 cleaned motion clips at 60 fps.</p>
      </div>
    </div>
    <div class="navy-band">
      <div><div class="bk">Zero-Retraining Custom Signs (#custom)</div><div class="bv">Record 3–5 examples in browser; cosine prototype matcher (≥ 0.82) adds custom local vocabulary immediately.</div></div>
      <div><div class="bk">Live Deaf ISL User Study (#study)</div><div class="bv">3-task evaluation harness: 18 blind 4-AFC avatar trials, 5 sentence checks, counter role-play &amp; Brooke SUS JSON/CSV export.</div></div>
      <div><div class="bk">Integrated Academic Suite (#ppt / #paper)</div><div class="bv">Live preview &amp; verified export of 79p CSBS Report, 6p NCDTE Paper, and 12-Slide Deck directly from the app.</div></div>
    </div>`
  )}

  <!-- SLIDE 9: QUANTITATIVE RESULTS (1/2) -->
  ${slideChrome(
    9,
    "EXPERIMENTAL RESULTS · PART 1",
    "Isolated Sign Accuracy: 64-Sign Baseline → Promoted 144-Sign",
    "Strict Signer-Independent Held-Out Evaluation Showing Statistically Significant Gains (McNemar p = 0.003)",
    `
    <div class="kpi-row">
      <div class="kpi-box dark"><div class="kv">87.2%</div><div class="kl">144-Sign Full Held-Out</div><div class="ks">457 / 524 videos (v20261103)</div></div>
      <div class="kpi-box"><div class="kv">81.7%</div><div class="kl">Unseen Amrita Signers</div><div class="ks">+27.2 pp over 54.5% LogReg</div></div>
      <div class="kpi-box"><div class="kv">0.850</div><div class="kl">Macro F1-Score (144)</div><div class="ks">Up from 0.800 on 64-sign model</div></div>
      <div class="kpi-box"><div class="kv">p = 0.003</div><div class="kl">Paired McNemar Test</div><div class="ks">34 fixed vs 13 regressed (unseen)</div></div>
    </div>
    <div class="two-col-wide-left">
      <div class="col">
        <div class="sec-title">Accuracy Progression Across Feature &amp; Model Stages</div>
        <div class="chart-frame">
          ${IMAGES.figResults ? `<img src="${IMAGES.figResults}" alt="Accuracy Progression Bar Chart" />` : ""}
        </div>
        <p style="font-size:10.8px;font-style:italic;color:#475569;margin-top:5px;">Training scale: 1,290 baseline → 1,749 (+462 INCLUDE) for 64 signs → 2,249 videos for promoted 144-sign checkpoint.</p>
      </div>
      <div class="col" style="justify-content:space-between;gap:10px;">
        <div>
          <div class="sec-title teal">Verified 64-Sign vs. Promoted 144-Sign Checkpoint</div>
          <table class="clean compact">
            <thead><tr><th>Metric</th><th>64-Sign Report</th><th>144-Sign Promoted</th></tr></thead>
            <tbody>
              <tr><td class="hl-navy">Full Held-Out Acc.</td><td>81.5% (314 videos)</td><td class="hl-teal">87.2% (457 / 524)</td></tr>
              <tr><td class="hl-navy">Shared 314-Video Split</td><td>81.5%</td><td class="hl-teal">84.7% (+3.2 pp)</td></tr>
              <tr><td class="hl-navy">Unseen Amrita Signers</td><td>76.5% (213 clips)</td><td class="hl-teal">81.7% (+5.2 pp)</td></tr>
              <tr><td class="hl-navy">Macro Precision / Recall</td><td>84.4% / 81.1%</td><td>Balanced across 144 cls</td></tr>
              <tr><td class="hl-navy">Macro F1-Score</td><td>0.800</td><td class="hl-teal">0.850 (+0.050)</td></tr>
              <tr><td class="hl-navy">CPU Inference Latency</td><td>11.2 ms (3-view)</td><td>15.3 ms (3-seed ONNX)</td></tr>
            </tbody>
          </table>
        </div>
        <div class="note-box">
          <strong>Evidence-Gated Promotion &amp; Calibration:</strong><br/>
          • Expanding 2.25× in vocabulary (64 → 144 signs) improved—not degraded—accuracy on the identical shared 314-video benchmark (+3.2 pp).<br/>
          • Temperature scaling + abstention threshold suppresses low-confidence false commits.
        </div>
      </div>
    </div>`
  )}

  <!-- SLIDE 10: QUANTITATIVE RESULTS (2/2) -->
  ${slideChrome(
    10,
    "EXPERIMENTAL RESULTS · PART 2",
    "Ablations, Error Analysis, Continuous Latency &amp; 3D Avatar Audit",
    "Face-Landmark Ablation Proof, Top Confused Pairs, CPU Latency Budget, Kannada SOV Gain &amp; Trajectory Cleaning",
    `
    <div class="two-col">
      <div class="col" style="gap:8px;">
        <div class="sec-title">Per-Class F1 Distribution &amp; Face-Landmark Ablation</div>
        <div class="chart-frame" style="height:212px;flex:none;">
          ${IMAGES.figPerclass ? `<img src="${IMAGES.figPerclass}" alt="Per-Class F1 Chart" />` : ""}
        </div>
        <div class="navy-callout" style="padding:7px 11px;font-size:11px;">
          <strong>Face-Landmark Ablation:</strong> Removing the 21 face-anchor features drops accuracy from <strong>66.8% → 47.8% (−19.0 pp)</strong>, proving facial reference anchors are essential.
        </div>
        <table class="clean compact">
          <thead><tr><th style="width:31%">Confused Pair</th><th style="width:12%">Cnt</th><th>Physical Cause</th></tr></thead>
          <tbody>
            <tr><td class="hl-navy">EAT → NOSE</td><td>4</td><td>Both touch face centerline near mouth/nose</td></tr>
            <tr><td class="hl-navy">HELLO → GOOD</td><td>3</td><td>Open palm near head/chin with outward sweep</td></tr>
            <tr><td class="hl-navy">THANK YOU → SORRY</td><td>3</td><td>Chin-to-chest trajectory overlap</td></tr>
            <tr><td class="hl-navy">WATER → DRINK</td><td>2</td><td>Shared cup-handshape toward mouth</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col" style="gap:9px;">
        <div class="sec-title teal">Real-Time CPU Latency &amp; Continuous Sentence Metrics</div>
        <table class="clean compact">
          <thead><tr><th style="width:34%">Subsystem / Stage</th><th style="width:27%">Measured Value</th><th>Operating Context</th></tr></thead>
          <tbody>
            <tr><td class="hl-navy">Feature Extraction</td><td>1.4 ms / frame</td><td>Browser MediaPipe WASM (~30 fps)</td></tr>
            <tr><td class="hl-navy">Isolated Single-View</td><td>3.8 ms / sign</td><td>64-sign BiGRU ONNX on CPU</td></tr>
            <tr><td class="hl-navy">Isolated 3-View / 3-Seed</td><td>11.2 / 15.3 ms</td><td>64-sign TTA / 144-sign Promoted</td></tr>
            <tr><td class="hl-navy">Continuous Greedy CTC</td><td>12.3 ms / clip</td><td>2-layer BiGRU-CTC alignment</td></tr>
            <tr><td class="hl-navy">Fused Sentence (λ=1.0)</td><td>37.0 ms (p95: 62)</td><td>69.4% unseen-round / 101 closed set</td></tr>
            <tr><td class="hl-navy">Stillness Gate Window</td><td>280 ms tail</td><td>Prevents premature sign splitting</td></tr>
          </tbody>
        </table>
        <div class="sec-title teal" style="margin-top:2px;">Kannada Meaning Layer &amp; 3D Avatar Trajectory Audit</div>
        <div class="mini-grid-2">
          <div class="impact-box teal">
            <div class="iv">39.5% → 60.5%</div>
            <div class="il">Kannada SOV Fluency</div>
            <p>Natural grammatical phrasing across 43 counter/daily patterns vs. literal gloss mapping, paired with kn-IN speech.</p>
          </div>
          <div class="impact-box">
            <div class="iv">367 → 0 Drops</div>
            <div class="il">3D Avatar Audit (161 Clips)</div>
            <p>Cubic spline gap-fill + wrist clamping removed all 367 sudden arm drops across 161 clips, sustaining smooth 60 fps IK.</p>
          </div>
        </div>
      </div>
    </div>`
  )}

  <!-- SLIDE 11: COMPARISON, SCALABILITY & DEAF ISL USER STUDY -->
  ${slideChrome(
    11,
    "BENCHMARKING &amp; REVIEWER REVISIONS",
    "Comparison with Prior Work, Scaling Beyond 144 &amp; Deaf ISL Study",
    "Addressing All Peer-Review Critiques Honestly: Vocabulary Scalability Roadmap &amp; Live Pre-Registered Human Study (#study)",
    `
    <div>
      <div class="sec-title">Contextual Comparison with Existing Sign Language Systems</div>
      <table class="clean compact">
        <thead>
          <tr><th>System</th><th>Split Rigor</th><th>Vocab / Task</th><th>Bidirectional</th><th>Regional Lang.</th><th>Edge CPU Privacy</th></tr>
        </thead>
        <tbody>
          <tr><td class="hl-navy">INCLUDE (2020)</td><td>Clip-level / signer-mixed</td><td>263 isolated ISL</td><td>No (Sign → Eng)</td><td>English only</td><td>Offline GPU</td></tr>
          <tr><td class="hl-navy">ISL-CSLTR (2021)</td><td>Multi-signer sentence</td><td>100 continuous ISL</td><td>No (Sign → Eng)</td><td>English only</td><td>Offline GPU</td></tr>
          <tr><td class="hl-navy">Camgoz SLT (2020)</td><td>Signer-independent</td><td>DGS continuous</td><td>No (Sign → Ger)</td><td>German only</td><td>Cloud GPU</td></tr>
          <tr><td class="hl-teal">Silent Bridge (Ours)</td><td class="hl-teal">Strict Unseen Signer</td><td class="hl-teal">144 Iso (87.2%) + 101 Sent</td><td class="hl-teal">Yes (3D Avatar)</td><td class="hl-teal">Kannada SOV + TTS</td><td class="hl-teal">Yes (147-D Browser)</td></tr>
        </tbody>
      </table>
    </div>
    <div class="two-col">
      <div class="col">
        <div class="sec-title">Revision 1 · Scaling Roadmap (144 → 500–2,000+ Signs)</div>
        <table class="clean compact">
          <tbody>
            <tr><td class="hl-navy" style="width:34%">1. Proven 64 → 144 Jump</td><td>2.25× vocabulary expansion raised shared-split accuracy from 81.5% → 84.7% and full held-out to 87.2%.</td></tr>
            <tr><td class="hl-navy">2. Metric + HNSW</td><td>Replace flat softmax with ArcFace/cosine embeddings + approximate nearest-neighbor retrieval for 2,000+ classes.</td></tr>
            <tr><td class="hl-navy">3. Phonological Heads</td><td>Auxiliary handshape, location &amp; facial NMM heads resolve near-homophone confusions (EAT/NOSE, HELLO/GOOD).</td></tr>
            <tr><td class="hl-navy">4. O(C·d) Linear Budget</td><td>Backbone cost is constant; scaling output head to 2,000 signs adds &lt; 0.4 ms on CPU.</td></tr>
            <tr><td class="hl-navy">5. Range + Few-Shot</td><td>Selective corpus streaming (86.7% saved) + instant browser prototype onboarding (cos ≥ 0.82).</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col">
        <div class="sec-title teal">Revision 2 · Live Deaf ISL User Study (#study)</div>
        <div class="study-panel">
          <h4>Implemented Live in Web App (<code>#study</code>) — Zero Fabricated Human Scores</h4>
          <ul>
            <li><strong>Cohort &amp; Ethics:</strong> Pre-registered N = 8–12 adult Deaf ISL signers in Bengaluru facilitated by an accredited ISL interpreter (informed consent + anonymized IDs).</li>
            <li><strong>Task 1 (Avatar Clarity):</strong> 18 blind randomized avatar clips — 4-AFC comprehension, 1–5 visual clarity Likert, and 5 structured error tags (handshape, speed, location, timing, missing NMM).</li>
            <li><strong>Task 2 (Sentence Gist):</strong> 5 bidirectional Kannada ↔ ISL sentences rated on gist accuracy &amp; naturalness.</li>
            <li><strong>Task 3 (Counter Role-Play &amp; SUS):</strong> Public desk scenario + standard 10-item Brooke SUS (0–100) with one-click JSON/CSV research export.</li>
            <li><strong>Integrity Rule:</strong> Reports verified objective avatar audit (367 → 0 drops) today and awaits real consented sessions before publishing human SUS/comprehension means.</li>
          </ul>
        </div>
      </div>
    </div>`
  )}

  <!-- SLIDE 12: DELIVERABLES, CONCLUSION & CLOSING -->
  ${slideChrome(
    12,
    "RESEARCH IMPACT &amp; CONCLUSION",
    "Academic Deliverables, Key Contributions &amp; Conclusion",
    "Verified 6-Page NCDTE Conference Manuscript, 79-Page BMSCE CSBS Report &amp; Deployed Bidirectional System",
    `
    <div>
      <div class="sec-title">Verified Academic &amp; Software Deliverables</div>
      <table class="clean compact">
        <thead><tr><th style="width:26%">Deliverable</th><th>Verified Specification &amp; Audit Status</th></tr></thead>
        <tbody>
          <tr><td class="hl-navy">NCDTE Conference Paper (6 Pages)</td><td>Single-column 12pt Times New Roman, 2.5/2.0 cm margins, 5 tables, 4 figures, 15 numbered references. Addressed all 3 reviewer revisions: (1) 144-sign promotion + 5-axis scaling, (2) Avatar audit + live <code>#study</code> protocol with zero fabricated scores, (3) Condensed from ~6,000 words to strict 6-page conference limit.</td></tr>
          <tr><td class="hl-navy">B.E. Final Project Report (79 Pages)</td><td>77-page BMSCE CSBS thesis (27,910 words, 100% Times New Roman, 21 embedded figures/screens) + 2-page iThenticate certificate (6% AI index, submission <code>trn:oid:::3618:158338407</code>).</td></tr>
          <tr><td class="hl-navy">Shipped Bidirectional Web Platform</td><td>16 modules live in React + Three.js + ONNX / FastAPI: 144-sign promoted BiGRU, 101-sentence BiGRU-CTC, Kannada SOV + kn-IN speech, 161-clip 3D avatar, few-shot custom signs, and live <code>#study</code> harness.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="two-col">
      <div class="col">
        <div class="sec-title">Core Takeaways</div>
        <ul class="bullet-list">
          <li><strong>Practical Real-Time Accessibility:</strong> Commodity laptops execute bidirectional ISL ↔ Kannada translation with 3D avatar feedback at sub-40 ms CPU latency and zero video upload.</li>
          <li><strong>Rigorous Empirical Governance:</strong> Unseen-signer evaluation, MD5 deduplication, McNemar validation (p = 0.003), and evidence-gated model promotion (64 → 144 signs).</li>
          <li><strong>Ready for Field Expansion:</strong> Extensible to Telugu, Tamil, Malayalam, offline rural clinic PWA tablets, and formal N = 8–12 Deaf community evaluation.</li>
        </ul>
      </div>
      <div class="col">
        <div class="sec-title teal">Transparent Scope &amp; Next Milestones</div>
        <ul class="bullet-list">
          <li><strong>Continuous Decoding Scope:</strong> Current BiGRU-CTC fusion operates over a 101-sentence closed set; next step is open-vocabulary prefix-beam search with a Kannada LM.</li>
          <li><strong>Human Evaluation Execution:</strong> Live <code>#study</code> module is engineered and unit-tested; next milestone is completing IRB-consented sessions with Bengaluru Deaf ISL signers.</li>
          <li><strong>Regional Dialect Coverage:</strong> Future collection targets multi-lighting webcam cohorts across Karnataka.</li>
        </ul>
      </div>
    </div>
    <div class="closing-banner">
      <h3>Thank You &nbsp;—&nbsp; Questions &amp; Live System Demonstration</h3>
      <p>H S Thanush (1BM23CB066) &nbsp;·&nbsp; Kiran M K (1BM23CB068) &nbsp;·&nbsp; Manoj G U (1BM24CB401) &nbsp;&nbsp;|&nbsp;&nbsp; Guide: Prof. Tejaswini K &nbsp;&nbsp;|&nbsp;&nbsp; Dept. of CSBS, BMSCE</p>
    </div>`
  )}

</body>
</html>`;

  const outHtml = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.html");
  fs.writeFileSync(outHtml, html, "utf-8");
  fs.mkdirSync(DOCS_PAPER_DIR, { recursive: true });
  fs.copyFileSync(outHtml, path.join(DOCS_PAPER_DIR, "SILENT_BRIDGE_Presentation_10Slides.html"));
  console.log(`[generate-ppt] Wrote bold 12-slide HTML -> ${outHtml}`);
}

await generatePptxFile();
generateHtmlDeck();
