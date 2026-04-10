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

// Визначення ліги
const getLeague = (total) => {
  if (total >= 5000) return "Diamond";
  if (total >= 1000) return "Platinum";
  if (total >= 500) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
};

// --- API МАРШРУТИ ---

// Реєстрація та Логін (ти їх вже мав, залишаю базову логіку)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword,
        referralCode: Math.random().toString(36).substring(7).toUpperCase()
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
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (e) { res.status(500).json({ error: "Login failed" }); }
});

// Отримання даних користувача
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ОБРОБКА ТАПІВ (Виправляє помилку 500)
app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const { bonus } = req.body; // Отримуємо бонус від комбо з фронта
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user.energy < 1) return res.status(400).json({ error: "No energy" });

    // Розрахунок прибутку: (рівень кліку * 0.01) + бонус
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

// КУПІВЛЯ АПГРЕЙДІВ (Виправляє помилку 500)
app.post('/api/upgrades/buy', authenticateToken, async (req, res) => {
  try {
    const { upgradeId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Магазин (ID мають збігатися з фронтендом)
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
    console.error("Upgrade Error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// СПІН (Виправляє помилку 500)
app.post('/api/spin', authenticateToken, async (req, res) => {
  try {
    const win = parseFloat((Math.random() * 5).toFixed(2)); // Випадковий приз
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: { increment: win },
        totalEarned: { increment: win }
      }
    });
    res.json({ win, user: updatedUser });
  } catch (e) {
    console.error("Spin Error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
