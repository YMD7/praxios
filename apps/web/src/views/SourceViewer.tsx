import type { Source } from "@praxios/core";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

export function SourceViewer() {
  const { sourceId } = useParams();
  const [source, setSource] = useState<Source | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!sourceId || sourceId === "manual") {
      setSource(null);
      setContent("");
      return;
    }

    const [sourceResult, sourceContent] = await Promise.all([
      api.getSource(sourceId),
      api.getSourceContent(sourceId)
    ]);

    setSource(sourceResult.source);
    setContent(sourceContent);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load source");
    });
  }, [sourceId]);

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Source Viewer</p>
          <h1>{source?.sourceTitle ?? "Sources"}</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      {source ? (
        <div className="workspaceGrid">
          <section className="panel">
            <h2>Metadata</h2>
            <dl className="definitionList">
              <div>
                <dt>Type</dt>
                <dd>{source.sourceType}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{source.provider ?? "-"}</dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  <code>{source.hash}</code>
                </dd>
              </div>
              <div>
                <dt>Captured</dt>
                <dd>{new Date(source.capturedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h2>Raw</h2>
            <pre>{content}</pre>
          </section>
        </div>
      ) : (
        <section className="panel">
          <p className="muted">Open a source from a task, context item, or proposal.</p>
        </section>
      )}
    </section>
  );
}
