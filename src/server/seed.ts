import { repository } from "./repository";
import { saveSource } from "./services/sourceStore";

export function seedIfEmpty() {
  if (repository.listTasks().length > 0) return;

  const task = repository.createTask({
    title: "業務委託契約書の作成",
    description:
      "Slack、メール、過去資料に分散した情報を集めて契約書作成フローを進める。",
    priority: "High",
    completionCriteria: "必要情報を確認し、契約書作成手順をWikiに残す"
  });

  repository.upsertWikiPage({
    id: "contract-workflow",
    title: "契約書作成フロー",
    body:
      "# 契約書作成フロー\n\n必要情報、雛形、レビュー担当者を確認する。\n\n関連: [[approval-policy|承認ポリシー]]",
    tags: ["contract"]
  });

  const source = saveSource({
    sourceType: "manual_note",
    sourceTitle: "契約書作成依頼メモ",
    content:
      "A社との業務委託契約書を今週中に作成する。必要情報は契約期間、報酬、業務範囲、レビュー担当者。",
    metadata: { taskId: task.id }
  });

  repository.createContext({
    taskId: task.id,
    sourceType: source.sourceType,
    sourceId: source.id,
    title: source.sourceTitle,
    summary: "契約書作成に必要な項目が含まれる手動メモ。",
    evidence: { seeded: true }
  });

  repository.ensureKnowledgeLink(task.id, "contract-workflow", { seeded: true });
}

