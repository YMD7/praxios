import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export function WikiPageView() {
  const { pageId } = useParams<{ pageId: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");

  const detailQuery = useQuery({
    queryKey: ["wiki", pageId],
    queryFn: () => api.wiki.get(pageId!),
    enabled: Boolean(pageId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setTitle(detailQuery.data.page.title);
      setBody(detailQuery.data.page.body);
    }
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => api.wiki.update(pageId!, { title, body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wiki"] });
    },
  });

  if (detailQuery.isLoading) return <p className="muted">読み込み中…</p>;
  if (!detailQuery.data) return <p className="muted">ページが見つかりません。</p>;

  const { outgoing, backlinks } = detailQuery.data;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Wiki</h1>

      <div className="card">
        <span className="field-label">タイトル</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className="field-label">
          本文（内部参照は [[ページ名]] で記述）
        </span>
        <textarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          保存
        </button>
      </div>

      <div className="card">
        <span className="field-label">参照先（outgoing links）</span>
        {outgoing.length === 0 && <p className="muted">なし</p>}
        {outgoing.map((l) => (
          <div key={l.id} style={{ marginBottom: 4 }}>
            {l.status === "resolved" ? (
              <Link to={`/wiki/${l.toPageId}`}>
                {l.anchorText ?? l.toTitle ?? l.toPageId}
              </Link>
            ) : (
              <span className="muted">
                {l.anchorText ?? l.toPageId}（未解決）
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <span className="field-label">参照元（backlinks）</span>
        {backlinks.length === 0 && <p className="muted">なし</p>}
        {backlinks.map((l) => (
          <div key={l.id} style={{ marginBottom: 4 }}>
            <Link to={`/wiki/${l.fromPageId}`}>
              {l.fromTitle ?? l.fromPageId}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
