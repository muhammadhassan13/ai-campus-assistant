export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
}

/**
 * Recursively splits text at natural semantic boundaries (paragraphs, sentences, words)
 * to ensure chunks retain coherent meaning.
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 500,
  overlapSize: number = 50
): DocumentChunk[] {
  const cleanText = text.replace(/\r\n/g, '\n').trim();
  if (!cleanText) return [];

  // Primary semantic separators in order of structural priority
  const separators = ['\n\n', '\n', '. ', '? ', '! ', ' '];

  function splitRecursively(content: string, sepIndex: number): string[] {
    if (content.length <= maxChunkSize || sepIndex >= separators.length) {
      return [content];
    }

    const separator = separators[sepIndex];
    const rawSplits = content.split(separator);
    const combinedChunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < rawSplits.length; i++) {
      const piece = rawSplits[i];
      // Re-attach separator except for spaces
      const formattedPiece =
        i < rawSplits.length - 1 && separator !== ' '
          ? piece + separator
          : piece;

      if ((currentChunk + formattedPiece).length <= maxChunkSize) {
        currentChunk += formattedPiece;
      } else {
        if (currentChunk.trim().length > 0) {
          combinedChunks.push(currentChunk.trim());
        }

        // If a single segment is longer than maxChunkSize, split it using next finer separator
        if (formattedPiece.length > maxChunkSize) {
          const subChunks = splitRecursively(formattedPiece, sepIndex + 1);
          combinedChunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = formattedPiece;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      combinedChunks.push(currentChunk.trim());
    }

    return combinedChunks;
  }

  const rawChunks = splitRecursively(cleanText, 0);

  // Apply overlap while maintaining full sentence/word boundaries
  const finalChunks: DocumentChunk[] = [];

  rawChunks.forEach((chunkText, index) => {
    let textWithOverlap = chunkText;

    // Add trailing overlap from the previous chunk if available
    if (index > 0 && overlapSize > 0) {
      const prevChunk = rawChunks[index - 1];
      const overlapSnippet = prevChunk.slice(-overlapSize);
      textWithOverlap = `...${overlapSnippet} ${chunkText}`;
    }

    finalChunks.push({
      chunkIndex: index,
      text: textWithOverlap,
      characterCount: textWithOverlap.length,
    });
  });

  return finalChunks;
}
