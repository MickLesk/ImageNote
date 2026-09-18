const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago" / "vor 3 Minuten"; "just now" for anything under a minute. */
export function formatRelativeTime(date: Date, language: string, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const abs = Math.abs(seconds);
  for (const [unit, size] of UNITS) {
    if (abs >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}
