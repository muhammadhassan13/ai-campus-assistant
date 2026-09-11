import Groq from 'groq-sdk';
import { DocumentModel } from '../models/document.model.js';
import { generateEmbeddings } from '../utils/embedding.utils.js';
import { cosineSimilarity } from '../utils/vector.util.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SIMILARITY_THRESHOLD = 0.2;

export async function generateRagResponse(
  query: string,
  documentId?: string | string[],
  topK = 3
) {
  // 1. Retrieve specific document(s) OR all documents if documentId is omitted
  let docs;
  if (Array.isArray(documentId) && documentId.length > 0) {
    docs = await DocumentModel.find({ _id: { $in: documentId } });
  } else if (typeof documentId === 'string' && documentId.trim() !== '') {
    docs = await DocumentModel.find({ _id: documentId });
  } else {
    docs = await DocumentModel.find();
  }

  if (!docs || docs.length === 0) {
    return {
      answer: 'I do not have any uploaded documents to reference.',
      sources: [],
    };
  }

  // 2. Generate embedding for query text
  const queryEmbeddings = await generateEmbeddings([
    { chunkIndex: 0, text: query, characterCount: query.length },
  ]);
  const queryVector = queryEmbeddings[0].embedding;

  // 3. Compute cosine similarity scores across ALL chunks from ALL target documents
  const scoredChunks: Array<{
    filename: string;
    chunkIndex: number;
    text: string;
    score: number;
  }> = [];

  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      // Fallback to empty array to satisfy TypeScript type requirements for chunk.embedding
      const score = cosineSimilarity(queryVector, chunk.embedding || []);
      scoredChunks.push({
        filename: doc.originalName,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        score,
      });
    }
  }

  // 4. Rank chunks by similarity score across all files
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, topK);

  // 5. Check relevance threshold
  if (topChunks.length === 0 || topChunks[0].score < SIMILARITY_THRESHOLD) {
    return {
      answer:
        'I do not have enough relevant information in the uploaded documents to answer this question.',
      sources: [],
    };
  }

  // 6. Construct prompt with multi-document context block and markdown table prevention rules
  const contextText = topChunks
    .map((c) => `[Source: ${c.filename}, Chunk ${c.chunkIndex}]\n${c.text}`)
    .join('\n\n');

  const systemPrompt = `You are an AI campus assistant. Answer the user's question accurately using ONLY the provided context. You must explicitly cite the source document name and chunk number (e.g., [Source: filename.pdf, Chunk X]) whenever referencing facts.

Formatting Rules:
- NEVER use markdown tables (pipes | and dashes -) under any circumstances.
- If presenting comparative information or multiple attributes, use structured lists with bold category titles and bullet points instead.
- If the context does not contain enough information, state that clearly. Do NOT make up information.`;

  // 7. Request Groq chat completion
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nContext:\n${contextText}`,
      },
      { role: 'user', content: query },
    ],
    temperature: 0.1,
  });

  return {
    answer: completion.choices[0]?.message?.content || 'No response generated.',
    sources: topChunks.map((c) => ({
      filename: c.filename,
      chunkIndex: c.chunkIndex,
      score: c.score,
    })),
  };
}
