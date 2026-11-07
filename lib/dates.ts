import type { Weekday } from "./model";

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function shiftDate(key: string, offset: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function weekdayOf(key: string): Weekday {
  return ((parseDateKey(key).getDay() + 6) % 7) as Weekday;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function prettyDate(key: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", options ?? { weekday: "long", day: "numeric", month: "long" }).format(parseDateKey(key));
}

export function isFuture(key: string, now: string): boolean {
  return key > now;
}

export function buildHeatmapDates(weeks: number, reference: string): string[][] {
  const monday = shiftDate(reference, -weekdayOf(reference));
  const start = shiftDate(monday, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => shiftDate(start, weekIndex * 7 + dayIndex))
  );
}
