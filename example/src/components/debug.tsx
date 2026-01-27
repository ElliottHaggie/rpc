import { useAtomValue } from "jotai";
import client from "@/client";
import { $calls } from "@/state";

export function Debug() {
  const calls = useAtomValue($calls);
  const color = (v: string) =>
    v === "pending" ? [255, 165, 0] : v === "success" ? [0, 255, 0] : [255, 0, 0];
  return (
    <details style={{ maxHeight: "100%", overflow: "scroll" }}>
      <summary style={{ position: "sticky", top: 0, background: "white" }}>
        Debugger - {calls.filter((c) => c.state === "success").length} / {calls.length}
      </summary>
      <div style={{ display: "flex", gap: "0.5rem", margin: "0.5rem", marginLeft: "1rem" }}>
        <button type="button" onClick={() => client.test.pass()}>
          Successful req
        </button>
        <button type="button" onClick={() => client.test.never()}>
          Infinite req
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await client.test.fail();
            } catch {}
          }}
        >
          Failing req
        </button>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {calls.map((c) => (
          <li
            key={c.id}
            style={{
              backgroundColor: `rgba(${color(c.state)},0.25)`,
              margin: "0.5rem",
              marginLeft: "1rem",
              border: "solid black 1px",
              padding: "0.25rem",
            }}
          >
            <b>{c.route}</b>
            <br />
            <TomlTree value={c.bodies} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function TomlTree({ value }: Readonly<{ value: unknown }>) {
  if (value === null || typeof value !== "object") return null;
  return (
    <>
      {Object.entries(value).map(([key, val]) => {
        const isObject =
          val !== null &&
          typeof val === "object" &&
          !(val instanceof Date) &&
          !(val instanceof Error);
        return isObject ? (
          <details key={key}>
            <summary>
              <i>{key}</i>
            </summary>
            <div style={{ paddingLeft: "1rem", overflow: "scroll" }}>
              <TomlTree value={val} />
            </div>
          </details>
        ) : (
          <div key={key} style={{ textWrap: "nowrap" }}>
            <i>{key}</i> = {String(val)}
          </div>
        );
      })}
    </>
  );
}
