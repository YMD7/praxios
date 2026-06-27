import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div className={cn("relative overflow-hidden", className)} ref={ref} {...props}>
    <div className="h-full w-full overflow-auto">{children}</div>
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
