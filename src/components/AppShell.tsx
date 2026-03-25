"use client";

import { CurrencyProvider, CurrencyToggle } from "@/lib/currency";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <nav className="border-b border-gray-800 bg-gray-950 p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            CS2 Trade-Up Calc
          </h1>
          <div className="flex items-center gap-6">
            <div className="space-x-5 text-sm font-medium hidden md:flex">
              <a href="/" className="hover:text-orange-400 transition-colors">Dashboard</a>
              <a href="/calculator" className="hover:text-orange-400 transition-colors">Kalkulator EV</a>
              <a href="/input" className="hover:text-orange-400 transition-colors">Wprowadź Ceny</a>
              <a href="/skins" className="hover:text-orange-400 transition-colors">Baza Skinów</a>
              <a href="/buy-and-hold" className="hover:text-orange-400 transition-colors text-emerald-400 font-bold">Buy & Hold</a>
            </div>
            <CurrencyToggle />
          </div>
        </div>
      </nav>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>
    </CurrencyProvider>
  );
}
