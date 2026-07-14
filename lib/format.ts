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
