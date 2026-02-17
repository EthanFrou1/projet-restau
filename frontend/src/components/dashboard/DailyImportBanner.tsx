import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Restaurant = { id: number; code: string; name: string };

type DailyStatus = {
  loading: boolean;
  missing: Restaurant[];
  date: string | null;
  error: string | null;
  noRestaurants: boolean;
};

type Props = {
  visible: boolean;
  status: DailyStatus;
  onImportNow: () => void;
};

function formatFrDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
}

export function DailyImportBanner({ visible, status, onImportNow }: Props) {
  if (!visible) return null;
  if (!status.loading && !status.error && !status.noRestaurants && status.missing.length === 0) return null;
  const dateLabel = formatFrDate(status.date);

  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardContent className="p-4 mt-0 space-y-2">
        {status.loading ? (
          <div className="text-sm text-muted-foreground">Vérification de l'import du jour...</div>
        ) : status.error ? (
          <div className="text-sm text-destructive">{status.error}</div>
        ) : status.noRestaurants ? (
          <div className="text-sm text-muted-foreground">Aucun restaurant associé à ton compte.</div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              Import du jour manquant
              {status.date ? ` (${dateLabel})` : ""} pour :{" "}
              <span className="font-medium">{status.missing.map((r) => r.code).join(", ")}</span>
            </div>
            <Button variant="outline" onClick={onImportNow}>
              Importer maintenant
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
