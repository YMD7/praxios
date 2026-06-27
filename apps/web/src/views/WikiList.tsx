import type { WikiPage } from "@praxios/core";
import { Plus, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export function WikiList() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await api.listWikiPages();
    setPages(result.pages);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load wiki");
    });
  }, []);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await api.createWikiPage({
        pageId,
        title,
        body,
        tags: []
      });
      navigate(`/wiki/${result.page.pageId}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create page");
    }
  }

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Wiki</p>
          <h1>Knowledge</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => void createPage(event)}>
          <h2>New Page</h2>
          <label>
            <span>Page ID</span>
            <input value={pageId} onChange={(event) => setPageId(event.target.value)} required />
          </label>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            <span>Body</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} />
          </label>
          <button className="primaryButton" type="submit">
            <Plus aria-hidden="true" size={18} />
            <span>Create</span>
          </button>
        </form>

        <section className="panel">
          <h2>Pages</h2>
          <div className="stack">
            {pages.map((page) => (
              <article className="listItem" key={page.id}>
                <div>
                  <strong>
                    <Link to={`/wiki/${page.pageId}`}>{page.title}</Link>
                  </strong>
                  <p>{page.pageId}</p>
                </div>
                <span className="badge">{new Date(page.updatedAt).toLocaleDateString()}</span>
              </article>
            ))}
            {pages.length === 0 && <p className="muted">No wiki pages</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
