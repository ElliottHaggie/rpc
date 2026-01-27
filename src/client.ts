import { randomUUID } from "node:crypto";
import { parse, stringify } from "superjson";
import type { API } from "./server";

interface Callbacks {
  onRequest?: (request: Request) => unknown;
  onResponse?: (request: Response) => unknown;
}

export function client<T extends API>(baseUrl: string, callbacks?: Callbacks) {
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  return generateProxy({}, baseUrl, callbacks) as Readonly<T>;
}

// The client can only be given the type of the router, not the actual router for obvious security reasons
// This means that it's all essentially running off hallucinated types

/** Mocks the router created on the server */
function generateProxy(target: object, path: string, callbacks?: Callbacks) {
  return new Proxy(target, {
    get(_target, key) {
      if (typeof key !== "string") throw new TypeError("Cannot index RPC client with a symbol");
      const newPath = `${path}/${key}`;
      async function fn(data: unknown[]) {
        const req = new Request(newPath, {
          method: "POST",
          headers: { reqId: randomUUID() },
          body: stringify(data),
        });
        callbacks?.onRequest?.(req.clone());
        const res = await fetch(req);
        callbacks?.onResponse?.(res.clone());
        const parsed = parse(await res.text());
        if (!res.ok) throw parsed;
        return parsed;
      }
      // Adds another level, so if the user tries to fetch another key it'll still work e.g. `client.myFunctions.myFunction()`
      return generateProxy(fn, newPath, callbacks);
    },
  });
}
