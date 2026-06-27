import type { Proposal } from "@praxios/core";
import { Check, FileText, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function ApprovalQueue() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await api.listProposals("pending");
    setProposals(result.proposals);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load approvals");
    });
  }, []);

  async function apply(proposalId: string) {
    await api.applyProposal(proposalId);
    await load();
  }

  async function reject(proposalId: string) {
    await api.rejectProposal(proposalId);
    await load();
  }

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Approval Queue</p>
          <h1>Approvals</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="stack">
          {proposals.map((proposal) => (
            <article className="listItem" key={proposal.id}>
              <div>
                <strong>{proposal.proposalType}</strong>
                <p>{proposal.rationale}</p>
                <pre>{JSON.stringify(proposal.payload, null, 2)}</pre>
              </div>
              <div className="rowActions">
                {proposal.taskId && (
                  <Link className="smallButton" to={`/tasks/${proposal.taskId}`}>
                    Task
                  </Link>
                )}
                {proposal.sourceIds.map((sourceId) => (
                  <Link className="smallButton" key={sourceId} to={`/sources/${sourceId}`}>
                    <FileText aria-hidden="true" size={16} />
                    <span>Source</span>
                  </Link>
                ))}
                <button
                  className="iconButton"
                  type="button"
                  onClick={() => void apply(proposal.id)}
                >
                  <Check aria-hidden="true" size={17} />
                </button>
                <button
                  className="iconButton danger"
                  type="button"
                  onClick={() => void reject(proposal.id)}
                >
                  <X aria-hidden="true" size={17} />
                </button>
              </div>
            </article>
          ))}
          {proposals.length === 0 && <p className="muted">No pending approvals</p>}
        </div>
      </section>
    </section>
  );
}
