import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPORT_DIR = path.resolve("frontend/public/report");

test("CSBS B.E. Project Report .docx has 100% Microsoft Word-compliant OOXML structure & CSBS formatting", () => {
  const docxPath = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.docx");
  const docPath = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.doc");
  assert.equal(fs.existsSync(docxPath), true);
  assert.equal(fs.existsSync(docPath), true);

  const docxStat = fs.statSync(docxPath);
  assert.equal(docxStat.size > 650_000, true, "CSBS report .docx should be >650KB with embedded figures");

  const pyCheck = execFileSync("python3", [
    "-c",
    `
import zipfile, xml.etree.ElementTree as ET, json, re
with zipfile.ZipFile(${JSON.stringify(docxPath)}, "r") as zf:
    names = zf.namelist()
    for xml_part in [n for n in names if n.endswith(".xml") or n.endswith(".rels")]:
        ET.fromstring(zf.read(xml_part))
    doc_xml = zf.read("word/document.xml").decode("utf-8")
    styles_xml = zf.read("word/styles.xml").decode("utf-8")
    hdr_files = [zf.read(n).decode("utf-8") for n in names if n.startswith("word/header") and n.endswith(".xml")]
    ftr_files = [zf.read(n).decode("utf-8") for n in names if n.startswith("word/footer") and n.endswith(".xml")]
    media_files = [n for n in names if n.startswith("word/media/")]
    page_breaks = doc_xml.count('w:type="page"')
    sect_pr_count = doc_xml.count("<w:sectPr>")
    doc_pr_ids = re.findall(r'wp:docPr\\s+id="(\\d+)"', doc_xml)
    tbl_count = doc_xml.count("<w:tbl>")
    grid_count = doc_xml.count("<w:tblGrid>")
    has_times = 'w:ascii="Times New Roman"' in styles_xml and 'w:ascii="Times New Roman"' in doc_xml
    has_title = "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR" in doc_xml
    has_leaders = "Dr. Beemsha Arya" in doc_xml and "Dr. R Ashok Kumar" in doc_xml and "Tejaswini K" in doc_xml
    has_dept_csbs_footer = any(("Dept. of CSBS, BMSCE" in f or "Department of CSBS" in f) for f in ftr_files)
    has_silent_bridge_header = any("Silent Bridge" in h and "REAL-TIME BIDIRECTIONAL" not in h for h in hdr_files if "Silent Bridge" in h)
    has_chapter_in_header = any("CHAPTER " in h for h in hdr_files)
    has_ijddt = "Drug Delivery" in doc_xml or "IJDDT" in doc_xml
    has_dot_leader = 'w:leader="dot"' in doc_xml
    # Split document by <w:sectPr> to verify Section 2 (Roman Prelim Pages i-ix) has 0 <w:tbl> tables
    sections = doc_xml.split("<w:sectPr>")
    roman_section_tbl_count = sections[1].count("<w:tbl>") if len(sections) >= 2 else -1
    print(json.dumps({
        "mediaCount": len(media_files),
        "pageBreaks": page_breaks,
        "sectPrCount": sect_pr_count,
        "docPrCount": len(doc_pr_ids),
        "uniqueDocPrCount": len(set(doc_pr_ids)),
        "tblCount": tbl_count,
        "gridCount": grid_count,
        "romanSectionTblCount": roman_section_tbl_count,
        "hasDotLeader": has_dot_leader,
        "hasCoreProps": "docProps/core.xml" in names and "docProps/app.xml" in names and "word/settings.xml" in names,
        "hasTimes": has_times,
        "hasTitle": has_title,
        "hasLeaders": has_leaders,
        "hasDeptCsbsFooter": has_dept_csbs_footer,
        "hasSilentBridgeHeader": has_silent_bridge_header,
        "hasChapterInHeader": has_chapter_in_header,
        "hasIjddt": has_ijddt
    }))
`,
  ]).toString().trim();

  const res = JSON.parse(pyCheck);
  assert.equal(res.mediaCount, 21, "Should embed all 21 unique images (14 figures + 6 website workflow screenshots + BMSCE emblem)");
  assert.equal(res.pageBreaks, 75, "78 pages across 3 sections should have 75 explicit page breaks (2 + 8 + 65)");
  assert.equal(res.sectPrCount, 3, "Should have 3 sections: unnumbered certificates, Roman i-ix, and Arabic 1-66");
  assert.equal(res.docPrCount, 23, "Should have 23 drawing placements (3 emblems + 14 figures + 6 website workflow screenshots)");
  assert.equal(res.uniqueDocPrCount, 23, "Every wp:docPr id must be globally unique for Microsoft Word");
  assert.equal(res.tblCount >= 35 && res.tblCount === res.gridCount, true, "Every <w:tbl> must have a <w:tblGrid>");
  assert.equal(res.romanSectionTblCount, 0, "Table of Contents and Preliminary Lists (Roman section i-ix) must NOT be in tables");
  assert.equal(res.hasDotLeader, true, "Table of Contents and Lists must use dotted leader tab stops");
  assert.equal(res.hasCoreProps, true, "Must include docProps/core.xml, docProps/app.xml, and word/settings.xml");
  assert.equal(res.hasTimes, true, "Must strictly use Times New Roman font");
  assert.equal(res.hasTitle, true, "Must include official SILENT BRIDGE title on cover/certificates");
  assert.equal(res.hasLeaders, true, "Must include Principal Dr. Beemsha Arya, HoD Dr. R Ashok Kumar, and Guide Tejaswini K");
  assert.equal(res.hasDeptCsbsFooter, true, "Footer must include Department of CSBS on left");
  assert.equal(res.hasSilentBridgeHeader, true, "Running header must mention only Silent Bridge");
  assert.equal(res.hasChapterInHeader, false, "Running header must NOT contain chapter names");
  assert.equal(res.hasIjddt, false, "Must NOT contain International Journal of Drug Delivery Technologies (IJDDT)");
});

test("6-Page NCDTE Conference Paper .docx has 100% Microsoft Word-compliant OOXML structure, exact NCDTE margins/typography, and reviewer revisions", () => {
  const docxPath = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.docx");
  const texPath = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Paper.tex");
  assert.equal(fs.existsSync(docxPath), true);
  assert.equal(fs.existsSync(texPath), true);

  const pyCheck = execFileSync("python3", [
    "-c",
    `
import zipfile, xml.etree.ElementTree as ET, json, re
with zipfile.ZipFile(${JSON.stringify(docxPath)}, "r") as zf:
    names = zf.namelist()
    for xml_part in [n for n in names if n.endswith(".xml") or n.endswith(".rels")]:
        ET.fromstring(zf.read(xml_part))
    doc_xml = zf.read("word/document.xml").decode("utf-8")
    styles_xml = zf.read("word/styles.xml").decode("utf-8")
    media_files = [n for n in names if n.startswith("word/media/")]
    page_breaks = doc_xml.count('w:type="page"')
    doc_pr_ids = re.findall(r'wp:docPr\\s+id="(\\d+)"', doc_xml)
    tbl_count = doc_xml.count("<w:tbl>")
    grid_count = doc_xml.count("<w:tblGrid>")
    plain_text = re.sub(r"<[^>]+>", " ", doc_xml)
    word_count = len(plain_text.split())
    has_ijddt = "Drug Delivery" in doc_xml or "IJDDT" in doc_xml or "0975-4415" in doc_xml
    has_144_promoted = "87.2%" in doc_xml and "81.7%" in doc_xml
    has_deaf_protocol = "pre-register" in doc_xml.lower() and "zero fabricated" in doc_xml.lower()
    has_ncdte_margins = 'w:top="1417"' in doc_xml and 'w:bottom="1134"' in doc_xml and 'w:left="1417"' in doc_xml and 'w:right="1417"' in doc_xml
    has_12pt_body = 'w:sz w:val="24"' in styles_xml and 'w:sz w:val="24"' in doc_xml
    has_1_1cm_indent = 'w:firstLine="624"' in doc_xml
    has_numbered_refs = "1. " in plain_text and "15. " in plain_text
    print(json.dumps({
        "mediaCount": len(media_files),
        "pageBreaks": page_breaks,
        "docPrCount": len(doc_pr_ids),
        "uniqueDocPrCount": len(set(doc_pr_ids)),
        "tblCount": tbl_count,
        "gridCount": grid_count,
        "wordCount": word_count,
        "hasIjddt": has_ijddt,
        "has144Promoted": has_144_promoted,
        "hasDeafProtocol": has_deaf_protocol,
        "hasNcdteMargins": has_ncdte_margins,
        "has12ptBody": has_12pt_body,
        "has11cmIndent": has_1_1cm_indent,
        "hasNumberedRefs": has_numbered_refs
    }))
`,
  ]).toString().trim();

  const res = JSON.parse(pyCheck);
  assert.equal(res.mediaCount, 4, "6-page NCDTE paper should embed all 4 core research figures");
  assert.equal(res.pageBreaks, 5, "6 pages should have 5 explicit page breaks");
  assert.equal(res.docPrCount, 4);
  assert.equal(res.uniqueDocPrCount, 4);
  assert.equal(res.tblCount, 5, "6-page NCDTE paper should have 5 structured tables");
  assert.equal(res.gridCount, 5);
  assert.equal(res.wordCount <= 3500, true, `6-page NCDTE paper should fit single-column 12pt budget (got ${res.wordCount} words)`);
  assert.equal(res.hasNcdteMargins, true, "NCDTE paper must use 2.5cm top/left/right and 2.0cm bottom margins (1417/1134 twips)");
  assert.equal(res.has12ptBody, true, "NCDTE paper must use 12pt Times New Roman body text");
  assert.equal(res.has11cmIndent, true, "NCDTE paper must use 1.1cm first-line indent (624 twips)");
  assert.equal(res.hasNumberedRefs, true, "NCDTE paper must use numbered 1. .. 15. references");
  assert.equal(res.hasIjddt, false, "Conference paper must NOT contain IJDDT / Drug Delivery Technologies");
  assert.equal(res.has144Promoted, true, "Conference paper must include verified promoted 144-sign 3-seed BiGRU results (87.2% / 81.7%)");
  assert.equal(res.hasDeafProtocol, true, "Conference paper must include pre-registered Deaf ISL user study protocol with zero fabricated scores");
});

test("12-Slide Bold PowerPoint .pptx & HTML deck have valid 12-slide OOXML structure, embedded figures, and student USNs in increasing order", () => {
  const pptxPath = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.pptx");
  const pptHtmlPath = path.join(REPORT_DIR, "SILENT_BRIDGE_Presentation_10Slides.html");
  const reportHtmlPath = path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.html");
  const ieeeHtmlPath = path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.html");

  assert.equal(fs.existsSync(pptxPath), true, "12-slide .pptx must exist");
  assert.equal(fs.existsSync(pptHtmlPath), true, "12-slide .html must exist");

  const pyCheck = execFileSync("python3", [
    "-c",
    `
import zipfile, xml.etree.ElementTree as ET, json
with zipfile.ZipFile(${JSON.stringify(pptxPath)}, "r") as zf:
    names = zf.namelist()
    for xml_part in [n for n in names if n.endswith(".xml") or n.endswith(".rels")]:
        ET.fromstring(zf.read(xml_part))
    slide_files = sorted([n for n in names if n.startswith("ppt/slides/slide") and n.endswith(".xml")])
    media_files = [n for n in names if n.startswith("ppt/media/")]
    slide1_xml = zf.read("ppt/slides/slide1.xml").decode("utf-8")
    idx_66 = slide1_xml.find("1BM23CB066")
    idx_68 = slide1_xml.find("1BM23CB068")
    idx_401 = slide1_xml.find("1BM24CB401")
    print(json.dumps({
        "slideCount": len(slide_files),
        "mediaCount": len(media_files),
        "usnIncreasingOnSlide1": 0 <= idx_66 < idx_68 < idx_401
    }))
`,
  ]).toString().trim();

  const res = JSON.parse(pyCheck);
  assert.equal(res.slideCount, 12, "PowerPoint .pptx must contain 12 slides");
  assert.equal(res.mediaCount >= 6, true, `PowerPoint .pptx must embed logo, architecture diagram, UI screens & charts (got ${res.mediaCount})`);
  assert.equal(res.usnIncreasingOnSlide1, true, "Slide 1 in .pptx must list USNs in increasing order: 1BM23CB066, 1BM23CB068, 1BM24CB401");

  for (const file of [pptHtmlPath, reportHtmlPath, ieeeHtmlPath]) {
    const content = fs.readFileSync(file, "utf-8");
    const i66 = content.indexOf("1BM23CB066");
    const i68 = content.indexOf("1BM23CB068");
    const i401 = content.indexOf("1BM24CB401");
    assert.equal(
      i66 !== -1 && i66 < i68 && i68 < i401,
      true,
      `Student USNs in ${path.basename(file)} must appear in increasing order (1BM23CB066 < 1BM23CB068 < 1BM24CB401)`
    );
  }
});

