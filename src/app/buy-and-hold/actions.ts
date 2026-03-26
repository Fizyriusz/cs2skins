"use server";

import { supabase } from "@/lib/supabase";

export async function getDistinctWeapons() {
  const { data, error } = await supabase
    .from('Skin')
    .select('weapon');
  
  if (error) {
    console.error("Error fetching weapons:", error);
    return [];
  }
  
  const weapons = Array.from(new Set(data.map((d: any) => d.weapon))).sort();
  return weapons;
}

export async function getRarityAnalysis(weapon: string, condition: string) {
  // Fetch skins and their latest market data
  const { data: skins, error: skinsError } = await supabase
    .from('Skin')
    .select(`
      id, name, weapon, collection, isActiveDrop, totalSupply,
      MarketData (
        condition, steamPrice, externalPrice, volume, timestamp
      )
    `)
    .eq('weapon', weapon);
    
  if (skinsError || !skins) return [];

  const parsed = skins.map((skin: any) => {
    // filter condition manually, supabase raw join might bring all
    const market = skin.MarketData?.filter((m: any) => m.condition === condition)
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    return {
      id: skin.id,
      name: skin.name,
      weapon: skin.weapon,
      collection: skin.collection,
      isActiveDrop: skin.isActiveDrop,
      totalSupply: skin.totalSupply,
      price: market?.steamPrice || 0,
      externalPrice: market?.externalPrice || null,
      volume: market?.volume || 0
    };
  });

  return parsed.sort((a: any, b: any) => a.totalSupply - b.totalSupply);
}

export async function getUndervaluationMatrix(category: string, condition: string) {
  const { data: skins, error } = await supabase
    .from('Skin')
    .select(`
      id, name, weapon,
      MarketData (
        condition, steamPrice, timestamp
      ),
      UsageStat (
        usage, createdAt
      )
    `)
    .eq('weapon', category);

  if (error || !skins) return [];

  const parsedSkins = skins.map((skin: any) => {
    const market = skin.MarketData?.filter((m: any) => m.condition === condition)
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    const usage = skin.UsageStat?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      id: skin.id,
      name: skin.name,
      weapon: skin.weapon,
      price: market?.steamPrice || 0,
      monthlyUsage: usage?.usage || 0
    };
  });

  const sortedByPrice = [...parsedSkins].sort((a, b) => a.price - b.price);
  const byPriceRank = new Map(sortedByPrice.map((item, index) => [item.id, index + 1]));

  const sortedByUsage = [...parsedSkins].sort((a, b) => b.monthlyUsage - a.monthlyUsage);
  const byUsageRank = new Map(sortedByUsage.map((item, index) => [item.id, index + 1]));

  return parsedSkins.map(item => {
    const priceRank = byPriceRank.get(item.id) || 0;
    const usageRank = byUsageRank.get(item.id) || 0;
    const gap = usageRank - priceRank;
    return {
      ...item,
      priceRank,
      usageRank,
      gap
    };
  }).sort((a, b) => b.gap - a.gap);
}

export type SupplyStatInput = {
  weapon: string;
  name: string;
  condition: string;
  stattrak: boolean;
  price?: number;
  recordedAt?: string;
  csfloat_total_registered_wear?: number;
  empire_active_circulation_wear?: number;
  empire_total_listings?: number;
  empire_listings_wear?: number;
  empire_liquidity_percent_wear?: number;
  empire_trades_30d?: number;
  empire_steam_sales_30d?: number;
};

export async function syncSupplyStats(items: SupplyStatInput[]) {
  const errors: string[] = [];
  let saved = 0;

  for (const item of items) {
    try {
      const { data: skins } = await supabase
        .from('Skin')
        .select('id')
        .eq('weapon', item.weapon)
        .eq('name', item.name)
        .limit(1);

      if (!skins || skins.length === 0) {
        errors.push(`Nie znaleziono skina: ${item.weapon} | ${item.name}`);
        continue;
      }

      const insertPayload: any = {
        id: crypto.randomUUID(),
        skinId: skins[0].id,
        condition: item.condition,
        stattrak: item.stattrak ?? false,
        price: item.price ?? null,
        csfloat_total_registered_wear: item.csfloat_total_registered_wear ?? null,
        empire_active_circulation_wear: item.empire_active_circulation_wear ?? null,
        empire_total_listings: item.empire_total_listings ?? null,
        empire_listings_wear: item.empire_listings_wear ?? null,
        empire_liquidity_percent_wear: item.empire_liquidity_percent_wear ?? null,
        empire_trades_30d: item.empire_trades_30d ?? null,
        empire_steam_sales_30d: item.empire_steam_sales_30d ?? null,
      };

      if (item.recordedAt) {
        insertPayload.recordedAt = item.recordedAt;
      }

      const { error } = await supabase.from('SupplyStat').insert(insertPayload);

      if (error) throw error;
      saved++;
    } catch (e: any) {
      errors.push(`Błąd dla ${item.weapon} | ${item.name}: ${e.message || String(e)}`);
    }
  }

  return { saved, errors };
}

export async function toggleSkinActiveStatus(skinId: string, currentStatus: boolean) {
  const { error } = await supabase
    .from('Skin')
    .update({ isActiveDrop: !currentStatus })
    .eq('id', skinId);
  return { success: !error };
}

export async function getSupplyStats(weapon: string) {
  // Zwraca WSZYSTKIE najnowsze warianty dla danego skina (żeby móc zagregować globalnie)
  const { data: skins } = await supabase
    .from('Skin')
    .select('id, name, weapon, isActiveDrop')
    .eq('weapon', weapon);

  if (!skins || skins.length === 0) return [];
  const skinIds = skins.map((s: any) => s.id);

  const { data: stats } = await supabase
    .from('SupplyStat')
    .select('*')
    .in('skinId', skinIds)
    .order('recordedAt', { ascending: false });

  if (!stats) return [];

  // Dla każdego skina chcemy tylko najnowszy snapshot dla DANEJ PARY (condition, stattrak)
  const latestVariants = new Map<string, any>();
  for (const s of stats) {
    const key = `${s.skinId}_${s.condition}_${s.stattrak}`;
    if (!latestVariants.has(key)) {
      latestVariants.set(key, s);
    }
  }

  // Grupujemy warianty po skinie
  return skins.map((skin: any) => {
    const variants = Array.from(latestVariants.values()).filter(v => v.skinId === skin.id);
    return {
      skinId: skin.id,
      name: skin.name,
      isActiveDrop: skin.isActiveDrop,
      variants,
    };
  });
}

