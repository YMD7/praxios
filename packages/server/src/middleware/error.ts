import type { Context, MiddlewareHandler, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler: MiddlewareHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        {
          error: 'Validation error',
          issues: err.errors,
        },
        400
      );
    }

    if (err instanceof HTTPException) {
      return c.json(
        {
          error: err.message,
        },
        err.status
      );
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error(err);
    return c.json({ error: message }, 500);
  }
};
