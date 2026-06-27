import { ClipboardCheck, Database, ListTodo, Network } from "lucide-react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <section className="mx-auto grid max-w-5xl gap-5">
      <header className="grid gap-2">
        <p className="eyebrow">Workbench</p>
        <h1 className="text-3xl font-semibold tracking-normal">Praxios</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Task ごとの context.md とローカル AI terminal を並べて扱う作業台です。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <HomeLink
          description="Task を作成し、選択した Task を workbench tab として開きます。"
          href="/tasks"
          icon={ListTodo}
          title="Tasks"
        />
        <HomeLink
          description="承認待ち Proposal を確認します。Task context は Task tab 内でも承認できます。"
          href="/approvals"
          icon={ClipboardCheck}
          title="Approvals"
        />
        <HomeLink
          description="蓄積した Wiki ページとリンクを確認します。"
          href="/wiki"
          icon={Network}
          title="Wiki"
        />
        <HomeLink
          description="取り込んだ Source の詳細を確認します。"
          href="/sources"
          icon={Database}
          title="Sources"
        />
      </div>
    </section>
  );
}

function HomeLink({
  description,
  href,
  icon: Icon,
  title
}: {
  description: string;
  href: string;
  icon: typeof ListTodo;
  title: string;
}) {
  return (
    <Link
      className="grid min-h-32 gap-3 rounded-md border bg-card p-4 text-card-foreground hover:bg-accent hover:no-underline"
      to={href}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
