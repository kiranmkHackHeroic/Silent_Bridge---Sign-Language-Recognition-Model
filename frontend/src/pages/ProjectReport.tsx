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

export function ProjectReport() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [studentList, setStudentList] = useState("KIRAN M K (1BM23CB025)");
  const [guideName, setGuideName] = useState("Dr. Guide Name");
  const [guideDesig, setGuideDesig] = useState("Associate Professor");
  const [hodName, setHodName] = useState("Dr. HoD Name");
  const [principalName, setPrincipalName] = useState("Dr. Principal Name");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const jumpToPage = (pageIndex: number) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const pages = doc.querySelectorAll(".report-page");
    const target = pages[pageIndex] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const applyCustomDetails = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !doc.body) return;

    // Replace default placeholders in the first 5 preliminary pages if customized
    const prelimPages = Array.from(doc.querySelectorAll(".report-page")).slice(0, 5);
    for (const p of prelimPages) {
      let html = p.innerHTML;
      html = html.replace(/KIRAN M K\s*&nbsp;\(1BM23CB025\)/g, studentList);
      html = html.replace(/KIRAN M K \(1BM23CB025\)/g, studentList);
      html = html.replace(/Dr\. Guide Name/g, guideName);
      html = html.replace(/Associate Professor/g, guideDesig);
      html = html.replace(/Dr\. HoD Name/g, hodName);
      html = html.replace(/Dr\. Principal Name/g, principalName);
      html = html.replace(/2026-2027/g, academicYear);
      p.innerHTML = html;
    }
    setAppliedMsg("Updated Cover, Inner Title, Certificate, Declaration & Publication pages in preview. Click 'Print / Save Custom PDF' to export.");
    setTimeout(() => setAppliedMsg(null), 5000);
  };

  const printReport = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h2>CSBS B.E. Project Report (76 Pages · A4 Standard)</h2>
          <p>
            Formatted strictly per B.M.S. College of Engineering (Autonomous Institute Affiliated to VTU) — Department of Computer Science and Business Systems (CSBS) guidelines.
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Chip tone="ok">76 Pages Total (10 Roman + 66 Arabic)</Chip>
          <Chip tone="info">Left 1.25&quot; · Right 1.0&quot; · Top/Bottom 0.75&quot;</Chip>
          <Chip tone="muted">18pt / 16pt / 14pt / 12pt Times New Roman</Chip>
        </div>
      </div>

      <Card title="Download, Print &amp; Customize Title / Certificate Details" icon="text">
        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <a
            href="/report/CSBS_BE_Project_Report_Kannada_SignBridge.pdf"
            download="CSBS_BE_Project_Report_Kannada_SignBridge.pdf"
            className="btn btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="download" size={16} />
            <span>Download Ready 76-Page PDF (A4)</span>
          </a>

          <button type="button" className="btn" onClick={printReport}>
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
            <span>Open Full-Screen HTML Report</span>
          </a>
        </div>

        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Customize Student Names / USNs, Guide, HoD &amp; Principal on Cover &amp; Certificate Pages
          </summary>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 10,
              marginTop: 10,
              padding: 12,
              background: "var(--bg-muted, rgba(148,163,184,0.08))",
              borderRadius: 8,
            }}
          >
            <label className="field">
              <span>Student Name(s) &amp; USN(s)</span>
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
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={applyCustomDetails}>
              Apply to Report Preview
            </button>
            {appliedMsg && <span style={{ fontSize: 12, color: "var(--ok, #16a34a)" }}>{appliedMsg}</span>}
          </div>
        </details>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHAPTER_JUMPS.map((ch) => (
            <button
              key={ch.label}
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => jumpToPage(ch.pageIndex)}
            >
              {ch.label}
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
          background: "#475569",
        }}
      >
        <iframe
          ref={iframeRef}
          src="/report/CSBS_BE_Project_Report_Kannada_SignBridge.html"
          title="CSBS B.E. Project Report — Kannada SignBridge (76 Pages)"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}
