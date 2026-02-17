import type { DirectionEntity } from "@/components/direction/types";
import { METRICS, getMetricValue } from "@/components/direction/metrics";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function exportDirectionPdf(params: {
  year: string;
  modeLabel: string;
  zoneRows: DirectionEntity[];
  restaurantRows: DirectionEntity[];
  moneyFmt: Intl.NumberFormat;
  intFmt: Intl.NumberFormat;
  pctFmt: Intl.NumberFormat;
}) {
  const { year, modeLabel, zoneRows, restaurantRows, moneyFmt, intFmt, pctFmt } = params;

  const fmt = (format: "money" | "int" | "pct", value: number | null) => {
    if (value === null) return "—";
    if (format === "money") return moneyFmt.format(value);
    if (format === "int") return intFmt.format(value);
    return pctFmt.format(value);
  };

  const headers = METRICS.map((metric) => `<th>${escapeHtml(metric.label)}</th>`).join("");
  const renderRows = (rows: DirectionEntity[]) =>
    rows
      .map((entity) => {
        const cells = METRICS.map((metric) => {
          const value = getMetricValue(entity, metric.key);
          return `<td>${escapeHtml(fmt(metric.format, value))}</td>`;
        }).join("");
        return `<tr><td class="entity">${escapeHtml(entity.label)}</td>${cells}</tr>`;
      })
      .join("");

  const zoneSection =
    zoneRows.length > 0
      ? `
      <h2>Données globales par zone</h2>
      <table>
        <thead><tr><th>Zone</th>${headers}</tr></thead>
        <tbody>${renderRows(zoneRows)}</tbody>
      </table>
    `
      : "";

  const restaurantSection =
    restaurantRows.length > 0
      ? `
      <h2>Données par restaurant</h2>
      <table>
        <thead><tr><th>Restaurant</th>${headers}</tr></thead>
        <tbody>${renderRows(restaurantRows)}</tbody>
      </table>
    `
      : "";

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Revue Direction ${escapeHtml(year)}</title>
    <style>
      @page { size: landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; color: #111827; }
      h1 { margin: 0 0 4px 0; font-size: 22px; }
      h2 { margin: 18px 0 8px 0; font-size: 16px; }
      .meta { margin-bottom: 12px; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; }
      th:first-child, td:first-child { text-align: left; }
      th { background: #f3f4f6; }
      .entity { font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Revue Direction ${escapeHtml(year)}</h1>
    <div class="meta">Périmètre: ${escapeHtml(modeLabel)} • Généré le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</div>
    ${zoneSection}
    ${restaurantSection}
  </body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const tryPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.onload = tryPrint;
  setTimeout(tryPrint, 250);
}
