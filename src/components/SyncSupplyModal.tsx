"use client";

import { useState } from "react";
import { syncSupplyStats, type SupplyStatInput } from "@/app/buy-and-hold/actions";
import { useRouter } from "next/navigation";

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"];

const BLANK: SupplyStatInput = {
  weapon: "",
  name: "",
  condition: "FN",
  globalSupplyWear: undefined,
  marketSupplyTotal: undefined,
  marketSupplyWear: undefined,
  marketLiquidity: undefined,
  marketActivity30d: undefined,
  steamSales30d: undefined,
};

// Prompt to show users how to format JSON
const JSON_PROMPT = `Skopiuj dane z Pricempire i CSFloat, a następnie wklej jako JSON do pola poniżej. Format:

[
  {
    "weapon": "P2000",
    "name": "Dispatch",
    "condition": "FN",
    "globalSupplyWear": 1200,
    "marketSupplyTotal": 9661,
    "marketSupplyWear": 45,
    "marketLiquidity": 63,
    "marketActivity30d": 34,
    "steamSales30d": 904
  }
]

Mapowanie danych z Pricempire (Trade Statistics):
• Total Items  → marketSupplyTotal
• Liquidity    → marketLiquidity
• Trades 30d   → marketActivity30d
• Steam Last 30d Sales → steamSales30d

Z CSFloat (zaznacz skin i odczytaj) → globalSupplyWear`;

interface SyncSupplyModalProps {
  onClose: () => void;
}

export default function SyncSupplyModal({ onClose }: SyncSupplyModalProps) {
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [form, setForm] = useState<SupplyStatInput>({ ...BLANK });
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ saved: number; errors: string[] } | null>(null);
  const router = useRouter();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await syncSupplyStats([form]);
    setResult(r);
    setLoading(false);
    if (r.saved > 0) {
      setTimeout(() => { router.refresh(); }, 1000);
    }
  };

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed: SupplyStatInput[] = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Oczekiwano tablicy JSON");
      const r = await syncSupplyStats(parsed);
      setResult(r);
      if (r.saved > 0) setTimeout(() => { router.refresh(); }, 1000);
    } catch (err: any) {
      setResult({ saved: 0, errors: [`Błąd parsowania JSON: ${err.message}`] });
    }
    setLoading(false);
  };

  const numField = (label: string, key: keyof SupplyStatInput, hint?: string) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">
        {label}
        {hint && <span className="font-normal text-gray-600 ml-1">({hint})</span>}
      </label>
      <input
        type="number"
        value={(form[key] as number | undefined) ?? ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">📊 Sync Danych Podażowych</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pricempire (Trade Stats) + CSFloat (Global Supply)</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {(["manual", "json"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {m === "manual" ? "✏️ Ręcznie" : "📋 Wklej JSON"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-4">
          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Broń</label>
                  <input
                    required
                    value={form.weapon}
                    onChange={e => setForm(f => ({ ...f, weapon: e.target.value }))}
                    placeholder="np. P2000"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Nazwa Skina</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="np. Dispatch"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Kondycja</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="border border-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">🌐 Pricempire – Trade Statistics</p>
                <div className="grid grid-cols-2 gap-3">
                  {numField("Total Items (wystawione łącznie)", "marketSupplyTotal", "Total Listed")}
                  {numField("Wystawione (ta kondycja)", "marketSupplyWear")}
                  {numField("Liquidity %", "marketLiquidity")}
                  {numField("Trades 30d", "marketActivity30d")}
                  {numField("Steam Last 30d Sales", "steamSales30d")}
                </div>
              </div>

              <div className="border border-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">🔍 CSFloat – Globalna Podaż</p>
                <div className="grid grid-cols-2 gap-3">
                  {numField("Globalnie wszystkie kondycje", "globalSupplyTotal")}
                  {numField("Globalnie ta kondycja", "globalSupplyWear")}
                </div>
              </div>

              {result && (
                <div className={`rounded-lg px-4 py-3 text-sm ${result.errors.length > 0 ? "bg-red-900/30 border border-red-700 text-red-300" : "bg-green-900/30 border border-green-700 text-green-300"}`}>
                  {result.saved > 0 && <p>✓ Zapisano {result.saved} wpis(ów)</p>}
                  {result.errors.map((e, i) => <p key={i}>✗ {e}</p>)}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {loading ? "Zapisuję..." : "Dodaj Wpis"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJsonSubmit} className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">{JSON_PROMPT}</pre>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Wklej JSON</label>
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  rows={10}
                  placeholder='[{ "weapon": "P2000", "name": "Dispatch", ... }]'
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              {result && (
                <div className={`rounded-lg px-4 py-3 text-sm ${result.errors.length > 0 ? "bg-red-900/30 border border-red-700 text-red-300" : "bg-green-900/30 border border-green-700 text-green-300"}`}>
                  {result.saved > 0 && <p>✓ Zapisano {result.saved} wpis(ów)</p>}
                  {result.errors.map((e, i) => <p key={i}>✗ {e}</p>)}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !jsonText.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {loading ? "Przetwarzam..." : "Importuj z JSON"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
