import { useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { AboutTesting } from "./pages/AboutTesting";
import { CustomSigns } from "./pages/CustomSigns";
import { DatasetModel } from "./pages/DatasetModel";
import { KannadaToSign } from "./pages/KannadaToSign";
import { LiveRecognition } from "./pages/LiveRecognition";
import { ProjectReport } from "./pages/ProjectReport";
import { SignReference } from "./pages/SignReference";

type PageId = "live" | "custom" | "k2s" | "reference" | "dataset" | "about" | "report";

interface NavItem {
  id: PageId;
  label: string;
  hint: string;
  icon: IconName;
  group: "Studios" | "Corpus & Evaluation" | "Academic Deliverables";
}

const PAGES: NavItem[] = [
  { id: "live", label: "Live Recognition", hint: "ISL → Kannada", icon: "hand", group: "Studios" },
  { id: "k2s", label: "Kannada to Sign", hint: "Text/Voice → 3D", icon: "text", group: "Studios" },
  { id: "custom", label: "Custom Signs", hint: "Few-Shot Studio", icon: "record", group: "Studios" },
  { id: "reference", label: "Sign Reference", hint: "144 Dataset Clips", icon: "eye", group: "Corpus & Evaluation" },
  { id: "dataset", label: "Dataset & Model", hint: "Train & Calibrate", icon: "database", group: "Corpus & Evaluation" },
  { id: "about", label: "About & Testing", hint: "Metrics & Protocol", icon: "flask", group: "Corpus & Evaluation" },
  { id: "report", label: "Report, Paper & PPT", hint: "79p Final PDF · IEEE · PPT", icon: "download", group: "Academic Deliverables" },
];

const NAV_GROUPS: NavItem["group"][] = [
  "Studios",
  "Corpus & Evaluation",
  "Academic Deliverables",
];

function pageFromHash(): PageId {
  const h = location.hash.replace("#", "");
  if (h === "paper" || h === "ppt") return "report";
  return (PAGES.find((p) => p.id === h)?.id ?? "live") as PageId;
}

function initialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash());
      setMobileNavOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: PageId) => {
    if (location.hash !== `#${id}`) location.hash = id;
    setPage(id);
    setMobileNavOpen(false);
  };

  const activeItem = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const quickSwitchTarget: PageId = page === "live" ? "k2s" : "live";
  const quickSwitchLabel = page === "live" ? "Kannada → 3D" : "Live Studio";

  return (
    <div className="workspace-shell">
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`} aria-label="Workspace navigation">
        <a
          href="#live"
          className="sidebar-brand"
          onClick={(e) => {
            e.preventDefault();
            go("live");
          }}
        >
          <span className="logo" lang="kn" aria-hidden="true">ಸ</span>
          <div className="sidebar-brand-text">
            <strong>Silent Bridge</strong>
            <span>Kannada SignBridge</span>
          </div>
        </a>

        <nav className="sidebar-nav" aria-label="Main sections">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="sidebar-group">
              <div className="sidebar-group-label">{group}</div>
              {PAGES.filter((p) => p.group === group).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`sidebar-link ${page === p.id ? "active" : ""}`}
                  onClick={() => go(p.id)}
                  aria-current={page === p.id ? "page" : undefined}
                >
                  <Icon name={p.icon} size={16} />
                  <span className="sidebar-link-body">
                    <span className="sidebar-link-title">{p.label}</span>
                    <span className="sidebar-link-hint">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-theme-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
            <span>{theme === "dark" ? "Light Appearance" : "Dark Appearance"}</span>
          </button>
          <div className="sidebar-inst">
            B.M.S. College of Engineering · Dept. of CSBS
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
            >
              <Icon name={mobileNavOpen ? "x" : "layers"} size={16} />
              <span>Menu</span>
            </button>
            <div className="topbar-breadcrumb">
              <span className="muted topbar-root">Silent Bridge</span>
              <span className="muted topbar-root" aria-hidden="true">/</span>
              <strong>{activeItem.label}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => go(quickSwitchTarget)}
            >
              <Icon name={quickSwitchTarget === "k2s" ? "text" : "hand"} size={14} />
              <span>{quickSwitchLabel}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm topbar-theme-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <main key={page} className="content page-transition">
          {page === "live" && <LiveRecognition />}
          {page === "custom" && <CustomSigns />}
          {page === "k2s" && <KannadaToSign />}
          {page === "reference" && <SignReference />}
          {page === "dataset" && <DatasetModel />}
          {page === "about" && <AboutTesting />}
          {page === "report" && <ProjectReport />}
        </main>

        <footer className="footer">
          <strong>SILENT BRIDGE:</strong> Real-Time Bidirectional Indian Sign Language and Kannada Translation with 3D Avatar · B.M.S. College of Engineering (Dept. of CSBS)
        </footer>
      </div>
    </div>
  );
}
