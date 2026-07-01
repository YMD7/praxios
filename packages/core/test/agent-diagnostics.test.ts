import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { diagnoseAgentCommand, diagnoseConfig } from "../src/agent-diagnostics.js";
import type { PraxiosUserConfig } from "../src/user-config.js";

let tempDir: string;
let binDir: string;

function writeExecutable(name: string) {
  const filePath = path.join(binDir, name);
  fs.writeFileSync(filePath, "#!/bin/sh\necho ok\n");
  fs.chmodSync(filePath, 0o755);
  return filePath;
}

function writeNonExecutable(name: string) {
  const filePath = path.join(binDir, name);
  fs.writeFileSync(filePath, "not executable\n");
  fs.chmodSync(filePath, 0o644);
  return filePath;
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxios-diag-"));
  binDir = path.join(tempDir, "bin");
  fs.mkdirSync(binDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("diagnoseAgentCommand", () => {
  it("resolves a bare command found on PATH", () => {
    const resolved = writeExecutable("myagent");
    const result = diagnoseAgentCommand("myagent", { PATH: binDir });

    expect(result.available).toBe(true);
    expect(result.resolvedPath).toBe(resolved);
  });

  it("marks a command missing from PATH as unavailable", () => {
    const result = diagnoseAgentCommand("nope-not-here", { PATH: binDir });

    expect(result.available).toBe(false);
    expect(result.reason).toContain("nope-not-here");
  });

  it("treats a present but non-executable file as unavailable", () => {
    writeNonExecutable("myagent");
    const result = diagnoseAgentCommand("myagent", { PATH: binDir });

    expect(result.available).toBe(false);
  });

  it("resolves using only the first token when arguments are present", () => {
    writeExecutable("myagent");
    const result = diagnoseAgentCommand("myagent --model fast --verbose", { PATH: binDir });

    expect(result.available).toBe(true);
  });

  it("handles a quoted first token with spaces", () => {
    const resolved = writeExecutable("my agent");
    const result = diagnoseAgentCommand(`"${resolved}" run`, { PATH: "" });

    expect(result.available).toBe(true);
    expect(result.resolvedPath).toBe(resolved);
  });

  it("evaluates an absolute path directly", () => {
    const resolved = writeExecutable("myagent");
    // PATH に無くても絶対パスなら解決できる
    const result = diagnoseAgentCommand(resolved, { PATH: "" });

    expect(result.available).toBe(true);
  });

  it("marks a missing absolute path as unavailable", () => {
    const result = diagnoseAgentCommand(path.join(binDir, "ghost"), { PATH: binDir });

    expect(result.available).toBe(false);
  });

  it("marks an empty command as unavailable", () => {
    const result = diagnoseAgentCommand("   ", { PATH: binDir });

    expect(result.available).toBe(false);
  });
});

describe("diagnoseConfig", () => {
  function config(agents: PraxiosUserConfig["agents"], defaultAgent: string): PraxiosUserConfig {
    return { agents, defaultAgent };
  }

  it("annotates each agent with availability", () => {
    writeExecutable("good");
    const result = diagnoseConfig(
      config(
        [
          { id: "good", label: "Good", command: "good" },
          { id: "bad", label: "Bad", command: "missing-cmd" }
        ],
        "good"
      ),
      { PATH: binDir }
    );

    expect(result.agents.find((a) => a.id === "good")?.available).toBe(true);
    expect(result.agents.find((a) => a.id === "bad")?.available).toBe(false);
    expect(result.defaultAgent).toBe("good");
  });

  it("falls back to the first available agent when the default is unavailable", () => {
    writeExecutable("good");
    const result = diagnoseConfig(
      config(
        [
          { id: "bad", label: "Bad", command: "missing-cmd" },
          { id: "good", label: "Good", command: "good" }
        ],
        "bad"
      ),
      { PATH: binDir }
    );

    expect(result.defaultAgent).toBe("good");
  });

  it("keeps the configured default when no agent is available", () => {
    const result = diagnoseConfig(
      config([{ id: "bad", label: "Bad", command: "missing-cmd" }], "bad"),
      { PATH: binDir }
    );

    expect(result.defaultAgent).toBe("bad");
    expect(result.agents[0]?.available).toBe(false);
  });
});
