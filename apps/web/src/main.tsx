import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { SourceViewerPage } from "./pages/SourceViewerPage";
import { SourcesPage } from "./pages/SourcesPage";
import { TaskPage } from "./pages/TaskPage";
import { TasksPage } from "./pages/TasksPage";
import { WikiPage } from "./pages/WikiPage";
import { WikiPageView } from "./pages/WikiPageView";
import "./styles.css";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <TasksPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "tasks/:taskId", element: <TaskPage /> },
      { path: "sources", element: <SourcesPage /> },
      { path: "sources/:sourceId", element: <SourceViewerPage /> },
      { path: "approvals", element: <ApprovalsPage /> },
      { path: "wiki", element: <WikiPage /> },
      { path: "wiki/:pageId", element: <WikiPageView /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
