import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  confirmVariant = "destructive",
  busyLabel = "Traitement...",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background shadow-lg">
        <div className="space-y-2 p-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
