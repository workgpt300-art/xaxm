import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

// Об'єкт перекладів
const translations = {
  UA: {
    mine: "МАЙНІНГ",
    tasks: "ЗАВДАННЯ",
    profile: "ПРОФІЛЬ",
    balance: "Загальний баланс",
    energy: "ЕНЕРГІЯ",
    bonus: "Щоденний бонус",
    tg_task: "Підписка на Telegram",
    tg_desc: "Підпишись на @earnIO_News",
    claim: "Отримати $50",
    go: "Перейти",
    logout: "Вийти",
    loading: "Завантаження...",
    settings: "Налаштування профілю",
    level: "Рівень"
  },
  ENG: {
    mine: "MINING",
    tasks: "TASKS",
    profile: "PROFILE",
    balance: "Total Balance",
    energy: "ENERGY",
    bonus: "Daily Bonus",
    tg_task: "Telegram Subscription",
    tg_desc: "Subscribe to @earnIO_News",
    claim: "Claim $50",
    go: "Go",
    logout: "Log Out",
    loading: "Loading...",
    settings: "User Settings",
    level: "Level"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [lang, setLang] = useState('UA'); // Стейт мови
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const t = translations[lang];

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await axios.post(`${API_URL}${path}`, { email, password });
      if (isRegister) { 
        alert("Успіх! Тепер увійдіть."); 
        setIsRegister(false); 
      } else {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) { 
      alert(err.response?.data?.error || "Помилка"); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleTap = async () => {
    if (!user || user.energy <= 0) return;
    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({ ...prev, balance: res.data.balance, energy: res.data.energy }));
    } catch (err) { console.error(err); }
  };

  // Логіка Telegram завдання
  const handleTgTask = () => {
    window.open('https://t.me/earnIO_News', '_blank');
    
    // Затримка перед запитом на бекенд, щоб імітувати перевірку
    setTimeout(async () => {
      try {
        await axios.post(`${API_URL}/api/tasks/complete`, { taskId: 'tg_sub' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert(lang === 'UA' ? "Нагороду нараховано!" : "Reward claimed!");
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || "Error");
      }
    }, 3000);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <h2 className="text-3xl font-black text-center mb-6">{isRegister ? 'JOIN EARN.IO' : 'WELCOME BACK'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 bg-purple-600 rounded-2xl font-bold text-lg hover:bg-purple-500 active:scale-95 transition-all shadow-lg shadow-purple-600/20">{isRegister ? 'Sign Up' : 'Login'}</button>
          </form>
          <p className="text-center mt-6 text-gray-400 cursor-pointer hover:text-white transition" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Login' : 'New here? Create account'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold tracking-widest animate-pulse">{t.loading}</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24 select-none">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center font-bold border-2 border-white/20 shadow-lg">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] text-purple-400 font-black uppercase">{t.level} {user.clickLevel}</p>
            <p className="text-sm font-bold truncate w-24">{user.email.split('@')[0]}</p>
          </div>
        </div>

        {/* ПЕРЕМИКАЧ МОВИ */}
        <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-full border border-gray-700 shadow-inner">
           <button 
             onClick={() => setLang('UA')} 
             className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'UA' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500'}`}
           >UA</button>
           <button 
             onClick={() => setLang('ENG')} 
             className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'ENG' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500'}`}
           >ENG</button>
        </div>
      </div>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
             <div className="text-center mb-10">
                <p className="text-gray-400 uppercase text-[10px] font-black tracking-[0.2em] mb-1">{t.balance}</p>
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-2xl">
                  ${user.balance.toFixed(3)}
                </h1>
             </div>

             <button onClick={handleTap} className="relative active:scale-90 transition-transform duration-75 group">
                <div className="absolute inset-0 bg-purple-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="w-72 h-72 bg-gradient-to-b from-gray-800 to-gray-900 rounded-full border-[12px] border-gray-800 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
                   <span className="text-9xl select-none z-10 group-active:rotate-12 transition-transform">💎</span>
                   <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent"></div>
                </div>
             </button>

             <div className="w-full max-w-xs mt-14">
                <div className="flex justify-between text-[10px] font-black mb-2 px-1 tracking-wider">
                   <span className="text-purple-400">⚡ {t.energy}</span>
                   <span>{user.energy} / {user.maxEnergy}</span>
                </div>
                <div className="h-4 bg-gray-900 rounded-full border border-gray-800 p-1 shadow-inner">
                   <div 
                    className="h-full bg-gradient-to-r from-purple-600 via-purple-400 to-blue-400 rounded-full transition-all duration-500" 
                    style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}
                   ></div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-black mb-6 tracking-tight">{t.tasks}</h2>
            <div className="bg-gray-900/50 p-5 rounded-[2rem] border border-gray-800 flex justify-between items-center backdrop-blur-sm group hover:border-purple-500/50 transition-colors">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">✈️</div>
                  <div>
                    <p className="font-bold text-sm">{t.tg_task}</p>
                    <p className="text-xs text-green-400 font-black">+$50.00</p>
                  </div>
               </div>
               <button onClick={handleTgTask} className="bg-purple-600 px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition-colors">
                 {t.go}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-900/50 rounded-[2.5rem] p-8 border border-gray-800 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-black mb-8 text-center uppercase tracking-widest text-purple-400">{t.settings}</h2>
            <div className="space-y-6">
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</span>
                  <span className="text-md font-bold text-gray-200">{user.email}</span>
               </div>
               <div className="flex flex-col gap-1 border-t border-gray-800 pt-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mining Level</span>
                  <span className="text-md font-bold text-purple-400">{user.clickLevel} LVL</span>
               </div>
               <button onClick={handleLogout} className="w-full py-4 mt-8 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs border border-red-500/20 hover:bg-red-500/20 transition-all">
                  {t.logout}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 border-t border-white/5 p-4 flex justify-around items-center backdrop-blur-xl z-50">
        <button onClick={() => setActiveTab('miner')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'miner' ? 'text-purple-500 scale-110' : 'text-gray-500 opacity-50'}`}>
          <span className="text-2xl">⛏️</span>
          <span className="text-[9px] font-black tracking-tighter">{t.mine}</span>
        </button>
        <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tasks' ? 'text-purple-500 scale-110' : 'text-gray-500 opacity-50'}`}>
          <span className="text-2xl">📋</span>
          <span className="text-[9px] font-black tracking-tighter">{t.tasks}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-purple-500 scale-110' : 'text-gray-500 opacity-50'}`}>
          <span className="text-2xl">👤</span>
          <span className="text-[9px] font-black tracking-tighter">{t.profile}</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
