import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Card } from "../components/ui";

const DOWNLOAD_ENDPOINTS = [
  "/api/ppt/download-pptx",
  "/api/ppt/download-pdf",
  "/api/report/download-docx",
  "/api/report/download-pdf",
  "/api/paper/download-docx",
  "/api/paper/download-pdf",
] as const;

const CHAPTER_JUMPS = [
  { label: "Cover & Certificate (3 Pages)", pageIndex: 0 },
  { label: "Declaration, Ack & Abstract (i–iii)", pageIndex: 3 },
  { label: "TOC & Lists (iv–ix)", pageIndex: 6 },
  { label: "Ch 1: Introduction (p. 1–8)", pageIndex: 12 },
  { label: "Ch 2: Literature Review (p. 9–16)", pageIndex: 20 },
  { label: "Ch 3: Requirements (p. 17–24)", pageIndex: 28 },
  { label: "Ch 4: Business Model (p. 25–31)", pageIndex: 36 },
  { label: "Ch 5: System Design (p. 32–42)", pageIndex: 43 },
  { label: "Ch 6: Implementation & UI Workflow (p. 43–51)", pageIndex: 54 },
  { label: "Ch 7: Testing & Results (p. 52–60)", pageIndex: 63 },
  { label: "Ch 8: Conclusion (p. 61–63)", pageIndex: 72 },
  { label: "References & Appendix (p. 64–66)", pageIndex: 75 },
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

const PPT_SLIDE_JUMPS = [
  { label: "Slide 1: Title Slide (BMSCE & Team)", pageIndex: 0 },
  { label: "Slide 2: Content Table (Agenda)", pageIndex: 1 },
  { label: "Slide 3: Abstract", pageIndex: 2 },
  { label: "Slide 4: Introduction & Topic Selection", pageIndex: 3 },
  { label: "Slide 5: Problem Statement & Objectives", pageIndex: 4 },
  { label: "Slide 6: Literature Survey", pageIndex: 5 },
  { label: "Slide 7: System Architecture & Pipeline", pageIndex: 6 },
  { label: "Slide 8: Hardware & Software Requirements", pageIndex: 7 },
  { label: "Slide 9: 147-D Feature Extraction Schema", pageIndex: 8 },
  { label: "Slide 10: Module Implementation (How & Why)", pageIndex: 9 },
  { label: "Slide 11: Parameters & Comparison Table", pageIndex: 10 },
  { label: "Slide 12: Results & Named Graphs", pageIndex: 11 },
  { label: "Slide 13: Conclusion & Future Work", pageIndex: 12 },
  { label: "Slide 14: Research Paper & Importance", pageIndex: 13 },
];

const OFFICIAL_PROJECT_TITLE =
  "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

type DocMode = "ppt" | "report" | "ieee";

function initialDocMode(): DocMode {
  const h = location.hash.replace("#", "");
  if (h === "paper") return "ieee";
  if (h === "report") return "report";
  if (h === "ppt") return "ppt";
  return "ppt";
}

export function ProjectReport() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [docMode, setDocMode] = useState<DocMode>(initialDocMode);
  const [projectTitle, setProjectTitle] = useState(OFFICIAL_PROJECT_TITLE);
  const [studentList, setStudentList] = useState(
    "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)"
  );
  const [guideName, setGuideName] = useState("Tejaswini K");
  const [guideDesig, setGuideDesig] = useState("Assistant Professor");
  const [hodName, setHodName] = useState("Dr. R Ashok Kumar");
  const [principalName, setPrincipalName] = useState("Dr. Beemsha Arya");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const createdUrls: string[] = [];
    const xhrs: XMLHttpRequest[] = [];

    DOWNLOAD_ENDPOINTS.forEach((endpoint) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", endpoint, true);
      xhr.responseType = "blob";
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof Blob && xhr.response.size > 0) {
          const objectUrl = URL.createObjectURL(xhr.response);
          createdUrls.push(objectUrl);
          setBlobUrls((prev) => ({ ...prev, [endpoint]: objectUrl }));
        }
      };
      xhr.send();
      xhrs.push(xhr);
    });

    return () => {
      xhrs.forEach((xhr) => xhr.abort());
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const notifyDownload = (filename: string) => {
    setDownloadStatus(`Downloading ${filename}...`);
    setTimeout(() => setDownloadStatus(null), 4000);
  };

  const jumpToPage = (pageIndex: number) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const selector =
      docMode === "ieee" ? ".ieee-page" : docMode === "ppt" ? ".ppt-slide" : ".report-page";
    const pages = doc.querySelectorAll(selector);
    const target = pages[pageIndex] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const applyCustomDetails = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !doc.body) return;

    const titleSpans = doc.querySelectorAll(":not(.page-running-header) > .report-project-title");
    titleSpans.forEach((el) => {
      el.textContent = projectTitle.trim();
    });

    const selector =
      docMode === "ieee" ? ".ieee-page" : docMode === "ppt" ? ".ppt-slide" : ".report-page";
    const pagesToUpdate = Array.from(doc.querySelectorAll(selector)).slice(
      0,
      docMode === "ieee" ? 8 : docMode === "ppt" ? 14 : 5
    );
    for (const p of pagesToUpdate) {
      let html = p.innerHTML;
      html = html.replace(
        /H S Thanush \(1BM23CB066\), Kiran M K \(1BM23CB068\), Manoj G U \(1BM24CB401\)/g,
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
      docMode === "ppt"
        ? "Updated Project Title, Sorted Student USNs & Guide Details across the 14-Slide Presentation preview."
        : docMode === "ieee"
          ? "Updated Project Title, Author Details & Institutional Acknowledgment across the IEEE Paper preview."
          : "Updated Project Title, Cover, Inner Title, Certificate, Declaration & Publication pages in the 78-page Report preview."
    );
    setTimeout(() => setAppliedMsg(null), 5000);
  };

  const printDocument = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const activeIframeSrc =
    docMode === "ppt"
      ? "/report/SILENT_BRIDGE_Presentation_10Slides.html"
      : docMode === "ieee"
        ? "/report/SILENT_BRIDGE_IEEE_Research_Paper.html"
        : "/report/CSBS_BE_Project_Report_Kannada_SignBridge.html";

  const activeJumps =
    docMode === "ppt" ? PPT_SLIDE_JUMPS : docMode === "ieee" ? IEEE_PAGE_JUMPS : CHAPTER_JUMPS;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h2>
            {docMode === "ppt"
              ? "14-Slide Project Presentation"
              : docMode === "report"
                ? "CSBS B.E. Project Report (78 Pages)"
                : "IEEE Format Research Paper (8 Pages)"}
          </h2>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            “{projectTitle}”
          </p>
          <p className="meta-line">
            {docMode === "ppt" ? (
              <>
                <span>14 Widescreen (16:9) Slides</span>
                <span className="meta-sep">·</span>
                <span>Referenced from Ch 1–8</span>
                <span className="meta-sep">·</span>
                <span>USNs: 1BM23CB066 · 1BM23CB068 · 1BM24CB401</span>
              </>
            ) : docMode === "report" ? (
              <>
                <span>78 Pages (3 Title + 9 Roman + 66 Arabic)</span>
                <span className="meta-sep">·</span>
                <span>VTU / BMSCE CSBS Standard</span>
                <span className="meta-sep">·</span>
                <span>100% Times New Roman</span>
              </>
            ) : (
              <>
                <span>8 Pages · Two-Column IEEEtran</span>
                <span className="meta-sep">·</span>
                <span>12 Tables · 7 Figures · 25 Refs</span>
                <span className="meta-sep">·</span>
                <span>Dept. of CSBS, BMSCE</span>
              </>
            )}
          </p>
        </div>

        <div className="seg" role="tablist" aria-label="Document type">
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "ppt"}
            className={docMode === "ppt" ? "on" : ""}
            onClick={() => setDocMode("ppt")}
          >
            14-Slide PPT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "report"}
            className={docMode === "report" ? "on" : ""}
            onClick={() => setDocMode("report")}
          >
            78-Page Report
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "ieee"}
            className={docMode === "ieee" ? "on" : ""}
            onClick={() => setDocMode("ieee")}
          >
            IEEE Paper
          </button>
        </div>
      </div>

      <Card
        title={
          docMode === "ppt"
            ? "Download Presentation & Jump to Slides"
            : docMode === "report"
              ? "Download CSBS Report & Customize Certificate"
              : "Download IEEE Manuscript & Navigate Sections"
        }
        icon="download"
        actions={
          <button type="button" className="btn btn-sm" onClick={printDocument}>
            <Icon name="check" size={14} />
            <span>Print / Save Custom PDF</span>
          </button>
        }
      >
        <div className="download-grid">
          <a
            href={blobUrls["/api/ppt/download-pptx"] || "/api/ppt/download-pptx"}
            download="SILENT_BRIDGE_Presentation.pptx"
            onClick={() => notifyDownload("SILENT_BRIDGE_Presentation.pptx")}
            className={`btn btn-md ${docMode === "ppt" ? "btn-primary" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>PPT (.pptx)</span>
          </a>

          <a
            href={blobUrls["/api/ppt/download-pdf"] || "/api/ppt/download-pdf"}
            download="SILENT_BRIDGE_Presentation.pdf"
            onClick={() => notifyDownload("SILENT_BRIDGE_Presentation.pdf")}
            className="btn btn-md"
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>PPT (PDF)</span>
          </a>

          <a
            href={blobUrls["/api/report/download-docx"] || "/api/report/download-docx"}
            download="CSBS_BE_Project_Report_Kannada_SignBridge.docx"
            onClick={() => notifyDownload("CSBS_BE_Project_Report_Kannada_SignBridge.docx")}
            className={`btn btn-md ${docMode === "report" ? "btn-primary" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>Report Word (.docx)</span>
          </a>

          <a
            href={blobUrls["/api/report/download-pdf"] || "/api/report/download-pdf"}
            download="CSBS_BE_Project_Report_Kannada_SignBridge.pdf"
            onClick={() => notifyDownload("CSBS_BE_Project_Report_Kannada_SignBridge.pdf")}
            className="btn btn-md"
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>Report PDF</span>
          </a>

          <a
            href={blobUrls["/api/paper/download-docx"] || "/api/paper/download-docx"}
            download="SILENT_BRIDGE_IEEE_Research_Paper.docx"
            onClick={() => notifyDownload("SILENT_BRIDGE_IEEE_Research_Paper.docx")}
            className={`btn btn-md ${docMode === "ieee" ? "btn-primary" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>IEEE Word (.docx)</span>
          </a>

          <a
            href={blobUrls["/api/paper/download-pdf"] || "/api/paper/download-pdf"}
            download="SILENT_BRIDGE_IEEE_Research_Paper.pdf"
            onClick={() => notifyDownload("SILENT_BRIDGE_IEEE_Research_Paper.pdf")}
            className="btn btn-md"
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>IEEE Paper PDF</span>
          </a>
        </div>

        {downloadStatus && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 14px",
              borderRadius: 6,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.45)",
              color: "var(--fg, #f8fafc)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ✓ {downloadStatus}
          </div>
        )}

        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Customize Project Title, Sorted Student USNs ({studentList}), Guide ({guideName}), HoD ({hodName}) &amp; Principal ({principalName})
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
                <span>Authors / Student Name(s) &amp; USN(s) (Increasing Order)</span>
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
          {activeJumps.map((item) => (
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
            docMode === "ppt"
              ? "14-Slide Project Presentation — Silent Bridge"
              : docMode === "ieee"
                ? "IEEE Format Research Paper — Silent Bridge (8 Pages)"
                : "CSBS B.E. Project Report — Silent Bridge (78 Pages)"
          }
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}
