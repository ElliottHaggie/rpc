import { type Type, type } from "arktype";
import { parse, stringify } from "superjson";

interface Context {
  req: Request;
  /** The result of the last middleware */
  $: <T>() => Readonly<T>;
}

export type API = { [key: string]: CallableFunction | API } & {
  /** A middleware function for this level that will be run for any neighbours or children */
  $?: (ctx: Context) => unknown;
};

export const router = <T extends API>(routes: T) => ({
  async call(key: string | string[], req: Request) {
    try {
      // Walk through nested routes
      let current: CallableFunction | API = routes;

      let prev$: unknown;

      const context = { req, $: () => prev$ } as Context;

      for (const element of Array.isArray(key) ? key : [key]) {
        if (typeof current !== "object" || !element) {
          throw new TypeError(`Route "${key}" is not accessible`);
        }
        // Middleware
        if (current.$) prev$ = await current.$?.(context);
        if (!current[element]) throw new Error(`Route "${key}" not found`);
        current = current[element];
      }

      if (typeof current !== "function") throw new TypeError(`Route "${key}" is not callable`);

      const res = await current(parse(await req.clone().text()), context);
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
  return <R>(execute: (input: Schema, ctx: Context) => R) =>
    // Verify that incoming data is valid before calling the function
    ((i: Schema, c: Context) => execute(schema.assert(i), c)) as unknown as (
      ...i: Schema extends undefined ? [] : [input: Schema]
    ) => Promise<Awaited<R>>;
}
