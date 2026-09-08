import Groq from 'groq-sdk';
import { DocumentModel } from '../models/document.model.js';
import { generateEmbeddings } from '../utils/embedding.utils.js';
import { cosineSimilarity } from '../utils/vector.util.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateRagResponse(
  query: string,
  documentId?: string,
  topK = 3
) {
  // 1. Retrieve specific document or default to latest upload
  const document = documentId
    ? await DocumentModel.findById(documentId)
    : await DocumentModel.findOne().sort({ createdAt: -1 });

  if (!document) {
    throw new Error('No uploaded document found.');
  }

  // 2. Embed user query string
  const queryEmbeddings = await generateEmbeddings([
    { chunkIndex: 0, text: query, characterCount: query.length },
  ]);
  const queryVector = queryEmbeddings[0].embedding;

  // 3. Calculate cosine similarity across document chunks
  const scoredChunks = document.chunks.map((chunk) => ({
    filename: document.originalName,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    score: cosineSimilarity(queryVector, chunk.embedding),
  }));

  // 4. Rank and slice top matches
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, topK);

  // 5. Construct context block
  const contextText = topChunks
    .map((c) => `[Source: ${c.filename}, Chunk ${c.chunkIndex}]\n${c.text}`)
    .join('\n\n');

  const systemPrompt = `You are an AI campus assistant. Answer the user's question accurately using only the provided context. You must explicitly cite the source document name and chunk number (e.g., [Source: filename.pdf, Chunk X]) whenever referencing facts. If the context does not contain enough information to answer, state that clearly.`;

  // 6. Request Groq LLM completion
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nContext:\n${contextText}`,
      },
      { role: 'user', content: query },
    ],
    temperature: 0.2,
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
