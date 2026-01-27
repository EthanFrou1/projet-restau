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
                {report.channel_sales.map((r) => (
                  <TableRow key={r.channel_label}>
                    <TableCell className="font-mono text-xs">{r.channel_label}</TableCell>
                    <TableCell>{r.tac ?? "—"}</TableCell>
                    <TableCell>{r.ca_net ?? "—"}</TableCell>
                    <TableCell>{r.ca_ttc ?? "—"}</TableCell>
                    <TableCell>{r.pm_net ?? "—"}</TableCell>
                    <TableCell>{r.pm_ttc ?? "—"}</TableCell>
                  </TableRow>
                ))}
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
