// Mapowanie rzadkości skinów CS2 na kolory Tailwind i hex
export type RarityKey =
  | "Consumer Grade"
  | "Industrial Grade"
  | "Mil-Spec Grade"
  | "Restricted"
  | "Classified"
  | "Covert"
  | "Exceedingly Rare"
  | "Contraband"

export const RARITY_CONFIG: Record<RarityKey, {
  label: string
  textClass: string      // Tailwind text color
  bgClass: string        // Tailwind bg color (subtle)
  borderClass: string    // Tailwind border color
  hex: string            // do ewentualnego inline style
}> = {
  "Consumer Grade": {
    label: "Consumer Grade",
    textClass: "text-gray-300",
    bgClass: "bg-gray-700/40",
    borderClass: "border-gray-500",
    hex: "#b0b0b0",
  },
  "Industrial Grade": {
    label: "Industrial Grade",
    textClass: "text-blue-300",
    bgClass: "bg-blue-900/30",
    borderClass: "border-blue-400",
    hex: "#5e98d9",
  },
  "Mil-Spec Grade": {
    label: "Mil-Spec Grade",
    textClass: "text-blue-500",
    bgClass: "bg-blue-800/30",
    borderClass: "border-blue-600",
    hex: "#4b69ff",
  },
  "Restricted": {
    label: "Restricted",
    textClass: "text-purple-400",
    bgClass: "bg-purple-900/30",
    borderClass: "border-purple-500",
    hex: "#8847ff",
  },
  "Classified": {
    label: "Classified",
    textClass: "text-pink-400",
    bgClass: "bg-pink-900/30",
    borderClass: "border-pink-500",
    hex: "#d32ce6",
  },
  "Covert": {
    label: "Covert",
    textClass: "text-red-400",
    bgClass: "bg-red-900/30",
    borderClass: "border-red-500",
    hex: "#eb4b4b",
  },
  "Exceedingly Rare": {
    label: "★ Exceedingly Rare",
    textClass: "text-yellow-400",
    bgClass: "bg-yellow-900/30",
    borderClass: "border-yellow-400",
    hex: "#e4ae39",
  },
  "Contraband": {
    label: "Contraband",
    textClass: "text-orange-400",
    bgClass: "bg-orange-900/30",
    borderClass: "border-orange-500",
    hex: "#e7932e",
  },
}

export function getRarityConfig(rarity: string) {
  return RARITY_CONFIG[rarity as RarityKey] ?? {
    label: rarity,
    textClass: "text-gray-400",
    bgClass: "bg-gray-800/30",
    borderClass: "border-gray-600",
    hex: "#888888",
  }
}

// Wszystkie możliwe rzadkości jako lista
export const ALL_RARITIES = Object.keys(RARITY_CONFIG) as RarityKey[]
