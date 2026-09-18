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
import { useTheme } from './useTheme';
import type { Theme } from './theme';

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

const MAX_W_RATIO = 0.92;
const MAX_H_RATIO = 0.92;
const PARTIAL_TEXT_LEN = 1200;
const PARTIAL_AREA_RATIO = 0.015;
const TABLE_MIN_ROW_HEIGHT_RATIO = 0.018;

interface HighlightPalette {
  yellowFill: string;
  yellowBorder: string;
  blueFill: string;
  blueBorder: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  hoverGreenBg: string;
  hoverGreenOutline: string;
  textPrimary: string;
  textSecondary: string;
  separator: string;
  separatorStrong: string;
  tableHeaderBg: string;
  gridBackground: string;
  paneBackground: string;
  paneBorder: string;
  paneShadow: string;
  paneHeaderBg: string;
  pdfScrollBg: string;
  mdScrollBg: string;
  mdPaperBg: string;
  mdPaperBorder: string;
  mdPaperShadow: string;
}

function getPalette(theme: Theme): HighlightPalette {
  if (theme.name === 'deep-space') {
    return {
      yellowFill: 'rgba(251, 191, 36, 0.35)',
      yellowBorder: '2px solid rgba(251, 191, 36, 1)',
      blueFill: 'rgba(99, 102, 241, 0.35)',
      blueBorder: '2px solid rgba(99, 102, 241, 1)',
      warningBg: 'rgba(251, 191, 36, 0.18)',
      warningBorder: '1px solid rgba(251, 191, 36, 0.5)',
      warningText: '#FBBF24',
      hoverGreenBg: 'rgba(52, 211, 153, 0.18)',
      hoverGreenOutline: '2px solid rgba(52, 211, 153, 0.85)',
      textPrimary: '#F8FAFC',
      textSecondary: 'rgba(148, 163, 184, 0.85)',
      separator: 'rgba(255, 255, 255, 0.08)',
      separatorStrong: 'rgba(255, 255, 255, 0.16)',
      tableHeaderBg: 'rgba(255, 255, 255, 0.06)',
      gridBackground: '#0A1128',
      paneBackground: 'rgba(30, 41, 59, 0.85)',
      paneBorder: '1px solid rgba(255, 255, 255, 0.08)',
      paneShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      paneHeaderBg: 'rgba(15, 23, 42, 0.5)',
      pdfScrollBg: '#0F172A',
      mdScrollBg: 'rgba(15, 23, 42, 0.5)',
      mdPaperBg: 'rgba(30, 41, 59, 0.9)',
      mdPaperBorder: '1px solid rgba(255, 255, 255, 0.08)',
      mdPaperShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    };
  }
  return {
    yellowFill: 'rgba(255, 159, 10, 0.35)',
    yellowBorder: '2px solid rgba(255, 159, 10, 1)',
    blueFill: 'rgba(10, 132, 255, 0.3)',
    blueBorder: '2px solid rgba(10, 132, 255, 1)',
    warningBg: 'rgba(255, 159, 10, 0.15)',
    warningBorder: '1px solid rgba(255, 159, 10, 0.5)',
    warningText: '#B45309',
    hoverGreenBg: 'rgba(48, 179, 80, 0.15)',
    hoverGreenOutline: '2px solid rgba(48, 179, 80, 0.8)',
    textPrimary: '#1C1C1E',
    textSecondary: 'rgba(60, 60, 67, 0.62)',
    separator: 'rgba(60, 60, 67, 0.10)',
    separatorStrong: 'rgba(60, 60, 67, 0.18)',
    tableHeaderBg: 'rgba(60, 60, 67, 0.06)',
    gridBackground:
      'linear-gradient(180deg, #F0F4FE 0%, #ECEEFB 45%, #F3ECF9 100%)',
    paneBackground: 'rgba(255, 255, 255, 0.72)',
    paneBorder: '1px solid rgba(255, 255, 255, 0.7)',
    paneShadow: '0 8px 24px rgba(31, 38, 71, 0.08)',
    paneHeaderBg: 'rgba(255, 255, 255, 0.5)',
    pdfScrollBg: '#E8ECF2',
    mdScrollBg: 'rgba(255, 255, 255, 0.45)',
    mdPaperBg: 'rgba(255, 255, 255, 0.85)',
    mdPaperBorder: '1px solid rgba(255, 255, 255, 0.7)',
    mdPaperShadow: '0 4px 16px rgba(31, 38, 71, 0.05)',
  };
}

function getBboxWarning(
  block: MarkdownBlock,
  pageWidth: number,
  pageHeight: number
): string | null {
  if (pageWidth <= 0 || pageHeight <= 0) return null;

  const wr = block.bbox.width / pageWidth;
  const hr = block.bbox.height / pageHeight;

  if (wr > MAX_W_RATIO || hr > MAX_H_RATIO) {
    return 'Approximate — bounding box spans multiple regions';
  }

  if (block.type !== 'heading') {
    const textLen = (block.value || block.md || '').length;
    const areaRatio =
      (block.bbox.width * block.bbox.height) / (pageWidth * pageHeight);
    if (textLen > PARTIAL_TEXT_LEN && areaRatio < PARTIAL_AREA_RATIO) {
      return 'Partial — bounding box may not cover full text';
    }
  }

  if (block.type === 'table' && block.rows && block.rows.length > 1) {
    const expectedMinHeight =
      pageHeight * TABLE_MIN_ROW_HEIGHT_RATIO * block.rows.length;
    if (block.bbox.height < expectedMinHeight * 0.5) {
      return 'Table bounding box may be inaccurate';
    }
  }

  return null;
}

function isBboxProportional(
  block: MarkdownBlock,
  pageWidth: number,
  pageHeight: number
): boolean {
  return getBboxWarning(block, pageWidth, pageHeight) === null;
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
    isBboxProportional(b, pageWidth, pageHeight)
  );
  if (sane.length === 0) return null;

  const sameType = sane.filter((b) => b.type === bad.type);
  const pool = sameType.length > 0 ? sameType : sane;

  const badCenterY = bad.bbox.y + bad.bbox.height / 2;
  pool.sort(
    (a, b) =>
      Math.abs(a.bbox.y + a.bbox.height / 2 - badCenterY) -
      Math.abs(b.bbox.y + b.bbox.height / 2 - badCenterY)
  );
  return pool[0];
}

interface PdfViewerProps {
  pdfUrl?: string;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  hoveredBlock: MarkdownBlock | null;
  fallbackBlock: MarkdownBlock | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady: () => void;
  palette: HighlightPalette;
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
  palette,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const [renderedPages, setRenderedPages] = useState(0);

  useEffect(() => {
    if (renderedPages === numPages && numPages > 0) onReady();
  }, [renderedPages, numPages, onReady]);

  if (!pdfUrl) {
    return (
      <div style={viewerStyles.pdfPlaceholder(palette)}>
        <span style={{ fontSize: 32 }}>📄</span>
        <span>Original document not available.</span>
      </div>
    );
  }

  if (pdfError) {
    return (
      <div
        style={{ ...viewerStyles.pdfPlaceholder(palette), color: '#E5342B' }}
      >
        <span style={{ fontSize: 32 }}>⚠️</span>
        <span>Failed to load PDF.</span>
      </div>
    );
  }

  const renderWidth = PDF_RENDER_WIDTH * scale;
  const scaleFactor = pageWidth > 0 ? renderWidth / pageWidth : 1;

  const drawBlock =
    hoveredBlock && isBboxProportional(hoveredBlock, pageWidth, pageHeight)
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
        <div style={viewerStyles.pdfLoading(palette)}>
          <span style={viewerStyles.spinner(palette)} />
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
                boxShadow: palette.paneShadow,
                borderRadius: 8,
                overflow: 'hidden',
                width: renderWidth,
                background: '#FFFFFF',
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
                        ? palette.blueFill
                        : palette.yellowFill,
                      border: drawIsFallback
                        ? palette.blueBorder
                        : palette.yellowBorder,
                      borderRadius: 4,
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

export const PdfComparator: React.FC<PdfComparatorProps> = ({
  blocks = [],
  pageWidth = 0,
  pageHeight = 0,
  pdfUrl,
}) => {
  const { theme } = useTheme();
  const palette = useMemo(() => getPalette(theme), [theme]);

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
    if (isBboxProportional(hoveredBlock, pageWidth, pageHeight)) return null;
    return findFallbackBlock(hoveredBlock, blocks, pageWidth, pageHeight);
  }, [hoveredBlock, blocks, pageWidth, pageHeight]);

  useEffect(() => {
    if (!hoveredBlockId) return;
    const container = pdfScrollRef.current;
    if (!container) return;
    const targetId =
      hoveredBlock && isBboxProportional(hoveredBlock, pageWidth, pageHeight)
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
      const warning = getBboxWarning(b, pageWidth, pageHeight);

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
                    color: palette.textPrimary,
                    fontSize: '1.7em',
                    margin: '12px 0 6px',
                    fontWeight: 700,
                  }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  style={{
                    color: palette.textPrimary,
                    fontSize: '1.3em',
                    margin: '10px 0 6px',
                    fontWeight: 600,
                  }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  style={{
                    color: palette.textPrimary,
                    fontSize: '1.1em',
                    margin: '8px 0 4px',
                    fontWeight: 600,
                  }}
                >
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ color: palette.textPrimary, margin: '0 0 8px' }}>
                  {children}
                </p>
              ),
              a: ({ children, href }) => (
                <a href={href} style={{ color: theme.accent }}>
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
                    border: `1px solid ${palette.separator}`,
                    padding: 6,
                    background: palette.tableHeaderBg,
                    color: palette.textPrimary,
                    textAlign: 'left',
                    fontWeight: 600,
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    border: `1px solid ${palette.separator}`,
                    padding: 6,
                    verticalAlign: 'top',
                    color: palette.textPrimary,
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
            padding: '6px 10px',
            margin: '2px 0',
            borderRadius: 10,
            backgroundColor: isHovered ? palette.hoverGreenBg : 'transparent',
            outline: isHovered ? palette.hoverGreenOutline : 'none',
            outlineOffset: 1,
            transition: 'background-color 120ms ease',
            cursor: 'pointer',
          }}
        >
          {warning && (
            <span
              title={warning}
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                fontSize: 10,
                fontWeight: 600,
                color: palette.warningText,
                background: palette.warningBg,
                border: palette.warningBorder,
                borderRadius: 6,
                padding: '2px 6px',
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
    palette,
    theme.accent,
  ]);

  return (
    <div style={comparatorStyles.grid(palette)}>
      <div style={comparatorStyles.paneLeft(palette)}>
        <div style={comparatorStyles.paneHeader(palette)}>
          Original Document
        </div>
        <div
          ref={pdfScrollRef}
          style={comparatorStyles.pdfScroll(palette)}
          data-scrollable
        >
          <PdfViewer
            pdfUrl={pdfUrl}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            hoveredBlock={hoveredBlock}
            fallbackBlock={fallbackBlock}
            containerRef={pdfPagesRef}
            onReady={() => setPdfReady(true)}
            palette={palette}
          />
        </div>
      </div>

      <div style={comparatorStyles.paneRight(palette)}>
        <div style={comparatorStyles.paneHeader(palette)}>
          Markdown Structure
        </div>
        <div
          ref={mdViewportRef}
          style={comparatorStyles.mdScroll(palette)}
          data-scrollable
        >
          <div style={comparatorStyles.mdPaper(palette)}>{renderedBlocks}</div>
        </div>
      </div>
    </div>
  );
};

const viewerStyles = {
  pdfPlaceholder: (p: HighlightPalette): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: p.textSecondary,
    fontSize: 13,
    flexDirection: 'column',
    gap: 8,
  }),
  pdfLoading: (p: HighlightPalette): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: p.textSecondary,
    fontSize: 13,
    gap: 10,
  }),
  spinner: (p: HighlightPalette): React.CSSProperties => ({
    display: 'inline-block',
    width: 18,
    height: 18,
    border: `2px solid ${p.separatorStrong}`,
    borderTop: `2px solid ${p.blueBorder.replace('2px solid ', '')}`,
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  }),
};

const comparatorStyles = {
  grid: (p: HighlightPalette): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 16,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    color: p.textPrimary,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    padding: 16,
    boxSizing: 'border-box',
    background: p.gridBackground,
  }),
  paneLeft: (p: HighlightPalette): React.CSSProperties => ({
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 20,
    background: p.paneBackground,
    border: p.paneBorder,
    boxShadow: p.paneShadow,
  }),
  paneRight: (p: HighlightPalette): React.CSSProperties => ({
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 20,
    background: p.paneBackground,
    border: p.paneBorder,
    boxShadow: p.paneShadow,
  }),
  paneHeader: (p: HighlightPalette): React.CSSProperties => ({
    padding: '10px 16px',
    borderBottom: `1px solid ${p.separator}`,
    background: p.paneHeaderBg,
    fontSize: 11,
    fontWeight: 700,
    color: p.textSecondary,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    flexShrink: 0,
  }),
  pdfScroll: (p: HighlightPalette): React.CSSProperties => ({
    minHeight: 0,
    flex: 1,
    overflow: 'auto',
    padding: 16,
    background: p.pdfScrollBg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }),
  mdScroll: (p: HighlightPalette): React.CSSProperties => ({
    minHeight: 0,
    flex: 1,
    overflow: 'auto',
    padding: 16,
    background: p.mdScrollBg,
  }),
  mdPaper: (p: HighlightPalette): React.CSSProperties => ({
    width: '100%',
    minHeight: '100%',
    color: p.textPrimary,
    background: p.mdPaperBg,
    padding: 24,
    boxSizing: 'border-box',
    fontSize: 12,
    lineHeight: 1.5,
    borderRadius: 14,
    border: p.mdPaperBorder,
    boxShadow: p.mdPaperShadow,
  }),
};

export default PdfComparator;
