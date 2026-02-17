import { useMemo } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
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
import type { OverdueRow } from "@/components/bk/uploader/types";
import { formatFrDate } from "@/components/bk/uploader/utils";

type Props = {
  rows: OverdueRow[];
  loading: boolean;
  newestFirst: boolean;
  onNewestFirstChange: (value: boolean) => void;
  onImport: (restaurantCode: string, dateValue: string) => void;
};

export function OverdueImportsCard({
  rows,
  loading,
  newestFirst,
  onNewestFirstChange,
  onImport,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, OverdueRow[]>();
    rows.forEach((row) => {
      const list = map.get(row.restaurant.code) ?? [];
      list.push(row);
      map.set(row.restaurant.code, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="mb-2">Imports en retard</CardTitle>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={newestFirst}
              onChange={(e) => onNewestFirstChange(e.target.checked)}
            />
            Dates récentes en premier
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        {!loading && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucun import en retard.</div>
        )}
        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {grouped.map(([code, restaurantRows]) => {
              const name = restaurantRows[0]?.restaurant.name ?? code;
              return (
                <details key={code} className="group rounded-md border bg-background">
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                        <div>
                          <div className="font-medium">{code}</div>
                          <div className="text-xs text-muted-foreground">{name}</div>
                        </div>
                      </div>
                      <div className="text-xs text-red-600">{restaurantRows.length} import(s) en retard</div>
                    </div>
                  </summary>
                  <div className="max-h-[340px] overflow-auto border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="w-[160px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restaurantRows.map((row) => (
                          <TableRow key={`${row.date}-${row.restaurant.code}`}>
                            <TableCell className="font-mono text-xs">{formatFrDate(row.date)}</TableCell>
                            <TableCell>
                              <div className="inline-flex items-center gap-2 text-red-600">
                                <Clock3 className="h-4 w-4" />
                                <span className="text-xs">Manquant</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.restaurant.can_import ? (
                                <Button size="sm" onClick={() => onImport(row.restaurant.code, row.date)}>
                                  Importer
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Lecture seule</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
