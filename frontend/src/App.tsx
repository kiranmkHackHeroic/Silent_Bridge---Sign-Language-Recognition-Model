import { useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { AboutTesting } from "./pages/AboutTesting";
import { DatasetModel } from "./pages/DatasetModel";
import { KannadaToSign } from "./pages/KannadaToSign";
import { LiveRecognition } from "./pages/LiveRecognition";

const PAGES: { id: PageId; label: string; icon: IconName }[] = [
  { id: "live", label: "Live Recognition", icon: "hand" },
  { id: "k2s", label: "Kannada to Sign", icon: "text" },
  { id: "dataset", label: "Dataset & Model", icon: "database" },
  { id: "about", label: "About & Testing", icon: "flask" },
];
type PageId = "live" | "k2s" | "dataset" | "about";

function pageFromHash(): PageId {
  const h = location.hash.replace("#", "");
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: PageId) => {
    if (location.hash !== `#${id}`) location.hash = id;
    setPage(id);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" lang="kn" aria-hidden>ಸ</span>
          <div>
            <h1>Kannada SignBridge</h1>
            <p>Real-Time Sign Language Recognition and Kannada Communication</p>
          </div>
        </div>
        <nav className="nav" aria-label="Main sections">
          {PAGES.map((p) => (
            <button key={p.id} className={`nav-btn ${page === p.id ? "active" : ""}`} onClick={() => go(p.id)} aria-current={page === p.id ? "page" : undefined}>
              <Icon name={p.icon} size={16} />
              <span className="nav-label">{p.label}</span>
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
        </div>
      </header>
      <main className="content">
        {page === "live" && <LiveRecognition />}
        {page === "k2s" && <KannadaToSign />}
        {page === "dataset" && <DatasetModel />}
        {page === "about" && <AboutTesting />}
      </main>
      <footer className="footer">
        Kannada SignBridge · final-year project prototype · camera processing stays on this computer · recognizes only trained, supported signs
      </footer>
    </div>
  );
}
