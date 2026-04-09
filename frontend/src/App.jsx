import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { Zap, ListChecks, LogOut, Coins, Loader2 } from 'lucide-react';
import { useAuthStore } from './store'; 

const API_URL = 'https://xaxm-backend.onrender.com';

const App = () => {
  const { user, token, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('clicker'); // Вкладка за замовчуванням
  const [balance, setBalance] = useState(0);

  // 1. ПЕРЕВІРКА ЗАПАМ'ЯТОВУВАННЯ (Авто-вхід)
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await axios.get(`${API_URL}/api/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(res.data);
          setBalance(res.data.balance);
        } catch (err) {
          console.error("Session expired");
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [setUser]);

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
      toast.success(`Успішно! +$${data.reward}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Помилка виконання';
      toast.error(errorMsg);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={40} />
    </div>
  );

  // Якщо немає токена — тут має бути твій компонент логіна. 
  // Якщо він в іншому файлі, імпортуй його.
  if (!token) return <div className="text-white p-10 text-center">Будь ласка, увійдіть в акаунт (сторінка Login)</div>;

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 pb-24 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* ВЕРХНЯ ПАНЕЛЬ (Баланс) */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#111116]/80 border-b border-[#2a2a35] px-6 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">E</div>
            <span className="font-black text-white">EARN.IO</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-[#1a1a22] px-4 py-2 rounded-full border border-[#2a2a35] flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" />
              <span className="font-bold text-white">${balance.toFixed(2)}</span>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-6 mt-8">
        {activeTab === 'clicker' ? (
          /* КОНТЕНТ КЛІКЕРА */
          <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in">
            <h1 className="text-4xl font-black mb-12 text-white">ГОЛОВНИЙ МАЙНЕР</h1>
            <button onClick={handleTap} className="relative active:scale-95 transition-transform">
              <div className="absolute inset-0 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
              <div className="w-64 h-64 rounded-full bg-gradient-to-b from-purple-500 to-indigo-700 p-2">
                <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center border-4 border-purple-400/30 text-8xl select-none">
                  🪙
                </div>
              </div>
            </button>
            <p className="mt-10 text-slate-500 italic">Натискай, щоб заробляти</p>
          </div>
        ) : (
          /* КОНТЕНТ ЗАВДАНЬ */
          <div className="animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold mb-6 text-white">Доступні завдання</h2>
            <div className="grid gap-4">
              {tasks.length === 0 ? (
                <p className="text-slate-500 text-center py-10">Завдань поки немає</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="bg-[#111116] border border-[#2a2a35] p-5 rounded-2xl flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">{task.title}</h3>
                      <p className="text-green-400 text-sm font-semibold">+${task.reward.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => completeTask(task.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-bold transition-colors"
                    >
                      Виконати
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* НИЖНЄ МЕНЮ (ПЕРЕМИКАЧ ВКЛАДОК) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="bg-[#16161e]/90 backdrop-blur-2xl border border-[#2a2a35] p-2 rounded-2xl flex justify-around shadow-2xl">
          <button 
            onClick={() => setActiveTab('clicker')}
            className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'clicker' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
          >
            <Zap size={20} />
            <span className="text-[10px] mt-1 font-bold tracking-widest uppercase">Клікер</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'tasks' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
          >
            <ListChecks size={20} />
            <span className="text-[10px] mt-1 font-bold tracking-widest uppercase">Завдання</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
