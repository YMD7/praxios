import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Layout } from '../components/Layout.js';

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
