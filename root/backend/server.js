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

// --- РОЗШИРЕНИЙ CORS (Виправляє помилку зв'язку) ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
      data: { 
        email, 
        password: hashedPassword,
        energy: 5000,
        maxEnergy: 5000,
        clickLevel: 1,
        balance: 0.0
      }
    });
    res.json({ message: "User created", userId: user.id });
  } catch (e) { 
    res.status(400).json({ error: "Email already exists" }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      // Віддаємо весь об'єкт користувача
      res.json({ token, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Отримання профілю (Виправляє ENERGY: / )
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Повертаємо ВСІ поля, щоб фронтенд бачив енергію та рівень
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- ЛОГІКА МАЙНЕРА ---

app.post('/api/user/tap', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const currentEnergy = user.energy ?? 0;

    if (currentEnergy <= 0) {
      return res.status(400).json({ error: "Немає енергії!" });
    }

    const reward = (user.clickLevel ?? 1) * 0.01; 

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

app.post('/api/user/upgrade', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const currentLevel = user.clickLevel ?? 1;
    const cost = Math.pow(currentLevel, 2); 

    if (user.balance < cost) {
      return res.status(400).json({ error: `Потрібно $${cost.toFixed(2)}` });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { decrement: cost },
        clickLevel: { increment: 1 },
        maxEnergy: { increment: 500 }
      }
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Upgrade error" });
  }
});

app.post('/api/user/bonus', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const now = new Date();
    
    if (user.lastBonusDate) {
      const diff = now.getTime() - new Date(user.lastBonusDate).getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (1000 * 60 * 60));
        return res.status(400).json({ error: `Доступно через ${hoursLeft} год.` });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        balance: { increment: 1.0 },
        energy: user.maxEnergy ?? 5000,
        lastBonusDate: now
      }
    });

    res.json({ message: "Бонус отримано!", balance: updatedUser.balance });
  } catch (err) {
    res.status(500).json({ error: "Bonus error" });
  }
});

// --- ЗАВДАННЯ ---
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Tasks error" });
  }
});

app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { balance: { increment: task.reward } }
      }),
      prisma.userTask.create({
        data: { userId: req.user.id, taskId }
      })
    ]);
    res.json({ newBalance: updatedUser.balance, reward: task.reward });
  } catch (err) {
    res.status(500).json({ error: "Task failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
