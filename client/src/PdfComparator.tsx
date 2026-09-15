import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export interface ParsedChunk {
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  characterCount?: number;
  nodeId?: string;
  markdownBlockId?: string; // Backward compatibility
  startOffset?: number;
  endOffset?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

interface PdfComparatorProps {
  chunks: ParsedChunk[];
  markdownContent?: string;
}

function formatParsedText(text: string): string {
  return text
    .replace(/<!--.*?-->/gs, '')
    .replace(/<\/?(?:table|thead|tbody|tfoot|tr|th|td|caption)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/gm, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|\n)\s*\|\s*/g, '$1')
    .replace(/\s*\|\s*(?=\S)/g, '  |  ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForMatch(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function addSafeMarkdownAnchors(
  markdown: string,
  chunks: ParsedChunk[]
): string {
  let cursor = 0;
  let result = '';

  for (const chunk of chunks) {
    const chunkText = String(chunk.text ?? '').trim();
    if (!chunkText || chunkText.includes('|')) continue;

    const start = markdown.indexOf(chunkText, cursor);
    if (start === -1) continue;

    result += markdown.slice(cursor, start);
    result += `<span data-block-index="${chunk.chunkIndex}"></span>`;
    result += markdown.slice(start, start + chunkText.length);
    cursor = start + chunkText.length;
  }

  return result + markdown.slice(cursor);
}

export const PdfComparator: React.FC<PdfComparatorProps> = ({
  chunks,
  markdownContent,
}) => {
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(
    null
  );
  const renderedMarkdown = addSafeMarkdownAnchors(
    (markdownContent || '').replace(/~~/g, ''),
    chunks
  );
  const markdownViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChunkIndex === null || !markdownViewportRef.current) return;

    const chunk = chunks.find((item) => item.chunkIndex === selectedChunkIndex);
    if (!chunk) return;

    const anchor = markdownViewportRef.current.querySelector<HTMLElement>(
      `[data-block-index="${selectedChunkIndex}"]`
    );
    const anchoredTarget = anchor?.parentElement?.closest<HTMLElement>(
      'p, h1, h2, h3, h4, li, blockquote'
    );
    if (anchoredTarget) {
      const previousBackground = anchoredTarget.style.backgroundColor;
      const previousOutline = anchoredTarget.style.outline;
      anchoredTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.28)';
      anchoredTarget.style.outline = '2px solid rgba(5, 150, 105, 0.75)';
      anchoredTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return () => {
        anchoredTarget.style.backgroundColor = previousBackground;
        anchoredTarget.style.outline = previousOutline;
      };
    }

    const targetText = normalizeForMatch(chunk.text).slice(0, 100);
    if (!targetText) return;

    const elements = Array.from(
      markdownViewportRef.current.querySelectorAll<HTMLElement>(
        'p, h1, h2, h3, h4, li, td, th, blockquote'
      )
    );
    const target = elements.find((element) =>
      normalizeForMatch(element.textContent || '').includes(targetText)
    );
    if (!target) return;

    const previousBackground = target.style.backgroundColor;
    const previousOutline = target.style.outline;
    target.style.backgroundColor = 'rgba(16, 185, 129, 0.28)';
    target.style.outline = '2px solid rgba(5, 150, 105, 0.75)';
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return () => {
      target.style.backgroundColor = previousBackground;
      target.style.outline = previousOutline;
    };
  }, [selectedChunkIndex, chunks]);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 0,
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        color: '#F8FAFC',
        fontFamily:
          'var(--sans, system-ui, -apple-system, Segoe UI, sans-serif)',
      }}
    >
      {/* Left pane: the same parsed blocks rendered as Markdown */}
      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 0,
          borderRight: '1px solid #334155',
          background: '#1E293B',
        }}
      >
        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            background: '#F8FAFC',
          }}
          ref={markdownViewportRef}
        >
          {markdownContent ? (
            <div
              style={{
                width: '100%',
                minHeight: '100%',
                color: '#111827',
                background: '#FFFFFF',
                padding: '18px',
                boxSizing: 'border-box',
                fontSize: '11px',
                lineHeight: 1.35,
                columnCount: 4,
                columnGap: '18px',
                columnRule: '1px solid #CBD5E1',
                overflow: 'visible',
              }}
            >
              <div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({ children }) => (
                      <h1 style={{ color: '#111827', fontSize: '1.8em' }}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 style={{ color: '#111827', fontSize: '1.35em' }}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 style={{ color: '#111827', fontSize: '1.15em' }}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ color: '#111827', margin: '0 0 10px' }}>
                        {children}
                      </p>
                    ),
                    a: ({ children, href }) => (
                      <a href={href} style={{ color: '#1D4ED8' }}>
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
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
                          padding: '8px',
                          background: '#334155',
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
                          padding: '8px',
                          verticalAlign: 'top',
                        }}
                      >
                        {children}
                      </td>
                    ),
                  }}
                >
                  {renderedMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No Markdown content available.
            </p>
          )}
        </div>
      </div>

      {/* Right pane: parsed chunks with the same block IDs */}
      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 0,
          borderLeft: '1px solid #334155',
          background: '#1E293B',
        }}
      >
        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {chunks.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              No matching chunks found.
            </div>
          ) : (
            chunks.map((chunk) => {
              const isSelected = selectedChunkIndex === chunk.chunkIndex;
              const displayId = chunk.nodeId || `block-${chunk.chunkIndex}`;
              return (
                <div
                  key={chunk.chunkIndex}
                  onClick={() => {
                    setSelectedChunkIndex(chunk.chunkIndex);
                  }}
                  onMouseEnter={() => setSelectedChunkIndex(chunk.chunkIndex)}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: `1px solid ${isSelected ? '#818CF8' : '#334155'}`,
                    background: isSelected
                      ? 'rgba(49, 46, 129, 0.6)'
                      : 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer',
                    transition:
                      'background 120ms ease, border-color 120ms ease',
                  }}
                >
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Chunk #{chunk.chunkIndex}</span>
                    <span>
                      Page {chunk.pageNumber ?? '1'} •{' '}
                      {chunk.characterCount ?? chunk.text.length} chars
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-indigo-400 mb-1">
                    ID: {displayId}
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {formatParsedText(chunk.text)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfComparator;
