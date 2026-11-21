import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Spinner } from "./ui";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  url: string;
  targetPage: number;
  onPageChange?: (page: number) => void;
}

interface PdfPageCanvasProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  containerWidth: number;
  forceRender: boolean;
  onVisible: (pageNumber: number) => void;
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  scale,
  containerWidth,
  forceRender,
  onVisible,
}: PdfPageCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = useState(forceRender);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (forceRender) setShouldRender(true);
  }, [forceRender]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldRender(true);
            if (entry.intersectionRatio >= 0.35) {
              onVisible(pageNumber);
            }
          }
        }
      },
      { rootMargin: "500px 0px", threshold: [0, 0.35, 0.7] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageNumber, onVisible]);

  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = Math.max(280, Math.min(containerWidth - 40, 860)) * scale;
        const cssScale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: cssScale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        await renderTask.promise;
        if (!cancelled) setRendered(true);
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name !== "RenderingCancelledException" && !cancelled) {
          // Ignore transient cancellation errors during zoom or unmount
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, scale, containerWidth, shouldRender]);

  const estWidth = Math.max(280, Math.min(containerWidth - 40, 860)) * scale;
  const estHeight = Math.round(estWidth * 1.4142);

  return (
    <div
      ref={wrapRef}
      data-pdf-page={pageNumber}
      data-rendered={rendered ? "true" : "false"}
      className="pdf-page-slot"
      style={{
        width: `${Math.floor(estWidth)}px`,
        minHeight: rendered ? undefined : `${estHeight}px`,
      }}
    >
      <div className="pdf-page-badge">Page {pageNumber}</div>
      <canvas ref={canvasRef} className="pdf-page-canvas" />
      {!rendered && (
        <div className="pdf-page-loading">
          <span>Rendering page {pageNumber}…</span>
        </div>
      )}
    </div>
  );
}

export function PdfViewer({ url, targetPage, onPageChange }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(targetPage || 1);
  const [pageInput, setPageInput] = useState<string>(String(targetPage || 1));
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(900);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    setPdf(null);

    const loadingTask = pdfjsLib.getDocument({ url });
    loadingTask.promise
      .then((doc) => {
        if (!active) {
          void loadingTask.destroy();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load PDF document.");
        }
      });

    return () => {
      active = false;
      void loadingTask.destroy();
    };
  }, [url]);

  const scrollToPage = (pageNum: number) => {
    const clamped = Math.max(1, Math.min(numPages || 79, pageNum));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    onPageChange?.(clamped);
    const container = scrollRef.current;
    if (!container) return;
    const slot = container.querySelector(`[data-pdf-page="${clamped}"]`) as HTMLElement | null;
    if (slot) {
      container.scrollTo({
        top: Math.max(0, slot.offsetTop - 16),
        behavior: "auto",
      });
    }
  };

  useEffect(() => {
    if (!pdf || !targetPage) return;
    const clamped = Math.max(1, Math.min(pdf.numPages, targetPage));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    const container = scrollRef.current;
    if (!container) return;
    const slot = container.querySelector(`[data-pdf-page="${clamped}"]`) as HTMLElement | null;
    if (slot) {
      container.scrollTo({
        top: Math.max(0, slot.offsetTop - 16),
        behavior: "auto",
      });
    }
  }, [pdf, targetPage]);

  const handleVisible = useCallback((p: number) => {
    setCurrentPage(p);
    setPageInput(String(p));
  }, []);

  return (
    <div className="pdf-viewer-shell">
      <div className="pdf-viewer-bar">
        <div className="pdf-viewer-controls">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Prev
          </button>
          <form
            className="pdf-page-form"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseInt(pageInput, 10);
              if (!Number.isNaN(parsed)) scrollToPage(parsed);
            }}
          >
            <span className="xs muted">Page</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Jump to PDF page number"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="pdf-page-input"
            />
            <span className="xs muted">/ {numPages || "—"}</span>
          </form>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={!numPages || currentPage >= numPages}
          >
            Next
          </button>
        </div>

        <div className="pdf-viewer-controls">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setScale((s) => Math.max(0.65, Number((s - 0.15).toFixed(2))))}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="xs tabular" style={{ minWidth: 44, textAlign: "center", fontWeight: 650 }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setScale((s) => Math.min(1.6, Number((s + 0.15).toFixed(2))))}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setScale(1)}
          >
            Fit
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="pdf-viewer-scroll">
        {error && (
          <div className="pdf-viewer-state">
            <p style={{ marginBottom: 10 }}>Could not render PDF inline: {error}</p>
            <a href={url} download className="btn btn-sm btn-primary" style={{ textDecoration: "none" }}>
              Download PDF Directly
            </a>
          </div>
        )}
        {!error && !pdf && (
          <div className="pdf-viewer-state">
            <Spinner label="Loading 79-page Final Report & iThenticate PDF…" />
          </div>
        )}
        {pdf &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <PdfPageCanvas
              key={pageNum}
              pdf={pdf}
              pageNumber={pageNum}
              scale={scale}
              containerWidth={containerWidth}
              forceRender={Math.abs(pageNum - currentPage) <= 1}
              onVisible={handleVisible}
            />
          ))}
      </div>
    </div>
  );
}
