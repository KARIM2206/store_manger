import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "left", className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground shadow-md pointer-events-none animate-in fade-in-0",
            side === "left" && "right-full mr-2 top-1/2 -translate-y-1/2",
            side === "right" && "left-full ml-2 top-1/2 -translate-y-1/2",
            side === "top" && "bottom-full mb-2 left-1/2 -translate-x-1/2",
            side === "bottom" && "top-full mt-2 left-1/2 -translate-x-1/2",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
