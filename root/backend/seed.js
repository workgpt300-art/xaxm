const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  const tasks = [
    { title: 'Subscribe to Telegram', reward: 0.50 },
    { title: 'Follow on Twitter (X)', reward: 0.75 },
    { title: 'Watch Promo Video', reward: 1.00 }
  ]
  for (const task of tasks) {
    await prisma.task.upsert({
      where: { title: task.title },
      update: {},
      create: task,
    })
  }
  console.log('Database seeded! ✅')
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
