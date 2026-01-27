import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "./client";
import { AuthDialog, useRequireAuth } from "./components/auth";
import { Debug } from "./components/debug";
import { Posts } from "./components/posts";

export function App() {
  return (
    <>
      <AuthDialog />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr minmax(0, 32rem) 1fr", gap: "1rem" }}
      >
        <div style={{ gridColumn: 2 }}>
          <CreatePost />
          <Posts />
        </div>
        <Debug />
      </div>
    </>
  );
}

function CreatePost() {
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const postMutation = useMutation({
    mutationFn: client.createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
  return (
    <form
      action={(formData) => {
        const content = formData.get("content");
        if (typeof content !== "string") return;
        requireAuth((token) => postMutation.mutateAsync({ token, content }));
      }}
      style={{ display: "flex", gap: "0.5rem" }}
    >
      <input
        type="text"
        name="content"
        placeholder="Enter a message"
        style={{ flexGrow: 1 }}
        disabled={postMutation.isPending}
        required
      />
      <button
        type="submit"
        style={{ width: "fit-content", marginLeft: "auto", gridColumn: "2" }}
        disabled={postMutation.isPending}
      >
        Post
      </button>
    </form>
  );
}

export default App;
