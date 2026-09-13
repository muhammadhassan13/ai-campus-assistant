export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
}

export function chunkText(
  text: string,
  maxChunkSize: number = 500,
  overlapSize: number = 50
): DocumentChunk[] {
  if (!text.trim()) return [];

  // Clean up Markdown table lines and isolated table pipes
  const cleanedText = text
    .replace(/\|?\s*[-:]+[-| :]*\|?/g, ' ')
    .replace(/\|/g, ' ');

  // Normalize newlines while preserving single line breaks
  const lines = cleanedText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0);

  const rawChunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    if (currentLength + line.length + 1 <= maxChunkSize) {
      currentChunk.push(line);
      currentLength += line.length + 1;
    } else {
      if (currentChunk.length > 0) {
        rawChunks.push(currentChunk.join('\n'));
      }

      if (line.length > maxChunkSize) {
        const sentences = line.match(/[^.!?]+[.!?]+|\s*[^.!?]+/g) || [line];
        let subChunk = '';

        for (const sentence of sentences) {
          if ((subChunk + sentence).length <= maxChunkSize) {
            subChunk += sentence;
          } else {
            if (subChunk) rawChunks.push(subChunk.trim());
            subChunk = sentence;
          }
        }
        if (subChunk) {
          currentChunk = [subChunk.trim()];
          currentLength = subChunk.trim().length;
        } else {
          currentChunk = [];
          currentLength = 0;
        }
      } else {
        currentChunk = [line];
        currentLength = line.length;
      }
    }
  }

  if (currentChunk.length > 0) {
    rawChunks.push(currentChunk.join('\n'));
  }

  // Generate chunks using clean base references to avoid compounding overlaps
  return rawChunks.map((chunkStr, index) => {
    let textWithOverlap = chunkStr;

    if (index > 0 && overlapSize > 0) {
      const prevChunk = rawChunks[index - 1]; // Always reference the clean previous chunk

      const targetLength = Math.min(overlapSize, prevChunk.length);
      const rawSlice = prevChunk.slice(-targetLength);

      const firstSpaceIndex = rawSlice.indexOf(' ');
      const overlapText =
        firstSpaceIndex !== -1 && firstSpaceIndex < rawSlice.length - 1
          ? rawSlice.slice(firstSpaceIndex + 1)
          : rawSlice;

      textWithOverlap = `${overlapText} ${chunkStr}`;
    }

    return {
      chunkIndex: index,
      text: textWithOverlap,
      characterCount: textWithOverlap.length,
    };
  });
}
