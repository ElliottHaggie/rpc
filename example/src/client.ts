import { getDefaultStore } from "jotai";
import { parse } from "superjson";
import { client } from "../../src";
import type { Routes } from "./";
import { $calls, $token } from "./state";

export default client<Routes>("/api", {
  // Append a new call record to the calls state when a request is made
  async beforeRequest(r) {
    const id = r.headers.get("req-id");
    if (!id) return;
    const body = parse(await r.clone().text());
    const store = getDefaultStore();
    store.set($calls, (p) => [
      {
        id,
        route: new URL(r.url).pathname.split("/").slice(2).join(".") ?? "unknown",
        bodies: body ? { req: body } : {},
        state: "pending",
      },
      ...p,
    ]);
    const token = store.get($token);
    if (token) r.headers.set("token", token);
  },
  // Update the call record when the res comes back
  async onResponse(r) {
    const id = r.headers.get("req-id");
    if (!id) return;
    const body = parse(await r.text());
    getDefaultStore().set($calls, (p) => {
      const newCalls = [...p];
      const call = p.find((c) => c.id === id);
      if (call) {
        call.state = r.ok ? "success" : "error";
        if (body) call.bodies.res = body;
      }
      return newCalls;
    });
  },
});
