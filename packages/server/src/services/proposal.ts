import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { proposals } from '../db/schema.js';
import { applyProposal } from './apply.js';
import type { CreateProposal, Proposal } from '@praxios/shared';

function toProposal(row: typeof proposals.$inferSelect): Proposal {
  return {
    id: row.id,
    proposalType: row.proposalType,
    status: row.status,
    sourceIds: row.sourceIds ?? [],
    taskId: row.taskId ?? null,
    destination: row.destination,
    payload: row.payload ?? {},
    evidence: row.evidence ?? [],
    rationale: row.rationale ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewerId: row.reviewerId ?? null,
    reviewComment: row.reviewComment ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null,
  };
}

export async function listProposals(status?: string): Promise<Proposal[]> {
  const rows = await db
    .select()
    .from(proposals)
    .where(status ? eq(proposals.status, status as Proposal['status']) : undefined)
    .orderBy(proposals.createdAt);
  return rows.map(toProposal);
}

export async function listPendingProposals(): Promise<Proposal[]> {
  return listProposals('pending');
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const [row] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return row ? toProposal(row) : null;
}

export async function createProposal(input: CreateProposal): Promise<Proposal> {
  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(proposals).values({
    id,
    proposalType: input.proposalType,
    status: 'pending',
    sourceIds: input.sourceIds ?? [],
    taskId: input.taskId ?? null,
    destination: input.destination,
    payload: input.payload ?? {},
    evidence: input.evidence ?? [],
    rationale: input.rationale ?? null,
    createdBy: input.createdBy ?? 'user',
    createdAt: now,
  });

  const proposal = await getProposal(id);
  if (!proposal) throw new Error('Failed to create proposal');
  return proposal;
}

export async function updateProposalStatus(
  id: string,
  status: Proposal['status'],
  reviewerId?: string,
  comment?: string
): Promise<Proposal> {
  const now = new Date();
  await db
    .update(proposals)
    .set({
      status,
      reviewerId: reviewerId ?? null,
      reviewedAt: now,
      reviewComment: comment ?? null,
      ...(status === 'applied' && { appliedAt: now }),
    })
    .where(eq(proposals.id, id));

  const proposal = await getProposal(id);
  if (!proposal) throw new Error('Proposal not found');
  return proposal;
}

export async function apply(id: string): Promise<Proposal> {
  const proposal = await getProposal(id);
  if (!proposal) throw new Error('Proposal not found');
  if (proposal.status !== 'approved') throw new Error('Proposal must be approved before applying');

  await applyProposal(proposal);
  return updateProposalStatus(id, 'applied', 'system');
}
