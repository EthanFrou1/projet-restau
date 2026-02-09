import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/components/bk/uploader/types";

type Props = {
  restaurants: Restaurant[];
  doneCount: number;
  pendingCount: number;
  yearlyMissing: number;
  yearlyMissingLoading: boolean;
};

export function QuickStatsCard({
  restaurants,
  doneCount,
  pendingCount,
  yearlyMissing,
  yearlyMissingLoading,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Données rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Restaurants assignés</div>
              <div className="text-3xl font-semibold md:text-4xl">{restaurants.length}</div>
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
              <div className="text-xs text-muted-foreground">À faire aujourd'hui</div>
              <div className="text-3xl font-semibold text-amber-700 md:text-4xl">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Manquants année (cumul)</div>
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
