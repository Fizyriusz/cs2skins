import { supabase } from "@/lib/supabase";
import SkinImportClient from "@/components/SkinImportClient";
import SkinListClient from "./SkinListClient";

export const dynamic = 'force-dynamic';

export default async function SkinsPage() {
  const { data: rawSkins, error } = await supabase
    .from('Skin')
    .select(`*`)
    .order('rarity', { ascending: true });

  const skins = rawSkins || [];

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
          <SkinListClient initialSkins={skins} />
        </div>
      </div>
    </div>
  );
}
