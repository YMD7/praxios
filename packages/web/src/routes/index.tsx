import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Praxios</h1>
      <p className="mt-2 text-gray-600">AI ネイティブな業務 OS</p>
      <div className="mt-6 flex gap-4">
        <Link
          to="/tasks"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          タスク一覧へ
        </Link>
        <Link
          to="/wiki"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Wiki へ
        </Link>
      </div>
    </div>
  );
}
