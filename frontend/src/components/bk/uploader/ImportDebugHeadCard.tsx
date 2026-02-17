import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeFr, formatFrDate } from "@/components/bk/uploader/utils";
import { BkReportView } from "@/components/bk/BkReportView";
import type { BKReport } from "@/components/bk/types";

type DebugImportRow = {
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
  restaurants: Array<{ id: number; code: string; name: string }>;
  rows: DebugImportRow[];
  loading: boolean;
  error: string | null;
  startDate: string;
  endDate: string;
  restaurantCode: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRestaurantCodeChange: (value: string) => void;
  onView: (reportId: number) => void;
  selectedReport: BKReport | null;
  selectedId: number | null;
  selectedLoading: boolean;
};

export function ImportDebugHeadCard({
  restaurants,
  rows,
  loading,
  error,
  startDate,
  endDate,
  restaurantCode,
  onStartDateChange,
  onEndDateChange,
  onRestaurantCodeChange,
  onView,
  selectedReport,
  selectedId,
  selectedLoading,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="mb-2 text-base">Détails des imports (DEV/ADMIN)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Visualise rapidement les derniers imports, puis ouvre le détail complet d'un import.
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Du</div>
            <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Au</div>
            <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Restaurant</div>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={restaurantCode}
              onChange={(e) => onRestaurantCodeChange(e.target.value)}
            >
              <option value="">Tous</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {loading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rapport</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Importé le</TableHead>
                <TableHead>Importé par</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    Aucun import récent.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{formatFrDate(row.report_date)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.restaurant_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTimeFr(row.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(() => {
                        const user = row.imported_by;
                        if (!user) return "—";
                        const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
                        return full || user.email;
                      })()}
                    </TableCell>
                    <TableCell className="text-xs">{row.is_reimport ? "Réimport" : "Import"}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={row.comment || ""}>
                      {row.comment || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onView(row.id)}>
                        {selectedId === row.id && selectedLoading ? "Chargement..." : "Voir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {selectedReport && (
          <div className="pt-2">
            <BkReportView report={selectedReport} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
