import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = "https://xaxm-backend.onrender.com";

// --- ВХІД ТА РЕЄСТРАЦІЯ ---
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
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="bg-white p-8 shadow-2xl rounded-3xl w-full max-w-md border border-gray-100">
        <h1 className="text-3xl font-extrabold mb-2 text-center text-gray-800">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-500 text-center mb-8">
          {isLogin ? 'Log in to manage your tasks' : 'Join us to start earning'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" placeholder="Your Name" 
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
            />
          )}
          <input 
            type="email" placeholder="Email Address" 
            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setForm({...form, email: e.target.value})}
            required
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
          />
          <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-indigo-600 font-medium hover:underline"
        >
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

// --- ДАШБОРД (Тут без змін) ---
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
      toast.success('Task completed!');
    } catch (err) { toast.error('Error completing task'); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <nav className="flex justify-between items-center mb-10 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="text-2xl font-black text-indigo-600 tracking-tight">EARN.IO</div>
        <div className="flex items-center gap-6">
          <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100">
             <span className="font-bold text-green-700">{balance.toFixed(2)} $</span>
          </div>
          <button onClick={logout} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition">Logout</button>
        </div>
      </nav>

      <div className="grid gap-6">
        <h2 className="text-2xl font-bold text-gray-800">Available Tasks</h2>
        {tasks.length === 0 ? <p className="text-gray-400">No tasks yet. Add them in DB!</p> : tasks.map(task => (
          <div key={task.id} className="bg-white p-6 rounded-3xl shadow-sm flex justify-between items-center border border-gray-100 hover:shadow-md transition cursor-default">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
              <p className="text-indigo-500 font-medium">+{task.reward} $</p>
            </div>
            <button 
              onClick={() => completeTask(task.id)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
            >
              Complete
            </button>
          </div>
        ))}
      </div>
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
