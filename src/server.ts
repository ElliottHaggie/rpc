import { type Type, type } from "arktype";
import { parse, stringify } from "superjson";

interface Context<T> {
  req: Request;
  /** The result of the last middleware */
  $: T;
}

export interface API {
  [key: string]: CallableFunction | API;
}

export const router = <T extends API>(routes: T) => ({
  async call(key: string | string[], req: Request) {
    try {
      // Walk through nested routes
      let current: CallableFunction | API = routes;

      const context = { req, $: undefined } as Context<unknown>;

      for (const element of Array.isArray(key) ? key : [key]) {
        if (typeof current !== "object" || !element) {
          throw new TypeError(`Route "${key}" is not accessible`);
        }
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

function createRPC<C = undefined>(middlewares: CallableFunction[] = []) {
  return {
    input: <T extends Type>(schema: T) => ({ execute: createHandler<T, C>(schema, middlewares) }),
    execute: createHandler<Type<unknown>, C>(type("undefined"), middlewares),
    use: <T>(middleware: (ctx: Context<C>) => T) =>
      createRPC<Awaited<T>>([...middlewares, middleware]),
  };
}

export const rpc = createRPC();

// Fancy type wrapping so that the returned types look the same as the execute/input data
function createHandler<T extends Type, C>(schema: T, middlewares: CallableFunction[]) {
  type Schema = typeof schema.infer;
  return <R>(execute: (input: Schema, ctx: Context<C>) => R) =>
    // Verify that incoming data is valid before calling the function
    (async (i: Schema, c: Context<C>) =>
      execute(
        schema.assert(i),
        await middlewares.reduce(async (pPromise, m) => {
          const p = await pPromise;
          p.$ = await m(p);
          return p;
        }, Promise.resolve(c)),
      )) as unknown as (
      ...i: Schema extends undefined ? [] : [input: Schema]
    ) => Promise<Awaited<R>>;
}
