import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { Zap, ListChecks, LogOut, Loader2, MousePointer2, TrendingUp, Gift } from 'lucide-react';
import { useAuthStore } from './store'; 

const API_URL = 'https://xaxm-backend.onrender.com';

const App = () => {
  const { user, token, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('clicker'); 
  const [balance, setBalance] = useState(0);

  // --- 1. АВТО-ВХІД ТА ОНОВЛЕННЯ ДАНИХ ---
  const fetchData = async () => {
    const savedToken = localStorage.getItem('token') || token;
    if (savedToken) {
      try {
        const res = await axios.get(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        setUser(res.data);
        setBalance(res.data.balance);
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Оновлюємо дані кожні 30 секунд (для регенерації енергії в майбутньому)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token || localStorage.getItem('token')) {
      axios.get(`${API_URL}/api/tasks`)
        .then(res => setTasks(res.data))
        .catch(() => setTasks([]));
    }
  }, [token]);

  // --- 2. ЛОГІКА КЛІКЕРА ---
  const handleTap = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/user/tap`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }
      });
      setBalance(data.balance);
      setUser({ ...user, energy: data.energy });
    } catch (err) {
      toast.error(err.response?.data?.error || "Помилка");
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/user/upgrade`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }
      });
      setUser(data);
      setBalance(data.balance);
      toast.success(`Рівень підвищено до ${data.clickLevel}!`, { icon: '🚀' });
    } catch (err) {
      toast.error(err.response?.data?.error || "Недостатньо коштів");
    }
  };

  const claimBonus = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/user/bonus`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }
      });
      setBalance(data.balance);
      fetchData(); // Оновлюємо стан користувача
      toast.success(data.message, { icon: '🎁' });
    } catch (err) {
      toast.error(err.response?.data?.error || "Ще не час");
    }
  };

  // --- 3. ЗАВДАННЯ ---
  const completeTask = async (taskId) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/tasks/complete`, { taskId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }
      });
      setBalance(data.newBalance);
      toast.success(`+$${data.reward}`, { icon: '💰' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Помилка');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={40} /></div>;
  if (!token && !localStorage.getItem('token')) return <div className="text-white p-20 text-center font-black">УВІЙДІТЬ В АКАУНТ</div>;

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 font-sans pb-32 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Background Glow */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d12]/80 border-b border-[#2a2a35] px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">E</span>
            </div>
            <span className="text-xl font-black text-white">EARN<span className="text-purple-500">.IO</span></span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-[#1a1a22] px-4 py-2 rounded-full border border-[#2a2a35] flex items-center gap-2">
              <span className="font-black text-lg text-white">${balance.toFixed(2)}</span>
            </div>
            <button onClick={logout} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-6 mt-8">
        {activeTab === 'clicker' ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            {/* ENERGY BAR */}
            <div className="w-full bg-[#1a1a22] h-4 rounded-full border border-[#2a2a35] overflow-hidden mb-8 shadow-inner">
               <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300" 
                style={{ width: `${(user?.energy / user?.maxEnergy) * 100}%` }}
               ></div>
            </div>
            <div className="flex gap-4 mb-10">
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                 <Zap size={14} className="text-yellow-400 fill-yellow-400" /> Energy: {user?.energy} / {user?.maxEnergy}
               </span>
            </div>

            {/* MAIN COIN */}
            <button onClick={handleTap} className="group relative active:scale-95 transition-all mb-12">
              <div className="absolute inset-0 bg-purple-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-1.5 shadow-2xl">
                <div className="w-full h-full rounded-full bg-[#0d0d12] flex items-center justify-center border-4 border-white/5">
                  <span className="text-8xl select-none">💎</span>
                </div>
              </div>
            </button>

            {/* UPGRADE & BONUS CARDS */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button 
                onClick={handleUpgrade}
                className="bg-[#111116] border border-[#2a2a35] p-5 rounded-[2rem] hover:border-purple-500/50 transition-all text-left"
              >
                <TrendingUp className="text-purple-500 mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Upgrade Lvl {user?.clickLevel}</p>
                <p className="text-white font-black text-lg">${(user?.clickLevel * 5).toFixed(2)}</p>
              </button>

              <button 
                onClick={claimBonus}
                className="bg-[#111116] border border-[#2a2a35] p-5 rounded-[2rem] hover:border-green-500/50 transition-all text-left"
              >
                <Gift className="text-green-500 mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Daily Bonus</p>
                <p className="text-white font-black text-lg">CLAIM</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-white mb-6">Missions</h2>
            <div className="grid gap-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-[#111116] border border-[#2a2a35] p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white">{task.title}</h3>
                    <p className="text-green-400 font-black text-xs">+ ${task.reward.toFixed(2)}</p>
                  </div>
                  <button onClick={() => completeTask(task.id)} className="bg-white text-black px-5 py-2 rounded-xl font-black text-xs uppercase transition-transform active:scale-90">
                    Claim
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER NAV */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <div className="bg-[#16161e]/90 backdrop-blur-2xl border border-white/5 p-2 rounded-full flex justify-around shadow-2xl">
          <button onClick={() => setActiveTab('clicker')} className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${activeTab === 'clicker' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            <MousePointer2 size={18} />
            <span className="text-[10px] font-black uppercase">Miner</span>
          </button>
          <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${activeTab === 'tasks' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            <ListChecks size={18} />
            <span className="text-[10px] font-black uppercase">Tasks</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
