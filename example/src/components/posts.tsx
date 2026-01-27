import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { Fragment } from "react";
import client from "@/client";
import { $token } from "@/state";
import { useRequireAuth } from "./auth";

export function Posts() {
  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: () => client.listPosts(),
    placeholderData: (p) => p,
  });
  return posts?.map((post, i) => (
    <Fragment key={post.id}>
      <div>
        <b>
          {post.author.name}・
          {post.createdAt.toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
          })}
        </b>
        <br />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {post.content}
          <LikeButton postId={post.id} />
        </div>
      </div>
      {i < posts.length - 1 && <hr />}
    </Fragment>
  ));
}

function LikeButton({ postId }: Readonly<{ postId: string }>) {
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const token = useAtomValue($token);
  const { data: likes } = useQuery({
    queryKey: ["likes", postId, token],
    queryFn: () => client.listLikes(postId),
    placeholderData: (p) => p ?? { count: 0, liked: false },
  });
  const likeMutation = useMutation({
    mutationFn: client.authorized.likePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["likes", postId] }),
  });
  return (
    <button
      type="button"
      onClick={() => requireAuth(() => likeMutation.mutateAsync(postId))}
      disabled={!likes || likeMutation.isPending}
    >
      <span style={{ filter: `grayscale(${1 - Number(likes?.liked)})` }}>❤️</span>{" "}
      {likes?.count ?? 0}
    </button>
  );
}
