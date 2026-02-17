import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  kind: "success" | "error";
  title: string;
  description: string;
  onClose: () => void;
};

export function StatusDialog({ open, kind, title, description, onClose }: Props) {
  if (!open) return null;

  const isSuccess = kind === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background shadow-lg">
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <h3 className={`text-lg font-semibold ${isSuccess ? "text-emerald-700" : "text-red-700"}`}>
              {title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
        </div>
        <div className="flex items-center justify-end border-t p-4">
          <Button
            onClick={onClose}
            className={isSuccess ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            variant={isSuccess ? "default" : "destructive"}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
