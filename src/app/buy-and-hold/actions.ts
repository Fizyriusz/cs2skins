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
