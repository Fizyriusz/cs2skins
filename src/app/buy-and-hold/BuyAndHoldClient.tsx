"use client";

import { useState, useEffect } from "react";
import { getRarityAnalysis, getUndervaluationMatrix, getSupplyStats } from "./actions";

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"];

// ─── Smart Signals ──────────────────────────────────────────────────────────
function computeSignals(supply: any) {
  const signals: { icon: string; label: string; color: string }[] = [];
  if (!supply) return signals;

  const { marketSupplyWear, steamSales30d, marketLiquidity, globalSupplyWear, marketSupplyTotal } = supply;

  // 🔥 Market Dry-Up: selling faster than listed
  if (steamSales30d && marketSupplyWear && steamSales30d > marketSupplyWear) {
    signals.push({ icon: "🔥", label: "Market Dry-Up", color: "text-orange-400" });
  }
  // 👻 Fake Scarcity: few on market but huge global supply
  if (marketSupplyWear && globalSupplyWear && marketSupplyWear < 100 && globalSupplyWear > 10000) {
    signals.push({ icon: "👻", label: "Fake Scarcity", color: "text-yellow-400" });
  }
  // 💧 Low Liquidity warning
  if (marketLiquidity !== undefined && marketLiquidity !== null && marketLiquidity < 20) {
    signals.push({ icon: "💧", label: "Niska Płynność", color: "text-blue-400" });
  }

  return signals;
}

// ─── Liquidity Bar ───────────────────────────────────────────────────────────
function LiquidityBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-600 text-xs">–</span>;
  const color = value >= 50 ? "bg-emerald-500" : value >= 20 ? "bg-yellow-500" : "bg-red-500";
  const textColor = value >= 50 ? "text-emerald-400" : value >= 20 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold ${textColor}`}>{value.toFixed(0)}%</span>
    </div>
  );
}

// ─── Ratio Badge ─────────────────────────────────────────────────────────────
function RatioBadge({ market, global }: { market?: number; global?: number }) {
  if (!market || !global) return <span className="text-gray-600 text-xs">–</span>;
  const ratio = (market / global) * 100;
  const color = ratio < 2 ? "text-red-400 bg-red-900/20 border-red-900/40"
    : ratio < 10 ? "text-yellow-400 bg-yellow-900/20 border-yellow-900/40"
    : "text-gray-400 bg-gray-800 border-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {ratio.toFixed(1)}%
    </span>
  );
}

export default function BuyAndHoldClient({ defaultWeapons }: { defaultWeapons: string[] }) {
  const [weapon, setWeapon] = useState(defaultWeapons[0] || "P2000");
  const [category, setCategory] = useState("Sticker");
  const [condition, setCondition] = useState("FT");

  const [rarityData, setRarityData] = useState<any[]>([]);
  const [underValData, setUnderValData] = useState<any[]>([]);
  const [supplyData, setSupplyData] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getRarityAnalysis(weapon, condition),
      getUndervaluationMatrix(category, condition),
      getSupplyStats(weapon, condition),
    ]).then(([rarity, underval, supply]) => {
      if (!active) return;
      setRarityData(rarity);
      setUnderValData(underval);
      // Map by skinId
      const supplyMap = new Map<string, any>();
      (supply || []).forEach((s: any) => supplyMap.set(s.skinId, s));
      setSupplyData(supplyMap);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [weapon, category, condition]);

  return (
    <div className="space-y-8">
      {/* FILTER BAR */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Broń (Tabela A)</label>
            <select
              value={weapon}
              onChange={(e) => setWeapon(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 transition-colors"
            >
              {defaultWeapons.map(w => <option key={w} value={w}>{w}</option>)}
              {!defaultWeapons.includes("P2000") && <option value="P2000">P2000</option>}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Kategoria (Tabela B)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 transition-colors"
            >
              <option value="Sticker">Naklejki</option>
              {defaultWeapons.map(w => <option key={`cat-${w}`} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider md:text-right">Stan Jakości</label>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 w-full sm:w-auto overflow-x-auto">
            {CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
                  condition === c
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md transform scale-105"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA A: Analiza Rzadkości — teraz z kolumnami podaży */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-blue-500"></span>
            Analiza Rzadkości + Podaż
            {loading && <span className="ml-auto text-xs text-gray-500 animate-pulse">Odświeżanie...</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Stosunek globalnej i rynkowej podaży do ceny.</p>
        </div>

        <div className="overflow-x-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Nazwa</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Na rynku</th>
                <th className="px-4 py-3 font-semibold text-right">Ratio %</th>
                <th className="px-4 py-3 font-semibold text-right">Płynność</th>
                <th className="px-4 py-3 font-semibold text-center">Sygnały</th>
                <th className="px-4 py-3 font-semibold text-right">Cena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {rarityData.length === 0 && !loading && (
                <tr><td colSpan={7} className="text-center p-8 text-gray-500 italic">Brak danych dla wybranej broni i stanu.</td></tr>
              )}
              {rarityData.map((item) => {
                const sup = supplyData.get(item.id);
                const signals = computeSignals(sup);
                return (
                  <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-200">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.collection}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.isActiveDrop ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Aktywny
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Nieaktywny
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300 text-xs">
                      {sup?.marketSupplyWear != null
                        ? <><span className="font-bold text-white">{sup.marketSupplyWear.toLocaleString()}</span> <span className="text-gray-500">/ {sup.marketSupplyTotal?.toLocaleString() ?? '?'} total</span></>
                        : <span className="text-gray-600">–</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RatioBadge market={sup?.marketSupplyWear} global={sup?.globalSupplyWear} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <LiquidityBar value={sup?.marketLiquidity} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {signals.length > 0 ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {signals.map((s, i) => (
                            <span key={i} className={`text-sm ${s.color}`} title={s.label}>{s.icon}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-200">${item.price.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legenda sygnałów */}
        <div className="px-5 py-3 border-t border-gray-800/50 bg-gray-900/30 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><span className="text-orange-400">🔥</span> Market Dry-Up — sprzedaż &gt; wystawione</span>
          <span><span className="text-yellow-400">👻</span> Fake Scarcity — mało na rynku, dużo globalnie</span>
          <span><span className="text-blue-400">💧</span> Niska Płynność &lt;20%</span>
          <span className="ml-auto">Ratio % = wystawione tej kondycji / globalne</span>
        </div>
      </div>

      {/* TABELA B: Macierz Niedoszacowania */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-emerald-500"></span>
            Macierz Niedoszacowania
            {loading && <span className="ml-auto text-xs text-gray-500 animate-pulse">Odświeżanie...</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Ranking GAP pomiędzy użyciem a ceną.</p>
        </div>

        <div className="overflow-x-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Przedmiot</th>
                <th className="px-4 py-3 font-semibold text-center">Zużycie</th>
                <th className="px-4 py-3 font-semibold text-center">Steam 30d</th>
                <th className="px-4 py-3 font-semibold text-center" title="Price Rank vs Usage Rank">Stosunek (Ranks)</th>
                <th className="px-4 py-3 font-semibold text-center">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {underValData.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center p-8 text-gray-500 italic">Brak danych dla tej kategorii.</td></tr>
              )}
              {underValData.map((item) => {
                const isPositive = item.gap > 0;
                const sup = supplyData.get(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${isPositive ? 'bg-emerald-900/10 hover:bg-emerald-900/20' : 'hover:bg-gray-800/40'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-200">{item.name}</div>
                      <div className="text-xs text-gray-500">${item.price.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 font-medium">
                      {item.monthlyUsage} /m-c
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {sup?.steamSales30d != null
                        ? <span className="font-bold text-white">{sup.steamSales30d.toLocaleString()}</span>
                        : <span className="text-gray-600">–</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="text-orange-400" title="Ranga Ceny">#{item.priceRank}</span>
                        <span className="text-gray-600">vs</span>
                        <span className="text-blue-400" title="Ranga Użycia">#{item.usageRank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${
                        isPositive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-500'
                      }`}>
                        {item.gap > 0 ? `+${item.gap}` : item.gap}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
