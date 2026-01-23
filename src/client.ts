import { parse, stringify } from "superjson";

export function client<T extends Record<string, CallableFunction>>(baseUrl: string) {
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(1);
  return generateProxy(baseUrl) as Readonly<T>;
}

function generateProxy(baseUrl: string, path: string = "") {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key !== "string") return void 0;
        const newPath = `${path}/${key}`;
        const fn = async (data: unknown[]) => {
          const res = await fetch(`${baseUrl}${newPath}`, {
            method: "POST",
            body: stringify(data),
          });
          const parsed = parse(await res.text());
          if (!res.ok) throw parsed;
          return parsed;
        };
        Object.assign(fn, generateProxy(baseUrl, newPath));
        return fn;
      },
    },
  );
}
