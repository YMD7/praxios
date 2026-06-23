import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { FixtureLoader, LoadedMeetingTranscriptFixture } from "../../ports/src/index.js";

export class FileFixtureLoader implements FixtureLoader {
  constructor(private readonly repositoryPath: string) {}

  async loadMeetingTranscript(fixtureName: string): Promise<LoadedMeetingTranscriptFixture> {
    if (!/^[a-z0-9-]+$/u.test(fixtureName)) {
      throw new Error(`Invalid meeting transcript fixture name: ${fixtureName}`);
    }

    const body = await readFile(
      join(this.repositoryPath, "fixtures", "meetings", `${fixtureName}.md`),
      "utf8",
    );

    return {
      title: readMetadataValue(body, "title") ?? readHeading(body) ?? fixtureName,
      origin: readMetadataValue(body, "origin") ?? "fixture:meeting-transcript",
      observed_at: readMetadataValue(body, "observed_at") ?? new Date(0).toISOString(),
      sensitivity: "internal",
      body,
    };
  }
}

function readHeading(content: string): string | undefined {
  const match = /^#\s+(.+)$/mu.exec(content);
  return match?.[1]?.trim();
}

function readMetadataValue(content: string, key: string): string | undefined {
  const match = new RegExp(`^- ${key}: (.+)$`, "mu").exec(content);
  return match?.[1]?.trim();
}
