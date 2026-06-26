import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export function SourceViewerPage() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const sourceQuery = useQuery({
    queryKey: ["sources", sourceId],
    queryFn: () => api.sources.get(sourceId!),
    enabled: Boolean(sourceId),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => api.sources.analyze(sourceId!),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
      if (res.created.length > 0) navigate("/approvals");
    },
  });

  if (sourceQuery.isLoading) return <p className="muted">読み込み中…</p>;
  if (!sourceQuery.data) return <p className="muted">Source が見つかりません。</p>;

  const s = sourceQuery.data;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Source Viewer</h1>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? "解析中…" : "AI で解析して提案を生成"}
        </button>
        {analyzeMutation.data &&
          analyzeMutation.data.created.length === 0 && (
            <span className="muted" style={{ marginLeft: 12 }}>
              提案は生成されませんでした。
            </span>
          )}
      </div>
      <div className="card">
        <div className="muted" style={{ marginBottom: 8 }}>
          <span className="badge">{s.sourceType}</span>{" "}
          {s.provider && <span className="badge">{s.provider}</span>} · captured{" "}
          {s.capturedAt}
        </div>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
          {s.sourceTitle ?? "(無題)"}
        </h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#f6f7f9",
            padding: 12,
            borderRadius: 6,
            margin: 0,
          }}
        >
          {s.content}
        </pre>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          hash: {s.hash.slice(0, 16)}… · 正本: {s.sourcePath}
        </p>
      </div>
    </div>
  );
}
