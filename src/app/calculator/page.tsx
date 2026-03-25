import { supabase } from "@/lib/supabase";
import CalculatorClient, { type SkinDataForCalc } from "./CalculatorClient";

export const dynamic = 'force-dynamic';

export default async function CalculatorPage() {
  const { data: rawSkins, error } = await supabase
    .from('Skin')
    .select(`
      *,
      marketData:MarketData (
        condition, stattrak, steamPrice, timestamp
      )
    `)
    .order('rarity', { ascending: true })
    .order('weapon', { ascending: true });

  const skins = (rawSkins || []).map(skin => {
    if (skin.marketData) {
      skin.marketData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return skin;
  });

  const toSkinData = (skin: typeof skins[number]): SkinDataForCalc => {
    // Latest price per condition (non-stattrak)
    const latestPrices: Record<string, number> = {};
    for (const cond of ["FN", "MW", "FT", "WW", "BS"]) {
      const entry = skin.marketData.find((md: { condition: string; stattrak: boolean; steamPrice: number }) =>
        md.condition === cond && !md.stattrak
      );
      if (entry) latestPrices[cond] = entry.steamPrice;
    }
    return {
      id: skin.id,
      name: skin.name,
      weapon: skin.weapon,
      collection: skin.collection,
      rarity: skin.rarity,
      minFloat: skin.minFloat,
      maxFloat: skin.maxFloat,
      latestPrices,
    };
  };

  const allSkins = skins.map(toSkinData);
  // "Output skins" are the same dataset — client filters by rarity/collection
  const outputSkins = allSkins;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          Kalkulator Trade-Up 2025
        </h2>
        <p className="text-gray-400 mt-2">
          Prawdziwa matematyka CS2: prawdopodobieństwo per kolekcja, znormalizowany float, pełne EV.
        </p>
      </header>

      {allSkins.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center">
          <p className="text-4xl mb-4">🗃️</p>
          <p className="text-gray-300 font-semibold">Brak skinów w bazie danych</p>
          <p className="text-gray-500 mt-2 text-sm">
            Dodaj skiny przez stronę{" "}
            <a href="/skins" className="text-orange-400 hover:underline">Baza Skinów</a>{" "}
            (wklej JSON lub użyj OCR) aby móc konfigurować kontrakt.
          </p>
        </div>
      ) : (
        <CalculatorClient allSkins={allSkins} outputSkins={outputSkins} />
      )}

      {/* Mechanics reference */}
      <details className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden group">
        <summary className="p-5 cursor-pointer text-sm font-semibold text-gray-300 hover:text-white flex items-center gap-2 select-none">
          <span className="text-orange-400 group-open:rotate-90 transition-transform inline-block">▶</span>
          📖 Jak działają trade-upy CS2 (2025) — referencja
        </summary>
        <div className="px-6 pb-6 text-sm text-gray-400 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2">Prawdopodobieństwo (2025)</h4>
              <p>Inputy są grupowane według kolekcji. Szansa kolekcji = liczba inputów z niej / łączna liczba inputów. Ta szansa dzielona jest równo na wszystkie skiny wyjściowe z danej kolekcji.</p>
              <pre className="bg-gray-900 rounded p-3 text-xs mt-2 font-mono text-gray-300">
{`Przykład: 10 inputów Mil-Spec
  9x Kolekcja A (1 output Restricted)
  1x Kolekcja B (3 outputy Restricted)

→ Kolekcja A: 9/10 = 90% → 1 skin = 90%
→ Kolekcja B: 1/10 = 10% → 3 skiny = 3.33% każdy`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Float (2025 — znormalizowany)</h4>
              <p>Każdy skin wejściowy jest normalizowany do [0,1] używając własnego zakresu float. Następnie obliczana jest średnia, która jest mapowana na zakres skina wyjściowego.</p>
              <pre className="bg-gray-900 rounded p-3 text-xs mt-2 font-mono text-gray-300">
{`norm = (inputFloat − skinMin) / (skinMax − skinMin)
avgNorm = avg(wszystkich norm)
outputFloat = outMin + avgNorm × (outMax − outMin)`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Regularny trade-up</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>10 skinów tej samej rzadkości</li>
                <li>Output = kolejna rzadkość w górę</li>
                <li>Nie można mieszać StatTrak™ i zwykłych</li>
                <li>Souvenir skiny są wykluczone</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Covert → Knife/Gloves (od X 2025)</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>5 skinów Covert (regularne lub StatTrak)</li>
                <li>5x StatTrak Covert → 1x StatTrak nóż z case'a</li>
                <li>5x zwykłe Covert → nóż lub rękawice z case'a</li>
                <li>Nie można mieszać StatTrak / zwykłych</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <h4 className="font-semibold text-white mb-2">Filler skiny</h4>
            <p className="text-xs">Fillery to tanie skiny tej samej rzadkości, służące do zapełnienia slotów. Najlepsze fillery: tanie, z kolekcji z małą liczbą outputów (nie psują szans), ze szerokim zakresem float (łatwiej sterować normą). Oznacz je przyciskiem "Filler" przy każdym inpucie aby je wyróżnić.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
