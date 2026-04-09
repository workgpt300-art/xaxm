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
  } catch (e) { res.status(400).json({ error: "Email already exists" }); }
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

// Роут для автоматичного входу (запам'ятовування)
app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, balance: user.balance });
});

// --- ЛОГІКА ЗАВДАНЬ ---

app.get('/api/tasks', async (req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
});

app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  const userId = req.user.id;
  const THIRTY_HOURS = 30 * 60 * 60 * 1000; // 30 годин

  try {
    // 1. Перевіряємо останнє виконання
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

    // 2. Виконуємо транзакцію: гроші + запис часу
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
      message: "Завдання виконано!", 
      newBalance: updatedUser.balance,
      reward: task.reward 
    });

  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  res.json({ message: "Task completed!", newBalance: updatedUser.balance });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
