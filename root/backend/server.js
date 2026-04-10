import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Оптимізована ініціалізація Prisma для усунення помилок 500
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "&connection_limit=3&pool_timeout=20",
    },
  },
});

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
}));
app.use(express.json());

const userLocks = new Set();

const getLeague = (total) => {
  if (total >= 5000) return "Diamond";
  if (total >= 1000) return "Platinum";
  if (total >= 500) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
};

const updatePlayerState = async (user) => {
  // ЗАХИСТ: Якщо немає дати оновлення, просто повертаємо користувача без розрахунків
  if (!user || !user.updatedAt) return user;

  const now = new Date();
  const lastUpdate = new Date(user.updatedAt);
  const secondsPassed = Math.floor((now - lastUpdate) / 1000);

  // Якщо пройшло менше секунди — не чіпаємо базу
  if (secondsPassed <= 0) return user;

  const passiveGain = (user.passiveIncome / 3600) * secondsPassed;
  const energyGain = (user.maxEnergy / 900) * secondsPassed;
  const newEnergy = Math.min(user.maxEnergy, user.energy + energyGain);

  try {
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: passiveGain || 0 },
        totalEarned: { increment: passiveGain || 0 },
        energy: newEnergy || user.energy,
        updatedAt: now 
      }
    });
  } catch (e) {
    console.error("Update State Error:", e.message);
    return user; // Повертаємо старі дані, якщо запис зайнятий
  }
};

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

// --- МАРШРУТИ ---

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
        totalEarned: 0,
        league: "Bronze",
        updatedAt: new Date() // Додаємо початкову дату
      }
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { res.status(400).json({ error: "Email already taken" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    // Використовуємо захищене оновлення
    const updatedUser = await updatePlayerState(user);
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: updatedUser });
  } catch (e) { 
    console.error("Login route error:", e);
    res.status(500).json({ error: "Login failed" }); 
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const updatedUser = await updatePlayerState(user);
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: "Sync error" }); }
});

app.post('/api/user/tap', authenticateToken, async (req, res) => {
  if (userLocks.has(req.user.id)) return res.status(429).json({ error: "Too fast" });
  
  userLocks.add(req.user.id);
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user.id } });
    user = await updatePlayerState(user);
    
    if (!user || user.energy < 1) {
      return res.status(400).json({ error: "No energy" });
    }

    const { bonus } = req.body;
    const clickValue = (user.clickLevel * 0.01) + (bonus || 0);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: clickValue },
        totalEarned: { increment: clickValue },
        totalClicks: { increment: 1 },
        energy: { decrement: 1 },
        league: getLeague(user.totalEarned + clickValue),
        updatedAt: new Date()
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    console.error("Database Error:", e.message);
    res.status(500).json({ error: "Server busy" });
  } finally {
    setTimeout(() => userLocks.delete(req.user.id), 50);
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
        clickLevel: { increment: item.click },
        updatedAt: new Date()
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: "Buy failed" });
  }
});

app.post('/api/user/reward', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
        updatedAt: new Date()
      }
    });
    res.json({ user: updatedUser });
  } catch (e) { res.status(500).json({ error: "Reward error" }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
