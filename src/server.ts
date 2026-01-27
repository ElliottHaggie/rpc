import { type Type, type } from "arktype";
import { parse, stringify } from "superjson";

export interface API {
  [key: string]: CallableFunction | API;
}

export const router = <T extends API>(routes: T) => ({
  async call(key: string | string[], req: Request) {
    try {
      // Walk through nested routes
      let current: CallableFunction | API = routes;

      for (const element of Array.isArray(key) ? key : [key]) {
        if (typeof current !== "object") throw new TypeError(`Route "${key}" is not accessible`);
        if (!current[element]) throw new Error(`Route "${key}" not found`);
        current = current[element];
      }

      if (typeof current !== "function") throw new TypeError(`Route "${key}" is not callable`);

      const res = await current(parse(await req.text()));
      return new Response(stringify(res ?? null), { headers: req.headers });
    } catch (e) {
      return new Response(stringify(e), { status: 400, headers: req.headers });
    }
  },
  routes,
});

export const rpc = {
  input: <T extends Type>(schema: T) => ({ execute: createHandler(schema) }),
  execute: createHandler(type("undefined")),
};

// Fancy type wrapping so that the returned types look the same as the execute/input data
function createHandler<T extends Type>(schema: T) {
  type Schema = typeof schema.infer;
  return <R>(execute: (input: Schema) => R) =>
    // Verify that incoming data is valid before calling the function
    ((i) => execute(schema.assert(i))) as (
      ...i: Schema extends undefined ? [] : [input: Schema]
    ) => Promise<Awaited<R>>;
}
