// Generator for the 10-Slide Widescreen Presentation Deck (.pptx and .html)
// Project: SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR
// Simple terms, clear visuals, everyday conversation problem-solving, zero complex formulas/notations.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const REPORT_DIR = path.join(ROOT_DIR, "frontend", "public", "report");

function toDataUri(relPath, mime = "image/png") {
  const full = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(full)) return "";
  const b64 = fs.readFileSync(full).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export const PPT_METADATA = {
  title:
    "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR",
  college: "B.M.S. COLLEGE OF ENGINEERING, BANGALORE – 560019",
  collegeSub: "(Autonomous Institute Affiliated to VTU, Belagavi)",
  department: "Department of Computer Science and Business Systems (CSBS)",
  academicYear: "2026-2027",
  students: [
    { name: "H S Thanush", usn: "1BM23CB066" },
    { name: "Kiran M K", usn: "1BM23CB068" },
    { name: "Manoj G U", usn: "1BM24CB401" },
  ],
  guide: { name: "Tejaswini K", role: "Assistant Professor & Project Guide, Dept. of CSBS" },
  hod: { name: "Dr. R Ashok Kumar", role: "Professor & Head, Dept. of CSBS" },
  principal: { name: "Dr. Beemsha Arya", role: "Professor & Principal, BMSCE" },
};

const IMAGES = {
  logo: toDataUri("frontend/public/report/bmsce_logo.jpg", "image/jpeg"),
  uiLive: toDataUri("frontend/public/report/fig_ui_live.png", "image/png"),
  uiCustom: toDataUri("frontend/public/report/fig_ui_custom.png", "image/png"),
  uiAvatar: toDataUri("frontend/public/report/fig_ui_avatar.png", "image/png"),
  uiReference: toDataUri("frontend/public/report/fig_ui_reference.png", "image/png"),
  figResults: toDataUri("frontend/public/report/fig_results.png", "image/png"),
  figCalibration: toDataUri("frontend/public/report/fig_calibration.png", "image/png"),
  figArchitecture: toDataUri("frontend/public/report/fig_architecture.png", "image/png"),
};

function addSlideHeaderAndFooter(pptx, slide, slideNum, slideTitle, slideSubtitle) {
  // Top Header Bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.92,
    fill: { color: "0F172A" },
    line: { color: "0F172A", width: 0 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.92,
    w: 13.333,
    h: 0.05,
    fill: { color: "2563EB" },
    line: { color: "2563EB", width: 0 },
  });

  // Slide Number Badge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: 0.18,
    w: 0.95,
    h: 0.54,
    rectRadius: 0.08,
    fill: { color: "1D4ED8" },
    line: { color: "3B82F6", width: 1 },
  });
  slide.addText(`${slideNum} / 10`, {
    x: 0.4,
    y: 0.18,
    w: 0.95,
    h: 0.54,
    fontFace: "Arial",
    fontSize: 13,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
  });

  // Slide Title & Subtitle
  slide.addText(slideTitle, {
    x: 1.5,
    y: 0.12,
    w: 11.4,
    h: 0.44,
    fontFace: "Arial",
    fontSize: 21,
    bold: true,
    color: "FFFFFF",
    valign: "middle",
  });
  slide.addText(slideSubtitle, {
    x: 1.5,
    y: 0.52,
    w: 11.4,
    h: 0.32,
    fontFace: "Arial",
    fontSize: 11.5,
    color: "93C5FD",
    valign: "middle",
  });

  // Footer Bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 7.05,
    w: 13.333,
    h: 0.45,
    fill: { color: "F1F5F9" },
    line: { color: "CBD5E1", width: 0.75 },
  });
  slide.addText("Department of CSBS · B.M.S. College of Engineering, Bangalore", {
    x: 0.45,
    y: 7.08,
    w: 5.5,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: "334155",
    valign: "middle",
  });
  slide.addText("Silent Bridge — Helping People Talk Easily Through Sign Language & Kannada", {
    x: 5.5,
    y: 7.08,
    w: 5.5,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 10,
    italic: true,
    color: "475569",
    align: "center",
    valign: "middle",
  });
  slide.addText(`Slide ${slideNum} of 10`, {
    x: 11.0,
    y: 7.08,
    w: 1.9,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: "0F172A",
    align: "right",
    valign: "middle",
  });
}

async function generatePptxFile() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches (16:9)
  pptx.author = "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)";
  pptx.company = "B.M.S. College of Engineering — Department of CSBS";
  pptx.subject = "B.E. Major Project Presentation (10 Slides)";
  pptx.title = PPT_METADATA.title;

  // =========================================================================
  // SLIDE 1: TITLE SLIDE & SIMPLE 3-STEP CONVERSATION FLOW
  // =========================================================================
  {
    const s = pptx.addSlide();
    s.background = { color: "0F172A" };

    // College Banner
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 0.35,
      w: 12.333,
      h: 0.95,
      fill: { color: "1E293B" },
      line: { color: "334155", width: 1 },
    });
    if (IMAGES.logo) {
      s.addImage({ data: IMAGES.logo, x: 0.7, y: 0.43, w: 0.78, h: 0.78 });
    }
    s.addText(
      "B.M.S. COLLEGE OF ENGINEERING (Autonomous Institute Affiliated to VTU)\nDepartment of Computer Science and Business Systems (CSBS) · Academic Year 2026–2027",
      {
        x: 1.65,
        y: 0.42,
        w: 10.9,
        h: 0.8,
        fontFace: "Arial",
        fontSize: 13.5,
        bold: true,
        color: "E2E8F0",
        valign: "middle",
      }
    );

    // Main Project Title
    s.addText(
      "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR",
      {
        x: 0.6,
        y: 1.55,
        w: 12.133,
        h: 1.15,
        fontFace: "Arial",
        fontSize: 23,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      }
    );

    // Simple 3-Box Visual Flow
    const boxes = [
      {
        x: 0.7,
        title: "1. Person Signs to Camera",
        sub: "Uses ordinary laptop camera\nRecognizes hands & face gestures",
        fill: "1E3A8A",
        border: "60A5FA",
      },
      {
        x: 4.85,
        title: "2. Instant Silent Bridge Translation",
        sub: "Converts gestures to Kannada words\nSpeaks the sentence aloud",
        fill: "065F46",
        border: "34D399",
      },
      {
        x: 9.0,
        title: "3. Friendly 3D Character Signs Back",
        sub: "Type or speak Kannada\n3D Avatar demonstrates the signs",
        fill: "581C87",
        border: "C084FC",
      },
    ];
    for (const b of boxes) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: b.x,
        y: 2.9,
        w: 3.63,
        h: 1.35,
        rectRadius: 0.1,
        fill: { color: b.fill },
        line: { color: b.border, width: 1.5 },
      });
      s.addText(`${b.title}\n${b.sub}`, {
        x: b.x + 0.1,
        y: 2.98,
        w: 3.43,
        h: 1.2,
        fontFace: "Arial",
        fontSize: 13,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });
    }
    s.addText("⇄", {
      x: 4.35,
      y: 3.2,
      w: 0.48,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 26,
      bold: true,
      color: "93C5FD",
      align: "center",
    });
    s.addText("⇄", {
      x: 8.5,
      y: 3.2,
      w: 0.48,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 26,
      bold: true,
      color: "6EE7B7",
      align: "center",
    });

    // Team Card (Sorted in increasing USN order)
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7,
      y: 4.55,
      w: 6.8,
      h: 2.2,
      rectRadius: 0.08,
      fill: { color: "1E293B" },
      line: { color: "475569", width: 1 },
    });
    s.addText(
      "PRESENTED BY (STUDENT USN IN INCREASING ORDER):\n" +
        "•  H S Thanush   —   1BM23CB066\n" +
        "•  Kiran M K       —   1BM23CB068\n" +
        "•  Manoj G U      —   1BM24CB401",
      {
        x: 0.95,
        y: 4.68,
        w: 6.3,
        h: 1.95,
        fontFace: "Arial",
        fontSize: 14.5,
        bold: true,
        color: "F8FAFC",
        valign: "middle",
      }
    );

    // Guide Card
    s.addShape(pptx.ShapeType.roundRect, {
      x: 7.75,
      y: 4.55,
      w: 4.88,
      h: 2.2,
      rectRadius: 0.08,
      fill: { color: "1E293B" },
      line: { color: "475569", width: 1 },
    });
    s.addText(
      "UNDER THE GUIDANCE OF:\n" +
        "Tejaswini K\n" +
        "Assistant Professor, Dept. of CSBS, BMSCE\n\n" +
        "HoD: Dr. R Ashok Kumar  |  Principal: Dr. Beemsha Arya",
      {
        x: 7.95,
        y: 4.68,
        w: 4.5,
        h: 1.95,
        fontFace: "Arial",
        fontSize: 13,
        bold: true,
        color: "93C5FD",
        valign: "middle",
      }
    );

    s.addText("Slide 1 of 10", {
      x: 11.2,
      y: 7.02,
      w: 1.5,
      h: 0.35,
      fontFace: "Arial",
      fontSize: 10.5,
      bold: true,
      color: "94A3B8",
      align: "right",
    });
  }

  // =========================================================================
  // SLIDE 2: EVERYDAY COMMUNICATION CHALLENGES
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      2,
      "Everyday Communication Challenges",
      "Real-Life Situations Where Deaf Citizens and Kannada Speakers Face Difficulties"
    );

    const cards = [
      {
        x: 0.5,
        badge: "AT HOSPITALS & CLINICS",
        highlight: "Describing Symptoms",
        color: "DC2626",
        bg: "FEF2F2",
        points: [
          "Deaf patients often struggle to explain pain or medical history to doctors.",
          "Doctors rarely know sign language and writing on paper is slow and stressful.",
          "Patients need a quick way to sign their symptoms and hear them translated.",
        ],
      },
      {
        x: 4.68,
        badge: "AT BANKS & GOVERNMENT OFFICES",
        highlight: "Public Service Counters",
        color: "D97706",
        bg: "FFFBEB",
        points: [
          "Opening an account, booking tickets, or asking for help requires two-way talk.",
          "Human sign language interpreters are scarce and cost over Rs. 1,500 per visit.",
          "Counter staff need an instant way to understand gestures without waiting.",
        ],
      },
      {
        x: 8.86,
        badge: "AT SCHOOLS & WORKPLACES",
        highlight: "Learning & Teamwork",
        color: "2563EB",
        bg: "EFF6FF",
        points: [
          "Most apps only support English and American signs, ignoring Indian Sign Language.",
          "Students and co-workers in Karnataka speak and read everyday Kannada.",
          "Need a friendly tool that works on standard laptops with complete camera privacy.",
        ],
      },
    ];

    for (const c of cards) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: c.x,
        y: 1.25,
        w: 3.96,
        h: 4.35,
        rectRadius: 0.08,
        fill: { color: c.bg },
        line: { color: c.color, width: 1.5 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: c.x,
        y: 1.25,
        w: 3.96,
        h: 0.55,
        fill: { color: c.color },
      });
      s.addText(c.badge, {
        x: c.x + 0.1,
        y: 1.28,
        w: 3.76,
        h: 0.48,
        fontFace: "Arial",
        fontSize: 12,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });
      s.addText(c.highlight, {
        x: c.x + 0.15,
        y: 1.92,
        w: 3.66,
        h: 0.5,
        fontFace: "Arial",
        fontSize: 15,
        bold: true,
        color: c.color,
        align: "center",
      });
      s.addText(c.points.map((p) => `• ${p}`).join("\n\n"), {
        x: c.x + 0.2,
        y: 2.52,
        w: 3.56,
        h: 2.9,
        fontFace: "Arial",
        fontSize: 12.5,
        color: "1E293B",
        valign: "top",
      });
    }

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 5.82,
      w: 12.33,
      h: 0.98,
      rectRadius: 0.06,
      fill: { color: "0F172A" },
    });
    s.addText(
      "WHAT WE SOLVED: Created a simple, private web app that lets deaf signers and Kannada speakers have natural, continuous, real-time conversations without needing expensive interpreters.",
      {
        x: 0.75,
        y: 5.9,
        w: 11.83,
        h: 0.82,
        fontFace: "Arial",
        fontSize: 13.5,
        bold: true,
        color: "F8FAFC",
        align: "center",
        valign: "middle",
      }
    );
  }

  // =========================================================================
  // SLIDE 3: HOW SILENT BRIDGE CONNECTS PEOPLE
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      3,
      "How Silent Bridge Connects People",
      "Four Practical Features That Make Daily Communication Effortless"
    );

    const pillars = [
      {
        x: 0.55,
        y: 1.25,
        num: "FEATURE 1",
        title: "100% Private Camera Tracking",
        metric: "No Video Ever Leaves Your Computer",
        color: "1D4ED8",
        desc: "Tracks 21 hand points and facial movements directly in your web browser. No recorded video is sent to the internet, keeping hospital and personal visits completely private.",
      },
      {
        x: 6.8,
        y: 1.25,
        num: "FEATURE 2",
        title: "Instant Sign Recognition",
        metric: "Over 81% Accurate on Everyday Signs",
        color: "047857",
        desc: "Recognizes 144 common Indian sign words and continuous sentences. Works reliably even if the person signing has never used the app before.",
      },
      {
        x: 0.55,
        y: 4.1,
        num: "FEATURE 3",
        title: "Natural Kannada Sentences & Voice",
        metric: "Speaks Kannada Out Loud",
        color: "B45309",
        desc: "Arranges signs into polite, correct Kannada sentences and speaks them out loud so hearing doctors, bankers, and family members can immediately listen.",
      },
      {
        x: 6.8,
        y: 4.1,
        num: "FEATURE 4",
        title: "Friendly 3D Animated Character",
        metric: "Smooth Gestures with No Jerky Drops",
        color: "6D28D9",
        desc: "Type or speak Kannada and our 3D avatar signs back with natural arm movements, friendly facial expressions, and adjustable slow-motion playback.",
      },
    ];

    for (const p of pillars) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: p.x,
        y: p.y,
        w: 5.95,
        h: 2.55,
        rectRadius: 0.08,
        fill: { color: "F8FAFC" },
        line: { color: p.color, width: 1.75 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: p.x,
        y: p.y,
        w: 5.95,
        h: 0.52,
        fill: { color: p.color },
      });
      s.addText(`${p.num}: ${p.title}`, {
        x: p.x + 0.15,
        y: p.y + 0.04,
        w: 5.65,
        h: 0.44,
        fontFace: "Arial",
        fontSize: 13.5,
        bold: true,
        color: "FFFFFF",
        valign: "middle",
      });
      s.addText(p.metric, {
        x: p.x + 0.2,
        y: p.y + 0.65,
        w: 5.55,
        h: 0.42,
        fontFace: "Arial",
        fontSize: 14,
        bold: true,
        color: p.color,
      });
      s.addText(p.desc, {
        x: p.x + 0.2,
        y: p.y + 1.15,
        w: 5.55,
        h: 1.25,
        fontFace: "Arial",
        fontSize: 12.5,
        color: "1E293B",
      });
    }
  }

  // =========================================================================
  // SLIDE 4: STEP-BY-STEP CONVERSATION FLOW
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      4,
      "Step-by-Step Conversation Flow",
      "How a Conversation Moves Naturally Between Sign Language and Kannada"
    );

    s.addText("DIRECTION 1: Deaf Signer Speaks to Hearing Person (Sign Language ➔ Kannada Speech)", {
      x: 0.55,
      y: 1.18,
      w: 12.2,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14,
      bold: true,
      color: "1E3A8A",
    });

    const fwdSteps = [
      { title: "1. Camera", sub: "User signs in front\nof laptop webcam" },
      { title: "2. Track Hands", sub: "Detects 21 hand joints\n& facial movement" },
      { title: "3. Sense Gestures", sub: "Spots when a sign\nbegins & ends" },
      { title: "4. Recognize Word", sub: "Matches the sign\nin a split second" },
      { title: "5. Speak Kannada", sub: "Displays Kannada text\n& reads it aloud" },
    ];
    fwdSteps.forEach((st, idx) => {
      const x = 0.55 + idx * 2.48;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.65,
        w: 2.22,
        h: 1.75,
        rectRadius: 0.08,
        fill: { color: "EFF6FF" },
        line: { color: "2563EB", width: 1.5 },
      });
      s.addText(`${st.title}\n\n${st.sub}`, {
        x: x + 0.08,
        y: 1.75,
        w: 2.06,
        h: 1.55,
        fontFace: "Arial",
        fontSize: 12,
        bold: true,
        color: "1E293B",
        align: "center",
        valign: "middle",
      });
      if (idx < 4) {
        s.addText("➔", {
          x: x + 2.23,
          y: 2.25,
          w: 0.24,
          h: 0.5,
          fontFace: "Arial",
          fontSize: 16,
          bold: true,
          color: "2563EB",
          align: "center",
        });
      }
    });

    s.addText("DIRECTION 2: Hearing Person Replies (Kannada Text / Voice ➔ 3D Signing Avatar)", {
      x: 0.55,
      y: 3.72,
      w: 12.2,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14,
      bold: true,
      color: "065F46",
    });

    const revSteps = [
      { title: "1. Input Message", sub: "Doctor or clerk types\nor speaks Kannada" },
      { title: "2. Understand Words", sub: "Finds matching sign\nwords in vocabulary" },
      { title: "3. Clean Grammar", sub: "Removes extra endings\nfor clean sign words" },
      { title: "4. Order Signs", sub: "Arranges words in\nnatural sign sequence" },
      { title: "5. Avatar Signs", sub: "3D character shows\nsmooth gestures" },
    ];
    revSteps.forEach((st, idx) => {
      const x = 0.55 + idx * 2.48;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 4.18,
        w: 2.22,
        h: 1.75,
        rectRadius: 0.08,
        fill: { color: "ECFDF5" },
        line: { color: "059669", width: 1.5 },
      });
      s.addText(`${st.title}\n\n${st.sub}`, {
        x: x + 0.08,
        y: 4.28,
        w: 2.06,
        h: 1.55,
        fontFace: "Arial",
        fontSize: 12,
        bold: true,
        color: "1E293B",
        align: "center",
        valign: "middle",
      });
      if (idx < 4) {
        s.addText("➔", {
          x: x + 2.23,
          y: 4.78,
          w: 0.24,
          h: 0.5,
          fontFace: "Arial",
          fontSize: 16,
          bold: true,
          color: "059669",
          align: "center",
        });
      }
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 6.12,
      w: 12.15,
      h: 0.72,
      rectRadius: 0.06,
      fill: { color: "1E293B" },
    });
    s.addText(
      "Result: A natural two-way conversation where each person communicates in their comfortable language — sign language or Kannada.",
      {
        x: 0.7,
        y: 6.18,
        w: 11.85,
        h: 0.6,
        fontFace: "Arial",
        fontSize: 13,
        bold: true,
        color: "F8FAFC",
        align: "center",
        valign: "middle",
      }
    );
  }

  // =========================================================================
  // SLIDE 5: SAFE & FAST GESTURE RECOGNITION
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      5,
      "Safe & Fast Gesture Recognition",
      "Tracking Points on Hands and Face to Understand Signs in Milliseconds"
    );

    // Left Column: What the Camera Looks At
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 1.25,
      w: 6.1,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "F8FAFC" },
      line: { color: "CBD5E1", width: 1.25 },
    });
    s.addText("What the System Looks For in Each Gesture", {
      x: 0.75,
      y: 1.38,
      w: 5.7,
      h: 0.42,
      fontFace: "Arial",
      fontSize: 15,
      bold: true,
      color: "1E3A8A",
    });

    const blocks = [
      ["Left Hand Joints (21 Points)", "Fingertip and knuckle positions"],
      ["Right Hand Joints (21 Points)", "Two-handed gesture shapes"],
      ["Hand Distance to Face", "Identifies signs near mouth or forehead"],
      ["Facial Expressions", "Eyebrows, mouth shape, and head angle"],
      ["Distance from Camera", "Adjusts automatically whether sitting near or far"],
      ["Complete Sign Summary", "Combines movement and shapes smoothly"],
    ];
    s.addTable(
      [
        [
          { text: "Tracked Body Parts", options: { bold: true, fill: "1E3A8A", color: "FFFFFF" } },
          { text: "What It Tells the System", options: { bold: true, fill: "1E3A8A", color: "FFFFFF" } },
        ],
        ...blocks.map((r, i) => [
          { text: r[0], options: { bold: i === 5, fill: i === 5 ? "DBEAFE" : "FFFFFF" } },
          { text: r[1], options: { fill: i === 5 ? "DBEAFE" : "FFFFFF" } },
        ]),
      ],
      {
        x: 0.75,
        y: 1.9,
        w: 5.7,
        colW: [2.5, 3.2],
        fontFace: "Arial",
        fontSize: 12,
        border: { type: "solid", color: "CBD5E1", pt: 0.75 },
        rowH: 0.56,
      }
    );

    // Right Column: How It Knows When You Start and Finish
    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.9,
      y: 1.25,
      w: 5.88,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "F8FAFC" },
      line: { color: "CBD5E1", width: 1.25 },
    });
    s.addText("How the System Detects Complete Signs", {
      x: 7.1,
      y: 1.38,
      w: 5.48,
      h: 0.42,
      fontFace: "Arial",
      fontSize: 15,
      bold: true,
      color: "065F46",
    });

    const states = [
      {
        title: "STEP 1: Waiting for Hands to Move",
        desc: "Ignores small resting movements so accidental hand twitches do not trigger false words.",
        color: "475569",
      },
      {
        title: "STEP 2: Recording the Sign Motion",
        desc: "Tracks the full continuous hand motion and handles natural brief pauses during compound signs.",
        color: "1D4ED8",
      },
      {
        title: "STEP 3: Translating Confidently",
        desc: "Checks the gesture match. If it is clear and confident, it immediately displays the Kannada word and reads it aloud.",
        color: "047857",
      },
    ];
    states.forEach((st, idx) => {
      const y = 2.0 + idx * 1.52;
      s.addShape(pptx.ShapeType.roundRect, {
        x: 7.15,
        y,
        w: 5.38,
        h: 1.32,
        rectRadius: 0.06,
        fill: { color: "FFFFFF" },
        line: { color: st.color, width: 1.5 },
      });
      s.addText(`${st.title}\n${st.desc}`, {
        x: 7.3,
        y: y + 0.08,
        w: 5.08,
        h: 1.15,
        fontFace: "Arial",
        fontSize: 12,
        bold: false,
        color: "1E293B",
        valign: "middle",
      });
    });
  }

  // =========================================================================
  // SLIDE 6: TALKING 3D CHARACTER FOR KANNADA
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      6,
      "Talking 3D Character for Kannada",
      "Demonstrating Sign Language Naturally with Smooth Arm and Hand Movements"
    );

    // Left: Real-Life Sentence Example
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 1.25,
      w: 6.2,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "F8FAFC" },
      line: { color: "CBD5E1", width: 1.25 },
    });
    s.addText("Real-Life Conversation Example", {
      x: 0.75,
      y: 1.38,
      w: 5.8,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 15,
      bold: true,
      color: "1E3A8A",
    });

    const exSteps = [
      ["1. Kannada Input", "“ನಾನು ನಾಳೆ ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ” (I will go to school tomorrow)"],
      ["2. Word Simplification", "Identifies core words: 'school' (ಶಾಲೆ) and 'go' (ಹೋಗು)"],
      ["3. Natural Sign Order", "[Tomorrow] ➔ [I / Me] ➔ [School] ➔ [Go]"],
      ["4. Smooth 3D Animation", "Avatar moves shoulders, elbows, and wrists gracefully like a human"],
      ["5. Clear Presentation", "Hands move in curved paths rather than dropping suddenly between words"],
    ];
    exSteps.forEach((st, idx) => {
      const y = 1.9 + idx * 0.94;
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.75,
        y,
        w: 5.8,
        h: 0.82,
        rectRadius: 0.05,
        fill: { color: idx === 2 ? "EFF6FF" : "FFFFFF" },
        line: { color: idx === 2 ? "2563EB" : "94A3B8", width: 1 },
      });
      s.addText(`${st[0]}:\n${st[1]}`, {
        x: 0.9,
        y: y + 0.05,
        w: 5.5,
        h: 0.72,
        fontFace: "Arial",
        fontSize: 11.5,
        bold: idx === 2,
        color: "0F172A",
        valign: "middle",
      });
    });

    // Right: 3D Avatar Screenshot
    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.95,
      y: 1.25,
      w: 5.83,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "FFFFFF" },
      line: { color: "CBD5E1", width: 1.25 },
    });
    s.addText("Live Screen: 3D Animated Sign Language Avatar", {
      x: 7.15,
      y: 1.38,
      w: 5.43,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14.5,
      bold: true,
      color: "065F46",
    });
    if (IMAGES.uiAvatar) {
      s.addImage({ data: IMAGES.uiAvatar, x: 7.15, y: 1.88, w: 5.43, h: 3.85 });
    }
    s.addText(
      "Shows 144 sign gestures with slow-motion speed control so learners can practice easily.",
      {
        x: 7.15,
        y: 5.85,
        w: 5.43,
        h: 0.75,
        fontFace: "Arial",
        fontSize: 12,
        italic: true,
        color: "334155",
        align: "center",
      }
    );
  }

  // =========================================================================
  // SLIDE 7: EASY-TO-USE WEBSITE & CUSTOM SIGNS
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      7,
      "Easy-to-Use Website & Custom Signs",
      "Actual Working Screens: Live Camera Translation and Adding Your Own Signs"
    );

    // Left Card: Live Recognition Studio
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 1.25,
      w: 6.0,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "FFFFFF" },
      line: { color: "2563EB", width: 1.5 },
    });
    s.addText("Live Camera Translation Screen", {
      x: 0.75,
      y: 1.38,
      w: 5.6,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14.5,
      bold: true,
      color: "1E3A8A",
    });
    if (IMAGES.uiLive) {
      s.addImage({ data: IMAGES.uiLive, x: 0.75, y: 1.88, w: 5.6, h: 3.75 });
    }
    s.addText(
      "• Live camera feedback shows recognized hand positions.\n• Translates instantly and speaks the full Kannada sentence aloud.",
      {
        x: 0.75,
        y: 5.75,
        w: 5.6,
        h: 0.85,
        fontFace: "Arial",
        fontSize: 12,
        color: "1E293B",
      }
    );

    // Right Card: Custom Sign Studio
    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.78,
      y: 1.25,
      w: 6.0,
      h: 5.5,
      rectRadius: 0.08,
      fill: { color: "FFFFFF" },
      line: { color: "059669", width: 1.5 },
    });
    s.addText("Adding Personal or Workplace Signs", {
      x: 6.98,
      y: 1.38,
      w: 5.6,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14.5,
      bold: true,
      color: "065F46",
    });
    if (IMAGES.uiCustom) {
      s.addImage({ data: IMAGES.uiCustom, x: 6.98, y: 1.88, w: 5.6, h: 3.75 });
    }
    s.addText(
      "• Users can teach the app new custom signs in under 45 seconds.\n• Perfect for workplace jargon, regional dialects, or family names.",
      {
        x: 6.98,
        y: 5.75,
        w: 5.6,
        h: 0.85,
        fontFace: "Arial",
        fontSize: 12,
        color: "1E293B",
      }
    );
  }

  // =========================================================================
  // SLIDE 8: REAL-WORLD TESTING & HIGH ACCURACY
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      8,
      "Real-World Testing & High Accuracy",
      "Tested on Over 300 Real Sign Language Videos Across Different Signers"
    );

    const kpis = [
      { label: "Overall Accuracy", val: "81.5%", sub: "Tested on 314 diverse videos", color: "1D4ED8" },
      { label: "New / Unseen Signers", val: "76.5%", sub: "Reliable for first-time users", color: "047857" },
      { label: "Instant Response Time", val: "Under 5 ms", sub: "Feels instant to users", color: "B45309" },
      { label: "Hardware Needed", val: "Standard PC", sub: "No expensive graphics card needed", color: "6D28D9" },
    ];
    kpis.forEach((k, idx) => {
      const x = 0.55 + idx * 3.12;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.2,
        w: 2.9,
        h: 1.32,
        rectRadius: 0.08,
        fill: { color: "F8FAFC" },
        line: { color: k.color, width: 1.5 },
      });
      s.addText(k.val, {
        x,
        y: 1.26,
        w: 2.9,
        h: 0.55,
        fontFace: "Arial",
        fontSize: 22,
        bold: true,
        color: k.color,
        align: "center",
      });
      s.addText(`${k.label}\n${k.sub}`, {
        x: x + 0.08,
        y: 1.82,
        w: 2.74,
        h: 0.62,
        fontFace: "Arial",
        fontSize: 11,
        bold: true,
        color: "334155",
        align: "center",
      });
    });

    const rows = [
      ["Basic Point Tracking", "59.7%", "54.5%", "Basic shapes only"],
      ["Adding Facial Tracking", "66.0%", "62.9%", "Better distinction for face gestures"],
      ["Sequential Gesture Memory", "72.4%", "68.5%", "Remembers full sign path"],
      ["Training with Natural Variations", "75.7%", "73.2%", "Handles slight hand tilts"],
      ["Multi-Angle Testing", "79.9%", "76.5%", "Adapts to different camera angles"],
      ["Complete 144-Sign Active System", "81.5%", "76.5%", "Best practical everyday performance"],
    ];
    s.addTable(
      [
        [
          { text: "Development Stage", options: { bold: true, fill: "0F172A", color: "FFFFFF" } },
          { text: "All Signs", options: { bold: true, fill: "0F172A", color: "FFFFFF", align: "center" } },
          { text: "New Signers", options: { bold: true, fill: "0F172A", color: "FFFFFF", align: "center" } },
          { text: "Practical Benefit", options: { bold: true, fill: "0F172A", color: "FFFFFF" } },
        ],
        ...rows.map((r, i) => [
          { text: r[0], options: { bold: i >= 4, fill: i === 5 ? "DCFCE7" : "FFFFFF" } },
          { text: r[1], options: { bold: i >= 4, align: "center", fill: i === 5 ? "DCFCE7" : "FFFFFF" } },
          { text: r[2], options: { bold: i >= 4, align: "center", fill: i === 5 ? "DCFCE7" : "FFFFFF" } },
          { text: r[3], options: { bold: i >= 4, fill: i === 5 ? "DCFCE7" : "FFFFFF" } },
        ]),
      ],
      {
        x: 0.55,
        y: 2.75,
        w: 6.75,
        colW: [2.8, 1.0, 1.15, 1.8],
        fontFace: "Arial",
        fontSize: 11,
        border: { type: "solid", color: "CBD5E1", pt: 0.75 },
        rowH: 0.54,
      }
    );

    if (IMAGES.figResults) {
      s.addImage({ data: IMAGES.figResults, x: 7.5, y: 2.75, w: 5.25, h: 3.95 });
    }
  }

  // =========================================================================
  // SLIDE 9: HELPING PEOPLE IN EVERYDAY PLACES
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      9,
      "Helping People in Everyday Places",
      "Making Public Counters, Hospitals, and Classrooms Accessible at Very Low Cost"
    );

    const sdgs = [
      { code: "HEALTHCARE", title: "Hospital Triage", desc: "Private symptom consultation at health clinics", color: "15803D" },
      { code: "EDUCATION", title: "Inclusive Schools", desc: "144-sign interactive visual vocabulary for classrooms", color: "B91C1C" },
      { code: "EMPLOYMENT", title: "Job Inclusion", desc: "Allows deaf team members to communicate freely", color: "9D174D" },
      { code: "AFFORDABLE", title: "Low Equipment Cost", desc: "Runs on normal office laptops without buying new hardware", color: "C2410C" },
      { code: "CIVIC ACCESS", title: "Public Desks", desc: "Easy access at railway counters, banks, and post offices", color: "7E22CE" },
    ];
    sdgs.forEach((g, idx) => {
      const x = 0.55 + idx * 2.48;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.3,
        w: 2.25,
        h: 2.45,
        rectRadius: 0.08,
        fill: { color: "F8FAFC" },
        line: { color: g.color, width: 1.75 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x,
        y: 1.3,
        w: 2.25,
        h: 0.52,
        fill: { color: g.color },
      });
      s.addText(g.code, {
        x,
        y: 1.33,
        w: 2.25,
        h: 0.45,
        fontFace: "Arial",
        fontSize: 13,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      s.addText(`${g.title}\n\n${g.desc}`, {
        x: x + 0.1,
        y: 1.92,
        w: 2.05,
        h: 1.7,
        fontFace: "Arial",
        fontSize: 12,
        bold: true,
        color: "1E293B",
        align: "center",
        valign: "middle",
      });
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 4.05,
      w: 12.18,
      h: 2.7,
      rectRadius: 0.08,
      fill: { color: "EFF6FF" },
      line: { color: "2563EB", width: 1.5 },
    });
    s.addText("Cost Comparison for Public Counters & Clinics", {
      x: 0.8,
      y: 4.18,
      w: 11.6,
      h: 0.42,
      fontFace: "Arial",
      fontSize: 15,
      bold: true,
      color: "1E3A8A",
    });
    s.addText(
      "• Full-Time In-Person Interpreter: Rs. 1,800 per day  (Expensive and hard to find on short notice)\n" +
        "• Remote Video Call Interpreter: Rs. 450 per day  (Requires high-speed internet and raises video privacy issues)\n" +
        "• Silent Bridge Smart Kiosk: Rs. 16 per day  (Works directly on existing counter laptop — 94% Cost Reduction)",
      {
        x: 0.85,
        y: 4.7,
        w: 11.5,
        h: 1.85,
        fontFace: "Arial",
        fontSize: 14,
        bold: true,
        color: "0F172A",
        valign: "middle",
      }
    );
  }

  // =========================================================================
  // SLIDE 10: SUMMARY & WHAT WE PLAN NEXT
  // =========================================================================
  {
    const s = pptx.addSlide();
    addSlideHeaderAndFooter(
      pptx,
      s,
      10,
      "Summary & What We Plan Next",
      "Key Accomplishments and Future Enhancements for Karnataka Communities"
    );

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 1.25,
      w: 5.95,
      h: 4.65,
      rectRadius: 0.08,
      fill: { color: "F0FDF4" },
      line: { color: "16A34A", width: 1.5 },
    });
    s.addText("Key Accomplishments", {
      x: 0.8,
      y: 1.4,
      w: 5.45,
      h: 0.45,
      fontFace: "Arial",
      fontSize: 15.5,
      bold: true,
      color: "15803D",
    });
    s.addText(
      "1. True Two-Way Talking: Translates sign language into Kannada text and voice, and translates Kannada text back into 3D signing.\n\n" +
        "2. High Real-World Reliability: Achieved over 81% accuracy on everyday sign gestures with strong results for first-time users.\n\n" +
        "3. Complete Camera Privacy: Everything runs locally on the user's laptop so private medical or personal videos are never uploaded.\n\n" +
        "4. Practical and Low Cost: Works on standard computers with no special hardware or expensive interpreter fees.",
      {
        x: 0.8,
        y: 1.95,
        w: 5.45,
        h: 3.75,
        fontFace: "Arial",
        fontSize: 12.5,
        color: "0F172A",
        valign: "top",
      }
    );

    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.78,
      y: 1.25,
      w: 5.95,
      h: 4.65,
      rectRadius: 0.08,
      fill: { color: "EFF6FF" },
      line: { color: "2563EB", width: 1.5 },
    });
    s.addText("What We Plan Next", {
      x: 7.03,
      y: 1.4,
      w: 5.45,
      h: 0.45,
      fontFace: "Arial",
      fontSize: 15.5,
      bold: true,
      color: "1D4ED8",
    });
    s.addText(
      "1. Expanding Vocabulary: Growing the sign library from 144 to over 1,000 words across medical, legal, and banking terms.\n\n" +
        "2. More Expressive Avatar: Adding natural eye contact, nodding, and smile animations to make signing feel warm and lively.\n\n" +
        "3. Adding Other South Indian Languages: Expanding the translation system to support Telugu, Tamil, and Malayalam.\n\n" +
        "4. Tablet & Phone App: Building a lightweight tablet version for rural healthcare workers without reliable internet.",
      {
        x: 7.03,
        y: 1.95,
        w: 5.45,
        h: 3.75,
        fontFace: "Arial",
        fontSize: 12.5,
        color: "0F172A",
        valign: "top",
      }
    );

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 6.08,
      w: 12.18,
      h: 0.78,
      rectRadius: 0.06,
      fill: { color: "0F172A" },
    });
    s.addText(
      "THANK YOU!   |   Team: H S Thanush (1BM23CB066) · Kiran M K (1BM23CB068) · Manoj G U (1BM24CB401)   |   Guide: Tejaswini K",
      {
        x: 0.7,
        y: 6.15,
        w: 11.88,
        h: 0.64,
        fontFace: "Arial",
        fontSize: 13,
        bold: true,
        color: "F8FAFC",
        align: "center",
        valign: "middle",
      }
    );
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const outPptx = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx");
  await pptx.writeFile({ fileName: outPptx });
  const stat = fs.statSync(outPptx);
  console.log(`[generate-ppt] Wrote 10-slide PowerPoint .pptx (${stat.size} bytes) -> ${outPptx}`);
}

function generateHtmlSlides() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>10-Slide Presentation — SILENT BRIDGE: Bidirectional ISL &amp; Kannada Translation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1e293b;
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #0f172a;
      padding: 58px 0 40px;
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
      height: 48px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 1000;
      font-size: 13px;
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
      border: none;
      padding: 6px 13px;
      border-radius: 5px;
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .ppt-btn.secondary {
      background: #334155;
      border: 1px solid #475569;
    }
    .ppt-slide {
      width: 1120px;
      height: 630px;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      page-break-after: always;
      break-after: page;
    }
    .ppt-slide.title-slide {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
    }
    .slide-header {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 26px;
      border-bottom: 4px solid #2563eb;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 76px;
      flex-shrink: 0;
    }
    .slide-badge {
      background: #1d4ed8;
      border: 1px solid #60a5fa;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      padding: 6px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .slide-header-text h2 {
      font-size: 23px;
      font-weight: 700;
      line-height: 1.15;
      color: #ffffff;
    }
    .slide-header-text p {
      font-size: 13.5px;
      color: #93c5fd;
      margin-top: 2px;
    }
    .slide-body {
      flex: 1;
      padding: 20px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .slide-footer {
      height: 36px;
      background: #f1f5f9;
      border-top: 1px solid #cbd5e1;
      padding: 0 26px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #334155;
      font-weight: 700;
      flex-shrink: 0;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .grid-5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    .v-card {
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .v-card-head {
      padding: 8px 14px;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
    }
    .v-card-body {
      padding: 12px 15px;
      font-size: 14px;
      line-height: 1.45;
      color: #1e293b;
      flex: 1;
    }
    .v-card-body ul {
      padding-left: 18px;
    }
    .v-card-body li {
      margin-bottom: 7px;
    }
    .flow-row {
      display: grid;
      grid-template-columns: 1fr 26px 1fr 26px 1fr 26px 1fr 26px 1fr;
      align-items: center;
    }
    .flow-box {
      border: 2px solid #2563eb;
      background: #eff6ff;
      border-radius: 8px;
      padding: 12px 10px;
      text-align: center;
      height: 122px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .flow-box.green {
      border-color: #059669;
      background: #ecfdf5;
    }
    .flow-box h4 {
      font-size: 14.5px;
      color: #0f172a;
      margin-bottom: 5px;
    }
    .flow-box p {
      font-size: 12.5px;
      color: #334155;
      line-height: 1.32;
    }
    .flow-arrow {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      color: #2563eb;
    }
    .ppt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .ppt-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 10px;
      text-align: left;
      border: 1px solid #334155;
    }
    .ppt-table td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .ppt-table tr.highlight td {
      background: #dcfce7;
      font-weight: 700;
    }
    .summary-banner {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 20px;
      border-radius: 7px;
      font-size: 14.5px;
      font-weight: 700;
      text-align: center;
      line-height: 1.4;
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
      <strong>B.M.S. College of Engineering — Dept. of CSBS</strong> · 10-Slide Project Presentation Deck (16:9 Widescreen)
    </div>
    <div class="ppt-toolbar-actions">
      <a class="ppt-btn" href="/api/ppt/download-pptx" download="SILENT_BRIDGE_Presentation_10Slides.pptx">⬇ Download PowerPoint (.pptx)</a>
      <a class="ppt-btn secondary" href="/api/ppt/download-pdf" download="SILENT_BRIDGE_Presentation_10Slides.pdf">⬇ Download PDF (10 Slides)</a>
      <button class="ppt-btn secondary" onclick="window.print()">🖨 Print / Save PDF</button>
    </div>
  </div>

  <!-- SLIDE 1: TITLE SLIDE -->
  <section class="ppt-slide title-slide" id="slide-1" data-slide="1">
    <div style="padding: 24px 32px; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
      <div style="display: flex; align-items: center; gap: 18px; background: rgba(30,41,59,0.9); border: 1px solid #475569; padding: 12px 20px; border-radius: 8px;">
        ${IMAGES.logo ? `<img src="${IMAGES.logo}" alt="BMSCE Logo" style="width: 64px; height: 64px; object-fit: contain; border-radius: 6px; background: #fff; padding: 3px;" />` : ""}
        <div>
          <div style="font-size: 19px; font-weight: 700; color: #f8fafc; letter-spacing: 0.3px;">B.M.S. COLLEGE OF ENGINEERING, BANGALORE – 560019</div>
          <div style="font-size: 14px; color: #93c5fd; margin-top: 2px;">(Autonomous Institute Affiliated to VTU) · Department of Computer Science and Business Systems (CSBS)</div>
        </div>
        <div style="margin-left: auto; background: #1d4ed8; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px;">Slide 1 / 10</div>
      </div>

      <div style="text-align: center; padding: 6px 10px;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #60a5fa; font-weight: 700; margin-bottom: 6px;">B.E. Major Project Presentation (2026–2027)</div>
        <h1 class="report-project-title" style="font-size: 27px; font-weight: 700; color: #ffffff; line-height: 1.25;">
          SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR
        </h1>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 44px 1fr 44px 1fr; align-items: center;">
        <div style="background: #1e3a8a; border: 2px solid #60a5fa; border-radius: 8px; padding: 14px; text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: #ffffff;">1. Person Signs to Camera</div>
          <div style="font-size: 13px; color: #dbeafe; margin-top: 4px;">Uses standard laptop camera &amp; tracks gestures privately</div>
        </div>
        <div style="text-align: center; font-size: 26px; font-weight: 700; color: #93c5fd;">⇄</div>
        <div style="background: #065f46; border: 2px solid #34d399; border-radius: 8px; padding: 14px; text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: #ffffff;">2. Instant Translation</div>
          <div style="font-size: 13px; color: #d1fae5; margin-top: 4px;">Understands signs into Kannada words &amp; speaks aloud</div>
        </div>
        <div style="text-align: center; font-size: 26px; font-weight: 700; color: #6ee7b7;">⇄</div>
        <div style="background: #581c87; border: 2px solid #c084fc; border-radius: 8px; padding: 14px; text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: #ffffff;">3. Friendly 3D Character Signs Back</div>
          <div style="font-size: 13px; color: #f3e8ff; margin-top: 4px;">Type or speak Kannada; 3D Avatar demonstrates signs</div>
        </div>
      </div>

      <div class="grid-2" style="gap: 18px;">
        <div style="background: rgba(30,41,59,0.95); border: 1px solid #475569; border-radius: 8px; padding: 14px 20px;">
          <div style="font-size: 13px; font-weight: 700; color: #93c5fd; text-transform: uppercase; margin-bottom: 8px;">Presented By (Student USN in Increasing Order):</div>
          <div style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.6;">
            1. H S Thanush &nbsp;—&nbsp; <span style="color: #60a5fa;">1BM23CB066</span><br/>
            2. Kiran M K &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;—&nbsp; <span style="color: #60a5fa;">1BM23CB068</span><br/>
            3. Manoj G U &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;—&nbsp; <span style="color: #60a5fa;">1BM24CB401</span>
          </div>
        </div>
        <div style="background: rgba(30,41,59,0.95); border: 1px solid #475569; border-radius: 8px; padding: 14px 20px; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 13px; font-weight: 700; color: #93c5fd; text-transform: uppercase; margin-bottom: 6px;">Under the Guidance of:</div>
          <div style="font-size: 18px; font-weight: 700; color: #ffffff;">Tejaswini K</div>
          <div style="font-size: 14px; color: #cbd5e1; margin-bottom: 10px;">Assistant Professor, Department of CSBS, BMSCE</div>
          <div style="font-size: 12.5px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 8px;">
            <strong>HoD:</strong> Dr. R Ashok Kumar &nbsp;|&nbsp; <strong>Principal:</strong> Dr. Beemsha Arya
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SLIDE 2: EVERYDAY COMMUNICATION CHALLENGES -->
  <section class="ppt-slide" id="slide-2" data-slide="2">
    <div class="slide-header">
      <div class="slide-badge">Slide 2 / 10</div>
      <div class="slide-header-text">
        <h2>Everyday Communication Challenges</h2>
        <p>Real-Life Situations Where Deaf Citizens and Kannada Speakers Face Difficulties</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-3" style="flex: 1; margin-bottom: 16px;">
        <div class="v-card" style="border-color: #dc2626; background: #fef2f2;">
          <div class="v-card-head" style="background: #dc2626;">At Hospitals &amp; Clinics</div>
          <div class="v-card-body">
            <div style="font-size: 18px; font-weight: 700; color: #b91c1c; text-align: center; margin-bottom: 10px;">Describing Symptoms Clearly</div>
            <ul>
              <li>Deaf patients struggle to describe pain or health issues to medical staff.</li>
              <li>Doctors rarely know sign language and writing notes on paper is slow and stressful.</li>
              <li>A direct translation tool allows patients to sign comfortably and be understood instantly.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #d97706; background: #fffbeb;">
          <div class="v-card-head" style="background: #d97706;">At Public Service Counters</div>
          <div class="v-card-body">
            <div style="font-size: 18px; font-weight: 700; color: #b45309; text-align: center; margin-bottom: 10px;">Banks &amp; Government Offices</div>
            <ul>
              <li>Tasks like opening bank accounts or buying travel tickets require quick two-way talk.</li>
              <li>Human interpreters are rarely available on-site and booking them costs over Rs. 1,500.</li>
              <li>Counter staff need a friendly digital assistant that speaks Kannada immediately.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #2563eb; background: #eff6ff;">
          <div class="v-card-head" style="background: #2563eb;">At Schools &amp; Workplaces</div>
          <div class="v-card-body">
            <div style="font-size: 18px; font-weight: 700; color: #1d4ed8; text-align: center; margin-bottom: 10px;">Learning &amp; Daily Teamwork</div>
            <ul>
              <li>Existing sign apps focus on English and American signs, ignoring Indian Sign Language.</li>
              <li>People in Karnataka communicate daily in spoken and written Kannada.</li>
              <li>Needed an easy-to-use tool running right on a standard laptop with full privacy.</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="summary-banner">
        What We Solved: Created a private, easy web app that helps deaf signers and Kannada speakers have natural, continuous conversations without needing expensive human interpreters.
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Everyday Communication Challenges</span>
      <span>Slide 2 of 10</span>
    </div>
  </section>

  <!-- SLIDE 3: HOW SILENT BRIDGE CONNECTS PEOPLE -->
  <section class="ppt-slide" id="slide-3" data-slide="3">
    <div class="slide-header">
      <div class="slide-badge">Slide 3 / 10</div>
      <div class="slide-header-text">
        <h2>How Silent Bridge Connects People</h2>
        <p>Four Practical Features That Make Daily Communication Effortless</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1; gap: 18px;">
        <div class="v-card" style="border-color: #1d4ed8;">
          <div class="v-card-head" style="background: #1d4ed8;">Feature 1: 100% Private Camera Tracking</div>
          <div class="v-card-body">
            <div style="font-size: 16px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px;">No Video Ever Leaves Your Computer</div>
            <ul>
              <li>Tracks 21 hand points and face movements directly inside your web browser.</li>
              <li>No recorded video is sent to the internet, keeping hospital and personal visits completely private.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #047857;">
          <div class="v-card-head" style="background: #047857;">Feature 2: Instant Sign Recognition</div>
          <div class="v-card-body">
            <div style="font-size: 16px; font-weight: 700; color: #047857; margin-bottom: 6px;">Over 81% Accurate on Everyday Signs</div>
            <ul>
              <li>Recognizes 144 common Indian sign words and complete everyday sentences.</li>
              <li>Works reliably even if the person signing has never practiced on the app before.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #b45309;">
          <div class="v-card-head" style="background: #b45309;">Feature 3: Natural Kannada Sentences &amp; Voice</div>
          <div class="v-card-body">
            <div style="font-size: 16px; font-weight: 700; color: #b45309; margin-bottom: 6px;">Speaks Kannada Out Loud</div>
            <ul>
              <li>Arranges words into polite, natural Kannada sentences instead of broken word-by-word lists.</li>
              <li>Speaks the sentence aloud so doctors, clerks, and family members can immediately listen.</li>
            </ul>
          </div>
        </div>
        <div class="v-card" style="border-color: #6d28d9;">
          <div class="v-card-head" style="background: #6d28d9;">Feature 4: Friendly 3D Animated Character</div>
          <div class="v-card-body">
            <div style="font-size: 16px; font-weight: 700; color: #6d28d9; margin-bottom: 6px;">Smooth Gestures with No Jerky Drops</div>
            <ul>
              <li>Type or speak Kannada, and the 3D character demonstrates clear sign language gestures.</li>
              <li>Includes slow-motion speed control so beginners can easily practice and learn.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — How Silent Bridge Connects People</span>
      <span>Slide 3 of 10</span>
    </div>
  </section>

  <!-- SLIDE 4: STEP-BY-STEP CONVERSATION FLOW -->
  <section class="ppt-slide" id="slide-4" data-slide="4">
    <div class="slide-header">
      <div class="slide-badge">Slide 4 / 10</div>
      <div class="slide-header-text">
        <h2>Step-by-Step Conversation Flow</h2>
        <p>How a Conversation Moves Naturally Between Sign Language and Kannada</p>
      </div>
    </div>
    <div class="slide-body">
      <div>
        <div style="font-size: 15px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;">
          DIRECTION 1: Deaf Signer Speaks to Hearing Person (Sign Language ➔ Kannada Speech)
        </div>
        <div class="flow-row">
          <div class="flow-box">
            <h4>1. Camera</h4>
            <p>User signs in front of laptop webcam</p>
          </div>
          <div class="flow-arrow">➔</div>
          <div class="flow-box">
            <h4>2. Track Hands</h4>
            <p>Detects 21 hand joints &amp; facial movement</p>
          </div>
          <div class="flow-arrow">➔</div>
          <div class="flow-box">
            <h4>3. Sense Gestures</h4>
            <p>Spots when a sign begins &amp; ends</p>
          </div>
          <div class="flow-arrow">➔</div>
          <div class="flow-box">
            <h4>4. Recognize Word</h4>
            <p>Matches the sign in a split second</p>
          </div>
          <div class="flow-arrow">➔</div>
          <div class="flow-box">
            <h4>5. Speak Kannada</h4>
            <p>Displays Kannada text &amp; reads it aloud</p>
          </div>
        </div>
      </div>

      <div>
        <div style="font-size: 15px; font-weight: 700; color: #065f46; margin-bottom: 8px;">
          DIRECTION 2: Hearing Person Replies (Kannada Text / Voice ➔ 3D Signing Avatar)
        </div>
        <div class="flow-row">
          <div class="flow-box green">
            <h4>1. Input Message</h4>
            <p>Doctor or clerk types or speaks Kannada</p>
          </div>
          <div class="flow-arrow" style="color:#059669;">➔</div>
          <div class="flow-box green">
            <h4>2. Understand Words</h4>
            <p>Finds matching sign words in vocabulary</p>
          </div>
          <div class="flow-arrow" style="color:#059669;">➔</div>
          <div class="flow-box green">
            <h4>3. Clean Grammar</h4>
            <p>Removes extra endings for clean signs</p>
          </div>
          <div class="flow-arrow" style="color:#059669;">➔</div>
          <div class="flow-box green">
            <h4>4. Order Signs</h4>
            <p>Arranges words in natural sign order</p>
          </div>
          <div class="flow-arrow" style="color:#059669;">➔</div>
          <div class="flow-box green">
            <h4>5. Avatar Signs</h4>
            <p>3D character shows smooth gestures</p>
          </div>
        </div>
      </div>

      <div class="summary-banner">
        Result: A natural two-way conversation where each person communicates in their comfortable language — sign language or Kannada.
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Step-by-Step Conversation Flow</span>
      <span>Slide 4 of 10</span>
    </div>
  </section>

  <!-- SLIDE 5: SAFE & FAST GESTURE RECOGNITION -->
  <section class="ppt-slide" id="slide-5" data-slide="5">
    <div class="slide-header">
      <div class="slide-badge">Slide 5 / 10</div>
      <div class="slide-header-text">
        <h2>Safe &amp; Fast Gesture Recognition</h2>
        <p>Tracking Points on Hands and Face to Understand Signs in Milliseconds</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card">
          <div class="v-card-head" style="background: #1e3a8a;">What the System Looks For in Each Gesture</div>
          <div class="v-card-body" style="padding: 10px;">
            <table class="ppt-table">
              <thead>
                <tr>
                  <th>Tracked Body Parts</th>
                  <th>What It Tells the System</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Left Hand Joints (21 Points)</strong></td>
                  <td>Fingertip and knuckle positions</td>
                </tr>
                <tr>
                  <td><strong>Right Hand Joints (21 Points)</strong></td>
                  <td>Two-handed gesture shapes</td>
                </tr>
                <tr>
                  <td><strong>Hand Distance to Face</strong></td>
                  <td>Identifies signs near mouth, chin, or forehead</td>
                </tr>
                <tr>
                  <td><strong>Facial Expressions</strong></td>
                  <td>Eyebrows, mouth shape, and head angle</td>
                </tr>
                <tr>
                  <td><strong>Distance from Camera</strong></td>
                  <td>Adjusts automatically whether sitting near or far</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Complete Sign Summary</strong></td>
                  <td><strong>Combines movement and shapes smoothly</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="v-card">
          <div class="v-card-head" style="background: #065f46;">How the System Detects Complete Signs</div>
          <div class="v-card-body" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div style="border: 1.5px solid #475569; background: #ffffff; border-radius: 6px; padding: 10px 12px;">
              <strong style="color: #0f172a;">Step 1 — Waiting for Hands to Move:</strong>
              <p style="font-size: 13px; margin-top: 3px;">Ignores small resting movements so accidental hand twitches do not trigger false words.</p>
            </div>
            <div style="border: 1.5px solid #1d4ed8; background: #eff6ff; border-radius: 6px; padding: 10px 12px;">
              <strong style="color: #1e3a8a;">Step 2 — Recording the Sign Motion:</strong>
              <p style="font-size: 13px; margin-top: 3px;">Tracks the full continuous hand motion and handles natural brief pauses during compound signs.</p>
            </div>
            <div style="border: 1.5px solid #047857; background: #ecfdf5; border-radius: 6px; padding: 10px 12px;">
              <strong style="color: #065f46;">Step 3 — Translating Confidently:</strong>
              <p style="font-size: 13px; margin-top: 3px;">Checks the gesture match. If it is clear and confident, it immediately displays the Kannada word and reads it aloud.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Safe &amp; Fast Gesture Recognition</span>
      <span>Slide 5 of 10</span>
    </div>
  </section>

  <!-- SLIDE 6: TALKING 3D CHARACTER FOR KANNADA -->
  <section class="ppt-slide" id="slide-6" data-slide="6">
    <div class="slide-header">
      <div class="slide-badge">Slide 6 / 10</div>
      <div class="slide-header-text">
        <h2>Talking 3D Character for Kannada</h2>
        <p>Demonstrating Sign Language Naturally with Smooth Arm and Hand Movements</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card">
          <div class="v-card-head" style="background: #1e3a8a;">Real-Life Conversation Example</div>
          <div class="v-card-body" style="display: flex; flex-direction: column; justify-content: space-between; font-size: 13.5px;">
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">
              <strong>1. Kannada Input:</strong><br/>
              <span style="color: #1d4ed8; font-weight: 700;">“ನಾನು ನಾಳೆ ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ”</span> <em>(I will go to school tomorrow)</em>
            </div>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">
              <strong>2. Word Simplification:</strong><br/>
              Identifies core words: 'school' (ಶಾಲೆ) and 'go' (ಹೋಗು)
            </div>
            <div style="background: #eff6ff; border: 1.5px solid #2563eb; border-radius: 6px; padding: 8px 12px;">
              <strong>3. Natural Sign Order:</strong><br/>
              <code>[Tomorrow]</code> ➔ <code>[I / Me]</code> ➔ <code>[School]</code> ➔ <code>[Go]</code>
            </div>
            <div style="background: #ecfdf5; border: 1.5px solid #059669; border-radius: 6px; padding: 8px 12px;">
              <strong>4. Smooth 3D Animation:</strong><br/>
              Avatar moves shoulders, elbows, and wrists gracefully like a human signer.
            </div>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">
              <strong>5. Clear Presentation:</strong><br/>
              Hands move in curved paths rather than dropping suddenly between words.
            </div>
          </div>
        </div>

        <div class="v-card">
          <div class="v-card-head" style="background: #065f46;">Live Screen: 3D Animated Sign Language Avatar</div>
          <div class="v-card-body" style="display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
            ${IMAGES.uiAvatar ? `<img src="${IMAGES.uiAvatar}" alt="Kannada to Sign 3D Avatar Studio" style="width: 100%; height: 315px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px; background: #0f172a;" />` : ""}
            <p style="font-size: 12.5px; text-align: center; color: #334155;">
              Shows 144 sign gestures with slow-motion speed control so learners can practice easily.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Talking 3D Character for Kannada</span>
      <span>Slide 6 of 10</span>
    </div>
  </section>

  <!-- SLIDE 7: ACTUAL WEBSITE WORKFLOW -->
  <section class="ppt-slide" id="slide-7" data-slide="7">
    <div class="slide-header">
      <div class="slide-badge">Slide 7 / 10</div>
      <div class="slide-header-text">
        <h2>Easy-to-Use Website &amp; Custom Signs</h2>
        <p>Actual Working Screens: Live Camera Translation and Adding Your Own Signs</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1;">
        <div class="v-card" style="border-color: #2563eb;">
          <div class="v-card-head" style="background: #1d4ed8;">Live Camera Translation Screen</div>
          <div class="v-card-body" style="display: flex; flex-direction: column; justify-content: space-between;">
            ${IMAGES.uiLive ? `<img src="${IMAGES.uiLive}" alt="Live ISL Recognition Studio" style="width: 100%; height: 295px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px; background: #0f172a;" />` : ""}
            <ul style="font-size: 13px; margin-top: 8px;">
              <li><strong>Live Camera Feedback:</strong> Shows recognized hand positions in real time.</li>
              <li><strong>Instant Voice:</strong> Translates gestures into written Kannada and reads it out loud.</li>
            </ul>
          </div>
        </div>

        <div class="v-card" style="border-color: #059669;">
          <div class="v-card-head" style="background: #047857;">Adding Personal or Workplace Signs</div>
          <div class="v-card-body" style="display: flex; flex-direction: column; justify-content: space-between;">
            ${IMAGES.uiCustom ? `<img src="${IMAGES.uiCustom}" alt="Custom Signs Studio" style="width: 100%; height: 295px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px; background: #0f172a;" />` : ""}
            <ul style="font-size: 13px; margin-top: 8px;">
              <li><strong>Quick Enrollment:</strong> Teach the app new custom signs in under 45 seconds.</li>
              <li><strong>Personalized Use:</strong> Great for local terms, family names, or specific workplace tasks.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Easy-to-Use Website &amp; Custom Signs</span>
      <span>Slide 7 of 10</span>
    </div>
  </section>

  <!-- SLIDE 8: REAL-WORLD TESTING & HIGH ACCURACY -->
  <section class="ppt-slide" id="slide-8" data-slide="8">
    <div class="slide-header">
      <div class="slide-badge">Slide 8 / 10</div>
      <div class="slide-header-text">
        <h2>Real-World Testing &amp; High Accuracy</h2>
        <p>Tested on Over 300 Real Sign Language Videos Across Different Signers</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-4" style="margin-bottom: 14px;">
        <div style="border: 2px solid #1d4ed8; background: #eff6ff; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #1d4ed8;">81.5%</div>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">Overall Accuracy (Tested on 314 diverse videos)</div>
        </div>
        <div style="border: 2px solid #047857; background: #ecfdf5; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #047857;">76.5%</div>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">New / Unseen Signers (Reliable for first-time users)</div>
        </div>
        <div style="border: 2px solid #b45309; background: #fffbeb; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #b45309;">Under 5 ms</div>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">Response Time (Feels instant to users)</div>
        </div>
        <div style="border: 2px solid #6d28d9; background: #f5f3ff; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #6d28d9;">Standard PC</div>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">No expensive graphics card needed</div>
        </div>
      </div>

      <div class="grid-2" style="flex: 1; align-items: stretch;">
        <div>
          <table class="ppt-table">
            <thead>
              <tr>
                <th>Development Stage</th>
                <th>All Signs</th>
                <th>New Signers</th>
                <th>Practical Benefit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Point Tracking</td>
                <td>59.7%</td>
                <td>54.5%</td>
                <td>Basic shapes only</td>
              </tr>
              <tr>
                <td>Adding Facial Tracking</td>
                <td>66.0%</td>
                <td>62.9%</td>
                <td>Better distinction for face gestures</td>
              </tr>
              <tr>
                <td>Sequential Gesture Memory</td>
                <td>72.4%</td>
                <td>68.5%</td>
                <td>Remembers full sign path</td>
              </tr>
              <tr>
                <td>Natural Variations Training</td>
                <td>75.7%</td>
                <td>73.2%</td>
                <td>Handles slight hand tilts</td>
              </tr>
              <tr>
                <td><strong>Multi-Angle Testing</strong></td>
                <td><strong>79.9%</strong></td>
                <td><strong>76.5%</strong></td>
                <td><strong>Adapts to camera angles</strong></td>
              </tr>
              <tr class="highlight">
                <td><strong>Complete 144-Sign Active System</strong></td>
                <td><strong>81.5%</strong></td>
                <td><strong>76.5%</strong></td>
                <td><strong>Best practical performance</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #ffffff;">
          ${IMAGES.figResults ? `<img src="${IMAGES.figResults}" alt="Accuracy Progression Chart" style="width: 100%; height: 290px; object-fit: contain;" />` : ""}
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Real-World Testing &amp; High Accuracy</span>
      <span>Slide 8 of 10</span>
    </div>
  </section>

  <!-- SLIDE 9: HELPING PEOPLE IN EVERYDAY PLACES -->
  <section class="ppt-slide" id="slide-9" data-slide="9">
    <div class="slide-header">
      <div class="slide-badge">Slide 9 / 10</div>
      <div class="slide-header-text">
        <h2>Helping People in Everyday Places</h2>
        <p>Making Public Counters, Hospitals, and Classrooms Accessible at Very Low Cost</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-5" style="margin-bottom: 18px;">
        <div class="v-card" style="border-color: #15803d;">
          <div class="v-card-head" style="background: #15803d;">Healthcare</div>
          <div class="v-card-body" style="text-align: center; font-size: 13px;">
            <strong>Hospital Triage</strong><br/><br/>Private symptom consultation at health clinics without webcam recording.
          </div>
        </div>
        <div class="v-card" style="border-color: #b91c1c;">
          <div class="v-card-head" style="background: #b91c1c;">Education</div>
          <div class="v-card-body" style="text-align: center; font-size: 13px;">
            <strong>Inclusive Schools</strong><br/><br/>144-sign interactive visual vocabulary for teachers and students.
          </div>
        </div>
        <div class="v-card" style="border-color: #9d174d;">
          <div class="v-card-head" style="background: #9d174d;">Employment</div>
          <div class="v-card-body" style="text-align: center; font-size: 13px;">
            <strong>Job Inclusion</strong><br/><br/>Allows deaf team members to communicate freely during daily teamwork.
          </div>
        </div>
        <div class="v-card" style="border-color: #c2410c;">
          <div class="v-card-head" style="background: #c2410c;">Affordable</div>
          <div class="v-card-body" style="text-align: center; font-size: 13px;">
            <strong>Low Equipment Cost</strong><br/><br/>Runs on ordinary office laptops without buying expensive hardware.
          </div>
        </div>
        <div class="v-card" style="border-color: #7e22ce;">
          <div class="v-card-head" style="background: #7e22ce;">Civic Access</div>
          <div class="v-card-body" style="text-align: center; font-size: 13px;">
            <strong>Public Desks</strong><br/><br/>Easy access at railway counters, banks, and post offices.
          </div>
        </div>
      </div>

      <div class="v-card" style="border-color: #2563eb; background: #eff6ff; flex: 1;">
        <div class="v-card-head" style="background: #1e3a8a;">Cost Comparison for Public Counters &amp; Clinics</div>
        <div class="v-card-body" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: center; text-align: center;">
          <div style="background: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; padding: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: #dc2626;">In-Person Human Interpreter</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 4px 0;">Rs. 1,800 / day</div>
            <div style="font-size: 12px; color: #475569;">Expensive and hard to book on short notice</div>
          </div>
          <div style="background: #ffffff; border: 1.5px solid #d97706; border-radius: 8px; padding: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: #d97706;">Remote Video Call Callout</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 4px 0;">Rs. 450 / day</div>
            <div style="font-size: 12px; color: #475569;">Requires high-speed internet and raises video privacy issues</div>
          </div>
          <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: #15803d;">Silent Bridge Smart Kiosk</div>
            <div style="font-size: 22px; font-weight: 700; color: #15803d; margin: 4px 0;">Rs. 16 / day</div>
            <div style="font-size: 12px; font-weight: 700; color: #065f46;">Works on existing laptop — 94% Cost Reduction</div>
          </div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Helping People in Everyday Places</span>
      <span>Slide 9 of 10</span>
    </div>
  </section>

  <!-- SLIDE 10: SUMMARY & WHAT WE PLAN NEXT -->
  <section class="ppt-slide" id="slide-10" data-slide="10">
    <div class="slide-header">
      <div class="slide-badge">Slide 10 / 10</div>
      <div class="slide-header-text">
        <h2>Summary &amp; What We Plan Next</h2>
        <p>Key Accomplishments and Future Enhancements for Karnataka Communities</p>
      </div>
    </div>
    <div class="slide-body">
      <div class="grid-2" style="flex: 1; margin-bottom: 16px;">
        <div class="v-card" style="border-color: #16a34a; background: #f0fdf4;">
          <div class="v-card-head" style="background: #15803d;">Key Accomplishments</div>
          <div class="v-card-body">
            <ul>
              <li><strong>True Two-Way Talking:</strong> Translates sign language into Kannada text and voice, and translates Kannada text back into 3D signing.</li>
              <li><strong>High Real-World Reliability:</strong> Achieved over <strong>81% accuracy</strong> on everyday sign gestures with strong results for first-time users.</li>
              <li><strong>Complete Camera Privacy:</strong> Everything runs locally on the user's laptop so private medical or personal videos are never uploaded.</li>
              <li><strong>Practical and Low Cost:</strong> Works on standard computers with no special hardware or expensive interpreter fees.</li>
            </ul>
          </div>
        </div>

        <div class="v-card" style="border-color: #2563eb; background: #eff6ff;">
          <div class="v-card-head" style="background: #1d4ed8;">What We Plan Next</div>
          <div class="v-card-body">
            <ul>
              <li><strong>Expanding Vocabulary:</strong> Growing the sign library from 144 to over 1,000 words across medical, legal, and banking terms.</li>
              <li><strong>More Expressive Avatar:</strong> Adding natural eye contact, nodding, and smile animations to make signing feel warm and lively.</li>
              <li><strong>Adding Other South Indian Languages:</strong> Expanding the translation system to support Telugu, Tamil, and Malayalam.</li>
              <li><strong>Tablet &amp; Phone App:</strong> Building a lightweight tablet version for rural healthcare workers without reliable internet.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="summary-banner">
        THANK YOU! &nbsp;·&nbsp; Team: H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401) &nbsp;·&nbsp; Guide: Tejaswini K (Dept. of CSBS, BMSCE)
      </div>
    </div>
    <div class="slide-footer">
      <span>Department of CSBS · B.M.S. College of Engineering</span>
      <span>Silent Bridge — Summary &amp; What We Plan Next</span>
      <span>Slide 10 of 10</span>
    </div>
  </section>
</body>
</html>`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const outHtml = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.html");
  fs.writeFileSync(outHtml, html, "utf-8");
  console.log(`[generate-ppt] Wrote 10-slide HTML presentation -> ${outHtml}`);
}

async function main() {
  await generatePptxFile();
  generateHtmlSlides();
}

main().catch((err) => {
  console.error("[generate-ppt] Error:", err);
  process.exit(1);
});
