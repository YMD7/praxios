import { now, repository, unpack } from "../repository";
import { refreshWikiLinks } from "./wikiLinks";

export function approveProposal(approvalId: string, comment?: string) {
  const approval = repository.getApproval(approvalId);
  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "Pending") throw new Error("Approval is not pending");

  const proposal = repository.getProposal(approval.proposalId);
  if (!proposal) throw new Error("Proposal not found");

  const payload = unpack<Record<string, unknown>>(proposal.payload, {});

  if (proposal.proposalType === "context_attach") {
    repository.createContext({
      taskId: String(payload.taskId),
      sourceType: String(payload.sourceType),
      sourceId: String(payload.sourceId),
      title: String(payload.title),
      summary: String(payload.summary),
      occurredAt:
        typeof payload.occurredAt === "string" ? payload.occurredAt : null,
      relevanceScore:
        typeof payload.relevanceScore === "number" ? payload.relevanceScore : 0.7,
      evidence: { proposalId: proposal.id }
    });
  }

  if (proposal.proposalType === "task_update" && proposal.taskId) {
    const task = repository.getTask(proposal.taskId);
    if (!task) throw new Error("Task not found");
    repository.updateTask(proposal.taskId, {
      description: `${task.description}${String(payload.descriptionAppend ?? "")}`,
      completionCriteria: String(
        payload.completionCriteria ?? task.completionCriteria
      )
    });
  }

  if (proposal.proposalType === "wiki_update") {
    const pageId = String(payload.pageId);
    const page = repository.upsertWikiPage({
      id: pageId,
      title: String(payload.title),
      body: String(payload.body),
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : []
    });
    refreshWikiLinks(pageId, String(payload.body));

    if (proposal.taskId && page) {
      repository.ensureKnowledgeLink(proposal.taskId, page.id, {
        proposalId: proposal.id
      });
    }
  }

  const reviewedAt = now();
  repository.updateApproval(approvalId, {
    status: "Approved",
    reviewerId: "local-user",
    reviewedAt,
    comment: comment ?? null
  });
  repository.updateProposal(proposal.id, {
    status: "Applied",
    reviewerId: "local-user",
    reviewedAt,
    reviewComment: comment ?? null,
    appliedAt: reviewedAt
  });
  repository.createAuditEvent({
    eventType: "proposal.approved",
    entityType: "proposal",
    entityId: proposal.id,
    payload: { approvalId, proposalType: proposal.proposalType }
  });
}

export function rejectProposal(approvalId: string, comment?: string) {
  const approval = repository.getApproval(approvalId);
  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "Pending") throw new Error("Approval is not pending");

  const proposal = repository.getProposal(approval.proposalId);
  if (!proposal) throw new Error("Proposal not found");

  const reviewedAt = now();
  repository.updateApproval(approvalId, {
    status: "Rejected",
    reviewerId: "local-user",
    reviewedAt,
    comment: comment ?? null
  });
  repository.updateProposal(proposal.id, {
    status: "Rejected",
    reviewerId: "local-user",
    reviewedAt,
    reviewComment: comment ?? null
  });
  repository.createAuditEvent({
    eventType: "proposal.rejected",
    entityType: "proposal",
    entityId: proposal.id,
    payload: { approvalId, proposalType: proposal.proposalType }
  });
}

