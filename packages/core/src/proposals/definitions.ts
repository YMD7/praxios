import { z } from "zod";
import { taskPriorities, type JsonObject, type ProposalType } from "../types.js";
import { InvalidProposalPayloadError } from "../errors.js";

export const taskCreateProposalPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(taskPriorities).default("Normal"),
  dueDate: z.string().nullable().optional(),
  completionCriteria: z.string().default("")
});

export const taskContextProposalPayloadSchema = z.object({
  title: z.string().min(1).default("Context"),
  summary: z.string().default(""),
  occurredAt: z.string().nullable().optional(),
  relevanceScore: z.number().min(0).max(1).default(0.7)
});

export const wikiUpdateProposalPayloadSchema = z.object({
  pageId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([])
});

export type TaskCreateProposalPayload = z.infer<typeof taskCreateProposalPayloadSchema>;
export type TaskContextProposalPayload = z.infer<typeof taskContextProposalPayloadSchema>;
export type WikiUpdateProposalPayload = z.infer<typeof wikiUpdateProposalPayloadSchema>;

export const proposalDefinitions = {
  task_create: {
    displayName: "Task proposal",
    schema: taskCreateProposalPayloadSchema
  },
  task_context: {
    displayName: "Task context proposal",
    schema: taskContextProposalPayloadSchema
  },
  wiki_update: {
    displayName: "Wiki update proposal",
    schema: wikiUpdateProposalPayloadSchema
  }
} satisfies Record<ProposalType, { displayName: string; schema: z.ZodTypeAny }>;

export function parseProposalPayload(
  proposalType: "task_create",
  payload: JsonObject
): TaskCreateProposalPayload;
export function parseProposalPayload(
  proposalType: "task_context",
  payload: JsonObject
): TaskContextProposalPayload;
export function parseProposalPayload(
  proposalType: "wiki_update",
  payload: JsonObject
): WikiUpdateProposalPayload;
export function parseProposalPayload(proposalType: ProposalType, payload: JsonObject) {
  const schema = proposalDefinitions[proposalType].schema;
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new InvalidProposalPayloadError(result.error.message);
  }

  return result.data;
}
