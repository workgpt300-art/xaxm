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
// 5000 енергії / 150 хв = 33.33 енергії в хвилину
const calculateEnergyRecovery = (user) => {
  const now = new Date();
  const lastUpdate = new Date(user.lastEnergyUpdate || user.updatedAt);
  const secondsPassed = (now.getTime() - lastUpdate.getTime()) / 1000;
  
  // Швидкість: 5000 / (150 * 60) = 0.555 енергії в секунду
  const recoveryRate = user.maxEnergy / (150 * 60); 
  const recovered = Math.floor(secondsPassed * recoveryRate);
  
  if (recovered > 0) {
    const newEnergy = Math.min(user.maxEnergy, user.energy + recovered);
    return { newEnergy, shouldUpdate: true };
  }
  return { newEnergy: user.energy, shouldUpdate: false };
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
        lastEnergyUpdate: new Date()
      }
    });
    res.json({ message: "User created", userId: user.id });
  } catch (e) { res.status(400).json({ error: "Email вже зайнятий" }); }
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

// Отримання даних профілю з авто-відновленням енергії
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Не знайдено" });

    const { newEnergy, shouldUpdate } = calculateEnergyRecovery(user);

    if (shouldUpdate) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { energy: newEnergy, lastEnergyUpdate: new Date() }
      });
      return res.json(updatedUser);
    }
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Помилка" }); }
});

// --- ІГРОВА ЛОГІКА ---
app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    // Спершу відновлюємо енергію, яка накопичилась до моменту кліку
    const { newEnergy } = calculateEnergyRecovery(user);

    if (newEnergy <= 0) return res.status(400).json({ error: "Немає енергії!" });

    const reward = (user.clickLevel || 1) * 0.01;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: reward },
        energy: newEnergy - 1,
        lastEnergyUpdate: new Date() // Важливо оновлювати час при кожному кліку
      }
    });

    res.json({ balance: updatedUser.balance, energy: updatedUser.energy, reward });
  } catch (err) { res.status(500).json({ error: "Помилка кліку" }); }
});

// Виконання завдань (включаючи Telegram)
app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body; // Очікуємо "tg_sub" або ID з бази
  try {
    // Перевіряємо, чи не виконував вже
    const alreadyDone = await prisma.userTask.findFirst({
      where: { userId: req.user.id, taskId: taskId }
    });
    if (alreadyDone) return res.status(400).json({ error: "Завдання вже виконано" });

    // Знаходимо нагороду. Якщо це ТГ, можна прописати вручну або взяти з бази
    let reward = 50.0; 
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) reward = task.reward;

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
  } catch (err) { res.status(500).json({ error: "Помилка виконання" }); }
});

// Бонус і Апгрейд залишаються без змін, але додай оновлення lastEnergyUpdate
app.post('/api/user/bonus', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: 1.0 },
        energy: user.maxEnergy,
        lastEnergyUpdate: new Date(),
        lastBonusDate: new Date()
      }
    });
    res.json({ message: "Бонус отримано!", balance: updatedUser.balance });
  } catch (err) { res.status(500).json({ error: "Помилка" }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер на порту ${PORT}`);
});
