import { config } from '../config';

/**
 * Split text into overlapping chunks by approximate word count.
 * Simple but effective for RAG on academic PDFs.
 */
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const { chunkSize, chunkOverlap } = config.chunking;

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    if (end === words.length) break;
    start += chunkSize - chunkOverlap;
  }

  return chunks;
}
