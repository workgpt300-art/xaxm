import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 10000; 

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// --- ЛОГІКА ВІДНОВЛЕННЯ ЕНЕРГІЇ ---
const calculateEnergyRecovery = (user) => {
  const now = new Date();
  // Використовуємо lastEnergyUpdate або updatedAt, якщо першого ще немає в БД
  const lastUpdate = new Date(user.lastEnergyUpdate || user.updatedAt || now);
  const secondsPassed = (now.getTime() - lastUpdate.getTime()) / 1000;
  
  const maxEng = user.maxEnergy || 5000;
  const recoveryRate = maxEng / (150 * 60); // 150 хвилин до повного баку
  const recovered = Math.floor(secondsPassed * recoveryRate);
  
  if (recovered > 0) {
    const newEnergy = Math.min(maxEng, (user.energy || 0) + recovered);
    return { newEnergy, shouldUpdate: true };
  }
  return { newEnergy: user.energy || 0, shouldUpdate: false };
};

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Токен відсутній" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Токен недійсний" });
    req.user = user;
    next();
  });
};

// --- АВТОРИЗАЦІЯ ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Введіть дані" });

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { 
        email, password: hashedPassword,
        energy: 5000, maxEnergy: 5000,
        clickLevel: 1, balance: 0.0,
        // Спроба записати дату, Prisma проігнорує, якщо поля немає в схемі
        lastEnergyUpdate: new Date()
      }
    });
    res.json({ message: "User created", userId: user.id });
  } catch (e) { 
    console.error("Reg Error:", e);
    res.status(400).json({ error: "Email вже зайнятий або помилка БД" }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } else { res.status(401).json({ error: "Невірні дані" }); }
  } catch (err) { res.status(500).json({ error: "Помилка входу" }); }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Не знайдено" });

    const { newEnergy, shouldUpdate } = calculateEnergyRecovery(user);

    if (shouldUpdate) {
      const updateData = { energy: newEnergy };
      if ('lastEnergyUpdate' in user) updateData.lastEnergyUpdate = new Date();

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      return res.json(updatedUser);
    }
    res.json(user);
  } catch (err) { 
    console.error("Me Error:", err);
    res.status(500).json({ error: "Серверна помилка" }); 
  }
});

// --- ІГРОВА ЛОГІКА (TAP) ---
app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

    const { newEnergy } = calculateEnergyRecovery(user);

    if (newEnergy <= 0) return res.status(400).json({ error: "Немає енергії!" });

    const reward = (user.clickLevel || 1) * 0.01;

    const updateData = {
      balance: { increment: reward },
      energy: newEnergy - 1
    };

    // Додаємо поле тільки якщо воно існує в об'єкті user (захист 500 помилки)
    if ('lastEnergyUpdate' in user) {
      updateData.lastEnergyUpdate = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({ balance: updatedUser.balance, energy: updatedUser.energy, reward });
  } catch (err) { 
    console.error("Tap Error:", err);
    res.status(500).json({ error: "Помилка кліку" }); 
  }
});

// --- ЗАВДАННЯ ---
app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  try {
    const alreadyDone = await prisma.userTask.findFirst({
      where: { userId: req.user.id, taskId: taskId }
    });
    if (alreadyDone) return res.status(400).json({ error: "Вже виконано" });

    let reward = 50.0; // Дефолтна нагорода за ТГ
    
    // Спроба знайти нагороду в таблиці Task, якщо вона є
    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) reward = task.reward;
    } catch (e) { console.log("Task table check skipped"); }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { balance: { increment: reward } }
      }),
      prisma.userTask.create({
        data: { userId: req.user.id, taskId: taskId }
      })
    ]);

    res.json({ message: "Успіх!", newBalance: updatedUser.balance });
  } catch (err) { 
    console.error("Task Error:", err);
    res.status(500).json({ error: "Помилка виконання" }); 
  }
});

// --- БОНУС ---
app.post('/api/user/bonus', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const updateData = { 
      balance: { increment: 1.0 },
      energy: user.maxEnergy,
      lastBonusDate: new Date()
    };
    
    if ('lastEnergyUpdate' in user) updateData.lastEnergyUpdate = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    
    res.json({ message: "Бонус отримано!", balance: updatedUser.balance });
  } catch (err) { res.status(500).json({ error: "Помилка бонусу" }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер на порту ${PORT}`);
});
