import { RefreshCw } from "lucide-react";
import { useConfig } from "@/lib/use-config";

// ローカル JSON 設定（`/config`）の実効値を人間向けに表示する読み取り専用画面。
// 表示内容は設定ファイルの中身に追従する（エージェント定義・デフォルトなど）。
export function Settings() {
  const { config, loading, error, reload } = useConfig();

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
        <button
          aria-label="Reload settings"
          className="iconButton"
          onClick={reload}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="panel">
        <h2>Agents</h2>

        {loading && !config ? (
          <p className="muted">Loading...</p>
        ) : config && config.agents.length > 0 ? (
          <>
            <div className="stack">
              {config.agents.map((agent) => (
                <div className="listItem" key={agent.id}>
                  <div>
                    <strong>{agent.label}</strong>
                    <div className="commandSnippet">
                      <span aria-hidden="true" className="commandSnippet-prompt">
                        $
                      </span>
                      <code>{agent.command}</code>
                    </div>
                    {agent.description && <p>{agent.description}</p>}
                  </div>
                  <div className="rowActions">
                    {agent.id === config.defaultAgent && <span className="badge">Default</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 16 }}>
              Default agent: <code>{config.defaultAgent}</code>
            </p>
          </>
        ) : (
          <p className="muted">No agents configured</p>
        )}
      </section>
    </section>
  );
}
