import { client } from "../src";
import type { Routes } from "./backend.ts";

const myClient = client<Routes>("http://0.0.0.0:3000/api");

try {
  await myClient.createUser({
    username: "foo",
    password: "bar",
  });
  console.log("Created user");
} catch {
  console.log("User already exists");
}
const user = await myClient.getUser({
  username: "foo",
  password: "bar",
});
console.log("Userdata:", user);

const users = await myClient.listUsers();
console.log("Users:", users);
