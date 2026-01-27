import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/client";
import { useRequireAuth } from "./auth";

export function CreatePost() {
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const postMutation = useMutation({
    mutationFn: client.authorized.createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
  return (
    <form
      action={(formData) => {
        const content = formData.get("content");
        if (typeof content !== "string") return;
        requireAuth(() => postMutation.mutateAsync(content));
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
