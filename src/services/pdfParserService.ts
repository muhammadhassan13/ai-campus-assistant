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

interface LlamaJobStatusResponse {
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | string;
  [key: string]: unknown;
}

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

export async function parsePdfWithLlamaParse(
  fileBuffer: Buffer,
  fileName: string,
  maxChunkLength: number = 500
): Promise<ParseResult> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error('LLAMA_CLOUD_API_KEY is not set');

  const layout = await inspectPdfLayout(fileBuffer);

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/pdf',
  });
  formData.append('file', blob, fileName);

  // Use auto_mode instead of premium_mode — auto_mode respects
  // multi-column layouts better and produces tighter bboxes.
  formData.append('auto_mode', 'true');
  formData.append('high_res_ocr', 'true');
  formData.append('adaptive_long_table', 'true');
  formData.append('outlined_table_extraction', 'true');

  formData.append(
    'parsing_instruction',
    `First inspect the document and determine its reading order, page layout, number of text columns, headings, lists, and tables. This document was detected with approximately ${layout.maxColumns} column(s) across ${layout.pageCount} page(s), but layouts may vary by page. Preserve the detected structure; do not impose columns where none exist and do not merge text across column gutters. Convert the result to clean Markdown, using GFM tables only for actual tables and preserving headings, lists, paragraphs, and section order.

IMPORTANT: This document may contain both English and Arabic text. Please OCR Arabic text as actual Arabic characters — do NOT substitute descriptions like "Arabic text describing..." or "logo: <text>". If a region is a pure image or logo with no readable text, omit it entirely rather than describing it.`
  );

  const uploadRes = await axios.post(
    'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
    formData,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  const jobId = uploadRes.data.id;

  let result: LlamaJobStatusResponse | null = null;
  while (!result) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await axios.get<LlamaJobStatusResponse>(
      `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (statusRes.data.status === 'SUCCESS') {
      result = statusRes.data;
    } else if (statusRes.data.status === 'ERROR') {
      throw new Error('LlamaParse job failed');
    }
  }

  const jsonRes = await axios.get(
    `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  const structured = jsonRes.data as {
    markdown?: string;
    text?: string;
    pages?: Array<{
      page?: number;
      width?: number;
      height?: number;
      items?: Array<Record<string, unknown>>;
    }>;
  };

  const blocks: MarkdownBlock[] = [];
  let pageWidth = 0;
  let pageHeight = 0;

  const pages = Array.isArray(structured.pages) ? structured.pages : [];

  pages.forEach((page, pageIdx) => {
    if (page.width) pageWidth = page.width;
    if (page.height) pageHeight = page.height;
    const pageNum = page.page ?? pageIdx + 1;
    const items = page.items || [];

    items.forEach((it, itemIdx) => {
      const raw = it as {
        type?: string;
        md?: string;
        value?: string;
        lvl?: number;
        rows?: string[][];
        html?: string;
        bBox?: { x: number; y: number; w: number; h: number };
      };

      if (!raw.bBox) return;
      if (!raw.md && !raw.value) return;

      const type = (raw.type || 'text') as MarkdownBlock['type'];
      if (type !== 'text' && type !== 'heading' && type !== 'table') return;

      blocks.push({
        id: `p${pageNum}_i${itemIdx}`,
        type,
        md: raw.md || raw.value || '',
        value: raw.value || raw.md || '',
        pageNumber: pageNum,
        bbox: {
          x: raw.bBox.x,
          y: raw.bBox.y,
          width: raw.bBox.w,
          height: raw.bBox.h,
        },
        level: raw.lvl,
        rows: raw.rows,
        html: raw.html,
      });
    });
  });

  let markdownText: string = structured.markdown || structured.text || '';

  if (!markdownText && blocks.length > 0) {
    markdownText = blocks
      .map((b) => b.md || b.value)
      .filter((s) => s && s.trim().length > 0)
      .join('\n\n');
    console.log('[LlamaParse] reconstructed markdown from blocks');
  }

  console.log(
    '[LlamaParse] markdown length =',
    markdownText.length,
    '| blocks =',
    blocks.length
  );

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const mdFileName = `${path.parse(fileName).name}-${Date.now()}.md`;
  const markdownFilePath = path.join(uploadsDir, mdFileName);
  await fs.writeFile(markdownFilePath, markdownText, 'utf-8');

  let segments = splitTextWithOffsets(markdownText, maxChunkLength);

  if (segments.length === 0 && blocks.length > 0) {
    console.log('[LlamaParse] falling back to per-block chunking');
    segments = blocks.map((b, i) => ({
      text: b.md || b.value,
      startOffset: i,
      endOffset: i + 1,
    }));
  }

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

  console.log('[LlamaParse] produced chunks:', chunks.length);

  return {
    fullText: markdownText,
    markdownFilePath,
    chunks,
    layout,
    blocks,
    pageDimensions: { width: pageWidth, height: pageHeight },
  };
}

async function inspectPdfLayout(buffer: Buffer): Promise<DocumentLayout> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;
  const columnCounts: number[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = toTextItems(textContent.items as unknown[]);
    columnCounts.push(detectColumnCount(items, viewport.width));
  }

  return {
    pageCount: pdfDocument.numPages,
    columnCounts,
    maxColumns: Math.max(1, ...columnCounts),
  };
}

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
