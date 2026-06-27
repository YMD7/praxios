import { describe, expect, it } from "vitest";
import { buildTerminalEnv } from "../src/terminal.js";

describe("terminal environment", () => {
  it("enables color-capable terminal output", () => {
    const env = buildTerminalEnv({
      NO_COLOR: "1",
      PATH: "/usr/bin",
      TERM: "dumb"
    });

    expect(env).toMatchObject({
      CLICOLOR: "1",
      COLORTERM: "truecolor",
      FORCE_COLOR: "1",
      PATH: "/usr/bin",
      TERM: "xterm-256color"
    });
    expect(env.NO_COLOR).toBeUndefined();
  });
});
