import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Вкажи тут адресу свого бекенду на Render без "/" в кінці
const API_URL = 'https://xaxm-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Завантаження даних профілю
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error("Помилка завантаження профілю:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // 2. Вхід / Реєстрація
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await axios.post(`${API_URL}${path}`, { email, password });
      if (isRegister) {
        alert("Реєстрація успішна! Тепер увійдіть.");
        setIsRegister(false);
      } else {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Помилка авторизації");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // 3. Клік (Tap)
  const handleTap = async () => {
    if (!user) return;
    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({ ...prev, balance: res.data.balance, energy: res.data.energy }));
    } catch (err) {
      alert(err.response?.data?.error || "Помилка кліку");
    }
  };

  // 4. Отримання бонусу
  const handleBonus = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/user/bonus`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchData(); // Оновлюємо дані
    } catch (err) {
      alert(err.response?.data?.error || "Бонус ще не доступний");
    }
  };

  // ЯКЩО НЕМАЄ ТОКЕНА — ПОКАЗУЄМО ВІКНО ЛОГІНУ (Це фіксить білий екран)
  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-purple-500">
          <h2 className="text-3xl font-bold mb-6 text-center text-purple-400">
            {isRegister ? 'Реєстрація' : 'Вхід у EARN.IO'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" placeholder="Email" 
              className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <input 
              type="password" placeholder="Пароль" 
              className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
            <button className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-lg font-bold transition">
              {loading ? 'Зачекайте...' : (isRegister ? 'Створити акаунт' : 'Увійти')}
            </button>
          </form>
          <p className="mt-4 text-center text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Вже є акаунт? Увійдіть' : 'Немає акаунту? Реєстрація'}
          </p>
        </div>
      </div>
    );
  }

  // ЯКЩО ТОКЕН Є, АЛЕ ЮЗЕР ЩЕ ВАНТАЖИТЬСЯ
  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Завантаження...</div>;

  // ОСНОВНИЙ ІНТЕРФЕЙС ГРИ
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Шапка */}
      <div className="flex justify-between items-center p-6 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl">E</div>
          <span className="text-xl font-black tracking-tighter">EARN.IO</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-800 px-4 py-2 rounded-full font-bold border border-gray-700">
            ${user.balance?.toFixed(2)}
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-white">➡</button>
        </div>
      </div>

      {/* Майнер */}
      <div className="flex flex-col items-center mt-10">
        <div className="w-full max-w-md px-6">
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700 mb-2">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300" 
              style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}
            ></div>
          </div>
          <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
            ⚡ Energy: {user.energy} / {user.maxEnergy}
          </p>
        </div>

        <button 
          onClick={handleTap}
          className="mt-12 relative group active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 bg-purple-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition"></div>
          <div className="relative w-64 h-64 bg-gradient-to-b from-purple-900 to-black rounded-full border-4 border-purple-500 flex items-center justify-center overflow-hidden">
             <span className="text-8xl select-none">💎</span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-md px-6">
          <button onClick={handleBonus} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 hover:border-purple-500 transition">
            <p className="text-xs text-gray-500 uppercase font-bold">Daily Bonus</p>
            <p className="font-bold">Отримати $1.00</p>
          </button>
          <button className="bg-gray-900 p-4 rounded-2xl border border-gray-800 hover:border-purple-500 transition opacity-50">
            <p className="text-xs text-gray-500 uppercase font-bold">Upgrade</p>
            <p className="font-bold">Lvl {user.clickLevel}</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
