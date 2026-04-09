import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from './store';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = "https://xaxm-backend.onrender.com";

// --- ВХІД ТА РЕЄСТРАЦІЯ (КІБЕРПАНК ДИЗАЙН) ---
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const { data } = await axios.post(`${API_URL}${endpoint}`, form);
      setAuth(data.user, data.token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!', {
        style: { borderRadius: '15px', background: '#1e1e2e', color: '#fff' }
      });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративні сяйва на фоні */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px]"></div>

      <div className="bg-[#111116]/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-[#2a2a35] relative z-10">
        <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white font-black text-3xl">E</span>
            </div>
        </div>
        
        <h1 className="text-4xl font-black mb-2 text-center text-white tracking-tighter">
          {isLogin ? 'Welcome Back' : 'Join EARN.IO'}
        </h1>
        <p className="text-slate-500 text-center mb-8 font-medium">
          {isLogin ? 'Enter your details to continue' : 'Start your journey to success'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" placeholder="Your Name" 
              className="w-full p-4 bg-[#1a1a22] border border-[#2a2a35] rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white transition-all"
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
            />
          )}
          <input 
            type="email" placeholder="Email Address" 
            className="w-full p-4 bg-[#1a1a22] border border-[#2a2a35] rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white transition-all"
            onChange={(e) => setForm({...form, email: e.target.value})}
            required
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full p-4 bg-[#1a1a22] border border-[#2a2a35] rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white transition-all"
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
          />
          <button className="w-full bg-white text-black p-4 rounded-2xl font-black text-lg hover:bg-purple-500 hover:text-white transition-all shadow-lg hover:shadow-purple-500/30 transform active:scale-95 mt-4">
            {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-slate-400 font-bold hover:text-purple-400 transition-colors text-sm uppercase tracking-widest"
        >
          {isLogin ? "New here? Register now" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

// --- ДАШБОРД (НЕОНОВИЙ ДИЗАЙН) ---
const Dashboard = () => {
  const { user, token, logout } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [balance, setBalance] = useState(user?.balance || 0);

  useEffect(() => {
    axios.get(`${API_URL}/api/tasks`).then(res => setTasks(res.data));
  }, []);

  const completeTask = async (taskId) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/tasks/complete`, { taskId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(data.newBalance);
      toast.success('Reward added! +$' + data.reward, {
        icon: '💰',
        style: { borderRadius: '20px', background: '#1e1e2e', color: '#fff' }
      });
    } catch (err) { toast.error('Error completing task'); }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 font-sans pb-16 relative overflow-hidden">
      {/* Анімовані фонові плями */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] opacity-60"></div>
      <div className="fixed -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px] opacity-50"></div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#111116]/80 border-b border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-6 h-24 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">E</span>
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">EARN<span className="text-purple-400">.IO</span></span>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="bg-[#1a1a22] px-6 py-3 rounded-full border border-[#2a2a35] flex items-center gap-4 shadow-inner">
              <span className="text-slate-500 text-xs font-bold tracking-widest uppercase">Balance</span>
              <span className="text-2xl font-black text-white">${balance.toFixed(2)}</span>
            </div>
            <button onClick={logout} className="p-3 bg-[#1a1a22] hover:bg-red-900/20 text-red-500 rounded-full border border-[#2a2a35] transition-all active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 mt-16 relative z-10">
        <header className="mb-12">
          <p className="text-purple-400 font-bold tracking-[0.3em] text-xs uppercase mb-2">Member Dashboard</p>
          <h1 className="text-5xl font-black text-white tracking-tighter">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">{user?.name || 'Explorer'}</span>! 👋
          </h1>
        </header>

        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="bg-[#111116] border border-[#2a2a35] rounded-[2.5rem] p-16 text-center">
              <p className="text-slate-500 text-xl font-medium">No tasks yet. Add them in DB!</p>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="group backdrop-blur-sm bg-[#111116]/60 p-8 rounded-[2.5rem] shadow-xl border border-[#2a2a35] hover:border-purple-500/50 flex flex-col md:flex-row justify-between items-center transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-6 mb-6 md:mb-0">
                  <div className="w-16 h-16 bg-[#1a1a22] rounded-3xl flex items-center justify-center text-purple-400 border border-[#2a2a35] group-hover:border-purple-500/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-white tracking-tight">{task.title}</h3>
                    <p className="text-green-400 font-black text-xl mt-1">+ ${task.reward.toFixed(2)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => completeTask(task.id)}
                  className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black text-lg hover:bg-purple-500 hover:text-white transition-all shadow-lg hover:shadow-purple-500/40 active:scale-95"
                >
                  CLAIM REWARD
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
