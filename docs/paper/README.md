# IEEE paper: Kannada SignBridge

IEEE conference format (official `IEEEtran` class, two columns).

| File | Content |
|---|---|
| `kannada_signbridge_ieee.tex` | The paper (references included, no `.bib` needed) |
| `fig_architecture.pdf` | Fig. 1, system architecture |
| `fig_results.pdf` | Fig. 2, accuracy of successive models on the same held-out videos |
| `kannada_signbridge_ieee_overleaf.zip` | All three files together, ready to upload |
| `*.png` | Previews of the figures |

## Get the PDF (Overleaf, no installation)
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
