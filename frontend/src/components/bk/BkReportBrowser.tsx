import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BKReport } from "@/components/bk/types";
import type { ReimportRequest } from "@/components/bk/uploader/types";

type Restaurant = { id: number; code: string; name: string };
type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
  comment?: string | null;
  is_reimport?: boolean | null;
  imported_by?: {
    id: number;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type Props = {
  restaurants: Restaurant[];
  canReimport?: boolean;
  onReimportRequest?: (request: ReimportRequest) => void;
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

function formatDateFr(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
}

export function BkReportBrowser({
  restaurants,
  canReimport = false,
  onReimportRequest,
}: Props) {
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
  const [, setSelectedReport] = useState<BKReport | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

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
      const data = await apiFetch<ReportListItem[]>(`/reports/bk${query ? `?${query}` : ""}`);
      setItems(data);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? (e as { message?: unknown }).message : null;
      setErr(typeof msg === "string" && msg ? msg : "Erreur chargement rapports");
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
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? (e as { message?: unknown }).message : null;
      setErr(typeof msg === "string" && msg ? msg : "Erreur chargement rapport");
    } finally {
      setSelectedLoading(false);
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
        <CardTitle className="mb-2">Historiques des imports BK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Liste des imports réalisés, avec filtres par période et restaurant.
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
                <TableHead>Importé le</TableHead>
                <TableHead>Importé par</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    Aucun rapport pour cette période.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{formatDateFr(item.report_date)}</TableCell>
                    <TableCell className="font-mono text-xs">{item.restaurant_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(() => {
                        const user = item.imported_by;
                        if (!user) return "—";
                        const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
                        return full || user.email;
                      })()}
                    </TableCell>
                    <TableCell className="text-xs">{item.is_reimport ? "Réimport" : "Import"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {item.comment || "—"}
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
                        {canReimport && (
                          <Button
                            size="sm"
                            onClick={() =>
                              onReimportRequest?.({
                                reportId: item.id,
                                restaurantCode: item.restaurant_code,
                                reportDate: item.report_date,
                              })
                            }
                          >
                            Réimporter
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
        
      </CardContent>
    </Card>
  );
}
