#!/usr/bin/env python3
"""
Generates authentic Microsoft Word (.docx OpenXML and .doc Word-HTML) documents for:
1. The 76-Page CSBS B.E. Project Report:
   - frontend/public/report/CSBS_BE_Project_Report_Kannada_SignBridge.docx
   - frontend/public/report/SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.docx
   - frontend/public/report/CSBS_BE_Project_Report_Kannada_SignBridge.doc
2. The 8-Page IEEE Format Research Paper:
   - frontend/public/report/SILENT_BRIDGE_IEEE_Research_Paper.docx
   - frontend/public/report/SILENT_BRIDGE_IEEE_Research_Paper.doc
   - docs/paper/kannada_signbridge_ieee.docx

All text, headings, tables, equations, headers, and footers strictly use Times New Roman.
All 14 report figures (7 benchmark PNGs + 7 architectural/UML SVG diagrams) + BMSCE Emblem are embedded.
"""

import base64
import os
import re
import struct
import zipfile
from html.parser import HTMLParser
from xml.sax.saxutils import escape as xml_escape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPORT_DIR = os.path.join(ROOT, "frontend", "public", "report")
DOCS_PAPER_DIR = os.path.join(ROOT, "docs", "paper")
DOCX_MEDIA_DIR = os.path.join(REPORT_DIR, "docx_media")

TITLE = "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR"


def get_image_dimensions(data: bytes, ext: str):
    """Extract (width, height) in pixels from PNG or JPEG bytes."""
    try:
        if ext == "png" and len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
            w, h = struct.unpack(">II", data[16:24])
            return max(1, w), max(1, h)
        if ext in ("jpg", "jpeg") and len(data) > 4 and data[:2] == b"\xff\xd8":
            idx = 2
            while idx < len(data) - 8:
                while idx < len(data) and data[idx] != 0xFF:
                    idx += 1
                while idx < len(data) and data[idx] == 0xFF:
                    idx += 1
                if idx >= len(data):
                    break
                marker = data[idx]
                idx += 1
                if marker in (0xD8, 0xD9) or (0xD0 <= marker <= 0xD7):
                    continue
                if idx + 2 > len(data):
                    break
                seglen = struct.unpack(">H", data[idx : idx + 2])[0]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3) and idx + 7 <= len(data):
                    h, w = struct.unpack(">HH", data[idx + 3 : idx + 7])
                    return max(1, w), max(1, h)
                idx += seglen
    except Exception:
        pass
    return 600, 320


class MediaRegistry:
    def __init__(self):
        self.items = []  # list of dict(rid, filename, ext, content_type, bytes, width, height)
        self.by_hash = {}

    def add_image(self, data: bytes, ext: str):
        ext = ext.lower().replace("jpeg", "jpg")
        key = (len(data), data[:64], data[-64:])
        if key in self.by_hash:
            return self.by_hash[key]
        idx = len(self.items) + 1
        rid = f"rIdImg{idx}"
        filename = f"image{idx}.{ext}"
        ctype = "image/jpeg" if ext == "jpg" else "image/png"
        w, h = get_image_dimensions(data, ext)
        item = {
            "rid": rid,
            "filename": filename,
            "ext": ext,
            "content_type": ctype,
            "bytes": data,
            "width": w,
            "height": h,
        }
        self.items.append(item)
        self.by_hash[key] = item
        return item


def make_drawing_xml(item, max_width_inches=5.6, fixed_width_inches=None):
    w_px, h_px = item["width"], item["height"]
    aspect = h_px / float(max(1, w_px))
    if fixed_width_inches is not None:
        w_in = fixed_width_inches
    else:
        w_in = min(max_width_inches, max(2.2, w_px / 130.0))
    h_in = w_in * aspect
    if h_in > 3.2 and fixed_width_inches is None:
        h_in = 3.2
        w_in = h_in / aspect
    cx = int(w_in * 914400)
    cy = int(h_in * 914400)
    rid = item["rid"]
    doc_pr_id = int(rid.replace("rIdImg", "")) + 100
    return f"""<w:r>
  <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/></w:rPr>
  <w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="{cx}" cy="{cy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="{doc_pr_id}" name="Picture {doc_pr_id}"/>
      <wp:cNvGraphicFramePr>
        <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
      </wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="{doc_pr_id}" name="{item['filename']}"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="{rid}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>
</w:r>"""


def make_run_xml(text: str, bold=False, italic=False, sz_half_pt=24, vert_align=None, color="000000"):
    if not text:
        return ""
    safe = xml_escape(text)
    rpr = [
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>',
        f'<w:sz w:val="{sz_half_pt}"/>',
        f'<w:szCs w:val="{sz_half_pt}"/>',
        f'<w:color w:val="{color}"/>',
    ]
    if bold:
        rpr.append("<w:b/><w:bCs/>")
    if italic:
        rpr.append("<w:i/><w:iCs/>")
    if vert_align in ("superscript", "subscript"):
        rpr.append(f'<w:vertAlign w:val="{vert_align}"/>')
    return f'<w:r><w:rPr>{"".join(rpr)}</w:rPr><w:t xml:space="preserve">{safe}</w:t></w:r>'


def make_para_xml(
    runs_xml: str,
    align="both",
    space_before=0,
    space_after=120,
    line_spacing=360,
    first_line_indent=0,
    border_bottom=False,
    border_box=False,
    shading_fill=None,
    keep_next=False,
):
    ppr = [
        f'<w:jc w:val="{align}"/>',
        f'<w:spacing w:before="{space_before}" w:after="{space_after}" w:line="{line_spacing}" w:lineRule="auto"/>',
    ]
    if first_line_indent > 0:
        ppr.append(f'<w:ind w:firstLine="{first_line_indent}"/>')
    if keep_next:
        ppr.append("<w:keepNext/>")
    if border_bottom:
        ppr.append(
            '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="1E293B"/></w:pBdr>'
        )
    elif border_box:
        ppr.append(
            '<w:pBdr>'
            '<w:top w:val="single" w:sz="6" w:space="4" w:color="334155"/>'
            '<w:left w:val="single" w:sz="12" w:space="6" w:color="0F172A"/>'
            '<w:bottom w:val="single" w:sz="6" w:space="4" w:color="334155"/>'
            '<w:right w:val="single" w:sz="6" w:space="4" w:color="334155"/>'
            '</w:pBdr>'
        )
    if shading_fill:
        ppr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{shading_fill}"/>')
    return f'<w:p><w:pPr>{"".join(ppr)}</w:pPr>{runs_xml}</w:p>'


class InlineRunExtractor(HTMLParser):
    """Parses inline HTML fragment into Word <w:r> elements."""

    def __init__(self, default_sz=24, default_bold=False, default_italic=False, default_color="000000"):
        super().__init__()
        self.default_sz = default_sz
        self.bold_stack = [default_bold]
        self.italic_stack = [default_italic]
        self.vert_stack = [None]
        self.runs = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr_dict = dict(attrs)
        cls = attr_dict.get("class", "")
        style = attr_dict.get("style", "")
        is_bold = self.bold_stack[-1] or tag in ("strong", "b", "th") or "font-weight:700" in style or "font-weight:bold" in style
        is_italic = self.italic_stack[-1] or tag in ("em", "i") or "math-inline" in cls or "ieee-math" in cls or "font-style:italic" in style
        vert = self.vert_stack[-1]
        if tag == "sup":
            vert = "superscript"
        elif tag == "sub":
            vert = "subscript"
        elif tag == "br":
            self.runs.append('<w:r><w:br/></w:r>')
        self.bold_stack.append(is_bold)
        self.italic_stack.append(is_italic)
        self.vert_stack.append(vert)

    def handle_endtag(self, tag):
        if len(self.bold_stack) > 1:
            self.bold_stack.pop()
            self.italic_stack.pop()
            self.vert_stack.pop()

    def handle_data(self, data):
        text = re.sub(r"\s+", " ", data)
        if not text:
            return
        self.runs.append(
            make_run_xml(
                text,
                bold=self.bold_stack[-1],
                italic=self.italic_stack[-1],
                sz_half_pt=self.default_sz,
                vert_align=self.vert_stack[-1],
            )
        )


def html_fragment_to_runs(fragment: str, sz_half_pt=24, bold=False, italic=False):
    parser = InlineRunExtractor(default_sz=sz_half_pt, default_bold=bold, default_italic=italic)
    parser.feed(fragment)
    return "".join(parser.runs)


def parse_html_table_to_word(table_html: str, sz_half_pt=20):
    """Convert an HTML <table>...</table> into a formatted OpenXML <w:tbl>."""
    rows = re.findall(r"<tr([^>]*)>(.*?)</tr>", table_html, flags=re.S | re.I)
    if not rows:
        return ""
    tr_xmls = []
    for r_idx, (tr_attrs, tr_inner) in enumerate(rows):
        cells = re.findall(r"<(th|td)([^>]*)>(.*?)</\1>", tr_inner, flags=re.S | re.I)
        if not cells:
            continue
        is_bold_row = "ieee-row-bold" in tr_attrs or "toc-ch" in tr_attrs
        tc_xmls = []
        for tag, cell_attrs, cell_inner in cells:
            is_th = tag.lower() == "th"
            colspan_m = re.search(r'colspan=["\']?(\d+)', cell_attrs, flags=re.I)
            grid_span = f'<w:gridSpan w:val="{colspan_m.group(1)}"/>' if colspan_m else ""
            align = "left"
            if 'class="r"' in cell_attrs or " r" in cell_attrs or "text-align:right" in cell_attrs:
                align = "right"
            elif 'class="c"' in cell_attrs or "text-align:center" in cell_attrs:
                align = "center"
            shd = ""
            if is_th:
                shd = '<w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/>'
            elif is_bold_row:
                shd = '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
            runs = html_fragment_to_runs(
                cell_inner.strip(),
                sz_half_pt=sz_half_pt,
                bold=(is_th or is_bold_row),
            )
            if not runs:
                runs = make_run_xml("", sz_half_pt=sz_half_pt)
            p_xml = make_para_xml(runs, align=align, space_before=20, space_after=20, line_spacing=260)
            tc_xmls.append(
                f"<w:tc><w:tcPr>{grid_span}{shd}<w:vAlign w:val=\"center\"/></w:tcPr>{p_xml}</w:tc>"
            )
        tr_xmls.append(f"<w:tr>{''.join(tc_xmls)}</w:tr>")

    return f"""<w:tbl>
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
      <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="45" w:type="dxa"/>
      <w:left w:w="75" w:type="dxa"/>
      <w:bottom w:w="45" w:type="dxa"/>
      <w:right w:w="75" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
  {''.join(tr_xmls)}
</w:tbl>"""


def register_embedded_img(img_tag: str, media: MediaRegistry, base_dir: str):
    src_m = re.search(r'src=["\']([^"\']+)["\']', img_tag)
    if not src_m:
        return None
    src = src_m.group(1)
    if src.startswith("data:image/"):
        m = re.match(r"data:image/([a-zA-Z0-9+]+);base64,(.+)", src, flags=re.S)
        if m:
            ext = m.group(1)
            raw = base64.b64decode(m.group(2))
            return media.add_image(raw, ext)
    else:
        rel = src.lstrip("/")
        if rel.startswith("report/"):
            rel = rel[len("report/") :]
        candidate = os.path.join(base_dir, rel)
        if os.path.exists(candidate):
            ext = os.path.splitext(candidate)[1].lstrip(".") or "png"
            with open(candidate, "rb") as f:
                return media.add_image(f.read(), ext)
    return None


def build_prelim_cover_or_title_word(page_html: str, media: MediaRegistry, is_inner_title=False):
    """Render Cover Page (Page 1) or Inner Title Page (Page 2, i) into clean centered Word paragraphs."""
    out = []
    out.append(
        make_para_xml(
            make_run_xml("B.M.S COLLEGE OF ENGINEERING", bold=True, sz_half_pt=36),
            align="center",
            space_before=40,
            space_after=40,
            line_spacing=280,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml(
                "(Autonomous Institute Affiliated to VTU)\nBull Temple Road, Basavanagudi, Bangalore – 560019",
                bold=True,
                sz_half_pt=24,
            ),
            align="center",
            space_before=0,
            space_after=120,
            line_spacing=280,
        )
    )
    img_m = re.search(r"<img[^>]+>", page_html)
    if img_m:
        item = register_embedded_img(img_m.group(0), media, REPORT_DIR)
        if item:
            out.append(
                make_para_xml(
                    make_drawing_xml(item, fixed_width_inches=1.05),
                    align="center",
                    space_before=40,
                    space_after=120,
                )
            )
    if is_inner_title:
        out.append(
            make_para_xml(
                make_run_xml("Inner Title Page", italic=True, sz_half_pt=24),
                align="center",
                space_after=60,
            )
        )
        out.append(
            make_para_xml(
                make_run_xml(f"“{TITLE}”", bold=True, sz_half_pt=28),
                align="center",
                space_before=40,
                space_after=140,
                line_spacing=300,
            )
        )
        out.append(
            make_para_xml(
                make_run_xml(
                    "A Major Project Report submitted in partial fulfillment of the requirements for the award of the degree of",
                    sz_half_pt=24,
                ),
                align="center",
                space_after=80,
            )
        )
    else:
        out.append(
            make_para_xml(
                make_run_xml("A Project Report on", sz_half_pt=24),
                align="center",
                space_after=60,
            )
        )
        out.append(
            make_para_xml(
                make_run_xml(f"“{TITLE}”", bold=True, sz_half_pt=28),
                align="center",
                space_before=40,
                space_after=140,
                line_spacing=300,
            )
        )
        out.append(
            make_para_xml(
                make_run_xml(
                    "Submitted in partial fulfillment of the requirements for the award of degree of",
                    sz_half_pt=24,
                ),
                align="center",
                space_after=80,
            )
        )

    out.append(
        make_para_xml(
            make_run_xml("BACHELOR OF ENGINEERING\nIN\nCOMPUTER SCIENCE AND BUSINESS SYSTEMS", bold=True, sz_half_pt=28),
            align="center",
            space_after=140,
            line_spacing=300,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("Submitted by", bold=True, italic=True, sz_half_pt=24),
            align="center",
            space_after=40,
        )
    )
    for student in [
        "Kiran M K – 1BM23CB068",
        "Manoj G U – 1BM24CB401",
        "H S Thanush – 1BM23CB066",
    ]:
        out.append(
            make_para_xml(
                make_run_xml(student, bold=True, sz_half_pt=24),
                align="center",
                space_after=30,
                line_spacing=260,
            )
        )

    out.append(
        make_para_xml(
            make_run_xml("Under the guidance of", bold=True, italic=True, sz_half_pt=24),
            align="center",
            space_before=100,
            space_after=30,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("Tejaswini K", bold=True, sz_half_pt=26),
            align="center",
            space_after=20,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("Assistant Professor, Department of CSBS, BMSCE", sz_half_pt=24),
            align="center",
            space_after=140,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("Department of Computer Science and Business Systems", bold=True, sz_half_pt=26),
            align="center",
            space_after=30,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml(
                "B.M.S College of Engineering, Bull Temple Road, Basavanagudi, Bangalore - 560019\n2026-2027",
                bold=True,
                sz_half_pt=24,
            ),
            align="center",
            space_after=60,
            line_spacing=280,
        )
    )
    if is_inner_title:
        out.append(
            make_para_xml(make_run_xml("i", bold=True, sz_half_pt=22), align="center", space_before=80, space_after=0)
        )
    return "".join(out)


def build_certificate_page_word(page_html: str, media: MediaRegistry):
    out = []
    img_m = re.search(r"<img[^>]+>", page_html)
    if img_m:
        item = register_embedded_img(img_m.group(0), media, REPORT_DIR)
        if item:
            out.append(
                make_para_xml(
                    make_drawing_xml(item, fixed_width_inches=0.95),
                    align="center",
                    space_before=20,
                    space_after=60,
                )
            )
    out.append(
        make_para_xml(
            make_run_xml("B.M.S COLLEGE OF ENGINEERING", bold=True, sz_half_pt=32),
            align="center",
            space_after=30,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml(
                "(Autonomous Institute Affiliated to VTU) Bull Temple Road, Basavanagudi, Bangalore – 560019",
                bold=True,
                sz_half_pt=22,
            ),
            align="center",
            space_after=80,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("Department of Computer Science and Business Systems", bold=True, sz_half_pt=28),
            align="center",
            space_after=120,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("CERTIFICATE", bold=True, sz_half_pt=32),
            align="center",
            space_after=160,
        )
    )
    cert_p = re.search(r"<p[^>]*>(.*?)</p>", page_html, flags=re.S)
    if cert_p:
        out.append(
            make_para_xml(
                html_fragment_to_runs(cert_p.group(1), sz_half_pt=24),
                align="both",
                space_after=280,
                line_spacing=360,
            )
        )
    sig_table = """<table>
      <tr>
        <td class="c"><strong>Tejaswini K</strong><br/>Assistant Professor &amp; Guide,<br/>Dept. of CSBS, BMSCE, Bangalore</td>
        <td class="c"><strong>Dr. R Ashok Kumar</strong><br/>Professor &amp; Head,<br/>Dept. of CSBS, BMSCE, Bangalore</td>
        <td class="c"><strong>Dr. Beemsha Arya</strong><br/>Professor and Principal,<br/>BMSCE, Bangalore</td>
      </tr>
    </table>"""
    out.append(parse_html_table_to_word(sig_table, sz_half_pt=22))
    out.append(
        make_para_xml(
            make_run_xml("Examiners:", bold=True, sz_half_pt=24),
            align="left",
            space_before=220,
            space_after=80,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("1. Name & Signature of Examiner 1: ____________________________________________", sz_half_pt=24),
            align="left",
            space_after=120,
        )
    )
    out.append(
        make_para_xml(
            make_run_xml("2. Name & Signature of Examiner 2: ____________________________________________", sz_half_pt=24),
            align="left",
            space_after=140,
        )
    )
    out.append(
        make_para_xml(make_run_xml("ii", bold=True, sz_half_pt=22), align="center", space_before=120, space_after=0)
    )
    return "".join(out)


def convert_blocks_to_word(inner_html: str, media: MediaRegistry, svg_counter_ref: list, is_ieee=False):
    """
    Tokenizes a page's inner content into ordered structural blocks
    (headings, paragraphs, tables, figures, equations, algorithms, code blocks, lists)
    and converts each into clean OpenXML paragraphs/tables in 100% Times New Roman.
    """
    out = []
    # Match top-level structural elements in order
    token_re = re.compile(
        r'(<div\s+class="chapter-num-header"[^>]*>.*?</div>'
        r'|<div\s+class="chapter-title-center"[^>]*>.*?</div>'
        r'|<h1[^>]*>.*?</h1>'
        r'|<h2[^>]*>.*?</h2>'
        r'|<h3[^>]*>.*?</h3>'
        r'|<div\s+class="sec-h1"[^>]*>.*?</div>'
        r'|<div\s+class="sec-h2"[^>]*>.*?</div>'
        r'|<div\s+class="table-caption"[^>]*>.*?</div>'
        r'|<div\s+class="ieee-table-cap"[^>]*>.*?</div>'
        r'|<table[^>]*>.*?</table>'
        r'|<div\s+class="figure-box"[^>]*>.*?</div>'
        r'|<div\s+class="ieee-fig-box"[^>]*>.*?</div>'
        r'|<div\s+class="ieee-fig-wide"[^>]*>.*?</div>'
        r'|<div\s+class="eq-row"[^>]*>.*?</div>'
        r'|<div\s+class="ieee-eq"[^>]*>.*?</div>'
        r'|<div\s+class="alg-box"[^>]*>.*?</div>'
        r'|<div\s+class="ieee-alg-box"[^>]*>.*?</div>'
        r'|<div\s+class="code-box"[^>]*>.*?</div>'
        r'|<ol[^>]*>.*?</ol>'
        r'|<ul[^>]*>.*?</ul>'
        r'|<p[^>]*>.*?</p>)',
        flags=re.S | re.I,
    )

    body_sz = 20 if is_ieee else 24
    line_sp = 276 if is_ieee else 360

    for m in token_re.finditer(inner_html):
        block = m.group(0)
        b_lower = block.lower()

        if 'class="chapter-num-header"' in b_lower:
            inner = re.sub(r"^<div[^>]*>|</div>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=36, bold=True),
                    align="center",
                    space_before=40,
                    space_after=40,
                    line_spacing=280,
                    keep_next=True,
                )
            )
        elif 'class="chapter-title-center"' in b_lower or b_lower.startswith("<h1"):
            inner = re.sub(r"^<(?:div|h1)[^>]*>|</(?:div|h1)>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=36, bold=True),
                    align="center",
                    space_before=20,
                    space_after=140,
                    line_spacing=280,
                    border_bottom=not is_ieee,
                    keep_next=True,
                )
            )
        elif 'class="sec-h1"' in b_lower or b_lower.startswith("<h2"):
            inner = re.sub(r"^<(?:div|h2)[^>]*>|</(?:div|h2)>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=(24 if is_ieee else 32), bold=True),
                    align="center" if is_ieee else "left",
                    space_before=140,
                    space_after=60,
                    line_spacing=280,
                    keep_next=True,
                )
            )
        elif 'class="sec-h2"' in b_lower or b_lower.startswith("<h3"):
            inner = re.sub(r"^<(?:div|h3)[^>]*>|</(?:div|h3)>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=(22 if is_ieee else 28), bold=True, italic=is_ieee),
                    align="left",
                    space_before=100,
                    space_after=40,
                    line_spacing=280,
                    keep_next=True,
                )
            )
        elif 'class="table-caption"' in b_lower or 'class="ieee-table-cap"' in b_lower:
            inner = re.sub(r"^<div[^>]*>|</div>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=20, bold=True),
                    align="center",
                    space_before=100,
                    space_after=40,
                    line_spacing=260,
                    keep_next=True,
                )
            )
        elif b_lower.startswith("<table"):
            out.append(parse_html_table_to_word(block, sz_half_pt=(18 if is_ieee else 20)))
        elif (
            'class="figure-box"' in b_lower
            or 'class="ieee-fig-box"' in b_lower
            or 'class="ieee-fig-wide"' in b_lower
        ):
            img_m = re.search(r"<img[^>]+>", block)
            item = None
            if img_m:
                item = register_embedded_img(img_m.group(0), media, REPORT_DIR)
            elif "<svg" in b_lower:
                svg_counter_ref[0] += 1
                svg_png_path = os.path.join(DOCX_MEDIA_DIR, f"svg_fig_{svg_counter_ref[0]}.png")
                if os.path.exists(svg_png_path):
                    with open(svg_png_path, "rb") as sf:
                        item = media.add_image(sf.read(), "png")
            if item:
                out.append(
                    make_para_xml(
                        make_drawing_xml(item, max_width_inches=(5.8 if not is_ieee else 3.1)),
                        align="center",
                        space_before=80,
                        space_after=40,
                        keep_next=True,
                    )
                )
            cap_m = re.search(
                r'<div\s+class="(?:figure-caption|ieee-fig-cap)"[^>]*>(.*?)</div>',
                block,
                flags=re.S | re.I,
            )
            if cap_m:
                out.append(
                    make_para_xml(
                        html_fragment_to_runs(cap_m.group(1).strip(), sz_half_pt=20, bold=True, italic=True),
                        align="center",
                        space_before=20,
                        space_after=100,
                        line_spacing=260,
                    )
                )
        elif 'class="eq-row"' in b_lower or 'class="ieee-eq"' in b_lower:
            inner = re.sub(r"^<div[^>]*>|</div>$", "", block, flags=re.S).strip()
            inner = re.sub(r"</?span[^>]*>", " ", inner)
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=body_sz, italic=True),
                    align="center",
                    space_before=60,
                    space_after=60,
                    line_spacing=280,
                    border_box=True,
                    shading_fill="F8FAFC",
                )
            )
        elif 'class="alg-box"' in b_lower or 'class="ieee-alg-box"' in b_lower or 'class="code-box"' in b_lower:
            lines = re.findall(r"<div[^>]*>(.*?)</div>|<pre[^>]*>(.*?)</pre>", block, flags=re.S | re.I)
            if lines:
                for idx_l, (d_txt, p_txt) in enumerate(lines):
                    content = d_txt if d_txt else p_txt
                    if "<div" in content:
                        continue
                    for subline in content.split("\n"):
                        subline_clean = subline.strip()
                        if not subline_clean:
                            continue
                        out.append(
                            make_para_xml(
                                html_fragment_to_runs(subline_clean, sz_half_pt=19, bold=(idx_l == 0)),
                                align="left",
                                space_before=15,
                                space_after=15,
                                line_spacing=240,
                                shading_fill="F8FAFC",
                            )
                        )
        elif b_lower.startswith("<ol") or b_lower.startswith("<ul"):
            is_ordered = b_lower.startswith("<ol")
            items = re.findall(r"<li[^>]*>(.*?)</li>", block, flags=re.S | re.I)
            for idx_item, li_inner in enumerate(items, 1):
                prefix = f"{idx_item}. " if is_ordered else "• "
                # Flatten any nested grid spans inside IEEE references
                li_clean = re.sub(r"</?span[^>]*>", " ", li_inner).strip()
                runs = make_run_xml(prefix, bold=True, sz_half_pt=body_sz) + html_fragment_to_runs(
                    li_clean, sz_half_pt=body_sz
                )
                out.append(
                    make_para_xml(
                        runs,
                        align="both",
                        space_before=20,
                        space_after=40,
                        line_spacing=line_sp,
                    )
                )
        elif b_lower.startswith("<p"):
            inner = re.sub(r"^<p[^>]*>|</p>$", "", block, flags=re.S).strip()
            out.append(
                make_para_xml(
                    html_fragment_to_runs(inner, sz_half_pt=body_sz),
                    align="both",
                    space_before=0,
                    space_after=80,
                    line_spacing=line_sp,
                    first_line_indent=360,
                )
            )

    return "".join(out)


def write_docx_package(
    output_path: str,
    body_xml: str,
    media: MediaRegistry,
    header_right_text: str,
    two_column: bool = False,
):
    """Packages body_xml, styles, headers, footers, and embedded media into a valid .docx ZIP archive."""
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '  <Default Extension="xml" ContentType="application/xml"/>',
        '  <Default Extension="png" ContentType="image/png"/>',
        '  <Default Extension="jpg" ContentType="image/jpeg"/>',
        '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
        '  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
        '  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
        '  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>',
        '  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>',
        '</Types>',
    ]

    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
        '  <Relationship Id="rIdFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
        '  <Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
        '  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
    ]
    for item in media.items:
        doc_rels.append(
            f'  <Relationship Id="{item["rid"]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{item["filename"]}"/>'
        )
    doc_rels.append("</Relationships>")

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="kn-IN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="360" w:lineRule="auto"/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>"""

    font_table_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>"""

    header1_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr>
      <w:spacing w:after="80" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="both"/>
    </w:pPr>
    {make_run_xml(TITLE + "   |   " + header_right_text, bold=True, italic=True, sz_half_pt=16)}
  </w:p>
</w:hdr>"""

    footer1_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="64748B"/></w:pBdr>
      <w:spacing w:before="60" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
      <w:t xml:space="preserve">Dept. of Computer Science and Business Systems, B.M.S. College of Engineering, Bangalore   —   Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE">
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>
          <w:b/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>1</w:t>
      </w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>"""

    cols_xml = '<w:cols w:num="2" w:space="288"/>' if two_column else '<w:cols w:space="720"/>'
    # Exact CSBS A4 margins: Left 1.25" (1800 dxa), Right 1.0" (1440 dxa), Top 0.75" (1080 dxa), Bottom 0.75" (1080 dxa)
    sect_pr = f"""<w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader1"/>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1080" w:right="1440" w:bottom="1080" w:left="1800" w:header="540" w:footer="540" w:gutter="0"/>
      {cols_xml}
    </w:sectPr>"""

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    {body_xml}
    {sect_pr}
  </w:body>
</w:document>"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "\n".join(content_types))
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("word/_rels/document.xml.rels", "\n".join(doc_rels))
        zf.writestr("word/styles.xml", styles_xml)
        zf.writestr("word/fontTable.xml", font_table_xml)
        zf.writestr("word/header1.xml", header1_xml)
        zf.writestr("word/footer1.xml", footer1_xml)
        zf.writestr("word/document.xml", document_xml)
        for item in media.items:
            zf.writestr(f"word/media/{item['filename']}", item["bytes"])


def generate_csbs_76page_report_docx():
    html_path = os.path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    pages = re.findall(r'<section class="report-page[^"]*"[^>]*>.*?</section>', html, flags=re.S)
    media = MediaRegistry()
    svg_counter_ref = [0]
    page_xml_chunks = []

    for idx, page_html in enumerate(pages):
        if idx == 0:
            chunk = build_prelim_cover_or_title_word(page_html, media, is_inner_title=False)
        elif idx == 1:
            chunk = build_prelim_cover_or_title_word(page_html, media, is_inner_title=True)
        elif idx == 2:
            chunk = build_certificate_page_word(page_html, media)
        else:
            # Extract running header right label if present
            hdr_m = re.search(
                r'<div class="page-running-header"[^>]*>.*?<span[^>]*>.*?</span>\s*<span[^>]*>(.*?)</span>\s*</div>',
                page_html,
                flags=re.S,
            )
            page_chunks = []
            if hdr_m:
                right_lbl = re.sub(r"<[^>]+>", "", hdr_m.group(1)).strip()
                page_chunks.append(
                    make_para_xml(
                        make_run_xml(f"{TITLE}  —  {right_lbl}", italic=True, sz_half_pt=18, color="334155"),
                        align="right",
                        space_before=0,
                        space_after=80,
                        line_spacing=240,
                        border_bottom=True,
                    )
                )
            page_chunks.append(convert_blocks_to_word(page_html, media, svg_counter_ref, is_ieee=False))
            # Check for Roman or Arabic page footer label
            ftr_m = re.search(
                r'<div class="page-footer-(?:roman|arabic)"[^>]*>(.*?)</div>', page_html, flags=re.S
            )
            if ftr_m:
                pno = re.sub(r"<[^>]+>", "", ftr_m.group(1)).strip()
                page_chunks.append(
                    make_para_xml(
                        make_run_xml(f"— {pno} —", bold=True, sz_half_pt=20),
                        align="center",
                        space_before=80,
                        space_after=0,
                    )
                )
            chunk = "".join(page_chunks)

        if idx < len(pages) - 1:
            chunk += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
        page_xml_chunks.append(chunk)

    body_xml = "".join(page_xml_chunks)
    out1 = os.path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.docx")
    out2 = os.path.join(REPORT_DIR, "SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.docx")
    write_docx_package(out1, body_xml, media, "B.E. Project Report (Dept. of CSBS, BMSCE)", two_column=False)
    write_docx_package(out2, body_xml, media, "B.E. Project Report (Dept. of CSBS, BMSCE)", two_column=False)
    print(f"[generate_word_docs] Wrote 76-page CSBS Report .docx ({len(pages)} pages, {len(media.items)} embedded images) -> {out1}")


def generate_ieee_paper_docx():
    html_path = os.path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    pages = re.findall(r'<section class="ieee-page"[^>]*>.*?</section>', html, flags=re.S)
    media = MediaRegistry()
    svg_counter_ref = [0]
    page_xml_chunks = []

    # Title & Author header block at top of Page 1
    header_intro = [
        make_para_xml(
            make_run_xml(
                "INTERNATIONAL JOURNAL OF DRUG DELIVERY TECHNOLOGIES (IJDDT) · ISSN: 0975-4415 · SCOPUS INDEXED Q3 · VOL. 16, NO. 7, 2026",
                bold=True,
                italic=True,
                sz_half_pt=18,
            ),
            align="center",
            space_before=0,
            space_after=60,
            border_bottom=True,
        ),
        make_para_xml(
            make_run_xml(TITLE, bold=True, sz_half_pt=32),
            align="center",
            space_before=60,
            space_after=100,
            line_spacing=280,
        ),
        make_para_xml(
            make_run_xml(
                "Kiran M K (1BM23CB068), Manoj G U (1BM24CB401), H S Thanush (1BM23CB066), and Tejaswini K (Assistant Professor & Project Guide)",
                bold=True,
                sz_half_pt=20,
            ),
            align="center",
            space_before=0,
            space_after=30,
        ),
        make_para_xml(
            make_run_xml(
                "Department of Computer Science and Business Systems, B.M.S. College of Engineering, Bangalore – 560019, India",
                italic=True,
                sz_half_pt=18,
            ),
            align="center",
            space_before=0,
            space_after=120,
            border_bottom=True,
        ),
    ]
    page_xml_chunks.append("".join(header_intro))

    for idx, page_html in enumerate(pages):
        chunk = convert_blocks_to_word(page_html, media, svg_counter_ref, is_ieee=True)
        if idx < len(pages) - 1:
            chunk += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
        page_xml_chunks.append(chunk)

    body_xml = "".join(page_xml_chunks)
    out1 = os.path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.docx")
    out2 = os.path.join(DOCS_PAPER_DIR, "kannada_signbridge_ieee.docx")
    write_docx_package(out1, body_xml, media, "IJDDT · ISSN: 0975-4415 · Vol. 16, No. 7, 2026", two_column=False)
    write_docx_package(out2, body_xml, media, "IJDDT · ISSN: 0975-4415 · Vol. 16, No. 7, 2026", two_column=False)
    print(f"[generate_word_docs] Wrote 8-page IEEE Research Paper .docx ({len(pages)} pages, {len(media.items)} embedded images) -> {out1}")


def inline_images_for_word_html(html_text: str):
    """Ensure all /report/*.png images are base64-inlined and strip the sticky web preview toolbar for .doc export."""
    # Remove preview toolbar
    html_clean = re.sub(
        r'<div class="(?:report-toolbar|ieee-toolbar)[^"]*"[^>]*>.*?</div>\s*</div>',
        "",
        html_text,
        count=1,
        flags=re.S,
    )

    def repl_img(m):
        tag = m.group(0)
        src_m = re.search(r'src=["\'](/report/[^"\']+)["\']', tag)
        if not src_m:
            return tag
        rel = src_m.group(1)[len("/report/") :]
        fpath = os.path.join(REPORT_DIR, rel)
        if not os.path.exists(fpath):
            return tag
        with open(fpath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return tag.replace(src_m.group(1), f"data:image/png;base64,{b64}")

    html_clean = re.sub(r"<img[^>]+>", repl_img, html_clean)
    word_header = """<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">"""
    html_clean = html_clean.replace('<html lang="en">', word_header)
    return html_clean


def generate_word_compatible_doc_files():
    rep_html_path = os.path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.html")
    with open(rep_html_path, "r", encoding="utf-8") as f:
        rep_doc = inline_images_for_word_html(f.read())
    out_rep_doc = os.path.join(REPORT_DIR, "CSBS_BE_Project_Report_Kannada_SignBridge.doc")
    with open(out_rep_doc, "w", encoding="utf-8") as f:
        f.write(rep_doc)

    ieee_html_path = os.path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.html")
    with open(ieee_html_path, "r", encoding="utf-8") as f:
        ieee_doc = inline_images_for_word_html(f.read())
    out_ieee_doc = os.path.join(REPORT_DIR, "SILENT_BRIDGE_IEEE_Research_Paper.doc")
    with open(out_ieee_doc, "w", encoding="utf-8") as f:
        f.write(ieee_doc)
    print(f"[generate_word_docs] Wrote Word-compatible .doc files -> {out_rep_doc} and {out_ieee_doc}")


if __name__ == "__main__":
    generate_csbs_76page_report_docx()
    generate_ieee_paper_docx()
    generate_word_compatible_doc_files()
