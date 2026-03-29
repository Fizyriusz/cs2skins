"use client";

import { useState, useEffect } from "react";
import { upsertSkins } from "@/app/actions";
import { searchSkinsByWeapon } from "@/app/buy-and-hold/actions";

const RARITY_OPTIONS = [
  "Consumer Grade",
  "Industrial Grade",
  "Mil-Spec Grade",
  "Restricted",
  "Classified",
  "Covert",
  "Contraband",
];

const SOURCE_OPTIONS = [
  "Case",
  "Armory",
  "Map",
  "Operation"
];

interface AddSkinModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddSkinModal({ onClose, onSuccess }: AddSkinModalProps) {
  const [form, setForm] = useState({
    weapon: "",
    name: "",
    collection: "",
    rarity: "Mil-Spec Grade",
    sourceType: "Case",
    minFloat: "0.00",
    maxFloat: "1.00",
    isActiveDrop: true,
    totalSupply: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingSkins, setExistingSkins] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [jsonImport, setJsonImport] = useState("");

  const handleJsonImport = (val: string) => {
    setJsonImport(val);
    try {
      const data = JSON.parse(val);
      if (data && typeof data === 'object') {
        let minFloat = form.minFloat;
        let maxFloat = form.maxFloat;
        let sourceType = form.sourceType;
        
        if (data.floatRange) {
          const parts = data.floatRange.split("-").map((p: string) => p.trim().replace(',', '.'));
          if (parts.length === 2) {
            minFloat = parseFloat(parts[0]).toFixed(2);
            maxFloat = parseFloat(parts[1]).toFixed(2);
          }
        }
        
        // Zgadywanie SourceType
        const colLower = (data.collection || "").toLowerCase();
        if (colLower.includes("case") || colLower.includes("skrzynia")) sourceType = "Case";
        else if (colLower.includes("armory") || colLower.includes("zbrojownia")) sourceType = "Armory";
        else if (colLower.includes("operation") || colLower.includes("operacja")) sourceType = "Operation";
        else sourceType = "Map"; 
        
        setForm(f => ({
          ...f,
          weapon: data.weapon || f.weapon,
          name: data.name || f.name,
          collection: data.collection || f.collection,
          rarity: data.rarity || f.rarity,
          sourceType: data.sourceType || sourceType,
          minFloat: data.minFloat?.toString() || minFloat,
          maxFloat: data.maxFloat?.toString() || maxFloat,
        }));
        
        // Wyczyść po załadowaniu
        setTimeout(() => setJsonImport(""), 800);
      }
    } catch(e) {
      // Ignorujemy, po prostu textarea jeszcze nie ma pełnego poprawnego JSONa
    }
  };

  useEffect(() => {
    if (form.weapon.length > 1) {
      setLoadingExisting(true);
      const timer = setTimeout(() => {
        searchSkinsByWeapon(form.weapon.trim()).then(data => {
          setExistingSkins(data);
          setLoadingExisting(false);
        });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setExistingSkins([]);
    }
  }, [form.weapon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await upsertSkins([{
        weapon: form.weapon.trim(),
        name: form.name.trim(),
        collection: form.collection.trim(),
        rarity: form.rarity,
        sourceType: form.sourceType,
        minFloat: parseFloat(form.minFloat),
        maxFloat: parseFloat(form.maxFloat),
        notes: form.notes.trim() || undefined,
      }]);

      if (result.errors.length > 0) {
        setError(result.errors[0]);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      setError(e.message || "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text", placeholder?: string) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        required={["weapon", "name", "collection"].includes(key)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/80">
          <div>
            <h2 className="text-lg font-bold text-white">Dodaj Skina</h2>
            <p className="text-xs text-gray-500 mt-0.5">Skin trafi do ogólnej bazy danych</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 bg-cyan-950/20 border-b border-cyan-900/40">
          <label className="block text-xs font-bold text-cyan-400 mb-2">⚡ Szybki Import AI (Opcjonalnie)</label>
          <textarea
            value={jsonImport}
            onChange={e => handleJsonImport(e.target.value)}
            placeholder='Wklej wygenerowany JSON z GPT (np. { "weapon": "Glock-18", "name": "Green Line", ... } ) żeby automatycznie uzupełnić formularz.'
            className="w-full bg-gray-900 border border-cyan-800/50 rounded-lg px-3 py-2 text-xs text-cyan-300 placeholder-cyan-800/70 focus:outline-none focus:border-cyan-500 transition-colors resize-none h-16"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field("Broń / Kategoria", "weapon", "text", "np. P2000, Knife, Sticker")}
            {field("Nazwa Skina", "name", "text", "np. Dispatch")}
          </div>

          {field("Kolekcja", "collection", "text", "np. The Train Collection")}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Rzadkość</label>
              <select
                value={form.rarity}
                onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                {RARITY_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Typ Źródła</label>
              <select
                value={form.sourceType}
                onChange={e => setForm(f => ({ ...f, sourceType: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                {SOURCE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field("Min Float", "minFloat", "number", "0.00")}
            {field("Max Float", "maxFloat", "number", "1.00")}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Notatki (opcjonalne)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="np. Dobry kandydat do buy & hold, niska podaż..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          {/* DUPLICATE PREVENTION: Existing Skins View */}
          {form.weapon.length > 1 && (
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-cyan-400 font-semibold mb-2">
                Obecnie w bazie dla: <span className="text-white">{form.weapon.trim()}</span>
              </div>
              {loadingExisting ? (
                <div className="text-xs text-gray-500 animate-pulse">Szukanie w bazie...</div>
              ) : existingSkins.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {existingSkins.map((s, i) => (
                    <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700">
                      {s.name} <span className="opacity-50">({s.collection})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-emerald-500">Brak zarejestrowanych skinów (kategoria czysta).</div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300 text-center">
              ✓ Skin dodany pomyślnie!
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Zapisuję..." : "Dodaj Skina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
