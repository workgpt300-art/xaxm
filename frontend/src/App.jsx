import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { Zap, ListChecks, LogOut, Coins, Loader2, MousePointer2 } from 'lucide-react';
import { useAuthStore } from './store'; 

const API_URL = 'https://xaxm-backend.onrender.com';

const App = () => {
  const { user, token, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [balance, setBalance] = useState(0);

  // 1. АВТО-ВХІД
  useEffect(() => {
    const checkAuth = async () => {
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
    checkAuth();
  }, []);

  // 2. ЗАВАНТАЖЕННЯ ЗАВДАНЬ
  useEffect(() => {
    if (token || localStorage.getItem('token')) {
      axios.get(`${API_URL}/api/tasks`)
        .then(res => setTasks(res.data))
        .catch(() => setTasks([]));
    }
  }, [token]);

  // 3. ВИКОНАННЯ ЗАВДАННЯ З ПЕРЕВІРКОЮ ЧАСУ
  const completeTask = async (taskId) => {
    try {
      const currentToken = localStorage.getItem('token') || token;
      const { data } = await axios.post(
        `${API_URL}/api/tasks/complete`,
        { taskId },
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      setBalance(data.newBalance);
      toast.success(`Успішно! +$${data.reward}`, { icon: '💰' });
    } catch (err) {
      // Якщо сервер каже "Зачекайте", показуємо це повідомлення
      const message = err.response?.data?.error || 'Помилка виконання';
      toast.error(message, { duration: 4000 });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={40} /></div>;

  if (!token && !localStorage.getItem('token')) return <div className="text-white p-20 text-center uppercase font-black">Увійдіть в акаунт</div>;

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 font-sans pb-28 relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* ДИЗАЙНЕРСЬКІ ФОНИ */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ШАПКА */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d12]/80 border-b border-[#2a2a35] px-6 py-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-black text-xl">E</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-white">EARN<span className="text-purple-500">.IO</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-[#1a1a22] px-5 py-2.5 rounded-full border border-[#2a2a35] flex items-center gap-3 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Balance</span>
              <span className="font-black text-xl text-white">${balance.toFixed(2)}</span>
            </div>
            <button onClick={logout} className="p-2.5 bg-[#1a1a22] hover:bg-red-950/30 text-red-500 rounded-full border border-[#2a2a35] transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* КОНТЕНТ */}
      <main className="max-w-4xl mx-auto px-6 mt-10">
        {activeTab === 'clicker' ? (
          <div className="flex flex-col items-center py-20 animate-in fade-in zoom-in duration-300">
            <h1 className="text-5xl font-black mb-16 text-center text-white">CLICK & EARN</h1>
            <button 
                onClick={() => setBalance(b => b + 0.01)}
                className="group relative active:scale-90 transition-all duration-75"
            >
              <div className="absolute inset-0 bg-purple-600 rounded-full blur-[60px] opacity-20 group-hover:opacity-40"></div>
              <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-1.5 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                <div className="w-full h-full rounded-full bg-[#0d0d12] flex items-center justify-center border-4 border-white/5">
                  <span className="text-9xl select-none">💎</span>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="mb-8">
                <p className="text-purple-500 text-xs font-bold uppercase tracking-[0.2em]">Available Missions</p>
                <h2 className="text-4xl font-black text-white mt-1">Tasks</h2>
             </div>
            <div className="grid gap-4">
              {tasks.map(task => (
                <div key={task.id} className="bg-[#111116] border border-[#2a2a35] p-6 rounded-[2rem] flex justify-between items-center hover:border-purple-500/50 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-[#1a1a22] rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                      <Zap size={22} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">{task.title}</h3>
                      <p className="text-green-400 font-black text-sm">+ ${task.reward.toFixed(2)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => completeTask(task.id)} 
                    className="bg-white text-black px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-purple-500 hover:text-white transition-all active:scale-95 shadow-xl"
                  >
                    Claim Reward
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* МЕНЮ ВКЛАДОК */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <div className="bg-[#16161e]/80 backdrop-blur-2xl border border-white/5 p-2 rounded-[2.5rem] flex justify-around shadow-2xl ring-1 ring-white/10">
          <button 
            onClick={() => setActiveTab('clicker')}
            className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] transition-all duration-300 ${activeTab === 'clicker' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <MousePointer2 size={20} />
            <span className="text-xs font-black tracking-widest uppercase">Miner</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] transition-all duration-300 ${activeTab === 'tasks' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ListChecks size={20} />
            <span className="text-xs font-black tracking-widest uppercase">Tasks</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
