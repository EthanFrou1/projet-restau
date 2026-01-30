import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import type { BKReport } from "@/components/bk/types";

type Restaurant = { id: number; code: string; name: string };
type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
};

type Props = {
  restaurants: Restaurant[];
  onUploaded: (report: BKReport) => void;
  canReplace?: boolean;
};

function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function BkReportUploader({ restaurants, onUploaded, canReplace = false }: Props) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [reportDate, setReportDate] = useState(() => toIsoDate(new Date()));
  const [restaurantCode, setRestaurantCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [reportsByCode, setReportsByCode] = useState<Record<string, ReportListItem>>({});
  const [replaceTarget, setReplaceTarget] = useState<{ code: string; reportId: number } | null>(null);
  const [replaceMode, setReplaceMode] = useState<{ code: string; reportId: number } | null>(null);

  const [fileCaparprofit, setFileCaparprofit] = useState<File | null>(null);
  const [fileConsommation, setFileConsommation] = useState<File | null>(null);
  const [fileCorrections, setFileCorrections] = useState<File | null>(null);
  const [fileDivers, setFileDivers] = useState<File | null>(null);
  const [fileReglement, setFileReglement] = useState<File | null>(null);
  const [fileRemises, setFileRemises] = useState<File | null>(null);
  const [fileTva, setFileTva] = useState<File | null>(null);
  const [fileVenteAnnexes, setFileVenteAnnexes] = useState<File | null>(null);

  const finalCode = restaurantCode.trim().toUpperCase();
  const selectedReport = finalCode ? reportsByCode[finalCode] : undefined;
  const allFilesSelected = !!(
    fileCaparprofit &&
    fileConsommation &&
    fileCorrections &&
    fileDivers &&
    fileReglement &&
    fileRemises &&
    fileTva &&
    fileVenteAnnexes
  );
  const canSubmit =
    !!reportDate &&
    !!finalCode &&
    allFilesSelected &&
    !uploading &&
    (!selectedReport || (replaceMode && replaceMode.code === finalCode));

  const missingRestaurants = useMemo(
    () => restaurants.filter((r) => !reportsByCode[r.code]),
    [restaurants, reportsByCode]
  );
  const doneRestaurants = useMemo(
    () => restaurants.filter((r) => reportsByCode[r.code]),
    [restaurants, reportsByCode]
  );

  function resetFiles() {
    setFileCaparprofit(null);
    setFileConsommation(null);
    setFileCorrections(null);
    setFileDivers(null);
    setFileReglement(null);
    setFileRemises(null);
    setFileTva(null);
    setFileVenteAnnexes(null);
  }

  function selectRestaurant(code: string) {
    setRestaurantCode(code);
    setUploadMsg(null);
    setReplaceMode(null);
    resetFiles();
  }

  async function loadStatus(dateValue: string) {
    if (!dateValue) return;
    if (dateValue > today) {
      setReportsByCode({});
      setStatusError("La date ne peut pas etre dans le futur.");
      return;
    }
    if (restaurants.length === 0) {
      setReportsByCode({});
      return;
    }
    setStatusLoading(true);
    setStatusError(null);
    try {
      const params = new URLSearchParams();
      params.set("start_date", dateValue);
      params.set("end_date", dateValue);
      const data = await apiFetch<ReportListItem[]>(`/reports/bk?${params.toString()}`);
      const map: Record<string, ReportListItem> = {};
      data.forEach((row) => {
        map[row.restaurant_code] = row;
      });
      setReportsByCode(map);
    } catch (e: any) {
      setStatusError(e?.message ?? "Erreur chargement statut import");
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    if (!reportDate) return;
    loadStatus(reportDate);
    setRestaurantCode("");
    setReplaceMode(null);
    setUploadMsg(null);
    resetFiles();
  }, [reportDate, restaurants]);

  async function handleUpload() {
    setUploadMsg(null);
    const finalCode = restaurantCode.trim().toUpperCase();
    if (!reportDate) {
      setUploadMsg("❌ Date manquante.");
      return;
    }
    if (reportDate > today) {
      setUploadMsg("❌ La date ne peut pas etre dans le futur.");
      return;
    }
    if (!finalCode) {
      setUploadMsg("❌ Code restaurant manquant.");
      return;
    }
    if (
      !fileCaparprofit ||
      !fileConsommation ||
      !fileCorrections ||
      !fileDivers ||
      !fileReglement ||
      !fileRemises ||
      !fileTva ||
      !fileVenteAnnexes
    ) {
      setUploadMsg("❌ Tous les CSV BK doivent être fournis.");
      return;
    }
    if (selectedReport && !(replaceMode && replaceMode.code === finalCode)) {
      setUploadMsg("❌ Import déjà fait. Utilise réimporter pour remplacer.");
      return;
    }

    setUploading(true);
    try {
      if (replaceMode && replaceMode.code === finalCode) {
        await apiFetch<{ status: string }>(`/reports/bk/${replaceMode.reportId}`, {
          method: "DELETE",
        });
      }

      const fd = new FormData();
      fd.append("report_date", reportDate);
      fd.append("restaurant_code", finalCode);
      fd.append("caparprofit", fileCaparprofit);
      fd.append("consommationparprofit", fileConsommation);
      fd.append("corrections", fileCorrections);
      fd.append("divers", fileDivers);
      fd.append("reglement", fileReglement);
      fd.append("remises", fileRemises);
      fd.append("tva", fileTva);
      fd.append("vente_annexes", fileVenteAnnexes);

      const res = await apiFetch<{ report_id: number }>("/reports/bk/upload", {
        method: "POST",
        body: fd,
      });

      const data = await apiFetch<BKReport>(`/reports/bk/${res.report_id}`);
      onUploaded(data);
      setUploadMsg(replaceMode ? "✅ Import remplacé." : "✅ Import terminé.");
      await loadStatus(reportDate);
      setReplaceMode(null);
      resetFiles();
    } catch (e: any) {
      setUploadMsg(`❌ ${e?.message ?? "Erreur import CSV"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Données quotidiennes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmDialog
          open={Boolean(replaceTarget)}
          title="Remplacer l'import existant ?"
          description={
            replaceTarget
              ? `Cette action supprimera les données déjà importées pour ${replaceTarget.code} (${reportDate}).`
              : undefined
          }
          confirmLabel="Supprimer et réimporter"
          onCancel={() => setReplaceTarget(null)}
          onConfirm={() => {
            if (!replaceTarget) return;
            setReplaceMode(replaceTarget);
            setRestaurantCode(replaceTarget.code);
            setReplaceTarget(null);
          }}
        />

        <div className="text-sm text-muted-foreground">
          Dépose tous les CSV BK du jour. Ils seront importés et contrôlés avant consolidation.
        </div>

        <div className="rounded-lg border bg-background p-4 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium">Choix du restaurant</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">Date du depot</div>
              <Input
                type="date"
                value={reportDate}
                max={today}
                className="w-[160px]"
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Statut des imports</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStatus(reportDate)}
                disabled={statusLoading}
              >
                {statusLoading ? "Chargement..." : "Rafraichir"}
              </Button>
            </div>
            {statusError && (
              <div className="text-sm text-destructive whitespace-pre-wrap">{statusError}</div>
            )}
            {restaurants.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun restaurant disponible.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Etat</TableHead>
                      <TableHead className="w-[160px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingRestaurants.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{r.code}</div>
                          <div className="text-xs text-muted-foreground">{r.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs">A importer</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => selectRestaurant(r.code)}>
                            Importer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {doneRestaurants.map((r) => {
                      const report = reportsByCode[r.code];
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{r.code}</div>
                            <div className="text-xs text-muted-foreground">{r.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">
                                Importe a {formatTime(report.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canReplace}
                              onClick={() => setReplaceTarget({ code: r.code, reportId: report.id })}
                            >
                              <span className="inline-flex items-center gap-1">
                                <RotateCcw className="h-4 w-4" />
                                Reimporter
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Choisis un restaurant a importer. Les imports deja faits sont bloques.
            </div>
          </div>
        </div>

        {finalCode ? (
          <div className="rounded-lg border bg-background p-4 space-y-3">
            <div className="text-sm font-medium">Importer les fichiers</div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Restaurant selectionne</div>
              <Input
                readOnly
                className="max-w-sm"
                value={`${finalCode} - ${restaurants.find((r) => r.code === finalCode)?.name ?? ""}`}
              />
            </div>
            {selectedReport && !(replaceMode && replaceMode.code === finalCode) && (
              <div className="text-xs text-amber-700">
                Import deja fait. Utilise Reimporter pour corriger les CSV.
              </div>
            )}
            {replaceMode && replaceMode.code === finalCode && (
              <div className="text-xs text-destructive">
                Mode remplacement actif. Les donnees existantes seront supprimees avant import.
              </div>
            )}

            <div className="text-xs text-muted-foreground">Fichiers CSV</div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_caparprofit.csv</div>
              <div className={fileCaparprofit ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileCaparprofit(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_consommationparprofit.csv</div>
              <div className={fileConsommation ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileConsommation(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_corrections.csv</div>
              <div className={fileCorrections ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileCorrections(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_divers.csv</div>
              <div className={fileDivers ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileDivers(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_reglement.csv</div>
              <div className={fileReglement ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileReglement(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_remises.csv</div>
              <div className={fileRemises ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileRemises(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_tva.csv</div>
              <div className={fileTva ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileTva(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_venteAnnexes.csv</div>
              <div className={fileVenteAnnexes ? "rounded-md bg-green-50 p-2" : ""}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!finalCode || (selectedReport && !(replaceMode && replaceMode.code === finalCode))}
                  onChange={(e) => setFileVenteAnnexes(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={!canSubmit}>
                {uploading ? "Import..." : "Importer les CSV"}
              </Button>
            </div>
            {uploadMsg && <div className="text-sm whitespace-pre-wrap">{uploadMsg}</div>}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Selectionne un restaurant a importer pour afficher le formulaire.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
