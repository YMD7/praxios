import { describe, expect, it } from "vitest";
import { buildTerminalEnv, readTerminalSessionConfig } from "../src/terminal.js";

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

describe("terminal session config", () => {
  it("uses detached session defaults", () => {
    const config = readTerminalSessionConfig({});

    expect(config).toEqual({
      detachedTtlMs: 30 * 60 * 1000,
      replayBufferBytes: 256 * 1024
    });
  });

  it("allows non-negative environment overrides", () => {
    const config = readTerminalSessionConfig({
      TERMINAL_DETACHED_TTL_MS: "0",
      TERMINAL_REPLAY_BUFFER_BYTES: "4096"
    });

    expect(config).toEqual({
      detachedTtlMs: 0,
      replayBufferBytes: 4096
    });
  });

  it("falls back when overrides are invalid", () => {
    const config = readTerminalSessionConfig({
      TERMINAL_DETACHED_TTL_MS: "-1",
      TERMINAL_REPLAY_BUFFER_BYTES: "invalid"
    });

    expect(config).toEqual({
      detachedTtlMs: 30 * 60 * 1000,
      replayBufferBytes: 256 * 1024
    });
  });
});
