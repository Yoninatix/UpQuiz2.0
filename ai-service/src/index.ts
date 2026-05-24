import express from 'express';
import { ragRouter } from './routes/rag';
import { documentRouter } from './routes/document';
import { healthRouter } from './routes/health';

const app = express();
const PORT = process.env.PORT ?? '3001';

app.use(express.json({ limit: '50mb' }));

app.use('/health', healthRouter);
app.use('/api/rag', ragRouter);
app.use('/api/document', documentRouter);

app.listen(Number(PORT), () => {
  console.log(`AI service running on port ${PORT}`);
});

export default app;
