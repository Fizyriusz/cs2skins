import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Clean old data if any
  await prisma.marketData.deleteMany()
  await prisma.tradeUpSimulation.deleteMany()
  await prisma.tradeUpBlueprint.deleteMany()
  await prisma.skin.deleteMany()

  // 1. Create Target Skin
  const p2000 = await prisma.skin.create({
    data: {
      name: "Dispatch",
      weapon: "P2000",
      collection: "The Control Collection",
      rarity: "Mil-Spec Grade",
      minFloat: 0.00,
      maxFloat: 0.65,
    }
  })

  // 2. Create Input Skin
  const m4a4 = await prisma.skin.create({
    data: {
      name: "Global Offensive",
      weapon: "M4A4",
      collection: "The Control Collection",
      rarity: "Industrial Grade",
      minFloat: 0.00,
      maxFloat: 0.60, // Przykładowe wartości
    }
  })

  // 3. Add Market Data for Target
  await prisma.marketData.createMany({
    data: [
      { skinId: p2000.id, condition: "FN", steamPrice: 2.50, externalPrice: 2.10 },
      { skinId: p2000.id, condition: "MW", steamPrice: 1.80, externalPrice: 1.50 },
      { skinId: p2000.id, condition: "FT", steamPrice: 1.10, externalPrice: 0.90 },
      { skinId: p2000.id, condition: "WW", steamPrice: 0.90, externalPrice: 0.80 },
      { skinId: p2000.id, condition: "BS", steamPrice: 0.85, externalPrice: 0.75 },
    ]
  })

  // 4. Add Market Data for Input
  await prisma.marketData.createMany({
    data: [
      { skinId: m4a4.id, condition: "FN", steamPrice: 0.60, externalPrice: 0.50 },
      { skinId: m4a4.id, condition: "MW", steamPrice: 0.45, externalPrice: 0.40 },
      { skinId: m4a4.id, condition: "FT", steamPrice: 0.30, externalPrice: 0.25 },
    ]
  })

  // 5. Blueprint example
  await prisma.tradeUpBlueprint.create({
    data: {
      targetSkinId: p2000.id,
      requiredInputRarity: "Industrial Grade",
      requiredInputCollection: "The Control Collection"
    }
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
