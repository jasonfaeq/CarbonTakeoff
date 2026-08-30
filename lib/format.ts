const en = (digits: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** kg CO2e shown as tonnes. A screening figure does not deserve more than one decimal. */
export function tonnes(kg: number): string {
  return en(1).format(kg / 1000);
}

export function percent(value: number, digits = 1): string {
  return `${en(digits).format(value)}%`;
}

export function quantity(value: number | null | undefined): string {
  if (value == null) return "–";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(value);
}

export function factorValue(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumSignificantDigits: 4 }).format(value);
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} day${s < 2 * 86400 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
