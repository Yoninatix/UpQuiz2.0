import axios from 'axios';
import { config } from '../config';

/**
 * Generate an embedding vector for a text string using Ollama.
 * Uses nomic-embed-text model which produces 768-dim vectors.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await axios.post(`${config.ollama.host}/api/embeddings`, {
    model: config.ollama.embeddingModel,
    prompt: text,
  });
  return response.data.embedding as number[];
}

/**
 * Batch embed multiple texts sequentially (Ollama is single-threaded locally).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const emb = await embedText(text);
    embeddings.push(emb);
  }
  return embeddings;
}
