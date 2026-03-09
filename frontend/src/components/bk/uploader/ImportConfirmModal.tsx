import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExtraKpiDraft = {
  heuresPersonnel: string;
  heuresTravail: string;
  tauxHoraire: string;
  osat: string;
  google: string;
};

type ConfirmPayload = {
  commentDraft: string;
  extraKpiDraft: ExtraKpiDraft;
};

type Props = {
  open: boolean;
  uploading: boolean;
  commentN1: string | null;
  commentN1Loading: boolean;
  laborAutofillLoading?: boolean;
  laborAutofillError?: string | null;
  autoLaborFieldsLocked?: boolean;
  initialCommentDraft: string;
  initialExtraKpiDraft: ExtraKpiDraft;
  onCancel: () => void;
  onConfirm: (payload: ConfirmPayload) => void;
};

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9,.\s]/g, "").replace(/\s+/g, "");
  let separatorSeen = false;
  let out = "";
  for (const ch of cleaned) {
    if (ch === "." || ch === ",") {
      if (separatorSeen) continue;
      separatorSeen = true;
    }
    out += ch;
  }
  return out;
}

function parseNumericValue(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function ImportConfirmModal({
  open,
  uploading,
  commentN1,
  commentN1Loading,
  laborAutofillLoading = false,
  laborAutofillError = null,
  autoLaborFieldsLocked = false,
  initialCommentDraft,
  initialExtraKpiDraft,
  onCancel,
  onConfirm,
}: Props) {
  const [commentDraft, setCommentDraft] = useState(initialCommentDraft);
  const [extraKpiDraft, setExtraKpiDraft] = useState<ExtraKpiDraft>(initialExtraKpiDraft);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setCommentDraft(initialCommentDraft);
      setExtraKpiDraft(initialExtraKpiDraft);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open, initialCommentDraft, initialExtraKpiDraft]);

  const osatValue = parseNumericValue(extraKpiDraft.osat);
  const googleValue = parseNumericValue(extraKpiDraft.google);
  const isOsatValid = osatValue !== null && osatValue >= 0 && osatValue <= 100;
  const isGoogleValid = googleValue !== null && googleValue >= 0 && googleValue <= 5;

  const canConfirm = useMemo(() => {
    const values = [
      extraKpiDraft.heuresPersonnel,
      extraKpiDraft.heuresTravail,
      extraKpiDraft.tauxHoraire,
      extraKpiDraft.osat,
      extraKpiDraft.google,
    ];
    return (
      !laborAutofillLoading &&
      !laborAutofillError &&
      values.every((value) => parseNumericValue(value) !== null) &&
      isOsatValid &&
      isGoogleValid
    );
  }, [extraKpiDraft, isGoogleValid, isOsatValid, laborAutofillError, laborAutofillLoading]);

  const validationMessage = canConfirm
    ? null
    : laborAutofillLoading
      ? "Chargement des données RH MyRHIS..."
      : laborAutofillError
        ? laborAutofillError
        : !isOsatValid
          ? "La note OSAT doit être comprise entre 0 et 100."
          : !isGoogleValid
            ? "La note Google doit être comprise entre 0 et 5."
            : "Les notes satisfaction doivent être numériques.";

  const inputClass =
    "h-10 rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const readOnlyInputClass =
    "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-700";

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !uploading) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border bg-background shadow-xl">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Confirmer l'import</h3>
              <p className="text-sm text-muted-foreground">
                Complète les notes avant validation.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={uploading}
              aria-label="Fermer"
              className="border border-input"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <div className="mb-1 text-xs text-muted-foreground">Commentaire N-1</div>
            <div className="whitespace-pre-wrap text-foreground">
              {commentN1Loading ? "Chargement..." : commentN1 || "Aucun commentaire N-1."}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Commentaire (optionnel)</div>
            <input
              className={`${inputClass} w-full`}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Contexte du jour, correction, remarque..."
              maxLength={180}
              disabled={uploading}
            />
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-1 text-sm font-medium">Données RH</div>
            <div className="mb-3 text-xs text-muted-foreground">
              Ces données proviennent de l'API MyRHIS et ne peuvent pas être modifiées ici.
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Heures personnel réalisées</div>
                <input
                  className={`${inputClass} ${autoLaborFieldsLocked ? readOnlyInputClass : ""} w-full`}
                  value={extraKpiDraft.heuresPersonnel}
                  onChange={(e) =>
                    setExtraKpiDraft((prev) => ({
                      ...prev,
                      heuresPersonnel: sanitizeDecimalInput(e.target.value),
                    }))
                  }
                  placeholder="Heures personnel"
                  inputMode="decimal"
                  disabled={uploading || laborAutofillLoading}
                  readOnly={autoLaborFieldsLocked}
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Heures prévues</div>
                <input
                  className={`${inputClass} ${autoLaborFieldsLocked ? readOnlyInputClass : ""} w-full`}
                  value={extraKpiDraft.heuresTravail}
                  onChange={(e) =>
                    setExtraKpiDraft((prev) => ({
                      ...prev,
                      heuresTravail: sanitizeDecimalInput(e.target.value),
                    }))
                  }
                  placeholder="Heures prévues"
                  inputMode="decimal"
                  disabled={uploading || laborAutofillLoading}
                  readOnly={autoLaborFieldsLocked}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="text-xs text-muted-foreground">Taux horaire (EUR)</div>
                <input
                  className={`${inputClass} w-full`}
                  value={extraKpiDraft.tauxHoraire}
                  onChange={(e) =>
                    setExtraKpiDraft((prev) => ({
                      ...prev,
                      tauxHoraire: sanitizeDecimalInput(e.target.value),
                    }))
                  }
                  placeholder="Taux horaire (EUR)"
                  inputMode="decimal"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Notes satisfaction (obligatoire)</div>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">OSAT (%)</div>
                <input
                  className={`${inputClass} w-full`}
                  value={extraKpiDraft.osat}
                  onChange={(e) =>
                    setExtraKpiDraft((prev) => ({
                      ...prev,
                      osat: sanitizeDecimalInput(e.target.value),
                    }))
                  }
                  placeholder="OSAT (%)"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  disabled={uploading}
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Google (/5)</div>
                <input
                  className={`${inputClass} w-full`}
                  value={extraKpiDraft.google}
                  onChange={(e) =>
                    setExtraKpiDraft((prev) => ({
                      ...prev,
                      google: sanitizeDecimalInput(e.target.value),
                    }))
                  }
                  placeholder="Google (/5)"
                  inputMode="decimal"
                  min={0}
                  max={5}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {validationMessage && <div className="text-xs text-red-600">{validationMessage}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
            Retour
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm({ commentDraft: commentDraft.trim(), extraKpiDraft })}
            disabled={uploading || !canConfirm}
          >
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Import en cours...
              </span>
            ) : (
              "Valider l'import"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
