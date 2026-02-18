import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  FileErrorsState,
  FileSpec,
  FilesState,
  Restaurant,
} from "@/components/bk/uploader/types";
import { fileSizeLabel, formatFrDate } from "@/components/bk/uploader/utils";

type Props = {
  open: boolean;
  selectedRestaurant: Restaurant | null;
  modalDate: string;
  replaceMode: boolean;
  uploading: boolean;
  fileCount: number;
  totalSteps: number;
  progressPercent: number;
  files: FilesState;
  fileErrors: FileErrorsState;
  fileSpecs: FileSpec[];
  onFolderSelect: (files: FileList | null) => void;
  onResetFiles: () => void;
  onClose: () => void;
  onSubmit: () => void;
  onFileSelect: (spec: FileSpec, file: File | null) => void;
};

export function ImportModal({
  open,
  selectedRestaurant,
  modalDate,
  replaceMode,
  uploading,
  fileCount,
  totalSteps,
  progressPercent,
  files,
  fileErrors,
  fileSpecs,
  onFolderSelect,
  onResetFiles,
  onClose,
  onSubmit,
  onFileSelect,
}: Props) {
  const folderInputId = useId();
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputProps: Record<"webkitdirectory" | "directory", string> = {
    webkitdirectory: "",
    directory: "",
  };

  if (!open || !selectedRestaurant) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-2 w-full max-w-5xl rounded-lg border bg-background shadow-xl">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={uploading}
                aria-label="Fermer"
                className="mt-0.5 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="text-lg font-semibold">
                  {replaceMode ? "Réimport" : "Import"} - {selectedRestaurant.code} ({formatFrDate(modalDate)})
                </div>
                <div className="text-sm text-muted-foreground">
                  {fileCount}/{fileSpecs.length} fichiers sélectionnés. Les 8 fichiers sont obligatoires.
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={uploading}
              aria-label="Fermer"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progression import</span>
                <span>{fileCount}/{totalSteps}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-teal-700 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <input
              id={folderInputId}
              ref={folderInputRef}
              type="file"
              className="hidden"
              multiple
              {...directoryInputProps}
              onChange={(e) => {
                onFolderSelect(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => {
                  if (!folderInputRef.current) return;
                  folderInputRef.current.value = "";
                  folderInputRef.current.click();
                }}
              >
                Choisir un dossier
              </Button>
              <Button type="button" variant="outline" disabled={uploading} onClick={onResetFiles}>
                Vider
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-15rem)] space-y-4 overflow-y-auto p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {fileSpecs.map((spec) => {
              const file = files[spec.id];
              const fileError = fileErrors[spec.id];
              const tileClass = file
                ? "border-teal-300 bg-teal-50/45"
                : fileError
                  ? "border-red-300 bg-red-50/60"
                  : "";
              return (
                <div key={spec.id} className={`space-y-2 rounded-md border p-3 ${tileClass}`}>
                  <div className="text-xs text-muted-foreground">{spec.label}</div>
                  <div className="flex items-center gap-2">
                    <input
                      id={`file-${spec.id}`}
                      type="file"
                      className="hidden"
                      accept=".csv,text/csv"
                      onChange={(e) => onFileSelect(spec, e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 max-w-[330px] justify-start overflow-hidden text-ellipsis whitespace-nowrap"
                      onClick={() =>
                        (document.getElementById(`file-${spec.id}`) as HTMLInputElement | null)?.click()
                      }
                    >
                      {file ? file.name : "Choisir un fichier"}
                    </Button>
                    {file && (
                      <Button type="button" variant="outline" size="sm" onClick={() => onFileSelect(spec, null)}>
                        Retirer
                      </Button>
                    )}
                  </div>
                  <div
                    className={`text-xs ${
                      file ? "text-teal-800" : fileError ? "text-red-700" : "text-muted-foreground"
                    }`}
                  >
                    {file && `Valide: ${file.name} (${fileSizeLabel(file.size)})`}
                    {!file && fileError}
                    {!file && !fileError && "Aucun fichier"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={fileCount !== fileSpecs.length || uploading}>
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? "Import en cours..." : "Passer à l'étape suivante"}
            </span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
