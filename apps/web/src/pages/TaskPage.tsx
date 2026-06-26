import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TASK_PRIORITIES, TASK_STATUSES, type Task } from "@praxios/core";
import { api } from "../api";

export function TaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Task>>({});

  const taskQuery = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => api.tasks.get(taskId!),
    enabled: Boolean(taskId),
  });

  useEffect(() => {
    if (taskQuery.data) setDraft(taskQuery.data);
  }, [taskQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => api.tasks.update(taskId!, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });

  if (taskQuery.isLoading) return <p className="muted">読み込み中…</p>;
  if (!taskQuery.data) return <p className="muted">タスクが見つかりません。</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Task Workspace</h1>

      <div className="card">
        <span className="field-label">タイトル</span>
        <input
          value={draft.title ?? ""}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <span className="field-label">状態</span>
            <select
              value={draft.status ?? "new"}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as Task["status"] })
              }
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span className="field-label">優先度</span>
            <select
              value={draft.priority ?? "medium"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priority: e.target.value as Task["priority"],
                })
              }
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="field-label">背景・説明</span>
        <textarea
          rows={4}
          value={draft.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />

        <span className="field-label">完了条件</span>
        <textarea
          rows={3}
          value={draft.completionCriteria ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, completionCriteria: e.target.value })
          }
        />

        <button
          onClick={() =>
            updateMutation.mutate({
              title: draft.title,
              status: draft.status,
              priority: draft.priority,
              description: draft.description,
              completionCriteria: draft.completionCriteria,
            })
          }
          disabled={updateMutation.isPending}
        >
          保存
        </button>
      </div>
    </div>
  );
}
