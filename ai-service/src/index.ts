import express from 'express';
import { ragRouter } from './routes/rag';
import { documentRouter } from './routes/document';
import { healthRouter } from './routes/health';
import { essayRouter } from './routes/essay';

const app = express();
const PORT = process.env.PORT ?? '3001';

app.use(express.json({ limit: '50mb' }));

app.use('/health', healthRouter);
app.use('/api/rag', ragRouter);
app.use('/api/document', documentRouter);
app.use('/api/essay', essayRouter);

const server = app.listen(Number(PORT), () => {
  console.log(`AI service running on port ${PORT}`);
  // Pre-warm Ollama so the model is loaded in memory before the first request
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'gemma3:1b';
  import('axios').then(({ default: axios }) => {
    axios.post(`${ollamaHost}/api/generate`, {
      model, prompt: 'hi', stream: false, keep_alive: '30m',
      options: { num_predict: 1, num_ctx: 512 },
    }, { timeout: 120000 })
      .then(() => console.log(`Ollama model ${model} warmed up`))
      .catch(e => console.warn('Ollama warm-up failed (will retry on first request):', e.message));
  });
});

// Prevent EOF errors on long LLM generations — Node.js default is 5s
server.keepAliveTimeout = 65 * 60 * 1000; // 65 minutes
server.headersTimeout   = 66 * 60 * 1000; // must be > keepAliveTimeout

export default app;
