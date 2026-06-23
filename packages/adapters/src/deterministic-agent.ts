import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  AgentGateway,
  ExtractTaskCandidatesInput,
  ExtractTaskCandidatesOutput,
} from "../../ports/src/index.js";

export class DeterministicAgentAdapter implements AgentGateway {
  constructor(private readonly repositoryPath: string) {}

  async extractTaskCandidates(
    input: ExtractTaskCandidatesInput,
  ): Promise<ExtractTaskCandidatesOutput> {
    if (!/^[a-z0-9-]+$/u.test(input.fixtureName)) {
      throw new Error(`Invalid expected output fixture name: ${input.fixtureName}`);
    }

    const fixture = JSON.parse(
      await readFile(
        join(
          this.repositoryPath,
          "fixtures",
          "expected",
          `${input.fixtureName}.task-candidates.json`,
        ),
        "utf8",
      ),
    ) as { readonly candidates?: readonly unknown[] };

    return {
      candidates: fixture.candidates ?? [],
    };
  }
}
