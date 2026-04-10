import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors({
  origin: '*',
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

// Генерація унікального реф-коду
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

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
        referralCode: generateReferralCode(), // Додано генерацію коду
        lastCheckIn: new Date(),
        lastEnergyUpdate: new Date(),
        createdAt: new Date(), // Фіксуємо дату реєстрації
      } 
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { 
    console.error("Register error:", e);
    res.status(400).json({ error: "Користувач вже існує" }); 
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
  } catch (e) { res.status(500).json({ error: "Помилка сервера" }); }
});

// ОТРИМАННЯ ДАНИХ (Оновлено для профілю)
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

    // Додаємо більше даних для фронтенду
    res.json({ 
      ...updated, 
      offlineEarned,
      registrationDate: updated.createdAt,
      serverTime: new Date()
    });
  } catch (e) { res.status(500).json({ error: "Error fetching user" }); }
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
  } catch (e) { res.status(500).json({ error: "Tap error" }); }
});

// КОЛЕСО ФОРТУНИ
app.post('/api/spin', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const now = new Date();
    
    // Перевірка 24 години
    if (user.lastSpin && (now - new Date(user.lastSpin)) < 86400000) {
       const nextSpin = new Date(new Date(user.lastSpin).getTime() + 86400000);
       return res.status(400).json({ 
         error: "Колесо доступне раз на добу", 
         availableAt: nextSpin 
       });
    }

    const prizes = [0.1, 0.5, 1, 2, 5, 10];
    const win = prizes[Math.floor(Math.random() * prizes.length)];
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        balance: { increment: win }, 
        lastSpin: now 
      }
    });
    res.json({ win, balance: updated.balance });
  } catch (e) { res.status(500).json({ error: "Spin error" }); }
});

// МАГАЗИН
app.post('/api/upgrades/buy', auth, async (req, res) => {
  const { upgradeId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const shopItems = {
      'miner_v1': { price: 50, income: 0.5 },
      'miner_v2': { price: 250, income: 2.5 },
      'multitap': { price: 100, clickIncrease: 1 }
    };

    const item = shopItems[upgradeId];
    if (!item || user.balance < item.price) {
      return res.status(400).json({ error: "Недостатньо коштів або предмет не знайдено" });
    }

    const updateData = { balance: { decrement: item.price } };
    if (item.income) updateData.passiveIncome = { increment: item.income };
    if (item.clickIncrease) updateData.clickLevel = { increment: item.clickIncrease };

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    res.json({ user: updated });
  } catch (e) { res.status(500).json({ error: "Upgrade error" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
