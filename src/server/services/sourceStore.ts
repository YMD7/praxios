import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { id, now, pack, repository } from "../repository";

const sourceRoot = join(process.cwd(), "data", "sources");

export function saveSource(input: {
  sourceType: string;
  sourceTitle: string;
  content: string;
  provider?: string;
  sourceUrl?: string;
  sourceRefId?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}) {
  mkdirSync(sourceRoot, { recursive: true });
  const sourceId = id();
  const hash = createHash("sha256").update(input.content).digest("hex");
  const sourcePath = join("data", "sources", `${sourceId}.md`);
  writeFileSync(join(process.cwd(), sourcePath), input.content, "utf8");

  return repository.createSource({
    id: sourceId,
    sourceType: input.sourceType,
    sourceTitle: input.sourceTitle,
    sourceUrl: input.sourceUrl ?? null,
    sourceRefId: input.sourceRefId ?? null,
    provider: input.provider ?? "manual",
    occurredAt: input.occurredAt ?? null,
    capturedAt: now(),
    hash,
    sourcePath,
    metadata: pack(input.metadata ?? {})
  });
}

export function readSourceContent(sourcePath: string) {
  return readFileSync(join(process.cwd(), sourcePath), "utf8");
}

