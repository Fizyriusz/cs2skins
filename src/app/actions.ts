"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Typy ---
export type PriceImportItem = {
  skin: string;       // "P2000 | Dispatch" lub "Dispatch"
  weapon?: string;    // "P2000" (opcjonalne, jeśli skin zawiera już weapon | name)
  stattrak: boolean;
  quality: string;    // "Factory New" | "Minimal Wear" | "Field-Tested" | "Well-Worn" | "Battle-Scarred"
  steamPrice: number;
  externalPrice?: number;
};

export type SkinUpsertItem = {
  name: string;
  weapon: string;
  collection: string;
  rarity: string;
  minFloat: number;
  maxFloat: number;
  floatRequiredMin?: number;
  floatRequiredMax?: number;
  notes?: string;
};

const QUALITY_TO_CONDITION: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
  "FN": "FN",
  "MW": "MW",
  "FT": "FT",
  "WW": "WW",
  "BS": "BS",
};

// --- Bulk import cen ---
export async function bulkImportPrices(items: PriceImportItem[]) {
  const errors: string[] = [];
  let saved = 0;

  for (const item of items) {
    try {
      // Rozdziel "Weapon | Name" jeśli potrzeba
      let skinName = item.skin;
      let weaponName = item.weapon ?? "";

      if (item.skin.includes("|") && !weaponName) {
        const parts = item.skin.split("|").map(s => s.trim());
        weaponName = parts[0];
        skinName = parts[1];
      }

      const condition = QUALITY_TO_CONDITION[item.quality] ?? item.quality;

      // Znajdź skin w bazie
      const skin = await prisma.skin.findFirst({
        where: {
          name: skinName,
          ...(weaponName ? { weapon: weaponName } : {}),
        }
      });

      if (!skin) {
        errors.push(`Nie znaleziono skina: ${item.skin}`);
        continue;
      }

      await prisma.marketData.create({
        data: {
          skinId: skin.id,
          condition,
          stattrak: item.stattrak,
          steamPrice: item.steamPrice,
          externalPrice: item.externalPrice ?? null,
        }
      });
      saved++;
    } catch (e) {
      errors.push(`Błąd dla ${item.skin}: ${String(e)}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/graph");
  return { saved, errors };
}

// --- Upsert skinów ---
export async function upsertSkins(items: SkinUpsertItem[]) {
  const errors: string[] = [];
  let saved = 0;

  for (const item of items) {
    try {
      await prisma.skin.upsert({
        where: {
          id: (await prisma.skin.findFirst({
            where: {
              name: item.name,
              weapon: item.weapon,
            }
          }))?.id ?? "__NOT_FOUND__",
        },
        update: {
          collection: item.collection,
          rarity: item.rarity,
          minFloat: item.minFloat,
          maxFloat: item.maxFloat,
          floatRequiredMin: item.floatRequiredMin,
          floatRequiredMax: item.floatRequiredMax,
          notes: item.notes,
        },
        create: {
          name: item.name,
          weapon: item.weapon,
          collection: item.collection,
          rarity: item.rarity,
          minFloat: item.minFloat,
          maxFloat: item.maxFloat,
          floatRequiredMin: item.floatRequiredMin,
          floatRequiredMax: item.floatRequiredMax,
          notes: item.notes,
        }
      });
      saved++;
    } catch (e) {
      errors.push(`Błąd dla ${item.weapon} | ${item.name}: ${String(e)}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/skins");
  return { saved, errors };
}
