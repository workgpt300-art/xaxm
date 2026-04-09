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
    );
  }

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black animate-pulse uppercase tracking-widest">{t.loading}</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24 select-none overflow-hidden">
      {/* ПАРТИКЛИ (ЦИФРИ) */}
      {clickParticles.map(p => (
        <span key={p.id} className="animate-float-up text-green-400 pointer-events-none" style={{ left: p.x, top: p.y }}>
          +${p.value}
        </span>
      ))}

      {/* HEADER */}
      <div className="p-4 flex justify-between items-center bg-gray-900/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-black border border-white/10 shadow-lg shadow-purple-600/20">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[9px] text-purple-400 font-black uppercase tracking-wider">{t.level} {user.clickLevel}</p>
            <p className="text-xs font-bold opacity-80">{user.email.split('@')[0]}</p>
          </div>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-full border border-gray-700 scale-90">
           <button onClick={() => setLang('UA')} className={`px-3 py-1 rounded-full text-[10px] font-black ${lang === 'UA' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>UA</button>
           <button onClick={() => setLang('ENG')} className={`px-3 py-1 rounded-full text-[10px] font-black ${lang === 'ENG' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>ENG</button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
        {/* ВКЛАДКА МАЙНІНГУ */}
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center pt-8">
            <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.2em] mb-2">{t.balance}</p>
            <h1 className="text-6xl font-black mb-16 tracking-tighter">${user.balance.toFixed(3)}</h1>
            
            <button onClick={handleTap} className="relative active:scale-90 transition-transform duration-75 outline-none">
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px] rounded-full"></div>
              <div className="w-64 h-64 bg-gray-900 rounded-full border-[12px] border-gray-800/50 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden">
                <span className="text-9xl transform active:scale-110 transition-transform">💎</span>
              </div>
            </button>

            <div className="w-full max-w-xs mt-16 bg-gray-900/50 p-4 rounded-3xl border border-white/5">
              <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                <span className="text-gray-400">⚡ {t.energy}</span>
                <span>{Math.floor(user.energy)} / {user.maxEnergy}</span>
              </div>
              <div className="h-2.5 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-400 rounded-full transition-all duration-300" style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА ПОКРАЩЕНЬ (ПЕРЕЙМЕНОВАНО З TASKS) */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <h2 className="text-2xl font-black uppercase text-purple-400">{t.upgrades}</h2>
            <div className="grid grid-cols-1 gap-3">
              {/* Multitap */}
              <div className="bg-gray-900 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-gray-800 w-14 h-14 flex items-center justify-center rounded-2xl">☝️</span>
                  <div>
                    <p className="font-black text-xs uppercase">{t.up_click}</p>
                    <p className="text-[10px] text-gray-500 uppercase">LVL {user.clickLevel} • +$0.01</p>
                  </div>
                </div>
                <button onClick={() => buyUpgrade('multitap')} className="bg-purple-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">
                  ${(5 * Math.pow(2, user.clickLevel - 1)).toFixed(0)}
                </button>
              </div>

              {/* Energy Limit */}
              <div className="bg-gray-900 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-gray-800 w-14 h-14 flex items-center justify-center rounded-2xl">🔋</span>
                  <div>
                    <p className="font-black text-xs uppercase">{t.up_energy}</p>
                    <p className="text-[10px] text-gray-500 uppercase">MAX +500</p>
                  </div>
                </div>
                <button onClick={() => buyUpgrade('energyLimit')} className="bg-blue-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">
                  ${(3 * Math.pow(1.8, Math.floor((user.maxEnergy-5000)/500))).toFixed(0)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА ПАРТНЕРІВ */}
        {activeTab === 'partners' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black uppercase text-purple-400">{t.partners}</h2>
            <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">{t.ref_link}</p>
              <div className="flex gap-2">
                <input readOnly value={`${window.location.origin}?ref=${user.id}`} className="flex-1 bg-black p-4 rounded-2xl text-[10px] border border-white/5 outline-none font-mono text-purple-300" />
                <button onClick={() => copyToClipboard(`${window.location.origin}?ref=${user.id}`)} className="bg-purple-600 px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-purple-500 transition-all active:scale-90">{t.copy}</button>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА ПРОФІЛЮ */}
        {activeTab === 'profile' && (
          <div className="bg-gray-900 rounded-[2.5rem] p-8 border border-white/5 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black shadow-2xl">
              {user.email[0].toUpperCase()}
            </div>
            <h2 className="text-xl font-black mb-2">{user.email}</h2>
            <p className="text-[10px] text-gray-500 uppercase font-black mb-8 tracking-widest">ID: {user.id.slice(0,8)}...</p>
            <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">{t.logout}</button>
          </div>
        )}
      </main>

      {/* NAVIGATION */}
      <nav className="fixed bottom-6 left-6 right-6 bg-gray-900/90 border border-white/5 h-20 rounded-[2.5rem] flex justify-around items-center backdrop-blur-xl z-50 shadow-2xl">
        {[
          { id: 'miner', label: t.mine, icon: '⛏️' },
          { id: 'partners', label: t.partners, icon: '👥' },
          { id: 'tasks', label: t.tasks, icon: '⚡' },
          { id: 'profile', label: t.profile, icon: '👤' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-purple-600/20 text-purple-400 scale-110' : 'text-gray-500 opacity-50'}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
