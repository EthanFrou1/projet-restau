import type { DirectionEntity } from "@/components/direction/types";

export type MetricKey =
  | "ca"
  | "n1"
  | "pctN1"
  | "ecartPrev"
  | "clients"
  | "clientsN1"
  | "mp"
  | "mpN1"
  | "caDelivery"
  | "caClickCollect"
  | "heuresPersonnel"
  | "heuresTravail"
  | "tauxHoraire"
  | "osat"
  | "gxi"
  | "google";

export type MetricDef = {
  key: MetricKey;
  label: string;
  format: "money" | "int" | "pct";
};

export const METRICS: MetricDef[] = [
  { key: "ca", label: "CA", format: "money" },
  { key: "n1", label: "CA N-1", format: "money" },
  { key: "pctN1", label: "% N-1", format: "pct" },
  { key: "ecartPrev", label: "Écart vs prév", format: "money" },
  { key: "clients", label: "Clients", format: "int" },
  { key: "clientsN1", label: "Clients N-1", format: "int" },
  { key: "mp", label: "Panier moyen", format: "money" },
  { key: "mpN1", label: "Panier moyen N-1", format: "money" },
  { key: "caDelivery", label: "CA Delivery", format: "money" },
  { key: "caClickCollect", label: "CA Click & Collect", format: "money" },
  { key: "heuresPersonnel", label: "Heures personnel réalisées", format: "int" },
  { key: "heuresTravail", label: "Heures prévues", format: "int" },
  { key: "tauxHoraire", label: "Taux horaire (EUR)", format: "money" },
  { key: "osat", label: "OSAT (%)", format: "pct" },
  { key: "gxi", label: "GXI", format: "int" },
  { key: "google", label: "Google", format: "int" },
];

export function getMetricValue(entity: DirectionEntity, key: MetricKey): number | null {
  if (key === "ca") return entity.ca;
  if (key === "n1") return entity.n1;
  if (key === "pctN1") return entity.n1 === 0 ? null : (entity.ca - entity.n1) / entity.n1;
  if (key === "ecartPrev") return entity.ca - entity.prev;
  if (key === "clients") return entity.clients;
  if (key === "clientsN1") return entity.clientsN1;
  if (key === "mp") return entity.clients === 0 ? null : entity.ca / entity.clients;
  if (key === "mpN1") return entity.clientsN1 === 0 ? null : entity.n1 / entity.clientsN1;
  if (key === "caDelivery") return entity.caDelivery;
  if (key === "caClickCollect") return entity.caClickCollect;
  if (key === "heuresPersonnel") return entity.heuresPersonnel;
  if (key === "heuresTravail") return entity.heuresTravail;
  if (key === "tauxHoraire") return entity.tauxHoraire;
  if (key === "osat") return entity.osat === null ? null : entity.osat / 100;
  if (key === "gxi") return entity.gxi;
  if (key === "google") return entity.google;
  return null;
}

export function computeBestByMetric(entities: DirectionEntity[]): Record<MetricKey, number | null> {
  const best: Record<MetricKey, number | null> = {
    ca: null,
    n1: null,
    pctN1: null,
    ecartPrev: null,
    clients: null,
    clientsN1: null,
    mp: null,
    mpN1: null,
    caDelivery: null,
    caClickCollect: null,
    heuresPersonnel: null,
    heuresTravail: null,
    tauxHoraire: null,
    osat: null,
    gxi: null,
    google: null,
  };

  for (const metric of METRICS) {
    const values = entities
      .map((entity) => getMetricValue(entity, metric.key))
      .filter((value): value is number => value !== null);
    best[metric.key] = values.length === 0 ? null : Math.max(...values);
  }
  return best;
}
