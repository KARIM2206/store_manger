import * as React from "react";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center rounded-lg border border-dashed border-border bg-card/50 ${className}`}
    >
      {Icon && (
        <div className="p-3 bg-muted rounded-full text-muted-foreground mb-4">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} className="mt-4" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
}
