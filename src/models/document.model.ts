import { Schema, model, Document } from 'mongoose';

export interface IDocumentChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
  embedding: number[];
}

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  fileSize: number;
  characterCount: number;
  totalChunks: number;
  chunks: IDocumentChunk[];
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>({
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  characterCount: { type: Number, required: true },
  embedding: { type: [Number], required: true },
});

const DocumentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    characterCount: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    chunks: [DocumentChunkSchema],
  },
  { timestamps: true }
);

export const DocumentModel = model<IDocument>('Document', DocumentSchema);
