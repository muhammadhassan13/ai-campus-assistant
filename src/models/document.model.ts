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

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  fileSize: number;
  characterCount: number;
  totalChunks: number;
  fullText?: string;
  chunks: IChunk[];
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
    // Vector search indices are configured externally in MongoDB Atlas Search
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

const documentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    characterCount: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    fullText: { type: String, default: '' },
    chunks: [chunkSchema],
  },
  { timestamps: true }
);

export const DocumentModel = model<IDocument>('Document', documentSchema);
