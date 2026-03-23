// ============================================================
// CS2 Trade-Up Calculator — 2025 Rules (post-October update)
// ============================================================

// --- Rarity Chain (regular trade-ups) ---
export const RARITY_CHAIN = [
  "Consumer Grade",
  "Industrial Grade",
  "Mil-Spec Grade",
  "Restricted",
  "Classified",
  "Covert",
] as const;

export type Rarity = (typeof RARITY_CHAIN)[number];

/** Returns the output rarity for a given input rarity (one step up). null if Covert (handled separately). */
export function getOutputRarity(inputRarity: string): string | null {
  const idx = RARITY_CHAIN.indexOf(inputRarity as Rarity);
  if (idx === -1 || idx >= RARITY_CHAIN.length - 1) return null;
  return RARITY_CHAIN[idx + 1];
}

// --- Wear condition labels & float thresholds ---
export const CONDITION_LABELS: Record<string, string> = {
  FN: "Factory New",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  WW: "Well-Worn",
  BS: "Battle-Scarred",
};

/** Returns "FN" | "MW" | "FT" | "WW" | "BS" for a given float value (global wear thresholds). */
export function getConditionFromFloat(f: number): string {
  if (f < 0.07) return "FN";
  if (f < 0.15) return "MW";
  if (f < 0.38) return "FT";
  if (f < 0.45) return "WW";
  return "BS";
}

// ============================================================
// FLOAT MATH (2025 correct formula)
// ============================================================

/**
 * Normalize an input skin's float using that skin's own float range.
 * Clamps the value to [skinMin, skinMax] first.
 * normalized = (inputFloat − skinMin) / (skinMax − skinMin)
 */
export function normalizeFloat(
  inputFloat: number,
  skinMin: number,
  skinMax: number
): number {
  if (skinMax <= skinMin) return 0;
  const clamped = Math.max(skinMin, Math.min(skinMax, inputFloat));
  return (clamped - skinMin) / (skinMax - skinMin);
}

/**
 * Given an array of normalized values (one per input skin), compute their average.
 */
export function averageNormalized(normalizedValues: number[]): number {
  if (normalizedValues.length === 0) return 0;
  return normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length;
}

/**
 * Map a normalized average back into a specific output skin's float range.
 * outputFloat = outMin + avgNormalized × (outMax − outMin)
 */
export function denormalizeFloat(
  avgNormalized: number,
  outMin: number,
  outMax: number
): number {
  return outMin + avgNormalized * (outMax - outMin);
}

/**
 * Inverse of denormalize: Given a desired target float, calculate what normalized average is needed.
 * avgNormalized = (targetFloat - outMin) / (outMax - outMin)
 */
export function getRequiredNormalized(
  targetFloat: number,
  outMin: number,
  outMax: number
): number {
  if (outMax <= outMin) return 0;
  return (targetFloat - outMin) / (outMax - outMin);
}

/**
 * Given a required normalized value and an input skin's range, find the required raw float.
 * requiredFloat = inMin + reqNormalized * (inMax - inMin)
 */
export function getRequiredInputFloat(
  reqNormalized: number,
  inMin: number,
  inMax: number
): number {
  return inMin + reqNormalized * (inMax - inMin);
}

/**
 * Returns the exact numeric thresholds for a specific skin to land in FN, MW, etc.
 * and the required AVERAGE input float (assuming generic 0-1 range inputs) to hit them.
 */
export function getSkinScenarioMatrix(skinMin: number, skinMax: number) {
  const steps = [
    { label: "Factory New", code: "FN", threshold: 0.07 },
    { label: "Minimal Wear", code: "MW", threshold: 0.15 },
    { label: "Field-Tested", code: "FT", threshold: 0.38 },
    { label: "Well-Worn", code: "WW", threshold: 0.45 },
    { label: "Battle-Scarred", code: "BS", threshold: 1.00 },
  ];

  return steps.map((step, idx) => {
    const prevThreshold = idx === 0 ? 0 : steps[idx - 1].threshold;
    // We target the MIDDLE of the range for safety, OR the boundary for "extreme low float"
    const targetValue = step.threshold - 0.0001; 
    
    // avgNormalized needed to hit EXACTLY the threshold boundary
    const reqNormalizedAtBoundary = getRequiredNormalized(step.threshold, skinMin, skinMax);
    
    return {
      ...step,
      reqNormalizedMax: Math.min(1, Math.max(0, reqNormalizedAtBoundary)),
      // How much leeway you have (0-1 scale)
    };
  });
}

// ============================================================
// PROBABILITY CALCULATION (2025 correct formula)
// ============================================================

export type InputForOdds = {
  collection: string; // e.g. "The Control Collection"
};

export type OutputForOdds = {
  skinId: string;
  name: string;
  weapon: string;
  collection: string;
  minFloat: number;
  maxFloat: number;
  latestPrice?: number; // steam price for EV
};

export type OddsResult = OutputForOdds & {
  probability: number;       // 0–1
  outputFloat: number;       // calculated output float
  outputCondition: string;   // "FN" | "MW" | ...
};

/**
 * Calculate probabilities for each output skin according to CS2 2025 rules:
 * - Inputs are grouped by collection.
 * - Each collection gets a share = (# inputs from it) / (total inputs).
 * - That share is split evenly among all valid output skins from that collection.
 *
 * Also computes expected output float for each output skin.
 *
 * @param inputs       Array of input skins (with collection + per-skin float info)
 * @param outputs      All possible output skins at the target rarity (must match collections used in inputs)
 * @param avgNormalized The pre-computed average normalized float from all inputs
 */
export function calculateContractOdds(
  inputs: InputForOdds[],
  outputs: OutputForOdds[],
  avgNormalized: number
): OddsResult[] {
  const total = inputs.length;
  if (total === 0) return [];

  // Count inputs per collection
  const collectionCount: Record<string, number> = {};
  for (const inp of inputs) {
    collectionCount[inp.collection] = (collectionCount[inp.collection] ?? 0) + 1;
  }

  // Group outputs by collection
  const outputsByCollection: Record<string, OutputForOdds[]> = {};
  for (const out of outputs) {
    if (!outputsByCollection[out.collection]) outputsByCollection[out.collection] = [];
    outputsByCollection[out.collection].push(out);
  }

  const results: OddsResult[] = [];

  for (const [collection, count] of Object.entries(collectionCount)) {
    const collOutputs = outputsByCollection[collection];
    if (!collOutputs || collOutputs.length === 0) continue; // no outputs from this coll → those inputs are "wasted"

    const collectionShare = count / total;
    const perSkinProb = collectionShare / collOutputs.length;

    for (const out of collOutputs) {
      const outputFloat = denormalizeFloat(avgNormalized, out.minFloat, out.maxFloat);
      results.push({
        ...out,
        probability: perSkinProb,
        outputFloat,
        outputCondition: getConditionFromFloat(outputFloat),
      });
    }
  }

  // Sort by probability desc
  return results.sort((a, b) => b.probability - a.probability);
}

// ============================================================
// EV CALCULATION
// ============================================================

/**
 * Calculates the Expected Value of a trade-up contract.
 * EV = Σ(probability × outcomeValue) − totalInputCost
 */
export function calculateContractEV(
  outcomes: { probability: number; value: number }[],
  totalInputCost: number
): number {
  const expectedReturn = outcomes.reduce((sum, o) => sum + o.probability * o.value, 0);
  return expectedReturn - totalInputCost;
}

// ============================================================
// INPUT VALIDATION HELPERS
// ============================================================

export type TradeUpType = "regular" | "covert";

export interface ContractInput {
  skinId: string;
  name: string;
  weapon: string;
  collection: string;
  rarity: string;
  skinMinFloat: number;
  skinMaxFloat: number;
  float: number;
  pricePerItem: number;
  stattrak: boolean;
  isFiller: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  inputRarity: string | null;
  outputRarity: string | null;
  requiredCount: number;
}

export function validateContract(
  inputs: ContractInput[],
  tradeUpType: TradeUpType
): ValidationResult {
  const requiredCount = tradeUpType === "covert" ? 5 : 10;
  const errors: string[] = [];

  if (inputs.length === 0) return { valid: false, errors: [], inputRarity: null, outputRarity: null, requiredCount };
  if (inputs.length > requiredCount) errors.push(`Maksymalnie ${requiredCount} inputów.`);

  // All must share same rarity
  const rarities = [...new Set(inputs.map(i => i.rarity))];
  if (rarities.length > 1) errors.push("Wszystkie inputy muszą być tej samej rzadkości.");

  // All must share same StatTrak status
  const stStatuses = [...new Set(inputs.map(i => i.stattrak))];
  if (stStatuses.length > 1) errors.push("Nie można mieszać StatTrak™ i zwykłych skinów.");

  // For Covert type, input rarity must be Covert
  if (tradeUpType === "covert" && rarities[0] !== "Covert") {
    errors.push("Covert trade-up wymaga skinów rzadkości Covert.");
  }

  const inputRarity = rarities[0] ?? null;
  const outputRarity = tradeUpType === "covert" ? "Knife / Gloves" : getOutputRarity(inputRarity ?? "");

  return {
    valid: errors.length === 0,
    errors,
    inputRarity,
    outputRarity,
    requiredCount,
  };
}
