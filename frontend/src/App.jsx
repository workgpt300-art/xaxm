import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [authMode, setAuthMode] = useState('login'); 
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  const [showSpin, setShowSpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [clicks, setClicks] = useState([]); // Для ефектів кліку

  // --- 1. ЗАПАМ'ЯТОВУВАЧ ---
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPass = localStorage.getItem('remembered_password');
    if (savedEmail && savedPass) {
      setFormData({ email: savedEmail, password: savedPass });
    }
  }, []);

  const fetchUser = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      setUser(res.data);
      if (res.data.offlineEarned > 0) alert(`Offline profit: +$${res.data.offlineEarned.toFixed(2)}`);
    } catch (e) { 
      localStorage.removeItem('token'); 
      setToken(null); 
    }
  }, []);

  useEffect(() => { if (token) fetchUser(token); }, [token, fetchUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setUser(p => p ? ({
        ...p,
        energy: Math.min(p.maxEnergy, p.energy + (p.maxEnergy/9000)),
        balance: p.balance + (p.passiveIncome/3600)
      }) : p);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, formData);
      
      // Збереження для запам'ятовувача
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('remembered_email', formData.email);
      localStorage.setItem('remembered_password', formData.password);
      
      setToken(res.data.token);
    } catch (e) { alert(e.response?.data?.error || "Auth Error"); }
  };

  // --- 2. ЕФЕКТ КЛІКУ ---
  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;

    // Створюємо візуальний ефект
    const id = Date.now();
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    setClicks(prev => [...prev, { id, x, y, val: (user.clickLevel * 0.01).toFixed(2) }]);
    
    // Видаляємо ефект через 1 сек
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 1000);

    setUser(p => ({ ...p, balance: p.balance + (p.clickLevel * 0.01), energy: p.energy - 1 }));
    await axios.post(`${API_URL}/api/user/tap`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const buyUpgrade = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (e) { alert("Не вистачає коштів!"); }
  };

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    try {
      const res = await axios.post(`${API_URL}/api/spin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const { win } = res.data;
      setTimeout(() => {
        setIsSpinning(false);
        setShowSpin(false);
        alert(`Ви виграли $${win}!`);
        fetchUser(token);
      }, 4000);
    } catch (e) {
      alert(e.response?.data?.error || "Помилка колеса");
      setIsSpinning(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-2 uppercase tracking-tighter">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8">Data will be saved on this device</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" placeholder="Email Address" 
            value={formData.email}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all"
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Password" 
            value={formData.password}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all"
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
          <button className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-sm hover:bg-gray-200 transition-all shadow-lg">
            {authMode === 'login' ? 'Sign In' : 'Join Now'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-white font-bold underline">
            {authMode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );

  if (!user) return <div className="h-screen bg-black text-white flex items-center justify-center font-black animate-pulse">SYNCING...</div>;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none font-sans">
      
      {/* Рендер ефектів кліку */}
      {clicks.map(c => (
        <span key={c.id} className="absolute pointer-events-none text-2xl font-black text-white z-[100] animate-float-up"
              style={{ left: c.x, top: c.y }}>
          +${c.val}
        </span>
      ))}

      <header className="p-4 flex justify-between items-center z-10 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(147,51,234,0.5)]"></div>
           <span className="text-xs font-black uppercase tracking-widest">{user.league} League</span>
        </div>
        <button onClick={() => setShowSpin(true)} className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] hover:scale-110 transition-transform">🎡</button>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 pb-32 overflow-y-auto">
        
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="text-center mb-10">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Current Balance</p>
              <h1 className="text-6xl font-black tracking-tighter">${user.balance.toFixed(3)}</h1>
              <div className="mt-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold inline-block border border-green-500/20">
                +${user.passiveIncome.toFixed(2)} / HR
              </div>
            </div>

            <button onPointerDown={handleTap} className="relative w-64 h-64 mb-12 active:scale-95 transition-transform group">
              <div className="absolute inset-0 bg-purple-600/20 blur-[60px] rounded-full group-active:bg-blue-600/30"></div>
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] rounded-full border-[6px] border-[#22222d] shadow-2xl flex items-center justify-center relative z-10 overflow-hidden">
                <span className="text-8xl group-active:scale-110 transition-transform">💎</span>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity"></div>
              </div>
            </button>

            <div className="w-full max-w-xs bg-white/5 border border-white/10 p-5 rounded-[2.5rem] backdrop-blur-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Energy Recovery</span>
                <span className="text-xs font-bold">{Math.floor(user.energy)}/{user.maxEnergy}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                <div className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-yellow-200 rounded-full transition-all duration-300" 
                     style={{ width: `${(user.energy/user.maxEnergy)*100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. ОНОВЛЕНИЙ ПРОФІЛЬ --- */}
        {activeTab === 'profile' && (
          <div className="w-full max-w-md space-y-6">
            <div className="bg-gradient-to-br from-[#111] via-[#0a0a0a] to-black border border-white/10 p-8 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/10 blur-[50px] rounded-full"></div>
              <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full mx-auto mb-4 p-1 shadow-lg">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-4xl">👤</div>
              </div>
              <h3 className="text-2xl font-black mb-1 italic tracking-tight">{user.email.split('@')[0]}</h3>
              <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em]">{user.league} Rank</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col items-center">
                <span className="text-gray-500 text-[9px] font-black uppercase mb-1">Click Power</span>
                <span className="text-xl font-black italic">Lvl {user.clickLevel}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col items-center">
                <span className="text-gray-500 text-[9px] font-black uppercase mb-1">Max Energy</span>
                <span className="text-xl font-black text-yellow-500">{user.maxEnergy}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Next Tier Progress</span>
                  <span className="text-sm font-bold tracking-tighter">Gold League Upgrade</span>
                </div>
                <span className="text-xs font-black text-purple-400">75%</span>
              </div>
              <div className="h-2 bg-black rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-3xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-red-500 uppercase">Account Security</span>
                <span className="text-[11px] text-gray-400">Sessions are active</span>
              </div>
              <button onClick={() => { localStorage.removeItem('token'); setToken(null); }} 
                      className="bg-red-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl">
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Інші таби (Upgrades, Partners) без змін */}
        {activeTab === 'upgrades' && <div className="text-center py-20 opacity-50 font-black">SHOP UNDER RECONSTRUCTION</div>}
        {activeTab === 'partners' && <div className="text-center py-20 opacity-50 font-black">FRIENDS SYSTEM LOADING</div>}

      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#111]/90 border border-white/10 h-22 rounded-[3rem] flex justify-around items-center backdrop-blur-2xl z-50 px-2 shadow-2xl">
          {[
            { id: 'miner', icon: '⛏️', label: 'Miner' },
            { id: 'upgrades', icon: '⚡', label: 'Shop' },
            { id: 'partners', icon: '👥', label: 'Friends' },
            { id: 'profile', icon: '👤', label: 'Account' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/10 scale-105' : 'opacity-40 hover:opacity-100'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* Колесо модалка */}
      {showSpin && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-gradient-to-b from-[#111] to-black border border-white/10 w-full max-w-xs rounded-[3.5rem] p-10 text-center">
            <h3 className="text-xl font-black mb-8 uppercase italic italic">Fortune Wheel</h3>
            <div className="relative w-48 h-48 mx-auto mb-10">
              <div className={`w-full h-full rounded-full border-4 border-white/10 flex items-center justify-center text-8xl transition-all ${isSpinning ? 'spinning' : ''}`}
                   style={{ background: 'conic-gradient(#222 0deg 90deg, #333 90deg 180deg, #222 180deg 270deg, #333 270deg 360deg)' }}>
                🎡
              </div>
            </div>
            <button onClick={handleSpin} disabled={isSpinning} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs">
               {isSpinning ? 'Spinning...' : 'Spin for Free'}
            </button>
            <button onClick={() => !isSpinning && setShowSpin(false)} className="mt-6 text-gray-500 font-bold text-[10px] uppercase">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
