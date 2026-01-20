import { hc } from "hono/client";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { generateProxy } from "./proxy.ts";

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
