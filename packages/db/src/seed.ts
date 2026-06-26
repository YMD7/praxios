/** Registry の既定定義を投入する（再実行可能）。 */
import {
  DEFAULT_PROPOSAL_DEFINITIONS,
  DEFAULT_SOURCE_DEFINITIONS,
} from "@praxios/core";
import { createDb } from "./client";
import { proposalDefinitions, sourceDefinitions } from "./schema";

const db = createDb();

for (const def of DEFAULT_SOURCE_DEFINITIONS) {
  db.insert(sourceDefinitions)
    .values({
      kind: def.kind,
      displayName: def.displayName,
      provider: def.provider,
      allowedProposalKinds: def.allowedProposalKinds,
    })
    .onConflictDoNothing()
    .run();
}

for (const def of DEFAULT_PROPOSAL_DEFINITIONS) {
  db.insert(proposalDefinitions)
    .values({
      proposalKind: def.proposalKind,
      displayName: def.displayName,
      approvalPolicy: def.approvalPolicy,
    })
    .onConflictDoNothing()
    .run();
}

console.log(
  `[db] seeded ${DEFAULT_SOURCE_DEFINITIONS.length} source + ` +
    `${DEFAULT_PROPOSAL_DEFINITIONS.length} proposal definitions`,
);
