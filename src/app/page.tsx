import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700">
      {/* Logo / Title */}
      <div className="text-center space-y-3">
        <div className="text-5xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
            CS2 Analytics
          </span>
        </div>
        <p className="text-gray-400 text-lg">Wybierz moduł do pracy</p>
      </div>

      {/* Two Big Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

        {/* Trade-Up Calculator Card */}
        <Link
          href="/calculator"
          className="group relative rounded-2xl p-8 border border-gray-700 bg-gray-800/60 hover:bg-gray-800 hover:border-orange-500/60 transition-all duration-300 shadow-xl hover:shadow-orange-500/10 hover:shadow-2xl hover:-translate-y-1 flex flex-col gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
              🎯
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Kalkulator Trade-Up</h2>
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mt-0.5">Trade-Up Contracts</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed">
            Analizuj prawdopodobieństwa, wyliczaj EV, modeluj float output i dobieraj optymalne inputy do trade-upów CS2.
          </p>

          <div className="flex flex-wrap gap-2 text-xs">
            {["EV Kalkulator", "Float Optimizer", "Macierz Scenariuszy", "Fillery"].map(tag => (
              <span key={tag} className="bg-orange-500/10 border border-orange-500/20 text-orange-300 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-orange-400 group-hover:text-orange-300 transition-colors mt-auto">
            Otwórz Kalkulator
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Investment Hub Card */}
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 shadow-xl overflow-hidden flex flex-col">
          <div className="p-8 flex flex-col gap-5 flex-1">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
                📈
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Investment Hub</h2>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mt-0.5">Long-Term Analysis</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              Analizuj rynek pod kątem inwestycji długoterminowych. Szukaj niedoszacowanych skinów, obserwuj podaż i planuj zakupy.
            </p>

            <div className="flex flex-wrap gap-2 text-xs">
              {["Rarity Analysis", "Undervaluation Matrix", "Supply vs Demand", "GAP Score"].map(tag => (
                <span key={tag} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sub-modules list */}
          <div className="border-t border-gray-700 divide-y divide-gray-700/60">
            <Link
              href="/buy-and-hold"
              className="group flex items-center justify-between px-6 py-4 hover:bg-gray-700/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">💎</span>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">Buy &amp; Hold</p>
                  <p className="text-xs text-gray-500">Wykrywaj niedoszacowane skiny</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <div className="flex items-center justify-between px-6 py-4 opacity-40 cursor-not-allowed select-none">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔮</span>
                <div>
                  <p className="text-sm font-semibold text-white">Trend Scanner</p>
                  <p className="text-xs text-gray-500">Trendy cenowe (wkrótce)</p>
                </div>
              </div>
              <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-semibold">SOON</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Quick Links */}
      <div className="flex items-center gap-6 text-xs text-gray-600">
        <Link href="/market" className="hover:text-gray-400 transition-colors">Market Dashboard</Link>
        <span>·</span>
        <Link href="/skins" className="hover:text-gray-400 transition-colors">Baza Skinów</Link>
        <span>·</span>
        <Link href="/graph" className="hover:text-gray-400 transition-colors">Wykresy</Link>
        <span>·</span>
        <Link href="/input" className="hover:text-gray-400 transition-colors">Wprowadź Ceny</Link>
      </div>
    </div>
  );
}
