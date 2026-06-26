import { config } from 'dotenv';
import { z } from 'zod';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  DATABASE_URL: z.string().default('./data/praxios.sqlite'),
  DATA_DIR: z.string().default('./data'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
