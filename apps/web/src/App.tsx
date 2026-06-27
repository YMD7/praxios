import { ClipboardCheck, Database, ListTodo, Network, SearchCheck } from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ApprovalQueue } from "./views/ApprovalQueue.js";
import { SourceViewer } from "./views/SourceViewer.js";
import { TaskList } from "./views/TaskList.js";
import { TaskWorkspace } from "./views/TaskWorkspace.js";
import { WikiList } from "./views/WikiList.js";
import { WikiPageView } from "./views/WikiPageView.js";

export function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <SearchCheck aria-hidden="true" size={22} />
          <span>Praxios</span>
        </div>
        <nav className="nav">
          <NavLink to="/tasks">
            <ListTodo aria-hidden="true" size={18} />
            <span>Tasks</span>
          </NavLink>
          <NavLink to="/approvals">
            <ClipboardCheck aria-hidden="true" size={18} />
            <span>Approvals</span>
          </NavLink>
          <NavLink to="/wiki">
            <Network aria-hidden="true" size={18} />
            <span>Wiki</span>
          </NavLink>
          <NavLink to="/sources/manual">
            <Database aria-hidden="true" size={18} />
            <span>Sources</span>
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/:taskId" element={<TaskWorkspace />} />
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/wiki" element={<WikiList />} />
          <Route path="/wiki/:pageId" element={<WikiPageView />} />
          <Route path="/sources/:sourceId" element={<SourceViewer />} />
        </Routes>
      </main>
    </div>
  );
}
