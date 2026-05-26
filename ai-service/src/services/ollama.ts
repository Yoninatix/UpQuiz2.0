import axios from 'axios';
import { config } from '../config';

export interface GenerateOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generate(options: GenerateOptions): Promise<string> {
  const response = await axios.post(
    `${config.ollama.host}/api/generate`,
    {
      model: config.ollama.model,
      prompt: options.prompt,
      stream: true,
      // format: 'json' removed — it causes gemma3:4b to output empty {}
      // We parse JSON ourselves from the free-form response instead
      keep_alive: '30m',
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 500,
        num_ctx: 4096,
        num_thread: 16,
      },
    },
    {
      responseType: 'stream',
      timeout: 0, // no connection timeout — stream stays alive as tokens arrive
    },
  );

  return new Promise((resolve, reject) => {
    let fullText = '';
    let buffer = '';
    let settled = false;

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(text);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    };

    // Abort after 3 minutes — resolve with whatever was accumulated so the
    // caller can decide whether the partial output is usable
    const timer = setTimeout(() => {
      console.warn('[Ollama] Generation timed out after 3 min, resolving with partial output');
      response.data.destroy();
      finish(fullText);
    }, 3 * 60 * 1000);

    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          fullText += parsed.response ?? '';
          if (parsed.done) finish(fullText);
          if (parsed.error) fail(new Error(parsed.error));
        } catch {
          // ignore malformed lines
        }
      }
    });

    response.data.on('end', () => finish(fullText));
    response.data.on('error', fail);
  });
}
