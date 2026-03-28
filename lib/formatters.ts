const numberFmt = new Intl.NumberFormat("en-US");
const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export function formatCurrency(n: number): string {
  return currencyFmt.format(n);
}

export function formatTrend(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
