import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { Zap, ListChecks, LogOut, Coins, Loader2 } from 'lucide-react';
import { useAuthStore } from './store'; // Переконайся, що шлях до стору вірний

const API_URL = 'https://xaxm-backend.onrender.com';

const App = () => {
  const { user, token, setAuth, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('clicker');
  const [balance, setBalance] = useState(0);

  // 1. ЕФЕКТ ЗАПАМ'ЯТОВУВАННЯ (Авто-вхід)
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken && !user) {
        try {
          const { data } = await axios.get(`${API_URL}/api/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(data);
          setBalance(data.balance);
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 2. ЗАВАНТАЖЕННЯ ЗАВДАНЬ
  useEffect(() => {
    if (token) {
      axios.get(`${API_URL}/api/tasks`)
        .then(res => setTasks(res.data))
        .catch(() => setTasks([]));
    }
  }, [token]);

  // 3. ЛОГІКА КЛІКЕРА
  const handleTap = () => {
    setBalance(prev => prev + 0.01);
    if (navigator.vibrate) navigator.vibrate(40);
  };

  const completeTask = async (taskId) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/tasks/complete`,
        { taskId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(data.newBalance);
      toast.success(`+$${data.reward} зараховано!`);
    } catch (err) {
      toast.error('Помилка виконання');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={40} />
    </div>
  );

  if (!token) return <Login />; // Якщо немає токена — показуємо твою сторінку логіна

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 pb-24 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* ФОН */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#111116]/80 border-b border-[#2a2a35] px-6 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white">E</div>
            <span className="font-black tracking-tighter text-white">EARN.IO</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-[#1a1a22] px-4 py-2 rounded-full border border-[#2a2a35] flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" />
              <span className="font-bold text-lg text-white">${balance.toFixed(2)}</span>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-xl mx-auto px-6 mt-8">
        {activeTab === 'clicker' ? (
          <div className="flex flex-col items-center justify-center py-10">
            <h1 className="text-4xl font-black mb-12 text-white">КЛІКЕР</h1>
            <button onClick={handleTap} className="relative active:scale-90 transition-transform">
              <div className="absolute inset-0 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
              <div className="w-64 h-64 rounded-full bg-gradient-to-b from-purple-500 to-indigo-700 p-2 shadow-2xl">
                <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center border-4 border-purple-400/30">
                  <span className="text-8xl select-none">🪙</span>
                </div>
              </div>
            </button>
            <p className="mt-12 text-slate-500 text-sm">Клікай та заробляй $0.01 за раз</p>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-6 text-white">Завдання</h2>
            <div className="grid gap-4">
              {tasks.map(task => (
                <div key={task.id} className="bg-[#111116] border border-[#2a2a35] p-5 rounded-2xl flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-white">{task.title}</h3>
                    <p className="text-green-400 text-sm">+${task.reward.toFixed(2)}</p>
                  </div>
                  <button onClick={() => completeTask(task.id)} className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm">
                    Виконати
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM MENU */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="bg-[#16161e]/90 backdrop-blur-2xl border border-[#2a2a35] p-2 rounded-2xl flex justify-around shadow-2xl">
          <button 
            onClick={() => setActiveTab('clicker')}
            className={`flex flex-col items-center flex-1 py-2 rounded-xl ${activeTab === 'clicker' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            <Zap size={20} />
            <span className="text-[10px] mt-1 font-bold">КЛІКЕР</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center flex-1 py-2 rounded-xl ${activeTab === 'tasks' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            <ListChecks size={20} />
            <span className="text-[10px] mt-1 font-bold">ЗАВДАННЯ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
