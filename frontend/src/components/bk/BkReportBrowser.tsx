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
import type { BKReport } from "@/components/bk/types";
import { BkReportView } from "@/components/bk/BkReportView";

type Restaurant = { id: number; code: string; name: string };
type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
};

type Props = {
  restaurants: Restaurant[];
  canDelete?: boolean;
};

function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

export function BkReportBrowser({ restaurants, canDelete = false }: Props) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toIsoDate(d);
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [restaurantCode, setRestaurantCode] = useState("");
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<BKReport | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const canSelectRestaurant = restaurants.length > 1;
  const fixedRestaurantCode = restaurants.length === 1 ? restaurants[0].code : "";
  const finalRestaurantCode = (restaurantCode || fixedRestaurantCode).trim().toUpperCase();

  async function loadReports() {
    setLoading(true);
    setErr(null);
    setSelectedId(null);
    setSelectedReport(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (finalRestaurantCode) params.set("restaurant_code", finalRestaurantCode);

      const query = params.toString();
      const data = await apiFetch<ReportListItem[]>(
        `/reports/bk${query ? `?${query}` : ""}`
      );
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur chargement rapports");
    } finally {
      setLoading(false);
    }
  }

  async function loadReportDetails(reportId: number) {
    setSelectedLoading(true);
    setSelectedId(reportId);
    setSelectedReport(null);
    try {
      const data = await apiFetch<BKReport>(`/reports/bk/${reportId}`);
      setSelectedReport(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur chargement rapport");
    } finally {
      setSelectedLoading(false);
    }
  }

  async function handleDelete(reportId: number) {
    setConfirmDeleteId(reportId);
  }

  async function confirmDelete() {
    if (confirmDeleteId === null) return;
    const reportId = confirmDeleteId;
    setDeletingId(reportId);
    setErr(null);
    try {
      await apiFetch<{ status: string }>(`/reports/bk/${reportId}`, {
        method: "DELETE",
      });
      if (selectedId === reportId) {
        setSelectedId(null);
        setSelectedReport(null);
      }
      await loadReports();
    } catch (e: any) {
      setErr(e?.message ?? "Erreur suppression rapport");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  useEffect(() => {
    if (fixedRestaurantCode && !restaurantCode) {
      setRestaurantCode(fixedRestaurantCode);
    }
  }, [fixedRestaurantCode, restaurantCode]);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, finalRestaurantCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donnees globales BK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmDialog
          open={confirmDeleteId !== null}
          title="Supprimer cet import ?"
          description={
            confirmDeleteId !== null
              ? `Confirmer la suppression de l'import #${confirmDeleteId}. Cette action est irreversible.`
              : undefined
          }
          confirmLabel="Supprimer"
          busy={confirmDeleteId !== null && deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={confirmDelete}
        />
        <div className="text-sm text-muted-foreground">
          Vue par jour des imports BK, avec filtre par semaine ou restaurant.
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Du</div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Au</div>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Restaurant</div>
            {canSelectRestaurant ? (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={restaurantCode}
                onChange={(e) => setRestaurantCode(e.target.value)}
              >
                <option value="">Tous</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input value={fixedRestaurantCode || restaurantCode} readOnly />
            )}
          </div>
          <div className="flex items-end">
            {loading && <div className="text-xs text-muted-foreground">Chargement...</div>}
          </div>
        </div>

        {err && <div className="text-sm text-destructive whitespace-pre-wrap">{err}</div>}

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Importe le</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    Aucun rapport pour cette periode.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.report_date}</TableCell>
                      <TableCell className="font-mono text-xs">{item.restaurant_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(item.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={selectedId === item.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => loadReportDetails(item.id)}
                          >
                            {selectedId === item.id && selectedLoading ? "Chargement..." : "Voir"}
                          </Button>
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              {deletingId === item.id ? "Suppression..." : "Supprimer"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="pt-2">
          {selectedReport ? (
            <BkReportView report={selectedReport} />
          ) : selectedId ? (
            <div className="text-sm text-muted-foreground">
              Chargement du rapport...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Selectionne une ligne pour afficher les donnees du jour.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
