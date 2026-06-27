import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside Tabs");
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ defaultValue, value, onValueChange, className, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("w-full", className)} {...props} />
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      ref={ref}
      role="tablist"
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const context = useTabsContext();
    const selected = context.value === value;

    return (
      <button
        aria-selected={selected}
        className={cn(
          "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
          className
        )}
        data-state={selected ? "active" : "inactive"}
        onClick={(event) => {
          context.setValue(value);
          onClick?.(event);
        }}
        ref={ref}
        role="tab"
        type="button"
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = useTabsContext();
    if (context.value !== value) return null;

    return (
      <div
        className={cn(
          "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        ref={ref}
        role="tabpanel"
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsContent, TabsList, TabsTrigger };
