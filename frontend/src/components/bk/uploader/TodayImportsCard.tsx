import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TodayRow } from "@/components/bk/uploader/types";
import { formatTime } from "@/components/bk/uploader/utils";

type Props = {
  rows: TodayRow[];
  canReplace: boolean;
  statusLoading: boolean;
  statusError: string | null;
  onImport: (restaurantCode: string) => void;
  onReimport: (restaurantCode: string, reportId: number | null) => void;
};

export function TodayImportsCard({
  rows,
  canReplace,
  statusLoading,
  statusError,
  onImport,
  onReimport,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="mb-2">Imports à faire aujourd'hui</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusError && <div className="text-sm text-destructive">{statusError}</div>}
        {statusLoading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun restaurant assigné.</div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[190px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.restaurant.id}>
                    <TableCell>
                      <div className="font-medium">{row.restaurant.code}</div>
                      <div className="text-xs text-muted-foreground">{row.restaurant.name}</div>
                    </TableCell>
                    <TableCell>
                      {row.isDone ? (
                        <div className="inline-flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Importé à {formatTime(row.report!.created_at)}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">À importer</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!row.isDone && (
                        <Button size="sm" onClick={() => onImport(row.restaurant.code)}>
                          Importer
                        </Button>
                      )}
                      {row.isDone && canReplace && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReimport(row.restaurant.code, row.report?.id ?? null)}
                        >
                          Réimporter
                        </Button>
                      )}
                      {row.isDone && !canReplace && (
                        <span className="text-xs text-muted-foreground">Déjà importé</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
