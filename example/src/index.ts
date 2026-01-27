import { type } from "arktype";
import { hash, serve } from "bun";
import { and, count, desc, eq } from "drizzle-orm";
import { router, rpc } from "../../src";
import { db } from "./db";
import { postLikesTable, postsTable, usersTable } from "./db/schema";
import index from "./index.html";

const getSelf = (token: string) =>
  db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.token, token))
    .limit(1)
    .then((r) => r[0]);

const authenticated = rpc.use(async ({ req }) => {
  const token = req.headers.get("token");
  if (!token) throw new Error("Missing token header");
  const user = await getSelf(token);
  if (!user) throw new Error("Unknown user");
  return user;
});

const api = router({
  test: {
    pass: rpc.execute(() => {}),
    never: rpc.execute(() => new Promise<never>(() => {})),
    fail: rpc.execute(() => {
      throw new Error("Test");
    }),
  },
  authorize: rpc
    .input(type({ username: "string", password: "string" }))
    .execute(async ({ username, password }) => {
      let [user] = await db
        .select({ token: usersTable.token, password: usersTable.password })
        .from(usersTable)
        .where(eq(usersTable.name, username))
        .limit(1);
      const hashed = hash(password).toString();
      if (!user) {
        [user] = await db
          .insert(usersTable)
          .values({ name: username.toLowerCase(), password: hashed })
          .returning({ token: usersTable.token, password: usersTable.password });
      }
      if (user?.password !== hashed) throw new Error("Incorrect password", { cause: "user" });
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
  authorized: {
    test: authenticated.execute((_, { $ }) => $),
    createPost: authenticated
      .input(type("string"))
      .execute(async (content, { $ }) => db.insert(postsTable).values({ content, userId: $.id })),
    likePost: authenticated.input(type("string")).execute(async (postId, { $: user }) => {
      const result = await db
        .insert(postLikesTable)
        .values({ postId, userId: user.id })
        .onConflictDoNothing()
        .returning({ postId: postLikesTable.postId });
      if (result.length === 0) {
        await db
          .delete(postLikesTable)
          .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, user.id)));
      }
    }),
  },
  listLikes: rpc.input(type("string")).execute(async (postId, { req }) => {
    const [{ value: likes } = {}] = await db
      .select({ value: count() })
      .from(postLikesTable)
      .where(eq(postLikesTable.postId, postId));
    let liked = false;
    const token = req.headers.get("token");
    if (token) {
      const user = await getSelf(token);
      if (user) {
        const [row] = await db
          .select({ exists: count() })
          .from(postLikesTable)
          .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, user.id)))
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
    "/api/*": { POST: (c) => api.call(new URL(c.url).pathname.split("/").slice(2), c) },
  },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

console.log("Ready at", server.url.toString());

export type Routes = typeof api.routes;
