export function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function fmtDecimal(n: number, digits = 1): string {
  return n.toFixed(digits);
}

export function fmtTimestamp(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
