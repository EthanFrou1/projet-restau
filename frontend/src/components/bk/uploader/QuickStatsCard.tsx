import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type Props = {
  assignedCount: number;
  doneCount: number;
  pendingCount: number;
  yearlyMissing: number;
  yearlyMissingLoading: boolean;
};

export function QuickStatsCard({
  assignedCount,
  doneCount,
  pendingCount,
  yearlyMissing,
  yearlyMissingLoading,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="mb-2 text-base">Données rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Restaurants assignés</div>
              <div className="text-3xl font-semibold md:text-4xl">{assignedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Imports faits aujourd'hui</div>
              <div className="text-3xl font-semibold text-emerald-700 md:text-4xl">{doneCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Imports à faire aujourd'hui</div>
              <div className="text-3xl font-semibold text-amber-700 md:text-4xl">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Imports manquants année (cumul)</div>
              <div className="text-3xl font-semibold text-red-600 md:text-4xl">
                {yearlyMissingLoading ? "..." : yearlyMissing}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
