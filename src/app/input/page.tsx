import { prisma } from "@/lib/prisma";
import PriceImportClient from "@/components/PriceImportClient";

export default async function InputPage() {
  const skins = await prisma.skin.findMany({ orderBy: { weapon: "asc" } });
  const skinNames = skins.map(s => `${s.weapon} | ${s.name}`);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Wprowadź Ceny</h2>
        <p className="text-gray-400 mt-2">Wklej JSON z cenami, użyj OCR lub zrób to ręcznie — obsługuje StatTrak™ i wszystkie kondycje.</p>
      </header>
      <PriceImportClient skinNames={skinNames} />
    </div>
  );
}
