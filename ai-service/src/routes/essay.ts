import { Router, Request, Response } from 'express';
import { embedText } from '../services/embeddings';
import { z } from 'zod';

export const essayRouter = Router();

const ScoreSchema = z.object({
  model_answer:   z.string().min(1),
  student_answer: z.string().min(1),
});

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * POST /api/essay/score
 * Body: { model_answer: string, student_answer: string }
 * Returns: { score: number (0-100), similarity: number (0-1) }
 *
 * Uses nomic-embed-text to embed both answers and computes cosine
 * similarity. Score < 30 → 0 points (off-topic). Score ≥ 30 is
 * proportional — similarity maps linearly from 30-100 → 0-100.
 */
essayRouter.post('/score', async (req: Request, res: Response) => {
  const parsed = ScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { model_answer, student_answer } = parsed.data;

  try {
    const [modelEmb, studentEmb] = await Promise.all([
      embedText(model_answer),
      embedText(student_answer),
    ]);

    const similarity = cosineSimilarity(modelEmb, studentEmb);

    // Map similarity to a 0-100 score.
    // Threshold of 0.30: anything below is considered off-topic (0 pts).
    // Above threshold: linear scale from 30→0% to 100→100%.
    const MIN_SIM = 0.30;
    const score = similarity < MIN_SIM
      ? 0
      : Math.round(((similarity - MIN_SIM) / (1 - MIN_SIM)) * 100);

    return res.json({ score, similarity: Math.round(similarity * 1000) / 1000 });
  } catch (err: any) {
    console.error('Essay scoring error:', err);
    return res.status(500).json({ error: err?.message ?? 'Essay scoring failed' });
  }
});
