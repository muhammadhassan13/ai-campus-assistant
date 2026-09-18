import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfJsTextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

export interface IBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  nodeId?: string;
  bbox?: IBbox;
}

export interface MarkdownBlock {
  id: string;
  type: 'text' | 'heading' | 'table';
  md: string;
  value: string;
  pageNumber: number;
  bbox: IBbox;
  level?: number;
  rows?: string[][];
  html?: string;
}

export interface ParseResult {
  fullText: string;
  markdownFilePath?: string;
  chunks: ParsedChunk[];
  layout?: DocumentLayout;
  blocks?: MarkdownBlock[];
  pageDimensions?: { width: number; height: number };
}

export interface DocumentLayout {
  pageCount: number;
  columnCounts: number[];
  maxColumns: number;
}

const ODL_BASE_URL = process.env.ODL_SIDECAR_URL || 'http://localhost:8000';
const ODL_TIMEOUT_MS = 10 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// OpenDataLoader sidecar parser (primary path)
// ─────────────────────────────────────────────────────────────────────────────

export async function parsePdfWithOpenDataLoader(
  fileBuffer: Buffer,
  fileName: string,
  maxChunkLength: number = 500
): Promise<ParseResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/pdf',
  });
  formData.append('file', blob, fileName);

  let res;
  try {
    res = await axios.post(`${ODL_BASE_URL}/parse`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: ODL_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? err.response?.data?.detail || err.message
      : String(err);
    throw new Error(`OpenDataLoader sidecar request failed: ${msg}`);
  }

  const data = res.data as {
    fullText: string;
    blocks: MarkdownBlock[];
    pageDimensions: { width: number; height: number } | null;
  };

  const fullText = typeof data.fullText === 'string' ? data.fullText : '';
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const mdFileName = `${path.parse(fileName).name}-${Date.now()}.md`;
  const markdownFilePath = path.join(uploadsDir, mdFileName);
  await fs.writeFile(markdownFilePath, fullText, 'utf-8');

  const segments = splitTextWithOffsets(fullText, maxChunkLength);
  const chunks: ParsedChunk[] = segments
    .filter((seg) => seg.text && seg.text.trim().length > 0)
    .map((seg, idx) => ({
      chunkIndex: idx,
      text: seg.text,
      characterCount: seg.text.length,
      startOffset: seg.startOffset,
      endOffset: seg.endOffset,
      nodeId: `block-${idx}`,
    }));

  const pageDimensions = data.pageDimensions
    ? { width: data.pageDimensions.width, height: data.pageDimensions.height }
    : undefined;

  console.log(
    '[OpenDataLoader] markdown length =',
    fullText.length,
    '| blocks =',
    blocks.length,
    '| chunks =',
    chunks.length
  );

  return {
    fullText,
    markdownFilePath,
    chunks,
    blocks,
    pageDimensions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Local pdfjs parser (fallback path — no sidecar required)
// ─────────────────────────────────────────────────────────────────────────────

export async function parsePdfMultiColumn(
  buffer: Buffer,
  fileName: string = 'document.pdf',
  numColumns?: number,
  maxChunkLength: number = 500
): Promise<ParseResult> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;
  const chunks: ParsedChunk[] = [];
  let globalChunkIndex = 0;
  let fullTextAccumulator = '';
  let globalOffset = 0;
  const columnCounts: number[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = (textContent.items as unknown[])
      .filter((item): item is PdfJsTextItem => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'str' in item &&
          'transform' in item &&
          Array.isArray((item as PdfJsTextItem).transform)
        );
      })
      .map((item) => {
        const transform = item.transform;
        return {
          str: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width || 0,
          height: item.height || 0,
        };
      });

    const safeCols = numColumns
      ? Math.max(1, Math.floor(numColumns))
      : detectColumnCount(items, viewport.width);
    columnCounts.push(safeCols);
    const colWidth = viewport.width / safeCols;
    const columns: TextItem[][] = Array.from({ length: safeCols }, () => []);

    for (const item of items) {
      const colIndex = Math.min(Math.floor(item.x / colWidth), safeCols - 1);
      columns[colIndex].push(item);
    }

    columns.forEach((col) => col.sort((a, b) => b.y - a.y));

    const orderedItems = columns.flat();
    const fullPageText = orderedItems.map((i) => i.str).join(' ');

    if (!fullPageText.trim()) continue;

    const pageSegments = splitTextWithOffsets(fullPageText, maxChunkLength);

    for (const segment of pageSegments) {
      const nodeId = `block-${globalChunkIndex}`;
      chunks.push({
        chunkIndex: globalChunkIndex++,
        text: segment.text,
        characterCount: segment.text.length,
        pageNumber: pageNum,
        startOffset: globalOffset + segment.startOffset,
        endOffset: globalOffset + segment.endOffset,
        nodeId,
        bbox: {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        },
      });
    }

    fullTextAccumulator += (fullTextAccumulator ? '\n\n' : '') + fullPageText;
    globalOffset = fullTextAccumulator.length;
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const mdFileName = `${path.parse(fileName).name}-${Date.now()}.md`;
  const markdownFilePath = path.join(uploadsDir, mdFileName);
  await fs.writeFile(markdownFilePath, fullTextAccumulator, 'utf-8');

  return {
    fullText: fullTextAccumulator,
    markdownFilePath,
    chunks,
    layout: {
      pageCount: pdfDocument.numPages,
      columnCounts,
      maxColumns: Math.max(1, ...columnCounts),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function toTextItems(items: unknown[]): TextItem[] {
  return items
    .filter((item): item is PdfJsTextItem => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'str' in item &&
        'transform' in item &&
        Array.isArray((item as PdfJsTextItem).transform)
      );
    })
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      height: item.height || 0,
    }));
}

function detectColumnCount(items: TextItem[], pageWidth: number): number {
  const occupiedItems = items.filter((item) => item.str.trim());
  if (occupiedItems.length < 8) return 1;

  const binCount = 100;
  const occupiedBins = Array.from({ length: binCount }, () => false);
  for (const item of occupiedItems) {
    const start = Math.max(0, Math.floor((item.x / pageWidth) * binCount));
    const end = Math.min(
      binCount - 1,
      Math.ceil(((item.x + item.width) / pageWidth) * binCount)
    );
    for (let index = start; index <= end; index++) {
      occupiedBins[index] = true;
    }
  }

  const minimumGutterBins = Math.max(2, Math.ceil(binCount * 0.025));
  let gutters = 0;
  let emptyRun = 0;
  for (const occupied of occupiedBins) {
    if (occupied) {
      if (emptyRun >= minimumGutterBins) gutters++;
      emptyRun = 0;
    } else {
      emptyRun++;
    }
  }

  return Math.min(6, Math.max(1, gutters + 1));
}

interface SplitSegment {
  text: string;
  startOffset: number;
  endOffset: number;
}

function splitTextWithOffsets(text: string, maxLength: number): SplitSegment[] {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ text: string; startOffset: number }> = [];
  let currentLines: string[] = [];
  let currentStart = 0;
  let offset = 0;

  const flushBlock = () => {
    const blockText = currentLines.join('\n').trim();
    if (blockText) {
      const leadingWhitespace = currentLines.join('\n').search(/\S/);
      blocks.push({
        text: blockText,
        startOffset: currentStart + Math.max(0, leadingWhitespace),
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const isBlank = line.trim() === '';
    const isTableRow = /^\s*\|.*\|\s*$/.test(line);
    const currentIsTable = currentLines.some((item) =>
      /^\s*\|.*\|\s*$/.test(item)
    );

    if (isBlank) {
      flushBlock();
    } else if (currentLines.length > 0 && isTableRow !== currentIsTable) {
      flushBlock();
      currentStart = offset;
      currentLines.push(line);
    } else {
      if (currentLines.length === 0) currentStart = offset;
      currentLines.push(line);
    }

    offset += line.length + 1;
  }
  flushBlock();

  const segments: SplitSegment[] = [];
  for (const block of blocks) {
    const isTable = block.text
      .split('\n')
      .some((line) => /^\s*\|.*\|\s*$/.test(line));

    if (isTable || block.text.length <= maxLength) {
      segments.push({
        text: block.text,
        startOffset: block.startOffset,
        endOffset: block.startOffset + block.text.length,
      });
    } else {
      let subStart = block.startOffset;
      let remaining = block.text;
      while (remaining.length > 0) {
        let chunkLen = Math.min(maxLength, remaining.length);
        if (chunkLen < remaining.length) {
          const lastSpace = remaining.lastIndexOf(' ', chunkLen);
          if (lastSpace > maxLength * 0.5) {
            chunkLen = lastSpace + 1;
          }
        }
        const chunkText = remaining.slice(0, chunkLen).trim();
        if (chunkText) {
          segments.push({
            text: chunkText,
            startOffset: subStart,
            endOffset: subStart + chunkText.length,
          });
        }
        subStart += chunkLen;
        remaining = remaining.slice(chunkLen);
      }
    }
  }

  return segments;
}
