"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Currency = "USD" | "PLN";

type CurrencyCtx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number; // USD → PLN
  rateLoaded: boolean;
  format: (usd: number) => string;
  convert: (usd: number) => number;
};

const CurrencyContext = createContext<CurrencyCtx>({
  currency: "USD",
  setCurrency: () => {},
  rate: 4.0,
  rateLoaded: false,
  format: (v) => `$${v.toFixed(2)}`,
  convert: (v) => v,
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rate, setRate] = useState(4.0); // fallback
  const [rateLoaded, setRateLoaded] = useState(false);

  // Fetch live exchange rate on mount (refreshes every 30 min)
  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      try {
        // Free API — no key required
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (!cancelled && data?.rates?.PLN) {
          setRate(data.rates.PLN);
          setRateLoaded(true);
        }
      } catch {
        // fallback stays at 4.0
        setRateLoaded(true);
      }
    }

    fetchRate();
    const interval = setInterval(fetchRate, 30 * 60 * 1000); // refresh every 30 min

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const convert = (usd: number) => (currency === "PLN" ? usd * rate : usd);
  const format = (usd: number) => {
    const val = convert(usd);
    return currency === "PLN" ? `${val.toFixed(2)} zł` : `$${val.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rate, rateLoaded, format, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** Small toggle button for embedding in any header / nav */
export function CurrencyToggle() {
  const { currency, setCurrency, rate, rateLoaded } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
        {(["USD", "PLN"] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 font-semibold transition-colors ${
              currency === c
                ? "bg-orange-600 text-white"
                : "bg-gray-900 text-gray-400 hover:text-white"
            }`}
          >
            {c === "USD" ? "$ USD" : "zł PLN"}
          </button>
        ))}
      </div>
      {rateLoaded && currency === "PLN" && (
        <span className="text-[10px] text-gray-500 font-mono">1$ = {rate.toFixed(2)} zł</span>
      )}
    </div>
  );
}
