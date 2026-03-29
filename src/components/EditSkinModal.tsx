"use client";

import { useState } from "react";
import { updateSkinMetadata } from "@/app/buy-and-hold/actions";

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

interface EditSkinModalProps {
  skin: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditSkinModal({ skin, onClose, onSuccess }: EditSkinModalProps) {
  const [form, setForm] = useState({
    name: skin.name || "",
    collection: skin.collection || "",
    rarity: skin.rarity || "Mil-Spec Grade",
    sourceType: skin.sourceType || "Case"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await updateSkinMetadata(skin.id, {
        name: form.name.trim(),
        collection: form.collection.trim(),
        rarity: form.rarity,
        sourceType: form.sourceType
      });

      if (!result.success) {
        setError(result.error || "Nie udało się zapisać zmian.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      }
    } catch (e: any) {
      setError(e.message || "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
        required
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
      <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/80">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ✏️ Edytuj Skina
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{skin.weapon} | {skin.name}</p>
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {field("Nazwa Skina", "name")}
          {field("Kolekcja", "collection")}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Rzadkość</label>
              <select
                value={form.rarity}
                onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {SOURCE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300 text-center">
              ✓ Zmiany zapisane
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Zapisuję..." : "Zapisz Zmiany"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
