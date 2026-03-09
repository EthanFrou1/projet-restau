export function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function previousIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return toIsoDate(date);
}

export function getIsoWeekNumber(value: Date): number {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

export function getIsoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return start;
}

export function isoWeeksInYear(year: number): number {
  return getIsoWeekNumber(new Date(Date.UTC(year, 11, 28)));
}

export function formatIsoDayMonth(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatIsoDayMonthYear(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("fr-FR");
}

export function normalizeComment(value?: string | null): string | null {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function mergeComment(base?: string | null, incoming?: string | null): string | null {
  const next = normalizeComment(incoming);
  if (!next) return normalizeComment(base);
  const current = normalizeComment(base);
  if (!current) return next;
  if (current === next) return current;
  const parts = current.split(" | ").map((entry) => entry.trim()).filter(Boolean);
  if (parts.includes(next)) return current;
  return `${current} | ${next}`;
}
