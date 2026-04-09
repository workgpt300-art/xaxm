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

// --- MIDDLEWARE ДЛЯ ЗАХИСТУ РОУТІВ ---
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

// --- ЛОГІКА ЗАРОБІТКУ (КНОПКИ) ---
// Отримати профіль та баланс
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json(user);
});

// Отримати список завдань
app.get('/api/tasks', async (req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
});

// Виконати завдання (Натискання кнопки "Complete")
app.post('/api/tasks/complete', authenticateToken, async (req, res) => {
  const { taskId } = req.body;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  
  // 1. Додаємо запис про виконання
  await prisma.userTask.create({
    data: { userId: req.user.id, taskId: taskId }
  });

  // 2. Оновлюємо баланс користувача
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { balance: { increment: task.reward } }
  });

  res.json({ message: "Task completed!", newBalance: updatedUser.balance });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
