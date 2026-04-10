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
    tg_join: "Підписка на канал", claim: "Отримати $1.00",
    login: "Увійти", signup: "Створити акаунт",
    email_placeholder: "Електронна пошта", pass_placeholder: "Пароль"
  },
  ENG: {
    mine: "MINING", tasks: "TASKS", upgrades: "UPGRADES", profile: "PROFILE", partners: "FRIENDS",
    balance: "TOTAL BALANCE", energy: "ENERGY",
    logout: "Log Out", loading: "Loading...",
    level: "LEVEL", up_click: "Tap Power", up_energy: "Energy Limit",
    buy: "Upgrade", ref_link: "Your link", copy: "Copy",
    tg_join: "Join Channel", claim: "Claim $1.00",
    login: "Login", signup: "Sign Up",
    email_placeholder: "Email Address", pass_placeholder: "Password"
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

  const fetchData = useCallback(async (currentToken) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setUser(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, fetchData]);

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
        email, password, referrerId: urlParams.get('ref') 
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

    setUser(prev => ({ 
      ...prev, 
      balance: Number(prev.balance) + income, 
      energy: prev.energy - 1 
    }));

    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setUser(prev => ({ ...prev, balance: res.data.balance, energy: res.data.energy }));
    } catch (err) { console.error("Tap error:", err); }
  };

  const buyUpgrade = async (type) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: type }, 
      { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (err) { 
      alert(err.response?.data?.error || "Error buying upgrade"); 
    }
  };

  // Компонент фону (сфери, що світяться)
  const BackgroundGlow = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[100px] animate-float"></div>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <BackgroundGlow />
        <div className="w-full max-w-md bg-glass backdrop-blur-2xl border border-glassBorder rounded-[2rem] p-8 shadow-2xl relative z-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full blur-sm mb-6 flex items-center justify-center shadow-neon-purple">
            <span className="text-4xl drop-shadow-lg">💎</span>
          </div>
          <h2 className="text-3xl font-black text-center mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {isRegister ? t.signup : t.login}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder={t.email_placeholder} className="w-full p-4 bg-black/40 rounded-2xl outline-none border border-glassBorder focus:border-purple-500 transition-all text-sm font-medium" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder={t.pass_placeholder} className="w-full p-4 bg-black/40 rounded-2xl outline-none border border-glassBorder focus:border-purple-500 transition-all text-sm font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-2xl font-bold uppercase tracking-widest active:scale-[0.98] transition-all shadow-neon-purple">
              {isRegister ? t.signup : t.login}
            </button>
          </form>
          <p className="text-center mt-6 text-gray-400 text-sm cursor-pointer font-medium hover:text-white transition-colors" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Login' : 'No account? Create one'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <BackgroundGlow />
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-6 relative z-10"></div>
        <p className="tracking-[0.2em] font-bold text-gray-400 animate-pulse relative z-10">{t.loading}</p>
      </div>
    );
  }

  // Безпечні розрахунки для уникнення NaN
  const currentClickLevel = Number(user?.clickLevel) || 1;
  const nextClickCost = (5 * Math.pow(2, currentClickLevel - 1)).toFixed(0);
  
  const currentMaxEnergy = Number(user?.maxEnergy) || 5000;
  const energyLevel = Math.max(1, Math.floor((currentMaxEnergy - 5000) / 500) + 1);
  const nextEnergyCost = (3 * Math.pow(1.8, energyLevel - 1)).toFixed(0);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col select-none overflow-y-auto pb-28 relative">
      <BackgroundGlow />

      {/* Клікабельні частинки */}
      {clickParticles.map(p => (
        <span key={p.id} className="animate-float-up text-green-400 font-black pointer-events-none fixed z-[60] text-3xl" style={{ left: p.x, top: p.y }}>
          +${p.value}
        </span>
      ))}

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center z-40 sticky top-0 bg-[#050505]/80 backdrop-blur-md border-b border-glassBorder">
        <div className="bg-glass p-1 rounded-full border border-glassBorder flex backdrop-blur-sm shadow-sm">
           <button onClick={() => setLang('UA')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'UA' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>UA</button>
           <button onClick={() => setLang('ENG')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'ENG' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>EN</button>
        </div>
        
        <div onClick={() => setActiveTab('profile')} className="flex items-center gap-3 bg-glass p-1.5 pl-4 rounded-full border border-glassBorder cursor-pointer active:scale-95 transition-all backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[10px] text-purple-400 font-black uppercase leading-none mb-1">{t.level} {currentClickLevel}</p>
            <p className="text-xs font-bold text-gray-200">{user?.email ? user.email.split('@')[0] : 'User'}</p>
          </div>
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-sm shadow-neon-purple">
            {user?.email ? user.email[0].toUpperCase() : '?'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-6 relative z-10">
        
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center w-full max-w-sm mt-4">
            <div className="bg-glass border border-glassBorder px-6 py-2 rounded-full mb-6 backdrop-blur-sm">
                <p className="text-gray-400 uppercase text-[10px] font-bold tracking-[0.2em]">{t.balance}</p>
            </div>
            
            <h1 className="text-6xl font-black mb-12 tracking-tighter drop-shadow-xl text-white">
              ${Number(user?.balance || 0).toFixed(3)}
            </h1>
            
            {/* Преміум кнопка тапу */}
            <div className="relative w-72 h-72 flex items-center justify-center mb-16">
              <div className="absolute inset-0 bg-purple-600/20 blur-[60px] rounded-full animate-pulse-slow"></div>
              <button onPointerDown={handleTap} className="relative z-10 w-64 h-64 rounded-full bg-gradient-to-b from-[#1a1a24] to-[#0d0d14] border-[6px] border-[#2a2a35] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_20px_rgba(255,255,255,0.05)] active:scale-[0.96] active:shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_5px_30px_rgba(0,0,0,0.8)] transition-all duration-150 flex items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-8xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transform group-active:scale-95 transition-transform">💎</span>
              </button>
            </div>

            {/* Смуга енергії */}
            <div className="w-full bg-glass p-5 rounded-[2rem] border border-glassBorder backdrop-blur-md">
              <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">⚡</span>
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{t.energy}</span>
                </div>
                <span className="text-sm font-bold text-white">{Math.floor(user?.energy || 0)} <span className="text-gray-500">/ {currentMaxEnergy}</span></span>
              </div>
              <div className="h-3.5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-glassBorder shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                  style={{ width: `${((user?.energy || 0) / (currentMaxEnergy || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4 mt-2">
            <h2 className="text-3xl font-black mb-6 text-white tracking-tight">{t.upgrades}</h2>
            
            {/* Картка прокачки 1 */}
            <div className="bg-glass p-4 rounded-3xl border border-glassBorder flex justify-between items-center hover:bg-white/5 transition-all backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">☝️</div>
                <div>
                  <p className="font-bold text-sm text-white mb-0.5">{t.up_click}</p>
                  <p className="text-xs text-purple-400 font-semibold tracking-wide">LVL {currentClickLevel}</p>
                </div>
              </div>
              <button onClick={() => buyUpgrade('multitap')} className="bg-white text-black px-5 py-3 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-all">
                ${nextClickCost}
              </button>
            </div>

            {/* Картка прокачки 2 */}
            <div className="bg-glass p-4 rounded-3xl border border-glassBorder flex justify-between items-center hover:bg-white/5 transition-all backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🔋</div>
                <div>
                  <p className="font-bold text-sm text-white mb-0.5">{t.up_energy}</p>
                  <p className="text-xs text-blue-400 font-semibold tracking-wide">+{currentMaxEnergy}</p>
                </div>
              </div>
              <button onClick={() => buyUpgrade('energyLimit')} className="bg-white text-black px-5 py-3 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-all">
                ${nextEnergyCost}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="w-full max-w-md space-y-4 mt-2">
            <h2 className="text-3xl font-black mb-6 text-white tracking-tight">{t.tasks}</h2>
            <div className="bg-glass p-4 rounded-3xl border border-glassBorder flex justify-between items-center backdrop-blur-md hover:bg-white/5 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/20 rounded-2xl flex items-center justify-center text-3xl">📢</div>
                <div>
                    <p className="font-bold text-sm text-white mb-0.5">{t.tg_join}</p>
                    <p className="text-xs text-green-400 font-bold">+$1.00</p>
                </div>
              </div>
              <button className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold">Start</button>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md mt-2">
            <h2 className="text-3xl font-black mb-6 text-white tracking-tight text-center">{t.partners}</h2>
            <div className="bg-glass p-8 rounded-[2.5rem] border border-glassBorder shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full"></div>
              
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">{t.ref_link}</p>
              
              {/* Безпечний вивід посилання */}
              <div className="bg-black/50 p-4 rounded-2xl border border-glassBorder mb-6 break-all text-xs font-mono text-purple-300 text-center shadow-inner">
                {window.location.origin}?ref={user?.id || 'loading...'}
              </div>
              
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.id}`); alert('Copied!'); }} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-xl font-bold uppercase text-sm tracking-wider shadow-neon-purple active:scale-[0.98] transition-all text-white">
                {t.copy}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md mt-2">
             <div className="bg-glass rounded-[2.5rem] p-8 border border-glassBorder text-center shadow-2xl backdrop-blur-md">
                <div className="w-28 h-28 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-5xl font-black shadow-neon-purple transform rotate-3">
                    {user?.email ? user.email[0].toUpperCase() : '?'}
                </div>
                <h2 className="text-2xl font-bold mb-8 text-white">{user?.email || 'User'}</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-black/30 p-4 rounded-2xl border border-glassBorder">
                        <p className="text-[10px] text-gray-400 uppercase mb-1">{t.balance}</p>
                        <p className="font-bold">${Number(user?.balance || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-2xl border border-glassBorder">
                        <p className="text-[10px] text-gray-400 uppercase mb-1">{t.level}</p>
                        <p className="font-bold">{currentClickLevel}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-bold uppercase text-xs border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                {t.logout}
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Modern Navigation Menu */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-[#111116]/90 border border-white/10 h-20 rounded-[2rem] flex justify-around items-center backdrop-blur-xl z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {[
          { id: 'miner', label: t.mine, icon: '⛏️' },
          { id: 'tasks', label: t.tasks, icon: '📋' },
          { id: 'upgrades', label: t.upgrades, icon: '⚡' },
          { id: 'partners', label: t.partners, icon: '👥' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {activeTab === tab.id && <div className="absolute -top-1 w-8 h-1 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>}
            <span className={`text-2xl transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60'}`}>{tab.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
