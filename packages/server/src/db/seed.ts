import { db } from './index.js';
import {
  sourceDefinitions,
  proposalDefinitions,
} from './schema.js';

async function seed() {
  const now = new Date();

  await db
    .insert(sourceDefinitions)
    .values([
      {
        id: crypto.randomUUID(),
        kind: 'manual',
        displayName: 'Manual Input',
        provider: 'manual',
        allowedProposalKinds: ['task_proposal', 'wiki_update_proposal'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        kind: 'slack-message',
        displayName: 'Slack Message',
        provider: 'slack',
        allowedProposalKinds: ['task_proposal', 'message_proposal'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        kind: 'email-thread',
        displayName: 'Email Thread',
        provider: 'email',
        allowedProposalKinds: ['task_proposal'],
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing({ target: sourceDefinitions.kind });

  await db
    .insert(proposalDefinitions)
    .values([
      {
        id: crypto.randomUUID(),
        proposalKind: 'task_proposal',
        displayName: 'Task Proposal',
        approvalPolicy: 'manual',
        targets: ['task'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        proposalKind: 'wiki_update_proposal',
        displayName: 'Wiki Update Proposal',
        approvalPolicy: 'manual',
        targets: ['wiki'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        proposalKind: 'message_proposal',
        displayName: 'Message Proposal',
        approvalPolicy: 'manual',
        targets: ['message'],
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing({ target: proposalDefinitions.proposalKind });

  console.log('Seed completed');
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
