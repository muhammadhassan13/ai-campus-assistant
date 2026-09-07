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

  // Normalize newlines while preserving single line breaks
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rawChunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    // Check length if line is added with newline character (+1)
    if (currentLength + line.length + 1 <= maxChunkSize) {
      currentChunk.push(line);
      currentLength += line.length + 1;
    } else {
      if (currentChunk.length > 0) {
        rawChunks.push(currentChunk.join('\n'));
      }

      // If a single line exceeds max size, split by sentence/space
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

  // Add word-safe overlap between adjacent chunks
  return rawChunks.map((chunkStr, index) => {
    let textWithOverlap = chunkStr;

    if (index > 0 && overlapSize > 0) {
      const prevLines = rawChunks[index - 1].split('\n');
      const lastLine = prevLines[prevLines.length - 1];

      // Grab trailing line or words for overlap context
      const overlapText =
        lastLine.length > overlapSize ? lastLine.slice(-overlapSize) : lastLine;

      textWithOverlap = `...${overlapText}\n${chunkStr}`;
    }

    return {
      chunkIndex: index,
      text: textWithOverlap,
      characterCount: textWithOverlap.length,
    };
  });
}
