import { type } from "arktype";
import { serve } from "bun";
import { router, rpc } from "../src";

const users = new Map<string, { password: string; emoji: string }>();
const authorizedUserInput = type({ username: "string", password: "string" });

const api = router({
  createUser: rpc.input(authorizedUserInput).execute((input) => {
    if (users.has(input.username)) {
      throw new Error("User already exists");
    }
    users.set(input.username, {
      password: input.password,
      emoji: getEmoji(),
    });
  }),
  getUser: rpc.input(authorizedUserInput).execute((input) => {
    const user = users.get(input.username);
    if (!user || user.password !== input.password) {
      throw new Error("Unauthorized");
    }
    return { ...user, username: input.username };
  }),
  listUsers: rpc.execute(() => {
    const returnedUsers: { username: string; emoji: string }[] = [];
    for (const [username, user] of users) {
      returnedUsers.push({ username, emoji: user.emoji });
    }
    return returnedUsers;
  }),
});

function getEmoji() {
  const emojis = ["😀", "😂", "🥺", "😍", "😎", "🤔", "😭", "😜", "😋", "💀"];
  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
}

export type Routes = typeof api.routes;
export default serve({ routes: { "/api/:key": { POST: (c) => api.call(c.params.key, c) } } });
