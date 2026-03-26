-- Wklej ten kod w Supabase -> SQL Editor i kliknij "Run"

CREATE TABLE "Skin" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "weapon" TEXT NOT NULL,
  "collection" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "minFloat" REAL NOT NULL,
  "maxFloat" REAL NOT NULL,
  "floatRequiredMin" REAL,
  "floatRequiredMax" REAL,
  "notes" TEXT,
  "isActiveDrop" BOOLEAN NOT NULL DEFAULT true,
  "totalSupply" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "MarketData" (
  "id" TEXT PRIMARY KEY,
  "skinId" TEXT NOT NULL REFERENCES "Skin"("id") ON DELETE CASCADE,
  "condition" TEXT NOT NULL,
  "stattrak" BOOLEAN NOT NULL DEFAULT false,
  "steamPrice" REAL NOT NULL,
  "externalPrice" REAL,
  "volume" INTEGER,
  "timestamp" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "TradeUpBlueprint" (
  "id" TEXT PRIMARY KEY,
  "targetSkinId" TEXT NOT NULL REFERENCES "Skin"("id") ON DELETE CASCADE,
  "requiredInputRarity" TEXT NOT NULL,
  "requiredInputCollection" TEXT NOT NULL
);

CREATE TABLE "TradeUpSimulation" (
  "id" TEXT PRIMARY KEY,
  "targetSkinId" TEXT NOT NULL REFERENCES "Skin"("id") ON DELETE CASCADE,
  "targetCondition" TEXT NOT NULL,
  "inputSkinId" TEXT REFERENCES "Skin"("id") ON DELETE SET NULL,
  "inputCondition" TEXT,
  "targetAverageFloat" REAL NOT NULL,
  "costOf10Inputs" REAL NOT NULL,
  "targetValue" REAL NOT NULL,
  "averageFailValue" REAL NOT NULL,
  "evResult" REAL NOT NULL,
  "timestamp" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "UsageStat" (
  "id" TEXT PRIMARY KEY,
  "skinId" TEXT NOT NULL REFERENCES "Skin"("id") ON DELETE CASCADE,
  "month" TEXT NOT NULL,
  "usage" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX "MarketData_skinId_idx" ON "MarketData"("skinId");
CREATE INDEX "UsageStat_skinId_idx" ON "UsageStat"("skinId");

-- SupplyStat: podaż globalna (CSFloat) + rynkowa (Pricempire), snapshoty w czasie
CREATE TABLE "SupplyStat" (
  "id"                              TEXT PRIMARY KEY,
  "skinId"                          TEXT NOT NULL REFERENCES "Skin"("id") ON DELETE CASCADE,
  "condition"                       TEXT NOT NULL,
  "stattrak"                        BOOLEAN NOT NULL DEFAULT false,
  "price"                           REAL,
  "csfloat_total_registered_wear"   INTEGER,
  "empire_active_circulation_wear"  INTEGER,
  "empire_total_listings"           INTEGER,
  "empire_listings_wear"            INTEGER,
  "empire_liquidity_percent_wear"   REAL,
  "empire_trades_30d"               INTEGER,
  "empire_steam_sales_30d"          INTEGER,
  "recordedAt"                      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX "SupplyStat_skinId_idx" ON "SupplyStat"("skinId");
CREATE INDEX "SupplyStat_condition_idx" ON "SupplyStat"("condition");

