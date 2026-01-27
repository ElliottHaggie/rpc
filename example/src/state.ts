import { atom } from "jotai";
import { parse, stringify } from "superjson";

function atomWithLocalStorage<T>(key: string, initialValue: T) {
  function getInitialValue() {
    const item = localStorage.getItem(key);
    if (item !== null) return parse(item);
    return initialValue;
  }
  const baseAtom = atom(getInitialValue());
  return atom(
    (get) => get(baseAtom) as T,
    (get, set, update: T) => {
      const nextValue = typeof update === "function" ? update(get(baseAtom)) : update;
      set(baseAtom, nextValue);
      localStorage.setItem(key, stringify(nextValue));
    },
  );
}

export const $token = atomWithLocalStorage<string | undefined>("token", undefined);

export const $authDialogCallbacks = atom<((token: string) => unknown)[]>([]);

export const $calls = atom<
  {
    id: string;
    route: string;
    bodies: Record<string, unknown>;
    state: "pending" | "error" | "success";
  }[]
>([]);
