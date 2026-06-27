import type { WikiLink, WikiPage } from "@praxios/core";
import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

export function WikiPageView() {
  const { pageId } = useParams();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [outgoing, setOutgoing] = useState<WikiLink[]>([]);
  const [backlinks, setBacklinks] = useState<WikiLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!pageId) return;
    const [pageResult, linkResult] = await Promise.all([
      api.getWikiPage(pageId),
      api.listWikiLinks(pageId)
    ]);

    setPage(pageResult.page);
    setTitle(pageResult.page.title);
    setBody(pageResult.page.body);
    setTags(pageResult.page.tags.join(", "));
    setOutgoing(linkResult.outgoing);
    setBacklinks(linkResult.backlinks);
  }

  useEffect(() => {
    load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load wiki page");
    });
  }, [pageId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pageId) return;
    setError(null);

    try {
      const result = await api.upsertWikiPage({
        pageId,
        title,
        body,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      });
      setPage(result.page);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save wiki page");
    }
  }

  if (!page) {
    return (
      <section className="screen">
        <div className="panel">Loading wiki page...</div>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Wiki Page</p>
          <h1>{page.title}</h1>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="workspaceGrid">
        <form className="panel formPanel" onSubmit={(event) => void save(event)}>
          <h2>Edit</h2>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            <span>Tags</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label>
            <span>Body</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={16} />
          </label>
          <button className="primaryButton" type="submit">
            <Save aria-hidden="true" size={18} />
            <span>Save</span>
          </button>
        </form>

        <section className="panel">
          <h2>Links</h2>
          <h3>Outgoing</h3>
          <LinkList links={outgoing} direction="to" />
          <h3>Backlinks</h3>
          <LinkList links={backlinks} direction="from" />
        </section>
      </div>
    </section>
  );
}

function LinkList({ links, direction }: { links: WikiLink[]; direction: "from" | "to" }) {
  if (links.length === 0) {
    return <p className="muted">No links</p>;
  }

  return (
    <div className="stack compact">
      {links.map((link) => {
        const target = direction === "to" ? link.toPageId : link.fromPageId;
        return (
          <article className="listItem" key={link.id}>
            <Link to={`/wiki/${target}`}>{target}</Link>
            <span className="badge">{link.status}</span>
          </article>
        );
      })}
    </div>
  );
}
