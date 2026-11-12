#!/usr/bin/env node
/**
 * Generates 100% ECMA-376 / Microsoft Word compliant .docx files using the official `docx` library:
 * 1. frontend/public/report/CSBS_BE_Project_Report_Kannada_SignBridge.docx
 * 2. frontend/public/report/SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.docx
 * 3. frontend/public/report/SILENT_BRIDGE_IEEE_Research_Paper.docx
 * 4. docs/paper/kannada_signbridge_ieee.docx
 *
 * Layout & Formatting Rules (CSBS B.E. Project Report):
 * - 100% Times New Roman across all text, headings, tables, equations, headers, and footers.
 * - Section 1 (Unnumbered Title & Certificate Pages: Cover, Inner Title, College Certificate, Publication Certificate):
 *   No Roman numbers, no headers, no footers; each on its own separate page.
 * - Section 2 (Preliminary Pages i–ix: Declaration, Acknowledgement, Abstract, TOC, List of Figures, List of Tables, Abbreviations, Symbols):
 *   Each content before Table of Contents on its own separate page; Roman numerals on Left of footer, "Department of CSBS" on Right of footer.
 * - Section 3 (Main Chapters 1–8 + References + Publications + Appendix, Arabic Pages 1–66):
 *   - Chapter number ("CHAPTER 1", "CHAPTER 2", ...) right-aligned on the right side of the paper (16pt bold).
 *   - Chapter title centered (18pt bold).
 *   - Running Header: Right-aligned Project Title only (no chapter name on left side of header).
 *   - Running Footer: Page number on Left side, "Department of CSBS" on Right side.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LineRuleType,
  NumberFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "frontend", "public", "report");
const DOCS_PAPER_DIR = path.join(ROOT, "docs", "paper");
const DOCX_MEDIA_DIR = path.join(REPORT_DIR, "docx_media");

const TITLE =
  "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
  middot: "·",
  times: "×",
  divide: "÷",
  plusmn: "±",
  minus: "−",
  le: "≤",
  ge: "≥",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "∼",
  propto: "∝",
  infin: "∞",
  radic: "√",
  sum: "∑",
  prod: "∏",
  int: "∫",
  part: "∂",
  nabla: "∇",
  isin: "∈",
  notin: "∉",
  ni: "∋",
  sub: "⊂",
  sup: "⊃",
  sube: "⊆",
  supe: "⊇",
  cap: "∩",
  cup: "∪",
  empty: "∅",
  forall: "∀",
  exist: "∃",
  rarr: "→",
  larr: "←",
  harr: "↔",
  uarr: "↑",
  darr: "↓",
  rArr: "⇒",
  lArr: "⇐",
  hArr: "⇔",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  deg: "°",
  copy: "©",
  reg: "®",
  trade: "™",
  check: "✓",
  cross: "✗",
};

function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z0-9]+);/g, (full, name) => {
      return name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : full;
    })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "");
}

function getImageDimensions(buf, ext) {
  try {
    if (ext === "png" && buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { width: Math.max(1, w), height: Math.max(1, h) };
    }
    if ((ext === "jpg" || ext === "jpeg") && buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let idx = 2;
      while (idx < buf.length - 8) {
        while (idx < buf.length && buf[idx] !== 0xff) idx++;
        while (idx < buf.length && buf[idx] === 0xff) idx++;
        if (idx >= buf.length) break;
        const marker = buf[idx++];
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (idx + 2 > buf.length) break;
        const seglen = buf.readUInt16BE(idx);
        if (marker >= 0xc0 && marker <= 0xc3 && idx + 7 <= buf.length) {
          const h = buf.readUInt16BE(idx + 3);
          const w = buf.readUInt16BE(idx + 5);
          return { width: Math.max(1, w), height: Math.max(1, h) };
        }
        idx += seglen;
      }
    }
  } catch {
    // fallback
  }
  return { width: 600, height: 320 };
}

function loadEmbeddedImage(imgTag, baseDir) {
  const srcM = imgTag.match(/src=["']([^"']+)["']/i);
  if (!srcM) return null;
  const src = srcM[1];
  if (src.startsWith("data:image/")) {
    const m = src.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/s);
    if (!m) return null;
    const ext = m[1].toLowerCase().replace("jpeg", "jpg");
    const buf = Buffer.from(m[2], "base64");
    const dims = getImageDimensions(buf, ext);
    return { buffer: buf, type: ext === "jpg" ? "jpg" : "png", ...dims };
  }
  let rel = src.replace(/^\/+/, "");
  if (rel.startsWith("report/")) {
    rel = rel.slice("report/".length);
  }
  const candidate = path.join(baseDir, rel);
  if (fs.existsSync(candidate)) {
    const ext = (path.extname(candidate).slice(1) || "png").toLowerCase().replace("jpeg", "jpg");
    const buf = fs.readFileSync(candidate);
    const dims = getImageDimensions(buf, ext);
    return { buffer: buf, type: ext === "jpg" ? "jpg" : "png", ...dims };
  }
  return null;
}

function makeImageRun(imgObj, maxWidthPx = 530, fixedWidthPx = null) {
  const aspect = imgObj.height / Math.max(1, imgObj.width);
  let width =
    fixedWidthPx !== null
      ? fixedWidthPx
      : Math.min(maxWidthPx, Math.max(220, Math.round(imgObj.width * 0.72)));
  let height = Math.round(width * aspect);
  if (fixedWidthPx === null && height > 300) {
    height = 300;
    width = Math.round(height / aspect);
  }
  return new ImageRun({
    data: imgObj.buffer,
    transformation: { width: Math.max(20, width), height: Math.max(20, height) },
    type: imgObj.type,
  });
}

function makeTextRun(text, opts = {}) {
  const clean = decodeHtmlEntities(text);
  if (!clean && !opts.break) return null;
  return new TextRun({
    text: clean,
    font: "Times New Roman",
    size: opts.size ?? 24,
    bold: Boolean(opts.bold),
    italics: Boolean(opts.italics),
    superScript: Boolean(opts.superScript),
    subScript: Boolean(opts.subScript),
    color: opts.color ?? "000000",
    break: opts.break,
  });
}

function parseHtmlFragmentToRuns(htmlFragment, defaultOpts = {}) {
  const size = defaultOpts.size ?? 24;
  const baseBold = Boolean(defaultOpts.bold);
  const baseItalics = Boolean(defaultOpts.italics);
  const color = defaultOpts.color ?? "000000";

  if (!htmlFragment) return [];

  const tokens = htmlFragment.split(/(<[^>]+>)/g);
  const boldStack = [baseBold];
  const italicStack = [baseItalics];
  const supStack = [false];
  const subStack = [false];
  const runs = [];

  for (const tok of tokens) {
    if (!tok) continue;
    if (tok.startsWith("<") && tok.endsWith(">")) {
      const lower = tok.toLowerCase();
      if (lower.startsWith("</")) {
        if (boldStack.length > 1) {
          boldStack.pop();
          italicStack.pop();
          supStack.pop();
          subStack.pop();
        }
      } else if (/^<br\s*\/?>$/i.test(lower)) {
        runs.push(
          new TextRun({
            text: "",
            font: "Times New Roman",
            size,
            break: 1,
          })
        );
      } else if (!lower.endsWith("/>")) {
        const isBold =
          boldStack[boldStack.length - 1] ||
          /^<(strong|b|th)\b/i.test(lower) ||
          /font-weight\s*:\s*(700|800|900|bold)/i.test(lower);
        const isItalic =
          italicStack[italicStack.length - 1] ||
          /^<(em|i)\b/i.test(lower) ||
          /math-inline|ieee-math|font-style\s*:\s*italic/i.test(lower);
        const isSup = supStack[supStack.length - 1] || /^<sup\b/i.test(lower);
        const isSub = subStack[subStack.length - 1] || /^<sub\b/i.test(lower);
        boldStack.push(isBold);
        italicStack.push(isItalic);
        supStack.push(isSup);
        subStack.push(isSub);
      }
    } else {
      const normalized = decodeHtmlEntities(tok.replace(/\s+/g, " "));
      if (!normalized) continue;
      runs.push(
        new TextRun({
          text: normalized,
          font: "Times New Roman",
          size,
          bold: boldStack[boldStack.length - 1],
          italics: italicStack[italicStack.length - 1],
          superScript: supStack[supStack.length - 1],
          subScript: subStack[subStack.length - 1],
          color,
        })
      );
    }
  }

  if (runs.length === 0) {
    const plain = decodeHtmlEntities(
      htmlFragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (plain) {
      runs.push(
        new TextRun({
          text: plain,
          font: "Times New Roman",
          size,
          bold: baseBold,
          italics: baseItalics,
          color,
        })
      );
    }
  }

  return runs;
}

function parseHtmlTableToDocx(tableHtml, sizeHalfPt = 20) {
  const rowMatches = [...tableHtml.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length === 0) return null;

  const parsedRows = [];
  let maxCols = 0;

  for (const rm of rowMatches) {
    const trAttrs = rm[1] || "";
    const trInner = rm[2] || "";
    const cellMatches = [...trInner.matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi)];
    if (cellMatches.length === 0) continue;
    const isBoldRow = /ieee-row-bold|toc-ch/i.test(trAttrs);
    const rowCells = [];
    let colSum = 0;
    for (const cm of cellMatches) {
      const tag = cm[1].toLowerCase();
      const attrs = cm[2] || "";
      const inner = cm[3] || "";
      const spanM = attrs.match(/colspan=["']?(\d+)/i);
      const colSpan = spanM ? Math.max(1, parseInt(spanM[1], 10)) : 1;
      colSum += colSpan;
      rowCells.push({
        isHeader: tag === "th",
        isBoldRow,
        attrs,
        inner,
        colSpan,
      });
    }
    if (colSum > maxCols) maxCols = colSum;
    parsedRows.push({ rowCells, colSum });
  }

  if (parsedRows.length === 0 || maxCols === 0) return null;

  const totalWidthDxa = 8666;
  const colWidthDxa = Math.floor(totalWidthDxa / maxCols);
  const columnWidths = Array.from({ length: maxCols }, (_, i) =>
    i === maxCols - 1 ? totalWidthDxa - colWidthDxa * (maxCols - 1) : colWidthDxa
  );

  const tableRows = parsedRows.map(({ rowCells, colSum }) => {
    const diff = maxCols - colSum;
    const cells = rowCells.map((cell, idx) => {
      const effectiveSpan =
        idx === rowCells.length - 1 && diff > 0 ? cell.colSpan + diff : cell.colSpan;
      let alignment = AlignmentType.LEFT;
      if (/class=["'][^"']*\br\b|text-align\s*:\s*right/i.test(cell.attrs)) {
        alignment = AlignmentType.RIGHT;
      } else if (/class=["'][^"']*\bc\b|text-align\s*:\s*center/i.test(cell.attrs)) {
        alignment = AlignmentType.CENTER;
      }

      const runs = parseHtmlFragmentToRuns(cell.inner.trim(), {
        size: sizeHalfPt,
        bold: cell.isHeader || cell.isBoldRow,
      });

      const cellParagraph = new Paragraph({
        alignment,
        spacing: { before: 30, after: 30, line: 260, lineRule: LineRuleType.AUTO },
        children:
          runs.length > 0
            ? runs
            : [new TextRun({ text: "", font: "Times New Roman", size: sizeHalfPt })],
      });

      let shading = undefined;
      if (cell.isHeader) {
        shading = { type: ShadingType.CLEAR, color: "auto", fill: "E2E8F0" };
      } else if (cell.isBoldRow) {
        shading = { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" };
      }

      return new TableCell({
        columnSpan: effectiveSpan > 1 ? effectiveSpan : undefined,
        verticalAlign: VerticalAlign.CENTER,
        shading,
        margins: { top: 45, bottom: 45, left: 75, right: 75 },
        children: [cellParagraph],
      });
    });

    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: totalWidthDxa, type: WidthType.DXA },
    columnWidths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    },
    rows: tableRows,
  });
}

function buildPrelimCoverOrTitleElements(pageHtml, isInnerTitle = false) {
  const elements = [];

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40, line: 280 },
      children: [makeTextRun("B.M.S COLLEGE OF ENGINEERING", { bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120, line: 280 },
      children: [
        makeTextRun("(Autonomous Institute Affiliated to VTU)", { bold: true, size: 24 }),
        new TextRun({ text: "", font: "Times New Roman", size: 24, break: 1 }),
        makeTextRun("Bull Temple Road, Basavanagudi, Bangalore – 560019", {
          bold: true,
          size: 24,
        }),
      ],
    })
  );

  const imgM = pageHtml.match(/<img[^>]+>/i);
  if (imgM) {
    const imgObj = loadEmbeddedImage(imgM[0], REPORT_DIR);
    if (imgObj) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 120 },
          children: [makeImageRun(imgObj, 96, 96)],
        })
      );
    }
  }

  if (isInnerTitle) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [makeTextRun("Inner Title Page", { italics: true, size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 140, line: 300 },
        children: [makeTextRun(`“${TITLE}”`, { bold: true, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          makeTextRun(
            "A Major Project Report submitted in partial fulfillment of the requirements for the award of the degree of",
            { size: 24 }
          ),
        ],
      })
    );
  } else {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [makeTextRun("A Project Report on", { size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 140, line: 300 },
        children: [makeTextRun(`“${TITLE}”`, { bold: true, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          makeTextRun(
            "Submitted in partial fulfillment of the requirements for the award of degree of",
            { size: 24 }
          ),
        ],
      })
    );
  }

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140, line: 300 },
      children: [
        makeTextRun("BACHELOR OF ENGINEERING", { bold: true, size: 28 }),
        new TextRun({ text: "", font: "Times New Roman", size: 28, break: 1 }),
        makeTextRun("IN", { bold: true, size: 28 }),
        new TextRun({ text: "", font: "Times New Roman", size: 28, break: 1 }),
        makeTextRun("COMPUTER SCIENCE AND BUSINESS SYSTEMS", { bold: true, size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [makeTextRun("Submitted by", { bold: true, italics: true, size: 24 })],
    })
  );

  for (const student of [
    "H S Thanush – 1BM23CB066",
    "Kiran M K – 1BM23CB068",
    "Manoj G U – 1BM24CB401",
  ]) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30, line: 260 },
        children: [makeTextRun(student, { bold: true, size: 24 })],
      })
    );
  }

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 30 },
      children: [makeTextRun("Under the guidance of", { bold: true, italics: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [makeTextRun("Tejaswini K", { bold: true, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [makeTextRun("Assistant Professor, Department of CSBS, BMSCE", { size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        makeTextRun("Department of Computer Science and Business Systems", {
          bold: true,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 280 },
      children: [
        makeTextRun(
          "B.M.S College of Engineering, Bull Temple Road, Basavanagudi, Bangalore - 560019",
          { bold: true, size: 24 }
        ),
        new TextRun({ text: "", font: "Times New Roman", size: 24, break: 1 }),
        makeTextRun("2026-2027", { bold: true, size: 24 }),
      ],
    })
  );

  return elements;
}

function buildCertificatePageElements(pageHtml) {
  const elements = [];

  const imgM = pageHtml.match(/<img[^>]+>/i);
  if (imgM) {
    const imgObj = loadEmbeddedImage(imgM[0], REPORT_DIR);
    if (imgObj) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 60 },
          children: [makeImageRun(imgObj, 88, 88)],
        })
      );
    }
  }

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [makeTextRun("B.M.S COLLEGE OF ENGINEERING", { bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        makeTextRun(
          "(Autonomous Institute Affiliated to VTU) Bull Temple Road, Basavanagudi, Bangalore – 560019",
          { bold: true, size: 22 }
        ),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        makeTextRun("Department of Computer Science and Business Systems", {
          bold: true,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [makeTextRun("CERTIFICATE", { bold: true, size: 32 })],
    })
  );

  const certP = pageHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (certP) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 280, line: 360 },
        children: parseHtmlFragmentToRuns(certP[1], { size: 24 }),
      })
    );
  }

  const sigTable = parseHtmlTableToDocx(
    `<table>
      <tr>
        <td class="c"><strong>Tejaswini K</strong><br/>Assistant Professor &amp; Guide,<br/>Dept. of CSBS, BMSCE, Bangalore</td>
        <td class="c"><strong>Dr. R Ashok Kumar</strong><br/>Professor &amp; Head,<br/>Dept. of CSBS, BMSCE, Bangalore</td>
        <td class="c"><strong>Dr. Beemsha Arya</strong><br/>Professor and Principal,<br/>BMSCE, Bangalore</td>
      </tr>
    </table>`,
    22
  );
  if (sigTable) elements.push(sigTable);

  elements.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 220, after: 80 },
      children: [makeTextRun("Examiners:", { bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        makeTextRun(
          "1. Name & Signature of Examiner 1: ____________________________________________",
          { size: 24 }
        ),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 140 },
      children: [
        makeTextRun(
          "2. Name & Signature of Examiner 2: ____________________________________________",
          { size: 24 }
        ),
      ],
    })
  );

  return elements;
}



function convertHtmlBlocksToDocxElements(innerHtml, svgCounterRef, isIeee = false) {
  const out = [];
  const tokenRe =
    /(<div\s+class="chapter-num-header"[^>]*>[\s\S]*?<\/div>|<div\s+class="chapter-title-center"[^>]*>[\s\S]*?<\/div>|<h1[^>]*>[\s\S]*?<\/h1>|<h2[^>]*>[\s\S]*?<\/h2>|<h3[^>]*>[\s\S]*?<\/h3>|<div\s+class="sec-h1"[^>]*>[\s\S]*?<\/div>|<div\s+class="sec-h2"[^>]*>[\s\S]*?<\/div>|<div\s+class="prelim-list-header"[^>]*>[\s\S]*?<\/div>|<div\s+class="toc-chapter-entry"[^>]*>[\s\S]*?<\/div>|<div\s+class="toc-section-entry"[^>]*>[\s\S]*?<\/div>|<div\s+class="toc-prelim-entry"[^>]*>[\s\S]*?<\/div>|<div\s+class="leader-list-item"[^>]*>[\s\S]*?<\/div>|<div\s+class="def-list-item"[^>]*>[\s\S]*?<\/div>|<div\s+class="sym-list-item"[^>]*>[\s\S]*?<\/div>|<div\s+class="table-caption"[^>]*>[\s\S]*?<\/div>|<div\s+class="ieee-table-cap"[^>]*>[\s\S]*?<\/div>|<table[^>]*>[\s\S]*?<\/table>|<div\s+class="figure-box"[^>]*>[\s\S]*?<\/div>|<div\s+class="ieee-fig-box"[^>]*>[\s\S]*?<\/div>|<div\s+class="ieee-fig-wide"[^>]*>[\s\S]*?<\/div>|<div\s+class="eq-row"[^>]*>[\s\S]*?<\/div>|<div\s+class="ieee-eq"[^>]*>[\s\S]*?<\/div>|<div\s+class="alg-box"[^>]*>[\s\S]*?<\/div>|<div\s+class="ieee-alg-box"[^>]*>[\s\S]*?<\/div>|<div\s+class="code-box"[^>]*>[\s\S]*?<\/div>|<ol[^>]*>[\s\S]*?<\/ol>|<ul[^>]*>[\s\S]*?<\/ul>|<p[^>]*>[\s\S]*?<\/p>)/gi;

  const bodySz = isIeee ? 20 : 24;
  const lineSp = isIeee ? 276 : 360;

  for (const m of innerHtml.matchAll(tokenRe)) {
    const block = m[0];
    const bLower = block.toLowerCase();

    if (bLower.includes('class="chapter-num-header"')) {
      // User Request: Align left to chapters ("CHAPTER 1", etc., 16pt bold)
      const inner = block.replace(/^<div[^>]*>|<\/div>$/gis, "").trim();
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          keepNext: true,
          spacing: { before: 40, after: 40, line: 280 },
          children: parseHtmlFragmentToRuns(inner, { size: 32, bold: true }),
        })
      );
    } else if (bLower.includes('class="chapter-title-center"') || bLower.startsWith("<h1")) {
      const inner = block.replace(/^<(?:div|h1)[^>]*>|<\/(?:div|h1)>$/gis, "").trim();
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          keepNext: true,
          spacing: { before: 20, after: 140, line: 280 },
          border: !isIeee
            ? { bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "1E293B" } }
            : undefined,
          children: parseHtmlFragmentToRuns(inner, { size: 36, bold: true }),
        })
      );
    } else if (bLower.includes('class="sec-h1"') || bLower.startsWith("<h2")) {
      const inner = block.replace(/^<(?:div|h2)[^>]*>|<\/(?:div|h2)>$/gis, "").trim();
      out.push(
        new Paragraph({
          alignment: isIeee ? AlignmentType.CENTER : AlignmentType.LEFT,
          keepNext: true,
          spacing: { before: 140, after: 60, line: 280 },
          children: parseHtmlFragmentToRuns(inner, { size: isIeee ? 24 : 32, bold: true }),
        })
      );
    } else if (bLower.includes('class="sec-h2"') || bLower.startsWith("<h3")) {
      const inner = block.replace(/^<(?:div|h3)[^>]*>|<\/(?:div|h3)>$/gis, "").trim();
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          keepNext: true,
          spacing: { before: 100, after: 40, line: 280 },
          children: parseHtmlFragmentToRuns(inner, {
            size: isIeee ? 22 : 28,
            bold: true,
            italics: isIeee,
          }),
        })
      );
    } else if (bLower.includes('class="prelim-list-header"')) {
      const spans = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((s) =>
        s[1].trim()
      );
      if (spans.length === 3) {
        out.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            keepNext: true,
            tabStops: [
              { type: TabStopType.LEFT, position: 2100 },
              { type: TabStopType.RIGHT, position: 8666 },
            ],
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 8, space: 4, color: "0F172A" },
            },
            spacing: { before: 40, after: 140, line: 280 },
            children: [
              ...parseHtmlFragmentToRuns(spans[0], { size: 24, bold: true }),
              makeTextRun("\t", { size: 24, bold: true }),
              ...parseHtmlFragmentToRuns(spans[1], { size: 24, bold: true }),
              makeTextRun("\t", { size: 24, bold: true }),
              ...parseHtmlFragmentToRuns(spans[2], { size: 24, bold: true }),
            ].filter(Boolean),
          })
        );
      } else if (spans.length === 2) {
        const isAcronymHdr = /ACRONYM/i.test(spans[0]);
        out.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            keepNext: true,
            tabStops: isAcronymHdr
              ? [{ type: TabStopType.LEFT, position: 1950 }]
              : [{ type: TabStopType.RIGHT, position: 8666 }],
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 8, space: 4, color: "0F172A" },
            },
            spacing: { before: 40, after: 140, line: 280 },
            children: [
              ...parseHtmlFragmentToRuns(spans[0], { size: 24, bold: true }),
              makeTextRun("\t", { size: 24, bold: true }),
              ...parseHtmlFragmentToRuns(spans[1], { size: 24, bold: true }),
            ].filter(Boolean),
          })
        );
      }
    } else if (bLower.includes('class="toc-chapter-entry"')) {
      const titleM = block.match(/<span\s+class="toc-title"[^>]*>([\s\S]*?)<\/span>/i);
      const pageM = block.match(/<span\s+class="toc-page"[^>]*>([\s\S]*?)<\/span>/i);
      const titleHtml = titleM ? titleM[1].trim() : "";
      const pageTxt = pageM ? pageM[1].trim() : "";
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          tabStops: [{ type: TabStopType.RIGHT, position: 8666, leader: "dot" }],
          spacing: { before: 100, after: 45, line: 290 },
          children: [
            ...parseHtmlFragmentToRuns(titleHtml, { size: 24, bold: true }),
            makeTextRun(`\t${pageTxt}`, { size: 24, bold: true }),
          ].filter(Boolean),
        })
      );
    } else if (
      bLower.includes('class="toc-section-entry"') ||
      bLower.includes('class="toc-prelim-entry"')
    ) {
      const isSection = bLower.includes('class="toc-section-entry"');
      const numM = block.match(/<span\s+class="toc-num"[^>]*>([\s\S]*?)<\/span>/i);
      const titleM = block.match(/<span\s+class="toc-title"[^>]*>([\s\S]*?)<\/span>/i);
      const pageM = block.match(/<span\s+class="toc-page"[^>]*>([\s\S]*?)<\/span>/i);
      const numTxt = numM ? numM[1].trim() : "";
      const titleHtml = titleM ? titleM[1].trim() : "";
      const pageTxt = pageM ? pageM[1].trim() : "";
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: isSection ? { left: 220 } : undefined,
          tabStops: [
            { type: TabStopType.LEFT, position: isSection ? 940 : 720 },
            { type: TabStopType.RIGHT, position: 8666, leader: "dot" },
          ],
          spacing: { before: 25, after: 45, line: 280 },
          children: [
            makeTextRun(`${numTxt}\t`, { size: 23, bold: true }),
            ...parseHtmlFragmentToRuns(titleHtml, { size: 23 }),
            makeTextRun(`\t${pageTxt}`, { size: 23, bold: true }),
          ].filter(Boolean),
        })
      );
    } else if (bLower.includes('class="leader-list-item"')) {
      const numM = block.match(/<span\s+class="leader-item-num"[^>]*>([\s\S]*?)<\/span>/i);
      const titleM = block.match(/<span\s+class="leader-item-title"[^>]*>([\s\S]*?)<\/span>/i);
      const pageM = block.match(/<span\s+class="leader-item-page"[^>]*>([\s\S]*?)<\/span>/i);
      const numTxt = numM ? numM[1].trim() : "";
      const titleHtml = titleM ? titleM[1].trim() : "";
      const pageTxt = pageM ? pageM[1].trim() : "";
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          tabStops: [
            { type: TabStopType.LEFT, position: 1350 },
            { type: TabStopType.RIGHT, position: 8666, leader: "dot" },
          ],
          spacing: { before: 40, after: 80, line: 300 },
          children: [
            makeTextRun(`${numTxt}\t`, { size: 24, bold: true }),
            ...parseHtmlFragmentToRuns(titleHtml, { size: 24 }),
            makeTextRun(`\t${pageTxt}`, { size: 24, bold: true }),
          ].filter(Boolean),
        })
      );
    } else if (bLower.includes('class="def-list-item"')) {
      const termM = block.match(/<span\s+class="def-item-term"[^>]*>([\s\S]*?)<\/span>/i);
      const descM = block.match(/<span\s+class="def-item-desc"[^>]*>([\s\S]*?)<\/span>/i);
      const termHtml = termM ? termM[1].trim() : "";
      const descHtml = descM ? descM[1].trim() : "";
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: 1950, hanging: 1950 },
          tabStops: [{ type: TabStopType.LEFT, position: 1950 }],
          spacing: { before: 35, after: 75, line: 290 },
          children: [
            ...parseHtmlFragmentToRuns(termHtml, { size: 24, bold: true }),
            makeTextRun("\t", { size: 24 }),
            ...parseHtmlFragmentToRuns(descHtml, { size: 24 }),
          ].filter(Boolean),
        })
      );
    } else if (bLower.includes('class="sym-list-item"')) {
      const symM = block.match(/<span\s+class="sym-item-symbol"[^>]*>([\s\S]*?)<\/span>/i);
      const descM = block.match(/<span\s+class="sym-item-desc"[^>]*>([\s\S]*?)<\/span>/i);
      const unitM = block.match(/<span\s+class="sym-item-unit"[^>]*>([\s\S]*?)<\/span>/i);
      const symHtml = symM ? symM[1].trim() : "";
      const descHtml = descM ? descM[1].trim() : "";
      const unitHtml = unitM ? unitM[1].trim() : "";
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          tabStops: [
            { type: TabStopType.LEFT, position: 2100 },
            { type: TabStopType.RIGHT, position: 8666 },
          ],
          spacing: { before: 35, after: 80, line: 290 },
          children: [
            ...parseHtmlFragmentToRuns(symHtml, { size: 24, bold: true }),
            makeTextRun("\t", { size: 24 }),
            ...parseHtmlFragmentToRuns(descHtml, { size: 24 }),
            makeTextRun("\t", { size: 24 }),
            ...parseHtmlFragmentToRuns(unitHtml, { size: 24, italics: true }),
          ].filter(Boolean),
        })
      );
    } else if (bLower.includes('class="table-caption"') || bLower.includes('class="ieee-table-cap"')) {
      const inner = block.replace(/^<div[^>]*>|<\/div>$/gis, "").trim();
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          keepNext: true,
          spacing: { before: 100, after: 40, line: 260 },
          children: parseHtmlFragmentToRuns(inner, { size: 20, bold: true }),
        })
      );
    } else if (bLower.startsWith("<table")) {
      const tbl = parseHtmlTableToDocx(block, isIeee ? 18 : 20);
      if (tbl) out.push(tbl);
    } else if (
      bLower.includes('class="figure-box"') ||
      bLower.includes('class="ieee-fig-box"') ||
      bLower.includes('class="ieee-fig-wide"')
    ) {
      const imgM = block.match(/<img[^>]+>/i);
      let imgObj = null;
      if (imgM) {
        imgObj = loadEmbeddedImage(imgM[0], REPORT_DIR);
      } else if (bLower.includes("<svg")) {
        svgCounterRef.count += 1;
        const svgPngPath = path.join(DOCX_MEDIA_DIR, `svg_fig_${svgCounterRef.count}.png`);
        if (fs.existsSync(svgPngPath)) {
          const buf = fs.readFileSync(svgPngPath);
          const dims = getImageDimensions(buf, "png");
          imgObj = { buffer: buf, type: "png", ...dims };
        }
      }
      if (imgObj) {
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 80, after: 40 },
            children: [makeImageRun(imgObj, isIeee ? 420 : 530)],
          })
        );
      }
      const capM = block.match(
        /<div\s+class="(?:figure-caption|ieee-fig-cap)"[^>]*>([\s\S]*?)<\/div>/i
      );
      if (capM) {
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 100, line: 260 },
            children: parseHtmlFragmentToRuns(capM[1].trim(), {
              size: 20,
              bold: true,
              italics: true,
            }),
          })
        );
      }
    } else if (bLower.includes('class="eq-row"') || bLower.includes('class="ieee-eq"')) {
      const inner = block
        .replace(/^<div[^>]*>|<\/div>$/gis, "")
        .replace(/<\/?span[^>]*>/gi, " ")
        .trim();
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60, line: 280 },
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "F8FAFC" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, space: 4, color: "334155" },
            bottom: { style: BorderStyle.SINGLE, size: 4, space: 4, color: "334155" },
            left: { style: BorderStyle.SINGLE, size: 12, space: 6, color: "0F172A" },
            right: { style: BorderStyle.SINGLE, size: 4, space: 4, color: "334155" },
          },
          children: parseHtmlFragmentToRuns(inner, { size: bodySz, italics: true }),
        })
      );
    } else if (
      bLower.includes('class="alg-box"') ||
      bLower.includes('class="ieee-alg-box"') ||
      bLower.includes('class="code-box"')
    ) {
      const lineMatches = [
        ...block.matchAll(/<div[^>]*>([\s\S]*?)<\/div>|<pre[^>]*>([\s\S]*?)<\/pre>/gi),
      ];
      lineMatches.forEach((lm, idxL) => {
        const content = lm[1] || lm[2] || "";
        if (/<div\b/i.test(content)) return;
        for (const subline of content.split("\n")) {
          const cleanLine = subline.trim();
          if (!cleanLine) continue;
          out.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 15, after: 15, line: 240 },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "F8FAFC" },
              children: parseHtmlFragmentToRuns(cleanLine, { size: 19, bold: idxL === 0 }),
            })
          );
        }
      });
    } else if (bLower.startsWith("<ol") || bLower.startsWith("<ul")) {
      const isOrdered = bLower.startsWith("<ol");
      const items = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      items.forEach((im, idxItem) => {
        const prefix = isOrdered ? `[${idxItem + 1}] ` : "• ";
        const liClean = im[1].replace(/<\/?span[^>]*>/gi, " ").trim();
        const runs = [
          makeTextRun(prefix, { bold: true, size: bodySz }),
          ...parseHtmlFragmentToRuns(liClean, { size: bodySz }),
        ].filter(Boolean);
        out.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 20, after: 40, line: lineSp },
            children: runs,
          })
        );
      });
    } else if (bLower.startsWith("<p")) {
      const inner = block.replace(/^<p[^>]*>|<\/p>$/gis, "").trim();
      const runs = parseHtmlFragmentToRuns(inner, { size: bodySz });
      if (runs.length > 0) {
        out.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 80, line: lineSp },
            indent: { firstLine: 360 },
            children: runs,
          })
        );
      }
    }
  }

  return out;
}

const A4_PAGE_MARGIN = {
  top: 1080, // 0.75 in
  bottom: 1080, // 0.75 in
  left: 1800, // 1.25 in (CSBS binding margin)
  right: 1440, // 1.00 in
  header: 540,
  footer: 540,
};

function makeRunningHeader() {
  // User Request: In header mention only "Silent Bridge"
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "1E293B" },
        },
        spacing: { after: 60 },
        children: [
          makeTextRun("Silent Bridge", {
            bold: true,
            italics: true,
            size: 20,
            color: "0F172A",
          }),
        ],
      }),
    ],
  });
}

function makeRunningFooter() {
  // User Request: In footer align left "Department of CSBS" and right to "page no"
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        tabStops: [{ type: TabStopType.RIGHT, position: 8666 }],
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "64748B" },
        },
        spacing: { before: 60 },
        children: [
          new TextRun({
            text: "Department of CSBS\t",
            font: "Times New Roman",
            size: 20,
            bold: true,
            color: "0F172A",
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: "Times New Roman",
            size: 20,
            bold: true,
            color: "0F172A",
          }),
        ],
      }),
    ],
  });
}

async function generateCsbsReportDocx() {
  const htmlPath = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  const pages = [
    ...html.matchAll(/<section class="report-page[^"]*"[^>]*>[\s\S]*?<\/section>/gi),
  ].map((m) => m[0]);

  const svgCounterRef = { count: 0 };

  // Section 1: Unnumbered Certificate & Title Pages (Pages 0..2: Outer Cover, Inner Title, BMSCE Certificate)
  const unnumberedChildren = [];
  for (let idx = 0; idx <= 2 && idx < pages.length; idx++) {
    const pageHtml = pages[idx];
    if (idx === 0) {
      unnumberedChildren.push(...buildPrelimCoverOrTitleElements(pageHtml, false));
    } else if (idx === 1) {
      unnumberedChildren.push(...buildPrelimCoverOrTitleElements(pageHtml, true));
    } else if (idx === 2) {
      unnumberedChildren.push(...buildCertificatePageElements(pageHtml));
    }
    if (idx < 2) {
      unnumberedChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Section 2: Roman Preliminary Pages (Pages 3..11: Declaration i, Acknowledgement ii, Abstract iii, TOC iv–v, Figures vi, Tables vii, Abbreviations viii, Symbols ix)
  const romanPrelimChildren = [];
  const romanStartIdx = 3;
  const romanEndIdx = 11;
  for (let idx = romanStartIdx; idx <= romanEndIdx && idx < pages.length; idx++) {
    romanPrelimChildren.push(
      ...convertHtmlBlocksToDocxElements(pages[idx], svgCounterRef, false)
    );
    if (idx < romanEndIdx) {
      romanPrelimChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Section 3: Main Report Chapters 1–8 + References + Research Manuscript + Appendix (Pages 12..end, Arabic 1..66)
  const arabicMainChildren = [];
  const arabicStartIdx = 12;
  for (let idx = arabicStartIdx; idx < pages.length; idx++) {
    arabicMainChildren.push(
      ...convertHtmlBlocksToDocxElements(pages[idx], svgCounterRef, false)
    );
    if (idx < pages.length - 1) {
      arabicMainChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    creator: "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)",
    title: TITLE,
    description: `${TITLE} — Department of Computer Science and Business Systems, B.M.S. College of Engineering`,
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
            color: "000000",
          },
          paragraph: {
            spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 120 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: A4_PAGE_MARGIN,
          },
        },
        headers: {
          default: new Header({ children: [] }),
        },
        footers: {
          default: new Footer({ children: [] }),
        },
        children: unnumberedChildren,
      },
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: A4_PAGE_MARGIN,
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.LOWER_ROMAN,
            },
          },
        },
        headers: {
          default: makeRunningHeader(),
        },
        footers: {
          default: makeRunningFooter(),
        },
        children: romanPrelimChildren,
      },
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: A4_PAGE_MARGIN,
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: makeRunningHeader(),
        },
        footers: {
          default: makeRunningFooter(),
        },
        children: arabicMainChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  const out1 = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.docx");
  const out2 = path.join(REPORT_DIR, "SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.docx");
  const outDoc = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.doc");
  fs.writeFileSync(out1, buffer);
  fs.writeFileSync(out2, buffer);
  fs.writeFileSync(outDoc, buffer);
  console.log(
    `[generate-docx] Wrote CSBS B.E. Project Report .docx (${pages.length} pages, ${buffer.length} bytes) -> ${out1}`
  );
}

async function generateIeeePaperDocx() {
  const htmlPath = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  const pages = [...html.matchAll(/<section class="ieee-page"[^>]*>[\s\S]*?<\/section>/gi)].map(
    (m) => m[0]
  );

  const svgCounterRef = { count: 0 };
  const allChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "1E293B" },
      },
      children: [
        makeTextRun(
          "B.M.S. COLLEGE OF ENGINEERING · DEPARTMENT OF COMPUTER SCIENCE AND BUSINESS SYSTEMS (CSBS) · IEEE TWO-COLUMN RESEARCH MANUSCRIPT",
          { bold: true, italics: true, size: 18 }
        ),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 100, line: 280 },
      children: [makeTextRun(TITLE, { bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30 },
      children: [
        makeTextRun(
          "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401), and Tejaswini K (Assistant Professor & Project Guide)",
          { bold: true, size: 20 }
        ),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "1E293B" },
      },
      children: [
        makeTextRun(
          "Department of Computer Science and Business Systems, B.M.S. College of Engineering, Bangalore – 560019, India",
          { italics: true, size: 18 }
        ),
      ],
    }),
  ];

  pages.forEach((pageHtml, idx) => {
    allChildren.push(...convertHtmlBlocksToDocxElements(pageHtml, svgCounterRef, true));
    if (idx < pages.length - 1) {
      allChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  });

  const doc = new Document({
    creator: "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)",
    title: TITLE,
    description: `${TITLE} — Department of CSBS, BMSCE`,
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 20, color: "000000" },
          paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: A4_PAGE_MARGIN,
          },
        },
        headers: {
          default: makeRunningHeader(),
        },
        footers: {
          default: makeRunningFooter(),
        },
        children: allChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  const out1 = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.docx");
  const out2 = path.join(DOCS_PAPER_DIR, "kannada_signbridge_ieee.docx");
  const outDoc = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.doc");
  fs.mkdirSync(DOCS_PAPER_DIR, { recursive: true });
  fs.writeFileSync(out1, buffer);
  fs.writeFileSync(out2, buffer);
  fs.writeFileSync(outDoc, buffer);
  console.log(
    `[generate-docx] Wrote 8-page IEEE Research Paper .docx (${pages.length} pages, ${buffer.length} bytes) -> ${out1}`
  );
}

await generateCsbsReportDocx();
await generateIeeePaperDocx();
