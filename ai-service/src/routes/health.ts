import { Router } from 'express';
import axios from 'axios';
import { db } from '../db';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const status: Record<string, string> = { service: 'ok' };

  // Check Postgres
  try {
    await db.query('SELECT 1');
    status.postgres = 'ok';
  } catch {
    status.postgres = 'error';
  }

  // Check Ollama
  try {
    await axios.get(`${config.ollama.host}/api/tags`, { timeout: 3000 });
    status.ollama = 'ok';
  } catch {
    status.ollama = 'error';
  }

  const allOk = Object.values(status).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json(status);
});
