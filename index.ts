import { Hono } from "@hono/hono";
import { hc } from "@hono/hono/client";
import { HTTPException } from "@hono/hono/http-exception";
import type { ContentfulStatusCode } from "@hono/hono/utils/http-status";
import { type Type, type } from "arktype";
import superjson from "superjson";
import { generateProxy } from "./proxy.ts";

export function router<T extends Record<string, CallableFunction>>(
  routes: T,
  options?: {
    basePath?: string;
  }
) {
  const app = new Hono();
  for (const [key, value] of Object.entries(routes)) {
    app.post(options?.basePath ? `${options.basePath}/${key}` : key, async (c) => {
      const parsedInput: Record<string, unknown> = {};

      try {
        for (const [key, value] of Object.entries(await c.req.json())) {
          try {
            parsedInput[key] = superjson.parse(value as string);
          } catch {
            parsedInput[key] = value;
          }
        }
      } catch {
        // pass
      }

      try {
        const res = await value(parsedInput);
        return c.json(res ?? null);
      } catch (e) {
        if (e instanceof Error) {
          return c.json({ error: e.message }, 400);
        }
        return c.json({ error: e }, 400);
      }
    });
  }
  return {
    app,
    routes,
  };
}

export function client<T extends Record<string, CallableFunction>>(baseUrl = "") {
  const client = hc(baseUrl, {
    async fetch(input: RequestInfo | URL, requestInit?: RequestInit) {
      const inputPath = input.toString().replace(baseUrl, "");
      const targetUrl = baseUrl + inputPath;
      const res = await fetch(targetUrl, {
        ...requestInit,
      });
      if (!res.ok) {
        throw new HTTPException(res.status as ContentfulStatusCode, {
          message: await res.text(),
        });
      }
      return res.json();
    },
  });
  return generateProxy(client) as unknown as {
    [K in keyof T]: T[K];
  };
}

export const rpc = {
  input: <T extends Type>(schema: T) => ({
    execute: activate(schema),
  }),
  execute: activate(type("undefined")),
};

function activate<T extends Type>(schema: T) {
  type Schema = typeof schema.infer;
  return <R>(execute: (input: Schema) => Promise<R> | R) =>
    (schema.ifEquals("undefined")
      ? () => execute(undefined as Schema)
      : (i: T["infer"]) => execute(schema.assert(i))) as Schema extends undefined
      ? () => Promise<R>
      : (input: Schema) => Promise<R>;
}
