import { supabase } from "@/lib/supabase";
import SkinImportClient from "@/components/SkinImportClient";
import { getRarityConfig } from "@/lib/rarity";

export const dynamic = 'force-dynamic';

export default async function SkinsPage() {
  const { data: rawSkins, error } = await supabase
    .from('Skin')
    .select(`
      *,
      marketData:MarketData (
        condition, stattrak, steamPrice, externalPrice, timestamp
      )
    `)
    .order('rarity', { ascending: true });

  const skins = (rawSkins || []).map(skin => {
    if (skin.marketData) {
      skin.marketData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return skin;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Zarządzanie Skinami</h2>
        <p className="text-gray-400 mt-2">Dodaj lub zaktualizuj skiny w bazie — możesz wkleić JSON, użyć OCR lub wrzucić zdjęcie do LLM.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Import Tool */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-6">Import / Aktualizacja Skinów</h3>
          <SkinImportClient />
        </div>

        {/* Skin List */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Baza Skinów ({skins.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {skins.map((skin: any) => {
              const rarity = getRarityConfig(skin.rarity);
              return (
                <div key={skin.id} className={`rounded-lg p-4 border transition-all hover:bg-white/5 ${rarity.bgClass} ${rarity.borderClass}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">
                        <a href={`/skins/${skin.id}`} className="hover:text-orange-400 transition-colors">
                          {skin.weapon} | {skin.name}
                        </a>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{skin.collection}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <a 
                        href={`/skins/${skin.id}`} 
                        className="text-[10px] font-bold bg-transparent border border-gray-700 hover:border-orange-500 px-2 py-1 rounded transition-colors"
                      >
                        ANALIZA
                      </a>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${rarity.bgClass} ${rarity.textClass} ${rarity.borderClass}`}>
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
            {skins.length === 0 && (
              <p className="text-gray-500 text-center py-8">Brak skinów w bazie. Dodaj je używając importera po lewej.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
