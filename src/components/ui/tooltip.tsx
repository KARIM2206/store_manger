import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "left", className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, height: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [visible]);

  return (
    <div
      ref={triggerRef}
      className="relative flex w-full"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            className={cn(
              "fixed z-[100] whitespace-nowrap rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground shadow-md pointer-events-none animate-in fade-in-0",
              className
            )}
            style={{
              top:
                side === "top"
                  ? coords.top - 8
                  : side === "bottom"
                  ? coords.top + coords.height + 8
                  : side === "left" || side === "right"
                  ? coords.top + coords.height / 2
                  : 0,
              left:
                side === "left"
                  ? coords.left - 8
                  : side === "right"
                  ? coords.left + coords.width + 8
                  : side === "top" || side === "bottom"
                  ? coords.left + coords.width / 2
                  : 0,
              transform:
                side === "top"
                  ? "translate(-50%, -100%)"
                  : side === "bottom"
                  ? "translate(-50%, 0)"
                  : side === "left"
                  ? "translate(-100%, -50%)"
                  : "translate(0, -50%)",
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
