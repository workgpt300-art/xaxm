import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

const translations = {
  UA: {
    mine: "МАЙНІНГ", tasks: "ЗАВДАННЯ", upgrades: "ПРОКАЧКА", profile: "ПРОФІЛЬ", partners: "ДРУЗІ",
    balance: "ЗАГАЛЬНИЙ БАЛАНС", energy: "ЕНЕРГІЯ",
    logout: "Вийти", loading: "Завантаження...",
    level: "РІВЕНЬ", up_click: "Сила кліку", up_energy: "Ліміт енергії",
    buy: "Купити", ref_link: "Твоє посилання", copy: "Копіювати",
    tg_join: "Підписка на канал", claim: "Отримати $1.00"
  },
  ENG: {
    mine: "MINING", tasks: "TASKS", upgrades: "UPGRADES", profile: "PROFILE", partners: "FRIENDS",
    balance: "TOTAL BALANCE", energy: "ENERGY",
    logout: "Log Out", loading: "Loading...",
    level: "LEVEL", up_click: "Tap Power", up_energy: "Energy Limit",
    buy: "Upgrade", ref_link: "Your link", copy: "Copy",
    tg_join: "Join Channel", claim: "Claim $1.00"
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
  const [clickParticles, setClickParticles] = useState([]);

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

  useEffect(() => { if (token) fetchData(); }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUser(prev => {
        if (!prev || prev.energy >= prev.maxEnergy) return prev;
        return { ...prev, energy: Math.min(prev.maxEnergy, prev.energy + (prev.maxEnergy / 9000)) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const res = await axios.post(`${API_URL}${path}`, { email, password, referrerId: urlParams.get('ref') });
      if (!isRegister) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      } else { setIsRegister(false); alert("Success! Now Login."); }
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); };

  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;
    const id = Date.now();
    const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    
    setClickParticles(prev => [...prev, { id, x, y, value: (user.clickLevel * 0.01).toFixed(2) }]);
    setTimeout(() => setClickParticles(prev => prev.filter(p => p.id !== id)), 800);

    setUser(prev => ({ ...prev, balance: prev.balance + (prev.clickLevel * 0.01), energy: prev.energy - 1 }));
    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch (err) { console.error(err); }
  };

  const buyUpgrade = async (type) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: type }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8">
          <h2 className="text-3xl font-black text-center mb-6">{isRegister ? 'JOIN' : 'LOGIN'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 bg-purple-600 rounded-2xl font-black uppercase">{isRegister ? 'Sign Up' : 'Login'}</button>
          </form>
          <p className="text-center mt-6 text-gray-500 text-xs cursor-pointer" onClick={() => setIsRegister(!isRegister)}>{isRegister ? 'Already have an account?' : 'Create account'}</p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black">{t.loading}</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden">
      {clickParticles.map(p => (
        <span key={p.id} className="animate-float-up text-green-400 font-black pointer-events-none fixed z-[60] text-xl" style={{ left: p.x, top: p.y }}>+${p.value}</span>
      ))}

      <header className="p-4 flex justify-between items-start z-40 bg-black/50 backdrop-blur-md">
        <div className="bg-gray-800/50 p-1 rounded-full border border-gray-700 flex">
           <button onClick={() => setLang('UA')} className={`px-3 py-1 rounded-full text-[10px] font-black ${lang === 'UA' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>UA</button>
           <button onClick={() => setLang('ENG')} className={`px-3 py-1 rounded-full text-[10px] font-black ${lang === 'ENG' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>ENG</button>
        </div>
        
        <div onClick={() => setActiveTab('profile')} className="flex items-center gap-3 bg-gray-900/80 p-2 pl-4 rounded-full border border-purple-500/30 cursor-pointer active:scale-95 transition-all">
          <div className="text-right">
            <p className="text-[9px] text-purple-400 font-black uppercase leading-none">{t.level} {user.clickLevel}</p>
            <p className="text-[11px] font-bold">{user.email.split('@')[0]}</p>
          </div>
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-black border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            {user.email[0].toUpperCase()}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center w-full">
            <p className="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-2">{t.balance}</p>
            <h1 className="text-6xl font-black mb-12">${user.balance.toFixed(3)}</h1>
            <button onPointerDown={handleTap} className="relative active:scale-90 transition-transform outline-none">
              <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full"></div>
              <div className="w-72 h-72 bg-gray-900 rounded-full border-[14px] border-gray-800/50 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden">
                <span className="text-9xl">💎</span>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-black uppercase mb-4 text-purple-400">{t.upgrades}</h2>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-3xl">☝️</span>
                <div><p className="font-black text-xs uppercase">{t.up_click}</p><p className="text-[10px] text-gray-500">LVL {user.clickLevel}</p></div>
              </div>
              <button onClick={() => buyUpgrade('multitap')} className="bg-purple-600 px-6 py-3 rounded-2xl text-[10px] font-black">
                ${(5 * Math.pow(2, user.clickLevel - 1)).toFixed(0)}
              </button>
            </div>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔋</span>
                <div><p className="font-black text-xs uppercase">{t.up_energy}</p><p className="text-[10px] text-gray-500">{user.maxEnergy}</p></div>
              </div>
              <button onClick={() => buyUpgrade('energyLimit')} className="bg-blue-600 px-6 py-3 rounded-2xl text-[10px] font-black">
                ${(3 * Math.pow(1.8, Math.floor((user.maxEnergy-5000)/500))).toFixed(0)}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-black uppercase mb-4 text-blue-400">{t.tasks}</h2>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4"><span className="text-3xl">📢</span>
                <div><p className="font-black text-xs uppercase">{t.tg_join}</p><p className="text-[10px] text-green-400">+$1.00</p></div>
              </div>
              <button className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black">START</button>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md text-center">
            <h2 className="text-2xl font-black uppercase mb-6">{t.partners}</h2>
            <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-gray-500 uppercase mb-4">{t.ref_link}</p>
              <input readOnly value={`${window.location.origin}?ref=${user.id}`} className="w-full bg-black p-4 rounded-2xl text-[10px] border border-white/5 mb-4 text-center text-purple-400" />
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`); alert('Copied!'); }} className="w-full bg-purple-600 py-4 rounded-2xl font-black uppercase text-xs">{t.copy}</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md bg-gray-900 rounded-[2.5rem] p-8 border border-white/5 text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black shadow-2xl">{user.email[0].toUpperCase()}</div>
            <h2 className="text-xl font-black mb-8">{user.email}</h2>
            <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] border border-red-500/20">{t.logout}</button>
          </div>
        )}
      </main>

      <div className="px-6 mb-28 w-full max-w-xl mx-auto z-30">
        <div className="bg-gray-900/50 backdrop-blur-md p-4 rounded-3xl border border-white/5">
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xl">⚡</span>
              <span className="text-[10px] font-black text-gray-400 uppercase">{t.energy}</span>
            </div>
            <span className="text-xs font-black">{Math.floor(user.energy)} / {user.maxEnergy}</span>
          </div>
          <div className="h-3 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
            <div className="h-full bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-6 left-6 right-6 bg-gray-900/95 border border-white/10 h-20 rounded-[2.5rem] flex justify-around items-center backdrop-blur-xl z-50">
        {[
          { id: 'miner', label: t.mine, icon: '⛏️' },
          { id: 'tasks', label: t.tasks, icon: '📋' },
          { id: 'upgrades', label: t.upgrades, icon: '⚡' },
          { id: 'partners', label: t.partners, icon: '👥' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-[2rem] transition-all ${activeTab === tab.id ? 'bg-purple-600/20 text-purple-400 scale-105' : 'text-gray-500 opacity-60'}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
