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
      stream: false,
      keep_alive: '30m',
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 120,
        num_ctx: 256,
        num_thread: 16,
        stop: ['```\n', '\n\n\n'],
      },
    },
    {
      timeout: 3 * 60 * 1000, // 3-minute timeout — fail fast and skip
    },
  );

  return response.data?.response ?? '';
}
