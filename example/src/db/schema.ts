import { pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const usersTable = pgTable("users", {
  id: varchar({ length: 7 })
    .primaryKey()
    .$defaultFn(() => nanoid(7)),
  name: varchar({ length: 255 }).unique().notNull(),
  password: text().notNull(),
  token: uuid().unique().defaultRandom().notNull(),
});

export const postsTable = pgTable("posts", {
  id: varchar({ length: 7 })
    .primaryKey()
    .$defaultFn(() => nanoid(7)),
  content: varchar({ length: 255 }).notNull(),
  userId: varchar("user_id", { length: 7 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp().defaultNow().notNull(),
});

export const postLikesTable = pgTable(
  "post_likes",
  {
    postId: varchar("post_id", { length: 7 })
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 7 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export type SelectUser = typeof usersTable.$inferSelect;
