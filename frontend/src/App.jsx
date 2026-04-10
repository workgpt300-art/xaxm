import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com'; // ЗАМІНИ НА СВІЙ ЯКЩО ТРЕБА

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [showSpin, setShowSpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const fetchUser = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${t}` } });
      setUser(res.data);
      if (res.data.offlineEarned > 0) alert(`Ви заробили офлайн: $${res.data.offlineEarned.toFixed(2)}`);
    } catch (e) { localStorage.removeItem('token'); setToken(null); }
  }, []);

  useEffect(() => { if (token) fetchUser(token); }, [token, fetchUser]);

  // Візуальне оновлення енергії та балансу кожну секунду
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

  const tap = async () => {
    if (!user || user.energy < 1) return;
    setUser(p => ({ ...p, balance: p.balance + (p.clickLevel * 0.01), energy: p.energy - 1 }));
    await axios.post(`${API_URL}/api/user/tap`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const handleSpin = async () => {
    setIsSpinning(true);
    try {
      const res = await axios.post(`${API_URL}/api/spin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => {
        alert(`Виграш: $${res.data.win}`);
        setUser(p => ({ ...p, balance: res.data.balance }));
        setIsSpinning(false); setShowSpin(false);
      }, 2000);
    } catch (e) { alert("Спробуйте завтра!"); setIsSpinning(false); }
  };

  const buy = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (e) { alert("Не вистачає коштів!"); }
  };

  if (!token) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <button onClick={async () => {
        const email = prompt("Email:"); const password = prompt("Password:");
        const res = await axios.post(`${API_URL}/api/auth/register`, { email, password });
        localStorage.setItem('token', res.data.token); setToken(res.data.token);
      }} className="bg-white text-black px-8 py-3 rounded-full font-bold">ПОЧАТИ ГРУ</button>
    </div>
  );

  if (!user) return <div className="h-screen bg-black text-white flex items-center justify-center uppercase tracking-widest">Loading...</div>;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none">
      <header className="p-4 flex justify-between items-center z-10">
        <div className="bg-white/5 border border-white/10 px-4 py-1 rounded-full text-[10px] font-bold text-purple-400">LEAGUE: {user.league}</div>
        <button onClick={() => setShowSpin(true)} className="text-2xl animate-bounce">🎡</button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-32 z-10">
        {activeTab === 'miner' ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black mb-1">${user.balance.toFixed(3)}</h1>
              <p className="text-green-400 text-xs font-bold">+$ {user.passiveIncome.toFixed(2)} / hour</p>
            </div>

            <button onPointerDown={tap} className="w-60 h-60 bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] rounded-full border-[6px] border-[#22222d] shadow-2xl active:scale-95 transition-transform flex items-center justify-center mb-10">
              <span className="text-7xl">💎</span>
            </button>

            <div className="w-full max-w-xs bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
              <div className="flex justify-between text-[10px] font-bold mb-2 text-gray-400">
                <span>ENERGY</span>
                <span>{Math.floor(user.energy)} / {user.maxEnergy}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-300" style={{ width: `${(user.energy/user.maxEnergy)*100}%` }}></div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <h2 className="text-2xl font-black mb-4">SHOP</h2>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <span className="text-2xl">🤖</span>
                 <div><p className="text-sm font-bold">Auto-Miner V1</p><p className="text-[10px] text-green-400">+$0.50/hr</p></div>
               </div>
               <button onClick={() => buy('miner_v1')} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black">$50</button>
            </div>
          </div>
        )}
      </main>

      {showSpin && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/10 w-full max-w-xs rounded-[3rem] p-8 text-center">
            <div className={`text-7xl mb-8 ${isSpinning ? 'animate-spin' : ''}`}>🎡</div>
            <button onClick={handleSpin} disabled={isSpinning} className="w-full py-4 bg-orange-600 rounded-2xl font-black uppercase text-sm">
              {isSpinning ? 'SPINNING...' : 'SPIN FREE'}
            </button>
            <button onClick={() => setShowSpin(false)} className="mt-4 text-gray-500 text-xs">CLOSE</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-[#111]/90 border border-white/10 h-20 rounded-[2.5rem] flex justify-around items-center backdrop-blur-xl">
         {['miner', 'upgrades'].map(t => (
           <button key={t} onClick={() => setActiveTab(t)} className={`flex flex-col items-center gap-1 ${activeTab === t ? 'text-white' : 'text-gray-500'}`}>
              <span className="text-xl">{t === 'miner' ? '⛏️' : '⚡'}</span>
              <span className="text-[10px] font-bold uppercase">{t}</span>
           </button>
         ))}
      </nav>
    </div>
  );
}

export default App;
