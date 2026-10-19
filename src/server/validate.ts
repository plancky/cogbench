import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HTTPException(400, { message: r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") });
  }
  return r.data;
}

export async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "body must be JSON" });
  }
}
