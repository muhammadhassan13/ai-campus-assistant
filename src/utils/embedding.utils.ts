import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// Disable native node addon checks and enforce local/WASM execution
env.allowLocalModels = true;
env.useFS = true;

export interface EmbeddedChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
  embedding: number[];
}

// Strictly typed pipeline reference instead of 'any'
let featureExtractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!featureExtractor) {
    featureExtractor = (await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )) as FeatureExtractionPipeline;
  }
  return featureExtractor;
}

/**
 * Generates 384-dimensional vector embeddings locally for document chunks.
 */
export async function generateEmbeddings(
  chunks: Array<{ chunkIndex: number; text: string; characterCount: number }>
): Promise<EmbeddedChunk[]> {
  const extractor = await getExtractor();
  const embeddedChunks: EmbeddedChunk[] = [];

  for (const chunk of chunks) {
    const output = await extractor(chunk.text, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = Array.from(output.data) as number[];

    embeddedChunks.push({
      ...chunk,
      embedding,
    });
  }

  return embeddedChunks;
}
