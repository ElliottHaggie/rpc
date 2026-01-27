import { AuthDialog, SignOut } from "./components/auth";
import { CreatePost } from "./components/create-post";
import { Debug } from "./components/debug";
import { Posts } from "./components/posts";

export function App() {
  return (
    <>
      <AuthDialog />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr minmax(0, 32rem) 1fr", gap: "1rem" }}
      >
        <div style={{ display: "flex", height: "fit-content", justifyContent: "right" }}>
          <SignOut />
        </div>
        <div>
          <CreatePost />
          <Posts />
        </div>
        <Debug />
      </div>
    </>
  );
}

export default App;
