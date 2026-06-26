import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function WikiPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const pagesQuery = useQuery({ queryKey: ["wiki"], queryFn: api.wiki.list });

  const createMutation = useMutation({
    mutationFn: () => api.wiki.create({ title, body: "" }),
    onSuccess: () => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["wiki"] });
    },
  });

  return (
    <div>
      <h1>Wiki</h1>

      <div className="card">
        <span className="field-label">新規ページ</span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createMutation.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ページ名"
          />
          <button type="submit" disabled={createMutation.isPending}>
            作成
          </button>
        </form>
      </div>

      {pagesQuery.data?.length === 0 && (
        <p className="muted">Wiki ページはまだありません。</p>
      )}
      {pagesQuery.data?.map((p) => (
        <Link key={p.id} to={`/wiki/${p.id}`} className="task-row">
          <span>{p.title}</span>
          <span className="badge">{p.tags.length} tags</span>
        </Link>
      ))}
    </div>
  );
}
