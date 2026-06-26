/**
 * Claude を使った抽出（Extract）。
 *
 * Source 本文を読み、タスク提案・Wiki 更新提案の候補を構造化出力で得る。
 * モデルは既定で claude-opus-4-8。構造化出力（output_config.format）で
 * スキーマに沿った JSON を強制する。
 */

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const PROPOSAL_MODEL = process.env.PRAXIOS_MODEL ?? "claude-opus-4-8";

/** 各提案候補は kind で種別を分ける。フィールドはフラットに保つ。 */
export const aiProposalSchema = z.object({
  proposals: z.array(
    z.object({
      kind: z.enum(["task_proposal", "wiki_update_proposal"]),
      /** なぜこの提案を出したか（Source への根拠）。 */
      rationale: z.string(),
      /** タスク名 / Wiki ページ名。 */
      title: z.string(),
      /** タスクの背景説明 / Wiki 本文。 */
      body: z.string(),
      /** タスクの完了条件（Wiki の場合は空文字）。 */
      completionCriteria: z.string(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      tags: z.array(z.string()),
    }),
  ),
});

export type AiProposal = z.infer<typeof aiProposalSchema>["proposals"][number];

const SYSTEM = `あなたは業務 OS「Praxios」の AI ワーカーです。
与えられた Source（Slack やメールの本文など）を解釈し、業務を前進させる提案を生成します。

提案の種別:
- task_proposal: 新しく着手すべきタスク。title=タスク名, body=背景/要件, completionCriteria=完了条件, priority を埋める。
- wiki_update_proposal: 業務知識として残すべき内容。title=ページ名, body=本文(Markdown), completionCriteria は空文字, tags を付与。

ルール:
- Source から読み取れる事実のみを根拠にする。推測で情報を作らない。
- rationale には「Source のどの記述から導いたか」を簡潔に書く。
- 明確なタスクや知識が無ければ proposals は空配列にする。
- 出力は日本語。`;

export interface ExtractInput {
  sourceTitle: string | null;
  sourceType: string;
  content: string;
  existingTasks: { id: string; title: string }[];
}

export async function extractProposals(
  input: ExtractInput,
): Promise<AiProposal[]> {
  const client = new Anthropic();

  const existing =
    input.existingTasks.length > 0
      ? `既存タスク一覧（重複を避ける参考）:\n${input.existingTasks
          .map((t) => `- ${t.title}`)
          .join("\n")}`
      : "既存タスクはありません。";

  const userText = `Source 種別: ${input.sourceType}
タイトル: ${input.sourceTitle ?? "(無題)"}

--- Source 本文 ---
${input.content}
--- ここまで ---

${existing}

この Source からタスク提案・Wiki 更新提案を生成してください。`;

  const message = await client.beta.messages.parse({
    model: PROPOSAL_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
    output_format: betaZodOutputFormat(aiProposalSchema),
  });

  return message.parsed_output?.proposals ?? [];
}
