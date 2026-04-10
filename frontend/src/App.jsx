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

  // --- Завантаження даних ---
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

  // Енергія та пасивка (візуальне оновлення)
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

  // --- Логіка Auth ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, formData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (e) { alert(e.response?.data?.error || "Auth Error"); }
  };

  const handleTap = async () => {
    if (!user || user.energy < 1) return;
    setUser(p => ({ ...p, balance: p.balance + (p.clickLevel * 0.01), energy: p.energy - 1 }));
    await axios.post(`${API_URL}/api/user/tap`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const buyUpgrade = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (e) { alert("Не вистачає коштів!"); }
  };

  // --- ЛОГІКА КОЛЕСА ФОРТУНИ ---
  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    try {
      const res = await axios.post(`${API_URL}/api/spin`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const { prizeType, winAmount } = res.data;

      // Чекаємо 4 секунди (час анімації в index.css)
      setTimeout(() => {
        setIsSpinning(false);
        setShowSpin(false);

        if (prizeType === 'money') {
          alert(`Ви виграли $${winAmount}!`);
        } else if (prizeType === 'autoclick') {
          alert(`БОНУС: Нараховано$${winAmount} за автоклік!`);
        } else if (prizeType === 'energy_boost') {
          alert("Максимальну енергію збільшено!");
        } else if (prizeType === 'full_energy') {
          alert(winAmount > 0 ? `Енергія була фулл! Тримай бонус $${winAmount}` : "Енергію повністю відновлено!");
        }

        fetchUser(token); // Оновлюємо дані з бази
      }, 4000);

    } catch (e) {
      alert(e.response?.data?.error || "Помилка колеса");
      setIsSpinning(false);
    }
  };

  // --- Екрани входу ---
  if (!token) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-2 uppercase tracking-tighter">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8">Start earning real crypto today</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" placeholder="Email Address" 
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all"
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Password" 
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

  if (!user) return <div className="h-screen bg-black text-white flex items-center justify-center font-black animate-pulse">SYNCING DATA...</div>;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none">
      
      {/* Header */}
      <header className="p-4 flex justify-between items-center z-10 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500"></div>
           <span className="text-xs font-black uppercase tracking-widest">{user.league} League</span>
        </div>
        <button onClick={() => setShowSpin(true)} className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">🎡</button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-6 pb-32 overflow-y-auto">
        
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="text-center mb-10">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Total Balance</p>
              <h1 className="text-6xl font-black tracking-tighter">${user.balance.toFixed(3)}</h1>
              <div className="mt-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold inline-block">
                +$ {user.passiveIncome.toFixed(2)} / HR
              </div>
            </div>

            <button onPointerDown={handleTap} className="relative w-64 h-64 mb-12 active:scale-90 transition-transform group">
              <div className="absolute inset-0 bg-purple-600/20 blur-[60px] rounded-full group-active:bg-blue-600/30"></div>
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] rounded-full border-[6px] border-[#22222d] shadow-2xl flex items-center justify-center relative z-10">
                <span className="text-8xl">💎</span>
              </div>
            </button>

            <div className="w-full max-w-xs bg-white/5 border border-white/10 p-5 rounded-[2rem] backdrop-blur-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Energy Recovery</span>
                <span className="text-xs font-bold">{Math.floor(user.energy)}/{user.maxEnergy}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                <div className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-yellow-200 rounded-full transition-all" style={{ width: `${(user.energy/user.maxEnergy)*100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* SHOP, FRIENDS, PROFILE tabs залишаються без змін */}
        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-3xl font-black mb-6 uppercase italic">Marketplace</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'miner_v1', name: 'Nano Bot V1', price: 50, profit: 0.5, icon: '🤖' },
                { id: 'miner_v2', name: 'Cyber Drill', price: 250, profit: 2.5, icon: '⚙️' },
                { id: 'multitap', name: 'Multi-Tap', price: 100, profit: 'x2', icon: '⚡' }
              ].map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex justify-between items-center hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl bg-black/40 w-14 h-14 flex items-center justify-center rounded-2xl">{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-[10px] text-green-400 font-bold">+{item.profit}/hr profit</p>
                    </div>
                  </div>
                  <button onClick={() => buyUpgrade(item.id)} className="bg-white text-black px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                    ${item.price}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md text-center">
            <div className="text-6xl mb-6">👥</div>
            <h2 className="text-3xl font-black mb-2 uppercase">Invite Friends</h2>
            <p className="text-gray-500 text-sm mb-8">Get 10% from their earnings forever!</p>
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] mb-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Your Referral Link</p>
              <div className="bg-black/50 p-3 rounded-xl text-xs font-mono border border-white/5 break-all">
                {`https://t.me/xaxm_bot?start=${user.referralCode}`}
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(`https://t.me/xaxm_bot?start=${user.referralCode}`);
                alert("Copied!");
              }} className="mt-4 w-full py-3 bg-purple-600 rounded-xl font-bold text-xs uppercase">Copy Link</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md space-y-4">
             <div className="bg-gradient-to-br from-purple-900/40 to-black border border-white/10 p-8 rounded-[3rem] text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">💎</div>
                <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl border border-white/20">👤</div>
                <h3 className="text-xl font-black mb-1">{user.email.split('@')[0]}</h3>
                <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest">{user.league} Champion</p>
             </div>
             <button onClick={() => { localStorage.removeItem('token'); setToken(null); }} className="w-full py-4 text-red-500 font-bold text-xs uppercase tracking-widest">Log Out</button>
          </div>
        )}

      </main>

      {/* Navigation Bar */}
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

      {/* MODAL КОЛЕСА З АНІМАЦІЄЮ */}
      {showSpin && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-gradient-to-b from-[#111] to-black border border-white/10 w-full max-w-xs rounded-[3.5rem] p-10 text-center shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            <h3 className="text-xl font-black mb-8 uppercase italic tracking-widest">Fortune Wheel</h3>
            
            {/* Саме колесо */}
            <div className="relative w-48 h-48 mx-auto mb-10">
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 text-2xl text-red-500">▼</div>
              <div className={`w-full h-full rounded-full border-4 border-white/10 flex items-center justify-center text-8xl transition-all ${isSpinning ? 'spinning' : ''}`}
                   style={{ background: 'conic-gradient(#222 0deg 90deg, #333 90deg 180deg, #222 180deg 270deg, #333 270deg 360deg)' }}>
                🎡
              </div>
            </div>

            <button onClick={handleSpin} disabled={isSpinning} className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-30">
               {isSpinning ? 'Spinning...' : 'Spin for Free'}
            </button>
            <button onClick={() => !isSpinning && setShowSpin(false)} className="mt-6 text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors">Close</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
