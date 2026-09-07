# Document Chunking Strategy

## Overview

To prepare extracted text for vector embeddings and RAG retrieval, text is split using **Recursive Sentence-Aware Chunking** rather than fixed character offsets.

## Strategy Parameters

- **Target Max Size**: `500` characters
- **Overlap**: `50` characters
- **Splitting Hierarchy**: `\n\n` (paragraphs) ➔ `\n` (lines) ➔ `. ` / `? ` / `! ` (sentences) ➔ ` ` (words)

## Justification

1. **Semantic Preservation**: By prioritizing natural text boundaries, chunks maintain coherent thoughts, full sentences, and logical context.
2. **Elimination of Word Clipping**: Words and sentences are never severed mid-character or mid-phrase, resulting in vastly higher semantic search accuracy in vector databases.
3. **Overlapping Context**: A 50-character overlap carries trailing contextual state between adjacent chunks.
