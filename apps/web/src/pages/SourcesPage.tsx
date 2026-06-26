import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function SourcesPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: api.sources.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.sources.create({
        sourceType: "manual_text",
        sourceTitle: title || null,
        content,
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      void qc.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  return (
    <div>
      <h1>Sources</h1>

      <div className="card">
        <span className="field-label">手動取り込み（Slack/メール本文などを貼付）</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル（任意）"
        />
        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ここに本文を貼り付け"
        />
        <button
          onClick={() => content.trim() && createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          取り込む
        </button>
      </div>

      {sourcesQuery.data?.length === 0 && (
        <p className="muted">Source はまだありません。</p>
      )}
      {sourcesQuery.data?.map((s) => (
        <Link key={s.id} to={`/sources/${s.id}`} className="task-row">
          <span>{s.sourceTitle ?? "(無題)"}</span>
          <span className="badge">{s.sourceType}</span>
        </Link>
      ))}
    </div>
  );
}
