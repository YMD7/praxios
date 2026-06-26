import { Link, useRouterState } from '@tanstack/react-router';
import { CheckCircle, FileText, Home, Inbox, Library } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tasks', label: 'Tasks', icon: Inbox },
  { to: '/sources', label: 'Sources', icon: FileText },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/wiki', label: 'Wiki', icon: Library },
];

export function Layout({ children }: LayoutProps) {
  const { location } = useRouterState();

  return (
    <div className="flex h-full">
      <aside className="w-56 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-lg font-semibold">Praxios</span>
        </div>
        <nav className="p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
