import { Suspense } from "react";
import BuyAndHoldClient from "./BuyAndHoldClient";
import { getDistinctWeapons } from "./actions";

export const metadata = {
  title: 'Buy & Hold Analysis | CS2 Skins',
};

export default async function BuyAndHoldPage() {
  const initialWeapons = await getDistinctWeapons();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          Buy & Hold Analysis
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Moduł do poszukiwania niedoszacowanych przedmiotów pod inwestycje długoterminowe. Przełączaj stany jakości, by na bieżąco analizować rzadkość i rentowność skinów lub naklejek.
        </p>
      </div>

      <Suspense fallback={<div className="text-gray-500 animate-pulse">Ładowanie interfejsu...</div>}>
        <BuyAndHoldClient defaultWeapons={initialWeapons} />
      </Suspense>
    </div>
  );
}
