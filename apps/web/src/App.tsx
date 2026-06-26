import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/tasks", label: "Tasks" },
  { to: "/approvals", label: "Approvals" },
  { to: "/wiki", label: "Wiki" },
];

export function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Praxios</div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
