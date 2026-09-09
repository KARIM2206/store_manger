import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-right">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
  className,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  if (!context) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        context.setOpen((prev) => !prev);
      }}
      className={cn("inline-flex cursor-pointer", className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({
  children,
  align = "right",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = React.useState(false);

  React.useEffect(() => {
    if (context?.open && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.top;
      // If the menu would overflow the viewport bottom, open upward
      if (spaceBelow < rect.height + 16) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [context?.open]);

  if (!context || !context.open) return null;

  return (
    <div
      ref={contentRef}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-card p-1 text-card-foreground shadow-md animate-in fade-in-80",
        openUpward ? "bottom-full mb-2" : "top-full mt-2",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  destructive = false,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  if (!context) return null;

  return (
    <div
      onClick={() => {
        onClick?.();
        context.setOpen(false);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted",
        destructive
          ? "text-danger hover:bg-danger/10 hover:text-danger"
          : "text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}
