const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors());
app.use(express.json());

// --- Допоміжні функції ---
const calculateEnergy = (user) => {
  const now = new Date();
  const secondsPassed = (now - new Date(user.lastEnergyUpdate)) / 1000;
  const recovered = secondsPassed * (user.maxEnergy / 9000); 
  return Math.min(user.maxEnergy, user.energy + recovered);
};

const calculateOffline = (user) => {
  const now = new Date();
  const hours = (now - new Date(user.lastCheckIn)) / (1000 * 60 * 60);
  const cappedHours = Math.min(hours, 12); // Макс за 12 годин
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
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, password: hashed } });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { res.status(400).json({ error: "User exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } else { res.status(400).json({ error: "Invalid credentials" }); }
});

app.get('/api/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const offlineEarned = calculateOffline(user);
  const currentEnergy = calculateEnergy(user);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { 
      balance: { increment: offlineEarned },
      energy: currentEnergy,
      lastCheckIn: new Date(),
      lastEnergyUpdate: new Date()
    }
  });
  res.json({ ...updated, offlineEarned });
});

app.post('/api/user/tap', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const energy = calculateEnergy(user);
  if (energy < 1) return res.status(400).json({ error: "No energy" });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: user.clickLevel * 0.01 },
      energy: energy - 1,
      lastEnergyUpdate: new Date()
    }
  });
  res.json(updated);
});

app.post('/api/spin', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const now = new Date();
  if (user.lastSpin && (now - new Date(user.lastSpin)) < 86400000) {
    return res.status(400).json({ error: "Wait 24h" });
  }
  const win = [0.1, 0.5, 1, 2, 5][Math.floor(Math.random() * 5)];
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { balance: { increment: win }, lastSpin: now }
  });
  res.json({ win, balance: updated.balance });
});

app.post('/api/upgrades/buy', auth, async (req, res) => {
  const { upgradeId } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  
  if (upgradeId === 'miner_v1' && user.balance >= 50) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { balance: user.balance - 50, passiveIncome: user.passiveIncome + 0.5 }
    });
    return res.json({ user: updated });
  }
  res.status(400).json({ error: "Not enough money or invalid ID" });
});

app.listen(5000, () => console.log('Server running on port 5000'));
