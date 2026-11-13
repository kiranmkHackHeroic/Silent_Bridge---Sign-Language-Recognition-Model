#!/usr/bin/env node
/**
 * Generates the 14-Slide Widescreen (16:9) B.E. Major Project Presentation Deck
 * referenced from the 78-Page B.M.S. College of Engineering (CSBS) Project Report:
 *   Slide 1:  Title Slide (College Name, Logo, Project Title, Team & Guide — Clean Academic Format)
 *   Slide 2:  Table of Contents (Presentation Agenda)
 *   Slide 3:  Abstract
 *   Slide 4:  Introduction & Why We Selected This Topic (Domain Context Only — No Solution Claims)
 *   Slide 5:  Problem Statement & Objectives (4 Clear Objectives — No "Target Met" Claims)
 *   Slide 6:  Literature Survey (Existing Research Papers & Limitations Only — No Our Solution)
 *   Slide 7:  System Architecture & Bidirectional Pipeline (Report Fig. 5.1 + Arrow Flowcharts)
 *   Slide 8:  System Requirements: Hardware & Software Specifications
 *   Slide 9:  Feature Extraction Schema (147-D Hand, Face & Motion Features + 441-D Pooling)
 *   Slide 10: Module-Wise Implementation (Explaining All Modules: What, How & Why)
 *   Slide 11: Evaluation Parameters (Accuracy, Precision, Recall, F1) & Comparison with Existing Results
 *   Slide 12: Experimental Results & Named Performance Graphs
 *   Slide 13: Conclusion & Future Work (Dedicated Slide — Objective "What Was Done" Tone)
 *   Slide 14: Research Paper Publication & Its Importance (Final Slide)
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

const FONT = "Times New Roman";
const TOTAL_SLIDES = 14;

const COLORS = {
  navy: "0F172A",
  darkBlue: "1E3A8A",
  blue: "2563EB",
  lightBlue: "EFF6FF",
  borderBlue: "93C5FD",
  teal: "065F46",
  emerald: "047857",
  lightGreen: "ECFDF5",
  borderGreen: "6EE7B7",
  amber: "B45309",
  lightAmber: "FFFBEB",
  borderAmber: "FCD34D",
  purple: "581C87",
  violet: "6D28D9",
  lightPurple: "F5F3FF",
  borderPurple: "C4B5FD",
  crimson: "B91C1C",
  lightRed: "FEF2F2",
  borderRed: "FCA5A5",
  bronze: "6B3400",
  orangeBrown: "C25E00",
  slate: "334155",
  muted: "475569",
  lightGray: "F8FAFC",
  borderGray: "CBD5E1",
  white: "FFFFFF",
  gold: "F59E0B",
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
  figDatadist: readImageDataUri(path.join(REPORT_DIR, "fig_datadist.png")),
  figResults: readImageDataUri(path.join(REPORT_DIR, "fig_results.png")),
  figCalibration: readImageDataUri(path.join(REPORT_DIR, "fig_calibration.png")),
  figPerclass: readImageDataUri(path.join(REPORT_DIR, "fig_perclass.png")),
  figSegmentation: readImageDataUri(path.join(REPORT_DIR, "fig_segmentation.png")),
  figRobustness: readImageDataUri(path.join(REPORT_DIR, "fig_robustness.png")),
  uiLive: readImageDataUri(path.join(REPORT_DIR, "fig_ui_live.png")),
  uiCustom: readImageDataUri(path.join(REPORT_DIR, "fig_ui_custom.png")),
  uiAvatar: readImageDataUri(path.join(REPORT_DIR, "fig_ui_avatar.png")),
  uiReference: readImageDataUri(path.join(REPORT_DIR, "fig_ui_reference.png")),
  uiDataset: readImageDataUri(path.join(REPORT_DIR, "fig_ui_dataset.png")),
  uiTesting: readImageDataUri(path.join(REPORT_DIR, "fig_ui_testing.png")),
};

function addMasterChrome(slide, pptx, slideNumber, title, subtitle, chapterRef) {
  slide.background = { color: COLORS.white };

  // Top dark navy header bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 1.0,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy, width: 0 },
  });

  // Accent bottom stripe under header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 1.0,
    w: 13.333,
    h: 0.05,
    fill: { color: COLORS.blue },
    line: { color: COLORS.blue, width: 0 },
  });

  // Slide number badge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.32,
    y: 0.18,
    w: 1.18,
    h: 0.62,
    fill: { color: COLORS.blue },
    line: { color: "93C5FD", width: 1 },
    rectRadius: 0.08,
  });

  slide.addText(`Slide ${slideNumber}/${TOTAL_SLIDES}`, {
    x: 0.32,
    y: 0.18,
    w: 1.18,
    h: 0.62,
    fontFace: FONT,
    fontSize: 12.5,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "middle",
  });

  // Slide Title & Subtitle
  slide.addText(title, {
    x: 1.62,
    y: 0.1,
    w: 8.85,
    h: 0.48,
    fontFace: FONT,
    fontSize: 20,
    bold: true,
    color: COLORS.white,
    valign: "middle",
  });

  slide.addText(subtitle, {
    x: 1.62,
    y: 0.56,
    w: 8.85,
    h: 0.34,
    fontFace: FONT,
    fontSize: 11.5,
    italic: true,
    color: "93C5FD",
    valign: "middle",
  });

  // Chapter Reference Badge on right of header
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.55,
    y: 0.2,
    w: 2.45,
    h: 0.56,
    fill: { color: "1E293B" },
    line: { color: "60A5FA", width: 1 },
    rectRadius: 0.08,
  });

  slide.addText(chapterRef, {
    x: 10.55,
    y: 0.2,
    w: 2.45,
    h: 0.56,
    fontFace: FONT,
    fontSize: 10.5,
    bold: true,
    color: "DBEAFE",
    align: "center",
    valign: "middle",
  });

  // Bottom footer bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 7.14,
    w: 13.333,
    h: 0.36,
    fill: { color: "F1F5F9" },
    line: { color: COLORS.borderGray, width: 0.75 },
  });

  slide.addText(
    "Department of CSBS · B.M.S. College of Engineering, Bangalore · Silent Bridge B.E. Major Project (2026–2027)",
    {
      x: 0.38,
      y: 7.15,
      w: 9.2,
      h: 0.32,
      fontFace: FONT,
      fontSize: 10,
      bold: true,
      color: COLORS.slate,
      valign: "middle",
    }
  );

  slide.addText(`Slide ${slideNumber} of ${TOTAL_SLIDES}`, {
    x: 10.8,
    y: 7.15,
    w: 2.15,
    h: 0.32,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: COLORS.darkBlue,
    align: "right",
    valign: "middle",
  });
}

function addCard(slide, pptx, opts) {
  const {
    x,
    y,
    w,
    h,
    headerText,
    headerFill = COLORS.darkBlue,
    bodyFill = COLORS.lightGray,
    borderColor = COLORS.borderGray,
    headerHeight = 0.38,
  } = opts;

  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: bodyFill },
    line: { color: borderColor, width: 1.4 },
    rectRadius: 0.05,
  });

  if (headerText) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h: headerHeight,
      fill: { color: headerFill },
      line: { color: headerFill, width: 0 },
      rectRadius: 0.05,
    });

    slide.addText(headerText, {
      x: x + 0.08,
      y,
      w: w - 0.16,
      h: headerHeight,
      fontFace: FONT,
      fontSize: 12.5,
      bold: true,
      color: COLORS.white,
      align: "center",
      valign: "middle",
    });
  }
}

async function generatePptxFile() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pptx.author = "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)";
  pptx.company = "B.M.S. College of Engineering — Department of CSBS";
  pptx.subject = "B.E. Major Project Presentation (Referenced from 78-Page CSBS Project Report)";
  pptx.title =
    "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

  // =========================================================================
  // SLIDE 1: CLEAN ACADEMIC TITLE SLIDE (COLLEGE NAME, TITLE, TEAM & GUIDE)
  // =========================================================================
  {
    const s1 = pptx.addSlide();
    s1.background = { color: COLORS.white };

    // Outer & inner formal border matching the BMSCE report cover page
    s1.addShape(pptx.ShapeType.rect, {
      x: 0.35,
      y: 0.28,
      w: 12.63,
      h: 6.94,
      fill: { color: COLORS.white },
      line: { color: "000000", width: 2.2 },
    });
    s1.addShape(pptx.ShapeType.rect, {
      x: 0.43,
      y: 0.36,
      w: 12.47,
      h: 6.78,
      fill: { color: COLORS.white },
      line: { color: "000000", width: 0.8 },
    });

    // College Header in BMSCE Bronze (#6B3400)
    s1.addText("B.M.S. COLLEGE OF ENGINEERING", {
      x: 0.8,
      y: 0.5,
      w: 11.73,
      h: 0.48,
      fontFace: FONT,
      fontSize: 24,
      bold: true,
      color: COLORS.bronze,
      align: "center",
    });

    s1.addText(
      "(Autonomous Institute Affiliated to VTU)\nBull Temple Road, Basavanagudi, Bangalore – 560019",
      {
        x: 0.8,
        y: 0.98,
        w: 11.73,
        h: 0.56,
        fontFace: FONT,
        fontSize: 13.5,
        bold: true,
        color: COLORS.bronze,
        align: "center",
        lineSpacingMultiple: 1.15,
      }
    );

    if (IMAGES.logo) {
      s1.addImage({
        data: IMAGES.logo,
        x: 6.18,
        y: 1.62,
        w: 0.96,
        h: 0.96,
      });
    }

    s1.addText("A Major Project Presentation on", {
      x: 0.8,
      y: 2.66,
      w: 11.73,
      h: 0.3,
      fontFace: FONT,
      fontSize: 13,
      italic: true,
      color: "000000",
      align: "center",
    });

    s1.addText(
      "Silent Bridge: Real-Time Bidirectional Indian Sign Language And Kannada Translation With 3D Avatar",
      {
        x: 0.9,
        y: 3.0,
        w: 11.53,
        h: 0.85,
        fontFace: FONT,
        fontSize: 20.5,
        bold: true,
        color: "000000",
        align: "center",
        valign: "middle",
      }
    );

    s1.addText(
      "BACHELOR OF ENGINEERING IN COMPUTER SCIENCE AND BUSINESS SYSTEMS",
      {
        x: 0.8,
        y: 3.92,
        w: 11.73,
        h: 0.34,
        fontFace: FONT,
        fontSize: 13,
        bold: true,
        color: COLORS.darkBlue,
        align: "center",
      }
    );

    // Bottom Left: Submitted By (USNs in strictly increasing order)
    s1.addShape(pptx.ShapeType.roundRect, {
      x: 0.85,
      y: 4.4,
      w: 5.65,
      h: 1.75,
      fill: { color: COLORS.lightGray },
      line: { color: COLORS.borderGray, width: 1 },
      rectRadius: 0.05,
    });

    s1.addText("Submitted by:", {
      x: 1.05,
      y: 4.48,
      w: 5.25,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12.5,
      italic: true,
      bold: true,
      color: COLORS.slate,
      align: "center",
    });

    s1.addText(
      "H S Thanush (1BM23CB066)\nKiran M K (1BM23CB068)\nManoj G U (1BM24CB401)",
      {
        x: 1.05,
        y: 4.82,
        w: 5.25,
        h: 1.22,
        fontFace: FONT,
        fontSize: 14.5,
        bold: true,
        color: "000000",
        align: "center",
        lineSpacingMultiple: 1.28,
      }
    );

    // Bottom Right: Under the Guidance of
    s1.addShape(pptx.ShapeType.roundRect, {
      x: 6.83,
      y: 4.4,
      w: 5.65,
      h: 1.75,
      fill: { color: COLORS.lightGray },
      line: { color: COLORS.borderGray, width: 1 },
      rectRadius: 0.05,
    });

    s1.addText("Under the guidance of:", {
      x: 7.03,
      y: 4.48,
      w: 5.25,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12.5,
      italic: true,
      bold: true,
      color: COLORS.slate,
      align: "center",
    });

    s1.addText(
      "Prof. Tejaswini K\nAssistant Professor, Dept. of CSBS\nHoD: Dr. R Ashok Kumar  |  Principal: Dr. Beemsha Arya",
      {
        x: 7.03,
        y: 4.82,
        w: 5.25,
        h: 1.22,
        fontFace: FONT,
        fontSize: 13.5,
        bold: true,
        color: "000000",
        align: "center",
        lineSpacingMultiple: 1.28,
      }
    );

    // Department Footer matching screenshot
    s1.addText("Department of Computer Science and Business Systems", {
      x: 0.8,
      y: 6.26,
      w: 11.73,
      h: 0.32,
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: COLORS.orangeBrown,
      align: "center",
    });

    s1.addText(
      "B.M.S. College of Engineering, Bull Temple Road, Basavanagudi, Bangalore – 560019  ·  2026–2027",
      {
        x: 0.8,
        y: 6.58,
        w: 11.73,
        h: 0.32,
        fontFace: FONT,
        fontSize: 12.5,
        bold: true,
        color: "000000",
        align: "center",
      }
    );
  }

  // =========================================================================
  // SLIDE 2: CONTENT TABLE (PRESENTATION AGENDA)
  // =========================================================================
  {
    const s2 = pptx.addSlide();
    addMasterChrome(
      s2,
      pptx,
      2,
      "Table of Contents (Presentation Agenda)",
      "Structured Sequence of Topics Covered in This Presentation",
      "Report Table of Contents"
    );

    addCard(s2, pptx, {
      x: 0.45,
      y: 1.2,
      w: 12.43,
      h: 5.7,
      headerText: "Presentation Outline & Report Chapter Mapping",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const agendaRows = [
      [
        { text: "Slide No.", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Presentation Section", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Key Contents Covered", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Report Reference", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      ["Slide 03", "Abstract", "Project scope, methodology overview, dataset & bidirectional workflow", "Preliminaries (p. iii)"],
      ["Slide 04", "Introduction & Topic Selection", "Domain background, ISL in Karnataka, and motivation for selecting this topic", "Chapter 1 (pp. 1–4)"],
      ["Slide 05", "Problem Statement & Objectives", "Core communication challenges and 4 concise project objectives", "Chapter 1 (pp. 5–8)"],
      ["Slide 06", "Literature Survey", "Review of existing research papers, methodologies, and limitations", "Chapter 2 (pp. 9–17)"],
      ["Slide 07", "System Architecture & Pipeline", "Report architecture diagram (Fig. 5.1) and arrow-connected pipelines", "Chapter 5 (pp. 32–35)"],
      ["Slide 08", "Hardware & Software Requirements", "Hardware configuration and full-stack software dependencies", "Chapter 3 (pp. 18–25)"],
      ["Slide 09", "Feature Extraction Schema", "147-D hand, facial & motion feature representation and 441-D pooling", "Chapter 5 (pp. 35–38)"],
      ["Slide 10", "Module-Wise Implementation", "Detailed explanation of all 6 modules (What, How & Why) + UI views", "Chapter 6 (pp. 45–54)"],
      ["Slide 11", "Evaluation Parameters & Comparison", "Precision, Recall, F1, Accuracy formulas & comparison with existing works", "Chapter 7 (pp. 55–59)"],
      ["Slide 12", "Experimental Results & Named Graphs", "Named evaluation graphs: Accuracy, Calibration, Per-Class F1 & SER", "Chapter 7 (pp. 60–63)"],
      ["Slide 13", "Conclusion & Future Work", "Summary of work completed and directions for future expansion", "Chapter 8 (pp. 64–66)"],
      ["Slide 14", "Research Paper Publication", "IEEE paper manuscript details and academic/social importance", "Appendix B (p. 72)"],
    ];

    s2.addTable(agendaRows, {
      x: 0.65,
      y: 1.68,
      w: 12.03,
      colW: [1.15, 2.85, 5.88, 2.15],
      fontFace: FONT,
      fontSize: 11,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.37,
    });
  }

  // =========================================================================
  // SLIDE 3: ABSTRACT
  // =========================================================================
  {
    const s3 = pptx.addSlide();
    addMasterChrome(
      s3,
      pptx,
      3,
      "Abstract",
      "Overview of Bidirectional Indian Sign Language (ISL) and Kannada Translation System",
      "Report Abstract (Page iii)"
    );

    addCard(s3, pptx, {
      x: 0.45,
      y: 1.22,
      w: 12.43,
      h: 3.15,
      headerText: "Project Abstract",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.lightBlue,
      borderColor: COLORS.blue,
    });

    s3.addText(
      "Communication between Deaf and Hard-of-Hearing (DHH) citizens who use Indian Sign Language (ISL) and hearing individuals who speak Kannada remains a major challenge in hospitals, banks, classrooms, and public offices across Karnataka. Most existing automated sign language tools focus exclusively on one-way American Sign Language (ASL) to English translation or rely on wearable sensor gloves and cloud-based raw video processing.\n\nThis project develops Silent Bridge, a browser-executable, bidirectional translation framework connecting Indian Sign Language and Kannada. In the forward path (ISL to Kannada), webcam video is processed locally using MediaPipe Holistic to extract a 147-dimensional scale-invariant anatomical feature vector comprising dual 21-point hand skeletons, facial landmarks, and hand-to-face spatial anchors. A 3-state Hysteresis Motion Segmenter isolates continuous sign boundaries, and a hybrid Multilayer Perceptron (MLP) and Bidirectional Gated Recurrent Unit with Connectionist Temporal Classification (BiGRU-CTC) model classifies gestures via ONNX Runtime Web to synthesize grammatical Kannada text and speech. In the reverse path (Kannada to ISL), a rule-based Kannada morphological stemmer strips agglutinative suffixes, reorders clauses from Subject-Object-Verb (SOV) to ISL topological order, and drives a 60 FPS Three.js 3D humanoid avatar using a closed-form two-bone Analytic Inverse Kinematics (IK) solver with parabolic co-articulation trajectories.",
      {
        x: 0.7,
        y: 1.68,
        w: 11.93,
        h: 2.58,
        fontFace: FONT,
        fontSize: 12.5,
        color: COLORS.navy,
        align: "justify",
        valign: "middle",
        lineSpacingMultiple: 1.2,
      }
    );

    const pillars = [
      {
        x: 0.45,
        head: "Forward Direction (ISL ➔ Kannada)",
        fill: COLORS.blue,
        bg: COLORS.white,
        text: "• Local webcam landmark tracking (30 FPS)\n• 147-D hand + face spatial encoding\n• Hysteresis continuous motion segmentation\n• ONNX browser inference & Kannada TTS",
      },
      {
        x: 4.65,
        head: "Reverse Direction (Kannada ➔ ISL)",
        fill: COLORS.teal,
        bg: COLORS.white,
        text: "• Kannada text & speech input processing\n• 3-tier agglutinative suffix stemming\n• SOV-to-ISL clause reordering engine\n• 2-bone Analytic IK 3D Avatar (60 FPS)",
      },
      {
        x: 8.85,
        head: "Datasets & Evaluation Scope",
        fill: COLORS.purple,
        bg: COLORS.white,
        text: "• Harmonized Amrita-ISLR, INCLUDE & ISL-CSLTR\n• 144 vocabulary signs & 187 phrases\n• Signer-independent validation split\n• Client-side Few-Shot custom sign trainer",
      },
    ];

    pillars.forEach((p) => {
      addCard(s3, pptx, {
        x: p.x,
        y: 4.55,
        w: 4.03,
        h: 2.32,
        headerText: p.head,
        headerFill: p.fill,
        bodyFill: p.bg,
        borderColor: COLORS.borderGray,
      });
      s3.addText(p.text, {
        x: p.x + 0.16,
        y: 5.0,
        w: 3.7,
        h: 1.75,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: COLORS.navy,
        lineSpacingMultiple: 1.25,
      });
    });
  }

  // =========================================================================
  // SLIDE 4: INTRODUCTION & WHY WE SELECTED THIS TOPIC (NO SOLUTION CLAIMS)
  // =========================================================================
  {
    const s4 = pptx.addSlide();
    addMasterChrome(
      s4,
      pptx,
      4,
      "Introduction & Rationale for Topic Selection",
      "Domain Context of Indian Sign Language (ISL) and Regional Accessibility Needs in Karnataka",
      "Report Ch. 1, Sec. 1.1 (pp. 1–4)"
    );

    addCard(s4, pptx, {
      x: 0.45,
      y: 1.22,
      w: 6.1,
      h: 5.65,
      headerText: "1. Domain Introduction: Indian Sign Language (ISL)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.blue,
    });

    s4.addText(
      "• Visual-Spatial Natural Language:\n  Indian Sign Language (ISL) is a complete natural language with its own phonological, morphological, and syntactic structure distinct from spoken languages.\n\n• Multi-Channel Articulation:\n  Meaning in ISL is conveyed simultaneously through manual parameters (handshape, palm orientation, location, movement) and non-manual facial grammar (eyebrow movement, mouth aperture, head tilt).\n\n• Distinct Grammar from Kannada & English:\n  While spoken Kannada follows an agglutinative Subject–Object–Verb (SOV) structure with case suffixes, ISL follows a Topic–Comment / Temporal-First spatial syntax without inflectional word endings.\n\n• Demographics:\n  According to WHO and Census estimates, over 63 million individuals in India experience hearing or speech impairments, including a large population across Karnataka whose household and civic language is Kannada.",
      {
        x: 0.65,
        y: 1.72,
        w: 5.7,
        h: 4.95,
        fontFace: FONT,
        fontSize: 12.2,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );

    addCard(s4, pptx, {
      x: 6.78,
      y: 1.22,
      w: 6.1,
      h: 5.65,
      headerText: "2. Why We Selected This Topic (Motivation)",
      headerFill: COLORS.teal,
      bodyFill: COLORS.lightGreen,
      borderColor: COLORS.emerald,
    });

    s4.addText(
      "• Reason 1 — Lack of Regional Kannada Assistive Tools:\n  Almost all existing sign language datasets and translation tools are designed for American Sign Language (ASL) and English, leaving Kannada-speaking families, doctors, and officials unable to converse with Deaf citizens.\n\n• Reason 2 — Critical Need in Healthcare & Public Counters:\n  In hospital outpatient clinics, banks, and railway counters, Deaf citizens face difficulty explaining symptoms or civic requests when human interpreters are unavailable.\n\n• Reason 3 — Need for Two-Way (Bidirectional) Communication:\n  Communication is a two-way street: a Deaf person needs their signs translated into Kannada speech, and equally needs the doctor's or clerk's Kannada reply translated back into visual sign language.\n\n• Reason 4 — Privacy & Hardware Accessibility:\n  Public institutions require a software solution that runs on standard desktop/laptop webcams without expensive wearable gloves or cloud video recording.",
      {
        x: 6.98,
        y: 1.72,
        w: 5.7,
        h: 4.95,
        fontFace: FONT,
        fontSize: 12.2,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );
  }

  // =========================================================================
  // SLIDE 5: PROBLEM STATEMENT & OBJECTIVES (3–4 OBJECTIVES, NO TARGET MET)
  // =========================================================================
  {
    const s5 = pptx.addSlide();
    addMasterChrome(
      s5,
      pptx,
      5,
      "Problem Statement & Project Objectives",
      "Defining the Technical Challenges and Core Engineering Objectives of the Project",
      "Report Ch. 1, Sec. 1.2–1.4 (pp. 5–8)"
    );

    // Top Card: Problem Statement
    addCard(s5, pptx, {
      x: 0.45,
      y: 1.22,
      w: 12.43,
      h: 2.35,
      headerText: "Problem Statement (Report Section 1.2)",
      headerFill: COLORS.crimson,
      bodyFill: COLORS.lightRed,
      borderColor: COLORS.borderRed,
    });

    s5.addText(
      "Deaf and Hard-of-Hearing (DHH) individuals in Karnataka face a persistent communication barrier when interacting with Kannada-speaking healthcare providers, educators, and public service personnel due to:\n1. Severe Scarcity of Certified Interpreters: India has roughly 350 certified ISL interpreters, making on-demand human interpretation unavailable for routine hospital visits, banking, and classroom learning.\n2. Limitations of Existing Automated Approaches: Current vision-based systems are predominantly one-way (Sign-to-English), sensitive to camera distance and background clutter, struggle to segment continuous multi-sign streams from resting hand movements, and lack reverse translation from agglutinative Kannada text/speech into anatomically natural 3D sign animation.",
      {
        x: 0.68,
        y: 1.68,
        w: 11.96,
        h: 1.78,
        fontFace: FONT,
        fontSize: 12.3,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );

    // Bottom Card: 4 Concise Objectives (No "Target Met" claims)
    addCard(s5, pptx, {
      x: 0.45,
      y: 3.75,
      w: 12.43,
      h: 3.12,
      headerText: "Project Objectives (Report Section 1.4)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.blue,
    });

    const objectives = [
      {
        x: 0.65,
        y: 4.28,
        num: "Objective 1",
        title: "Scale-Invariant Hand & Face Landmark Extraction",
        desc: "To design a privacy-preserving, browser-based feature extraction pipeline that captures two-hand skeletal joints and facial grammar landmarks normalized for camera distance.",
      },
      {
        x: 6.75,
        y: 4.28,
        num: "Objective 2",
        title: "Continuous Sign Segmentation & Classification",
        desc: "To develop a motion-hysteresis segmentation module and hybrid neural classifier capable of recognizing isolated and continuous Indian Sign Language gestures in real time.",
      },
      {
        x: 0.65,
        y: 5.58,
        num: "Objective 3",
        title: "Kannada SOV Morphological & Grammar Engine",
        desc: "To construct a bidirectional linguistic engine that synthesizes natural Kannada sentences from recognized ISL glosses and converts Kannada SOV input into ISL word order.",
      },
      {
        x: 6.75,
        y: 5.58,
        num: "Objective 4",
        title: "3D Signing Avatar with Analytic Inverse Kinematics",
        desc: "To implement an interactive 3D humanoid avatar driven by closed-form two-bone inverse kinematics and smooth co-articulation trajectories for Kannada-to-ISL visualization.",
      },
    ];

    objectives.forEach((obj) => {
      s5.addShape(pptx.ShapeType.roundRect, {
        x: obj.x,
        y: obj.y,
        w: 5.92,
        h: 1.15,
        fill: { color: COLORS.lightBlue },
        line: { color: COLORS.borderBlue, width: 1.2 },
        rectRadius: 0.05,
      });
      s5.addText(
        [
          { text: `${obj.num}: ${obj.title}\n`, options: { bold: true, color: COLORS.darkBlue, fontSize: 12.5 } },
          { text: obj.desc, options: { bold: false, color: COLORS.navy, fontSize: 11.5 } },
        ],
        {
          x: obj.x + 0.14,
          y: obj.y + 0.06,
          w: 5.64,
          h: 1.02,
          fontFace: FONT,
          valign: "middle",
          lineSpacingMultiple: 1.15,
        }
      );
    });
  }

  // =========================================================================
  // SLIDE 6: LITERATURE SURVEY (PRIOR WORKS ONLY — NO OUR SOLUTION)
  // =========================================================================
  {
    const s6 = pptx.addSlide();
    addMasterChrome(
      s6,
      pptx,
      6,
      "Literature Survey",
      "Review of Existing Sign Language Recognition & Avatar Synthesis Research Papers",
      "Report Chapter 2 (pp. 9–17)"
    );

    addCard(s6, pptx, {
      x: 0.45,
      y: 1.2,
      w: 12.43,
      h: 5.7,
      headerText: "Table 2.1: Survey of Existing Research Works and Identified Limitations",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const litRows = [
      [
        { text: "Author(s) & Year", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Methodology / Model Used", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Dataset / Modality", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Limitations / Research Gap Identified", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      [
        "Abhishek et al. (2020)",
        "Wearable flex & IMU sensor glove with SVM classifier",
        "Custom 30-sign hardware dataset",
        "Requires expensive wired hardware (~Rs. 18,000); cannot capture facial grammar or non-manual markers.",
      ],
      [
        "Koller et al. (2019)",
        "Deep CNN + Weakly Supervised HMM on raw RGB frames",
        "RWTH-PHOENIX Weather (DGS)",
        "High GPU memory footprint; overfits to background lighting and signer clothing on unseen users.",
      ],
      [
        "Sridhar et al. (2020)",
        "Deep 3D-CNN / BiLSTM over video frames",
        "INCLUDE 263-Sign Isolated ISL Dataset",
        "Restricted to pre-trimmed isolated clips; lacks continuous stream boundary detection and regional language output.",
      ],
      [
        "Elakkiya & Natarajan (2021)",
        "Subunit sign modeling with 2D pose keypoints + LSTM",
        "ISL-CSLTR Sentence Corpus",
        "Fixed sliding windows produce high boundary insertion errors during natural inter-sign pauses.",
      ],
      [
        "Wadhawan & Kumar (2021)",
        "CNN-based static & dynamic handshape classifier",
        "35,000 static ISL alphabet/word images",
        "One-way recognition to English text only; omits non-manual facial cues and reverse sign animation.",
      ],
      [
        "Saunders et al. (2020)",
        "Progressive Transformers for 2D/3D skeletal pose generation",
        "PHOENIX14T German Sign Language",
        "Requires server-grade GPUs and lacks closed-form inverse kinematics, causing mid-sentence arm drops.",
      ],
    ];

    s6.addTable(litRows, {
      x: 0.62,
      y: 1.68,
      w: 12.08,
      colW: [2.15, 2.85, 2.35, 4.73],
      fontFace: FONT,
      fontSize: 11,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.68,
    });
  }

  // =========================================================================
  // SLIDE 7: SYSTEM ARCHITECTURE (REPORT DIAGRAM) & ARROW PIPELINE
  // =========================================================================
  {
    const s7 = pptx.addSlide();
    addMasterChrome(
      s7,
      pptx,
      7,
      "System Architecture & Step-by-Step Pipeline",
      "Report System Architecture Diagram (Fig. 5.1) & Arrow-Connected Bidirectional Workflows",
      "Report Ch. 5, Sec. 5.1 (pp. 32–35)"
    );

    // Left: Exact Report Architecture Diagram (Fig. 5.1)
    addCard(s7, pptx, {
      x: 0.4,
      y: 1.2,
      w: 6.65,
      h: 5.7,
      headerText: "Figure 5.1: System Architecture Diagram (From Project Report)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.blue,
    });

    if (IMAGES.figArchitecture) {
      s7.addImage({
        data: IMAGES.figArchitecture,
        x: 0.52,
        y: 1.68,
        w: 6.4,
        h: 5.05,
      });
    }

    // Right: Arrow-Connected Forward & Reverse Pipelines
    addCard(s7, pptx, {
      x: 7.2,
      y: 1.2,
      w: 5.73,
      h: 2.78,
      headerText: "Forward Pipeline: ISL Video ➔ Kannada Speech",
      headerFill: COLORS.blue,
      bodyFill: COLORS.lightBlue,
      borderColor: COLORS.borderBlue,
    });

    s7.addText(
      "  [1. Webcam Frame Capture (30 FPS)]\n                        ⬇\n  [2. MediaPipe Holistic (21×2 Hands + 12 Face Points)]\n                        ⬇\n  [3. 147-D Shoulder-Scaled Normalization]\n                        ⬇\n  [4. 3-State Hysteresis Velocity Segmenter]\n                        ⬇\n  [5. ONNX MLP + BiGRU-CTC Classifier]  ➔  [6. Kannada SOV & TTS]",
      {
        x: 7.35,
        y: 1.64,
        w: 5.43,
        h: 2.25,
        fontFace: FONT,
        fontSize: 11.5,
        bold: true,
        color: COLORS.navy,
        lineSpacingMultiple: 1.08,
      }
    );

    addCard(s7, pptx, {
      x: 7.2,
      y: 4.12,
      w: 5.73,
      h: 2.78,
      headerText: "Reverse Pipeline: Kannada Text/Voice ➔ 3D Avatar",
      headerFill: COLORS.teal,
      bodyFill: COLORS.lightGreen,
      borderColor: COLORS.borderGreen,
    });

    s7.addText(
      "  [1. Kannada Unicode Text / Speech Dictation]\n                        ⬇\n  [2. Three-Tier Morphological Suffix Stemmer]\n                        ⬇\n  [3. SOV-to-ISL Topological Clause Reordering]\n                        ⬇\n  [4. 144-Class Keyframe Trajectory Lookup]\n                        ⬇\n  [5. 2-Bone Analytic IK Solver]  ➔  [6. 60 FPS 3D Avatar Animation]",
      {
        x: 7.35,
        y: 4.56,
        w: 5.43,
        h: 2.25,
        fontFace: FONT,
        fontSize: 11.5,
        bold: true,
        color: COLORS.navy,
        lineSpacingMultiple: 1.08,
      }
    );
  }

  // =========================================================================
  // SLIDE 8: HARDWARE & SOFTWARE REQUIREMENTS (IMPLEMENTATION SETUP)
  // =========================================================================
  {
    const s8 = pptx.addSlide();
    addMasterChrome(
      s8,
      pptx,
      8,
      "System Requirements: Hardware & Software",
      "Hardware Configuration and Software Stack Used for Development, Training & Execution",
      "Report Chapter 3 (pp. 18–25)"
    );

    // Left: Hardware Requirements Table
    addCard(s8, pptx, {
      x: 0.45,
      y: 1.2,
      w: 5.95,
      h: 5.7,
      headerText: "Table 3.1: Hardware Requirements",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const hwRows = [
      [
        { text: "Component", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Minimum Specification", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Recommended Setup", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      ["Processor (CPU)", "Dual-Core x86_64 (2.0 GHz)", "Quad-Core Intel i5 / Ryzen 5"],
      ["System Memory", "4 GB RAM", "8 GB RAM or higher"],
      ["Camera Input", "720p / 480p USB or Integrated Webcam (30 FPS)", "720p HD Webcam (640×480 @ 30 FPS)"],
      ["Graphics (GPU)", "Integrated Graphics (WebGL 2.0 support)", "Integrated Iris Xe / WebGL 2.0"],
      ["Audio I/O", "Standard Speakers / Headphones", "Speakers + Microphone (for ASR)"],
      ["Disk Storage", "250 MB free browser cache", "2 GB SSD (for training corpus)"],
    ];

    s8.addTable(hwRows, {
      x: 0.6,
      y: 1.7,
      w: 5.65,
      colW: [1.45, 2.1, 2.1],
      fontFace: FONT,
      fontSize: 11,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.66,
    });

    // Right: Software Requirements Table
    addCard(s8, pptx, {
      x: 6.65,
      y: 1.2,
      w: 6.23,
      h: 5.7,
      headerText: "Table 3.2: Software Requirements & Technology Stack",
      headerFill: COLORS.teal,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const swRows = [
      [
        { text: "Software Layer", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Technology / Library", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Purpose in System", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      ["Operating System", "Windows 10/11, Ubuntu Linux, macOS", "Cross-platform execution"],
      ["Frontend UI", "React 18, TypeScript 5, Vite", "Interactive studios & state management"],
      ["Landmark Tracking", "MediaPipe Holistic (WASM)", "30 FPS hand (21×2) & face tracking"],
      ["Browser AI Engine", "ONNX Runtime Web (SIMD)", "Client-side neural model inference"],
      ["3D Avatar Engine", "Three.js (WebGL 2.0)", "60 FPS 3D humanoid & Analytic IK"],
      ["Speech Engine", "Web Speech API (kn-IN)", "Kannada TTS voice & ASR dictation"],
      ["Backend & ML", "Python 3.10+, FastAPI, PyTorch", "Model training, evaluation & API"],
    ];

    s8.addTable(swRows, {
      x: 6.8,
      y: 1.7,
      w: 5.93,
      colW: [1.55, 2.05, 2.33],
      fontFace: FONT,
      fontSize: 11,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.58,
    });
  }

  // =========================================================================
  // SLIDE 9: FEATURE EXTRACTION SCHEMA (147-D FEATURES & 441-D POOLING)
  // =========================================================================
  {
    const s9 = pptx.addSlide();
    addMasterChrome(
      s9,
      pptx,
      9,
      "Feature Extraction Schema (147-D Hand, Face & Motion)",
      "Anatomical Feature Vector Composition (Table 5.1) and Multi-Corpus Dataset Distribution",
      "Report Ch. 5, Sec. 5.2 (pp. 35–38)"
    );

    addCard(s9, pptx, {
      x: 0.4,
      y: 1.2,
      w: 7.25,
      h: 5.7,
      headerText: "Table 5.1: 147-D Per-Frame & 441-D Window Feature Vector Schema",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const featRows = [
      [
        { text: "Feature Block", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Indices", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Dims", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Description & Mathematical Normalization", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      ["Left Hand Skeleton", "[0 : 63]", "63-D", "21 joints × (x, y, z), centered at left wrist & scaled by shoulder width S_t"],
      ["Right Hand Skeleton", "[63 : 126]", "63-D", "21 joints × (x, y, z), centered at right wrist & scaled by shoulder width S_t"],
      ["Hand-to-Face Vectors", "[126 : 132]", "6-D", "3D displacement from Left & Right wrists to nose tip anchor (cranial height)"],
      ["Facial Grammar Cues", "[132 : 143]", "11-D", "Eyebrow raise, Mouth Aspect Ratio (MAR), Eye Aspect Ratio (EAR), head pitch/yaw"],
      ["Bimanual & Presence", "[143 : 147]", "4-D", "Inter-wrist Euclidean distance d_LR, hand visibility flags & wrist speed"],
      [
        { text: "Temporal Pooling", options: { bold: true, fill: "EFF6FF", color: COLORS.darkBlue } },
        { text: "[0 : 441]", options: { bold: true, fill: "EFF6FF", color: COLORS.darkBlue } },
        { text: "441-D", options: { bold: true, fill: "EFF6FF", color: COLORS.darkBlue } },
        { text: "Concatenation of Mean (μ, 147-D) ⊕ Std Dev (σ, 147-D) ⊕ Velocity (Δ, 147-D)", options: { bold: true, fill: "EFF6FF", color: COLORS.darkBlue } },
      ],
    ];

    s9.addTable(featRows, {
      x: 0.55,
      y: 1.68,
      w: 6.95,
      colW: [1.55, 1.0, 0.75, 3.65],
      fontFace: FONT,
      fontSize: 10.8,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.58,
    });

    s9.addText(
      "Why 147-D Features Are Used:\n• Scale Invariance: Dividing coordinates by shoulder span S_t ensures identical feature values whether the user sits 0.5m or 1.8m from the camera.\n• Minimal-Pair Disambiguation: Hand-to-face vectors [126:132] separate signs with identical handshapes performed near the forehead vs. chin.",
      {
        x: 0.58,
        y: 5.55,
        w: 6.9,
        h: 1.25,
        fontFace: FONT,
        fontSize: 11.2,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );

    // Right: Dataset Distribution Graph
    addCard(s9, pptx, {
      x: 7.8,
      y: 1.2,
      w: 5.13,
      h: 5.7,
      headerText: "Graph: Multi-Corpus Dataset Distribution (Fig. 5.2)",
      headerFill: COLORS.teal,
      bodyFill: COLORS.white,
      borderColor: COLORS.emerald,
    });

    if (IMAGES.figDatadist) {
      s9.addImage({
        data: IMAGES.figDatadist,
        x: 7.95,
        y: 1.72,
        w: 4.83,
        h: 3.25,
      });
    }

    s9.addText(
      "Dataset Composition (Report Table 3.2):\n• Amrita-ISLR: Isolated clinical & daily vocabulary\n• INCLUDE: Multi-signer lexical categories\n• ISL-CSLTR: Sentence-level continuous streams\n• Total Scope: 144 Vocabulary Classes, 187 Phrases, 314 Evaluation Video Streams",
      {
        x: 7.95,
        y: 5.1,
        w: 4.83,
        h: 1.65,
        fontFace: FONT,
        fontSize: 11.5,
        bold: true,
        color: COLORS.navy,
        lineSpacingMultiple: 1.2,
      }
    );
  }

  // =========================================================================
  // SLIDE 10: MODULE-WISE IMPLEMENTATION (EXPLAINING ALL MODULES: HOW & WHY)
  // =========================================================================
  {
    const s10 = pptx.addSlide();
    addMasterChrome(
      s10,
      pptx,
      10,
      "Module-Wise Implementation (How & Why)",
      "Detailed Explanation of All Six System Modules and Their Functional Role",
      "Report Chapter 6 (pp. 45–54)"
    );

    addCard(s10, pptx, {
      x: 0.4,
      y: 1.2,
      w: 8.35,
      h: 5.7,
      headerText: "Table 6.1: Implementation Breakdown of All Core System Modules (How & Why)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const modRows = [
      [
        { text: "Module Name", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "HOW It Is Implemented", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "WHY It Is Required", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      [
        "1. Holistic Landmark Module",
        "Extracts 21 left-hand, 21 right-hand & 12 face landmarks at 30 FPS via MediaPipe WebAssembly.",
        "Eliminates background clutter and keeps raw webcam video private on the client device.",
      ],
      [
        "2. Hysteresis Motion Segmenter",
        "3-state velocity FSM (IDLE ➔ SIGNING ➔ HOLD_PAUSE) with dual thresholds (θ_high=0.022, θ_low=0.011).",
        "Prevents accidental resting hand movements from triggering false words and isolates sign strokes.",
      ],
      [
        "3. Hybrid ONNX Classifier",
        "Fuses 441-D MLP with BiGRU-CTC temporal decoder exported to quantized ONNX Runtime Web.",
        "Captures both spatial hand postures and sequential trajectory order in 4.6 ms on CPU.",
      ],
      [
        "4. Few-Shot Custom Sign Trainer",
        "In-browser Float32 2-layer MLP (441➔96➔C) trained with AdamW and 12× kinematic augmentation.",
        "Allows users to enroll new regional or hospital signs from 3–5 clips in under 45 seconds.",
      ],
      [
        "5. Kannada SOV Grammar Engine",
        "3-tier morphological suffix stemmer & clause reorderer ([Time ➔ Subj ➔ Obj ➔ Verb ➔ Neg]).",
        "Converts agglutinative Kannada grammar into natural ISL sign sequence and synthesizes kn-IN speech.",
      ],
      [
        "6. 3D Avatar Analytic IK Module",
        "Closed-form 2-bone law-of-cosines Shoulder-Elbow-Wrist IK with parabolic transition arcs.",
        "Animates 144 signs at 60 FPS with chest-collision avoidance and zero mid-sentence arm drops.",
      ],
    ];

    s10.addTable(modRows, {
      x: 0.52,
      y: 1.66,
      w: 8.1,
      colW: [1.85, 3.15, 3.1],
      fontFace: FONT,
      fontSize: 10.3,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.69,
    });

    // Right Column: Live Studio + 3D Avatar Screenshots
    addCard(s10, pptx, {
      x: 8.9,
      y: 1.2,
      w: 4.03,
      h: 2.78,
      headerText: "Fig. 6.1: Live Recognition Module UI",
      headerFill: COLORS.blue,
      bodyFill: COLORS.white,
      borderColor: COLORS.blue,
    });
    if (IMAGES.uiLive) {
      s10.addImage({
        data: IMAGES.uiLive,
        x: 9.04,
        y: 1.64,
        w: 3.75,
        h: 2.22,
      });
    }

    addCard(s10, pptx, {
      x: 8.9,
      y: 4.12,
      w: 4.03,
      h: 2.78,
      headerText: "Fig. 6.3: 3D Avatar Analytic IK UI",
      headerFill: COLORS.teal,
      bodyFill: COLORS.white,
      borderColor: COLORS.emerald,
    });
    if (IMAGES.uiAvatar) {
      s10.addImage({
        data: IMAGES.uiAvatar,
        x: 9.04,
        y: 4.56,
        w: 3.75,
        h: 2.22,
      });
    }
  }

  // =========================================================================
  // SLIDE 11: EVALUATION PARAMETERS & COMPARISON WITH EXISTING RESULTS
  // =========================================================================
  {
    const s11 = pptx.addSlide();
    addMasterChrome(
      s11,
      pptx,
      11,
      "Evaluation Parameters & Comparison with Existing Works",
      "Definitions of Accuracy, Precision, Recall & F1-Score and Benchmark Comparison",
      "Report Ch. 7, Sec. 7.1–7.3 (pp. 55–59)"
    );

    // Left: Table of Evaluation Parameters
    addCard(s11, pptx, {
      x: 0.4,
      y: 1.2,
      w: 6.2,
      h: 5.7,
      headerText: "Table 7.1: Evaluation Parameters Explained",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.borderGray,
    });

    const paramRows = [
      [
        { text: "Parameter", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Formula", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Role in Sign Recognition", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Measured", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      [
        "Top-1 Accuracy",
        "(TP + TN) / N",
        "Fraction of test videos where top predicted gloss matches ground truth",
        "81.5% (All)\n76.5% (Unseen)",
      ],
      [
        "Precision",
        "TP / (TP + FP)",
        "Measures reliability of emitted signs & suppression of false triggers",
        "0.818",
      ],
      [
        "Recall (Sensitivity)",
        "TP / (TP + FN)",
        "Measures ability to detect actual signs across diverse signers",
        "0.792",
      ],
      [
        "Macro F1-Score",
        "2·(P × R) / (P + R)",
        "Harmonic mean of Precision & Recall across all sign classes",
        "0.800 (Base)\n0.812 (τ*=0.5)",
      ],
      [
        "Top-3 Accuracy",
        "Correct in Top 3",
        "Useful for interactive candidate chip selection in UI",
        "94.9%",
      ],
      [
        "Segment Error (SER)",
        "(S + D + I) / N_ref",
        "Levenshtein error rate on continuous multi-sign streams",
        "12.6%",
      ],
    ];

    s11.addTable(paramRows, {
      x: 0.52,
      y: 1.68,
      w: 5.96,
      colW: [1.3, 1.35, 2.26, 1.05],
      fontFace: FONT,
      fontSize: 10.3,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.66,
    });

    // Right: Comparison Between Existing Results and Proposed System
    addCard(s11, pptx, {
      x: 6.75,
      y: 1.2,
      w: 6.18,
      h: 5.7,
      headerText: "Table 7.2: Comparison Between Existing Methods and Proposed Work",
      headerFill: COLORS.teal,
      bodyFill: COLORS.white,
      borderColor: COLORS.emerald,
    });

    const compRows = [
      [
        { text: "Method / Model Evaluated", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Unseen Acc.", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Precision", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Recall", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
        { text: "Macro F1", options: { bold: true, fill: COLORS.navy, color: COLORS.white } },
      ],
      ["Single-Hand 63-D MLP (Existing)", "51.2%", "0.534", "0.498", "0.515"],
      ["Two-Hand 126-D Baseline (No Face)", "54.5%", "0.589", "0.560", "0.574"],
      ["3D-CNN RGB Video Model", "58.4%", "0.602", "0.571", "0.586"],
      ["147-D Hands+Face MLP (No BiGRU)", "62.9%", "0.654", "0.628", "0.641"],
      ["Sliding-Window LSTM (No Hysteresis)", "68.5%", "0.718", "0.698", "0.708"],
      [
        { text: "Proposed 147-D + Hysteresis + BiGRU-CTC (81.5% Overall)", options: { bold: true, fill: "DCFCE7", color: COLORS.teal } },
        { text: "76.5%", options: { bold: true, fill: "DCFCE7", color: COLORS.teal } },
        { text: "0.818", options: { bold: true, fill: "DCFCE7", color: COLORS.teal } },
        { text: "0.792", options: { bold: true, fill: "DCFCE7", color: COLORS.teal } },
        { text: "0.800", options: { bold: true, fill: "DCFCE7", color: COLORS.teal } },
      ],
    ];

    s11.addTable(compRows, {
      x: 6.88,
      y: 1.68,
      w: 5.92,
      colW: [2.32, 0.95, 0.9, 0.85, 0.9],
      fontFace: FONT,
      fontSize: 10.3,
      border: { pt: 1, color: COLORS.borderGray },
      valign: "middle",
      rowH: 0.58,
    });

    s11.addText(
      "Summary of Comparative Evaluation (Sec. 7.3):\n• Evaluated on 314 real video streams using leave-one-signer-out cross-validation.\n• Adding 21-D facial & hand-to-face features improved unseen-signer accuracy from 54.5% to 62.9%.\n• Combining Hysteresis segmentation, BiGRU-CTC, and 5-view TTA recorded 76.5% on unseen signers (81.5% overall, p = 0.003).",
      {
        x: 6.9,
        y: 5.32,
        w: 5.88,
        h: 1.45,
        fontFace: FONT,
        fontSize: 11.2,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );
  }

  // =========================================================================
  // SLIDE 12: EXPERIMENTAL RESULTS & NAMED PERFORMANCE GRAPHS
  // =========================================================================
  {
    const s12 = pptx.addSlide();
    addMasterChrome(
      s12,
      pptx,
      12,
      "Experimental Results & Named Performance Graphs",
      "Visual Evaluation Plots from Stratified and Unseen-Signer Testing (Report Chapter 7)",
      "Report Ch. 7, Sec. 7.3–7.6 (pp. 58–63)"
    );

    const graphs = [
      {
        x: 0.4,
        y: 1.18,
        title: "Graph 1: Top-1 Accuracy Across Feature & Model Stages (Fig. 5.3)",
        fill: COLORS.darkBlue,
        img: IMAGES.figResults,
        caption: "Compares All-Split (81.5%), Unseen Signers (76.5%), and INCLUDE Subset (92.7%).",
      },
      {
        x: 6.75,
        y: 1.18,
        title: "Graph 2: Out-of-Fold Confidence Calibration Curve (Fig. 5.4)",
        fill: COLORS.teal,
        img: IMAGES.figCalibration,
        caption: "Identifies optimal probability threshold τ* = 0.50 maximizing Macro-F1 (0.812).",
      },
      {
        x: 0.4,
        y: 4.12,
        title: "Graph 3: Per-Class F1-Score Distribution Across Signs (Fig. 5.5)",
        fill: COLORS.purple,
        img: IMAGES.figPerclass,
        caption: "Shows per-sign F1 distribution across evaluated test signs (Mean F1 = 0.800).",
      },
      {
        x: 6.75,
        y: 4.12,
        title: "Graph 4: Continuous Stream Segment Error Rate (SER) (Fig. 5.6)",
        fill: COLORS.amber,
        img: IMAGES.figSegmentation,
        caption: "Hysteresis + BiGRU-CTC reduces continuous 5-sign stream SER from 35.2% to 12.6%.",
      },
    ];

    graphs.forEach((g) => {
      addCard(s12, pptx, {
        x: g.x,
        y: g.y,
        w: 6.18,
        h: 2.82,
        headerText: g.title,
        headerFill: g.fill,
        bodyFill: COLORS.white,
        borderColor: COLORS.borderGray,
        headerHeight: 0.34,
      });

      if (g.img) {
        s12.addImage({
          data: g.img,
          x: g.x + 0.15,
          y: g.y + 0.38,
          w: 5.88,
          h: 2.04,
        });
      }

      s12.addText(g.caption, {
        x: g.x + 0.12,
        y: g.y + 2.44,
        w: 5.94,
        h: 0.34,
        fontFace: FONT,
        fontSize: 10.8,
        bold: true,
        color: COLORS.navy,
        align: "center",
      });
    });
  }

  // =========================================================================
  // SLIDE 13: CONCLUSION & FUTURE WORK (DEDICATED SLIDE, OBJECTIVE TONE)
  // =========================================================================
  {
    const s13 = pptx.addSlide();
    addMasterChrome(
      s13,
      pptx,
      13,
      "Conclusion & Future Work",
      "Summary of Engineering Work Completed and Scope for Future Extensions",
      "Report Chapter 8 (pp. 64–66)"
    );

    // Left: Conclusion (What Was Done)
    addCard(s13, pptx, {
      x: 0.45,
      y: 1.22,
      w: 6.08,
      h: 5.65,
      headerText: "1. Conclusion (Summary of Work Done — Sec. 8.1)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.lightBlue,
      borderColor: COLORS.blue,
    });

    s13.addText(
      "• Bidirectional Framework Implemented:\n  Designed and built a full-stack web application supporting both Indian Sign Language to Kannada translation and Kannada to 3D Avatar sign synthesis.\n\n• 147-D Anatomical Landmark Pipeline:\n  Implemented client-side MediaPipe Holistic extraction of 147-D hand and facial landmarks normalized by shoulder width, ensuring user video never leaves the browser.\n\n• Continuous Segmentation & Hybrid Classification:\n  Combined a 3-state Hysteresis Motion Segmenter with a 441-D MLP and BiGRU-CTC model exported to ONNX Runtime Web (4.6 ms inference time).\n\n• Kannada SOV Stemmer & 2-Bone Analytic IK:\n  Developed a rule-based Kannada morphological stemmer, SOV-to-ISL clause reorderer, and a 60 FPS Three.js avatar with parabolic inter-sign co-articulation.\n\n• Empirical Validation:\n  Evaluated across 314 video streams from Amrita-ISLR, INCLUDE, and ISL-CSLTR, recording 81.5% overall Top-1 accuracy and 76.5% on unseen signers.",
      {
        x: 0.65,
        y: 1.72,
        w: 5.68,
        h: 4.98,
        fontFace: FONT,
        fontSize: 11.8,
        color: COLORS.navy,
        lineSpacingMultiple: 1.16,
      }
    );

    // Right: Future Work
    addCard(s13, pptx, {
      x: 6.8,
      y: 1.22,
      w: 6.08,
      h: 5.65,
      headerText: "2. Future Work (Scope for Enhancement — Sec. 8.2)",
      headerFill: COLORS.teal,
      bodyFill: COLORS.lightGreen,
      borderColor: COLORS.emerald,
    });

    s13.addText(
      "• Direction 1 — Vocabulary Expansion to 1,000+ Signs:\n  Extend the current 144-sign lexicon to cover specialized medical triage, legal aid, and banking terminology across Karnataka dialects.\n\n• Direction 2 — Transformer & Diffusion Avatar Motion:\n  Integrate continuous spatio-temporal Transformer decoders for finger-spelling and diffusion-based facial blendshapes for richer eyebrow and mouthing prosody.\n\n• Direction 3 — Multi-Language Dravidian Grammar Support:\n  Extend the agglutinative SOV morphological stemmer to support Telugu, Tamil, and Malayalam alongside Kannada.\n\n• Direction 4 — Offline Mobile & Rural Kiosk Deployment:\n  Package the WebAssembly inference engine as an installable Progressive Web App (PWA) for low-power Android tablets in rural primary health centers (PHCs).",
      {
        x: 7.0,
        y: 1.72,
        w: 5.68,
        h: 4.98,
        fontFace: FONT,
        fontSize: 11.8,
        color: COLORS.navy,
        lineSpacingMultiple: 1.18,
      }
    );
  }

  // =========================================================================
  // SLIDE 14: RESEARCH PAPER PUBLICATION & ITS IMPORTANCE (FINAL SLIDE)
  // =========================================================================
  {
    const s14 = pptx.addSlide();
    addMasterChrome(
      s14,
      pptx,
      14,
      "Research Paper Publication & Its Importance",
      "Details of the Research Manuscript Prepared from This Project and Its Significance",
      "Report Appendix B (Page 72)"
    );

    // Top Card: Paper Details
    addCard(s14, pptx, {
      x: 0.45,
      y: 1.18,
      w: 12.43,
      h: 2.28,
      headerText: "Research Paper Manuscript Details (Report Appendix B)",
      headerFill: COLORS.darkBlue,
      bodyFill: COLORS.white,
      borderColor: COLORS.blue,
    });

    s14.addText(
      "• Title of Paper: “Silent Bridge: Real-Time Bidirectional Indian Sign Language and Kannada Translation with 3D Avatar”\n• Authors: H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401), and Prof. Tejaswini K (Assistant Professor, Dept. of CSBS, B.M.S. College of Engineering, Bangalore – 560019)\n• Manuscript Format & Structure: Standard IEEE Two-Column Research Paper Format (8 Pages · 12 Empirical Tables · 7 Figures · 12 Mathematical Equations · 3 Algorithms · 25 Peer-Reviewed IEEE References)\n• Core Focus: Privacy-Preserving 147-D Anatomical Landmark Recognition, Hysteresis + BiGRU-CTC Continuous Decoding, Kannada SOV Morphological Reordering, and Two-Bone Analytic Inverse Kinematics.",
      {
        x: 0.65,
        y: 1.62,
        w: 12.03,
        h: 1.75,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: COLORS.navy,
        lineSpacingMultiple: 1.2,
      }
    );

    // Middle Grid: 4 Pillars of Importance
    const impCards = [
      {
        x: 0.45,
        y: 3.6,
        title: "1. Benchmark & Dataset Contribution",
        fill: COLORS.blue,
        bg: COLORS.lightBlue,
        text: "Establishes a reproducible 147-D skeletal + facial landmark benchmark across 3 Indian Sign Language corpora (Amrita-ISLR, INCLUDE, ISL-CSLTR) with strict unseen-signer evaluation.",
      },
      {
        x: 6.75,
        y: 3.6,
        title: "2. Regional Kannada Linguistic Contribution",
        fill: COLORS.teal,
        bg: COLORS.lightGreen,
        text: "Documents a formal rule-based algorithm for stripping agglutinative Kannada suffixes and mapping Subject-Object-Verb (SOV) clauses into ISL temporal-first sign order.",
      },
      {
        x: 0.45,
        y: 4.92,
        title: "3. Edge-AI & Kinematic Engineering",
        fill: COLORS.purple,
        bg: COLORS.lightPurple,
        text: "Demonstrates sub-5ms browser-native ONNX inference on CPU laptops paired with closed-form 2-bone Analytic IK that eliminates mid-sentence avatar arm drops.",
      },
      {
        x: 6.75,
        y: 4.92,
        title: "4. Clinical Privacy & Societal Impact",
        fill: COLORS.amber,
        bg: COLORS.lightAmber,
        text: "Provides a zero-video-upload assistive blueprint aligned with UN SDGs 3, 4, 8, 9 & 10, reducing public counter interpretation costs by 94% (Rs. 16/day vs Rs. 1,800/day).",
      },
    ];

    impCards.forEach((c) => {
      addCard(s14, pptx, {
        x: c.x,
        y: c.y,
        w: 6.13,
        h: 1.22,
        headerText: c.title,
        headerFill: c.fill,
        bodyFill: c.bg,
        borderColor: COLORS.borderGray,
        headerHeight: 0.34,
      });
      s14.addText(c.text, {
        x: c.x + 0.14,
        y: c.y + 0.38,
        w: 5.85,
        h: 0.78,
        fontFace: FONT,
        fontSize: 11.2,
        color: COLORS.navy,
        valign: "middle",
        lineSpacingMultiple: 1.15,
      });
    });

    // Bottom Thank You Banner
    s14.addShape(pptx.ShapeType.roundRect, {
      x: 0.45,
      y: 6.26,
      w: 12.43,
      h: 0.72,
      fill: { color: COLORS.navy },
      line: { color: COLORS.gold, width: 1.5 },
      rectRadius: 0.06,
    });

    s14.addText(
      "THANK YOU!   |   H S Thanush (1BM23CB066) · Kiran M K (1BM23CB068) · Manoj G U (1BM24CB401)   |   Guide: Prof. Tejaswini K (Dept. of CSBS, BMSCE)",
      {
        x: 0.55,
        y: 6.26,
        w: 12.23,
        h: 0.72,
        fontFace: FONT,
        fontSize: 13,
        bold: true,
        color: COLORS.white,
        align: "center",
        valign: "middle",
      }
    );
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_PAPER_DIR, { recursive: true });

  const outReportPptx = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx");
  const outDocsPptx = path.join(DOCS_PAPER_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx");

  await pptx.writeFile({ fileName: outReportPptx });
  fs.copyFileSync(outReportPptx, outDocsPptx);
  console.log(`[generate-ppt] Wrote ${TOTAL_SLIDES}-slide PPTX -> ${outReportPptx}`);
}

function generateHtmlSlides() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SILENT BRIDGE — 14-Slide B.E. Project Presentation Deck (Referenced from 78-Page CSBS Report)</title>
  <style>
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman"), local("TimesNewRomanPSMT"), url("/report/fonts/LiberationSerif-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), url("/report/fonts/LiberationSerif-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Times New Roman";
      src: local("Times New Roman Italic"), local("TimesNewRomanPS-ItalicMT"), url("/report/fonts/LiberationSerif-Italic.ttf") format("truetype");
      font-weight: 400;
      font-style: italic;
      font-display: swap;
    }
    @font-face {
      font-family: "CSBS-Kannada";
      src: url("/report/fonts/NotoSerifKannada-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "CSBS-Kannada";
      src: url("/report/fonts/NotoSerifKannada-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", "CSBS-Kannada", Times, serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #1e293b;
      color: #0f172a;
      font-family: "Times New Roman", "CSBS-Kannada", Times, serif;
      padding: 64px 0 36px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }
    .ppt-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: #0f172a;
      border-bottom: 2px solid #2563eb;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 1000;
      font-size: 13.5px;
    }
    .ppt-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ppt-btn {
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border: 1px solid #60a5fa;
      padding: 6px 14px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .ppt-btn.secondary {
      background: #047857;
      border-color: #34d399;
    }
    .ppt-btn.print-btn {
      background: #334155;
      border-color: #64748b;
    }
    .ppt-slide {
      width: 1120px;
      height: 630px;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.48);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      page-break-after: always;
      break-after: page;
    }
    .slide-header {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 24px;
      border-bottom: 4px solid #2563eb;
      display: flex;
      align-items: center;
      gap: 14px;
      height: 72px;
      flex-shrink: 0;
    }
    .slide-badge {
      background: #2563eb;
      border: 1px solid #93c5fd;
      color: #ffffff;
      font-weight: 700;
      font-size: 13.5px;
      padding: 6px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .slide-header-text {
      flex: 1;
    }
    .slide-header-text h2 {
      font-size: 21px;
      font-weight: 700;
      line-height: 1.15;
      color: #ffffff;
    }
    .slide-header-text p {
      font-size: 12.5px;
      font-style: italic;
      color: #93c5fd;
      margin-top: 2px;
    }
    .chapter-pill {
      background: #1e293b;
      border: 1px solid #60a5fa;
      color: #dbeafe;
      font-weight: 700;
      font-size: 11.5px;
      padding: 6px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .slide-body {
      flex: 1;
      padding: 12px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      gap: 10px;
    }
    .slide-footer {
      height: 30px;
      background: #f1f5f9;
      border-top: 1px solid #cbd5e1;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.2px;
      color: #334155;
      font-weight: 700;
      flex-shrink: 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .v-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      background: #f8fafc;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .v-card-head {
      padding: 6px 12px;
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      text-align: center;
      background: #1e3a8a;
      flex-shrink: 0;
    }
    .v-card-body {
      padding: 10px 13px;
      font-size: 12.6px;
      line-height: 1.38;
      color: #0f172a;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .v-card-body ul {
      padding-left: 16px;
    }
    .v-card-body li {
      margin-bottom: 5px;
    }
    .ppt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.8px;
    }
    .ppt-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 5.5px 8px;
      text-align: left;
      border: 1px solid #334155;
      font-weight: 700;
    }
    .ppt-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .ppt-table tr.highlight td {
      background: #dcfce7;
      color: #065f46;
      font-weight: 700;
    }
    .ppt-table tr.subhighlight td {
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 700;
    }
    .pipeline-flow {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }
    .pipe-step {
      width: 100%;
      background: #ffffff;
      border: 1.5px solid #2563eb;
      border-radius: 5px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    .pipe-step.green {
      border-color: #059669;
    }
    .pipe-arrow {
      font-size: 14px;
      font-weight: 700;
      color: #1d4ed8;
      line-height: 1;
    }
    .pipe-arrow.green {
      color: #047857;
    }
    .summary-banner {
      background: #0f172a;
      border: 1.5px solid #f59e0b;
      color: #f8fafc;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      line-height: 1.35;
      flex-shrink: 0;
    }
    @media print {
      @page {
        size: 1120px 630px;
        margin: 0;
      }
      body {
        background: #ffffff;
        padding: 0;
        gap: 0;
      }
      .ppt-toolbar {
        display: none !important;
      }
      .ppt-slide {
        box-shadow: none;
        border-radius: 0;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="ppt-toolbar">
    <div>
      <strong>B.M.S. College of Engineering — Dept. of CSBS</strong> · 14-Slide B.E. Project Presentation Deck (Referenced from 78-Page Report)
    </div>
    <div class="ppt-toolbar-actions">
      <a class="ppt-btn" href="/api/ppt/download-pptx" data-preload-url="/api/ppt/download-pptx" download="SILENT_BRIDGE_Presentation.pptx">⬇ Download PowerPoint (.pptx)</a>
      <a class="ppt-btn secondary" href="/api/ppt/download-pdf" data-preload-url="/api/ppt/download-pdf" download="SILENT_BRIDGE_Presentation.pdf">⬇ Download PDF (14 Slides)</a>
      <button class="ppt-btn print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 1: CLEAN ACADEMIC TITLE SLIDE (COLLEGE NAME, TITLE, TEAM)       -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-1" data-slide="1" style="padding: 18px;">
    <div style="border: 2.5px solid #000; padding: 4px; height: 100%; width: 100%;">
      <div style="border: 1px solid #000; height: 100%; width: 100%; padding: 18px 28px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
        <div>
          <div style="font-size: 26px; font-weight: 700; color: #6B3400; letter-spacing: 0.4px;">
            B.M.S. COLLEGE OF ENGINEERING
          </div>
          <div style="font-size: 15px; font-weight: 700; color: #6B3400; line-height: 1.35; margin-top: 3px;">
            (Autonomous Institute Affiliated to VTU)<br/>
            Bull Temple Road, Basavanagudi, Bangalore – 560019
          </div>
        </div>

        <div style="margin: 4px 0;">
          ${IMAGES.logo ? `<img src="${IMAGES.logo}" alt="BMSCE Emblem" style="width: 76px; height: 76px; object-fit: contain;" />` : ""}
        </div>

        <div>
          <div style="font-size: 13.5px; font-style: italic; color: #000000; margin-bottom: 4px;">
            A Major Project Presentation on
          </div>
          <h1 class="report-project-title" style="font-size: 21.5px; font-weight: 700; color: #000000; line-height: 1.28; max-width: 960px;">
            Silent Bridge: Real-Time Bidirectional Indian Sign Language And Kannada Translation With 3D Avatar
          </h1>
          <div style="font-size: 13.5px; font-weight: 700; color: #1e3a8a; margin-top: 8px; letter-spacing: 0.3px;">
            BACHELOR OF ENGINEERING IN COMPUTER SCIENCE AND BUSINESS SYSTEMS
          </div>
        </div>

        <div class="grid-2" style="width: 100%; max-width: 960px; gap: 24px; margin: 6px 0;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px;">
            <div style="font-size: 12.5px; font-style: italic; font-weight: 700; color: #334155; margin-bottom: 5px;">Submitted by:</div>
            <div style="font-size: 15px; font-weight: 700; color: #000000; line-height: 1.48;">
              H S Thanush (1BM23CB066)<br/>
              Kiran M K (1BM23CB068)<br/>
              Manoj G U (1BM24CB401)
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 12.5px; font-style: italic; font-weight: 700; color: #334155; margin-bottom: 5px;">Under the guidance of:</div>
            <div style="font-size: 16px; font-weight: 700; color: #000000;">Prof. Tejaswini K</div>
            <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px;">Assistant Professor, Department of CSBS</div>
            <div style="font-size: 11.8px; font-weight: 700; color: #1e3a8a; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              HoD: Dr. R Ashok Kumar &nbsp;|&nbsp; Principal: Dr. Beemsha Arya
            </div>
          </div>
        </div>

        <div>
          <div style="font-size: 15px; font-weight: 700; color: #C25E00;">
            Department of Computer Science and Business Systems
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #000000; margin-top: 2px;">
            B.M.S. College of Engineering, Bull Temple Road, Basavanagudi, Bangalore – 560019 &nbsp;·&nbsp; 2026–2027
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 2: CONTENT TABLE (PRESENTATION AGENDA)                          -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-2" data-slide="2">
    <div class="slide-header">
      <div class="slide-badge">Slide 2 / 14</div>
      <div class="slide-header-text">
        <h2>Table of Contents (Presentation Agenda)</h2>
        <p>Structured Sequence of Sections Covered in This Presentation</p>
      </div>
      <div class="chapter-pill">Report Table of Contents</div>
    </div>
    <div class="slide-body">
      <div class="v-card" style="background: #ffffff; flex: 1;">
        <div class="v-card-head" style="background: #1e3a8a;">Presentation Agenda &amp; Report Chapter Mapping</div>
        <div class="v-card-body" style="padding: 8px 12px;">
          <table class="ppt-table">
            <thead>
              <tr>
                <th style="width: 90px;">Slide No.</th>
                <th style="width: 245px;">Presentation Section</th>
                <th>Key Contents Covered</th>
                <th style="width: 170px;">Report Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Slide 03</strong></td>
                <td><strong>Abstract</strong></td>
                <td>Project summary, bidirectional workflow, 147-D landmarks, Kannada SOV &amp; 3D IK</td>
                <td>Preliminaries (p. iii)</td>
              </tr>
              <tr>
                <td><strong>Slide 04</strong></td>
                <td><strong>Introduction &amp; Topic Selection</strong></td>
                <td>Indian Sign Language background and motivation for selecting this project topic</td>
                <td>Chapter 1 (pp. 1–4)</td>
              </tr>
              <tr>
                <td><strong>Slide 05</strong></td>
                <td><strong>Problem Statement &amp; Objectives</strong></td>
                <td>Core communication barriers and 4 project objectives</td>
                <td>Chapter 1 (pp. 5–8)</td>
              </tr>
              <tr>
                <td><strong>Slide 06</strong></td>
                <td><strong>Literature Survey</strong></td>
                <td>Review of existing sign recognition &amp; avatar research papers and limitations</td>
                <td>Chapter 2 (pp. 9–17)</td>
              </tr>
              <tr>
                <td><strong>Slide 07</strong></td>
                <td><strong>System Architecture &amp; Pipeline</strong></td>
                <td>Report architecture diagram (Fig. 5.1) and arrow-connected pipelines</td>
                <td>Chapter 5 (pp. 32–35)</td>
              </tr>
              <tr>
                <td><strong>Slide 08</strong></td>
                <td><strong>Hardware &amp; Software Requirements</strong></td>
                <td>Hardware specifications and full-stack software dependencies</td>
                <td>Chapter 3 (pp. 18–25)</td>
              </tr>
              <tr>
                <td><strong>Slide 09</strong></td>
                <td><strong>Feature Extraction Schema</strong></td>
                <td>147-D hand, facial &amp; motion feature representation and 441-D window pooling</td>
                <td>Chapter 5 (pp. 35–38)</td>
              </tr>
              <tr>
                <td><strong>Slide 10</strong></td>
                <td><strong>Module-Wise Implementation</strong></td>
                <td>Detailed explanation of all 6 modules (What, How &amp; Why) and UI screens</td>
                <td>Chapter 6 (pp. 45–54)</td>
              </tr>
              <tr>
                <td><strong>Slide 11</strong></td>
                <td><strong>Evaluation Parameters &amp; Comparison</strong></td>
                <td>Accuracy, Precision, Recall &amp; F1 definitions and comparison with existing works</td>
                <td>Chapter 7 (pp. 55–59)</td>
              </tr>
              <tr>
                <td><strong>Slide 12</strong></td>
                <td><strong>Results &amp; Named Graphs</strong></td>
                <td>Named evaluation graphs: Accuracy Progression, Calibration, Per-Class F1 &amp; SER</td>
                <td>Chapter 7 (pp. 60–63)</td>
              </tr>
              <tr>
                <td><strong>Slide 13</strong></td>
                <td><strong>Conclusion &amp; Future Work</strong></td>
                <td>Summary of work completed and directions for future enhancements</td>
                <td>Chapter 8 (pp. 64–66)</td>
              </tr>
              <tr class="subhighlight">
                <td><strong>Slide 14</strong></td>
                <td><strong>Research Paper Publication</strong></td>
                <td>IEEE format research paper details and academic/societal importance</td>
                <td>Appendix B (p. 72)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Table of Contents (Presentation Agenda)</span>
      <span>Slide 2 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 3: ABSTRACT                                                     -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-3" data-slide="3">
    <div class="slide-header">
      <div class="slide-badge">Slide 3 / 14</div>
      <div class="slide-header-text">
        <h2>Abstract</h2>
        <p>Executive Summary of the Bidirectional Indian Sign Language and Kannada Translation System</p>
      </div>
      <div class="chapter-pill">Report Abstract (Page iii)</div>
    </div>
    <div class="slide-body">
      <div class="v-card" style="border-color: #2563eb; background: #eff6ff;">
        <div class="v-card-head" style="background: #1e3a8a;">Project Abstract</div>
        <div class="v-card-body" style="font-size: 13px; text-align: justify; line-height: 1.48; gap: 8px;">
          <p>
            Communication between Deaf and Hard-of-Hearing (DHH) citizens who communicate using Indian Sign Language (ISL) and hearing individuals who speak Kannada remains a significant challenge across hospitals, banks, classrooms, and government offices in Karnataka. Existing automated sign language tools largely focus on one-way American Sign Language (ASL) to English translation or depend on specialized wearable gloves and cloud-based raw video processing.
          </p>
          <p>
            This project develops <strong>Silent Bridge</strong>, a browser-executable, bidirectional translation system connecting Indian Sign Language and Kannada. In the forward path (ISL to Kannada), webcam video is processed locally via MediaPipe Holistic to extract a <strong>147-dimensional</strong> scale-invariant anatomical feature vector capturing dual 21-point hand skeletons, facial landmarks, and hand-to-face spatial anchors. A 3-state <strong>Hysteresis Motion Segmenter</strong> isolates continuous sign boundaries, and a hybrid Multilayer Perceptron (MLP) and Bidirectional Gated Recurrent Unit with Connectionist Temporal Classification (<strong>BiGRU-CTC</strong>) model classifies gestures via ONNX Runtime Web to synthesize grammatical Kannada text and speech. In the reverse path (Kannada to ISL), a rule-based Kannada morphological stemmer strips agglutinative suffixes, reorders clauses from Subject–Object–Verb (SOV) to ISL topological order, and drives a 60 FPS Three.js 3D humanoid avatar using a closed-form two-bone <strong>Analytic Inverse Kinematics (IK)</strong> solver with parabolic co-articulation trajectories.
          </p>
        </div>
      </div>

      <div class="grid-3" style="flex: 1;">
        <div class="v-card" style="border-color: #2563eb; background: #ffffff;">
          <div class="v-card-head" style="background: #1d4ed8;">Forward Path (ISL ➔ Kannada)</div>
          <div class="v-card-body">
            <ul>
              <li>30 FPS client-side holistic landmark extraction.</li>
              <li>147-D wrist-centered, shoulder-scaled encoding.</li>
              <li>3-state hysteresis continuous boundary detector.</li>
              <li>Browser ONNX classification &amp; Kannada TTS voice.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #059669; background: #ffffff;">
          <div class="v-card-head" style="background: #047857;">Reverse Path (Kannada ➔ ISL)</div>
          <div class="v-card-body">
            <ul>
              <li>Unicode Kannada text &amp; spoken microphone input.</li>
              <li>3-tier agglutinative suffix stripping rules.</li>
              <li>SOV-to-ISL clause reordering engine.</li>
              <li>60 FPS 2-bone Analytic IK 3D signing avatar.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #7c3aed; background: #ffffff;">
          <div class="v-card-head" style="background: #5b21b6;">Datasets &amp; Evaluation Scope</div>
          <div class="v-card-body">
            <ul>
              <li>Harmonized Amrita-ISLR, INCLUDE &amp; ISL-CSLTR.</li>
              <li>144 sign vocabulary classes &amp; 187 phrases.</li>
              <li>Evaluated on 314 real video streams.</li>
              <li>Includes in-browser Few-Shot custom sign studio.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Abstract</span>
      <span>Slide 3 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 4: INTRODUCTION & WHY WE SELECTED THIS TOPIC                    -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-4" data-slide="4">
    <div class="slide-header">
      <div class="slide-badge">Slide 4 / 14</div>
      <div class="slide-header-text">
        <h2>Introduction &amp; Rationale for Topic Selection</h2>
        <p>Domain Context of Indian Sign Language (ISL) and Motivation for Selecting This Topic</p>
      </div>
      <div class="chapter-pill">Report Ch. 1, Sec. 1.1 (pp. 1–4)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card" style="border-color: #2563eb; background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">1. Domain Introduction: Indian Sign Language (ISL)</div>
          <div class="v-card-body">
            <ul>
              <li><strong>Visual-Spatial Natural Language:</strong> Indian Sign Language (ISL) is a complete visual-gestural language with its own phonological, morphological, and syntactic structure independent of spoken languages.</li>
              <li><strong>Multi-Channel Articulation:</strong> Meaning in ISL is conveyed simultaneously through manual articulators (two-hand configuration, palm orientation, spatial location, and movement trajectory) and non-manual facial markers (eyebrow raise, mouth aperture, and head tilt).</li>
              <li><strong>Structural Divergence from Spoken Kannada:</strong> Spoken and written Kannada is an agglutinative Dravidian language with Subject–Object–Verb (SOV) order and rich case/tense suffixes, whereas ISL uses a Topic–Comment / Temporal-First syntactic structure without inflectional suffixes.</li>
              <li><strong>Demographic Context:</strong> Over 63 million individuals in India experience hearing or speech impairments (WHO / Census), including hundreds of thousands of citizens across Karnataka whose regional civic language is Kannada.</li>
            </ul>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ecfdf5;">
          <div class="v-card-head" style="background: #065f46;">2. Why We Selected This Topic (Motivation)</div>
          <div class="v-card-body">
            <ul>
              <li><strong>Absence of Regional Kannada Sign Tools:</strong> Existing sign language datasets and recognition tools predominantly focus on American Sign Language (ASL) and English, leaving Kannada-speaking doctors, bank clerks, and families without accessible translation tools.</li>
              <li><strong>Critical Need in Healthcare &amp; Public Desks:</strong> During outpatient hospital consultations, banking transactions, and railway inquiries, Deaf citizens struggle to communicate symptoms or requests when human interpreters are unavailable.</li>
              <li><strong>Need for Bidirectional Conversation:</strong> Real-world dialogue requires two-way translation—converting a Deaf person's signs into Kannada speech, and converting the hearing person's Kannada response back into visual sign language.</li>
              <li><strong>Need for Hardware-Free Privacy:</strong> Public service desks and clinics require a solution that operates on standard laptop webcams without expensive sensor gloves or uploading private patient videos to cloud servers.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 1: Introduction &amp; Rationale for Topic Selection</span>
      <span>Slide 4 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 5: PROBLEM STATEMENT & OBJECTIVES (4 OBJECTIVES, NO TARGET MET) -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-5" data-slide="5">
    <div class="slide-header">
      <div class="slide-badge">Slide 5 / 14</div>
      <div class="slide-header-text">
        <h2>Problem Statement &amp; Project Objectives</h2>
        <p>Defining the Core Communication Barriers and Engineering Objectives</p>
      </div>
      <div class="chapter-pill">Report Ch. 1, Sec. 1.2–1.4 (pp. 5–8)</div>
    </div>
    <div class="slide-body">
      <div class="v-card" style="border-color: #dc2626; background: #fef2f2;">
        <div class="v-card-head" style="background: #b91c1c;">Problem Statement (Report Section 1.2)</div>
        <div class="v-card-body" style="font-size: 12.8px; line-height: 1.42;">
          <p style="margin-bottom: 6px;">
            Deaf and Hard-of-Hearing (DHH) citizens in Karnataka face a severe two-way communication barrier when interacting with Kannada-speaking healthcare professionals, educators, and civic counter staff due to:
          </p>
          <ul>
            <li><strong>Acute Scarcity of Certified ISL Interpreters:</strong> With only ~350 certified interpreters nationwide, on-site interpretation is unavailable for everyday hospital triage, banking, and classroom interactions.</li>
            <li><strong>Technical Gaps in Existing Vision Systems:</strong> Current automated sign systems are largely unidirectional (Sign-to-English), sensitive to camera distance and background clutter, prone to false triggers during continuous signing, and lack reverse translation from agglutinative Kannada grammar into smooth 3D sign animation.</li>
          </ul>
        </div>
      </div>

      <div class="v-card" style="border-color: #2563eb; background: #ffffff; flex: 1;">
        <div class="v-card-head" style="background: #1e3a8a;">Project Objectives (Report Section 1.4)</div>
        <div class="v-card-body">
          <div class="grid-2" style="gap: 12px; flex: 1;">
            <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 10px 14px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">
                Objective 1: Scale-Invariant Hand &amp; Face Landmark Extraction
              </div>
              <div style="font-size: 12.2px; color: #0f172a; line-height: 1.38;">
                To design a privacy-preserving, browser-based feature extraction pipeline that captures two-hand skeletal joints and facial grammar landmarks normalized for camera seating distance.
              </div>
            </div>

            <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 10px 14px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">
                Objective 2: Continuous Sign Segmentation &amp; Classification
              </div>
              <div style="font-size: 12.2px; color: #0f172a; line-height: 1.38;">
                To develop a motion-hysteresis segmentation module and hybrid neural classifier capable of recognizing isolated and continuous Indian Sign Language gestures in real time.
              </div>
            </div>

            <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 10px 14px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">
                Objective 3: Kannada SOV Morphological &amp; Grammar Engine
              </div>
              <div style="font-size: 12.2px; color: #0f172a; line-height: 1.38;">
                To construct a bidirectional linguistic engine that synthesizes natural Kannada sentences from recognized ISL glosses and converts Kannada SOV input into ISL word order.
              </div>
            </div>

            <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 10px 14px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">
                Objective 4: 3D Signing Avatar with Analytic Inverse Kinematics
              </div>
              <div style="font-size: 12.2px; color: #0f172a; line-height: 1.38;">
                To implement an interactive 3D humanoid avatar driven by closed-form two-bone inverse kinematics and smooth co-articulation trajectories for Kannada-to-ISL visualization.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 1: Problem Statement &amp; Project Objectives</span>
      <span>Slide 5 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 6: LITERATURE SURVEY (PRIOR WORKS ONLY — NO OUR SOLUTION)       -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-6" data-slide="6">
    <div class="slide-header">
      <div class="slide-badge">Slide 6 / 14</div>
      <div class="slide-header-text">
        <h2>Literature Survey</h2>
        <p>Review of Existing Sign Language Recognition &amp; Avatar Synthesis Research Papers</p>
      </div>
      <div class="chapter-pill">Report Chapter 2 (pp. 9–17)</div>
    </div>
    <div class="slide-body">
      <div class="v-card" style="background: #ffffff; flex: 1;">
        <div class="v-card-head" style="background: #1e3a8a;">Table 2.1: Survey of Existing Research Papers and Identified Limitations</div>
        <div class="v-card-body" style="padding: 8px 12px;">
          <table class="ppt-table">
            <thead>
              <tr>
                <th style="width: 175px;">Author(s) &amp; Year</th>
                <th style="width: 245px;">Methodology / Model Used</th>
                <th style="width: 205px;">Dataset / Modality</th>
                <th>Limitations &amp; Research Gap Identified</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Abhishek et al. (2020)</strong></td>
                <td>Wearable flex &amp; IMU sensor glove with SVM classifier</td>
                <td>Custom 30-sign hardware dataset</td>
                <td>Requires costly wired glove hardware (~Rs. 18,000); cannot capture facial grammar or non-manual expressions.</td>
              </tr>
              <tr>
                <td><strong>Koller et al. (2019)</strong></td>
                <td>Deep CNN + Weakly Supervised HMM on raw RGB video</td>
                <td>RWTH-PHOENIX Weather (DGS)</td>
                <td>High GPU memory requirement; overfits to background lighting and signer clothing on unseen users.</td>
              </tr>
              <tr>
                <td><strong>Sridhar et al. (2020)</strong></td>
                <td>Deep 3D-CNN / BiLSTM over raw video frames</td>
                <td>INCLUDE 263-Sign Isolated ISL Dataset</td>
                <td>Restricted to pre-trimmed isolated clips; lacks continuous stream boundary detection and regional language output.</td>
              </tr>
              <tr>
                <td><strong>Elakkiya &amp; Natarajan (2021)</strong></td>
                <td>Subunit sign modeling with 2D pose keypoints + LSTM</td>
                <td>ISL-CSLTR Sentence Corpus</td>
                <td>Fixed sliding windows cause boundary insertion errors during natural inter-sign pauses.</td>
              </tr>
              <tr>
                <td><strong>Wadhawan &amp; Kumar (2021)</strong></td>
                <td>CNN-based static &amp; dynamic handshape classifier</td>
                <td>35,000 static ISL alphabet/word images</td>
                <td>One-way recognition to English text only; omits non-manual facial cues and reverse sign animation.</td>
              </tr>
              <tr>
                <td><strong>Saunders et al. (2020)</strong></td>
                <td>Progressive Transformers for skeletal pose generation</td>
                <td>PHOENIX14T German Sign Language</td>
                <td>Requires server-grade GPUs and lacks closed-form inverse kinematics, causing mid-sentence arm drops.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 2: Literature Survey</span>
      <span>Slide 6 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 7: SYSTEM ARCHITECTURE (REPORT DIAGRAM) & ARROW PIPELINE        -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-7" data-slide="7">
    <div class="slide-header">
      <div class="slide-badge">Slide 7 / 14</div>
      <div class="slide-header-text">
        <h2>System Architecture &amp; Step-by-Step Pipeline</h2>
        <p>Report System Architecture Diagram (Fig. 5.1) &amp; Arrow-Connected Bidirectional Workflows</p>
      </div>
      <div class="chapter-pill">Report Ch. 5, Sec. 5.1 (pp. 32–35)</div>
    </div>
    <div class="slide-body">
      <div style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; flex: 1;">
        <div class="v-card" style="border-color: #2563eb; background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Figure 5.1: System Architecture Diagram (From Project Report)</div>
          <div class="v-card-body" style="align-items: center; justify-content: center; padding: 6px;">
            ${IMAGES.figArchitecture ? `<img src="${IMAGES.figArchitecture}" alt="Report System Architecture Diagram" style="width: 100%; height: 430px; object-fit: contain;" />` : ""}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
          <div class="v-card" style="border-color: #2563eb; background: #eff6ff; flex: 1;">
            <div class="v-card-head" style="background: #1d4ed8;">Forward Pipeline: ISL Video ➔ Kannada Speech</div>
            <div class="v-card-body" style="padding: 8px 12px;">
              <div class="pipeline-flow">
                <div class="pipe-step">1. Webcam Video Capture (640×480 @ 30 FPS)</div>
                <div class="pipe-arrow">⬇</div>
                <div class="pipe-step">2. MediaPipe Holistic (21×2 Hands + 12 Face Landmarks)</div>
                <div class="pipe-arrow">⬇</div>
                <div class="pipe-step">3. 147-D Shoulder-Scaled Normalization &amp; 3-State Hysteresis Gate</div>
                <div class="pipe-arrow">⬇</div>
                <div class="pipe-step">4. ONNX MLP + BiGRU-CTC Classifier ➔ Kannada SOV Text &amp; TTS</div>
              </div>
            </div>
          </div>

          <div class="v-card" style="border-color: #059669; background: #ecfdf5; flex: 1;">
            <div class="v-card-head" style="background: #047857;">Reverse Pipeline: Kannada Text/Voice ➔ 3D Avatar</div>
            <div class="v-card-body" style="padding: 8px 12px;">
              <div class="pipeline-flow">
                <div class="pipe-step green">1. Kannada Unicode Text or Microphone Speech Dictation</div>
                <div class="pipe-arrow green">⬇</div>
                <div class="pipe-step green">2. Three-Tier Kannada Morphological Suffix Stemmer</div>
                <div class="pipe-arrow green">⬇</div>
                <div class="pipe-step green">3. SOV-to-ISL Topological Clause Reordering Engine</div>
                <div class="pipe-arrow green">⬇</div>
                <div class="pipe-step green">4. 2-Bone Analytic IK Solver ➔ 60 FPS 3D Avatar Sign Animation</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 5: System Architecture &amp; Step-by-Step Pipeline</span>
      <span>Slide 7 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 8: HARDWARE & SOFTWARE REQUIREMENTS                             -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-8" data-slide="8">
    <div class="slide-header">
      <div class="slide-badge">Slide 8 / 14</div>
      <div class="slide-header-text">
        <h2>System Requirements: Hardware &amp; Software</h2>
        <p>Hardware Configuration and Software Stack Used for Implementation</p>
      </div>
      <div class="chapter-pill">Report Chapter 3 (pp. 18–25)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Table 3.1: Hardware Requirements</div>
          <div class="v-card-body" style="padding: 8px 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Minimum Specification</th>
                  <th>Recommended Setup</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Processor (CPU)</strong></td>
                  <td>Dual-Core x86_64 (2.0 GHz)</td>
                  <td>Quad-Core Intel Core i5 / Ryzen 5</td>
                </tr>
                <tr>
                  <td><strong>System Memory</strong></td>
                  <td>4 GB RAM</td>
                  <td>8 GB RAM or higher</td>
                </tr>
                <tr>
                  <td><strong>Camera Input</strong></td>
                  <td>480p / 720p Webcam (30 FPS)</td>
                  <td>720p HD Webcam (640×480 @ 30 FPS)</td>
                </tr>
                <tr>
                  <td><strong>Graphics (GPU)</strong></td>
                  <td>Integrated GPU (WebGL 2.0)</td>
                  <td>Integrated Iris Xe / WebGL 2.0</td>
                </tr>
                <tr>
                  <td><strong>Audio I/O</strong></td>
                  <td>Standard Speakers / Headphones</td>
                  <td>Speakers + Microphone (for ASR)</td>
                </tr>
                <tr>
                  <td><strong>Storage Space</strong></td>
                  <td>250 MB browser cache</td>
                  <td>2 GB SSD (for training corpus)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ffffff;">
          <div class="v-card-head" style="background: #065f46;">Table 3.2: Software Requirements &amp; Technology Stack</div>
          <div class="v-card-body" style="padding: 8px 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Software Layer</th>
                  <th>Technology / Library</th>
                  <th>Role in Implementation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Operating System</strong></td>
                  <td>Windows 10/11, Ubuntu, macOS</td>
                  <td>Cross-platform browser &amp; server host</td>
                </tr>
                <tr>
                  <td><strong>Frontend Framework</strong></td>
                  <td>React 18, TypeScript 5, Vite</td>
                  <td>Interactive studios &amp; state management</td>
                </tr>
                <tr>
                  <td><strong>Landmark Engine</strong></td>
                  <td>MediaPipe Holistic (WASM)</td>
                  <td>30 FPS hand (21×2) &amp; face tracking</td>
                </tr>
                <tr>
                  <td><strong>Browser Inference</strong></td>
                  <td>ONNX Runtime Web (SIMD)</td>
                  <td>Client-side neural model execution</td>
                </tr>
                <tr>
                  <td><strong>3D Rendering</strong></td>
                  <td>Three.js (WebGL 2.0)</td>
                  <td>60 FPS 3D humanoid &amp; Analytic IK</td>
                </tr>
                <tr>
                  <td><strong>Speech Synthesis</strong></td>
                  <td>Web Speech API (<code>kn-IN</code>)</td>
                  <td>Kannada voice TTS &amp; speech dictation</td>
                </tr>
                <tr>
                  <td><strong>Backend &amp; ML</strong></td>
                  <td>Python 3.10+, FastAPI, PyTorch</td>
                  <td>Model training, evaluation &amp; REST API</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 3: Hardware &amp; Software Requirements</span>
      <span>Slide 8 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 9: FEATURE EXTRACTION SCHEMA (147-D & 441-D FEATURES)           -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-9" data-slide="9">
    <div class="slide-header">
      <div class="slide-badge">Slide 9 / 14</div>
      <div class="slide-header-text">
        <h2>Feature Extraction Schema (147-D Hand, Face &amp; Motion)</h2>
        <p>Anatomical Feature Vector Composition (Table 5.1) and Multi-Corpus Dataset Distribution</p>
      </div>
      <div class="chapter-pill">Report Ch. 5, Sec. 5.2 (pp. 35–38)</div>
    </div>
    <div class="slide-body">
      <div style="display: grid; grid-template-columns: 1.32fr 1fr; gap: 14px; flex: 1;">
        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Table 5.1: 147-D Per-Frame &amp; 441-D Window Feature Vector Schema</div>
          <div class="v-card-body" style="padding: 8px 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Feature Block</th>
                  <th>Indices</th>
                  <th>Dims</th>
                  <th>Anatomical Representation &amp; Normalization</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Left Hand Skeleton</strong></td>
                  <td><code>[0 : 63]</code></td>
                  <td>63-D</td>
                  <td>21 joints × (x,y,z), wrist-centered &amp; scaled by shoulder span <i>S<sub>t</sub></i></td>
                </tr>
                <tr>
                  <td><strong>Right Hand Skeleton</strong></td>
                  <td><code>[63 : 126]</code></td>
                  <td>63-D</td>
                  <td>21 joints × (x,y,z), wrist-centered &amp; scaled by shoulder span <i>S<sub>t</sub></i></td>
                </tr>
                <tr>
                  <td><strong>Hand-to-Face Vectors</strong></td>
                  <td><code>[126 : 132]</code></td>
                  <td>6-D</td>
                  <td>3D displacement from Left &amp; Right wrists to nose tip anchor</td>
                </tr>
                <tr>
                  <td><strong>Facial Grammar Cues</strong></td>
                  <td><code>[132 : 143]</code></td>
                  <td>11-D</td>
                  <td>Eyebrow raise, Mouth MAR, Eye EAR, and head pitch/yaw/roll</td>
                </tr>
                <tr>
                  <td><strong>Bimanual &amp; Velocity</strong></td>
                  <td><code>[143 : 147]</code></td>
                  <td>4-D</td>
                  <td>Inter-wrist distance <i>d<sub>LR</sub></i>, hand presence flags &amp; wrist speed</td>
                </tr>
                <tr class="subhighlight">
                  <td><strong>Temporal Pooling</strong></td>
                  <td><code>[0 : 441]</code></td>
                  <td><strong>441-D</strong></td>
                  <td><strong>Mean (μ, 147-D) ⊕ Std Dev (σ, 147-D) ⊕ Velocity (Δ, 147-D)</strong></td>
                </tr>
              </tbody>
            </table>
            <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 7px 10px; font-size: 11.8px; margin-top: 6px;">
              <strong>Why These Features Are Extracted:</strong><br/>
              • <strong>Scale Invariance:</strong> Normalizing by inter-shoulder span <i>S<sub>t</sub></i> keeps feature magnitudes consistent across 0.5m–1.8m seating distances.<br/>
              • <strong>Cranial Disambiguation:</strong> Hand-to-face vectors separate minimal-pair signs sharing identical handshapes near the forehead vs. chin.
            </div>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ffffff;">
          <div class="v-card-head" style="background: #065f46;">Graph: Multi-Corpus Dataset Distribution (Fig. 5.2)</div>
          <div class="v-card-body" style="align-items: center;">
            ${IMAGES.figDatadist ? `<img src="${IMAGES.figDatadist}" alt="Dataset Distribution Chart" style="width: 100%; height: 265px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px;" />` : ""}
            <div style="width: 100%; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 7px 10px; font-size: 11.8px;">
              <strong>Three Harmonized ISL Corpora (Table 3.2):</strong><br/>
              • <strong>Amrita-ISLR:</strong> Clinical &amp; daily isolated vocabulary<br/>
              • <strong>INCLUDE:</strong> Multi-signer lexical categories<br/>
              • <strong>ISL-CSLTR:</strong> Continuous sentence sign streams<br/>
              • <strong>Total:</strong> 144 Sign Classes · 187 Phrases · 314 Video Streams
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 5: Feature Extraction Schema (147-D Hand, Face &amp; Motion)</span>
      <span>Slide 9 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 10: MODULE-WISE IMPLEMENTATION (HOW & WHY FOR ALL MODULES)      -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-10" data-slide="10">
    <div class="slide-header">
      <div class="slide-badge">Slide 10 / 14</div>
      <div class="slide-header-text">
        <h2>Module-Wise Implementation (How &amp; Why)</h2>
        <p>Detailed Explanation of All Six System Modules and Their Functional Implementation</p>
      </div>
      <div class="chapter-pill">Report Chapter 6 (pp. 45–54)</div>
    </div>
    <div class="slide-body">
      <div style="display: grid; grid-template-columns: 1.55fr 1fr; gap: 14px; flex: 1;">
        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Table 6.1: Implementation of All Core System Modules (How &amp; Why)</div>
          <div class="v-card-body" style="padding: 6px 8px;">
            <table class="ppt-table" style="font-size: 11.2px;">
              <thead>
                <tr>
                  <th style="width: 145px;">Module Name</th>
                  <th>HOW It Is Implemented</th>
                  <th>WHY It Is Needed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>1. Holistic Landmark Module</strong></td>
                  <td>Extracts 21 left-hand, 21 right-hand &amp; 12 face points at 30 FPS via MediaPipe WASM.</td>
                  <td>Eliminates background lighting noise and keeps webcam video private on device.</td>
                </tr>
                <tr>
                  <td><strong>2. Hysteresis Motion Segmenter</strong></td>
                  <td>3-state velocity FSM (<code>IDLE ➔ SIGNING ➔ HOLD_PAUSE</code>) with dual velocity gates.</td>
                  <td>Prevents resting hand twitches from triggering false words and isolates strokes.</td>
                </tr>
                <tr>
                  <td><strong>3. Hybrid ONNX Classifier</strong></td>
                  <td>Combines 441-D MLP + BiGRU-CTC temporal decoder exported to ONNX Runtime Web.</td>
                  <td>Captures both static hand postures and temporal motion order in 4.6 ms on CPU.</td>
                </tr>
                <tr>
                  <td><strong>4. Few-Shot Custom Sign Module</strong></td>
                  <td>In-browser Float32 2-layer MLP (<code>441➔96➔C</code>) trained with AdamW &amp; 12× augmentation.</td>
                  <td>Enables users to enroll new regional/medical signs from 3–5 clips in 45 seconds.</td>
                </tr>
                <tr>
                  <td><strong>5. Kannada SOV Grammar Module</strong></td>
                  <td>3-tier suffix stemmer &amp; clause reorderer (<code>[Time ➔ Subj ➔ Obj ➔ Verb ➔ Neg]</code>).</td>
                  <td>Maps agglutinative Kannada grammar to ISL order and synthesizes <code>kn-IN</code> voice.</td>
                </tr>
                <tr>
                  <td><strong>6. 3D Avatar Analytic IK Module</strong></td>
                  <td>Closed-form 2-bone law-of-cosines Shoulder-Elbow-Wrist IK with parabolic arcs.</td>
                  <td>Renders 144 signs at 60 FPS with chest guard and zero mid-sentence arm drops.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
          <div class="v-card" style="border-color: #2563eb; background: #ffffff; flex: 1;">
            <div class="v-card-head" style="background: #1d4ed8;">Fig. 6.1: Live Recognition Studio UI</div>
            <div class="v-card-body" style="padding: 6px; align-items: center; justify-content: center;">
              ${IMAGES.uiLive ? `<img src="${IMAGES.uiLive}" alt="Live Recognition Studio" style="width: 100%; height: 185px; object-fit: contain; border-radius: 4px; background: #0f172a;" />` : ""}
            </div>
          </div>

          <div class="v-card" style="border-color: #059669; background: #ffffff; flex: 1;">
            <div class="v-card-head" style="background: #047857;">Fig. 6.3: 3D Avatar Analytic IK Studio UI</div>
            <div class="v-card-body" style="padding: 6px; align-items: center; justify-content: center;">
              ${IMAGES.uiAvatar ? `<img src="${IMAGES.uiAvatar}" alt="3D Avatar Studio" style="width: 100%; height: 185px; object-fit: contain; border-radius: 4px; background: #0f172a;" />` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 6: Module-Wise Implementation (How &amp; Why)</span>
      <span>Slide 10 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 11: EVALUATION PARAMETERS & COMPARISON WITH EXISTING RESULTS    -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-11" data-slide="11">
    <div class="slide-header">
      <div class="slide-badge">Slide 11 / 14</div>
      <div class="slide-header-text">
        <h2>Evaluation Parameters &amp; Comparison with Existing Works</h2>
        <p>Definitions of Accuracy, Precision, Recall &amp; F1-Score and Comparative Benchmark Table</p>
      </div>
      <div class="chapter-pill">Report Ch. 7, Sec. 7.1–7.3 (pp. 55–59)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Table 7.1: Evaluation Parameters Explained</div>
          <div class="v-card-body" style="padding: 8px 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Formula</th>
                  <th>What It Measures in Sign Recognition</th>
                  <th>Measured</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Top-1 Accuracy</strong></td>
                  <td><code>(TP + TN) / N</code></td>
                  <td>Ratio of test videos where highest-probability gloss matches ground truth</td>
                  <td><strong>81.5%</strong> (All)<br/><strong>76.5%</strong> (Unseen)</td>
                </tr>
                <tr>
                  <td><strong>Precision</strong></td>
                  <td><code>TP / (TP + FP)</code></td>
                  <td>Proportion of predicted signs that are correct (false-trigger resistance)</td>
                  <td><strong>0.818</strong></td>
                </tr>
                <tr>
                  <td><strong>Recall</strong></td>
                  <td><code>TP / (TP + FN)</code></td>
                  <td>Proportion of actual performed signs detected across different signers</td>
                  <td><strong>0.792</strong></td>
                </tr>
                <tr>
                  <td><strong>Macro F1-Score</strong></td>
                  <td><code>2·P·R / (P + R)</code></td>
                  <td>Harmonic mean balancing Precision and Recall across sign classes</td>
                  <td><strong>0.800</strong> (Base)<br/><strong>0.812</strong> (τ*=0.5)</td>
                </tr>
                <tr>
                  <td><strong>Top-3 Accuracy</strong></td>
                  <td><code>Correct in Top-3</code></td>
                  <td>Presence of true sign among top 3 interactive candidate chips</td>
                  <td><strong>94.9%</strong></td>
                </tr>
                <tr>
                  <td><strong>Segment Error (SER)</strong></td>
                  <td><code>(S+D+I) / N_ref</code></td>
                  <td>Edit distance error rate across continuous 5-sign streams</td>
                  <td><strong>12.6%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ffffff;">
          <div class="v-card-head" style="background: #065f46;">Table 7.2: Comparison Between Existing Methods and Proposed Work</div>
          <div class="v-card-body" style="padding: 8px 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Evaluated Method / Model</th>
                  <th>Unseen Acc.</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>Macro F1</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Single-Hand 63-D MLP (Existing)</td>
                  <td>51.2%</td>
                  <td>0.534</td>
                  <td>0.498</td>
                  <td>0.515</td>
                </tr>
                <tr>
                  <td>Two-Hand 126-D Baseline (No Face)</td>
                  <td>54.5%</td>
                  <td>0.589</td>
                  <td>0.560</td>
                  <td>0.574</td>
                </tr>
                <tr>
                  <td>3D-CNN RGB Video Baseline</td>
                  <td>58.4%</td>
                  <td>0.602</td>
                  <td>0.571</td>
                  <td>0.586</td>
                </tr>
                <tr>
                  <td>147-D Hands+Face MLP (No BiGRU)</td>
                  <td>62.9%</td>
                  <td>0.654</td>
                  <td>0.628</td>
                  <td>0.641</td>
                </tr>
                <tr>
                  <td>Sliding-Window LSTM (No Hysteresis)</td>
                  <td>68.5%</td>
                  <td>0.718</td>
                  <td>0.698</td>
                  <td>0.708</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Proposed 147-D + Hysteresis + BiGRU-CTC</strong></td>
                  <td><strong>76.5%</strong></td>
                  <td><strong>0.818</strong></td>
                  <td><strong>0.792</strong></td>
                  <td><strong>0.800</strong></td>
                </tr>
              </tbody>
            </table>
            <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 7px 10px; font-size: 11.6px; margin-top: 6px;">
              <strong>Key Observations from Comparative Testing (Sec. 7.3):</strong><br/>
              • Incorporating 21-D facial and hand-to-face features improved unseen-signer accuracy from 54.5% to 62.9%.<br/>
              • Combining Hysteresis segmentation, BiGRU-CTC temporal modeling, and 5-view TTA recorded <strong>76.5% unseen-signer accuracy</strong> (<strong>81.5% overall</strong> across 314 videos).
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 7: Evaluation Parameters &amp; Comparison with Existing Works</span>
      <span>Slide 11 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 12: EXPERIMENTAL RESULTS & NAMED PERFORMANCE GRAPHS             -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-12" data-slide="12">
    <div class="slide-header">
      <div class="slide-badge">Slide 12 / 14</div>
      <div class="slide-header-text">
        <h2>Experimental Results &amp; Named Performance Graphs</h2>
        <p>Visual Evaluation Plots from Stratified and Unseen-Signer Testing (Report Chapter 7)</p>
      </div>
      <div class="chapter-pill">Report Ch. 7, Sec. 7.3–7.6 (pp. 58–63)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1; gap: 12px;">
        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #1e3a8a;">Graph 1: Top-1 Accuracy Across Feature &amp; Model Stages (Fig. 5.3)</div>
          <div class="v-card-body" style="padding: 6px 10px; align-items: center;">
            ${IMAGES.figResults ? `<img src="${IMAGES.figResults}" alt="Graph 1: Top-1 Accuracy Progression" style="width: 100%; height: 175px; object-fit: contain;" />` : ""}
            <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; text-align: center;">
              Compares All-Split (81.5%), Unseen Signers (76.5%), and INCLUDE Subset (92.7%).
            </div>
          </div>
        </div>

        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #065f46;">Graph 2: Out-of-Fold Confidence Calibration Curve (Fig. 5.4)</div>
          <div class="v-card-body" style="padding: 6px 10px; align-items: center;">
            ${IMAGES.figCalibration ? `<img src="${IMAGES.figCalibration}" alt="Graph 2: Confidence Calibration Curve" style="width: 100%; height: 175px; object-fit: contain;" />` : ""}
            <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; text-align: center;">
              Identifies optimal rejection gate τ* = 0.50 maximizing Macro-F1 (0.812).
            </div>
          </div>
        </div>

        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #5b21b6;">Graph 3: Per-Class F1-Score Distribution Across Signs (Fig. 5.5)</div>
          <div class="v-card-body" style="padding: 6px 10px; align-items: center;">
            ${IMAGES.figPerclass ? `<img src="${IMAGES.figPerclass}" alt="Graph 3: Per-Class F1 Distribution" style="width: 100%; height: 175px; object-fit: contain;" />` : ""}
            <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; text-align: center;">
              Shows per-sign F1-score distribution across evaluated test signs (Mean F1 = 0.800).
            </div>
          </div>
        </div>

        <div class="v-card" style="background: #ffffff;">
          <div class="v-card-head" style="background: #b45309;">Graph 4: Continuous Stream Segment Error Rate (SER) (Fig. 5.6)</div>
          <div class="v-card-body" style="padding: 6px 10px; align-items: center;">
            ${IMAGES.figSegmentation ? `<img src="${IMAGES.figSegmentation}" alt="Graph 4: Continuous Stream SER Comparison" style="width: 100%; height: 175px; object-fit: contain;" />` : ""}
            <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; text-align: center;">
              Hysteresis + BiGRU-CTC reduces continuous 5-sign stream SER from 35.2% to 12.6%.
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 7: Experimental Results &amp; Named Performance Graphs</span>
      <span>Slide 12 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 13: CONCLUSION & FUTURE WORK (DEDICATED SLIDE)                  -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-13" data-slide="13">
    <div class="slide-header">
      <div class="slide-badge">Slide 13 / 14</div>
      <div class="slide-header-text">
        <h2>Conclusion &amp; Future Work</h2>
        <p>Summary of Engineering Work Completed and Scope for Future Extensions</p>
      </div>
      <div class="chapter-pill">Report Chapter 8 (pp. 64–66)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card" style="border-color: #2563eb; background: #eff6ff;">
          <div class="v-card-head" style="background: #1e3a8a;">1. Conclusion (Summary of Work Done — Sec. 8.1)</div>
          <div class="v-card-body">
            <ul>
              <li><strong>Bidirectional Translation Platform Built:</strong> Designed and implemented a browser-executable web application supporting both ISL-to-Kannada recognition and Kannada-to-3D Avatar sign synthesis.</li>
              <li><strong>147-D Anatomical Landmark Extraction:</strong> Implemented local MediaPipe Holistic extraction of 147-D hand and facial features normalized by shoulder span, preserving complete user camera privacy.</li>
              <li><strong>Continuous Segmentation &amp; Hybrid Model:</strong> Integrated a 3-state Hysteresis Motion Segmenter with a 441-D MLP and BiGRU-CTC classifier exported to ONNX Runtime Web (4.6 ms latency).</li>
              <li><strong>Kannada SOV Stemmer &amp; 3D Analytic IK:</strong> Built a rule-based Kannada morphological stemmer, SOV-to-ISL clause reorderer, and a 60 FPS Three.js avatar with parabolic transition arcs.</li>
              <li><strong>Empirical Testing Completed:</strong> Tested across 314 real videos from Amrita-ISLR, INCLUDE, and ISL-CSLTR, recording 81.5% overall Top-1 accuracy and 76.5% on unseen signers.</li>
            </ul>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ecfdf5;">
          <div class="v-card-head" style="background: #065f46;">2. Future Work (Scope for Enhancement — Sec. 8.2)</div>
          <div class="v-card-body">
            <ul>
              <li><strong>Vocabulary Expansion to 1,000+ Signs:</strong> Expand the dataset and active vocabulary to cover specialized medical triage, legal aid, and banking terminology across regional dialects.</li>
              <li><strong>Transformer &amp; Diffusion Avatar Prosody:</strong> Incorporate spatio-temporal Transformer decoders for continuous finger-spelling and diffusion-based facial blendshapes for richer eyebrow and mouthing cues.</li>
              <li><strong>Multi-Language Dravidian Grammar Support:</strong> Extend the agglutinative SOV morphological stemmer and clause reordering rules to support Telugu, Tamil, and Malayalam alongside Kannada.</li>
              <li><strong>Offline Mobile &amp; Rural Kiosk Packaging:</strong> Package the WebAssembly inference pipeline as an offline Progressive Web App (PWA) for low-cost Android tablets in rural primary health centers.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Chapter 8: Conclusion &amp; Future Work</span>
      <span>Slide 13 of 14</span>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- SLIDE 14: RESEARCH PAPER PUBLICATION & ITS IMPORTANCE (FINAL SLIDE)   -->
  <!-- ===================================================================== -->
  <section class="ppt-slide" id="slide-14" data-slide="14">
    <div class="slide-header">
      <div class="slide-badge">Slide 14 / 14</div>
      <div class="slide-header-text">
        <h2>Research Paper Publication &amp; Its Importance</h2>
        <p>Details of the Research Manuscript Prepared from This Project and Its Significance</p>
      </div>
      <div class="chapter-pill">Report Appendix B (Page 72)</div>
    </div>
    <div class="slide-body">
      <div class="v-card" style="border-color: #2563eb; background: #ffffff;">
        <div class="v-card-head" style="background: #1e3a8a;">Research Paper Manuscript Details (Report Appendix B)</div>
        <div class="v-card-body" style="font-size: 12.4px; line-height: 1.42;">
          <ul>
            <li><strong>Paper Title:</strong> <em>“Silent Bridge: Real-Time Bidirectional Indian Sign Language and Kannada Translation with 3D Avatar”</em></li>
            <li><strong>Authors:</strong> H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401), under the guidance of <strong>Prof. Tejaswini K</strong>, Assistant Professor, Department of CSBS, B.M.S. College of Engineering, Bangalore – 560019.</li>
            <li><strong>Manuscript Structure:</strong> Prepared in IEEE Two-Column Research Format (8 Pages · 12 Empirical Tables · 7 Figures · 12 Equations · 3 Algorithms · 25 IEEE References).</li>
          </ul>
        </div>
      </div>

      <div class="grid-2" style="flex: 1; gap: 12px;">
        <div class="v-card" style="border-color: #2563eb; background: #eff6ff;">
          <div class="v-card-head" style="background: #1d4ed8;">1. Benchmark &amp; Scientific Importance</div>
          <div class="v-card-body" style="font-size: 12.2px;">
            Establishes a reproducible 147-D hand-and-facial landmark benchmark across three Indian Sign Language corpora (Amrita-ISLR, INCLUDE, ISL-CSLTR) with strict unseen-signer evaluation protocols.
          </div>
        </div>

        <div class="v-card" style="border-color: #059669; background: #ecfdf5;">
          <div class="v-card-head" style="background: #047857;">2. Regional Kannada Linguistic Importance</div>
          <div class="v-card-body" style="font-size: 12.2px;">
            Documents a formal rule-based morphological stemmer for stripping agglutinative Kannada suffixes and reordering Subject–Object–Verb (SOV) clauses into ISL temporal-first syntax.
          </div>
        </div>

        <div class="v-card" style="border-color: #7c3aed; background: #f5f3ff;">
          <div class="v-card-head" style="background: #5b21b6;">3. Edge-AI &amp; Kinematic Importance</div>
          <div class="v-card-body" style="font-size: 12.2px;">
            Provides a closed-form 2-bone Analytic Inverse Kinematics formulation with parabolic co-articulation and sub-5ms browser WebAssembly inference for ordinary CPU laptops.
          </div>
        </div>

        <div class="v-card" style="border-color: #d97706; background: #fffbeb;">
          <div class="v-card-head" style="background: #b45309;">4. Healthcare Privacy &amp; Societal Importance</div>
          <div class="v-card-body" style="font-size: 12.2px;">
            Enables 100% local camera privacy for hospital triage and public service counters aligned with UN SDGs 3, 4, 8, 9 &amp; 10, reducing counter interpretation cost by 94% (Rs. 16/day).
          </div>
        </div>
      </div>

      <div class="summary-banner">
        THANK YOU! &nbsp;·&nbsp; Team: H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401) &nbsp;·&nbsp; Guide: Prof. Tejaswini K (Dept. of CSBS, BMSCE)
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Appendix B: Research Paper Publication &amp; Its Importance</span>
      <span>Slide 14 of 14</span>
    </div>
  </section>

  <script>
    (function preloadDownloadBlobs() {
      const links = document.querySelectorAll("a[data-preload-url]");
      links.forEach((link) => {
        const url = link.getAttribute("data-preload-url");
        if (!url) return;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof Blob && xhr.response.size > 0) {
            link.href = URL.createObjectURL(xhr.response);
          }
        };
        xhr.send();
      });
    })();
  </script>
</body>
</html>`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const outHtml = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.html");
  fs.writeFileSync(outHtml, html, "utf-8");
  console.log(`[generate-ppt] Wrote ${TOTAL_SLIDES}-slide HTML presentation -> ${outHtml}`);
}

async function main() {
  await generatePptxFile();
  generateHtmlSlides();
}

main().catch((err) => {
  console.error("[generate-ppt] Error:", err);
  process.exit(1);
});
