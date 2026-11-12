import { useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Card, Chip } from "../components/ui";

const CHAPTER_JUMPS = [
  { label: "Cover & Certificate", pageIndex: 0 },
  { label: "Abstract & TOC (iv–vi)", pageIndex: 4 },
  { label: "Ch 1: Introduction (p. 1–8)", pageIndex: 10 },
  { label: "Ch 2: Literature Review (p. 9–16)", pageIndex: 18 },
  { label: "Ch 3: Requirements (p. 17–24)", pageIndex: 26 },
  { label: "Ch 4: Business Model (p. 25–31)", pageIndex: 34 },
  { label: "Ch 5: System Design (p. 32–42)", pageIndex: 41 },
  { label: "Ch 6: Implementation (p. 43–51)", pageIndex: 52 },
  { label: "Ch 7: Testing & Results (p. 52–60)", pageIndex: 61 },
  { label: "Ch 8: Conclusion (p. 61–63)", pageIndex: 70 },
  { label: "References & Appendix (p. 64–66)", pageIndex: 73 },
];

const IEEE_PAGE_JUMPS = [
  { label: "p. 1: Title, Authors, Abstract & Intro", pageIndex: 0 },
  { label: "p. 2: Related Work & Datasets (Tables I–II)", pageIndex: 1 },
  { label: "p. 3: Architecture & Alg. 1 (Fig. 1, Tables IV–V)", pageIndex: 2 },
  { label: "p. 4: 147-D Math Schema & Calibration (Eqs. 1–7)", pageIndex: 3 },
  { label: "p. 5: Continuous CTC, Avatar IK & Alg. 3 (Eqs. 8–12)", pageIndex: 4 },
  { label: "p. 6: Isolated Results & Ablation (Tables VI–VIII)", pageIndex: 5 },
  { label: "p. 7: Robustness, Parity, Continuous & Latency (Tables IX–XII)", pageIndex: 6 },
  { label: "p. 8: SDG Impact, Conclusion, Ack & 25 IEEE Refs", pageIndex: 7 },
];

const OFFICIAL_PROJECT_TITLE =
  "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

export function ProjectReport() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [docMode, setDocMode] = useState<"ieee" | "report">("ieee");
  const [projectTitle, setProjectTitle] = useState(OFFICIAL_PROJECT_TITLE);
  const [studentList, setStudentList] = useState(
    "Kiran M K (1BM23CB068), Manoj G U (1BM24CB401), H S Thanush (1BM23CB066)"
  );
  const [guideName, setGuideName] = useState("Tejaswini K");
  const [guideDesig, setGuideDesig] = useState("Assistant Professor");
  const [hodName, setHodName] = useState("Dr. R Ashok Kumar");
  const [principalName, setPrincipalName] = useState("Dr. Beemsha Arya");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const jumpToPage = (pageIndex: number) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const selector = docMode === "ieee" ? ".ieee-page" : ".report-page";
    const pages = doc.querySelectorAll(selector);
    const target = pages[pageIndex] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const applyCustomDetails = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !doc.body) return;

    const titleSpans = doc.querySelectorAll(".report-project-title");
    titleSpans.forEach((el) => {
      el.textContent = projectTitle.trim();
    });

    const selector = docMode === "ieee" ? ".ieee-page" : ".report-page";
    const pagesToUpdate = Array.from(doc.querySelectorAll(selector)).slice(0, docMode === "ieee" ? 8 : 5);
    for (const p of pagesToUpdate) {
      let html = p.innerHTML;
      html = html.replace(
        /Kiran M K \(1BM23CB068\), Manoj G U \(1BM24CB401\), H S Thanush \(1BM23CB066\)/g,
        studentList
      );
      html = html.replace(/Tejaswini K/g, guideName);
      html = html.replace(/Assistant Professor/g, guideDesig);
      html = html.replace(/Dr\. R Ashok Kumar/g, hodName);
      html = html.replace(/Dr\. Beemsha Arya/g, principalName);
      html = html.replace(/2026-2027/g, academicYear);
      p.innerHTML = html;
    }
    setAppliedMsg(
      docMode === "ieee"
        ? "Updated Project Title, Author Details & Institutional Acknowledgment across the IEEE Paper preview."
        : "Updated Project Title, Cover, Inner Title, Certificate, Declaration & Publication pages in the 76-page Report preview."
    );
    setTimeout(() => setAppliedMsg(null), 5000);
  };

  const printDocument = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const activeIframeSrc =
    docMode === "ieee"
      ? "/report/SILENT_BRIDGE_IEEE_Research_Paper.html"
      : "/report/CSBS_BE_Project_Report_Kannada_SignBridge.html";

  return (
    <div className="stack" style={{ fontFamily: '"Times New Roman", "CSBS-Times", Times, serif' }}>
      <div className="page-head">
        <div>
          <h2 style={{ fontFamily: '"Times New Roman", "CSBS-Times", Times, serif' }}>
            {docMode === "ieee"
              ? "IEEE Format Research Paper (8 Pages · Two-Column IEEEtran Standard)"
              : "CSBS B.E. Project Report (76 Pages · VTU/BMSCE Standard)"}
          </h2>
          <p style={{ fontWeight: 600, color: "var(--fg, inherit)", marginBottom: 4 }}>
            “{projectTitle}”
          </p>
          <p>
            {docMode === "ieee"
              ? "Formatted in strict IEEEtran two-column standard (100% Times New Roman · 12 Tables · 7 Figures · 12 Equations · 3 Algorithms · 25 IEEE References) — Published in International Journal of Drug Delivery Technologies (IJDDT, ISSN: 0975-4415, Scopus Q3, Vol. 16, No. 7, 2026)."
              : "Formatted strictly per B.M.S. College of Engineering (Autonomous Institute Affiliated to VTU) — Department of Computer Science and Business Systems (CSBS) guidelines."}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${docMode === "ieee" ? "btn-primary" : ""}`}
            onClick={() => setDocMode("ieee")}
          >
            <Icon name="text" size={16} />
            <span>IEEE Research Paper (8 Pages · Two-Column)</span>
          </button>
          <button
            type="button"
            className={`btn ${docMode === "report" ? "btn-primary" : ""}`}
            onClick={() => setDocMode("report")}
          >
            <Icon name="eye" size={16} />
            <span>CSBS B.E. Project Report (76 Pages · A4)</span>
          </button>
        </div>
      </div>

      <Card
        title={
          docMode === "ieee"
            ? "IEEE Research Manuscript — Download PDF, LaTeX (.tex) & Navigate Sections"
            : "CSBS 76-Page B.E. Project Report — Download PDF, Print & Customize Certificate"
        }
        icon="download"
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {docMode === "ieee" ? (
            <>
              <Chip tone="ok">8 Pages · Balanced Two-Column IEEEtran</Chip>
              <Chip tone="info">100% Times New Roman · 12 Tables · 7 Figures</Chip>
              <Chip tone="muted">IJDDT · ISSN 0975-4415 · Vol. 16, No. 7 (2026)</Chip>
            </>
          ) : (
            <>
              <Chip tone="ok">76 Pages Total (10 Roman + 66 Arabic)</Chip>
              <Chip tone="info">Left 1.25&quot; · Right 1.0&quot; · Top/Bottom 0.75&quot;</Chip>
              <Chip tone="muted">18pt / 16pt / 14pt / 12pt Times New Roman</Chip>
            </>
          )}
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {docMode === "ieee" ? (
            <>
              <a
                href="/api/paper/download-pdf"
                download="SILENT_BRIDGE_IEEE_Research_Paper.pdf"
                className="btn btn-primary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" size={16} />
                <span>Download IEEE Research Paper PDF (8 Pages · A4)</span>
              </a>

              <a
                href="/api/paper/download-tex"
                download="SILENT_BRIDGE_IEEE_Paper.tex"
                className="btn"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" size={16} />
                <span>Download IEEE LaTeX Source (.tex)</span>
              </a>

              <button type="button" className="btn" onClick={printDocument}>
                <Icon name="check" size={16} />
                <span>Print / Save Custom PDF</span>
              </button>

              <a
                href="/report/SILENT_BRIDGE_IEEE_Research_Paper.html"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="eye" size={16} />
                <span>Open Full-Screen IEEE Paper</span>
              </a>
            </>
          ) : (
            <>
              <a
                href="/api/report/download-pdf"
                download="SILENT_BRIDGE_CSBS_BE_Project_Report_76Pages.pdf"
                className="btn btn-primary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" size={16} />
                <span>Download Ready 76-Page Report PDF (A4)</span>
              </a>

              <button type="button" className="btn" onClick={printDocument}>
                <Icon name="check" size={16} />
                <span>Print / Save Custom PDF</span>
              </button>

              <a
                href="/report/CSBS_BE_Project_Report_Kannada_SignBridge.html"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="eye" size={16} />
                <span>Open Full-Screen 76-Page Report</span>
              </a>
            </>
          )}
        </div>

        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Customize Project Title, Author / Student Names, Guide ({guideName}), HoD ({hodName}) &amp; Principal ({principalName})
          </summary>
          <div style={{ marginTop: 10, padding: 12, background: "var(--bg-muted, rgba(148,163,184,0.08))", borderRadius: 8 }}>
            <label className="field" style={{ marginBottom: 10 }}>
              <span>Official Project &amp; Paper Title</span>
              <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 10,
              }}
            >
              <label className="field">
                <span>Authors / Student Name(s) &amp; USN(s)</span>
                <input value={studentList} onChange={(e) => setStudentList(e.target.value)} />
              </label>
              <label className="field">
                <span>Guide Name</span>
                <input value={guideName} onChange={(e) => setGuideName(e.target.value)} />
              </label>
              <label className="field">
                <span>Guide Designation</span>
                <input value={guideDesig} onChange={(e) => setGuideDesig(e.target.value)} />
              </label>
              <label className="field">
                <span>HoD Name</span>
                <input value={hodName} onChange={(e) => setHodName(e.target.value)} />
              </label>
              <label className="field">
                <span>Principal Name</span>
                <input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} />
              </label>
              <label className="field">
                <span>Academic Year</span>
                <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </label>
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={applyCustomDetails}>
              Apply to Live Preview
            </button>
            {appliedMsg && <span style={{ fontSize: 12, color: "var(--ok, #16a34a)" }}>{appliedMsg}</span>}
          </div>
        </details>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(docMode === "ieee" ? IEEE_PAGE_JUMPS : CHAPTER_JUMPS).map((item) => (
            <button
              key={item.label}
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => jumpToPage(item.pageIndex)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <div
        style={{
          width: "100%",
          height: "82vh",
          minHeight: 680,
          border: "1px solid var(--border, #334155)",
          borderRadius: 10,
          overflow: "hidden",
          background: "#334155",
        }}
      >
        <iframe
          key={docMode}
          ref={iframeRef}
          src={activeIframeSrc}
          title={
            docMode === "ieee"
              ? "IEEE Format Research Paper — Silent Bridge (8 Pages)"
              : "CSBS B.E. Project Report — Silent Bridge (76 Pages)"
          }
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}
