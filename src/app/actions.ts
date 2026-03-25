"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// --- Typy ---
export type PriceImportItem = {
  skin: string;
  weapon?: string;
  stattrak: boolean;
  quality: string;
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

export async function bulkImportPrices(items: PriceImportItem[]) {
  const errors: string[] = [];
  let saved = 0;

  for (const item of items) {
    try {
      let skinName = item.skin;
      let weaponName = item.weapon ?? "";

      if (item.skin.includes("|") && !weaponName) {
        const parts = item.skin.split("|").map(s => s.trim());
        weaponName = parts[0];
        skinName = parts[1];
      }

      const condition = QUALITY_TO_CONDITION[item.quality] ?? item.quality;

      const { data: skins, error: findError } = await supabase
        .from('Skin')
        .select('id')
        .eq('name', skinName)
        .eq('weapon', weaponName)
        .limit(1);

      if (findError || !skins || skins.length === 0) {
        errors.push(`Nie znaleziono skina: ${item.skin}`);
        continue;
      }

      const { error: insertError } = await supabase.from('MarketData').insert({
        id: crypto.randomUUID(),
        skinId: skins[0].id,
        condition,
        stattrak: item.stattrak,
        steamPrice: item.steamPrice,
        externalPrice: item.externalPrice ?? null,
      });

      if (insertError) throw insertError;
      saved++;
    } catch (e: any) {
      errors.push(`Błąd dla ${item.skin}: ${e.message || String(e)}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/graph");
  return { saved, errors };
}

export async function upsertSkins(items: SkinUpsertItem[]) {
  const errors: string[] = [];
  let saved = 0;

  for (const item of items) {
    try {
      // Szukamy czy skin już istnieje
      const { data: existingSkins } = await supabase
        .from('Skin')
        .select('id')
        .eq('name', item.name)
        .eq('weapon', item.weapon)
        .limit(1);

      const existingId = existingSkins?.[0]?.id;

      const skinData = {
        name: item.name,
        weapon: item.weapon,
        collection: item.collection,
        rarity: item.rarity,
        minFloat: item.minFloat,
        maxFloat: item.maxFloat,
        floatRequiredMin: item.floatRequiredMin,
        floatRequiredMax: item.floatRequiredMax,
        notes: item.notes,
      };

      if (existingId) {
        const { error: updateError } = await supabase
          .from('Skin')
          .update(skinData)
          .eq('id', existingId);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('Skin')
          .insert({
            id: crypto.randomUUID(),
            ...skinData
          });
          
        if (insertError) throw insertError;
      }
      
      saved++;
    } catch (e: any) {
      errors.push(`Błąd dla ${item.weapon} | ${item.name}: ${e.message || String(e)}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/skins");
  return { saved, errors };
}
