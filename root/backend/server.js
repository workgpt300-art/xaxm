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

// --- Допоміжні функції ---

const getLeague = (totalEarned) => {
  if (totalEarned > 5000) return "Diamond";
  if (totalEarned > 1000) return "Platinum";
  if (totalEarned > 500) return "Gold";
  if (totalEarned > 100) return "Silver";
  return "Bronze";
};

const calculateEnergy = (user) => {
  const now = new Date();
  const secondsPassed = (now - new Date(user.lastEnergyUpdate)) / 1000;
  const recovered = secondsPassed * (user.maxEnergy / 9000); 
  return Math.min(user.maxEnergy, user.energy + recovered);
};

const calculateOffline = (user) => {
  const now = new Date();
  const hours = (now - new Date(user.lastCheckIn)) / (1000 * 60 * 60);
  const cappedHours = Math.min(hours, 12); 
  return parseFloat((cappedHours * user.passiveIncome).toFixed(4));
};

// --- Middleware ---
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) { res.status(401).json({ error: "Invalid token" }); }
};

// --- Маршрути ---

// НОВИЙ МАРШРУТ ДЛЯ НАГОРОД (ВИПРАВЛЯЄ 404)
app.post('/api/user/reward', auth, async (req, res) => {
  const { amount, taskId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    // Перевірка чи завдання вже виконано
    if (user.completedTasks && user.completedTasks.includes(taskId)) {
      return res.status(400).json({ error: "Task already completed" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: { increment: parseFloat(amount) },
        totalEarned: { increment: parseFloat(amount) },
        completedTasks: { push: taskId }, // Додаємо ID завдання в список
        league: getLeague(user.totalEarned + parseFloat(amount))
      }
    });

    res.json({ message: "Reward claimed", user: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Reward error" });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ 
      data: { email, password: hashed }
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { res.status(400).json({ error: "User already exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } else {
    res.status(400).json({ error: "Invalid credentials" });
  }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const offlineEarned = calculateOffline(user);
    const currentEnergy = calculateEnergy(user);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        balance: { increment: offlineEarned },
        totalEarned: { increment: offlineEarned },
        energy: currentEnergy,
        league: getLeague(user.totalEarned + offlineEarned),
        lastCheckIn: new Date(),
        lastEnergyUpdate: new Date()
      }
    });
    res.json({ ...updated, offlineEarned });
  } catch (e) { res.status(500).json({ error: "Sync error" }); }
});

app.post('/api/user/tap', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const energy = calculateEnergy(user);
    if (energy < 1) return res.status(400).json({ error: "Low energy" });

    const tapValue = user.clickLevel * 0.01;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: tapValue },
        totalEarned: { increment: tapValue },
        energy: energy - 1,
        league: getLeague(user.totalEarned + tapValue),
        lastEnergyUpdate: new Date()
      }
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: "Tap error" }); }
});

app.post('/api/spin', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const now = new Date();
    if (user.lastSpin && (now - new Date(user.lastSpin)) < 86400000) return res.status(400).json({ error: "Try tomorrow" });

    const win = [0.5, 1, 2, 5, 10][Math.floor(Math.random() * 5)];
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: win }, totalEarned: { increment: win }, lastSpin: now }
    });
    res.json({ win, balance: updated.balance });
  } catch (e) { res.status(500).json({ error: "Spin error" }); }
});

app.post('/api/upgrades/buy', auth, async (req, res) => {
  const { upgradeId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const costs = { 'miner_v1': 50, 'miner_v2': 250, 'multitap': 100 };
    if (user.balance < costs[upgradeId]) return res.status(400).json({ error: "No money" });

    let updateData = { balance: { decrement: costs[upgradeId] } };
    if (upgradeId === 'miner_v1') updateData.passiveIncome = { increment: 0.5 };
    if (upgradeId === 'miner_v2') updateData.passiveIncome = { increment: 2.5 };
    if (upgradeId === 'multitap') updateData.clickLevel = { increment: 1 };

    const updated = await prisma.user.update({ where: { id: user.id }, data: updateData });
    res.json({ user: updated });
  } catch (e) { res.status(500).json({ error: "Buy error" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
