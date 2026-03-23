import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getRarityConfig } from "@/lib/rarity";
import { getSkinScenarioMatrix, getRequiredInputFloat, CONDITION_LABELS } from "@/lib/calculator";
import Link from "next/link";
import { Price } from "@/components/Price";

export default async function SkinDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const skin = await prisma.skin.findUnique({
    where: { id },
    include: {
      marketData: { orderBy: { timestamp: "desc" } }
    }
  });

  if (!skin) notFound();

  const rarity = getRarityConfig(skin.rarity);
  const matrix = getSkinScenarioMatrix(skin.minFloat, skin.maxFloat);

  // Zdobądź najnowsze ceny (zwykłe i ST)
  const getLatestPrice = (cond: string, st: boolean) => {
    return skin.marketData.find((md: any) => md.condition === cond && md.stattrak === st)?.steamPrice;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link href="/" className="text-sm text-gray-500 hover:text-orange-400 transition-colors flex items-center gap-1">
        ← Wróć do Dashboardu
      </Link>

      <header className="flex flex-wrap justify-between items-start gap-4 bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
        <div 
          className="absolute left-0 top-0 bottom-0 w-2" 
          style={{ backgroundColor: rarity.hex }} 
        />
        <div className="z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: rarity.hex }}>
            {rarity.label}
          </p>
          <h2 className="text-4xl font-black text-white">
            {skin.weapon} <span className="text-orange-500">|</span> {skin.name}
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <span>Kolekcja: {skin.collection}</span>
            <span className="text-gray-600">•</span>
            <span>Float: {skin.minFloat.toFixed(3)} – {skin.maxFloat.toFixed(3)}</span>
          </p>
        </div>
        
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 backdrop-blur-sm">
          <p className="text-xs text-gray-500 mb-1">Status w bazie</p>
          <p className="text-green-500 font-bold">Połączony z rynkiem ✓</p>
        </div>
      </header>

      {/* Scenarios Matrix */}
      <section className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          📊 Macierz Scenariuszy Trade-Up
          <span className="text-xs font-normal text-gray-500">(Czego szukać na rynku / CSFloat)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-2">Kondycja Celu</th>
                <th className="py-4 px-2">Wymagana Średnia (%)</th>
                <th className="py-4 px-2">Szukaj Float (avg)</th>
                <th className="py-4 px-2 text-right">Cena Normalna</th>
                <th className="py-4 px-2 text-right">Cena StatTrak™</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => {
                // Obliczamy wymagany średni float wejściowy zakładając standardowe wejście 0.00-1.00
                // (najczęstszy scenariusz dla fillerów lub map collections)
                const neededAvgInput = getRequiredInputFloat(row.reqNormalizedMax, 0, 1);
                const isPossible = row.reqNormalizedMax > 0;
                
                const priceNormal = getLatestPrice(row.code, false);
                const priceST = getLatestPrice(row.code, true);

                return (
                  <tr key={row.code} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors group">
                    <td className="py-5 px-2">
                      <p className="font-bold text-gray-200">{row.label}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{row.code}</p>
                    </td>
                    <td className="py-5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{(row.reqNormalizedMax * 100).toFixed(1)}%</span>
                        <div className="w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${row.reqNormalizedMax * 100}%` }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 italic">znormalizowany limit</p>
                    </td>
                    <td className="py-5 px-2">
                      {!isPossible ? (
                        <span className="text-red-500 text-xs py-1 px-2 bg-red-900/20 rounded">Niemożliwe</span>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-orange-400">avg &lt; {neededAvgInput.toFixed(4)}</p>
                          <p className="text-[10px] text-gray-500">dla wejść 0–1 float</p>
                        </div>
                      )}
                    </td>
                    <td className="py-5 px-2 text-right font-mono">
                      {priceNormal ? (
                        <Price usd={priceNormal} className="text-green-400 font-bold" />
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-5 px-2 text-right font-mono">
                      {priceST ? (
                        <Price usd={priceST} className="text-orange-400 font-bold" />
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Strategy / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-950/20 border border-orange-900/30 rounded-2xl p-6">
          <h4 className="text-orange-500 font-bold mb-3 flex items-center gap-2">
            💡 Pro-Tip
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            Jeśli celujesz w <strong>{skin.name} (Factory New)</strong>, szukaj 10 skinów wejściowych (np. o niskim rzadkości z tej samej kolekcji), których średni float nie przekracza <strong>{getRequiredInputFloat(matrix[0].reqNormalizedMax, 0, 1).toFixed(4)}</strong>. 
            <br/><br/>
            Pamiętaj, że jeśli Twoje wejścia mają inne zakresy niż 0.00-1.00, znormalizowana wartość (procent) pozostaje bez zmian, ale raw float do szukania na Steamie będzie inny.
          </p>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h4 className="text-white font-bold mb-3">Notatki kontraktowe</h4>
          <p className="text-sm text-gray-400 italic">
            {skin.notes || "Brak dodatkowych notatek dla tego skina. Możesz je dodać w zakładce 'Baza Skinów'."}
          </p>
        </div>
      </div>
    </div>
  );
}
