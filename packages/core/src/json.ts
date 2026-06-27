import type { JsonObject } from "./types.js";

export function parseJsonObject(value: string | null | undefined): JsonObject {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    return {};
  }

  return {};
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }

  return [];
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
