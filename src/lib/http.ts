import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler so thrown errors become clean JSON responses. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        const field = first?.path.join(".");
        return NextResponse.json(
          { error: field ? `${field}: ${first.message}` : first?.message ?? "Invalid input" },
          { status: 400 },
        );
      }
      console.error(e);
      const msg = e instanceof Error ? e.message : "Unexpected error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
