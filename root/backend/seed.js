import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");
  
  // Очищення старих завдань (необов'язково)
  await prisma.userTask.deleteMany({});
  await prisma.task.deleteMany({});

  console.log("Inserting new tasks...");

  await prisma.task.create({
    data: {
      title: "Підписатися на Telegram",
      reward: 0.5,
      type: "SOCIAL"
    }
  });

  await prisma.task.create({
    data: {
      title: "Запросити 3 друзів",
      reward: 1.0,
      type: "REFERRAL"
    }
  });

  console.log("Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("Помилка під час сідування:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
