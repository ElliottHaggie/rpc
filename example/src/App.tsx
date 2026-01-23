import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import client from "./client";
import { $authDialog, $token } from "./state";

export function App() {
	return (
		<div style={{ maxWidth: "32rem", margin: "0 auto" }}>
			<AuthDialog />
			<CreatePost />
			<Posts />
		</div>
	);
}

function AuthDialog() {
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
		<dialog ref={ref} style={{ inset: 0 }}>
			<form
				action={(formData) => {
					const username = formData.get("username");
					const password = formData.get("password");
					if (typeof username !== "string" || typeof password !== "string")
						return;
					return authMutation.mutate({ username, password });
				}}
				style={{
					display: "grid",
					gridTemplateColumns: "auto 1fr",
					gap: "0.5rem",
				}}
			>
				<label htmlFor="username">Username</label>
				<input name="username" required disabled={authMutation.isPending} />
				<label htmlFor="password">Password</label>
				<input
					type="password"
					name="password"
					required
					disabled={authMutation.isPending}
				/>
				<button
					type="submit"
					style={{ gridColumn: 2, marginLeft: "auto" }}
					disabled={authMutation.isPending}
				>
					Sign in
				</button>
			</form>
			{authMutation.isError && (
				<p style={{ color: "red", height: 0 }}>
					There was an error authorizing, please try again
				</p>
			)}
		</dialog>
	);
}

function useRequireAuth() {
	const token = useAtomValue($token);
	const setDialog = useSetAtom($authDialog);
	return (action: (token: string) => unknown) => {
		if (token) action(token);
		else setDialog({ open: true, onSuccess: action });
	};
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

function Posts() {
	const query = useQuery({
		queryKey: ["posts"],
		queryFn: () => client.listPosts(),
	});
	return (
		<>
			{query.isPending && "Fetching posts"}
			{query.data?.map((post, i) => (
				<div
					key={post.id}
					style={
						i < query.data.length - 1
							? { borderBottom: "solid black 1px", paddingBottom: "0.5rem" }
							: {}
					}
				>
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
			))}
		</>
	);
}

function LikeButton({ postId }: Readonly<{ postId: string }>) {
	const queryClient = useQueryClient();
	const requireAuth = useRequireAuth();
	const token = useAtomValue($token);
	const { data: likes } = useQuery({
		queryKey: ["likes", postId],
		queryFn: () => client.listLikes({ token, postId }),
		initialData: { count: 0, liked: false },
	});
	const likeMutation = useMutation({
		mutationFn: client.likePost,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["likes", postId] }),
	});
	return (
		<button
			type="button"
			onClick={() =>
				requireAuth((token) => likeMutation.mutateAsync({ token, postId }))
			}
			disabled={!likes || likeMutation.isPending}
		>
			<span style={{ filter: `grayscale(${1 - Number(likes?.liked)})` }}>
				❤️
			</span>{" "}
			{likes?.count ?? 0}
		</button>
	);
}

export default App;
