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
  const containerClass =
    "border-[#7f2f14]/25 bg-gradient-to-r from-[#fff4de] via-[#fff0d5] to-[#f8e1bf] shadow-[0_10px_24px_-18px_rgba(127,47,20,0.65)]";
  const loadingClass = "text-sm font-medium text-[#7f2f14]";
  const emptyClass = "text-sm text-[#7f2f14]/80";

  return (
    <Card className={containerClass}>
      <CardContent className="mt-0 space-y-2 p-4">
        {status.loading ? (
          <div className={loadingClass}>Vérification des imports à faire aujourd'hui à partir des données de la veille...</div>
        ) : status.error ? (
          <div className="text-sm text-destructive">{status.error}</div>
        ) : status.noRestaurants ? (
          <div className={emptyClass}>Aucun restaurant associé à ton compte.</div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-[#5b2413]">
              <span className="mr-2 inline-flex rounded-full bg-[#d4521b] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fff8ef]">
                Action du jour
              </span>
              <span className="align-middle">
                Import à faire aujourd'hui
              {status.date ? ` (${dateLabel})` : ""} pour :{" "}
              <span className="font-semibold text-[#7f2f14]">{status.missing.map((r) => r.code).join(", ")}</span>
              </span>
            </div>
            <Button
              onClick={onImportNow}
              className="border border-[#8c3414] bg-[#c64619] text-[#fff8ef] shadow-sm hover:bg-[#a83814]"
            >
              Importer maintenant
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
