import type { FileErrorsState, FilesState, FileSpec } from "@/components/bk/uploader/types";

export const FILE_SPECS: FileSpec[] = [
  { id: "caparprofit", label: "SyntheseCA_caparprofit.csv", formKey: "caparprofit" },
  {
    id: "consommationparprofit",
    label: "SyntheseCA_consommationparprofit.csv",
    formKey: "consommationparprofit",
  },
  { id: "corrections", label: "SyntheseCA_corrections.csv", formKey: "corrections" },
  { id: "divers", label: "SyntheseCA_divers.csv", formKey: "divers" },
  { id: "reglement", label: "SyntheseCA_reglement.csv", formKey: "reglement" },
  { id: "remises", label: "SyntheseCA_remises.csv", formKey: "remises" },
  { id: "tva", label: "SyntheseCA_tva.csv", formKey: "tva" },
  { id: "vente_annexes", label: "SyntheseCA_venteAnnexes.csv", formKey: "vente_annexes" },
];

export function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTimeFr(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = parsed.toLocaleDateString("fr-FR");
  const time = parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

export function formatFrDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
}

export function diffDaysInclusive(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function previousIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return toIsoDate(date);
}

export function listDatesInclusive(startIso: string, endIso: string) {
  const out: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  while (cursor.getTime() <= end.getTime()) {
    out.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function emptyFiles(): FilesState {
  return {
    caparprofit: null,
    consommationparprofit: null,
    corrections: null,
    divers: null,
    reglement: null,
    remises: null,
    tva: null,
    vente_annexes: null,
  };
}

export function emptyFileErrors(): FileErrorsState {
  return {
    caparprofit: null,
    consommationparprofit: null,
    corrections: null,
    divers: null,
    reglement: null,
    remises: null,
    tva: null,
    vente_annexes: null,
  };
}

export function fileSizeLabel(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function normalizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_");
}

export function isExpectedFileName(selectedName: string, expectedName: string) {
  return normalizeFileName(selectedName) === normalizeFileName(expectedName);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}
