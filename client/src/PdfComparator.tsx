import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ParsedChunk {
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  characterCount?: number;
  nodeId?: string;
  markdownBlockId?: string;
  startOffset?: number;
  endOffset?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface MarkdownBlock {
  id: string;
  type: 'text' | 'heading' | 'table';
  md: string;
  value: string;
  pageNumber: number;
  bbox: { x: number; y: number; width: number; height: number };
  level?: number;
  rows?: string[][];
  html?: string;
}

interface PdfComparatorProps {
  markdownContent?: string;
  blocks?: MarkdownBlock[];
  pageWidth?: number;
  pageHeight?: number;
  pdfUrl?: string;
}

const PDF_RENDER_WIDTH = 520;
const MAX_W_RATIO = 0.55;
const MAX_H_RATIO = 0.55;

function isBboxSane(
  bbox: { width: number; height: number },
  pageWidth: number,
  pageHeight: number
): boolean {
  if (pageWidth <= 0 || pageHeight <= 0) return true;
  return (
    bbox.width / pageWidth <= MAX_W_RATIO &&
    bbox.height / pageHeight <= MAX_H_RATIO
  );
}

function findFallbackBlock(
  bad: MarkdownBlock,
  all: MarkdownBlock[],
  pageWidth: number,
  pageHeight: number
): MarkdownBlock | null {
  const samePage = all.filter(
    (b) => b.pageNumber === bad.pageNumber && b.id !== bad.id
  );
  const sane = samePage.filter((b) =>
    isBboxSane(b.bbox, pageWidth, pageHeight)
  );
  if (sane.length === 0) return null;

  const badCenterY = bad.bbox.y + bad.bbox.height / 2;
  sane.sort(
    (a, b) =>
      Math.abs(a.bbox.y + a.bbox.height / 2 - badCenterY) -
      Math.abs(b.bbox.y + b.bbox.height / 2 - badCenterY)
  );
  return sane[0];
}

// ─── PDF Viewer ──────────────────────────────────────────────────────────────

interface PdfViewerProps {
  pdfUrl?: string;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  hoveredBlock: MarkdownBlock | null;
  fallbackBlock: MarkdownBlock | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady: () => void;
}

function PdfViewer({
  pdfUrl,
  scale,
  pageWidth,
  pageHeight,
  hoveredBlock,
  fallbackBlock,
  containerRef,
  onReady,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const [renderedPages, setRenderedPages] = useState(0);

  useEffect(() => {
    if (renderedPages === numPages && numPages > 0) onReady();
  }, [renderedPages, numPages, onReady]);

  if (!pdfUrl) {
    return (
      <div style={styles.pdfPlaceholder}>
        <span style={{ fontSize: 32 }}>📄</span>
        <span>Original document not available.</span>
      </div>
    );
  }

  if (pdfError) {
    return (
      <div style={{ ...styles.pdfPlaceholder, color: '#FCA5A5' }}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <span>Failed to load PDF.</span>
      </div>
    );
  }

  const renderWidth = PDF_RENDER_WIDTH * scale;
  const scaleFactor = pageWidth > 0 ? renderWidth / pageWidth : 1;

  const drawBlock =
    hoveredBlock && isBboxSane(hoveredBlock.bbox, pageWidth, pageHeight)
      ? hoveredBlock
      : fallbackBlock;

  const drawIsFallback =
    drawBlock && hoveredBlock && drawBlock.id !== hoveredBlock.id;

  const overlayBlocks = drawBlock ? [drawBlock] : [];

  const blocksByPage = new Map<number, MarkdownBlock[]>();
  for (const b of overlayBlocks) {
    const arr = blocksByPage.get(b.pageNumber) || [];
    arr.push(b);
    blocksByPage.set(b.pageNumber, arr);
  }

  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={({ numPages }) => {
        setNumPages(numPages);
        setRenderedPages(0);
      }}
      onLoadError={() => setPdfError(true)}
      loading={
        <div style={styles.pdfLoading}>
          <span style={styles.spinner} />
          Loading document…
        </div>
      }
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div ref={containerRef as React.RefObject<HTMLDivElement>}>
        {Array.from({ length: numPages }, (_, i) => {
          const pageNumber = i + 1;
          const pageBlocks = blocksByPage.get(pageNumber) || [];
          return (
            <div
              key={pageNumber}
              style={{
                position: 'relative',
                marginBottom: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                borderRadius: 3,
                overflow: 'hidden',
                width: renderWidth,
              }}
            >
              <Page
                pageNumber={pageNumber}
                width={renderWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={() => setRenderedPages((n) => n + 1)}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {pageBlocks.map((b) => (
                  <div
                    key={b.id}
                    data-block-id={b.id}
                    style={{
                      position: 'absolute',
                      left: b.bbox.x * scaleFactor,
                      top: b.bbox.y * scaleFactor,
                      width: Math.max(4, b.bbox.width * scaleFactor),
                      height: Math.max(4, b.bbox.height * scaleFactor),
                      backgroundColor: drawIsFallback
                        ? 'rgba(99, 179, 237, 0.35)'
                        : 'rgba(251, 191, 36, 0.5)',
                      border: drawIsFallback
                        ? '2px solid rgba(99, 179, 237, 1)'
                        : '2px solid rgba(251, 146, 60, 1)',
                      borderRadius: 2,
                      transition: 'background-color 120ms ease',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Document>
  );
}

// ─── Main Comparator ─────────────────────────────────────────────────────────

export const PdfComparator: React.FC<PdfComparatorProps> = ({
  blocks = [],
  pageWidth = 0,
  pageHeight = 0,
  pdfUrl,
}) => {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [, setPdfReady] = useState(false);

  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const pdfPagesRef = useRef<HTMLDivElement>(null);
  const mdViewportRef = useRef<HTMLDivElement>(null);

  const rafRef = useRef<number | null>(null);
  const pendingBlockIdRef = useRef<string | null>(null);
  const lastBlockIdRef = useRef<string | null>(null);

  const commitHover = useCallback(() => {
    rafRef.current = null;
    const next = pendingBlockIdRef.current;
    if (lastBlockIdRef.current === next) return;
    lastBlockIdRef.current = next;
    setHoveredBlockId(next);
  }, []);

  const handleMouseOver = useCallback(
    (blockId: string) => {
      pendingBlockIdRef.current = blockId;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(commitHover);
      }
    },
    [commitHover]
  );

  const handleMouseLeave = useCallback(() => {
    pendingBlockIdRef.current = null;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(commitHover);
    }
  }, [commitHover]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const container = pdfScrollRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale((prev) => {
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          return Math.min(Math.max(prev * factor, 0.5), 4.0);
        });
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const hoveredBlock = useMemo(
    () =>
      hoveredBlockId
        ? (blocks.find((b) => b.id === hoveredBlockId) ?? null)
        : null,
    [hoveredBlockId, blocks]
  );

  const fallbackBlock = useMemo(() => {
    if (!hoveredBlock) return null;
    if (isBboxSane(hoveredBlock.bbox, pageWidth, pageHeight)) return null;
    return findFallbackBlock(hoveredBlock, blocks, pageWidth, pageHeight);
  }, [hoveredBlock, blocks, pageWidth, pageHeight]);

  useEffect(() => {
    if (!hoveredBlockId) return;
    const container = pdfScrollRef.current;
    if (!container) return;
    const targetId =
      hoveredBlock && isBboxSane(hoveredBlock.bbox, pageWidth, pageHeight)
        ? hoveredBlock.id
        : fallbackBlock?.id;
    if (!targetId) return;

    const el = container.querySelector<HTMLElement>(
      `[data-block-id="${targetId}"]`
    );
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const ctRect = container.getBoundingClientRect();
    if (elRect.top < ctRect.top || elRect.bottom > ctRect.bottom) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [hoveredBlockId, hoveredBlock, fallbackBlock, pageWidth, pageHeight]);

  const renderedBlocks = useMemo(() => {
    return blocks.map((b) => {
      const isHovered = hoveredBlockId === b.id;
      const sane = isBboxSane(b.bbox, pageWidth, pageHeight);

      const content =
        b.type === 'table' && b.html ? (
          <div dangerouslySetInnerHTML={{ __html: b.html }} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h1
                  style={{
                    color: '#111827',
                    fontSize: '1.7em',
                    margin: '12px 0 6px',
                  }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  style={{
                    color: '#111827',
                    fontSize: '1.3em',
                    margin: '10px 0 6px',
                  }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  style={{
                    color: '#111827',
                    fontSize: '1.1em',
                    margin: '8px 0 4px',
                  }}
                >
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ color: '#111827', margin: '0 0 8px' }}>
                  {children}
                </p>
              ),
              a: ({ children, href }) => (
                <a href={href} style={{ color: '#1D4ED8' }}>
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.9em',
                    }}
                  >
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  style={{
                    border: '1px solid #64748B',
                    padding: 6,
                    background: '#334155',
                    color: '#F1F5F9',
                    textAlign: 'left',
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    border: '1px solid #475569',
                    padding: 6,
                    verticalAlign: 'top',
                  }}
                >
                  {children}
                </td>
              ),
            }}
          >
            {b.md.replace(/~~/g, '')}
          </ReactMarkdown>
        );

      return (
        <div
          key={b.id}
          onMouseEnter={() => handleMouseOver(b.id)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'relative',
            padding: '4px 8px',
            margin: '2px 0',
            borderRadius: 4,
            backgroundColor: isHovered
              ? 'rgba(16, 185, 129, 0.25)'
              : 'transparent',
            outline: isHovered ? '2px solid rgba(5, 150, 105, 0.8)' : 'none',
            outlineOffset: 1,
            transition: 'background-color 120ms ease',
            cursor: 'pointer',
          }}
        >
          {!sane && (
            <span
              title="LlamaParse returned an ambiguous bounding box for this block. Hovering highlights the nearest reliable block instead."
              style={{
                position: 'absolute',
                top: 4,
                right: 6,
                fontSize: 10,
                color: '#B45309',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                borderRadius: 4,
                padding: '1px 5px',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              ⚠ approximate
            </span>
          )}
          {content}
        </div>
      );
    });
  }, [
    blocks,
    hoveredBlockId,
    pageWidth,
    pageHeight,
    handleMouseOver,
    handleMouseLeave,
  ]);

  return (
    <div style={styles.grid}>
      <div style={styles.paneLeft}>
        <div style={styles.paneHeader}>📄 Original Document</div>
        <div ref={pdfScrollRef} style={styles.pdfScroll}>
          <PdfViewer
            pdfUrl={pdfUrl}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            hoveredBlock={hoveredBlock}
            fallbackBlock={fallbackBlock}
            containerRef={pdfPagesRef}
            onReady={() => setPdfReady(true)}
          />
        </div>
      </div>

      <div style={styles.paneRight}>
        <div style={styles.paneHeader}>〈/〉 Markdown Structure</div>
        <div ref={mdViewportRef} style={styles.mdScroll}>
          <div style={styles.mdPaper}>{renderedBlocks}</div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 0,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    color: '#F8FAFC',
    fontFamily: 'var(--sans, system-ui, -apple-system, Segoe UI, sans-serif)',
  },
  paneLeft: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid #334155',
    background: '#1E293B',
  },
  paneRight: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderLeft: '1px solid #334155',
    background: '#1E293B',
  },
  paneHeader: {
    padding: '8px 14px',
    borderBottom: '1px solid #334155',
    background: '#0F172A',
    fontSize: 11,
    fontWeight: 600,
    color: '#94A3B8',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  pdfScroll: {
    minHeight: 0,
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    padding: 16,
    background: '#2D3748',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  pdfPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748B',
    fontSize: 13,
    flexDirection: 'column',
    gap: 8,
  },
  pdfLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94A3B8',
    fontSize: 13,
    gap: 10,
  },
  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2px solid #334155',
    borderTop: '2px solid #818CF8',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  mdScroll: {
    minHeight: 0,
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    background: '#F8FAFC',
  },
  mdPaper: {
    width: '100%',
    minHeight: '100%',
    color: '#111827',
    background: '#FFFFFF',
    padding: 18,
    boxSizing: 'border-box',
    fontSize: 11,
    lineHeight: 1.35,
  },
};

export default PdfComparator;
