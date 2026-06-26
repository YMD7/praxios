import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function TasksPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });

  const createMutation = useMutation({
    mutationFn: () => api.tasks.create({ title }),
    onSuccess: () => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <div>
      <h1>Tasks</h1>

      <div className="card">
        <span className="field-label">新規タスク</span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createMutation.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タスクのタイトル"
          />
          <button type="submit" disabled={createMutation.isPending}>
            作成
          </button>
        </form>
      </div>

      {tasksQuery.isLoading && <p className="muted">読み込み中…</p>}
      {tasksQuery.isError && (
        <p className="muted">読み込みに失敗しました</p>
      )}
      {tasksQuery.data?.length === 0 && (
        <p className="muted">タスクはまだありません。</p>
      )}

      {tasksQuery.data?.map((t) => (
        <Link key={t.id} to={`/tasks/${t.id}`} className="task-row">
          <span>{t.title}</span>
          <span className="badge">{t.status}</span>
        </Link>
      ))}
    </div>
  );
}
