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

// --- КОНФІГУРАЦІЯ ЦІН (UPGRADES) ---
const UPGRADES_CONFIG = {
  multitap: { baseCost: 5.0, multiplier: 2.0, rewardAdd: 0.01 },
  energyLimit: { baseCost: 3.0, multiplier: 1.8, energyAdd: 500 }
};

const calculateCost = (base, mult, level) => base * Math.pow(mult, level - 1);

// --- ЛОГІКА ЕНЕРГІЇ ---
const calculateEnergyRecovery = (user) => {
  const now = new Date();
  const lastUpdate = new Date(user.lastEnergyUpdate || user.updatedAt || now);
  const secondsPassed = (now.getTime() - lastUpdate.getTime()) / 1000;
  
  const maxEng = user.maxEnergy || 5000;
  const recoveryRate = maxEng / (150 * 60); 
  const recovered = Math.floor(secondsPassed * recoveryRate);
  
  if (recovered > 0) {
    return { newEnergy: Math.min(maxEng, (user.energy || 0) + recovered), shouldUpdate: true };
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

// --- АВТОРИЗАЦІЯ (З РЕФЕРАЛАМИ) ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, referrerId } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Введіть дані" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = `XAXM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const user = await prisma.user.create({
      data: { 
        email, password: hashedPassword,
        energy: 5000, maxEnergy: 5000,
        clickLevel: 1, balance: referrerId ? 50.0 : 0.0, // Бонус $50 новачку за рефку
        referralCode,
        referrerId: referrerId || null,
        lastEnergyUpdate: new Date()
      }
    });

    // Якщо є реферер — даємо йому бонус $100 за друга
    if (referrerId) {
      await prisma.user.update({
        where: { id: referrerId },
        data: { balance: { increment: 100.0 } }
      }).catch(e => console.log("Referrer bonus failed", e));
    }

    res.json({ message: "User created", userId: user.id });
  } catch (e) { 
    res.status(400).json({ error: "Email вже зайнятий" }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ 
        where: { email },
        include: { referrals: true } // Додаємо список рефералів
    });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } else { res.status(401).json({ error: "Невірні дані" }); }
  } catch (err) { res.status(500).json({ error: "Помилка входу" }); }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
        where: { id: req.user.id },
        include: { referrals: true }
    });
    if (!user) return res.status(404).json({ error: "Не знайдено" });

    const { newEnergy, shouldUpdate } = calculateEnergyRecovery(user);
    if (shouldUpdate) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { energy: newEnergy, lastEnergyUpdate: new Date() },
        include: { referrals: true }
      });
      return res.json(updatedUser);
    }
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Серверна помилка" }); }
});

// --- ІГРОВА ЛОГІКА (TAP + REF COMMISSION) ---
app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { newEnergy } = calculateEnergyRecovery(user);

    if (newEnergy < 1) return res.status(400).json({ error: "Немає енергії!" });

    const reward = (user.clickLevel || 1) * 0.01;

    // Оновлюємо юзера
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: reward }, 
        energy: newEnergy - 1,
        lastEnergyUpdate: new Date()
      }
    });

    // ПАСИВНИЙ ДОХІД: 10% від кліку йде рефереру
    if (user.referrerId) {
        await prisma.user.update({
            where: { id: user.referrerId },
            data: { balance: { increment: reward * 0.1 } }
        }).catch(() => {});
    }

    res.json({ balance: updatedUser.balance, energy: updatedUser.energy, reward });
  } catch (err) { res.status(500).json({ error: "Помилка кліку" }); }
});

// --- МАГАЗИН ПОКРАЩЕНЬ ---
app.get('/api/upgrades', authenticateToken, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const energyLevel = Math.floor((user.maxEnergy - 5000) / 500) + 1;

    res.json([
      {
        id: 'multitap',
        name: 'Multitap',
        level: user.clickLevel,
        currentCost: calculateCost(UPGRADES_CONFIG.multitap.baseCost, UPGRADES_CONFIG.multitap.multiplier, user.clickLevel),
        description: `+$0.01 per tap`,
        icon: '☝️'
      },
      {
        id: 'energyLimit',
        name: 'Energy Limit',
        level: energyLevel,
        currentCost: calculateCost(UPGRADES_CONFIG.energyLimit.baseCost, UPGRADES_CONFIG.energyLimit.multiplier, energyLevel),
        description: '+500 Max Energy',
        icon: '🔋'
      }
    ]);
});

app.post('/api/upgrades/buy', authenticateToken, async (req, res) => {
    const { upgradeId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    let cost, data;
    if (upgradeId === 'multitap') {
        cost = calculateCost(UPGRADES_CONFIG.multitap.baseCost, UPGRADES_CONFIG.multitap.multiplier, user.clickLevel);
        if (user.balance < cost) return res.status(400).json({ error: "Insufficient balance" });
        data = { balance: user.balance - cost, clickLevel: user.clickLevel + 1 };
    } else if (upgradeId === 'energyLimit') {
        const level = Math.floor((user.maxEnergy - 5000) / 500) + 1;
        cost = calculateCost(UPGRADES_CONFIG.energyLimit.baseCost, UPGRADES_CONFIG.energyLimit.multiplier, level);
        if (user.balance < cost) return res.status(400).json({ error: "Insufficient balance" });
        data = { balance: user.balance - cost, maxEnergy: user.maxEnergy + 500 };
    }

    const updatedUser = await prisma.user.update({ where: { id: user.id }, data });
    res.json({ user: updatedUser });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 XAXM Server running on port ${PORT}`);
});
