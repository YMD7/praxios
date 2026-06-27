import {
  ClipboardCheck,
  Database,
  ListTodo,
  Network,
  PanelLeft,
  SearchCheck
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { AgentTerminalPanel } from "@/components/terminal/AgentTerminalPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/wiki", label: "Wiki", icon: Network },
  { to: "/sources/manual", label: "Sources", icon: Database }
];

export function Home() {
  return (
    <div className="h-screen min-h-0 bg-background text-foreground">
      <ResizablePanelGroup
        autoSaveId="praxios-home-layout"
        className="min-h-0"
        direction="horizontal"
      >
        <ResizablePanel
          className="min-w-[220px]"
          defaultSize="24%"
          id="navigation"
          maxSize="38%"
          minSize="220px"
        >
          <aside className="flex h-full min-h-0 flex-col border-r bg-card">
            <div className="flex h-14 shrink-0 items-center gap-3 px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <SearchCheck aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Praxios</div>
                <div className="truncate text-xs text-muted-foreground">AI work OS</div>
              </div>
            </div>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <nav className="grid gap-1 p-3">
                {navigation.map((item) => (
                  <NavigationLink item={item} key={item.to} />
                ))}
              </nav>
            </ScrollArea>
            <Separator />
            <div className="grid gap-2 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <PanelLeft aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Drag the divider to resize</span>
              </div>
            </div>
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          className="min-w-[420px]"
          defaultSize="76%"
          id="terminal"
          minSize="420px"
        >
          <AgentTerminalPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function NavigationLink({ item }: { item: (typeof navigation)[number] }) {
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )
      }
      to={item.to}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}
