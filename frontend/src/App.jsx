import React, { useState, useEffect, useCallback } from 'react';
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

  // Виніс у useCallback, щоб уникнути нескінченних циклів
  const fetchData = useCallback(async (currentToken) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 404) {
        handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchData(token);
    }
  }, [token, fetchData]);

  // Оновлення енергії
  useEffect(() => {
    const interval = setInterval(() => {
      setUser(prev => {
        if (!prev || prev.energy >= prev.maxEnergy) return prev;
        const recoveryRate = prev.maxEnergy / 9000;
        return { ...prev, energy: Math.min(prev.maxEnergy, prev.energy + recoveryRate) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const res = await axios.post(`${API_URL}${path}`, { 
        email, 
        password, 
        referrerId: urlParams.get('ref') 
      });
      
      if (!isRegister) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      } else { 
        setIsRegister(false); 
        alert("Success! Now Login."); 
      }
    } catch (err) { 
      alert(err.response?.data?.error || "Error during auth"); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;
    
    const id = Date.now();
    const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);
    
    const clickPower = Number(user.clickLevel) || 1;
    const income = clickPower * 0.01;

    setClickParticles(prev => [...prev, { id, x, y, value: income.toFixed(2) }]);
    setTimeout(() => setClickParticles(prev => prev.filter(p => p.id !== id)), 800);

    // Оновлюємо локально для миттєвого відгуку
    setUser(prev => ({ 
      ...prev, 
      balance: Number(prev.balance) + income, 
      energy: prev.energy - 1 
    }));

    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setUser(res.data);
    } catch (err) { 
      console.error("Tap error:", err); 
    }
  };

  const buyUpgrade = async (type) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { 
        upgradeId: type 
      }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (err) { 
      alert(err.response?.data?.error || "Error buying upgrade"); 
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-black text-center mb-6 tracking-tight">{isRegister ? 'JOIN' : 'LOGIN'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">
              {isRegister ? 'Sign Up' : 'Login'}
            </button>
          </form>
          <p className="text-center mt-6 text-gray-500 text-xs cursor-pointer font-bold uppercase tracking-wider" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account?' : 'Create account'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-black">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="tracking-widest animate-pulse">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Клікабельні частинки */}
      {clickParticles.map(p => (
        <span key={p.id} className="animate-float-up text-green-400 font-black pointer-events-none fixed z-[60] text-2xl drop-shadow-md" style={{ left: p.x, top: p.y }}>
          +${p.value}
        </span>
      ))}

      {/* Header */}
      <header className="p-4 flex justify-between items-center z-40 bg-black/50 backdrop-blur-lg border-b border-white/5">
        <div className="bg-gray-800/50 p-1 rounded-full border border-gray-700 flex">
           <button onClick={() => setLang('UA')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${lang === 'UA' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>UA</button>
           <button onClick={() => setLang('ENG')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${lang === 'ENG' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>ENG</button>
        </div>
        
        <div onClick={() => setActiveTab('profile')} className="flex items-center gap-3 bg-gray-900/80 p-1.5 pl-4 rounded-full border border-purple-500/30 cursor-pointer active:scale-95 transition-all">
          <div className="text-right">
            <p className="text-[9px] text-purple-400 font-black uppercase leading-none mb-1">{t.level} {user?.clickLevel || 1}</p>
            <p className="text-[11px] font-bold tracking-tight">{user?.email ? user.email.split('@')[0] : 'User'}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center font-black border-2 border-purple-400 shadow-xl">
            {user?.email ? user.email[0].toUpperCase() : '?'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center w-full max-w-sm">
            <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.2em] mb-2">{t.balance}</p>
            <h1 className="text-6xl font-black mb-12 tracking-tighter tabular-nums">
              ${Number(user?.balance || 0).toFixed(3)}
            </h1>
            
            <button onPointerDown={handleTap} className="relative active:scale-90 transition-transform outline-none mb-16 group">
              <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full group-hover:bg-purple-600/30 transition-all"></div>
              <div className="w-72 h-72 bg-gray-900 rounded-full border-[14px] border-gray-800/50 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden">
                <span className="text-9xl filter drop-shadow-2xl">💎</span>
              </div>
            </button>

            {/* Energy Block */}
            <div className="w-full bg-gray-900/50 p-4 rounded-3xl border border-white/5">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xl animate-pulse">⚡</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.energy}</span>
                </div>
                <span className="text-xs font-black tabular-nums">{Math.floor(user?.energy || 0)} / {user?.maxEnergy || 0}</span>
              </div>
              <div className="h-3 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 rounded-full transition-all duration-300" 
                  style={{ width: `${((user?.energy || 0) / (user?.maxEnergy || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4 pb-24">
            <h2 className="text-2xl font-black uppercase mb-6 text-purple-400 italic tracking-tighter">{t.upgrades}</h2>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center hover:bg-gray-800/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-2xl">☝️</div>
                <div>
                  <p className="font-black text-xs uppercase">{t.up_click}</p>
                  <p className="text-[10px] text-gray-500 font-bold">LVL {user.clickLevel}</p>
                </div>
              </div>
              <button onClick={() => buyUpgrade('multitap')} className="bg-purple-600 px-6 py-4 rounded-2xl text-[10px] font-black shadow-lg active:scale-95 transition-all">
                ${(5 * Math.pow(2, user.clickLevel - 1)).toFixed(0)}
              </button>
            </div>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center hover:bg-gray-800/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-2xl">🔋</div>
                <div>
                  <p className="font-black text-xs uppercase">{t.up_energy}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{user.maxEnergy}</p>
                </div>
              </div>
              <button onClick={() => buyUpgrade('energyLimit')} className="bg-blue-600 px-6 py-4 rounded-2xl text-[10px] font-black shadow-lg active:scale-95 transition-all">
                ${(3 * Math.pow(1.8, Math.floor((user.maxEnergy-5000)/500))).toFixed(0)}
              </button>
            </div>
          </div>
        )}

        {/* Секції Tasks, Partners, Profile залишаються аналогічно до Miner, 
            але з покращеними відступами та шрифтами */}
        {activeTab === 'tasks' && (
          <div className="w-full max-w-md space-y-4 pb-24">
            <h2 className="text-2xl font-black uppercase mb-6 text-blue-400 italic tracking-tighter">{t.tasks}</h2>
            <div className="bg-gray-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">📢</div>
                <div><p className="font-black text-xs uppercase">{t.tg_join}</p><p className="text-[10px] text-green-400">+$1.00</p></div>
              </div>
              <button className="bg-white text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter">Start</button>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md text-center pb-24">
            <h2 className="text-2xl font-black uppercase mb-8 italic tracking-tighter">{t.partners}</h2>
            <div className="bg-gray-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">{t.ref_link}</p>
              <div className="bg-black p-5 rounded-2xl border border-white/5 mb-6 break-all text-[10px] font-mono text-purple-400">
                {`${window.location.origin}?ref=${user.id}`}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`); alert('Copied!'); }} className="w-full bg-purple-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                {t.copy}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md bg-gray-900 rounded-[2.5rem] p-10 border border-white/5 text-center shadow-2xl pb-24">
            <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-[2rem] mx-auto mb-8 flex items-center justify-center text-4xl font-black shadow-2xl rotate-3">
                {user?.email ? user.email[0].toUpperCase() : '?'}
            </div>
            <h2 className="text-xl font-black mb-10 tracking-tight underline decoration-purple-500 decoration-4 underline-offset-8">{user?.email || 'User'}</h2>
            <button onClick={handleLogout} className="w-full py-5 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
              {t.logout}
            </button>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 bg-gray-900/90 border border-white/10 h-20 rounded-[2.5rem] flex justify-around items-center backdrop-blur-2xl z-50 shadow-2xl">
        {[
          { id: 'miner', label: t.mine, icon: '⛏️' },
          { id: 'tasks', label: t.tasks, icon: '📋' },
          { id: 'upgrades', label: t.upgrades, icon: '⚡' },
          { id: 'partners', label: t.partners, icon: '👥' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-[85%] rounded-3xl transition-all duration-300 ${activeTab === tab.id ? 'bg-white/10 text-purple-400 scale-105 shadow-inner' : 'text-gray-500 opacity-50 hover:opacity-100'}`}>
            <span className={`text-xl transition-transform ${activeTab === tab.id ? 'scale-125' : ''}`}>{tab.icon}</span>
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
