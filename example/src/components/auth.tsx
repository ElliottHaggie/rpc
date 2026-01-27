import { useMutation } from "@tanstack/react-query";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import client from "@/client";
import { $authDialogCallbacks, $token } from "@/state";

export function AuthDialog() {
  const setToken = useSetAtom($token);
  const [callbacks, setCallbacks] = useAtom($authDialogCallbacks);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (callbacks.length && !ref.current?.open) ref.current?.showModal();
  }, [callbacks]);

  const authMutation = useMutation({
    mutationFn: client.authorize,
    onSuccess({ token }) {
      for (const cb of getDefaultStore().get($authDialogCallbacks)) {
        cb(token);
      }
      setToken(token);
      close();
    },
  });

  function close() {
    setCallbacks([]);
    ref.current?.close();
    authMutation.reset();
  }

  return (
    <dialog ref={ref} onClose={close} closedby="any">
      <form
        action={(formData) => {
          const username = formData.get("username");
          const password = formData.get("password");
          if (typeof username !== "string" || typeof password !== "string") return;
          return authMutation.mutate({ username, password });
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "0.5rem",
        }}
      >
        <label htmlFor="username">Username</label>
        <input autoComplete="username" name="username" required disabled={authMutation.isPending} />
        <label htmlFor="password">Password</label>
        <input type="password" name="password" required disabled={authMutation.isPending} />
        <div
          style={{
            display: "flex",
            gridColumn: "span 2",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {authMutation.isError && (
            <p style={{ color: "red", margin: 0 }}>
              {authMutation.error.cause === "user"
                ? authMutation.error.message
                : "Please try again"}
            </p>
          )}
          <button
            type="submit"
            style={{ gridColumn: 2, marginLeft: "auto", height: "fit-content" }}
            disabled={authMutation.isPending}
          >
            Sign in
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function SignOut() {
  const [token, setToken] = useAtom($token);
  if (!token) return null;
  return (
    <button type="button" onClick={() => setToken(undefined)}>
      Sign out
    </button>
  );
}

export function useRequireAuth() {
  const token = useAtomValue($token);
  const setCallbacks = useSetAtom($authDialogCallbacks);
  return (action: (token: string) => unknown) => {
    if (token) action(token);
    else setCallbacks((p) => [...p, action]);
  };
}
