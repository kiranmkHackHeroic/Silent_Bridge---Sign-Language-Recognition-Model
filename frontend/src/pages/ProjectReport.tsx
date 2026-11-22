import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { PdfViewer } from "../components/PdfViewer";
import { Card } from "../components/ui";

const DOWNLOAD_ENDPOINTS = [
  "/api/ppt/download-pptx",
  "/api/ppt/download-pdf",
  "/api/report/download-docx",
  "/api/report/download-pdf",
  "/api/paper/download-docx",
  "/api/paper/download-pdf",
] as const;

const FINAL_PDF_URL = "/assets/aistudio/ilovepdf_merged_50241507.pdf";

const FINAL_PDF_JUMPS = [
  { label: "p. 1: Cover Page", pageIndex: 1 },
  { label: "p. 2: Certificate", pageIndex: 2 },
  { label: "p. 3–5: Decl, Ack & Abstract", pageIndex: 3 },
  { label: "p. 6–11: TOC & Lists", pageIndex: 6 },
  { label: "p. 12: Ch 1 Intro", pageIndex: 12 },
  { label: "p. 20: Ch 2 Literature", pageIndex: 20 },
  { label: "p. 28: Ch 3 Requirements", pageIndex: 28 },
  { label: "p. 36: Ch 4 Business Model", pageIndex: 36 },
  { label: "p. 43: Ch 5 System Design", pageIndex: 43 },
  { label: "p. 54: Ch 6 Implementation", pageIndex: 54 },
  { label: "p. 63: Ch 7 Testing & Results", pageIndex: 63 },
  { label: "p. 72: Ch 8 Conclusion", pageIndex: 72 },
  { label: "p. 75–77: Refs & Appendix", pageIndex: 75 },
  { label: "p. 78–79: iThenticate Report (6% AI)", pageIndex: 78 },
];

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
  { label: "p. 1: Title, Authors, Abstract, Intro & Fig. 1", pageIndex: 0 },
  { label: "p. 2: Literature, Datasets (Table 1) & 147-D Schema", pageIndex: 1 },
  { label: "p. 3: BiGRU, Calibration (Fig. 2), CTC & Avatar IK", pageIndex: 2 },
  { label: "p. 4: Isolated 64→144 (Table 2, Fig. 3) & Robustness (Fig. 4)", pageIndex: 3 },
  { label: "p. 5: Sentences, Avatar Audit, Latency & Scalability", pageIndex: 4 },
  { label: "p. 6: Deaf Study Protocol, Conclusion & 15 References", pageIndex: 5 },
];

const PPT_SLIDE_JUMPS = [
  { label: "S1: Title & Highlights", pageIndex: 0 },
  { label: "S2: Problem & Objectives", pageIndex: 1 },
  { label: "S3: Literature Survey", pageIndex: 2 },
  { label: "S4: Architecture Diagram", pageIndex: 3 },
  { label: "S5: 147-D & Pipelines", pageIndex: 4 },
  { label: "S6: GRU / BiGRU / CTC", pageIndex: 5 },
  { label: "S7: Stack & 16 Modules", pageIndex: 6 },
  { label: "S8: Live UI Showcase", pageIndex: 7 },
  { label: "S9: Results 1/2 (64→144)", pageIndex: 8 },
  { label: "S10: Results 2/2 & Audit", pageIndex: 9 },
  { label: "S11: Comparison & #study", pageIndex: 10 },
  { label: "S12: Deliverables & End", pageIndex: 11 },
];

const OFFICIAL_PROJECT_TITLE =
  "SILENT BRIDGE: REAL-TIME BIDIRECTIONAL INDIAN SIGN LANGUAGE AND KANNADA TRANSLATION WITH 3D AVATAR";

type DocMode = "final_pdf" | "ppt" | "report" | "ieee";

function initialDocMode(): DocMode {
  const h = location.hash.replace("#", "");
  if (h === "paper") return "ieee";
  if (h === "ppt") return "ppt";
  return "final_pdf";
}

export function ProjectReport() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [docMode, setDocMode] = useState<DocMode>(initialDocMode);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [projectTitle, setProjectTitle] = useState(OFFICIAL_PROJECT_TITLE);
  const [studentList, setStudentList] = useState(
    "H S Thanush (1BM23CB066), Kiran M K (1BM23CB068), Manoj G U (1BM24CB401)"
  );
  const [guideName, setGuideName] = useState("Prof. Tejaswini K");
  const [guideDesig, setGuideDesig] = useState("Assistant Professor");
  const [hodName, setHodName] = useState("Dr. Ashok Kumar R");
  const [principalName, setPrincipalName] = useState("Dr. Bheemsha Arya");
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
    if (docMode === "final_pdf") {
      setPdfPage(pageIndex);
      return;
    }
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
    if (docMode === "final_pdf") return;
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
      docMode === "ieee" ? 6 : docMode === "ppt" ? 12 : 5
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
        ? "Updated Project Title, Sorted Student USNs & Guide Details across the 12-Slide Executive Presentation preview."
        : docMode === "ieee"
          ? "Updated Project Title, Author Details & Institutional Acknowledgment across the IEEE Paper preview."
          : "Updated Project Title, Cover, Inner Title, Certificate, Declaration & Publication pages in the HTML Report preview."
    );
    setTimeout(() => setAppliedMsg(null), 5000);
  };

  const printDocument = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const activeIframeSrc =
    docMode === "final_pdf"
      ? `${FINAL_PDF_URL}#page=${pdfPage}&view=FitH`
      : docMode === "ppt"
        ? "/report/SILENT_BRIDGE_Presentation_10Slides.html"
        : docMode === "ieee"
          ? "/report/SILENT_BRIDGE_IEEE_Research_Paper.html"
          : "/report/CSBS_BE_Project_Report_Kannada_SignBridge.html";

  const activeJumps =
    docMode === "final_pdf"
      ? FINAL_PDF_JUMPS
      : docMode === "ppt"
        ? PPT_SLIDE_JUMPS
        : docMode === "ieee"
          ? IEEE_PAGE_JUMPS
          : CHAPTER_JUMPS;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h2>
            {docMode === "final_pdf"
              ? "Final CSBS B.E. Project Report & iThenticate PDF (79 Pages)"
              : docMode === "ppt"
                ? "12-Slide Executive Project Presentation"
                : docMode === "report"
                  ? "Interactive HTML Report Preview"
                  : "NCDTE Conference Paper (6 Pages)"}
          </h2>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            “{projectTitle}”
          </p>
          <p className="meta-line">
            {docMode === "final_pdf" ? (
              <>
                <span>79 Pages (77p Final Report + 2p iThenticate Report)</span>
                <span className="meta-sep">·</span>
                <span>27,910 Words</span>
                <span className="meta-sep">·</span>
                <span>iThenticate: 6% AI Detected</span>
                <span className="meta-sep">·</span>
                <span>Submission ID: trn:oid:::3618:158338407</span>
              </>
            ) : docMode === "ppt" ? (
              <>
                <span>12 Widescreen (16:9) Bold Executive Slides</span>
                <span className="meta-sep">·</span>
                <span>Architecture Diagram, Live UI, 144-Sign Results &amp; NCDTE Revisions</span>
                <span className="meta-sep">·</span>
                <span>PPTX &amp; 12-Page PDF Ready</span>
              </>
            ) : docMode === "report" ? (
              <>
                <span>Editable HTML Preview</span>
                <span className="meta-sep">·</span>
                <span>VTU / BMSCE CSBS Standard</span>
                <span className="meta-sep">·</span>
                <span>100% Times New Roman</span>
              </>
            ) : (
              <>
                <span>6 Pages · Single-Column NCDTE Template</span>
                <span className="meta-sep">·</span>
                <span>12pt Times New Roman · 5 Tables · 4 Figures · 15 Refs</span>
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
            aria-selected={docMode === "final_pdf"}
            className={docMode === "final_pdf" ? "on" : ""}
            onClick={() => setDocMode("final_pdf")}
          >
            Final PDF (79p)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "ppt"}
            className={docMode === "ppt" ? "on" : ""}
            onClick={() => setDocMode("ppt")}
          >
            12-Slide PPT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "report"}
            className={docMode === "report" ? "on" : ""}
            onClick={() => setDocMode("report")}
          >
            HTML Report
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={docMode === "ieee"}
            className={docMode === "ieee" ? "on" : ""}
            onClick={() => setDocMode("ieee")}
          >
            Conference Paper
          </button>
        </div>
      </div>

      <Card
        title={
          docMode === "final_pdf"
            ? "Downloads & Page Navigation"
            : docMode === "ppt"
              ? "Download Presentation & Jump to Slides"
              : docMode === "report"
                ? "Download CSBS Report & Customize Certificate"
                : "Download NCDTE Conference Paper & Navigate Pages"
        }
        icon="download"
        actions={
          docMode === "final_pdf" ? (
            <a
              href={FINAL_PDF_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm"
              style={{ textDecoration: "none" }}
            >
              <Icon name="eye" size={14} />
              <span>Open PDF</span>
            </a>
          ) : (
            <button type="button" className="btn btn-sm" onClick={printDocument}>
              <Icon name="check" size={14} />
              <span>Print / Save Custom PDF</span>
            </button>
          )
        }
      >
        <div className="download-grid">
          <a
            href={blobUrls["/api/report/download-pdf"] || "/api/report/download-pdf"}
            download="SILENT_BRIDGE_Final_Project_Report_79Pages.pdf"
            onClick={() => notifyDownload("SILENT_BRIDGE_Final_Project_Report_79Pages.pdf")}
            className={`btn btn-md ${docMode === "final_pdf" ? "btn-primary" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>Final PDF (79p)</span>
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
            href={blobUrls["/api/paper/download-docx"] || "/api/paper/download-docx"}
            download="SILENT_BRIDGE_IEEE_Research_Paper.docx"
            onClick={() => notifyDownload("SILENT_BRIDGE_IEEE_Research_Paper.docx")}
            className={`btn btn-md ${docMode === "ieee" ? "btn-primary" : ""}`}
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>Paper Word (.docx)</span>
          </a>

          <a
            href={blobUrls["/api/paper/download-pdf"] || "/api/paper/download-pdf"}
            download="SILENT_BRIDGE_IEEE_Research_Paper.pdf"
            onClick={() => notifyDownload("SILENT_BRIDGE_IEEE_Research_Paper.pdf")}
            className="btn btn-md"
            style={{ textDecoration: "none" }}
          >
            <Icon name="download" size={15} />
            <span>Paper PDF (6p)</span>
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

        {docMode !== "final_pdf" && (
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
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {activeJumps.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`btn btn-sm ${docMode === "final_pdf" && pdfPage === item.pageIndex ? "btn-primary" : "btn-ghost"}`}
              onClick={() => jumpToPage(item.pageIndex)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {docMode === "final_pdf" ? (
        <PdfViewer
          url={FINAL_PDF_URL}
          targetPage={pdfPage}
          onPageChange={setPdfPage}
        />
      ) : (
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
                ? "12-Slide Executive Presentation — Silent Bridge"
                : docMode === "ieee"
                  ? "IEEE Conference Paper — Silent Bridge (6 Pages)"
                  : "CSBS B.E. Project Report — Silent Bridge (HTML Preview)"
            }
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      )}
    </div>
  );
}
