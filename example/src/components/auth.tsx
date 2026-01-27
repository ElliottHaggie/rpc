import { useMutation } from "@tanstack/react-query";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import client from "@/client";
import { $authDialog, $token } from "@/state";

export function AuthDialog() {
  const setToken = useSetAtom($token);
  const [dialog, setDialog] = useAtom($authDialog);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialog.open && !ref.current?.open) ref.current?.showModal();
    if (!dialog.open && ref.current?.open) ref.current?.close();
  }, [dialog.open]);

  const authMutation = useMutation({
    async mutationFn(creds: { username: string; password: string }) {
      const auth = await client.authorize(creds);
      setToken(auth.token);
      getDefaultStore().get($authDialog).onSuccess?.(auth.token);
      setDialog({ open: false });
    },
  });

  return (
    <dialog ref={ref}>
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
  const setDialog = useSetAtom($authDialog);
  return (action: (token: string) => unknown) => {
    if (token) action(token);
    else setDialog({ open: true, onSuccess: action });
  };
}
