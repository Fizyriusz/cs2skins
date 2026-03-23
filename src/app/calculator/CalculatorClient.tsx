"use client";

import { useState, useMemo, useId } from "react";
import {
  RARITY_CHAIN,
  getOutputRarity,
  normalizeFloat,
  averageNormalized,
  calculateContractOdds,
  calculateContractEV,
  validateContract,
  getConditionFromFloat,
  CONDITION_LABELS,
  type ContractInput,
  type OutputForOdds,
  type TradeUpType,
} from "@/lib/calculator";
import { getRarityConfig } from "@/lib/rarity";

export type SkinDataForCalc = {
  id: string;
  name: string;
  weapon: string;
  collection: string;
  rarity: string;
  minFloat: number;
  maxFloat: number;
  latestPrices: Record<string, number>; // condition code → steam price
};

// ─── helpers ────────────────────────────────────────────────
const COND_COLORS: Record<string, string> = {
  FN: "text-green-400",
  MW: "text-green-300",
  FT: "text-yellow-400",
  WW: "text-orange-400",
  BS: "text-red-400",
};

const COLLECTION_PALETTE = [
  "border-blue-500 bg-blue-950/30",
  "border-purple-500 bg-purple-950/30",
  "border-teal-500 bg-teal-950/30",
  "border-rose-500 bg-rose-950/30",
  "border-amber-500 bg-amber-950/30",
];

function collectionColor(collection: string, collections: string[]): string {
  const idx = collections.indexOf(collection);
  return COLLECTION_PALETTE[idx % COLLECTION_PALETTE.length] ?? COLLECTION_PALETTE[0];
}

// ─── empty input row ─────────────────────────────────────────
function emptyInput(uid: string): ContractInput {
  return {
    skinId: "",
    name: "",
    weapon: "",
    collection: "",
    rarity: "",
    skinMinFloat: 0,
    skinMaxFloat: 1,
    float: 0.1,
    pricePerItem: 0,
    stattrak: false,
    isFiller: false,
    // use uid as stable key
    ...(({ uid }) => ({ _uid: uid }) as unknown as object)({ uid }),
  } as ContractInput & { _uid: string };
}

// ─── main component ──────────────────────────────────────────
export default function CalculatorClient({
  allSkins,
  outputSkins,
}: {
  allSkins: SkinDataForCalc[];
  outputSkins: SkinDataForCalc[];
}) {
  const baseId = useId();
  const [tradeUpType, setTradeUpType] = useState<TradeUpType>("regular");
  const [inputs, setInputs] = useState<(ContractInput & { _uid: string })[]>([]);

  const maxInputs = tradeUpType === "covert" ? 5 : 10;

  // Detected rarity from first added skin
  const detectedRarity = inputs.find(i => i.rarity)?.rarity ?? null;
  const detectedST = inputs.find(i => i.skinId)?.stattrak ?? null;
  const outputRarity = detectedRarity ? getOutputRarity(detectedRarity) : null;

  // Validation
  const validation = useMemo(() => validateContract(inputs.filter(i => i.skinId), tradeUpType), [inputs, tradeUpType]);

  // Unique collections from inputs
  const usedCollections = useMemo(() => [...new Set(inputs.map(i => i.collection).filter(Boolean))], [inputs]);

  // Normalized floats per input
  const normalizedFloats = useMemo(() =>
    inputs.map(i => i.skinId ? normalizeFloat(i.float, i.skinMinFloat, i.skinMaxFloat) : null),
    [inputs]
  );
  const validNormalized = normalizedFloats.filter((v): v is number => v !== null);
  const avgNorm = averageNormalized(validNormalized);

  // Filter output skins
  const relevantOutputSkins: OutputForOdds[] = useMemo(() => {
    if (!outputRarity || usedCollections.length === 0) return [];
    return outputSkins
      .filter(s => s.rarity === outputRarity && usedCollections.includes(s.collection))
      .map(s => ({
        skinId: s.id,
        name: s.name,
        weapon: s.weapon,
        collection: s.collection,
        minFloat: s.minFloat,
        maxFloat: s.maxFloat,
        latestPrice: s.latestPrices["FN"] ?? s.latestPrices["MW"] ?? Object.values(s.latestPrices)[0],
      }));
  }, [outputSkins, outputRarity, usedCollections]);

  // Contract odds
  const odds = useMemo(() => {
    const filledInputs = inputs.filter(i => i.skinId);
    if (filledInputs.length === 0 || relevantOutputSkins.length === 0) return [];
    return calculateContractOdds(filledInputs, relevantOutputSkins, avgNorm);
  }, [inputs, relevantOutputSkins, avgNorm]);

  // EV
  const totalInputCost = useMemo(() =>
    inputs.filter(i => i.skinId).reduce((sum, i) => sum + i.pricePerItem, 0),
    [inputs]
  );
  const ev = useMemo(() => {
    if (odds.length === 0) return null;
    return calculateContractEV(
      odds.map(o => ({
        probability: o.probability,
        value: (() => {
          // Find latest price for the expected condition
          const skin = outputSkins.find(s => s.id === o.skinId);
          return skin?.latestPrices[o.outputCondition] ?? o.latestPrice ?? 0;
        })()
      })),
      totalInputCost
    );
  }, [odds, outputSkins, totalInputCost]);

  // ── input management ─────────────────────────────────────
  const addInput = () => {
    if (inputs.length >= maxInputs) return;
    setInputs(prev => [...prev, emptyInput(`${baseId}-${prev.length}`) as ContractInput & { _uid: string }]);
  };

  const removeInput = (idx: number) => setInputs(prev => prev.filter((_, i) => i !== idx));

  const updateInput = (idx: number, patch: Partial<ContractInput>) => {
    setInputs(prev => prev.map((row, i) => i === idx ? { ...row, ...patch } : row));
  };

  const selectSkin = (idx: number, skinId: string) => {
    const skin = allSkins.find(s => s.id === skinId);
    if (!skin) { updateInput(idx, { skinId: "" }); return; }
    const availableFloatMid = (skin.minFloat + skin.maxFloat) / 2;
    const stattrak = detectedST !== null ? detectedST : false;
    updateInput(idx, {
      skinId: skin.id,
      name: skin.name,
      weapon: skin.weapon,
      collection: skin.collection,
      rarity: skin.rarity,
      skinMinFloat: skin.minFloat,
      skinMaxFloat: skin.maxFloat,
      float: Math.min(skin.maxFloat, Math.max(skin.minFloat, availableFloatMid)),
      stattrak,
    });
  };

  // Skins filtered to match rarity/ST of already-added inputs
  const selectableSkins = useMemo(() =>
    allSkins.filter(s => {
      if (detectedRarity && s.rarity !== detectedRarity) return false;
      return true;
    }),
    [allSkins, detectedRarity]
  );

  // ── render ────────────────────────────────────────────────
  const filledCount = inputs.filter(i => i.skinId).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header controls */}
      <div className="flex flex-wrap gap-6 items-center bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Typ Kontraktu</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(["regular", "covert"] as TradeUpType[]).map(t => (
              <button
                key={t}
                onClick={() => { setTradeUpType(t); setInputs([]); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tradeUpType === t
                    ? "bg-orange-600 text-white"
                    : "bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                {t === "regular" ? "⚔️ Regularny (10×)" : "🔪 Covert / Knife (5×)"}
              </button>
            ))}
          </div>
        </div>

        {detectedRarity && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Rzadkość wejściowa → wyjściowa</p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span style={{ color: getRarityConfig(detectedRarity).hex }}>{detectedRarity}</span>
              <span className="text-gray-600">→</span>
              <span style={{ color: outputRarity ? getRarityConfig(outputRarity).hex : "#aaa" }}>
                {outputRarity ?? "Knife / Gloves"}
              </span>
            </div>
          </div>
        )}

        {filledCount > 0 && (
          <div className="ml-auto text-center">
            <p className="text-xs text-gray-500 mb-1">Inputy</p>
            <p className="text-2xl font-bold">
              <span className={filledCount === maxInputs ? "text-orange-400" : "text-white"}>{filledCount}</span>
              <span className="text-gray-600 text-base">/{maxInputs}</span>
            </p>
          </div>
        )}
      </div>

      {/* Input list */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Skiny wejściowe</h3>
          <button
            onClick={addInput}
            disabled={inputs.length >= maxInputs}
            className="text-sm px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            + Dodaj skin
          </button>
        </div>

        {inputs.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p className="text-4xl mb-3">🎮</p>
            <p>Kliknij "Dodaj skin" aby zacząć budować kontrakt.</p>
            <p className="text-sm mt-1">Rzadkość jest wykrywana automatycznie po dodaniu pierwszego skina.</p>
          </div>
        )}

        {inputs.map((row, idx) => {
          const norm = normalizedFloats[idx];
          const collColor = row.collection ? collectionColor(row.collection, usedCollections) : "";
          return (
            <div
              key={(row as ContractInput & { _uid: string })._uid}
              className={`rounded-xl p-4 border-l-4 transition-all ${collColor || "border-gray-700 bg-gray-900/40"}`}
            >
              <div className="flex flex-wrap gap-3 items-start">
                {/* Skin selector */}
                <div className="flex-1 min-w-[220px]">
                  <label className="text-xs text-gray-500 mb-1 block">Skin</label>
                  <select
                    value={row.skinId}
                    onChange={e => selectSkin(idx, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none"
                  >
                    <option value="">— wybierz skin —</option>
                    {Object.entries(
                      selectableSkins.reduce<Record<string, SkinDataForCalc[]>>((acc, s) => {
                        (acc[s.collection] ??= []).push(s);
                        return acc;
                      }, {})
                    ).map(([coll, skins]) => (
                      <optgroup key={coll} label={coll}>
                        {skins.map(s => (
                          <option key={s.id} value={s.id}>{s.weapon} | {s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Float */}
                <div className="w-36">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Float{row.skinId && <span className="text-gray-600"> ({row.skinMinFloat.toFixed(2)}–{row.skinMaxFloat.toFixed(2)})</span>}
                  </label>
                  <input
                    type="number"
                    min={row.skinMinFloat}
                    max={row.skinMaxFloat}
                    step="0.001"
                    value={row.float}
                    onChange={e => updateInput(idx, { float: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-center font-mono focus:border-orange-500 outline-none"
                  />
                </div>

                {/* Price */}
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">Cena ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.pricePerItem}
                    onChange={e => updateInput(idx, { pricePerItem: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-center font-mono focus:border-orange-500 outline-none"
                  />
                </div>

                {/* Filler badge + remove */}
                <div className="flex items-end gap-2 pb-0.5">
                  <button
                    onClick={() => updateInput(idx, { isFiller: !row.isFiller })}
                    title="Zaznacz jako filler skin (tani wypełniacz)"
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-colors font-medium ${
                      row.isFiller
                        ? "bg-gray-600 border-gray-500 text-gray-200"
                        : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-500"
                    }`}
                  >
                    Filler
                  </button>
                  <button
                    onClick={() => removeInput(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded"
                  >✕</button>
                </div>

                {/* Normalized float indicator */}
                {norm !== null && row.skinId && (
                  <div className="w-full mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>Znormalizowany: <span className="text-white font-mono">{norm.toFixed(4)}</span></span>
                    <span className="text-gray-700">•</span>
                    <span>Kondycja: <span className={COND_COLORS[getConditionFromFloat(row.float)] ?? ""}>{getConditionFromFloat(row.float)}</span></span>
                    {row.isFiller && <span className="text-gray-500 italic">• filler</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Validation errors */}
        {validation.errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300 space-y-1">
            {validation.errors.map((e, i) => <p key={i}>• {e}</p>)}
          </div>
        )}
      </section>

      {/* Results */}
      {filledCount > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Float summary */}
          <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
            <h3 className="font-semibold text-lg">📐 Float Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Średnia znormalizowana</p>
                <p className="text-3xl font-bold font-mono text-white">{avgNorm.toFixed(4)}</p>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <p className="font-semibold text-gray-300 uppercase tracking-wider">Cele znormalizowane:</p>
                {[
                  { cond: "FN", max: 0.07 / 1 },
                  { cond: "MW", min: 0.07 / 1, max: 0.15 / 1 },
                  { cond: "FT", min: 0.15 / 1, max: 0.38 / 1 },
                  { cond: "WW", min: 0.38 / 1, max: 0.45 / 1 },
                  { cond: "BS", min: 0.45 / 1, max: 1.0 },
                ].map(({ cond, min, max }) => {
                  const inRange = avgNorm >= (min ?? 0) && avgNorm < (max ?? 1);
                  return (
                    <div key={cond} className={`flex justify-between rounded px-2 py-1 ${inRange ? "bg-orange-900/40 border border-orange-700/50" : ""}`}>
                      <span className={COND_COLORS[cond]}>{cond} — {CONDITION_LABELS[cond]}</span>
                      <span className="font-mono">&lt; {max?.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Output probabilities */}
          <section className="xl:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
            <h3 className="font-semibold text-lg">🎯 Możliwe wyniki</h3>

            {odds.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {relevantOutputSkins.length === 0
                  ? `Brak skinów wyjściowych (${outputRarity}) w bazie dla używanych kolekcji. Dodaj je przez "Baza Skinów".`
                  : "Dodaj skiny do kontraktu aby zobaczyć wyniki."}
              </p>
            ) : (
              <div className="space-y-2">
                {odds.map((outcome) => {
                  const rConf = getRarityConfig(outcome.collection ? outputRarity ?? "" : "");
                  const skin = outputSkins.find(s => s.id === outcome.skinId);
                  const priceForCond = skin?.latestPrices[outcome.outputCondition];
                  const pct = (outcome.probability * 100).toFixed(2);
                  const collColor = collectionColor(outcome.collection, usedCollections);

                  return (
                    <div
                      key={`${outcome.skinId}-${outcome.outputCondition}`}
                      className={`rounded-xl p-4 border-l-4 flex flex-wrap items-center gap-4 ${collColor}`}
                    >
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-semibold text-white text-sm">{outcome.weapon} | {outcome.name}</p>
                        <p className="text-xs text-gray-400">{outcome.collection}</p>
                      </div>
                      <div className="text-center w-20">
                        <p className="text-xs text-gray-500">Szansa</p>
                        <p className="font-bold text-lg text-orange-400">{pct}%</p>
                      </div>
                      <div className="text-center w-28">
                        <p className="text-xs text-gray-500">Float → Kondycja</p>
                        <p className="font-mono text-sm">{outcome.outputFloat.toFixed(5)}</p>
                        <p className={`text-xs font-bold ${COND_COLORS[outcome.outputCondition]}`}>
                          {outcome.outputCondition} — {CONDITION_LABELS[outcome.outputCondition]}
                        </p>
                      </div>
                      <div className="text-center w-20">
                        <p className="text-xs text-gray-500">Cena</p>
                        {priceForCond
                          ? <p className="font-semibold text-green-400">${priceForCond.toFixed(2)}</p>
                          : <p className="text-gray-600 text-xs">brak danych</p>
                        }
                      </div>
                      {/* Mini probability bar */}
                      <div className="w-full">
                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, outcome.probability * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Warn if some input collections don't have outputs */}
                {usedCollections.some(c => !relevantOutputSkins.find(o => o.collection === c)) && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-xs">
                    ⚠️ Niektóre kolekcje nie mają skinów wyjściowych ({outputRarity}) w bazie — te sloty nie przyczyniają się do żadnego wyniku, co zmniejsza EV.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* EV Summary bar */}
      {filledCount > 0 && (
        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="font-semibold text-lg mb-5">💰 Podsumowanie kosztów i EV</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Inputy ({filledCount}/{maxInputs})</p>
              <p className="text-2xl font-bold text-white">${totalInputCost.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Oczekiwany zwrot</p>
              {ev !== null ? (
                <p className="text-2xl font-bold text-blue-400">${(ev + totalInputCost).toFixed(2)}</p>
              ) : <p className="text-gray-600">—</p>}
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">EV (zysk/strata)</p>
              {ev !== null ? (
                <p className={`text-2xl font-bold ${ev >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {ev >= 0 ? "+" : ""}{ev.toFixed(2)}$
                </p>
              ) : <p className="text-gray-600">—</p>}
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Opłacalność</p>
              {ev !== null
                ? ev >= 0
                  ? <p className="text-2xl">✅ <span className="text-green-400 font-bold text-sm">Zysk</span></p>
                  : <p className="text-2xl">❌ <span className="text-red-400 font-bold text-sm">Strata</span></p>
                : <p className="text-gray-600 text-lg">—</p>
              }
            </div>
          </div>

          {ev !== null && odds.length > 0 && (
            <div className="mt-5 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-400 uppercase tracking-wider">Szczegółowy breakdown:</p>
              {odds.map(o => {
                const skin = outputSkins.find(s => s.id === o.skinId);
                const price = skin?.latestPrices[o.outputCondition] ?? 0;
                return (
                  <div key={`ev-${o.skinId}-${o.outputCondition}`} className="flex justify-between font-mono">
                    <span>{(o.probability * 100).toFixed(2)}% × {o.weapon} | {o.name} ({o.outputCondition})</span>
                    <span className={price > 0 ? "text-green-400" : "text-gray-600"}>
                      = ${(o.probability * price).toFixed(3)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-mono text-sm">
                <span>Suma − koszt inputów</span>
                <span className={ev >= 0 ? "text-green-400" : "text-red-400"}>{ev >= 0 ? "+" : ""}{ev.toFixed(3)}$</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
