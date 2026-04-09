import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- АВТОРИЗАЦІЯ ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { email, password: hashedPassword }
    });
    res.json({ message: "User created", userId: user.id });
  } catch (e) { 
    res.status(400).json({ error: "Email already exists" }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, balance: user.balance } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Отримати профіль (з логікою відновлення енергії)
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Проста регенерація енергії: +1 енергія за кожні 60 сек з моменту створення запису (або останнього оновлення)
    // Для реальної гри краще використовувати `updatedAt`, але поки просто віддаємо як є
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- ЛОГІКА МАЙНЕРА ---

// 1. Клік (Tap)
app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (user.energy <= 0) {
      return res.status(400).json({ error: "Немає енергії!" });
    }

    const reward = user.clickLevel * 0.01; // Заробіток залежить від рівня

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: reward },
        energy: { decrement: 1 }
      }
    });

    res.json({ balance: updatedUser.balance, energy: updatedUser.energy, reward });
  } catch (err) {
    res.status(500).json({ error: "Tap error" });
  }
});

// 2. Апгрейд (Upgrade)
app.post('/api/user/upgrade', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const cost = user.clickLevel * 5.0; // Ціна: 1lvl-$5, 2lvl-$10...

    if (user.balance < cost) {
      return res.status(400).json({ error: `Потрібно $${cost.toFixed(2)}` });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { decrement: cost },
        clickLevel: { increment: 1 },
        maxEnergy: { increment: 50 }, // З кожним рівнем +50 до макс енергії
        energy: { increment: 50 }
      }
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Upgrade error" });
  }
});

// 3. Щоденний бонус (Daily Bonus)
app.post('/api/user/bonus', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const now = new Date();
    
    if (user.lastBonusDate) {
      const diff = now.getTime() - new Date(user.lastBonusDate).getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (1000 * 60 * 60));
        return res.status(400).json({ error: `Бонус буде доступний через ${hoursLeft} год.` });
      }
    }

    const bonusAmount = 1.0; // Даємо $1.00 щодня

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: bonusAmount },
        lastBonusDate: now,
        energy: user.maxEnergy // Бонус також відновлює енергію
      }
    });

    res.json({ message: "Ви отримали щоденний бонус $1.00!", balance: updatedUser.balance });
  } catch (err) {
    res.status(500).json({ error: "Bonus error" });
  }
});

// --- ЛОГІКА ЗАВДАНЬ ---
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  const userId = req.user.id;
  const THIRTY_HOURS = 30 * 60 * 60 * 1000;

  try {
    const lastExecution = await prisma.userTask.findFirst({
      where: { userId, taskId },
      orderBy: { createdAt: 'desc' }
    });

    if (lastExecution) {
      const timeDiff = Date.now() - new Date(lastExecution.createdAt).getTime();
      if (timeDiff < THIRTY_HOURS) {
        const timeLeft = Math.ceil((THIRTY_HOURS - timeDiff) / (1000 * 60 * 60));
        return res.status(400).json({ error: `Зачекайте ще ${timeLeft} год.` });
      }
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: task.reward } }
      }),
      prisma.userTask.create({
        data: { userId, taskId }
      })
    ]);

    res.json({ 
      message: "Success", 
      newBalance: updatedUser.balance,
      reward: task.reward 
    });
  } catch (err) {
    res.status(500).json({ error: "Transaction failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
