"use client";

import { useCurrency } from "@/lib/currency";

/**
 * Displays a price value in the currently selected currency.
 * Pass the raw USD value — the component handles conversion and formatting.
 */
export function Price({
  usd,
  className = "",
}: {
  usd: number;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(usd)}</span>;
}
