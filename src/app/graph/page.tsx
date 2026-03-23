import { prisma } from "@/lib/prisma"
import PriceChart from "@/components/PriceChart"

export default async function GraphPage() {
  const skins = await prisma.skin.findMany({
    include: {
      marketData: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Wykresy Historyczne</h2>
        <p className="text-gray-400 mt-2">Analiza trendów cenowych na platformie Steam i zewnętrznych serwisach w osi czasu.</p>
      </header>

      <div className="space-y-12">
        {skins.map(skin => {
          // Pokazujemy wykres połączony dla Factory New (najbardziej miarodajny)
          // Lub można wyciągnąć opcję wyboru kondycji za pomocą stanu (client component). Dla uproszczenia pokażemy dane FN.
          const fnData = skin.marketData.filter(md => md.condition === "FN");
          
          if (fnData.length === 0) return null;

          const chartData = fnData.map(d => ({
            date: new Date(d.timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            steamPrice: d.steamPrice,
            externalPrice: d.externalPrice,
          }));

          return (
            <div key={skin.id} className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
              <h3 className="text-2xl font-bold text-white">{skin.weapon} | {skin.name} <span className="text-sm text-gray-400 font-normal ml-2">(Factory New)</span></h3>
              <p className="text-gray-500 text-sm mb-6">{skin.collection}</p>
              
              <PriceChart data={chartData} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
