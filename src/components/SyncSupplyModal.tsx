"use client";

import { useState, useEffect } from "react";
import { syncSupplyStats, type SupplyStatInput } from "@/app/buy-and-hold/actions";
import { useRouter } from "next/navigation";

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"];

const BLANK: SupplyStatInput = {
  weapon: "",
  name: "",
  condition: "FN",
  stattrak: false,
  price: undefined,
  recordedAt: undefined,
  csfloat_total_registered_wear: undefined,
  empire_active_circulation_wear: undefined,
  empire_total_listings: undefined,
  empire_listings_wear: undefined,
  empire_liquidity_percent_wear: undefined,
  empire_trades_30d: undefined,
  empire_steam_sales_30d: undefined,
};

const JSON_PROMPT = `Format JSON (wklej tablicę obiektów z Pricempire i CSFloat):

[
  {
    "weapon": "P2000",
    "name": "Fire Elemental",
    "condition": "FN",
    "stattrak": false,
    "empire_average_price": 14.33,
    "price": undefined,
    "recordedAt": "2026-03-25T14:30:00Z",
    "csfloat_total_registered_wear": 12376, 
    "empire_active_circulation_wear": 9661, 
    "empire_total_listings": 1964,    
    "empire_listings_wear": 150,
    "empire_liquidity_percent_wear": 63,   
    "empire_trades_30d": 34,         
    "empire_steam_sales_30d": 904     
  }
]

Mapowanie z Pricempire:
• Average Price (lub Lowest) → "empire_average_price" (lub "price")
• Total Items (Circulating) → "empire_active_circulation_wear"
• Ofert globalnie → "empire_total_listings"
• Oferty tutaj → "empire_listings_wear"

Z CSFloat (Registered) → "csfloat_total_registered_wear"

Data: "recordedAt" - jeśli użyta ręcznie, wymusi dany snapshot w przeszłości (opcjonalne).`;

interface SyncSupplyModalProps {
  onClose: () => void;
  initialData?: SupplyStatInput; // do inline edycji istniejących snapshotów
}

export default function SyncSupplyModal({ onClose, initialData }: SyncSupplyModalProps) {
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [form, setForm] = useState<SupplyStatInput>({ ...BLANK });
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ saved: number; errors: string[] } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (initialData) {
      setForm({ ...BLANK, ...initialData });
      setMode("manual");
    }
  }, [initialData]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // jeśli pole daty jest puste stringiem, wyczyszczamy żeby baza ustawiła default now()
    const payload = { ...form };
    if (!payload.recordedAt) delete payload.recordedAt;

    const r = await syncSupplyStats([payload]);
    setResult(r);
    setLoading(false);
    if (r.saved > 0) setTimeout(() => { router.refresh(); onClose(); }, 1000);
  };

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed: SupplyStatInput[] = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Oczekiwano tablicy JSON");
      const r = await syncSupplyStats(parsed);
      setResult(r);
      if (r.saved > 0) setTimeout(() => { router.refresh(); onClose(); }, 1000);
    } catch (err: any) {
      setResult({ saved: 0, errors: [`Błąd parsowania JSON: ${err.message}`] });
    }
    setLoading(false);
  };

  const numField = (label: string, key: keyof SupplyStatInput, hint?: string) => (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
        {label}
        {hint && <span className="font-normal text-gray-600 ml-1 lowercase">({hint})</span>}
      </label>
      <input
        type="number"
        step="any"
        value={(form[key] as number | undefined) ?? ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
      />
    </div>
  );

  const textField = (label: string, key: keyof SupplyStatInput, hint?: string, type = "text", required = false) => (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
        {label}
        {hint && <span className="font-normal text-gray-600 ml-1 lowercase">({hint})</span>}
      </label>
      <input
        required={required}
        type={type}
        value={(form[key] as string | undefined) || ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
      />
    </div>
  );

  const ResultBox = () => result ? (
    <div className={`rounded-lg px-4 py-3 text-sm ${result.errors.length > 0 ? "bg-red-900/30 border border-red-700 text-red-300" : "bg-green-900/30 border border-green-700 text-green-300"}`}>
      {result.saved > 0 && <p>✓ Zapisano {result.saved} wpis(ów)</p>}
      {result.errors.map((e, i) => <p key={i}>✗ {e}</p>)}
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{initialData ? "✏️ Edycja/Korekta (Snapshot)" : "📊 Sync Danych Podażowych"}</h2>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Dodaje nowy wpis historyczny do bazy</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!initialData && (
          <div className="flex gap-1 px-6 pt-4 shrink-0">
            {(["manual", "json"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {m === "manual" ? "✏️ Ręcznie" : "📋 Wklej JSON"}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-4">
          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Identyfikacja Skina */}
              <div className="grid grid-cols-3 gap-3">
                {textField("Broń", "weapon", undefined, "text", true)}
                {textField("Nazwa", "name", undefined, "text", true)}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Kondycja</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group mt-2">
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.stattrak ? "bg-orange-500" : "bg-gray-700"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.stattrak ? "translate-x-5" : ""}`} />
                    </div>
                    <span className={`text-sm font-semibold ${form.stattrak ? "text-orange-400" : "text-gray-400"}`}>
                      {form.stattrak ? "StatTrak™" : "Non-StatTrak"}
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 flex-1">
                  <div className="flex-1">{numField("Cena $", "price", "opcjonalnie")}</div>
                  <div className="flex-1">{textField("Data Snapshotu", "recordedAt", "zostaw puste = TERAZ")}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/50 space-y-3">
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-gray-800 pb-2">🌐 Pricempire – Rynek</p>
                  {numField("Total Listings", "empire_total_listings", "globalne")}
                  {numField("Listings Wear", "empire_listings_wear", "tylko ta jakość")}
                  {numField("Active Circulation", "empire_active_circulation_wear", "Total Items")}
                  {numField("Liquidity %", "empire_liquidity_percent_wear")}
                  {numField("Trades 30d", "empire_trades_30d")}
                  {numField("Steam 30d Sales", "empire_steam_sales_30d")}
                </div>

                <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/50 space-y-3">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider border-b border-gray-800 pb-2">🔍 CSFloat – Rejestry</p>
                  {numField("Total Registered", "csfloat_total_registered_wear")}
                </div>
              </div>

              <ResultBox />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 mt-2">
                {loading ? "Dodaję Snapshot..." : "Rozpocznij Sync / Dodaj Edycję"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJsonSubmit} className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">{JSON_PROMPT}</pre>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Wklej JSON (tablica z wymaganymi polami)
                </label>
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  rows={10}
                  placeholder='[{ "weapon": "P2000", "name": "Fire Elemental", "price": 10.5, ... }]'
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none shadow-inner"
                />
              </div>

              <ResultBox />
              <button type="submit" disabled={loading || !jsonText.trim()} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50">
                {loading ? "Przetwarzam..." : "Importuj z JSON"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
