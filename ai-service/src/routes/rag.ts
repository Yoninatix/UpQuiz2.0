import { Router, Request, Response } from 'express';
import { generateQuestionsFromRAG, QuestionConfig } from '../services/rag';
import { z } from 'zod';

export const ragRouter = Router();

const GenerateSchema = z.object({
  subject_id: z.string().uuid(),
  topic_hint: z.string().min(3).max(500),
  configs: z.array(
    z.object({
      type: z.enum(['multiple_choice', 'true_or_false', 'fill_in_the_blank', 'essay', 'matching']),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      count: z.number().int().min(1).max(20),
    }),
  ).min(1),
});

/**
 * POST /api/rag/generate
 * Triggers the full RAG pipeline and returns generated questions.
 * The Go backend calls this, then saves results to Postgres.
 */
ragRouter.post('/generate', async (req: Request, res: Response) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { subject_id, topic_hint, configs } = parsed.data;

  try {
    const questions = await generateQuestionsFromRAG(
      subject_id,
      topic_hint,
      configs as QuestionConfig[],
    );

    if (questions.length === 0) {
      return res.status(422).json({
        error: 'The LLM returned no valid questions. The source content may be insufficient or unclear.',
      });
    }

    return res.json({ questions });
  } catch (err: any) {
    console.error('RAG generation error:', err);
    const message = err?.message ?? String(err) ?? 'Generation failed';
    return res.status(500).json({ error: message });
  }
});
