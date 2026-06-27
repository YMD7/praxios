import type { Source } from "@praxios/core";
import { FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function SourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await api.listSources();
    setSources(result.sources);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load sources");
    });
  }, []);

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Source List</p>
          <h1>Sources</h1>
        </div>
        <button className="iconButton" onClick={() => void load()} type="button">
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="panel tablePanel">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Captured</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <Link to={`/sources/${source.id}`}>
                    <FileText aria-hidden="true" size={16} />
                    <span>{source.sourceTitle}</span>
                  </Link>
                </td>
                <td>{source.sourceType}</td>
                <td>{source.provider ?? "-"}</td>
                <td>{new Date(source.capturedAt).toLocaleString()}</td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4}>No sources</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
