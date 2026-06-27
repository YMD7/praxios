import { WorkbenchShell } from "./components/workbench/WorkbenchShell.js";
import { useSystemTheme } from "./lib/use-system-theme.js";

export function App() {
  useSystemTheme();
  return <WorkbenchShell />;
}
