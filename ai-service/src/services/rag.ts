import { embedText } from './embeddings';
import { searchSimilarChunks, SearchResult } from './milvus';
import { generate } from './ollama';

export type QuestionType = 'multiple_choice' | 'true_or_false' | 'fill_in_the_blank' | 'essay' | 'matching';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionConfig {
  type: QuestionType;
  difficulty: Difficulty;
  count: number;
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  topic_tag: string;
  correct_answer: string;
  choices?: Record<string, string>[] | null;
  document_id: string;
  source_chunk_uuid: string;
  source_content: string;
}

const MIN_CHUNK_SCORE = 0.35; // cosine similarity threshold

/**
 * Full RAG pipeline:
 * 1. Embed the subject/topic query
 * 2. Retrieve relevant chunks from Milvus
 * 3. Build a source-grounded prompt
 * 4. Call Ollama/Gemma
 * 5. Parse and return structured questions
 */
export async function generateQuestionsFromRAG(
  subjectId: string,
  topicHint: string,
  configs: QuestionConfig[],
): Promise<GeneratedQuestion[]> {
  // 1. Embed the topic hint to find relevant chunks
  const queryEmbedding = await embedText(topicHint);

  const totalQuestions = configs.reduce((sum, c) => sum + c.count, 0);
  const chunks = await searchSimilarChunks(queryEmbedding, subjectId, Math.max(totalQuestions * 2, 10));

  const relevantChunks = chunks.filter(c => c.score >= MIN_CHUNK_SCORE);

  if (relevantChunks.length === 0) {
    throw new Error(
      'Not enough relevant content found in the uploaded documents to generate questions. ' +
      'Please upload more learning materials or refine the topic.',
    );
  }

  const questions: GeneratedQuestion[] = [];

  for (const cfg of configs) {
    const chunk = relevantChunks[questions.length % relevantChunks.length];
    const prompt = buildPrompt(cfg, chunk, topicHint);

    let rawOutput: string;
    try {
      rawOutput = await generate({ prompt, temperature: 0.2 });
    } catch (err) {
      console.error('Ollama generation error:', err);
      throw new Error('LLM generation failed. Is Ollama running with gemma loaded?');
    }

    const parsed = parseQuestions(rawOutput, cfg, chunk);
    questions.push(...parsed);
  }

  return questions;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(cfg: QuestionConfig, chunk: SearchResult, topic: string): string {
  const typeInstructions: Record<QuestionType, string> = {
    multiple_choice: `Generate ${cfg.count} multiple choice question(s). Each must have exactly 4 choices labeled A, B, C, D. State the correct letter as the answer.`,
    true_or_false: `Generate ${cfg.count} true or false question(s). Answer must be exactly "True" or "False".`,
    fill_in_the_blank: `Generate ${cfg.count} fill-in-the-blank question(s). Use ___ for the blank. Provide the exact word or phrase as the answer.`,
    essay: `Generate ${cfg.count} essay question(s). Provide a model answer of 2-3 sentences.`,
    matching: `Generate ${cfg.count} matching type question(s) with 4 pairs. Format as JSON with "left" and "right" keys per pair.`,
  };

  return `You are an exam question generator. Use ONLY facts from the source text below.

SOURCE TEXT:
"""
${chunk.content}
"""

TOPIC: ${topic}
DIFFICULTY: ${cfg.difficulty}
TASK: ${typeInstructions[cfg.type]}

IMPORTANT: Your entire response must be a single valid JSON array (starting with [ and ending with ]).
Each element of the array is an object with EXACTLY these keys:
  "question_text": the question as a string
  "question_type": "${cfg.type}"
  "difficulty": "${cfg.difficulty}"
  "topic_tag": a short label (1-4 words)
  "correct_answer": the answer as a string
  "choices": for multiple_choice use [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}], for matching use [{"left":"...","right":"..."},...], for all others use null

Example of the required format:
[{"question_text":"...","question_type":"${cfg.type}","difficulty":"${cfg.difficulty}","topic_tag":"...","correct_answer":"...","choices":null}]

Do NOT include any text outside the JSON array. No markdown, no code fences, no explanations.`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

function extractJSON(raw: string): any {
  // Strip markdown fences
  let text = raw.replace(/```json|```/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(text); } catch { /* fall through */ }

  // Find the outermost [...] or {...} block and try again
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* fall through */ }
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
  }

  console.warn('No parseable JSON in LLM response:', text.slice(0, 300));
  return null;
}

function parseQuestions(
  raw: string,
  cfg: QuestionConfig,
  chunk: SearchResult,
): GeneratedQuestion[] {
  const parsed = extractJSON(raw);
  if (parsed === null) return [];

  // Gemma sometimes returns a single object instead of an array — normalise it
  const items: any[] = Array.isArray(parsed)
    ? parsed
    : (parsed.question_text ? [parsed] : []);

  return items
    .filter(q => typeof q.question_text === 'string' && q.question_text.trim().length > 0)
    .slice(0, cfg.count)
    .map(q => ({
      question_text: q.question_text,
      question_type: cfg.type,
      difficulty: cfg.difficulty,
      topic_tag: q.topic_tag ?? cfg.type,
      correct_answer: String(q.correct_answer ?? ''),
      choices: q.choices ?? null,
      document_id: chunk.document_id,
      source_chunk_uuid: chunk.chunk_uuid,
      source_content: chunk.content,
    }));
}
