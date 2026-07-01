import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_AGENTS,
  BUILTIN_DEFAULT_AGENT,
  loadUserConfig,
  type LoadUserConfigInput
} from "../src/user-config.js";

let tempDir: string;
let homeDir: string;
let workspaceRoot: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxios-config-"));
  homeDir = path.join(tempDir, "home");
  workspaceRoot = path.join(tempDir, "workspace");
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(workspaceRoot, { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// XDG_CONFIG_HOME 由来の汚染を避けるため、env は明示的に空で渡す。
function baseInput(): LoadUserConfigInput {
  return { homeDir, workspaceRoot, env: {} };
}

function writeUserConfig(content: unknown) {
  const dir = path.join(homeDir, ".config", "praxios");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "config.json"),
    typeof content === "string" ? content : JSON.stringify(content)
  );
}

function writeProjectConfig(content: unknown) {
  const dir = path.join(workspaceRoot, ".praxios");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "config.json"),
    typeof content === "string" ? content : JSON.stringify(content)
  );
}

describe("loadUserConfig", () => {
  it("falls back to builtin defaults when no config file exists", () => {
    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual(BUILTIN_AGENTS);
    expect(config.defaultAgent).toBe(BUILTIN_DEFAULT_AGENT);
  });

  it("uses the user-level config when no project config exists", () => {
    writeUserConfig({
      agents: [{ id: "gemini", label: "Gemini", command: "gemini" }],
      defaultAgent: "gemini"
    });

    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual([{ id: "gemini", label: "Gemini", command: "gemini" }]);
    expect(config.defaultAgent).toBe("gemini");
  });

  it("lets the project-level config override the user-level config", () => {
    writeUserConfig({
      agents: [{ id: "gemini", label: "Gemini", command: "gemini" }],
      defaultAgent: "gemini"
    });
    writeProjectConfig({
      agents: [{ id: "claude", label: "Claude Code", command: "claude" }],
      defaultAgent: "claude"
    });

    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual([{ id: "claude", label: "Claude Code", command: "claude" }]);
    expect(config.defaultAgent).toBe("claude");
  });

  it("resolves each top-level key independently across layers", () => {
    // user が agents を、project が defaultAgent のみを定義するケース。
    writeUserConfig({
      agents: [
        { id: "codex", label: "Codex", command: "codex" },
        { id: "claude", label: "Claude Code", command: "claude" }
      ]
    });
    writeProjectConfig({ defaultAgent: "claude" });

    const config = loadUserConfig(baseInput());

    expect(config.agents.map((agent) => agent.id)).toEqual(["codex", "claude"]);
    expect(config.defaultAgent).toBe("claude");
  });

  it("falls back to the first agent when defaultAgent is not in the list", () => {
    writeProjectConfig({
      agents: [{ id: "codex", label: "Codex", command: "codex" }],
      defaultAgent: "does-not-exist"
    });

    const config = loadUserConfig(baseInput());

    expect(config.defaultAgent).toBe("codex");
  });

  it("ignores a malformed JSON file and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeProjectConfig("{ not valid json");

    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual(BUILTIN_AGENTS);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("ignores a schema-invalid file and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // command が欠落したエージェントはスキーマ不一致。
    writeProjectConfig({ agents: [{ id: "broken", label: "Broken" }] });

    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual(BUILTIN_AGENTS);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("rejects duplicate agent ids as invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeProjectConfig({
      agents: [
        { id: "codex", label: "Codex", command: "codex" },
        { id: "codex", label: "Codex 2", command: "codex-2" }
      ]
    });

    const config = loadUserConfig(baseInput());

    expect(config.agents).toEqual(BUILTIN_AGENTS);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("respects XDG_CONFIG_HOME for the user-level path", () => {
    const xdgConfigHome = path.join(tempDir, "xdg");
    const dir = path.join(xdgConfigHome, "praxios");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({
        agents: [{ id: "aider", label: "Aider", command: "aider" }],
        defaultAgent: "aider"
      })
    );

    const config = loadUserConfig({ workspaceRoot, env: { XDG_CONFIG_HOME: xdgConfigHome } });

    expect(config.defaultAgent).toBe("aider");
  });

  it("preserves the optional description field", () => {
    writeProjectConfig({
      agents: [{ id: "codex", label: "Codex", command: "codex", description: "OpenAI Codex CLI" }],
      defaultAgent: "codex"
    });

    const config = loadUserConfig(baseInput());

    expect(config.agents[0]?.description).toBe("OpenAI Codex CLI");
  });
});
