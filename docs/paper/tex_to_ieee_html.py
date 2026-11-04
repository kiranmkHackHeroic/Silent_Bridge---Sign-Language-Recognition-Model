"""Render kannada_signbridge_ieee.tex as an IEEE-conference-styled HTML page (two columns, Times, US Letter), so a
PDF can be printed with Edge/Chrome when no LaTeX installation is available. Handles only the LaTeX subset used in
this paper; the .tex file stays the authoritative source (compile it with IEEEtran for submission).

Usage:  python tex_to_ieee_html.py kannada_signbridge_ieee.tex kannada_signbridge_ieee.html
"""
import html
import re
import sys

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"]
MATH = {r"\lambda": "λ", r"\sigma": "σ", r"\rightarrow": "→", r"\mid": "|", r"\log": "log", r"\,": "&#8202;",
        r"\quad": " ", r"\times": "×", r"\geq": "≥", r"\leq": "≤", r"\tau": "τ", r"\pm": "±", r"\leftarrow": "←",
        r"\ldots": "…", r"\in": "∈"}
ALGO_KEYWORDS = {r"\AND": "<b>and</b>", r"\OR": "<b>or</b>", r"\NOT": "<b>not</b>"}


def render_algorithm(tok: str, cites: dict, number: str) -> str:
    """algorithm + algorithmic (uppercase commands) -> numbered pseudocode block."""
    cap = inline(re.search(r"\\caption\{(.*?)\}\n", tok, re.S).group(1), cites)
    body = re.search(r"\\begin\{algorithmic\}(?:\[\d+\])?(.*?)\\end\{algorithmic\}", tok, re.S).group(1)
    for k, v in ALGO_KEYWORDS.items():
        body = body.replace(k + " ", v + " ")
    lines, depth, n = [], 0, 0

    def add(text, numbered=True, indent=None):
        nonlocal n
        n += numbered
        num = f'<span class="aln">{n}:</span>' if numbered else '<span class="aln"></span>'
        pad = (depth if indent is None else indent) * 1.1
        lines.append(f'<div class="al">{num}<span class="alt" style="padding-left:{pad}em">{text}</span></div>')

    for raw in re.findall(r"\\(REQUIRE|ENSURE|STATE|FOR|ENDFOR|IF|ELSIF|ELSE|ENDIF|WHILE|ENDWHILE|RETURN)\b((?:(?!\\(?:REQUIRE|ENSURE|STATE|FOR|ENDFOR|IF|ELSIF|ELSE|ENDIF|WHILE|ENDWHILE|RETURN)\b).)*)", body, re.S):
        cmd, rest = raw[0], raw[1].strip()
        arg = rest[1:-1] if rest.startswith("{") and rest.endswith("}") else rest
        text = inline(arg, cites)
        if cmd in ("REQUIRE", "ENSURE"):
            add(f"<b>{'Require' if cmd == 'REQUIRE' else 'Ensure'}:</b> {text}", numbered=False)
        elif cmd == "STATE":
            add(text)
        elif cmd in ("FOR", "WHILE"):
            add(f"<b>{cmd.lower()}</b> {text} <b>do</b>")
            depth += 1
        elif cmd == "IF":
            add(f"<b>if</b> {text} <b>then</b>")
            depth += 1
        elif cmd == "ELSIF":
            add(f"<b>else if</b> {text} <b>then</b>", indent=depth - 1)
        elif cmd == "ELSE":
            add("<b>else</b>", indent=depth - 1)
        elif cmd in ("ENDFOR", "ENDWHILE", "ENDIF"):
            depth -= 1
            add(f"<b>end {cmd[3:].lower()}</b>")
        elif cmd == "RETURN":
            add(f"<b>return</b> {text}")
    return (f'<div class="algo"><div class="acap"><b>Algorithm {number}</b> {cap}</div>'
            f'<div class="abody">{"".join(lines)}</div></div>')


def inline(s: str, cites: dict) -> str:
    s = s.replace("{,}", ",")
    s = re.sub(r"\\ref\{([^}]+)\}", lambda m: LABELS.get(m.group(1), "?"), s)
    s = s.replace("~", "&nbsp;").replace("---", "—").replace("--", "–").replace("``", "“").replace("''", "”")

    def math(m):
        t = m.group(1)
        for k, v in MATH.items():
            t = t.replace(k, v)
        t = re.sub(r"\{=\}", "=", t)
        t = re.sub(r"\^\{([^}]*)\}", r"<sup>\1</sup>", t)
        t = re.sub(r"\^(\w)", r"<sup>\1</sup>", t)
        t = re.sub(r"_\{\\mathrm\{([^}]*)\}\}", r"<sub>\1</sub>", t)
        t = re.sub(r"_\{([^}]*)\}", r"<sub>\1</sub>", t)
        t = re.sub(r"_(\w)", r"<sub>\1</sub>", t)
        t = t.replace("{", "").replace("}", "")
        t = re.sub(r"(?<![<\w/])([A-Za-z])(?![\w>])", r"<i>\1</i>", t)
        return t

    s = re.sub(r"\$([^$]+)\$", math, s)
    s = re.sub(r"\\cite\{([^}]+)\}", lambda m: "[" + "], [".join(str(cites[k.strip()]) for k in m.group(1).split(",")) + "]", s)
    s = re.sub(r"Table~?\\ref\{([^}]+)\}", lambda m: "Table " + LABELS.get(m.group(1), "?"), s)
    s = re.sub(r"Fig\.~?\\ref\{([^}]+)\}", lambda m: "Fig. " + LABELS.get(m.group(1), "?"), s)
    s = re.sub(r"Section~?([IVX]+)", r"Section \1", s)
    for _ in range(3):
        s = re.sub(r"\\textbf\{([^{}]*)\}", r"<b>\1</b>", s)
        s = re.sub(r"\\textit\{([^{}]*)\}", r"<i>\1</i>", s)
        s = re.sub(r"\\texttt\{([^{}]*)\}", r"<code>\1</code>", s)
        s = re.sub(r"\\footnotesize\s*", "", s)
    s = s.replace(r"\%", "%").replace(r"\&", "&amp;").replace(r"\_", "_").replace("{,}", ",")
    s = s.replace(r"\'a", "á").replace(r"\ ", " ").replace(r"i.e.\ ", "i.e. ").replace("\\\\", "<br>")
    s = s.replace(r"\,", "&#8202;")
    return s.strip()


LABELS: dict = {}
WIDE_BEFORE_SECTION = int(sys.argv[3]) if len(sys.argv) > 3 else 0
SECTION_POS: list = []


def main(src, dst):
    tex = open(src, encoding="utf-8").read()
    body = tex.split(r"\maketitle", 1)[1].split(r"\end{document}")[0]
    title = re.search(r"\\title\{(.+?)\}\n", tex, re.S).group(1)
    authors = re.findall(r"\\IEEEauthorblockN\{([^}]*)\}\s*\\IEEEauthorblockA\{(.*?)\}\s*(?:\\and|\})", tex, re.S)
    bib = re.findall(r"\\bibitem\{([^}]+)\}\s*(.*?)(?=\\bibitem|\\end\{thebibliography\})", body, re.S)
    cites = {k: i + 1 for i, (k, _) in enumerate(bib)}
    t_n = f_n = a_n = 0
    for kind, lab in re.findall(r"\\begin\{(table|figure\*?|algorithm)\}.*?\\label\{([^}]+)\}", body, re.S):
        if kind == "table":
            t_n += 1
            LABELS[lab] = ROMAN[t_n - 1]
        elif kind == "algorithm":
            a_n += 1
            LABELS[lab] = str(a_n)
        else:
            f_n += 1
            LABELS[lab] = str(f_n)
    out, sec, sub = [], 0, 0
    body = body.split(r"\begin{thebibliography}")[0]
    tokens = re.split(r"(\\begin\{abstract\}.*?\\end\{abstract\}|\\begin\{IEEEkeywords\}.*?\\end\{IEEEkeywords\}|"
                      r"\\section\*?\{[^}]*\}|\\subsection\{[^}]*\}|\\begin\{itemize\}.*?\\end\{itemize\}|"
                      r"\\begin\{table\}.*?\\end\{table\}|\\begin\{figure\*?\}.*?\\end\{figure\*?\}|"
                      r"\\begin\{equation\}.*?\\end\{equation\}|\\begin\{algorithm\}.*?\\end\{algorithm\})", body, flags=re.S)
    eq_n = 0
    for tok in tokens:
        if not tok.strip():
            continue
        if tok.startswith(r"\begin{algorithm}"):
            lab = re.search(r"\\label\{([^}]+)\}", tok).group(1)
            out.append(render_algorithm(tok, cites, LABELS[lab]))
        elif tok.startswith(r"\begin{abstract}"):
            text = inline(tok[len(r"\begin{abstract}"):-len(r"\end{abstract}")], cites)
            out.append(f'<p class="abstract"><b><i>Abstract</i>—{text}</b></p>')
        elif tok.startswith(r"\begin{IEEEkeywords}"):
            text = inline(tok[len(r"\begin{IEEEkeywords}"):-len(r"\end{IEEEkeywords}")], cites)
            out.append(f'<p class="abstract"><b><i>Index Terms</i>—{text}</b></p>')
        elif tok.startswith(r"\section"):
            if not tok.startswith(r"\section*"):
                SECTION_POS.append(len(out))      # index of section (sec + 1) in the output
            name = re.search(r"\{([^}]*)\}", tok).group(1)
            if tok.startswith(r"\section*"):
                out.append(f'<h2 class="unnumbered">{inline(name, cites)}</h2>')
            else:
                sec += 1
                sub = 0
                out.append(f"<h2>{ROMAN[sec - 1]}. {inline(name, cites)}</h2>")
        elif tok.startswith(r"\subsection"):
            sub += 1
            name = re.search(r"\{([^}]*)\}", tok).group(1)
            out.append(f"<h3>{chr(64 + sub)}. {inline(name, cites)}</h3>")
        elif tok.startswith(r"\begin{itemize}"):
            items = re.split(r"\\item\s+", tok[len(r"\begin{itemize}"):-len(r"\end{itemize}")])[1:]
            out.append("<ul>" + "".join(f"<li>{inline(i, cites)}</li>" for i in items) + "</ul>")
        elif tok.startswith(r"\begin{equation}"):
            eq_n += 1
            t = tok[len(r"\begin{equation}"):-len(r"\end{equation}")].strip().rstrip(",")
            t = t.replace(r"\mathrm{score}", "score").replace(r"\mathrm{CTC}", "CTC").replace(r"\mathrm{cls}", "cls")
            out.append(f'<div class="eq"><span>{inline("$" + t + "$", cites)}</span><span class="eqn">({eq_n})</span></div>')
        elif tok.startswith(r"\begin{table}"):
            cap = inline(re.search(r"\\caption\{(.*?)\}\n", tok, re.S).group(1), cites)
            lab = re.search(r"\\label\{([^}]+)\}", tok).group(1)
            tab = re.search(r"\\begin\{tabular\}\{.*?\}\n(.*?)\\end\{tabular\}", tok, re.S).group(1)
            rows, foot, part = [], "", "head"
            for line in tab.split("\n"):
                line = line.strip()
                if not line or line.startswith(r"\toprule") or line.startswith(r"\bottomrule"):
                    continue
                if line.startswith(r"\midrule"):
                    part = "body"
                    continue
                if line.startswith(r"\multicolumn"):
                    foot = inline(re.search(r"\\multicolumn\{\d+\}\{(?:[^{}]|\{\})*\}\{(.*)\}", line).group(1), cites)
                    continue
                cells = [inline(c, cites) for c in line.rstrip("\\").rstrip().rstrip("\\").split("&")]
                rows.append((part, cells))
            th = [r for p, r in rows if p == "head"]
            tb = [r for p, r in rows if p == "body"]
            head_html = "".join("<tr>" + "".join(f"<th>{c}</th>" for c in r) + "</tr>" for r in th)
            body_html = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in tb)
            out.append(f'<div class="table"><div class="tcap">TABLE {LABELS[lab]}<br>{cap.upper()}</div>'
                       f"<table><thead>{head_html}</thead><tbody>{body_html}</tbody></table>"
                       + (f'<div class="tfoot">{foot}</div>' if foot else "") + "</div>")
        elif tok.startswith(r"\begin{figure"):
            img = re.search(r"\\includegraphics\[[^]]*\]\{([^}]+)\}", tok).group(1).replace(".pdf", ".png")
            cap = inline(re.search(r"\\caption\{(.*?)\}\n", tok, re.S).group(1), cites)
            lab = re.search(r"\\label\{([^}]+)\}", tok).group(1)
            wide = " wide" if tok.startswith(r"\begin{figure*}") else ""
            fig_html = f'<figure class="fig{wide}"><img src="{img}" alt=""><figcaption>Fig. {LABELS[lab]}. {cap}</figcaption></figure>'
            if wide and 0 < WIDE_BEFORE_SECTION <= len(SECTION_POS):
                out.insert(SECTION_POS[WIDE_BEFORE_SECTION - 1], fig_html)
            else:
                out.append(fig_html)
        else:
            for para in re.split(r"\n\s*\n", tok):
                para = re.sub(r"^%.*$", "", para, flags=re.M).strip()
                if para:
                    out.append(f"<p>{inline(para, cites)}</p>")
    refs = "".join(f"<li><span>[{i + 1}]</span><span>{inline(re.sub(r'\s+', ' ', t), cites)}</span></li>" for i, (_, t) in enumerate(bib))
    auth = "".join(f'<div class="author"><div class="an">{html.escape(n)}</div><div class="aa">{inline(a, cites)}</div></div>'
                   for n, a in authors)
    page = TEMPLATE.replace("{{TITLE}}", inline(re.sub(r"\s+", " ", title), cites)).replace("{{AUTHORS}}", auth) \
        .replace("{{BODY}}", "\n".join(out)).replace("{{REFS}}", refs)
    open(dst, "w", encoding="utf-8").write(page)


TEMPLATE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Kannada SignBridge (IEEE)</title>
<style>
@page { size: Letter; margin: 0.75in 0.625in 1in 0.625in; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.18; color: #000; }
h1 { font-size: 22pt; font-weight: normal; text-align: center; margin: 0 0 12pt; line-height: 1.15; }
.authors { display: flex; justify-content: center; flex-wrap: wrap; gap: 6pt 18pt; margin-bottom: 14pt; }
.author { text-align: center; width: 23%; font-size: 9pt; }
.an { font-size: 11pt; } .aa i { font-style: italic; }
.cols { column-count: 2; column-gap: 0.2in; text-align: justify; hyphens: auto; }
p { margin: 0 0 0; text-indent: 1em; }
p.abstract { text-indent: 0; font-size: 9pt; margin-bottom: 6pt; }
h2 { font-size: 10pt; font-weight: normal; font-variant: small-caps; text-align: center; margin: 9pt 0 4pt; break-after: avoid; }
h3 { font-size: 10pt; font-weight: normal; font-style: italic; margin: 6pt 0 3pt; break-after: avoid; }
ul { margin: 2pt 0 2pt 0; padding-left: 1.4em; } li { margin: 1pt 0; }
.eq { display: flex; justify-content: center; position: relative; margin: 5pt 0; font-style: normal; }
.eqn { position: absolute; right: 0; }
.table { margin: 6pt 0; break-inside: avoid; }
.tcap { font-size: 8pt; text-align: center; font-variant: small-caps; margin-bottom: 3pt; letter-spacing: 0.02em; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; border-top: 1px solid #000; border-bottom: 1px solid #000; }
thead tr:last-child th { border-bottom: 0.6px solid #000; }
th, td { padding: 1.5pt 3pt; text-align: right; font-weight: normal; }
th:first-child, td:first-child { text-align: left; }
.tfoot { font-size: 7.5pt; margin-top: 2pt; }
figure { margin: 6pt 0; break-inside: avoid; } figure img { width: 100%; display: block; }
figure.wide { column-span: all; margin: 0 0 10pt; }
figcaption { font-size: 8pt; margin-top: 3pt; text-align: justify; }
code { font-family: "Courier New", monospace; font-size: 9pt; }
.refs { font-size: 8pt; } .refs ol { list-style: none; padding: 0; margin: 0; }
.refs li { display: grid; grid-template-columns: 2.2em 1fr; margin: 0 0 2pt; text-align: left; }
h2.unnumbered { font-variant: small-caps; }
.algo { margin: 6pt 0; break-inside: avoid; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 8.5pt; }
.acap { border-bottom: 0.6px solid #000; padding: 2pt 0; }
.abody { padding: 2pt 0; } .al { text-align: left; line-height: 1.25; display: flex; } .alt { flex: 1; }
.aln { display: inline-block; flex: none; width: 1.8em; font-size: 7.5pt; color: #000; }
</style></head><body>
<h1>{{TITLE}}</h1>
<div class="authors">{{AUTHORS}}</div>
<div class="cols">
{{BODY}}
<h2 class="unnumbered">References</h2>
<div class="refs"><ol>{{REFS}}</ol></div>
</div></body></html>"""

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
