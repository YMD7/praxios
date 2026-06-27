import { GripVertical } from "lucide-react";
import type * as React from "react";
import {
  Group as ResizablePrimitiveGroup,
  Panel as ResizablePrimitivePanel,
  Separator as ResizablePrimitiveSeparator
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = Omit<
  React.ComponentProps<typeof ResizablePrimitiveGroup>,
  "defaultLayout" | "onLayoutChanged" | "orientation"
> & {
  autoSaveId?: string;
  direction?: "horizontal" | "vertical";
  onLayoutChanged?: React.ComponentProps<typeof ResizablePrimitiveGroup>["onLayoutChanged"];
};

const ResizablePanelGroup = ({
  autoSaveId,
  className,
  direction = "horizontal",
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps) => (
  <ResizablePrimitiveGroup
    className={cn(
      "flex h-full w-full",
      direction === "vertical" && "flex-col",
      className
    )}
    defaultLayout={autoSaveId ? readSavedLayout(autoSaveId) : undefined}
    onLayoutChanged={(layout) => {
      if (autoSaveId) {
        localStorage.setItem(autoSaveId, JSON.stringify(layout));
      }
      onLayoutChanged?.(layout);
    }}
    orientation={direction}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitivePanel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitiveSeparator> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitiveSeparator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    ) : null}
  </ResizablePrimitiveSeparator>
);

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

function readSavedLayout(autoSaveId: string) {
  try {
    const value = localStorage.getItem(autoSaveId);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : undefined;
  } catch {
    return undefined;
  }
}
