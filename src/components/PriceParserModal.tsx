"use client";

import { useState } from "react";
import { syncSupplyStats, type SupplyStatInput } from "@/app/buy-and-hold/actions";
import { useRouter } from "next/navigation";

const CONDITION_MAP: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
  "FN": "FN",
  "MW": "MW",
  "FT": "FT",
  "WW": "WW",
  "BS": "BS"
};

interface PriceParserModalProps {
  skinItem: any; // { id, weapon, name, ... }
  latestVariants: any[]; // The latest supply stats for this skin
  onClose: () => void;
}

export default function PriceParserModal({ skinItem, latestVariants, onClose }: PriceParserModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ parsed: SupplyStatInput[], errors: string[] } | null>(null);
  const [saveResult, setSaveResult] = useState<{ saved: number; errors: string[] } | null>(null);
  const router = useRouter();

  const handleParse = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const parsedVariants: SupplyStatInput[] = [];
    const errors: string[] = [];

    lines.forEach(line => {
      // Szukamy kondycji
      let foundCond = null;
      for (const [key, val] of Object.entries(CONDITION_MAP)) {
        if (line.toLowerCase().includes(key.toLowerCase())) {
          foundCond = val;
          break;
        }
      }

      // Szukamy ceny (np. $241.08, 241,08, $210)
      const priceMatch = line.match(/\$?\s*([0-9]+[.,][0-9]{2})/);
      let price = null;
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));
      }

      // StatTrak
      const isStattrak = line.toLowerCase().includes("stattrak");

      if (foundCond && price !== null) {
        // Klonujemy najświeższy snapshot z głównego widoku
        const baseVariant = latestVariants.find(v => v.condition === foundCond && !!v.stattrak === isStattrak);
        
        parsedVariants.push({
          weapon: skinItem.weapon,
          name: skinItem.name,
          condition: foundCond,
          stattrak: isStattrak,
          price: price,
          // Jeśli mamy bazowy wariant to klonujemy jego statystyki podaży (żeby nie psuć wykresów % Hoarder)
          csfloat_total_registered_wear: baseVariant?.csfloat_total_registered_wear,
          empire_active_circulation_wear: baseVariant?.empire_active_circulation_wear,
          empire_total_listings: baseVariant?.empire_total_listings,
          empire_listings_wear: baseVariant?.empire_listings_wear,
          empire_liquidity_percent_wear: baseVariant?.empire_liquidity_percent_wear,
          empire_trades_30d: baseVariant?.empire_trades_30d,
          empire_steam_sales_30d: baseVariant?.empire_steam_sales_30d,
          recordedAt: undefined // wymusza zrobienie świeżego snapshota na TERAZ
        });
      }
    });

    if (parsedVariants.length === 0 && text.trim().length > 0) {
      errors.push("Nie znaleziono żadnych dopasowań (Kondycja + Cena w formacie $X.XX).");
    }

    setResult({ parsed: parsedVariants, errors });
  };

  const handleSave = async () => {
    if (!result || result.parsed.length === 0) return;
    setLoading(true);
    const r = await syncSupplyStats(result.parsed);
    setSaveResult(r);
    setLoading(false);
    if (r.saved > 0) setTimeout(() => { router.refresh(); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">💰</span> Aktualizacja Cen z Tekstu
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
              {skinItem.weapon} | {skinItem.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-4 space-y-4">
          <p className="text-xs text-gray-400">
            Skopiuj listę cen (np. ze strony pricempire / csgostash / steam) i po prostu ją wklej. 
            Aplikacja znajdzie odpowiednie słowa (np. "Factory New") i cenę ze znakiem dolara. Skopiuje stare dane o podaży i zapisze wszystko jako nowy, kompletny snapshot na teraz.
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleParse}
            rows={8}
            placeholder="StatTrak™ Factory New  $241.08 >&#10;StatTrak™ Minimal Wear  $128.50 >"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none shadow-inner"
          />

          <button onClick={handleParse} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2 rounded-xl transition-colors text-sm border border-gray-700">
            Testuj Parsowanie
          </button>

          {result && (
            <div className={`p-4 rounded-xl border ${result.parsed.length > 0 ? "border-emerald-900 bg-emerald-900/10" : "border-red-900 bg-red-900/10"}`}>
              <h3 className="text-sm font-bold text-white mb-2">Znaleziono warianty ({result.parsed.length}):</h3>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-400 mb-1">{e}</p>)}
              
              <ul className="space-y-1 mt-2">
                {result.parsed.map((p, i) => (
                  <li key={i} className="text-xs flex justify-between border-b border-gray-800/50 pb-1">
                     <span className={`font-semibold ${p.stattrak ? 'text-orange-400' : 'text-gray-300'}`}>
                       {p.condition} {p.stattrak && 'ST™'}
                     </span>
                     <span className="text-emerald-400 font-mono">${p.price?.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              {result.parsed.length > 0 && (
                <button onClick={handleSave} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50">
                  {loading ? "Zapisywanie Snapshotów..." : "Zatwierdź i Rozpocznij Sync"}
                </button>
              )}
            </div>
          )}

          {saveResult && (
            <div className={`rounded-lg px-4 py-3 text-sm mt-4 ${saveResult.errors.length > 0 ? "bg-red-900/30 border border-red-700 text-red-300" : "bg-green-900/30 border border-green-700 text-green-300"}`}>
              {saveResult.saved > 0 && <p>✓ Zapisano {saveResult.saved} snapshot(ów) z aktualną ceną!</p>}
              {saveResult.errors.map((e, i) => <p key={i}>✗ {e}</p>)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
