import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner'); // 'miner', 'tasks', 'profile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

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

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await axios.post(`${API_URL}${path}`, { email, password });
      if (isRegister) { alert("Успіх! Увійдіть."); setIsRegister(false); }
      else {
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
    if (!user || user.energy <= 0) return;
    try {
      const res = await axios.post(`${API_URL}/api/user/tap`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({ ...prev, balance: res.data.balance, energy: res.data.energy }));
    } catch (err) { console.error(err); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 border border-purple-500 rounded-3xl p-8">
          <h2 className="text-3xl font-black text-center mb-6">{isRegister ? 'JOIN US' : 'WELCOME BACK'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-800 rounded-2xl outline-none border border-transparent focus:border-purple-500" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-4 bg-purple-600 rounded-2xl font-bold text-lg hover:bg-purple-500 transition">{isRegister ? 'Sign Up' : 'Login'}</button>
          </form>
          <p className="text-center mt-6 text-gray-400" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Login' : 'New here? Create account'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3" onClick={() => setActiveTab('profile')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center font-bold border-2 border-white/20">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">Level {user.clickLevel}</p>
            <p className="text-sm font-bold truncate w-24">{user.email.split('@')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
           <span className="text-yellow-400 font-bold">UA</span>
           <div className="w-[1px] h-4 bg-gray-600 mx-1"></div>
           <span className="text-sm text-gray-300">ENG</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center">
             <div className="text-center mb-8">
                <p className="text-gray-400 uppercase text-xs tracking-widest mb-1">Total Balance</p>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                  ${user.balance.toFixed(3)}
                </h1>
             </div>

             <button onClick={handleTap} className="relative active:scale-90 transition-transform duration-75">
                <div className="absolute inset-0 bg-purple-600 rounded-full blur-[60px] opacity-20"></div>
                <div className="w-72 h-72 bg-gradient-to-b from-gray-800 to-gray-900 rounded-full border-[10px] border-gray-800 flex items-center justify-center shadow-2xl">
                   <span className="text-9xl select-none">🪙</span>
                </div>
             </button>

             <div className="w-full max-w-xs mt-12">
                <div className="flex justify-between text-xs font-bold mb-2 px-1">
                   <span className="text-purple-400">⚡ ENERGY</span>
                   <span>{user.energy} / {user.maxEnergy}</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full border border-gray-700 overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400 transition-all" style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}></div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Available Tasks</h2>
            <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
               <div>
                  <p className="font-bold">Subscribe to Telegram</p>
                  <p className="text-sm text-green-400">+$50.00</p>
               </div>
               <button className="bg-purple-600 px-4 py-2 rounded-xl text-sm font-bold">Go</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">User Settings</h2>
            <div className="space-y-4">
               <div className="flex justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400">Email</span>
                  <span>{user.email}</span>
               </div>
               <div className="flex justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400">Click Level</span>
                  <span>{user.clickLevel}</span>
               </div>
               <button onClick={handleLogout} className="w-full py-4 mt-6 bg-red-900/30 text-red-500 rounded-2xl font-bold border border-red-900/50">
                  Log Out
               </button>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM TAB BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-around items-center backdrop-blur-lg">
        <button onClick={() => setActiveTab('miner')} className={`flex flex-col items-center gap-1 ${activeTab === 'miner' ? 'text-purple-500' : 'text-gray-500'}`}>
          <span className="text-2xl">⛏️</span>
          <span className="text-[10px] font-bold">MINE</span>
        </button>
        <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-purple-500' : 'text-gray-500'}`}>
          <span className="text-2xl">📋</span>
          <span className="text-[10px] font-bold">TASKS</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-purple-500' : 'text-gray-500'}`}>
          <span className="text-2xl">👤</span>
          <span className="text-[10px] font-bold">PROFILE</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
