import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// --- НАЛАШТУВАННЯ CORS (Виправляє помилку на скриншоті) ---
app.use(cors({
  origin: '*', // Дозволяє запити з усіх адрес (включаючи твій фронтенд на Render)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// РЕЄСТРАЦІЯ
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ 
      data: { 
        email, 
        password: hashed,
        lastCheckIn: new Date(),
        lastEnergyUpdate: new Date()
      } 
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { 
    console.error("Register error:", e);
    res.status(400).json({ error: "Користувач вже існує або дані некоректні" }); 
  }
});

// ЛОГІН
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({ token, user });
    } else {
      res.status(400).json({ error: "Невірний email або пароль" });
    }
  } catch (e) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ОТРИМАННЯ ДАНИХ ПРО СЕБЕ
app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

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
  } catch (e) {
    res.status(500).json({ error: "Error fetching user" });
  }
});

// ТАП (КЛІК)
app.post('/api/user/tap', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const energy = calculateEnergy(user);
    if (energy < 1) return res.status(400).json({ error: "Немає енергії" });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: user.clickLevel * 0.01 },
        energy: energy - 1,
        lastEnergyUpdate: new Date()
      }
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Tap error" });
  }
});

// КОЛЕСО ФОРТУНИ
app.post('/api/spin', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const now = new Date();
    if (user.lastSpin && (now - new Date(user.lastSpin)) < 86400000) {
      return res.status(400).json({ error: "Спробуйте через 24 години" });
    }
    const win = [0.1, 0.5, 1, 2, 5][Math.floor(Math.random() * 5)];
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: win }, lastSpin: now }
    });
    res.json({ win, balance: updated.balance });
  } catch (e) {
    res.status(500).json({ error: "Spin error" });
  }
});

// МАГАЗИН АПГРЕЙДІВ
app.post('/api/upgrades/buy', auth, async (req, res) => {
  const { upgradeId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (upgradeId === 'miner_v1' && user.balance >= 50) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance - 50, passiveIncome: user.passiveIncome + 0.5 }
      });
      return res.json({ user: updated });
    }
    
    if (upgradeId === 'miner_v2' && user.balance >= 250) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { balance: user.balance - 250, passiveIncome: user.passiveIncome + 2.5 }
        });
        return res.json({ user: updated });
    }

    res.status(400).json({ error: "Недостатньо коштів" });
  } catch (e) {
    res.status(500).json({ error: "Upgrade error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
