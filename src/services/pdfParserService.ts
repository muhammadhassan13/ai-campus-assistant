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

export interface ParseResult {
  fullText: string;
  markdownFilePath?: string;
  chunks: ParsedChunk[];
}

interface LlamaJobStatusResponse {
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | string;
  [key: string]: unknown;
}

/**
 * Parses a PDF buffer using pdfjs-dist with multi-column spatial ordering
 * and saves a structured markdown representation locally.
 */
export async function parsePdfMultiColumn(
  buffer: Buffer,
  fileName: string = 'document.pdf',
  numColumns: number = 2,
  maxChunkLength: number = 500
): Promise<ParseResult> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;
  const chunks: ParsedChunk[] = [];
  let globalChunkIndex = 0;
  let fullTextAccumulator = '';
  let globalOffset = 0;

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

    const safeCols = Math.max(1, numColumns);
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

  // Ensure uploads directory exists and save locally
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const mdFileName = `${path.parse(fileName).name}-${Date.now()}.md`;
  const markdownFilePath = path.join(uploadsDir, mdFileName);
  await fs.writeFile(markdownFilePath, fullTextAccumulator, 'utf-8');

  return {
    fullText: fullTextAccumulator,
    markdownFilePath,
    chunks,
  };
}

/**
 * Integration with LlamaParse API: converts PDF to rich Markdown,
 * preserves tables and multi-column layout via parsing instructions and premium mode,
 * saves locally, and returns synced blocks with nodeIds.
 */
export async function parsePdfWithLlamaParse(
  fileBuffer: Buffer,
  fileName: string,
  maxChunkLength: number = 500
): Promise<ParseResult> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error('LLAMA_CLOUD_API_KEY is not set');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/pdf',
  });
  formData.append('file', blob, fileName);

  // Enable LlamaParse Premium Mode (vision-based layout & table parsing)
  formData.append('premium_mode', 'true');

  // Explicitly instruct LlamaParse to respect multi-column boundaries and table structures
  formData.append(
    'parsing_instruction',
    'This document has a multi-column layout with narrative text in one column and a structured data table in another. Do not merge or interleave text across column gutters. Extract each column completely in proper reading order and format all tables as clean Markdown GFM tables.'
  );

  const uploadRes = await axios.post(
    'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
    formData,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const jobId = uploadRes.data.id;

  let result: LlamaJobStatusResponse | null = null;
  while (!result) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await axios.get<LlamaJobStatusResponse>(
      `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    if (statusRes.data.status === 'SUCCESS') {
      result = statusRes.data;
    } else if (statusRes.data.status === 'ERROR') {
      throw new Error('LlamaParse job failed');
    }
  }

  const markdownRes = await axios.get(
    `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  const markdownText: string = markdownRes.data.markdown || '';

  // Save the structured Markdown locally
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const mdFileName = `${path.parse(fileName).name}-${Date.now()}.md`;
  const markdownFilePath = path.join(uploadsDir, mdFileName);
  await fs.writeFile(markdownFilePath, markdownText, 'utf-8');

  const segments = splitTextWithOffsets(markdownText, maxChunkLength);

  const chunks: ParsedChunk[] = segments.map((seg, idx) => ({
    chunkIndex: idx,
    text: seg.text,
    characterCount: seg.text.length,
    startOffset: seg.startOffset,
    endOffset: seg.endOffset,
    nodeId: `block-${idx}`,
  }));

  return {
    fullText: markdownText,
    markdownFilePath,
    chunks,
  };
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
