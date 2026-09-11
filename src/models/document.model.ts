import { Schema, model, Document } from 'mongoose';

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  fileSize: number;
  characterCount: number;
  totalChunks: number;
  chunks: Array<{
    chunkIndex: number;
    text: string;
    characterCount: number;
    embedding?: number[];
  }>;
  createdAt?: Date;
  updatedAt?: Date; // <-- Add this property to your interface
}

const documentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    characterCount: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    chunks: [
      {
        chunkIndex: Number,
        text: String,
        characterCount: Number,
        embedding: [Number],
      },
    ],
  },
  { timestamps: true } // <-- Add this schema option so Mongoose generates createdAt & updatedAt
);

export const DocumentModel = model<IDocument>('Document', documentSchema);
