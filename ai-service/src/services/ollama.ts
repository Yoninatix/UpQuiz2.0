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
        num_predict: options.maxTokens ?? 800,
        num_ctx: 4096,
        num_thread: 16,
      },
    },
    {
      timeout: 8 * 60 * 1000, // 8-minute timeout
    },
  );

  return response.data?.response ?? '';
}
