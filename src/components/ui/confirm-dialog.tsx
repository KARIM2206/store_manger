import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "تأكيد الإجراء",
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onConfirm,
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                variant === "danger"
                  ? "bg-danger/10 text-danger"
                  : "bg-warning/10 text-warning"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : variant === "warning" ? "warning" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {loading ? "جاري التنفيذ..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
