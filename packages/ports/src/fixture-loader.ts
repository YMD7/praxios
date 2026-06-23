import type { SourceFrontmatter } from "../../../contracts/src/index.js";

export interface LoadedMeetingTranscriptFixture {
  readonly title: string;
  readonly origin: string;
  readonly observed_at: string;
  readonly sensitivity: SourceFrontmatter["sensitivity"];
  readonly body: string;
}

export interface FixtureLoader {
  loadMeetingTranscript(fixtureName: string): Promise<LoadedMeetingTranscriptFixture>;
}
