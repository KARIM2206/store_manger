import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={inputId}
          ref={ref}
          className={cn(
            "h-4 w-4 shrink-0 mt-0.5 rounded border border-primary text-primary focus:ring-1 focus:ring-primary focus:ring-offset-1 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {(label || description) && (
          <label htmlFor={inputId} className="cursor-pointer select-none text-right">
            {label && (
              <span className="text-sm font-medium text-foreground block">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground block mt-0.5">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
