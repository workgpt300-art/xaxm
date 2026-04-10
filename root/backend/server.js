import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// --- ДОПОМІЖНІ ФУНКЦІЇ ---

// Визначення ліги
const getLeague = (total) => {
  if (total >= 5000) return "Diamond";
  if (total >= 1000) return "Platinum";
  if (total >= 500) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
};

// Функція оновлення стану користувача (Енергія + Пасивний прибуток)
const updatePlayerState = async (user) => {
  const now = new Date();
  const lastUpdate = new Date(user.updatedAt);
  const secondsPassed = Math.floor((now - lastUpdate) / 1000);

  if (secondsPassed <= 0) return user;

  // 1. Нарахування пасивного прибутку (за секунду)
  const passiveGain = (user.passiveIncome / 3600) * secondsPassed;

  // 2. Відновлення енергії (повне відновлення за 15 хв = 900 сек)
  const energyGain = (user.maxEnergy / 900) * secondsPassed;
  const newEnergy = Math.min(user.maxEnergy, user.energy + energyGain);

  return await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: passiveGain },
      totalEarned: { increment: passiveGain },
      energy: newEnergy,
      updatedAt: now // Оновлюємо мітку часу
    }
  });
};

// Middleware для перевірки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API МАРШРУТИ ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword,
        referralCode: Math.random().toString(36).substring(7).toUpperCase(),
        energy: 1000,
        maxEnergy: 1000,
        balance: 0,
        passiveIncome: 0,
        clickLevel: 1,
        totalEarned: 0
      }
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { res.status(400).json({ error: "User already exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const updatedUser = await updatePlayerState(user);
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: updatedUser });
  } catch (e) { res.status(500).json({ error: "Login failed" }); }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const updatedUser = await updatePlayerState(user);
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user.id } });
    user = await updatePlayerState(user);

    if (user.energy < 1) return res.status(400).json({ error: "No energy" });

    const { bonus } = req.body;
    const clickValue = (user.clickLevel * 0.01) + (bonus || 0);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: clickValue },
        totalEarned: { increment: clickValue },
        totalClicks: { increment: 1 },
        energy: { decrement: 1 },
        league: getLeague(user.totalEarned + clickValue)
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    console.error("Tap Error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// НАГОРОДИ ЗА КВЕСТИ ТА ВІКТОРІНИ
app.post('/api/user/reward', authenticateToken, async (req, res) => {
  try {
    const { amount, taskId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Перевірка, чи не отримував вже нагороду за цей таск (якщо у тебе є поле completedTasks у схемі)
    // Якщо поля немає, просто нараховуємо:
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount }
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: "Reward failed" });
  }
});

app.post('/api/upgrades/buy', authenticateToken, async (req, res) => {
  try {
    const { upgradeId } = req.body;
    let user = await prisma.user.findUnique({ where: { id: req.user.id } });
    user = await updatePlayerState(user);

    const items = {
      'miner_v1': { cost: 50, passive: 0.5, click: 0 },
      'miner_v2': { cost: 250, passive: 2.5, click: 0 },
      'multitap': { cost: 100, passive: 0, click: 1 }
    };

    const item = items[upgradeId];
    if (!item) return res.status(400).json({ error: "Item not found" });
    if (user.balance < item.cost) return res.status(400).json({ error: "Insufficient balance" });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: item.cost },
        passiveIncome: { increment: item.passive },
        clickLevel: { increment: item.click }
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/spin', authenticateToken, async (req, res) => {
  try {
    const win = parseFloat((Math.random() * 5).toFixed(2));
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: { increment: win },
        totalEarned: { increment: win }
      }
    });
    res.json({ win, user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
