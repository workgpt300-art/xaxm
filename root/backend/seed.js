import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  try {
    // Очищуємо таблиці через SQL, щоб уникнути помилок зв'язків
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "UserTask", "Task" RESTART IDENTITY CASCADE;`);
    console.log('Tables cleared successfully.');
  } catch (error) {
    console.log('Truncate failed, trying manual delete...');
    await prisma.userTask.deleteMany({});
    await prisma.task.deleteMany({});
  }

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

  console.log('Inserting new tasks...');
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
