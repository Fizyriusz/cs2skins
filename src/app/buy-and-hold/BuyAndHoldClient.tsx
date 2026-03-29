"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getRarityAnalysis, getUndervaluationMatrix, getSupplyStats, toggleSkinActiveStatus, SupplyStatInput } from "./actions";
import SyncSupplyModal from "@/components/SyncSupplyModal";
import PriceParserModal from "@/components/PriceParserModal";
import EditSkinModal from "@/components/EditSkinModal";

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"];

const RARITY_HEX: Record<string, string> = {
  "Consumer Grade": "#b0c3d9",
  "Industrial Grade": "#5e98d9",
  "Mil-Spec Grade": "#4b69ff",
  "Restricted": "#8847ff",
  "Classified": "#d32ce6",
  "Covert": "#eb4b4b",
  "Contraband": "#e4ae39",
};

const SOURCE_ICONS: Record<string, string> = {
  "Case": "📦",
  "Armory": "🛡️",
  "Map": "🗺️",
  "Operation": "🏅",
};

// ─── Signals ──────────────────────────────────────────────────────────
function computeSignals(item: any, variants: any[]) {
  const signalsMap = new Map<string, { icon: string; label: string; color: string; desc: string }>();
  if (!variants || variants.length === 0) return Array.from(signalsMap.values());

  for (const v of variants) {
    // 1. Extinction Record
    if (v.empire_listings_wear < 50 && v.csfloat_total_registered_wear < 5000 && v.stattrak) {
      signalsMap.set("💎", { icon: "💎", label: "KOLEKCJONERSKI UNIKAT", color: "bg-purple-900/40 text-purple-400 border border-purple-800", desc: "Bardzo niska podaż globalna (<5000) i rynkowa (<50) ze StatTrak™." });
    }
    // 2. High Consumption
    if (v.empire_steam_sales_30d && v.empire_listings_wear && v.empire_steam_sales_30d > v.empire_listings_wear * 5) {
      signalsMap.set("🔥", { icon: "🔥", label: "WYSOKIE ZUŻYCIE", color: "bg-orange-900/40 text-orange-400 border border-orange-800", desc: "Miesięczna sprzedaż na Steam jest ponad 5x wyższa niż całkowita liczba ofert rynkowych." });
    }
    // 3. Safe Haven
    if (item.isActiveDrop === false && v.empire_liquidity_percent_wear && v.empire_liquidity_percent_wear > 50) {
      signalsMap.set("🛡️", { icon: "🛡️", label: "BEZPIECZNA PRZYSTAŃ", color: "bg-emerald-900/40 text-emerald-400 border border-emerald-800", desc: "Zablokowany drop (skin wycofany) z utrzymującą się wysoką płynnością obrotu (>50%)." });
    }
    // 4. Fake Scarcity (Legacy but useful)
    if (v.empire_listings_wear && v.csfloat_total_registered_wear && v.empire_listings_wear < 100 && v.csfloat_total_registered_wear > 10000) {
      signalsMap.set("👻", { icon: "👻", label: "FAKE SCARCITY", color: "bg-yellow-900/40 text-yellow-500 border border-yellow-800", desc: "Ułamkowa ilość krąży po rynkach (<100), mimo ogromnych rejestrów CSFloat (>10k)." });
    }
  }

  // Float Cap detection
  const hasFloatCap = CONDITIONS.some(c => !variants.some(v => v.condition === c));
  if (hasFloatCap && variants.length > 0) {
    const worstConditionIndex = Math.max(...variants.map(v => CONDITIONS.indexOf(v.condition)));
    const cappedAt = CONDITIONS[worstConditionIndex];
    if (['FN', 'MW'].includes(cappedAt)) {
      signalsMap.set("✨", { icon: "✨", label: "NATURALNY DEFICYT", color: "bg-yellow-600/40 text-yellow-300 border border-yellow-700/60", desc: "Skin posiada ucięty Float Cap (występuje max na poziomie " + cappedAt + ")." });
    } else {
      signalsMap.set("🏷️", { icon: "🏷️", label: `FLOAT CAP: ${cappedAt}`, color: "bg-gray-700/40 text-gray-300 border border-gray-600", desc: `Ten skin oryginalnie nie wypada w stanach gorszych niż ${cappedAt}.` });
    }
  }

  return Array.from(signalsMap.values());
}

// ─── Tooltip Header ──────────────────────────────────────────────────
function TH({ text, popover, sortable, sortKey, currentSort, onSort, className = "" }: { text: string, popover?: string, sortable?: boolean, sortKey?: string, currentSort?: { key: string, asc: boolean }, onSort?: (k: string) => void, className?: string }) {
  const isSorted = currentSort?.key === sortKey;
  return (
    <th 
      className={`px-4 py-4 font-semibold ${sortable ? 'cursor-pointer hover:bg-gray-800/80 transition-colors group' : ''} ${className}`}
      onClick={() => sortable && sortKey && onSort?.(sortKey)}
      title={popover}
    >
      <div className="flex items-center gap-1.5 justify-end w-full">
        {sortable && (
          <span className={`text-[10px] ${isSorted ? 'text-cyan-400' : 'text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
            {isSorted ? (currentSort?.asc ? '▲' : '▼') : '↕'}
          </span>
        )}
        <span className="flex items-center gap-1">
          {text}
          {popover && (
             <svg className="w-3.5 h-3.5 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </span>
      </div>
    </th>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────
function LiquidityBar({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-600 text-xs">–</span>;
  const color = value >= 50 ? "bg-emerald-500" : value >= 20 ? "bg-yellow-500" : "bg-red-500";
  const textColor = value >= 50 ? "text-emerald-400" : value >= 20 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center justify-end gap-2 w-full">
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
  const [reloadKey, setReloadKey] = useState(0);

  // Sorting
  const [sortConf, setSortConf] = useState<{ key: string, asc: boolean }>({ key: 'price', asc: true });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Editing & Queue
  const [compareQueue, setCompareQueue] = useState<Map<string, { item: any, variants: any[] }>>(new Map());
  const [editingVariant, setEditingVariant] = useState<SupplyStatInput | null>(null);
  const [priceParserData, setPriceParserData] = useState<{item: any, variants: any[]} | null>(null);
  const [editSkinData, setEditSkinData] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getRarityAnalysis(weapon, condition),
      getUndervaluationMatrix(category, condition),
      getSupplyStats(weapon),
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
  }, [weapon, category, condition, reloadKey]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRows(prev => {
      const p = new Set(prev);
      p.has(id) ? p.delete(id) : p.add(id);
      return p;
    });
  };

  const handleToggleActive = async (skinId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleSort = (key: string) => setSortConf(prev => ({ key, asc: prev.key === key ? !prev.asc : true }));

  const toggleCompareQueue = (item: any, variants: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareQueue(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, { item, variants });
      return next;
    });
  };

  const openEditor = (item: any, variant: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVariant({
      weapon: item.weapon,
      name: item.name,
      condition: variant.condition,
      stattrak: variant.stattrak,
      price: variant.price || undefined,
      recordedAt: undefined, // manual override triggers "NOW" if left empty by default in form
      csfloat_total_registered_wear: variant.csfloat_total_registered_wear || undefined,
      empire_active_circulation_wear: variant.empire_active_circulation_wear || undefined,
      empire_total_listings: variant.empire_total_listings || undefined,
      empire_listings_wear: variant.empire_listings_wear || undefined,
      empire_liquidity_percent_wear: variant.empire_liquidity_percent_wear || undefined,
      empire_trades_30d: variant.empire_trades_30d || undefined,
      empire_steam_sales_30d: variant.empire_steam_sales_30d || undefined,
    });
  };

  // ─── SORTING ENGINE ─────────────────────────────────────────────────
  const sortedRarityData = useMemo(() => {
    return [...rarityData].sort((a, b) => {
      const supA = supplyData.get(a.id)?.variants || [];
      const supB = supplyData.get(b.id)?.variants || [];
      const vA_normal = supA.find((v: any) => v.condition === condition && !v.stattrak);
      const vA_st = supA.find((v: any) => v.condition === condition && v.stattrak);
      const vB_normal = supB.find((v: any) => v.condition === condition && !v.stattrak);
      const vB_st = supB.find((v: any) => v.condition === condition && v.stattrak);

      let valA = 0; let valB = 0;
      switch(sortConf.key) {
        case 'price': valA = vA_normal?.price || a.price; valB = vB_normal?.price || b.price; break;
        case 'global': 
          valA = supA.reduce((acc: number, v: any) => acc + (v.csfloat_total_registered_wear || 0), 0);
          valB = supB.reduce((acc: number, v: any) => acc + (v.csfloat_total_registered_wear || 0), 0);
          break;
        case 'reg_normal': valA = (vA_normal?.csfloat_total_registered_wear || 0); valB = (vB_normal?.csfloat_total_registered_wear || 0); break;
        case 'reg_st': valA = (vA_st?.csfloat_total_registered_wear || 0); valB = (vB_st?.csfloat_total_registered_wear || 0); break;
        case 'circ_normal': valA = (vA_normal?.empire_active_circulation_wear || 0); valB = (vB_normal?.empire_active_circulation_wear || 0); break;
        case 'circ_st': valA = (vA_st?.empire_active_circulation_wear || 0); valB = (vB_st?.empire_active_circulation_wear || 0); break;
        default: valA = a.price; valB = b.price;
      }
      return sortConf.asc ? valA - valB : valB - valA;
    });
  }, [rarityData, supplyData, condition, sortConf]);

  // ─── RENDER HELPER DLA WIERSZA SKINA ──────────────────────────────
  const renderSkinRow = (item: any, variants: any[], isQueue = false) => {
    const computedGlobalTotal = variants.reduce((acc: number, v: any) => acc + (v.csfloat_total_registered_wear || 0), 0);
    const vNormal = variants.find((v: any) => v.condition === condition && !v.stattrak);
    const vST = variants.find((v: any) => v.condition === condition && v.stattrak);
    const signals = computeSignals(item, variants);
    const isExpanded = expandedRows.has(item.id + (isQueue ? "_q" : ""));
    const inQueue = compareQueue.has(item.id);

    return (
      <React.Fragment key={item.id + (isQueue ? "_q" : "")}>
        <tr onClick={() => toggleExpand(item.id + (isQueue ? "_q" : ""))} className={`hover:bg-gray-800/40 transition-colors cursor-pointer border-l-[3px] ${isExpanded ? 'bg-gray-800/20' : ''}`} style={{ borderLeftColor: RARITY_HEX[item.rarity] || 'transparent' }}>
          <td className="px-4 py-4 min-w-[250px]">
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => toggleCompareQueue(item, variants, e)}
                title={inQueue ? "Usuń z porównania" : "Dodaj do porównania (zachowuje skin przy zmianie broni)"}
                className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${inQueue ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500"}`}
              >
                {inQueue ? "✓" : "+"}
              </button>
              <div className="overflow-hidden">
                <div className="font-bold text-gray-200 truncate flex items-center gap-2">
                  {item.weapon} | {item.name}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <div className="text-[10px] text-gray-300 truncate mr-1 font-medium bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700/50">
                    {SOURCE_ICONS[item.sourceType] || "📦"} {item.collection}
                  </div>
                  {item.rarity && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-900 border border-gray-700/50" style={{ color: RARITY_HEX[item.rarity] || '#9ca3af' }}>{item.rarity}</span>
                  )}
                  {signals.map((s, i) => (
                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${s.color}`} title={s.desc}>
                      {s.icon} <span className="hidden sm:inline">{s.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </td>
          <td className="px-3 py-4 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={(e) => handleToggleActive(item.id, item.isActiveDrop, e)} className="group flex flex-col mx-auto items-center p-1 rounded-lg hover:bg-gray-700/50">
              {item.isActiveDrop ? (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              )}
              <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100 mt-0.5">Zmień</span>
            </button>
          </td>
          <td className="px-4 py-4 text-right font-mono text-cyan-400 font-bold hidden md:table-cell">
            {computedGlobalTotal > 0 ? computedGlobalTotal.toLocaleString() : <span className="text-gray-600 font-normal">–</span>}
          </td>
          <td className="px-4 py-4 text-right font-mono text-gray-300 hidden md:table-cell">
            {vNormal?.csfloat_total_registered_wear ? vNormal.csfloat_total_registered_wear.toLocaleString() : <span className="text-gray-600">–</span>}
          </td>
          <td className="px-4 py-4 text-right font-mono text-gray-400 hidden md:table-cell">
            {vNormal?.empire_active_circulation_wear ? vNormal.empire_active_circulation_wear.toLocaleString() : <span className="text-gray-600">–</span>}
          </td>
          <td className="px-4 py-4 text-right font-mono text-orange-300/80 hidden lg:table-cell">
            {vST?.csfloat_total_registered_wear ? vST.csfloat_total_registered_wear.toLocaleString() : <span className="text-gray-600">–</span>}
          </td>
          <td className="px-4 py-4 text-right font-mono text-orange-400/60 hidden lg:table-cell">
            {vST?.empire_active_circulation_wear ? vST.empire_active_circulation_wear.toLocaleString() : <span className="text-gray-600">–</span>}
          </td>
          <td className="px-4 py-4 text-right">
            <div className="flex justify-end items-center gap-3">
              <span className="font-bold text-emerald-400">${(vNormal?.price || item.price)?.toFixed(2)}</span>
              {!isQueue && (
                <button onClick={(e) => { e.stopPropagation(); setEditSkinData(item); }} title="Edytuj Metadane Skina" className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500 transition-colors">
                  ✏️
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* SZCZEGÓŁOWA TABELA WARIANTÓW */}
        {isExpanded && variants.length > 0 && (
          <tr>
            <td colSpan={8} className="p-0 bg-gray-950/80 shadow-inner">
              <div className="border-t border-b border-gray-800/80 px-8 py-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rozbicie i korekta (Edycja Inline):</h3>
                  <button onClick={(e) => { e.stopPropagation(); setPriceParserData({ item, variants }); }} className="text-xs font-bold text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-800 flex items-center gap-1.5 shadow-lg">
                    <span>💰</span> Szybki Import Cen z Tekstu
                  </button>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="pb-2 font-medium">Wariant</th>
                      <th className="pb-2 text-right font-medium text-emerald-400">Cena ($)</th>
                      <th className="pb-2 text-right font-medium">CSFloat Reg.</th>
                      <th className="pb-2 text-right font-medium">Empire Circ.</th>
                      <th className="pb-2 text-right font-medium">Listings</th>
                      <th className="pb-2 text-right text-purple-400 font-medium">Hoarder %</th>
                      <th className="pb-2 font-medium text-right w-24">Liquidity</th>
                      <th className="pb-2 text-right font-medium">Trades 30d</th>
                      <th className="pb-2 pl-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/30">
                    {(() => {
                      const allConfigs: { condition: string; stattrak: boolean }[] = [];
                      CONDITIONS.forEach(c => {
                        allConfigs.push({ condition: c, stattrak: false });
                        allConfigs.push({ condition: c, stattrak: true });
                      });
                      
                      return allConfigs.map((cfg) => {
                        const v = variants.find(x => x.condition === cfg.condition && !!x.stattrak === cfg.stattrak);
                        
                        if (!v) {
                          return (
                            <tr key={`${cfg.condition}_${cfg.stattrak}`} className="bg-gray-900/20 opacity-40">
                              <td className="py-2.5">
                                <span className={`font-bold ${cfg.stattrak ? 'text-orange-900/50' : 'text-gray-600'}`}>
                                  {cfg.condition} {cfg.stattrak && 'ST™'}
                                </span>
                              </td>
                              <td colSpan={8} className="py-2.5 text-center text-xs font-semibold text-gray-600 tracking-widest italic">
                                N/A (Float Cap)
                              </td>
                            </tr>
                          );
                        }

                        let hoarderRatio: number | null = null;
                        if (v.csfloat_total_registered_wear && v.empire_active_circulation_wear) {
                          hoarderRatio = (1 - (v.empire_active_circulation_wear / v.csfloat_total_registered_wear)) * 100;
                        }
                        return (
                          <tr key={`${v.condition}_${v.stattrak}`} className="hover:bg-gray-800/30 group">
                            <td className="py-2.5">
                              <span className={`font-bold ${v.stattrak ? 'text-orange-400' : 'text-gray-300'}`}>
                                {v.condition} {v.stattrak && 'ST™'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">{v.price ? `$${v.price.toFixed(2)}` : '-'}</td>
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
                            <td className="py-2.5"><LiquidityBar value={v.empire_liquidity_percent_wear} /></td>
                            <td className="py-2.5 text-right font-mono">
                              {v.empire_trades_30d ?? '-'} <span className="text-gray-600">({v.empire_steam_sales_30d ?? '-'})</span>
                            </td>
                            <td className="py-2.5 pl-4 text-right">
                              <button onClick={(e) => openEditor(item, v, e)} title="Szybka Korekta / Snapshot" className="text-gray-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            </td>
                          </tr>
                        )
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-8">
      {editingVariant && (
        <SyncSupplyModal 
          initialData={editingVariant} 
          onClose={() => setEditingVariant(null)} 
        />
      )}
      
      {priceParserData && (
        <PriceParserModal
          skinItem={priceParserData.item}
          latestVariants={priceParserData.variants}
          onClose={() => setPriceParserData(null)}
        />
      )}

      {editSkinData && (
        <EditSkinModal skin={editSkinData} onClose={() => setEditSkinData(null)} onSuccess={() => setReloadKey(k => k + 1)} />
      )}

      {/* FILTER BAR */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Broń (Tabela Główna)</label>
            <select
              value={weapon}
              onChange={(e) => setWeapon(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
            >
              {defaultWeapons.map(w => <option key={w} value={w}>{w}</option>)}
              {!defaultWeapons.includes("P2000") && <option value="P2000">P2000</option>}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Kategoria (Tabela MACIERZ)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
            >
              <option value="Sticker">Naklejki</option>
              {defaultWeapons.map(w => <option key={`cat-${w}`} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider md:text-right">Wybrana Kondycja (Filtruje Kolumny)</label>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 w-full sm:w-auto overflow-x-auto">
            {CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
                  condition === c ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md transform scale-105" : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KOSZYK PORÓWNWCZY */}
      {compareQueue.size > 0 && (
        <div className="bg-gray-900 border border-cyan-900/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-800 bg-gray-900/80 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                🛒 Twoja Kolejka Porównawcza ({compareQueue.size})
              </h2>
              <p className="text-sm text-gray-400 mt-1">Zapisano. Skacz po innych broniach i dodawaj więcej do listy, żeby porównać je tu naraz.</p>
            </div>
            <button onClick={() => setCompareQueue(new Map())} className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors">
              Wyczyść Kolejkę
            </button>
          </div>
          <div className="overflow-x-auto w-full flex-1 p-0 bg-gray-950/40">
            <table className="w-full text-base text-left min-w-[700px] md:min-w-0">
              <thead className="text-[10px] text-gray-400 uppercase bg-gray-900/50">
                <tr>
                  <th className="px-4 py-4 font-semibold">Skin (Porównanie)</th>
                  <th className="px-4 py-4 font-semibold text-center w-24">Status</th>
                  <TH className="hidden md:table-cell" text="Global Total" />
                  <TH className="hidden md:table-cell" text={`Reg. (${condition})`} />
                  <TH className="hidden md:table-cell" text={`Circ. (${condition})`} />
                  <TH className="hidden lg:table-cell" text={`Reg. ST™`} />
                  <TH className="hidden lg:table-cell" text={`Circ. ST™`} />
                  <TH text={`Cena (${condition})`} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {Array.from(compareQueue.values()).map(({ item, variants }) => renderSkinRow(item, variants, true))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELA A: Główne Zestawienie */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-blue-500"></span>
            Moduł Podaży ({weapon})
            {loading && <span className="ml-auto text-xs text-gray-500 animate-pulse">Odświeżanie...</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Kliknij [+] aby dodać skina na sztywno do Koszyka Porównawczego u góry. 
            Kliknij wiersz aby widzieć zużycia i wejść w szybką Edycję/Korektę Snapszhota.
          </p>
        </div>

        <div className="overflow-x-auto w-full flex-1 p-0">
          <table className="w-full text-base text-left min-w-[700px] md:min-w-0">
            <thead className="text-[10px] text-gray-400 uppercase bg-gray-800/50">
              <tr>
                <th className="px-4 py-4 font-semibold">Skin</th>
                <th className="px-4 py-4 font-semibold text-center w-24">Status</th>
                <TH className="hidden md:table-cell" text="Global Total" popover="Suma WSZYSTKICH wariantów (FN-BS oraz ST/Normal) zarejestrowanych w publicznych plecakach według bazy CSFloat." sortable sortKey="global" currentSort={sortConf} onSort={handleSort} />
                <TH className="hidden md:table-cell" text={`Reg. (${condition})`} popover="Podaż (Registered) wybranej u góry jakości." sortable sortKey="reg_normal" currentSort={sortConf} onSort={handleSort} />
                <TH className="hidden md:table-cell" text={`Circ. (${condition})`} popover="Podaż czynnie krążąca po rynkach (Circulating / Total Items)." sortable sortKey="circ_normal" currentSort={sortConf} onSort={handleSort} />
                <TH className="hidden lg:table-cell" text={`Reg. ST™`} popover="Podaż (Registered) DLA WARIANTU STATTRAK." sortable sortKey="reg_st" currentSort={sortConf} onSort={handleSort} />
                <TH className="hidden lg:table-cell" text={`Circ. ST™`} popover="Podaż czynnie krążąca po rynkach DLA WARIANTU STATTRAK." sortable sortKey="circ_st" currentSort={sortConf} onSort={handleSort} />
                <TH text={`Cena (${condition})`} popover="Ostatnia zadeklarowana cena (jeśli brak przy wariancie, bierzemy z ogólnej tabeli Steamów)." sortable sortKey="price" currentSort={sortConf} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {sortedRarityData.length === 0 && !loading && (
                <tr><td colSpan={8} className="text-center p-8 text-gray-500 italic">Brak danych</td></tr>
              )}
              {sortedRarityData.map((item) => {
                const sup = supplyData.get(item.id);
                return renderSkinRow(item, sup?.variants || []);
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABELA B: Macierz Niedoszacowania */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-emerald-500"></span>
            Macierz Niedoszacowania ({category})
            {loading && <span className="ml-auto text-xs text-gray-500 animate-pulse">Odświeżanie...</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Ranking GAP pomiędzy użyciem a ceną (tylko bieżący filter).</p>
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
                const vNormal = sup?.variants?.find((v: any) => v.condition === condition && !v.stattrak);
                
                return (
                  <tr key={item.id} className={`transition-colors ${isPositive ? 'bg-emerald-900/10 hover:bg-emerald-900/20' : 'hover:bg-gray-800/40'}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-200">{item.name}</div>
                      <div className="text-xs text-gray-500">${item.price.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 font-medium">
                      {item.monthlyUsage} /m-c
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {vNormal?.empire_steam_sales_30d != null
                        ? <span className="font-bold text-white">{vNormal.empire_steam_sales_30d.toLocaleString()}</span>
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
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${isPositive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-500'}`}>
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
