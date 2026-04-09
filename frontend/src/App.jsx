import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

const translations = {
  UA: {
    mine: "МАЙНІНГ", tasks: "ПОКРАЩЕННЯ", profile: "ПРОФІЛЬ", partners: "ПАРТНЕРИ",
    balance: "Загальний баланс", energy: "ЕНЕРГІЯ",
    logout: "Вийти", loading: "Завантаження...",
    level: "Рівень", upgrades: "МАГАЗИН",
    up_click: "Сила кліку", up_energy: "Ліміт енергії",
    buy: "Купити", ref_link: "Твоє посилання", copy: "Копіювати"
  },
  ENG: {
    mine: "MINING", tasks: "UPGRADES", profile: "PROFILE", partners: "PARTNERS",
    balance: "Total Balance", energy: "ENERGY",
    logout: "Log Out", loading: "Loading...",
    level: "Level", upgrades: "SHOP",
    up_click: "Tap Power", up_energy: "Energy Limit",
    buy: "Upgrade", ref_link: "Your referral link", copy: "Copy"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [lang, setLang] = useState('UA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [clickParticles, setClickParticles] = useState([]); // Для анімації цифр

  const t = translations[lang];

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) handleLogout();
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // Відновлення енергії (клієнтське візуальне)
  useEffect(() => {
    const interval = setInterval(() => {
      setUser(prev => {
        if (!prev || prev.energy >= prev.maxEnergy) return prev;
        const recoveryRate = prev.maxEnergy / (150 * 60);
        return { ...prev, energy: Math.min(prev.maxEnergy, prev.energy + recoveryRate) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const referrerId = urlParams.get('ref');
      const res = await axios.post(`${API_URL}${path}`, { email, password, referrerId });
      if (isRegister) { 
        alert("Успіх! Тепер увійдіть."); 
        setIsRegister(false); 
      } else {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) { alert(err.response?.data?.error || "Помилка"); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;

    // Створюємо анімацію цифри
    const id = Date.now();
    const x = e.clientX || e.pageX;
    const y = e.clientY || e.pageY;
    setClickParticles(prev => [...prev, { id, x, y, value: (user.clickLevel * 0.01).toFixed(2) }]);
    setTimeout(() => setClickParticles(prev => prev.filter(p => p.id !== id)), 800);

    // Оновлюємо локально для миттєвого відгуку
    const reward = (user.clickLevel || 1) * 0.01;
    setUser(prev => ({
      ...prev,
      balance: prev.balance + reward,
      energy: Math.max(0, prev.energy - 1)
    }));

    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({ ...prev, balance: res.data.balance, energy: res.data.energy }));
    } catch (err) { console.error(err); }
  };

  const buyUpgrade = async (type) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: type }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
      alert(lang === 'UA' ? "Покращено!" : "Upgraded!");
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(lang === 'UA' ? "Скопійовано!" : "Copied!");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <h2 className="text-3xl font-black text-center mb-6 uppercase">{isRegister ? 'Join' : 'Login'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-gray-800 rounded-2xl border border-transparent focus:border-purple-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-800 rounded-2xl border border-transparent focus:border-purple-500 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 bg-purple-600 rounded-2xl font-black uppercase shadow-lg shadow-purple-600/20 active:scale-95 transition-all">{isRegister ? 'Sign Up' : 'Login'}</button>
          </form>
          <p className="text-center mt-6 text-gray-500 text-xs font-bold uppercase cursor-pointer" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account?' : 'Create account'}
          </p>
        </div>
      </div>
