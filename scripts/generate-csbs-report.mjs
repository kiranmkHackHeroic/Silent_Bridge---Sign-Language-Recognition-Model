// Master Generator for the 76-Page B.M.S. College of Engineering (CSBS) B.E. Project Report
// Generates standalone A4 HTML (with Base64 embedded figures & BMSCE logo) ready for 1:1 PDF rendering.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPreliminaryPages } from "./report-chapters/preliminary.mjs";
import { buildChapters1And2 } from "./report-chapters/ch1_ch2.mjs";
import { buildChapters3And4 } from "./report-chapters/ch3_ch4.mjs";
import { buildChapter5 } from "./report-chapters/ch5.mjs";
import { buildChapter6 } from "./report-chapters/ch6.mjs";
import { buildChapters7And8AndBackMatter } from "./report-chapters/ch7_ch8_end.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function toDataUri(relPath, mime = "image/png") {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) return "";
  const b64 = fs.readFileSync(full).toString("base64");
  return `data:${mime};base64,${b64}`;
}

const meta = {
  title:
    "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR",
  shortTitle:
    "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR",
  students: [
    { name: "H S Thanush", usn: "1BM23CB066" },
    { name: "Kiran M K", usn: "1BM23CB068" },
    { name: "Manoj G U", usn: "1BM24CB401" },
  ],
  guideName: "Tejaswini K",
  guideDesignation: "Assistant Professor",
  hodName: "Dr. R Ashok Kumar",
  principalName: "Dr. Beemsha Arya",
  academicYear: "2026-2027",
  logoSrc: toDataUri("frontend/public/report/bmsce_logo.jpg", "image/jpeg"),
};

const figSrcs = {
  figArch: toDataUri("frontend/public/report/fig_architecture.png", "image/png"),
  figDatadist: toDataUri("frontend/public/report/fig_datadist.png", "image/png"),
  figResults: toDataUri("frontend/public/report/fig_results.png", "image/png"),
  figCalibration: toDataUri("frontend/public/report/fig_calibration.png", "image/png"),
  figPerclass: toDataUri("frontend/public/report/fig_perclass.png", "image/png"),
  figSegmentation: toDataUri("frontend/public/report/fig_segmentation.png", "image/png"),
  figRobustness: toDataUri("frontend/public/report/fig_robustness.png", "image/png"),
  figUiLive: toDataUri("frontend/public/report/fig_ui_live.png", "image/png"),
  figUiCustom: toDataUri("frontend/public/report/fig_ui_custom.png", "image/png"),
  figUiAvatar: toDataUri("frontend/public/report/fig_ui_avatar.png", "image/png"),
  figUiReference: toDataUri("frontend/public/report/fig_ui_reference.png", "image/png"),
  figUiDataset: toDataUri("frontend/public/report/fig_ui_dataset.png", "image/png"),
  figUiTesting: toDataUri("frontend/public/report/fig_ui_testing.png", "image/png"),
};

function convertLatexExpr(expr) {
  let s = expr.trim();

  // Handle \begin{cases} ... \end{cases}
  s = s.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, body) => {
    const rows = body
      .split(/\\\\/)
      .map((r) =>
        r
          .split("&")
          .map((c) => c.trim())
          .join(" &nbsp;&nbsp; ")
      )
      .join("<br/>");
    return `<span style="display:inline-flex; align-items:center;"><span style="font-size:1.5em; margin-right:4px;">{</span><span style="display:inline-block; text-align:left; line-height:1.25;">${rows}</span></span>`;
  });

  // Handle \begin{bmatrix} ... \end{bmatrix}
  s = s.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_, body) => {
    const isCol = body.includes("\\\\");
    const content = isCol
      ? body
          .split(/\\\\/)
          .map((r) => r.trim())
          .join("; ")
      : body
          .split("&")
          .map((c) => c.trim())
          .join(", ");
    return `[${content}]${isCol ? "<sup>T</sup>" : ""}`;
  });

  // Escaped characters first
  s = s.replace(/\\_/g, "_");
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\\{/g, "&#123;");
  s = s.replace(/\\\}/g, "&#125;");
  s = s.replace(/\\\|/g, "&#8214;");

  // Inner text/font macros (multiple passes for nesting)
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\\text\{([^{}]*)\}/g, '<span style="font-style:normal;">$1</span>');
    s = s.replace(/\\mathrm\{([^{}]*)\}/g, '<span style="font-style:normal;">$1</span>');
    s = s.replace(/\\mathcal\{([^{}]*)\}/g, "<i><b>$1</b></i>");
    s = s.replace(/\\mathbb\{R\}/g, "&#8477;");
    s = s.replace(/\\mathbb\{([^{}]*)\}/g, "<b>$1</b>");
    s = s.replace(/\\overrightarrow\{([^{}]*)\}/g, "$1&#8407;");
    s = s.replace(/\\overleftarrow\{([^{}]*)\}/g, "$1&#8406;");
    s = s.replace(/\\hat\{([^{}]*)\}/g, "$1&#770;");
    s = s.replace(/\\tilde\{([^{}]*)\}/g, "$1&#771;");
    s = s.replace(/\\mathbf\{([^{}]*)\}/g, "<b>$1</b>");
  }

  // Greek letters & operators (BEFORE \left / \right so \leftarrow isn't split!)
  const symbols = [
    ["\\rightarrow", "&rarr;"],
    ["\\leftarrow", "&larr;"],
    ["\\implies", "&rArr;"],
    ["\\approx", "&approx;"],
    ["\\forall", "&forall;"],
    ["\\epsilon", "&epsilon;"],
    ["\\lambda", "&lambda;"],
    ["\\sigma", "&sigma;"],
    ["\\theta", "&theta;"],
    ["\\alpha", "&alpha;"],
    ["\\delta", "&delta;"],
    ["\\Delta", "&Delta;"],
    ["\\times", "&times;"],
    ["\\cdot", "&middot;"],
    ["\\perp", "&perp;"],
    ["\\dots", "&hellip;"],
    ["\\langle", "&lang;"],
    ["\\rangle", "&rang;"],
    ["\\tau", "&tau;"],
    ["\\chi", "&chi;"],
    ["\\pi", "&pi;"],
    ["\\ge", "&ge;"],
    ["\\le", "&le;"],
    ["\\pm", "&plusmn;"],
    ["\\in", "&in;"],
    ["\\to", "&rarr;"],
    ["\\mid", " | "],
    ["\\sum", "&Sigma;"],
    ["\\max", '<span style="font-style:normal;">max</span>'],
    ["\\min", '<span style="font-style:normal;">min</span>'],
    ["\\log", '<span style="font-style:normal;">log</span>'],
    ["\\cos", '<span style="font-style:normal;">cos</span>'],
    ["\\sin", '<span style="font-style:normal;">sin</span>'],
  ];
  for (const [k, v] of symbols) {
    s = s.split(k).join(v);
  }

  // Sizing & spacing commands
  s = s.replace(/\\left\s*/g, "");
  s = s.replace(/\\right\s*/g, "");
  s = s.replace(/\\Big\s*/g, "");
  s = s.replace(/\\big\s*/g, "");
  s = s.replace(/\\qquad/g, " &nbsp;&nbsp;&nbsp;&nbsp; ");
  s = s.replace(/\\quad/g, " &nbsp;&nbsp; ");
  s = s.replace(/\\[,;!]/g, " ");

  // Subscripts and superscripts with braces _{...} and ^{...} BEFORE \frac / \widehat / \binom
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
    s = s.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
  }
  // Simple single-token subscripts and superscripts (including HTML entities like &tau;)
  s = s.replace(/_(&[a-zA-Z0-9#]+;|[a-zA-Z0-9*+-]+)/g, "<sub>$1</sub>");
  s = s.replace(/\^(&[a-zA-Z0-9#]+;|[a-zA-Z0-9*+-]+)/g, "<sup>$1</sup>");

  // Now inner braces are resolved, so \widehat, \binom, and \frac match cleanly
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(/\\widehat\{([^{}]+)\}/g, "($1)&#770;");
    s = s.replace(/\\binom\{([^{}]+)\}\{([^{}]+)\}/g, "C($1, $2)");
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
  }

  return `<span class="math-inline">${s}</span>`;
}

function formatLatexMathToHtml(html) {
  return html
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => convertLatexExpr(expr))
    .replace(/\$([^$\n]+)\$/g, (_, expr) => convertLatexExpr(expr));
}

function wrapPageBodies(html) {
  // Wrap content inside each <section class="report-page ..."> so header, body, and footer form a clean 3-part flex column
  return html.replace(
    /(<section class="report-page[^"]*"[^>]*>)([\s\S]*?)(<\/section>)/g,
    (_, openTag, inner, closeTag) => {
      if (openTag.includes("cover-page") || inner.includes("bmsce-border-outer")) {
        const updatedOpen = openTag.includes("cover-page")
          ? openTag
          : openTag.replace('class="report-page', 'class="report-page bordered-prelim-page');
        return `${updatedOpen}${inner}${closeTag}`;
      }
      let rest = inner;
      let headerHtml = "";
      const headerMatch = rest.match(/^\s*(<div class="page-running-header">[\s\S]*?<\/div>)/);
      if (headerMatch) {
        headerHtml = `<div class="page-running-header"><span class="report-project-title">Silent Bridge</span></div>`;
        rest = rest.slice(headerMatch[0].length);
      }
      let footerHtml = "";
      const footerMatch = rest.match(/<div class="(page-footer-(?:roman|arabic))">([\s\S]*?)<\/div>\s*$/);
      if (footerMatch) {
        const footerCls = footerMatch[1];
        const pageNum = footerMatch[2].replace(/<[^>]+>/g, "").trim();
        footerHtml = `<div class="${footerCls}"><span class="footer-dept">Dept. of CSBS, BMSCE</span><span class="footer-page-num">${pageNum}</span></div>`;
        rest = rest.slice(0, rest.length - footerMatch[0].length);
      }
      return `${openTag}\n${headerHtml}\n<div class="page-body-wrap"><div class="page-body-inner">${rest.trim()}</div></div>\n${footerHtml}\n${closeTag}`;
    }
  );
}

const prelimHtml = wrapPageBodies(formatLatexMathToHtml(buildPreliminaryPages(meta)));
const ch1And2Html = wrapPageBodies(formatLatexMathToHtml(buildChapters1And2()));
const ch3And4Html = wrapPageBodies(formatLatexMathToHtml(buildChapters3And4()));
const ch5Html = wrapPageBodies(formatLatexMathToHtml(buildChapter5(figSrcs)));
const ch6Html = wrapPageBodies(formatLatexMathToHtml(buildChapter6(figSrcs)));
const ch7And8Html = wrapPageBodies(formatLatexMathToHtml(buildChapters7And8AndBackMatter(figSrcs)));

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSBS B.E. Project Report — SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR (76 Pages)</title>
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

    html, body, svg, svg text, svg tspan, button, input, select, textarea, code, pre, kbd, samp {
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #334155;
      font-size: 12pt;
      line-height: 1.5;
      color: #000000;
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
      .report-page {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .report-page:last-of-type {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }

    /* Screen preview toolbar */
    .report-toolbar {
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
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .report-toolbar a, .report-toolbar button {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 15px;
      border-radius: 5px;
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .report-toolbar a:hover, .report-toolbar button:hover {
      background: #1d4ed8;
    }
    .report-toolbar a.secondary, .report-toolbar button.secondary {
      background: #334155;
    }
    .report-toolbar a.secondary:hover, .report-toolbar button.secondary:hover {
      background: #475569;
    }

    /* Exact A4 sheet with CSBS Guideline 1 margins:
       Left: 1.25in (binding side), Right: 1.0in, Top: 0.75in, Bottom: 0.75in */
    .report-page {
      width: 210mm;
      height: 297mm;
      padding: 0.75in 1in 0.75in 1.25in;
      margin: 22px auto;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.42);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-page {
      padding: 0.50in 0.60in 0.50in 0.70in;
    }

    .bordered-prelim-page {
      padding: 0.50in 0.60in 0.40in 0.70in;
    }

    .bordered-prelim-page .page-footer-roman {
      border-top: none;
      margin-top: 4pt;
      padding-top: 0;
    }

    .bmsce-border-outer {
      border: 2.5px solid #0f172a;
      padding: 3.5px;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .bmsce-border-inner {
      border: 1px solid #0f172a;
      padding: 16pt 20pt;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 0;
    }

    /* Running Header — Only "Silent Bridge" in header */
    .page-running-header {
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      font-size: 10pt;
      font-style: italic;
      color: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 3pt;
      margin-bottom: 6pt;
      flex-shrink: 0;
      text-align: right;
    }
    .page-running-header > span {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }

    /* Flex body wrapper between running header and page footer */
    .page-body-wrap {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .page-body-inner {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    /* CSBS Typography Hierarchy:
       - Chapter number: Left aligned, 16pt bold
       - Chapter title: Centered, 18pt bold uppercase
       - Section heading (X.Y): Left justified, 16pt bold
       - Subsection heading (X.Y.Z): Left justified, 14pt bold
       - Body text: 12pt Times New Roman, 1.5 line spacing, justified */
    .chapter-num-header {
      text-align: left;
      font-size: 16pt;
      font-weight: 700;
      letter-spacing: 0.6px;
      margin-top: 0;
      margin-bottom: 2pt;
      line-height: 1.15;
      color: #0f172a;
    }

    .chapter-title-center {
      text-align: center;
      font-size: 18pt;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 8pt;
      padding-bottom: 2pt;
      border-bottom: none;
      line-height: 1.20;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sec-h1 {
      text-align: left;
      font-size: 16pt;
      font-weight: 700;
      margin-top: 7pt;
      margin-bottom: 3pt;
      line-height: 1.20;
      color: #0f172a;
    }

    .sec-h2 {
      text-align: left;
      font-size: 14pt;
      font-weight: 700;
      margin-top: 5pt;
      margin-bottom: 2pt;
      line-height: 1.20;
      color: #1e293b;
    }

    p {
      font-size: 12pt !important;
      line-height: 1.5;
      text-align: justify;
      text-justify: inter-word;
      margin-top: 0;
      margin-bottom: 5pt;
      orphans: 2;
      widows: 2;
    }

    ul, ol {
      font-size: 12pt !important;
      line-height: 1.5;
      text-align: justify;
      margin-top: 2pt;
      margin-bottom: 5pt;
      padding-left: 17pt;
    }

    li {
      font-size: 12pt !important;
      margin-bottom: 2pt;
    }

    code {
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
      font-size: inherit;
      font-style: normal;
      color: #000000;
    }

    .math-inline {
      font-family: "Times New Roman", "CSBS-Times", "CSBS-Kannada", Times, serif !important;
      font-style: italic;
      white-space: normal;
    }

    /* Tables & Figures (Guideline 6.x) */
    .table-caption {
      font-size: 10pt;
      font-weight: 700;
      text-align: center;
      margin-top: 4pt;
      margin-bottom: 3pt;
      color: #0f172a;
    }

    .figure-box {
      margin: 4pt 0;
      padding: 4pt 6pt;
      border: 0.75px solid #cbd5e1;
      background: #ffffff;
      border-radius: 2px;
      text-align: center;
      width: 100%;
    }

    .figure-caption {
      font-size: 9.6pt;
      font-weight: 700;
      text-align: center;
      margin-top: 3.5pt;
      line-height: 1.25;
      color: #0f172a;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      line-height: 1.24;
      margin-bottom: 5pt;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
    }

    .data-table th, .data-table td {
      border: 0.6px solid #475569;
      padding: 2.5pt 4pt;
      vertical-align: top;
      text-align: left;
    }

    .data-table th {
      background: #e2e8f0;
      border-bottom: 1.2px solid #0f172a;
      font-weight: 700;
      color: #0f172a;
    }

    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .data-table td.r, .data-table th.r {
      text-align: right;
    }

    .data-table td.c, .data-table th.c {
      text-align: center;
    }

    /* Enlarged Non-Table Table of Contents & Preliminary Lists (Pages iv–ix) */
    .prelim-list-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      margin-top: 2pt;
    }
    .prelim-list-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4pt;
      margin-bottom: 8pt;
      letter-spacing: 0.3px;
    }
    .toc-chapter-entry {
      display: flex;
      align-items: baseline;
      font-size: 12pt;
      font-weight: 700;
      line-height: 1.45;
      margin-top: 6pt;
      margin-bottom: 3pt;
      color: #000000;
    }
    .toc-section-entry {
      display: flex;
      align-items: baseline;
      font-size: 11.5pt;
      font-weight: 400;
      line-height: 1.42;
      margin-bottom: 2.8pt;
      padding-left: 12pt;
      color: #000000;
    }
    .toc-prelim-entry {
      display: flex;
      align-items: baseline;
      font-size: 11.5pt;
      font-weight: 400;
      line-height: 1.42;
      margin-bottom: 2.8pt;
      color: #000000;
    }
    .toc-num {
      width: 38pt;
      flex-shrink: 0;
      font-weight: 700;
      text-align: left;
    }
    .toc-title {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .toc-leader {
      flex: 1 1 auto;
      border-bottom: 1.2px dotted #475569;
      margin: 0 8pt 3.5pt 8pt;
      min-width: 14pt;
    }
    .toc-page {
      flex-shrink: 0;
      font-weight: 700;
      text-align: right;
      min-width: 24pt;
    }

    /* Enlarged List of Figures & List of Tables (Non-Table Dotted Leader Format) */
    .leader-list-item {
      display: flex;
      align-items: baseline;
      font-size: 11.4pt;
      line-height: 1.68;
      margin-bottom: 7pt;
      color: #000000;
    }
    .leader-item-num {
      width: 78pt;
      flex-shrink: 0;
      font-weight: 700;
      text-align: left;
      white-space: nowrap;
    }
    .leader-item-title {
      flex-shrink: 0;
      text-align: left;
      white-space: nowrap;
    }
    .leader-item-dots {
      flex: 1 1 auto;
      border-bottom: 1.2px dotted #475569;
      margin: 0 8pt 3.5pt 8pt;
      min-width: 16pt;
    }
    .leader-item-page {
      flex-shrink: 0;
      font-weight: 700;
      text-align: right;
      min-width: 30pt;
    }

    /* Enlarged List of Abbreviations & List of Symbols (Non-Table Structured Format) */
    .def-list-item {
      display: flex;
      align-items: baseline;
      font-size: 12pt;
      line-height: 1.52;
      margin-bottom: 5.5pt;
      color: #000000;
    }
    .def-item-term {
      width: 118pt;
      flex-shrink: 0;
      font-weight: 700;
      text-align: left;
      padding-right: 8pt;
    }
    .def-item-desc {
      flex: 1 1 auto;
      text-align: left;
    }
    .sym-list-item {
      display: flex;
      align-items: baseline;
      font-size: 12pt;
      line-height: 1.55;
      margin-bottom: 6pt;
      color: #000000;
    }
    .sym-item-symbol {
      width: 130pt;
      flex-shrink: 0;
      font-weight: 700;
      text-align: left;
      padding-right: 8pt;
    }
    .sym-item-desc {
      flex: 1 1 auto;
      text-align: left;
      padding-right: 8pt;
    }
    .sym-item-unit {
      width: 98pt;
      flex-shrink: 0;
      text-align: right;
      font-style: italic;
    }

    /* Equations (Guideline 6.xv–xvi: decimal form with right justified equation numbers) */
    .eq-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 0.6px solid #cbd5e1;
      border-left: 2.5px solid #1e3a8a;
      padding: 3pt 9pt;
      margin: 3pt 0;
      font-size: 10.2pt;
      font-family: "CSBS-Times", "CSBS-Kannada", "Times New Roman", Times, serif;
      width: 100%;
    }
    .eq-num {
      font-weight: 700;
      margin-left: auto;
      padding-left: 8pt;
      text-align: right;
      white-space: nowrap;
      color: #0f172a;
    }
    .eq-num::before {
      content: ".......... ";
      letter-spacing: 1px;
      color: #64748b;
      font-weight: 400;
    }

    /* Algorithm & Code Listings */
    .alg-box {
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      border-left: 0.6px solid #94a3b8;
      border-right: 0.6px solid #94a3b8;
      background: #f8fafc;
      padding: 4.5pt 8pt;
      margin: 4pt 0;
      width: 100%;
    }
    .alg-title {
      font-size: 9.8pt;
      font-weight: 700;
      border-bottom: 1px solid #334155;
      padding-bottom: 2pt;
      margin-bottom: 3pt;
      color: #0f172a;
    }

    .code-box {
      border: 0.8px solid #334155;
      background: #f8fafc;
      margin: 4pt 0;
      border-radius: 2px;
      overflow: hidden;
      width: 100%;
    }
    .code-title {
      background: #e2e8f0;
      border-bottom: 0.8px solid #334155;
      padding: 2pt 7pt;
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
    }
    .code-pre {
      margin: 0;
      padding: 4pt 7pt;
      font-family: "CSBS-Times", "CSBS-Kannada", "Times New Roman", Times, serif;
      font-size: 8.6pt;
      line-height: 1.22;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* References list */
    .ref-list {
      list-style: none;
      counter-reset: ref-counter;
      padding-left: 0;
      font-size: 8.6pt;
      line-height: 1.22;
      margin: 0;
      width: 100%;
    }
    .ref-list li {
      counter-increment: ref-counter;
      position: relative;
      padding-left: 22pt;
      margin-bottom: 1.8pt;
      text-align: justify;
    }
    .ref-list li::before {
      content: "[" counter(ref-counter) "]";
      position: absolute;
      left: 0;
      top: 0;
      font-weight: 700;
      color: #0f172a;
    }

    /* Page Footers — Department of CSBS on Left, Page number on Right */
    .page-footer-roman, .page-footer-arabic {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10pt;
      font-weight: 700;
      border-top: 0.75px solid #64748b;
      padding-top: 3pt;
      margin-top: 4pt;
      color: #0f172a;
      flex-shrink: 0;
      background: #ffffff;
    }
    .page-footer-roman .footer-dept,
    .page-footer-arabic .footer-dept {
      text-align: left;
      font-weight: 700;
    }
    .page-footer-roman .footer-page-num,
    .page-footer-arabic .footer-page-num {
      text-align: right;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="report-toolbar no-print">
    <div>
      <strong>B.M.S. College of Engineering — Dept. of CSBS B.E. Project Report</strong>
      <span style="margin-left:10px; color:#94a3b8;">79 Pages (4 Certificate/Title Pages + 9 Roman Prelim Pages + 66 Arabic Main Pages · A4 Standard)</span>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <a href="/api/report/download-docx" download="SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.docx">⬇ Download Word (.docx)</a>
      <a class="secondary" href="/api/report/download-pdf" download="SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.pdf">⬇ Download PDF</a>
      <button class="secondary" onclick="window.print()">🖨 Print / Save as PDF</button>
    </div>
  </div>

  ${prelimHtml}
  ${ch1And2Html}
  ${ch3And4Html}
  ${ch5Html}
  ${ch6Html}
  ${ch7And8Html}

  <script>
    // Full-Width Precision Typographic Page-Fit Engine:
    // Guarantees 100% horizontal width alignment and zero page clipping across all 76 A4 pages
    // with exact CSBS margins (Left 1.25in, Right 1in, Top 0.75in, Bottom 0.75in).
    function calibrateReportPages() {
      const pages = document.querySelectorAll(".report-page");
      pages.forEach((page) => {
        const wrap = page.querySelector(".page-body-wrap");
        const inner = page.querySelector(".page-body-inner");
        if (!wrap || !inner) return;

        const availH = wrap.clientHeight;
        let contentH = inner.scrollHeight;

        const textBlocks = inner.querySelectorAll("p, ul, ol, li");
        const headings = inner.querySelectorAll(".chapter-num-header, .chapter-title-center, .sec-h1, .sec-h2, .table-caption, .figure-caption");
        const tables = inner.querySelectorAll(".data-table, .toc-table");
        const cells = inner.querySelectorAll(".data-table th, .data-table td, .toc-table th, .toc-table td");
        const boxes = inner.querySelectorAll(".eq-row, .alg-box, .code-box, .figure-box");
        const codePres = inner.querySelectorAll(".code-pre");
        const listItems = inner.querySelectorAll(".toc-chapter-entry, .toc-section-entry, .toc-prelim-entry, .leader-list-item, .def-list-item, .sym-list-item");

        // Multi-step full-width vertical compaction if a page is taller than available height
        // Body font size remains strictly 12pt across all pages for uniform typography
        const steps = [
          { pFs: "12pt", pLh: "1.42", pMb: "3.8pt", tFs: "8.6pt", tLh: "1.18", cPad: "2pt 3.8pt", hScale: 0.96, codeFs: "8.4pt", codeLh: "1.22", lFs: "12pt", lLh: "1.34", lMb: "2.2pt" },
          { pFs: "12pt", pLh: "1.35", pMb: "3pt",   tFs: "8.2pt", tLh: "1.15", cPad: "1.6pt 3.2pt", hScale: 0.92, codeFs: "8.0pt", codeLh: "1.18", lFs: "12pt", lLh: "1.28", lMb: "1.8pt" },
          { pFs: "12pt", pLh: "1.28", pMb: "2.4pt", tFs: "7.8pt", tLh: "1.12", cPad: "1.3pt 2.8pt", hScale: 0.88, codeFs: "7.6pt", codeLh: "1.14", lFs: "12pt", lLh: "1.22", lMb: "1.4pt" },
          { pFs: "12pt", pLh: "1.22", pMb: "1.8pt", tFs: "7.4pt", tLh: "1.09", cPad: "1.0pt 2.4pt", hScale: 0.84, codeFs: "7.2pt", codeLh: "1.10", lFs: "12pt", lLh: "1.18", lMb: "1.0pt" },
          { pFs: "12pt", pLh: "1.16", pMb: "1.4pt", tFs: "7.0pt", tLh: "1.06", cPad: "0.8pt 2.0pt", hScale: 0.80, codeFs: "6.8pt", codeLh: "1.06", lFs: "12pt", lLh: "1.14", lMb: "0.8pt" },
        ];

        for (const step of steps) {
          if (contentH <= availH - 2) break;
          textBlocks.forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (tag === "p" || tag === "ul" || tag === "ol") {
              el.style.fontSize = "12pt";
              el.style.lineHeight = step.pLh;
              el.style.marginBottom = step.pMb;
            } else if (tag === "li") {
              el.style.fontSize = "12pt";
              el.style.marginBottom = "1pt";
            }
          });
          headings.forEach((el) => {
            if (el.classList.contains("sec-h1")) {
              el.style.marginTop = "4pt";
              el.style.marginBottom = "1.8pt";
              el.style.fontSize = (16.0 * step.hScale).toFixed(1) + "pt";
            } else if (el.classList.contains("sec-h2")) {
              el.style.marginTop = "3pt";
              el.style.marginBottom = "1.2pt";
              el.style.fontSize = (14.0 * step.hScale).toFixed(1) + "pt";
            } else if (el.classList.contains("chapter-title-center")) {
              el.style.marginBottom = "5pt";
              el.style.paddingBottom = "2.5pt";
            }
          });
          tables.forEach((t) => {
            t.style.fontSize = step.tFs;
            t.style.lineHeight = step.tLh;
            t.style.marginBottom = "2.5pt";
          });
          cells.forEach((c) => {
            c.style.padding = step.cPad;
          });
          boxes.forEach((b) => {
            b.style.margin = "2pt 0";
            b.style.padding = "2.5pt 5pt";
          });
          codePres.forEach((pre) => {
            pre.style.fontSize = step.codeFs;
            pre.style.lineHeight = step.codeLh;
          });
          listItems.forEach((li) => {
            li.style.fontSize = step.lFs;
            li.style.lineHeight = step.lLh;
            li.style.marginBottom = step.lMb;
            if (li.classList.contains("toc-chapter-entry")) {
              li.style.marginTop = "3.5pt";
            }
          });
          contentH = inner.scrollHeight;
        }

        // Gentle vertical rhythm balancing for pages with >60px spare height
        contentH = inner.scrollHeight;
        const spare = availH - contentH;
        if (listItems.length >= 10 && spare > 40) {
          const addPerItem = Math.min(6, (spare * 0.72) / listItems.length);
          listItems.forEach((li) => {
            const cur = parseFloat(window.getComputedStyle(li).marginBottom) || 4;
            li.style.marginBottom = (cur + addPerItem).toFixed(2) + "px";
          });
        } else if (spare > 110 && contentH > 200) {
          const children = [...inner.children];
          if (children.length >= 2) {
            const addPerChild = Math.min(14, Math.floor((spare * 0.55) / children.length));
            children.forEach((ch) => {
              const cur = parseFloat(window.getComputedStyle(ch).marginBottom) || 6;
              ch.style.marginBottom = (cur + addPerChild) + "px";
            });
          }
        }
      });
      window.__reportCalibrated = true;
    }

    async function initCalibration() {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }
      calibrateReportPages();
    }

    if (document.readyState === "complete") {
      initCalibration();
    } else {
      window.addEventListener("load", initCalibration);
    }
  </script>
</body>
</html>`;

const outPublicHtml = path.join(rootDir, "frontend", "public", "report", "CSBS_BE_Project_Report_Kannada_SignBridge.html");
const outDocsHtml = path.join(rootDir, "docs", "report", "CSBS_BE_Project_Report_Kannada_SignBridge.html");

fs.mkdirSync(path.dirname(outPublicHtml), { recursive: true });
fs.writeFileSync(outPublicHtml, fullHtml, "utf8");

const pageCount = (fullHtml.match(/class="report-page/g) || []).length;
console.log(`[generate-csbs-report] Generated ${pageCount} A4 pages -> ${outPublicHtml}`);
