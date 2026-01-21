import { type Type, type } from "arktype";
import { parse, stringify } from "superjson";

export const router = <T extends Record<string, CallableFunction>>(routes: T) => ({
  async call(key: string, c: Request) {
    try {
      const res = await routes[key](parse(await c.text()));
      return new Response(stringify(res ?? null));
    } catch (e) {
      return new Response(stringify(e), { status: 400 });
    }
  },
  routes,
});

export const rpc = {
  input: <T extends Type>(schema: T) => ({ execute: createHandler(schema) }),
  execute: createHandler(type("undefined")),
};

function createHandler<T extends Type>(schema: T) {
  type Schema = typeof schema.infer;
  return <R>(execute: (input: Schema) => R) =>
    ((i) => execute(schema.assert(i))) as (
      ...i: Schema extends undefined ? [] : [input: Schema]
    ) => Promise<R>;
}
