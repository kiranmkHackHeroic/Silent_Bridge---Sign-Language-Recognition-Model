# IEEE paper: Kannada SignBridge

IEEE conference format (official `IEEEtran` class, two columns).

| File | Content |
|---|---|
| `kannada_signbridge_ieee.tex` | The paper (references included, no `.bib` needed) |
| `fig_architecture.pdf` | Fig. 1, system architecture |
| `fig_*.pdf` | Figs. 1–7: architecture, data per sign, calibration, results, per-sign F1, segmentation, robustness (`make_figures_extended.py` draws Figs. 3–7 from the stored measurements) |
| `kannada_signbridge_ieee.pdf` | **Ready-to-read PDF** (10 pages, IEEE two-column layout, printed from `kannada_signbridge_ieee.html`) |
| `kannada_signbridge_ieee_overleaf.zip` | The `.tex` and both figures, ready to upload to Overleaf |
| `tex_to_ieee_html.py` | Regenerates the HTML/PDF from the `.tex`: `python tex_to_ieee_html.py kannada_signbridge_ieee.tex kannada_signbridge_ieee.html 3`, then print to PDF |

Contents: 9 sections, 4 algorithms, 7 figures, 13 tables, 21 references.
| `*.png` | Previews of the figures |

## PDF for submission (Overleaf, official IEEEtran typesetting)
The included PDF is a browser rendering of the same text. For a conference submission, compile the `.tex` with IEEEtran:
1. Go to https://www.overleaf.com and sign in.
2. **New Project → Upload Project** → choose `kannada_signbridge_ieee_overleaf.zip`.
3. Open `kannada_signbridge_ieee.tex` and press **Recompile**. Overleaf already has the `IEEEtran` class.
4. Replace the author placeholders (`Author Name 1`, `Institution Name`, …) with your names, department, college and e-mails.
5. **Download PDF**.

Locally, with a TeX distribution (MiKTeX / TeX Live): `pdflatex kannada_signbridge_ieee.tex` twice.

## Where the numbers come from
Every number is measured in this project:
- isolated signs: `backend/models/registry/<version>/metrics.json`;
- sentences: `docs/PHASE9_REPORT.md` and `docs/PHASE11_REPORT.md`.

**Live webcam accuracy has not been measured yet; the paper says so.** Add it to Section VI once the evaluation sessions (`docs/LIVE_TEST_PROCEDURE.md`) are done.
