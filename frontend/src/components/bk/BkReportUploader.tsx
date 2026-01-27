import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BKReport } from "@/components/bk/types";

type Restaurant = { id: number; code: string; name: string };

type Props = {
  restaurants: Restaurant[];
  onUploaded: (report: BKReport) => void;
};

export function BkReportUploader({ restaurants, onUploaded }: Props) {
  const [reportDate, setReportDate] = useState("");
  const [restaurantCode, setRestaurantCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [fileCaparprofit, setFileCaparprofit] = useState<File | null>(null);
  const [fileConsommation, setFileConsommation] = useState<File | null>(null);
  const [fileCorrections, setFileCorrections] = useState<File | null>(null);
  const [fileDivers, setFileDivers] = useState<File | null>(null);
  const [fileReglement, setFileReglement] = useState<File | null>(null);
  const [fileRemises, setFileRemises] = useState<File | null>(null);
  const [fileTva, setFileTva] = useState<File | null>(null);
  const [fileVenteAnnexes, setFileVenteAnnexes] = useState<File | null>(null);

  const canSelectRestaurant = restaurants.length > 1;
  const fixedRestaurantCode = restaurants.length === 1 ? restaurants[0].code : "";

  useEffect(() => {
    if (fixedRestaurantCode && !restaurantCode) {
      setRestaurantCode(fixedRestaurantCode);
    }
  }, [fixedRestaurantCode, restaurantCode]);

  async function handleUpload() {
    setUploadMsg(null);
    const finalCode = (restaurantCode || fixedRestaurantCode).trim().toUpperCase();
    if (!reportDate) {
      setUploadMsg("❌ Date manquante.");
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

    setUploading(true);
    try {
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
      setUploadMsg("✅ Import terminé.");
    } catch (e: any) {
      setUploadMsg(`❌ ${e?.message ?? "Erreur import CSV"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donnees quotidiennes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Depose tous les CSV BK du jour. Ils seront importes et controles avant consolidation.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Fichiers CSV</div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_caparprofit.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileCaparprofit(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileCaparprofit?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_consommationparprofit.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileConsommation(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileConsommation?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_corrections.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileCorrections(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileCorrections?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_divers.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileDivers(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileDivers?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_reglement.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileReglement(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileReglement?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_remises.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileRemises(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileRemises?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_tva.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileTva(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileTva?.name ?? "Aucun fichier"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">SyntheseCA_venteAnnexes.csv</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFileVenteAnnexes(e.target.files?.[0] ?? null)} />
              <div className="text-xs text-muted-foreground">{fileVenteAnnexes?.name ?? "Aucun fichier"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Date du depot</div>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />

            <div className="text-xs text-muted-foreground">Code restaurant</div>
            {canSelectRestaurant ? (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={restaurantCode}
                onChange={(e) => setRestaurantCode(e.target.value)}
              >
                <option value="">Selectionner...</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input value={fixedRestaurantCode || restaurantCode} readOnly />
            )}

            <div className="text-xs text-muted-foreground">
              Un ensemble de fichiers = un jour de donnees.
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Import..." : "Importer les CSV"}
          </Button>
        </div>
        {uploadMsg && <div className="text-sm whitespace-pre-wrap">{uploadMsg}</div>}
      </CardContent>
    </Card>
  );
}
