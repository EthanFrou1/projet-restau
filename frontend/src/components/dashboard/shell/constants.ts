import type { TabValue } from "@/components/dashboard/shell/types";

export const TAB_TO_PATH: Record<TabValue, string> = {
  overview: "/dashboard",
  data: "/mes-imports",
  "bk-global": "/historiques-imports",
  "bk-monthly": "/tableau-de-donnees",
  "bk-compare": "/comparaison",
  executive: "/donnees-globales",
  dev: "/administration",
};

export function pathToTab(pathname: string): TabValue {
  if (pathname === "/mes-imports") return "data";
  if (pathname === "/historiques-imports") return "bk-global";
  if (pathname === "/bk-mensuel" || pathname === "/tableau-de-donnees") return "bk-monthly";
  if (pathname === "/comparaison") return "bk-compare";
  if (pathname === "/revue-direction" || pathname === "/donnees-globales") return "executive";
  if (pathname === "/dev" || pathname === "/administration") return "dev";
  return "overview";
}

export const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const compactMoneyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
export const intFmt = new Intl.NumberFormat("fr-FR");
export const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
