import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Очищаємо старі завдання, щоб уникнути дублікатів
  await prisma.task.deleteMany({});

  const tasks = [
    {
      title: 'Підписатися на Telegram',
      description: 'Приєднуйся до нашої спільноти',
      reward: 0.5,
      category: 'Social'
    },
    {
      title: 'Перегляд відео',
      description: 'Подивись коротке промо-відео',
      reward: 1.2,
      category: 'Youtube'
    },
    {
      title: 'Запросити друга',
      description: 'Отримай бонус за кожного реферала',
      reward: 2.0,
      category: 'Referral'
    }
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: task,
    });
  }

  console.log('Database seeded! ✅');
}

main()
  .catch((e) => {
    console.error('Помилка під час сідування:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
