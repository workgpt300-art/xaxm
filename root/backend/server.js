import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000; // Render зазвичай використовує 10000

// --- РОЗШИРЕНИЙ CORS ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Лог для перевірки, чи приходять запити
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

// --- АВТОРИЗАЦІЯ ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Вкажіть пошту та пароль" });

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
    res.status(400).json({ error: "Email вже існує або помилка бази" }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } else {
      res.status(401).json({ error: "Невірні дані для входу" });
    }
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера при вході" });
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Помилка бази даних" });
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
    res.status(500).json({ error: "Помилка при кліку" });
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
    res.status(500).json({ error: "Помилка апгрейду" });
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
    res.status(500).json({ error: "Помилка бонусу" });
  }
});

// --- ЗАВДАННЯ ---
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Помилка завантаження завдань" });
  }
});

app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Завдання не знайдено" });

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
    res.status(500).json({ error: "Помилка завершення завдання" });
  }
});

// Глобальна обробка помилок (щоб сервер не падав)
app.use((err, req, res, next) => {
  console.error("КРИТИЧНА ПОМИЛКА:", err);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 SERVER IS LIVE!
  📡 Port: ${PORT}
  🔗 API: https://xaxm-backend.onrender.com
  `);
});
