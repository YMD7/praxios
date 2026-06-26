import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Proposal } from "@praxios/core";
import { api } from "../api";

function payloadTitle(p: Proposal): string {
  const t = (p.payload as { title?: string }).title;
  return t ?? "(無題)";
}

export function ApprovalsPage() {
  const qc = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: ["proposals", "pending"],
    queryFn: () => api.proposals.list("pending"),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["proposals"] });
    void qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.proposals.approve(id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.proposals.reject(id),
    onSuccess: invalidate,
  });

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Approval Queue</h1>

      {pendingQuery.data?.length === 0 && (
        <p className="muted">承認待ちの提案はありません。</p>
      )}

      {pendingQuery.data?.map((p) => (
        <div key={p.id} className="card">
          <div style={{ marginBottom: 8 }}>
            <span className="badge">{p.proposalKind}</span>{" "}
            <span className="badge">by {p.createdBy}</span>
          </div>
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>{payloadTitle(p)}</h2>
          {p.rationale && (
            <p className="muted" style={{ marginTop: 0 }}>
              根拠: {p.rationale}
            </p>
          )}
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f6f7f9",
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {JSON.stringify(p.payload, null, 2)}
          </pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => approveMutation.mutate(p.id)}
              disabled={approveMutation.isPending}
            >
              承認して適用
            </button>
            <button
              onClick={() => rejectMutation.mutate(p.id)}
              disabled={rejectMutation.isPending}
              style={{ background: "#9aa0aa" }}
            >
              却下
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
