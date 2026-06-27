import type { ContextItem, Proposal, Task } from "@praxios/core";
import { Check, FileText, RefreshCw, Send, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

export function TaskWorkspace() {
  const { taskId } = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceType, setSourceType] = useState("manual_note");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!taskId) return;
    const [taskResult, contextResult, proposalResult] = await Promise.all([
      api.getTask(taskId),
      api.listTaskContext(taskId),
      api.listTaskProposals(taskId)
    ]);

    setTask(taskResult.task);
    setContextItems(contextResult.contextItems);
    setProposals(proposalResult.proposals);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load task");
    });
  }, [taskId]);

  async function ingest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId) return;
    setError(null);

    try {
      await api.ingestSource({
        sourceTitle,
        sourceType,
        content,
        taskId,
        processNow: true
      });
      setSourceTitle("");
      setContent("");
      await load();
    } catch (ingestError) {
      setError(ingestError instanceof Error ? ingestError.message : "Failed to ingest source");
    }
  }

  async function apply(proposalId: string) {
    await api.applyProposal(proposalId);
    await load();
  }

  async function reject(proposalId: string) {
    await api.rejectProposal(proposalId);
    await load();
  }

  if (!task) {
    return (
      <section className="screen">
        <div className="panel">Loading task...</div>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Task Workspace</p>
          <h1>{task.title}</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="workspaceGrid">
        <section className="panel">
          <h2>Task</h2>
          <dl className="definitionList">
            <div>
              <dt>Status</dt>
              <dd>{task.status}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{task.priority}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{task.dueDate ?? "-"}</dd>
            </div>
          </dl>
          <p className="bodyText">{task.description || "No description"}</p>
          <h3>Completion</h3>
          <p className="bodyText">{task.completionCriteria || "No criteria"}</p>
        </section>

        <form className="panel formPanel" onSubmit={(event) => void ingest(event)}>
          <h2>Add Source</h2>
          <label>
            <span>Title</span>
            <input
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Type</span>
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="manual_note">Manual note</option>
              <option value="slack_message">Slack message</option>
              <option value="email_thread">Email thread</option>
              <option value="meeting_note">Meeting note</option>
            </select>
          </label>
          <label>
            <span>Content</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={8}
              required
            />
          </label>
          <button className="primaryButton" type="submit">
            <Send aria-hidden="true" size={18} />
            <span>Ingest</span>
          </button>
        </form>
      </div>

      <section className="panel">
        <h2>Context</h2>
        <div className="stack">
          {contextItems.map((item) => (
            <article className="listItem" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </div>
              <Link to={`/sources/${item.sourceId}`}>
                <FileText aria-hidden="true" size={16} />
                <span>Source</span>
              </Link>
            </article>
          ))}
          {contextItems.length === 0 && <p className="muted">No context</p>}
        </div>
      </section>

      <section className="panel">
        <h2>Proposals</h2>
        <ProposalList proposals={proposals} onApply={apply} onReject={reject} />
      </section>
    </section>
  );
}

function ProposalList({
  proposals,
  onApply,
  onReject
}: {
  proposals: Proposal[];
  onApply: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
}) {
  if (proposals.length === 0) {
    return <p className="muted">No proposals</p>;
  }

  return (
    <div className="stack">
      {proposals.map((proposal) => (
        <article className="listItem" key={proposal.id}>
          <div>
            <strong>{proposal.proposalType}</strong>
            <p>{proposal.rationale}</p>
            <code>{proposal.status}</code>
          </div>
          <div className="rowActions">
            {proposal.sourceIds.map((sourceId) => (
              <Link className="smallButton" key={sourceId} to={`/sources/${sourceId}`}>
                <FileText aria-hidden="true" size={16} />
                <span>Source</span>
              </Link>
            ))}
            {proposal.status === "pending" && (
              <>
                <button
                  className="iconButton"
                  type="button"
                  onClick={() => void onApply(proposal.id)}
                >
                  <Check aria-hidden="true" size={17} />
                </button>
                <button
                  className="iconButton danger"
                  type="button"
                  onClick={() => void onReject(proposal.id)}
                >
                  <X aria-hidden="true" size={17} />
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
