"use client";

import { useState } from "react";
import { getRarityConfig } from "@/lib/rarity";
import EditSkinModal from "@/components/EditSkinModal";
import { useRouter } from "next/navigation";

export default function SkinListClient({ initialSkins }: { initialSkins: any[] }) {
  const [editingSkin, setEditingSkin] = useState<any | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {initialSkins.map((skin: any) => {
          const rarity = getRarityConfig(skin.rarity);
          return (
            <div key={skin.id} className={`rounded-lg p-4 border transition-all hover:bg-white/5 ${rarity.bgClass} ${rarity.borderClass}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-white flex items-center gap-2">
                    <a href={`/skins/${skin.id}`} className="hover:text-orange-400 transition-colors">
                      {skin.weapon} | {skin.name}
                    </a>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {skin.sourceType === 'Case' ? '📦' : skin.sourceType === 'Armory' ? '🛡️' : skin.sourceType === 'Map' ? '🗺️' : '🏅'} {skin.collection}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingSkin(skin)}
                    className="flex justify-center items-center w-7 h-7 rounded bg-gray-900 border border-gray-700 hover:border-cyan-500 hover:text-cyan-400 transition-colors text-gray-400"
                    title="Edytuj Metadane"
                  >
                    ✏️
                  </button>
                  <a 
                    href={`/skins/${skin.id}`} 
                    className="text-[10px] font-bold bg-transparent border border-gray-700 hover:border-orange-500 px-2 py-1 rounded transition-colors"
                  >
                    ANALIZA
                  </a>
                  <span className={`text-xs font-bold px-2 py-1 flex items-center rounded-full border ${rarity.bgClass} ${rarity.textClass} ${rarity.borderClass}`}>
                    {rarity.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                <span>Float: {skin.minFloat.toFixed(2)} – {skin.maxFloat.toFixed(2)}</span>
                {skin.floatRequiredMin !== null && skin.floatRequiredMax !== null && (
                  <span className="text-orange-400">Wymagane input: {skin.floatRequiredMin?.toFixed(3)} – {skin.floatRequiredMax?.toFixed(3)}</span>
                )}
                {skin.notes && <span className="text-blue-300 italic w-full">{skin.notes}</span>}
              </div>
            </div>
          );
        })}
        {initialSkins.length === 0 && (
          <p className="text-gray-500 text-center py-8">Brak skinów w bazie. Dodaj je używając importera po lewej.</p>
        )}
      </div>

      {editingSkin && (
        <EditSkinModal skin={editingSkin} onClose={() => setEditingSkin(null)} onSuccess={handleSuccess} />
      )}
    </>
  );
}
