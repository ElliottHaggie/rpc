import { type } from "arktype";
import { hash, serve } from "bun";
import { and, count, desc, eq } from "drizzle-orm";
import { router, rpc } from "../../src";
import { db } from "./db";
import { postLikesTable, postsTable, usersTable } from "./db/schema";
import index from "./index.html";

const Authed = type({ token: "string" });

const api = router({
	authorize: rpc
		.input(type({ username: "string", password: "string" }))
		.execute(async ({ username, password }) => {
			let [user] = await db
				.select({ token: usersTable.token, password: usersTable.password })
				.from(usersTable)
				.where(eq(usersTable.name, username))
				.limit(1);
			const hashed = BigInt(hash(password));
			if (!user) {
				[user] = await db
					.insert(usersTable)
					.values({
						name: username.toLowerCase(),
						password: hashed,
					})
					.returning({
						token: usersTable.token,
						password: usersTable.password,
					});
			}
			if (user?.password !== hashed) throw new Error("Incorrect password");
			return user;
		}),
	listPosts: rpc.execute(() =>
		db
			.select({
				id: postsTable.id,
				content: postsTable.content,
				createdAt: postsTable.createdAt,
				author: { id: usersTable.id, name: usersTable.name },
			})
			.from(postsTable)
			.innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
			.orderBy(desc(postsTable.createdAt))
			.limit(10)
			.execute(),
	),
	createPost: rpc
		.input(Authed.and({ content: "string" }))
		.execute(async ({ token, content }) => {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.token, token))
				.limit(1);
			if (!user) throw new Error("Unknown user");
			return db.insert(postsTable).values({ content, userId: user.id });
		}),
	likePost: rpc
		.input(Authed.and({ postId: "string" }))
		.execute(async ({ token, postId }) => {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.token, token))
				.limit(1);
			if (!user) throw new Error("Unknown user");
			const result = await db
				.insert(postLikesTable)
				.values({ postId, userId: user.id })
				.onConflictDoNothing()
				.returning({ postId: postLikesTable.postId });
			if (result.length === 0) {
				await db
					.delete(postLikesTable)
					.where(
						and(
							eq(postLikesTable.postId, postId),
							eq(postLikesTable.userId, user.id),
						),
					);

				return { liked: false };
			}
		}),
	listLikes: rpc
		.input(type({ postId: "string", token: "string|undefined" }))
		.execute(async ({ postId, token }) => {
			const [{ value: likes } = {}] = await db
				.select({ value: count() })
				.from(postLikesTable)
				.where(eq(postLikesTable.postId, postId));
			let liked = false;
			if (token) {
				const [user] = await db
					.select({ id: usersTable.id })
					.from(usersTable)
					.where(eq(usersTable.token, token))
					.limit(1);
				if (user) {
					const [row] = await db
						.select({ exists: count() })
						.from(postLikesTable)
						.where(
							and(
								eq(postLikesTable.postId, postId),
								eq(postLikesTable.userId, user.id),
							),
						)
						.limit(1);
					liked = !!row && row.exists > 0;
				}
			}
			return { count: likes ?? 0, liked };
		}),
});

const server = serve({
	routes: {
		"/": index,
		"/api/:key": { POST: (c) => api.call(c.params.key, c) },
	},
	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);

export type Routes = typeof api.routes;
