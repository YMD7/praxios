import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { env } from '../lib/env.js';

const proposalSchema = z.object({
  proposalType: z.enum(['task_proposal', 'wiki_update_proposal', 'message_proposal']),
  destination: z.enum(['task', 'wiki', 'message', 'reference']),
  payload: z.record(z.unknown()),
  rationale: z.string().max(5000),
  evidence: z.array(z.record(z.unknown())).default([]),
});

export type GeneratedProposal = z.infer<typeof proposalSchema>;

const systemPrompt = `You are Praxios, an AI-native business OS assistant.
Analyze the provided source content and generate a structured proposal.

Rules:
- Choose proposalType based on intent:
  - task_proposal: when the source describes work to be done, a request, a TODO, or an action item.
  - wiki_update_proposal: when the source contains knowledge, decisions, definitions, or meeting notes that should be recorded.
  - message_proposal: when the source is a message that needs to be sent or forwarded.
- Choose destination based on where the proposal should be applied:
  - task: for task_proposal
  - wiki: for wiki_update_proposal
  - message: for message_proposal
  - reference: when nothing should be applied but the source is worth referencing
- The payload must match the proposalType:
  - task_proposal: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' | 'urgent' }
  - wiki_update_proposal: { title: string; body: string }
  - message_proposal: { to?: string; subject?: string; body: string }
- Provide a concise rationale explaining why this proposal fits the source.
- Provide 1-3 evidence objects. Each evidence object should quote the relevant part of the source and explain what it supports. Example: { "quote": "...", "supports": "task title" }`;

function buildUserPrompt(sourceContent: string): string {
  return `Source content:\n---\n${sourceContent}\n---\n\nGenerate a proposal for this source.`;
}

export interface AIProvider {
  generateProposal(sourceContent: string): Promise<GeneratedProposal>;
}

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

class OpenAIProvider implements AIProvider {
  async generateProposal(sourceContent: string): Promise<GeneratedProposal> {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: proposalSchema,
      system: systemPrompt,
      prompt: buildUserPrompt(sourceContent),
    });
    return object;
  }
}

class AnthropicProvider implements AIProvider {
  async generateProposal(sourceContent: string): Promise<GeneratedProposal> {
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-latest'),
      schema: proposalSchema,
      system: systemPrompt,
      prompt: buildUserPrompt(sourceContent),
    });
    return object;
  }
}

class MockProvider implements AIProvider {
  async generateProposal(sourceContent: string): Promise<GeneratedProposal> {
    const lower = sourceContent.toLowerCase();
    const titleMatch = sourceContent.match(/(?:title|件名|タイトル)[：:]\s*(.+)/i);
    const title = titleMatch?.[1]?.trim().slice(0, 100) || '提案されたタスク';

    if (lower.includes('会議') || lower.includes('meeting') || lower.includes('議事録')) {
      return {
        proposalType: 'wiki_update_proposal',
        destination: 'wiki',
        payload: {
          title: title || 'Meeting Notes',
          body: sourceContent,
        },
        rationale: '会議内容をWikiに記録することで、ナレッジを蓄積できます。',
        evidence: [{ quote: sourceContent.slice(0, 200), supports: '会議内容の記録' }],
      };
    }

    return {
      proposalType: 'task_proposal',
      destination: 'task',
      payload: {
        title,
        description: sourceContent,
        priority: lower.includes('urgent') || lower.includes('急') ? 'urgent' : 'medium',
      },
      rationale: 'ソースから作業項目を検出しました。',
      evidence: [{ quote: sourceContent.slice(0, 200), supports: '作業項目の検出' }],
    };
  }
}

export function createAIProvider(provider: string = env.AI_PROVIDER): AIProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

export const aiProvider = createAIProvider();
