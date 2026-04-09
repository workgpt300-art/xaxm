import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

const translations = {
  UA: {
    mine: "МАЙНІНГ", tasks: "ЗАВДАННЯ", profile: "ПРОФІЛЬ", partners: "ПАРТНЕРИ",
    balance: "Загальний баланс", energy: "ЕНЕРГІЯ",
    bonus: "Щоденний бонус", tg_task: "Підписка на Telegram",
    claim: "Отримати $50", go: "Перейти", logout: "Вийти",
    loading: "Завантаження...", settings: "Налаштування профілю",
    level: "Рівень", upgrades: "ПОКРАЩЕННЯ",
    up_click: "Сила кліку", up_energy: "Ліміт енергії",
    buy: "Купити", cost: "Ціна", ref_link: "Твоє посилання", copy: "Копіювати"
  },
  ENG: {
    mine: "MINING", tasks: "TASKS", profile: "PROFILE", partners: "PARTNERS",
    balance: "Total Balance", energy: "ENERGY",
    bonus: "Daily Bonus", tg_task: "Telegram Subscription",
    claim: "Claim $50", go: "Go", logout: "Log Out",
    loading: "Loading...", settings: "User Settings",
    level: "Level", upgrades: "UPGRADES",
    up_click: "Tap Power", up_energy: "Energy Limit",
    buy: "Upgrade", cost: "Cost", ref_link: "Your referral link", copy: "Copy"
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

  const t = translations[lang];

  // Завантаження даних
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

  // Відновлення енергії
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
      // При реєстрації тепер можна автоматично підтягувати ref з URL
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

  const handleTap = async () => {
    if (!user || user.energy < 1) return;
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(lang === 'UA' ? "Скопійовано!" : "Copied!");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <h2 className="text-3xl font-black text-center mb-6">{isRegister ? 'JOIN XAXM' : 'WELCOME BACK'}</h2>
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
    <div className="min-h-screen bg-black text-white flex flex-col pb-24 select-none font-sans">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-white/5 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center font-bold border border-white/10 shadow-lg">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] text-purple-400 font-black uppercase">{t.level} {user.clickLevel}</p>
            <p className="text-sm font-bold truncate w-24">{user.email.split('@')[0]}</p>
          </div>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-full border border-gray-700">
           <button onClick={() => setLang('UA')} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'UA' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>UA</button>
           <button onClick={() => setLang('ENG')} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'ENG' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>ENG</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center animate-in fade-in duration-500">
             <div className="text-center mb-10">
                <p className="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-1">{t.balance}</p>
                <h1 className="text-6xl font-black tracking-tighter">${user.balance.toFixed(3)}</h1>
             </div>

             <button onClick={handleTap} className="relative active:scale-95 transition-transform group">
                <div className="absolute inset-0 bg-purple-600 rounded-full blur-[100px] opacity-20"></div>
                <div className="w-72 h-72 bg-gray-900 rounded-full border-[16px] border-gray-800 flex items-center justify-center shadow-2xl relative z-10">
                   <span className="text-9xl group-active:scale-110 transition-transform">💎</span>
                </div>
             </button>

             <div className="w-full max-w-xs mt-12">
                <div className="flex justify-between text-[10px] font-black mb-2 uppercase text-gray-400 px-1">
                   <span>⚡ {t.energy}</span>
                   <span className="text-white">{Math.floor(user.energy)} / {user.maxEnergy}</span>
                </div>
                <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                   <div className="h-full bg-gradient-to-r from-purple-600 to-blue-400 transition-all duration-300" style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}></div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black uppercase text-purple-400">{t.partners}</h2>
            
            <div className="bg-gray-900 p-6 rounded-[2rem] border border-white/5">
              <p className="text-[10px] font-black text-gray-500 uppercase mb-3">{t.ref_link}</p>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  className="flex-1 bg-black p-3 rounded-xl text-xs border border-white/5 outline-none"
                  value={`${window.location.origin}?ref=${user.id}`}
                />
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}?ref=${user.id}`)}
                  className="bg-purple-600 px-4 rounded-xl text-[10px] font-black uppercase hover:bg-purple-500 transition-colors"
                >
                  {t.copy}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase">Total Refs</p>
                <p className="text-2xl font-black mt-1">{user.referrals?.length || 0}</p>
              </div>
              <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase">Earned from refs</p>
                <p className="text-2xl font-black mt-1 text-green-400">$0.00</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-900 rounded-[2rem] p-8 border border-white/5">
            <h2 className="text-xl font-black mb-8 uppercase text-center text-purple-400">{t.settings}</h2>
            <div className="space-y-6">
               <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Email</span>
                  <span className="font-bold text-sm">{user.email}</span>
               </div>
               <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase">User ID</span>
                  <span className="font-mono text-[10px] text-gray-400">{user.id}</span>
               </div>
               <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-500 transition-colors">
                  {t.logout}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* NAVIGATION */}
      <nav className="fixed bottom-6 left-6 right-6 bg-gray-900/90 border border-white/5 h-20 rounded-3xl flex justify-around items-center backdrop-blur-xl z-50 px-2 shadow-2xl">
        {[
          { id: 'miner', label: t.mine, icon: '⛏️' },
          { id: 'partners', label: t.partners, icon: '👥' },
          { id: 'tasks', label: t.tasks, icon: '⚡' },
          { id: 'profile', label: t.profile, icon: '👤' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-purple-600/20 text-purple-400 scale-105' : 'text-gray-500 opacity-60'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
