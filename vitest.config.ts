import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/.tmp/**", "**/.worktrees/**", "**/dist/**", "**/node_modules/**"],
  },
});
