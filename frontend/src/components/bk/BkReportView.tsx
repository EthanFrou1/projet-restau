import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BKReport } from "@/components/bk/types";

type Props = {
  report: BKReport | null;
};

export function BkReportView({ report }: Props) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donnees importees</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aucun import pour l'instant.
        </CardContent>
      </Card>
    );
  }

  const isTotalRow = (label: string, flag?: boolean) =>
    !!flag || label.trim().toUpperCase().startsWith("TOTAL");

  const groups = [
    { total: "TOTAL CLICK & COLLECT", match: (label: string) => label.toUpperCase().startsWith("CLICK & COLLECT") },
    { total: "TOTAL COMPTOIR", match: (label: string) => label.toUpperCase().startsWith("COMPTOIR") },
    { total: "TOTAL DRIVE", match: (label: string) => label.toUpperCase().startsWith("DRIVE") },
    { total: "TOTAL HOME DELIVERY", match: (label: string) => label.toUpperCase().startsWith("HOME DELIVERY") },
    { total: "TOTAL KIOSK", match: (label: string) => label.toUpperCase().startsWith("KIOSK") },
  ];

  const baseRows = report.channel_sales.filter(
    (row) => !isTotalRow(row.channel_label, row.is_total)
  );
  const totalRows = report.channel_sales.filter((row) =>
    isTotalRow(row.channel_label, row.is_total)
  );
  const totalByLabel = new Map(
    totalRows.map((row) => [row.channel_label.trim().toUpperCase(), row])
  );

  const orderedRows: typeof report.channel_sales = [];
  const usedBase = new Set<number>();
  const usedTotals = new Set<string>();

  groups.forEach((group) => {
    baseRows.forEach((row, idx) => {
      if (usedBase.has(idx)) return;
      if (group.match(row.channel_label)) {
        orderedRows.push(row);
        usedBase.add(idx);
      }
    });

    const totalRow = totalByLabel.get(group.total);
    if (totalRow) {
      orderedRows.push(totalRow);
      usedTotals.add(group.total);
    }
  });

  baseRows.forEach((row, idx) => {
    if (!usedBase.has(idx)) {
      orderedRows.push(row);
    }
  });

  const totalOverall = totalByLabel.get("TOTAL");
  if (totalOverall) {
    orderedRows.push(totalOverall);
    usedTotals.add("TOTAL");
  }

  totalRows.forEach((row) => {
    const key = row.channel_label.trim().toUpperCase();
    if (!usedTotals.has(key) && key !== "TOTAL") {
      orderedRows.push(row);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donnees importees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Rapport BK {report.report_date} — {report.restaurant_code}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Canaux (CA par profit)</div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="w-[80px]">TAC</TableHead>
                  <TableHead>CA HT</TableHead>
                  <TableHead>CA TTC</TableHead>
                  <TableHead>PM Net</TableHead>
                  <TableHead>PM TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedRows.map((r, index) => {
                  const total = isTotalRow(r.channel_label, r.is_total);
                  return (
                    <TableRow
                      key={`${r.channel_label}-${index}`}
                      className={total ? "bg-muted/30 font-medium" : ""}
                    >
                      <TableCell className="font-mono text-xs">{r.channel_label}</TableCell>
                      <TableCell>{r.tac ?? "—"}</TableCell>
                      <TableCell>{r.ca_net ?? "—"}</TableCell>
                      <TableCell>{r.ca_ttc ?? "—"}</TableCell>
                      <TableCell>{r.pm_net ?? "—"}</TableCell>
                      <TableCell>{r.pm_ttc ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Mode de consommation</div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mode</TableHead>
                  <TableHead className="w-[80px]">TAC</TableHead>
                  <TableHead>CA HT</TableHead>
                  <TableHead>CA TTC</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.consumption_modes.map((r) => (
                  <TableRow key={r.mode}>
                    <TableCell>{r.mode}</TableCell>
                    <TableCell>{r.tac ?? "—"}</TableCell>
                    <TableCell>{r.ca_ht ?? "—"}</TableCell>
                    <TableCell>{r.ca_ttc ?? "—"}</TableCell>
                    <TableCell>{r.pct ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">TVA</div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libelle</TableHead>
                  <TableHead>HT</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tva_summary.map((r) => (
                  <TableRow key={r.tva_label}>
                    <TableCell>{r.tva_label}</TableCell>
                    <TableCell>{r.ht ?? "—"}</TableCell>
                    <TableCell>{r.tva ?? "—"}</TableCell>
                    <TableCell>{r.ttc ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Reglements</div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Theorique</TableHead>
                  <TableHead>Preleve</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Ecart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.payments.map((r, idx) => (
                  <TableRow key={`${r.payment_type}-${idx}`}>
                    <TableCell className="font-mono text-xs">{r.payment_type}</TableCell>
                    <TableCell>{r.theorique ?? "—"}</TableCell>
                    <TableCell>{r.preleve ?? "—"}</TableCell>
                    <TableCell>{r.compte ?? "—"}</TableCell>
                    <TableCell>{r.ecart ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Corrections & Remises</div>
          <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
            {JSON.stringify(
              {
                corrections: report.corrections,
                remises: report.remises,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Divers</div>
          <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
            {JSON.stringify(report.divers, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Ventes annexes</div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libelle</TableHead>
                  <TableHead>Nbr</TableHead>
                  <TableHead>HT</TableHead>
                  <TableHead>TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.annex_sales.map((r, idx) => (
                  <TableRow key={`${r.libelle}-${idx}`}>
                    <TableCell className="font-mono text-xs">{r.libelle}</TableCell>
                    <TableCell>{r.nbr ?? "—"}</TableCell>
                    <TableCell>{r.montant_ht ?? "—"}</TableCell>
                    <TableCell>{r.montant_ttc ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
