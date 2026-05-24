export const config = {
  milvus: {
    host: process.env.MILVUS_HOST ?? 'localhost',
    port: Number(process.env.MILVUS_PORT ?? '19530'),
    collection: process.env.MILVUS_COLLECTION ?? 'document_chunks',
  },
  ollama: {
    host: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'gemma:2b',
    embeddingModel: 'nomic-embed-text', // lightweight embedding model via Ollama
  },
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? '5432'),
    database: process.env.POSTGRES_DB ?? 'examdb',
    user: process.env.POSTGRES_USER ?? 'examuser',
    password: process.env.POSTGRES_PASSWORD ?? 'exampassword',
  },
  uploads: {
    dir: process.env.UPLOADS_DIR ?? '/app/uploads',
  },
  chunking: {
    chunkSize: 500,   // tokens per chunk (approximate)
    chunkOverlap: 50, // token overlap between chunks
  },
};
