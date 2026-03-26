"use client";

import { useState, useEffect } from "react";
import { getRarityAnalysis, getUndervaluationMatrix, getSupplyStats, toggleSkinActiveStatus } from "./actions";

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"];

// ─── Signals ──────────────────────────────────────────────────────────
function computeSignals(variants: any[]) {
  const signals: { icon: string; label: string; color: string }[] = [];
  if (!variants || variants.length === 0) return signals;

  let hasDryUp = false;
  let hasFakeScarcity = false;

  for (const v of variants) {
    if (v.empire_steam_sales_30d && v.empire_listings_wear && v.empire_steam_sales_30d > v.empire_listings_wear) hasDryUp = true;
    if (v.empire_listings_wear && v.csfloat_total_registered_wear && v.empire_listings_wear < 100 && v.csfloat_total_registered_wear > 10000) hasFakeScarcity = true;
  }

  if (hasDryUp) signals.push({ icon: "🔥", label: "Market Dry-Up", color: "text-orange-400" });
  if (hasFakeScarcity) signals.push({ icon: "👻", label: "Fake Scarcity", color: "text-yellow-400" });

  return signals;
}

// ─── Badge ───────────────────────────────────────────────────────────
function LiquidityBar({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-600 text-xs">–</span>;
  const color = value >= 50 ? "bg-emerald-500" : value >= 20 ? "bg-yellow-500" : "bg-red-500";
  const textColor = value >= 50 ? "text-emerald-400" : value >= 20 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${textColor}`}>{value.toFixed(0)}%</span>
    </div>
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

  // Zwijane wiersze
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getRarityAnalysis(weapon, condition),
      getUndervaluationMatrix(category, condition),
      getSupplyStats(weapon), // Pobiera WSZYSTKIE warianty
    ]).then(([rarity, underval, supply]) => {
      if (!active) return;
      setRarityData(rarity);
      setUnderValData(underval);

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

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const p = new Set(prev);
      p.has(id) ? p.delete(id) : p.add(id);
      return p;
    });
  };

  const handleToggleActive = async (skinId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { success } = await toggleSkinActiveStatus(skinId, currentStatus);
    if (success) {
      setRarityData(prev => prev.map(s => s.id === skinId ? { ...s, isActiveDrop: !currentStatus } : s));
      setSupplyData(prev => {
        const p = new Map(prev);
        const st = p.get(skinId);
        if (st) {
          st.isActiveDrop = !currentStatus;
          p.set(skinId, st);
        }
        return p;
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* FILTER BAR wciąż działa (Tabela B) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Broń (Podaż &amp; Rzadkość)</label>
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
      </div>

      {/* TABELA A: Główne Zestawienie (Zwijane detale) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-blue-500"></span>
            Overview &amp; Global Supply (Rozwiń)
            {loading && <span className="ml-auto text-xs text-gray-500 animate-pulse">Odświeżanie...</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Zsumowane dane globalne skina (z CSFloat). Kliknij wiersz aby zobaczyć tabelę cząstkową.</p>
        </div>

        <div className="overflow-x-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Skin</th>
                <th className="px-4 py-3 font-semibold">Status (Zmień)</th>
                <th className="px-4 py-3 font-semibold text-right">Total Existing (Global)</th>
                <th className="px-4 py-3 font-semibold text-right">Global Market Listings</th>
                <th className="px-4 py-3 font-semibold text-center">Sygnały</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {rarityData.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center p-8 text-gray-500 italic">Brak danych</td></tr>
              )}
              {rarityData.map((item) => {
                const sup = supplyData.get(item.id);
                const variants = sup?.variants || [];
                
                // Aggregacja danych top-level
                // Computed_CSFloat_Total_Global: suma wszystkich csfloat_total_registered_wear
                const computedGlobalTotal = variants.reduce((acc: number, v: any) => acc + (v.csfloat_total_registered_wear || 0), 0);
                
                // empire_total_listings: można wyciągnąć dowolny nie-null, zazwyczaj jest ten sam dla całego skina
                const totalListings = variants.find((v: any) => v.empire_total_listings != null)?.empire_total_listings;

                const signals = computeSignals(variants);
                const isExpanded = expandedRows.has(item.id);

                return (
                  <React.Fragment key={item.id}>
                    {/* Wiersz z podsumowaniem */}
                    <tr onClick={() => toggleExpand(item.id)} className={`hover:bg-gray-800/40 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-800/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          <div>
                            <div className="font-bold text-gray-200">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.collection}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => handleToggleActive(item.id, item.isActiveDrop, e)} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-600">
                          {item.isActiveDrop ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              <span className="text-red-500">Aktywny drop</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-emerald-500">Nieaktywny</span>
                            </>
                          )}
                          <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 ml-1">Zmień</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-400 font-bold">
                        {computedGlobalTotal > 0 ? computedGlobalTotal.toLocaleString() : <span className="text-gray-600 font-normal">–</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {totalListings ? totalListings.toLocaleString() : <span className="text-gray-600">–</span>}
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
                    </tr>

                    {/* Zwijana Tabela Rozbicia na Warianty */}
                    {isExpanded && variants.length > 0 && (
                      <tr>
                        <td colSpan={5} className="p-0 bg-gray-950/50">
                          <div className="border-t border-b border-gray-800 px-6 py-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Warianty (Condition / StatTrak)</h3>
                            <table className="w-full text-xs text-left">
                              <thead className="text-gray-500 border-b border-gray-800">
                                <tr>
                                  <th className="pb-2">Wariant</th>
                                  <th className="pb-2 text-right" title="csfloat_total_registered_wear">Registered</th>
                                  <th className="pb-2 text-right" title="empire_active_circulation_wear">Circulating</th>
                                  <th className="pb-2 text-right" title="empire_listings_wear">Listings</th>
                                  <th className="pb-2 text-right text-purple-400" title="(1 - Circulation/Registered) * 100">Hoarder %</th>
                                  <th className="pb-2 flex justify-end">Liquidity</th>
                                  <th className="pb-2 text-center" title="empire_trades_30d / empire_steam_sales_30d">Trades 30d (Steam)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/30">
                                {variants.sort((a: any, b: any) => CONDITIONS.indexOf(a.condition) - CONDITIONS.indexOf(b.condition)).map((v: any) => {
                                  // Computed_Hoarder_Ratio_Wear
                                  let hoarderRatio: number | null = null;
                                  if (v.csfloat_total_registered_wear && v.empire_active_circulation_wear) {
                                    hoarderRatio = (1 - (v.empire_active_circulation_wear / v.csfloat_total_registered_wear)) * 100;
                                  }

                                  return (
                                    <tr key={`${v.condition}_${v.stattrak}`} className="hover:bg-gray-800/30">
                                      <td className="py-2.5">
                                        <span className={`font-bold ${v.stattrak ? 'text-orange-400' : 'text-gray-300'}`}>
                                          {v.condition} {v.stattrak && 'ST™'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-right font-mono text-cyan-500/80">{v.csfloat_total_registered_wear?.toLocaleString() ?? '-'}</td>
                                      <td className="py-2.5 text-right font-mono text-gray-400">{v.empire_active_circulation_wear?.toLocaleString() ?? '-'}</td>
                                      <td className="py-2.5 text-right font-mono text-gray-200">{v.empire_listings_wear?.toLocaleString() ?? '-'}</td>
                                      <td className="py-2.5 text-right">
                                        {hoarderRatio != null ? (
                                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${hoarderRatio > 80 ? 'bg-purple-900/40 text-purple-400' : 'text-gray-500'}`}>
                                            {hoarderRatio.toFixed(1)}%
                                          </span>
                                        ) : '-'}
                                      </td>
                                      <td className="py-2.5 flex justify-end"><LiquidityBar value={v.empire_liquidity_percent_wear} /></td>
                                      <td className="py-2.5 text-center font-mono">
                                        {v.empire_trades_30d ?? '-'} <span className="text-gray-600">({v.empire_steam_sales_30d ?? '-'})</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opcjonalnie Tabela B (Undervaluation) pozostaje bez zmian */}
    </div>
  );
}
