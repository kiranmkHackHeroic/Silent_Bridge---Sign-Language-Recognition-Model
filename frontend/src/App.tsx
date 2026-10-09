import { useEffect, useState } from "react";
import { AboutTesting } from "./pages/AboutTesting";
import { DatasetModel } from "./pages/DatasetModel";
import { KannadaToSign } from "./pages/KannadaToSign";
import { LiveRecognition } from "./pages/LiveRecognition";

const PAGES = [
  { id: "live", label: "Live Recognition", icon: "◉" },
  { id: "k2s", label: "Kannada to Sign", icon: "ಅ" },
  { id: "dataset", label: "Dataset & Model", icon: "▤" },
  { id: "about", label: "About & Testing", icon: "ⓘ" },
] as const;
type PageId = (typeof PAGES)[number]["id"];

function initialPage(): PageId {
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
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function App() {
  const [page, setPage] = useState<PageId>(initialPage);
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
    const onHash = () => setPage(initialPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: PageId) => {
    location.hash = id;
    setPage(id);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" lang="kn">ಸ</span>
          <div>
            <h1>Kannada SignBridge</h1>
            <p>Real-Time Sign Language Communication</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Main">
          {PAGES.map((p) => (
            <button key={p.id} className={`tab ${page === p.id ? "active" : ""}`} onClick={() => go(p.id)} aria-current={page === p.id ? "page" : undefined}>
              <span className="tab-icon" aria-hidden>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>
        <button className="btn btn-ghost theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle colour theme">
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </header>
      <main className="content">
        {page === "live" && <LiveRecognition />}
        {page === "k2s" && <KannadaToSign />}
        {page === "dataset" && <DatasetModel />}
        {page === "about" && <AboutTesting />}
      </main>
      <footer className="footer">
        Final-year project prototype · camera processing is local · recognizes only trained, supported signs
      </footer>
    </div>
  );
}
