import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store';
import toast, { Toaster } from 'react-hot-toast';

// --- ОДИН РЯДОК ДЛЯ ВСІХ ЗАПИТІВ ---
const API_URL = "https://xaxm-backend.onrender.com";

// --- КОМПОНЕНТ: Перемикач мови ---
const LangSwitcher = () => {
  const { i18n } = useTranslation();
  return (
    <div className="flex gap-2">
      {['en', 'ua', 'ru'].map((lang) => (
        <button 
          key={lang} 
          onClick={() => { i18n.changeLanguage(lang); localStorage.setItem('lng', lang); }}
          className={`px-2 py-1 rounded ${i18n.language === lang ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

// --- СТОРІНКА: Вхід (Login) ---
const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Замінено localhost на API_URL
      const { data } = await axios.post(`${API_URL}/api/auth/login`, form);
      setAuth(data.user, data.token);
      toast.success(t('login.success'));
      navigate('/dashboard');
    } catch (err) { toast.error(t('login.error')); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('login.title')}</h1>
        <input 
          type="email" placeholder={t('login.email')} 
          className="w-full p-3 border rounded-lg mb-4"
          onChange={(e) => setForm({...form, email: e.target.value})}
        />
        <input 
          type="password" placeholder={t('login.password')} 
          className="w-full p-3 border rounded-lg mb-6"
          onChange={(e) => setForm({...form, password: e.target.value})}
        />
        <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition">
          {t('login.submit')}
        </button>
      </form>
    </div>
  );
};

// --- СТОРІНКА: Дашборд (Dashboard) ---
const Dashboard = () => {
  const { t } = useTranslation();
  const { user, token, logout } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [balance, setBalance] = useState(user?.balance || 0);

  useEffect(() => {
    // Замінено localhost на API_URL
    axios.get(`${API_URL}/api/tasks`).then(res => setTasks(res.data));
  }, []);

  const completeTask = async (taskId) => {
    try {
      // Замінено localhost на API_URL
      const { data } = await axios.post(`${API_URL}/api/tasks/complete`, 
        { taskId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(data.newBalance);
      toast.success(t('tasks.done'));
    } catch (err) { toast.error(t('tasks.error')); }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <nav className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
        <div className="text-xl font-bold text-blue-600">EARN.IO</div>
        <div className="flex items-center gap-4">
          <span className="font-bold text-green-600">{balance.toFixed(2)} $</span>
          <LangSwitcher />
          <button onClick={logout} className="text-red-500 underline text-sm">Logout</button>
        </div>
      </nav>

      <div className="grid gap-4">
        <h2 className="text-xl font-bold">{t('dashboard.available_tasks')}</h2>
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-blue-500">
            <div>
              <h3 className="font-bold">{task.title}</h3>
              <p className="text-sm text-gray-500">+{task.reward} $</p>
            </div>
            <button 
              onClick={() => completeTask(task.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              {t('tasks.button')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ---
export default function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
