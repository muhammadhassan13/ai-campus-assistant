import { Schema, model, Document, Types } from 'mongoose';

export interface IBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IChunk {
  _id?: Types.ObjectId;
  chunkIndex?: number;
  text: string;
  characterCount?: number;
  embedding?: number[];
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  nodeId?: string;
  markdownBlockId?: string;
  bbox?: IBbox;
}

export interface IMarkdownBlock {
  id: string;
  type: string;
  md: string;
  value: string;
  pageNumber: number;
  bbox: IBbox;
  level?: number;
  rows?: string[][];
  html?: string;
}

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  fileSize: number;
  characterCount: number;
  totalChunks: number;
  fullText?: string;
  chunks: IChunk[];
  blocks: IMarkdownBlock[];
  pageWidth?: number;
  pageHeight?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const bboxSchema = new Schema<IBbox>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const chunkSchema = new Schema<IChunk>(
  {
    chunkIndex: { type: Number, index: true },
    text: { type: String, required: true },
    characterCount: { type: Number },
    embedding: { type: [Number], select: false },
    pageNumber: { type: Number },
    startOffset: { type: Number },
    endOffset: { type: Number },
    nodeId: { type: String },
    markdownBlockId: { type: String },
    bbox: { type: bboxSchema },
  },
  { _id: true }
);

const markdownBlockSchema = new Schema<IMarkdownBlock>(
  {
    id: { type: String, required: true },
    type: { type: String, default: 'text' },
    md: { type: String, default: '' },
    value: { type: String, default: '' },
    pageNumber: { type: Number, required: true },
    bbox: { type: bboxSchema, required: true },
    level: { type: Number },
    rows: { type: [[String]] },
    html: { type: String },
  },
  { _id: false }
);

const documentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    characterCount: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    fullText: { type: String, default: '' },
    chunks: [chunkSchema],
    blocks: { type: [markdownBlockSchema], default: [] },
    pageWidth: { type: Number, default: 0 },
    pageHeight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DocumentModel = model<IDocument>('Document', documentSchema);
