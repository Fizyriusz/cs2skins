import { prisma } from "@/lib/prisma"
import { getRarityConfig } from "@/lib/rarity"
import { Price } from "@/components/Price"

const CONDITIONS = ["FN", "MW", "FT", "WW", "BS"]

const CONDITION_LABEL: Record<string, string> = {
  FN: "Factory New",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  WW: "Well-Worn",
  BS: "Battle-Scarred",
}

export default async function DashboardPage() {
  const skins = await prisma.skin.findMany({
    include: {
      marketData: {
        orderBy: { timestamp: 'desc' }
      }
    },
    orderBy: { rarity: 'asc' }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Market Dashboard</h2>
          <p className="text-gray-400 mt-1">Aktualne ceny skinów z podziałem na kondycję (wear)</p>
        </div>
        <span className="text-xs text-gray-500 border border-gray-700 px-3 py-1.5 rounded-full">{skins.length} skinów</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {skins.map((skin: any) => {
          const rarity = getRarityConfig(skin.rarity)

          // Pobierz najnowsze ceny dla każdej kondycji (zwykłe i ST)
          const normalPrices = CONDITIONS.map(cond =>
            skin.marketData.find((md: any) => md.condition === cond && !md.stattrak)
          )
          const stPrices = CONDITIONS.map(cond =>
            skin.marketData.find((md: any) => md.condition === cond && md.stattrak)
          )
          const hasStatTrak = stPrices.some(Boolean)

          return (
            <div
              key={skin.id}
              className={`rounded-xl p-6 shadow-xl border transition-all hover:shadow-2xl ${rarity.bgClass} ${rarity.borderClass}`}
              style={{ borderLeftWidth: 3, borderLeftColor: rarity.hex }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-700/60">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: rarity.hex }}>{rarity.label}</p>
                  <h3 className="text-xl font-bold tracking-tight">
                    <a href={`/skins/${skin.id}`} className="hover:text-orange-400 transition-colors">
                      {skin.weapon} <span className="text-gray-400">|</span> <span className="text-white">{skin.name}</span>
                    </a>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{skin.collection}</p>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Float: {skin.minFloat.toFixed(2)}–{skin.maxFloat.toFixed(2)}</p>
                    {skin.floatRequiredMax && (
                      <p className="text-orange-400/80">Input max: {skin.floatRequiredMax.toFixed(3)}</p>
                    )}
                  </div>
                  <a 
                    href={`/skins/${skin.id}`} 
                    className="inline-block text-[10px] font-bold bg-gray-800 hover:bg-orange-600 border border-gray-700 rounded px-2 py-1 text-gray-300 hover:text-white transition-all uppercase tracking-tighter"
                  >
                    Analiza Scenariusza
                  </a>
                </div>
              </div>

              {/* Condition Matrix - Normal */}
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {CONDITIONS.map((cond, idx) => {
                    const data = normalPrices[idx]
                    return (
                      <div
                        key={cond}
                        className={`rounded-lg p-2.5 flex flex-col items-center border transition-all hover:-translate-y-0.5 ${
                          data
                            ? "bg-gray-900/70 border-gray-700 hover:border-orange-500/60"
                            : "bg-gray-900/20 border-gray-800 opacity-50"
                        }`}
                      >
                        <span className="font-bold text-gray-300 text-xs">{cond}</span>
                        {data ? (
                          <>
                            <Price usd={data.steamPrice} className="text-green-400 font-semibold mt-1 text-sm" />
                            {data.externalPrice && (
                              <span className="text-gray-500 text-[10px] mt-0.5 pt-0.5 border-t border-gray-800 w-full text-center">
                                Ext: <Price usd={data.externalPrice} className="" />
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-700 mt-1 text-xs">–</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* StatTrak row (if any) */}
                {hasStatTrak && (
                  <div className="grid grid-cols-5 gap-2 text-center text-xs mt-1">
                    {CONDITIONS.map((cond, idx) => {
                      const data = stPrices[idx]
                      return (
                        <div
                          key={cond}
                          className={`rounded-lg p-2 flex flex-col items-center border ${
                            data
                              ? "bg-orange-900/20 border-orange-800/40"
                              : "bg-transparent border-transparent"
                          }`}
                        >
                          {data ? (
                            <>
                              <span className="text-orange-400 text-[10px] font-bold">ST™</span>
                              <Price usd={data.steamPrice} className="text-orange-300 font-semibold text-sm" />
                            </>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
