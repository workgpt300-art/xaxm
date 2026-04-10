import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';
const QUIZ_JSON_URL = 'https://raw.githubusercontent.com/workgpt300-art/xaxm/refs/heads/main/frontend/src/quiz.json';

const LEAGUES = [
  { name: "Bronze", min: 0, next: 100, color: "from-orange-700 to-orange-400" },
  { name: "Silver", min: 100, next: 500, color: "from-gray-400 to-slate-100" },
  { name: "Gold", min: 500, next: 1000, color: "from-yellow-600 to-yellow-200" },
  { name: "Platinum", min: 1000, next: 5000, color: "from-cyan-600 to-blue-300" },
  { name: "Diamond", min: 5000, next: Infinity, color: "from-indigo-600 to-purple-400" }
];

const translations = {
  en: {
    miner: "Miner", tasks: "Quests", shop: "Market", friends: "Friends", profile: "Account",
    welcome: "Welcome Back", create: "Create Account", login: "Sign In", join: "Join Now",
    reg: "Register account", hasAcc: "Login to account", totalBal: "Total Balance",
    energy: "Energy", daily: "Daily", quizTitle: "Knowledge Quiz", quizDesc: "Earn up to $5.00",
    startQuiz: "Start Quiz", done: "Done", claim: "Claim", invite: "Invite Friends",
    inviteDesc: "Get 10% from friend's earnings", noFriends: "No friends yet",
    logout: "Log Out", copy: "Copy", sync: "SYNCING...", nextLeague: "Next League at"
  },
  ua: {
    miner: "Майнер", tasks: "Завдання", shop: "Магазин", friends: "Друзі", profile: "Профіль",
    welcome: "З поверненням", create: "Створити акаунт", login: "Увійти", join: "Приєднатися",
    reg: "Реєстрація", hasAcc: "Вже є акаунт?", totalBal: "Загальний баланс",
    energy: "Енергія", daily: "Щоденно", quizTitle: "Вікторина знань", quizDesc: "Зароби до $5.00",
    startQuiz: "Почати тест", done: "Готово", claim: "Забрати", invite: "Запросити друзів",
    inviteDesc: "Отримуй 10% від заробітку друзів", noFriends: "Друзів поки немає",
    logout: "Вийти", copy: "Копіювати", sync: "СИНХРОНІЗАЦІЯ...", nextLeague: "Наступна ліга через"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [authMode, setAuthMode] = useState('login'); 
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [lang, setLang] = useState('ua');
  const [showSpin, setShowSpin] = useState(false);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [quizData, setQuizData] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [penalty, setPenalty] = useState(0); 

  const t = translations[lang];

  const [availableTasks, setAvailableTasks] = useState([
    { id: 'tg_join', title: 'Join Telegram', reward: 50, icon: '✈️', type: 'link', link: 'https://t.me/EarnIO_News', completed: false },
    { id: 'earn_350', title: 'Earn $350 total', reward: 100, icon: '💰', type: 'progress', goal: 350, completed: false },
    { id: 'click_master', title: 'Level 5 Clicker', reward: 75, icon: '🖱️', type: 'requirement', reqValue: 5, completed: false },
    { id: 'wheel_spin', title: 'Spin the Wheel', reward: 25, icon: '🎡', type: 'action', completed: false }
  ]);

  // Розрахунок прогресу до наступної ліги
  const leagueInfo = useMemo(() => {
    if (!user) return null;
    const current = LEAGUES.find(l => l.name === user.league) || LEAGUES[0];
    const next = LEAGUES[LEAGUES.indexOf(current) + 1];
    return { current, next };
  }, [user]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPass = localStorage.getItem('remembered_password');
    if (savedEmail && savedPass) setFormData({ email: savedEmail, password: savedPass });
  }, []);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const res = await axios.get(QUIZ_JSON_URL);
        setQuizData(res.data);
      } catch (e) { console.error("Quiz load error"); }
    };
    loadQuiz();
  }, []);

  const fetchUser = useCallback(async (tokenVal) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${tokenVal}` } });
      setUser(res.data);
      if (res.data.completedTasks) {
        setAvailableTasks(prev => prev.map(task => ({
          ...task,
          completed: res.data.completedTasks.includes(`task_${task.id}`)
        })));
      }
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
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('remembered_email', formData.email);
      localStorage.setItem('remembered_password', formData.password);
      setToken(res.data.token);
    } catch (e) { alert(e.response?.data?.error || "Auth Error"); }
  };

  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setClicks(prev => [...prev, { id, x, y, val: (user.clickLevel * 0.01).toFixed(2) }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);

    setUser(p => ({ 
      ...p, 
      balance: p.balance + (p.clickLevel * 0.01), 
      energy: p.energy - 1,
      totalEarned: (p.totalEarned || 0) + (p.clickLevel * 0.01)
    }));
    await axios.post(`${API_URL}/api/user/tap`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const completeTask = async (taskId, reward) => {
    try {
      const res = await axios.post(`${API_URL}/api/user/reward`, 
        { amount: reward, taskId: `task_${taskId}` }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.user) setUser(res.data.user);
      setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      fetchUser(token);
    } catch (e) {
      if (e.response?.status === 400) {
        setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      }
    }
  };

  const checkTaskRequirement = (task) => {
    if (task.completed) return;
    if (task.id === 'earn_350') {
      if ((user.totalEarned || user.balance) >= 350) completeTask(task.id, task.reward);
      else alert(`Need $${(350 - (user.totalEarned || 0)).toFixed(2)} more!`);
    } else if (task.id === 'click_master') {
      if (user.clickLevel >= 5) completeTask(task.id, task.reward);
      else alert(`Upgrade Multi-Tap to LVL 5!`);
    } else if (task.type === 'link') {
      window.open(task.link, '_blank');
      setTimeout(() => completeTask(task.id, task.reward), 2000);
    } else if (task.id === 'wheel_spin') {
      setShowSpin(true);
    }
  };

  const handleQuizAnswer = async (index) => {
    const question = quizData[currentQuestion];
    if (index === question.correct) {
      const finalReward = Math.max(0.1, question.reward - penalty);
      try {
        const res = await axios.post(`${API_URL}/api/user/reward`, 
          { amount: finalReward, taskId: `quiz_${question.id}` }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.user) setUser(res.data.user);
        setPenalty(0);
        if (currentQuestion < quizData.length - 1) setCurrentQuestion(prev => prev + 1);
        else setQuizFinished(true);
      } catch (e) {
        if (currentQuestion < quizData.length - 1) setCurrentQuestion(prev => prev + 1);
        else setQuizFinished(true);
      }
    } else {
      setPenalty(prev => (prev === 0 ? 1.0 : prev === 1.0 ? 2.5 : prev + 2.0));
    }
  };

  const buyUpgrade = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch (e) { alert(e.response?.data?.error || "Low balance!"); }
  };

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    try {
      const res = await axios.post(`${API_URL}/api/spin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => {
        setIsSpinning(false);
        setShowSpin(false);
        alert(`Win: $${res.data.win}!`);
        const spinTask = availableTasks.find(t => t.id === 'wheel_spin');
        if (spinTask && !spinTask.completed) completeTask('wheel_spin', spinTask.reward);
        fetchUser(token);
      }, 4000);
    } catch (e) { 
        setIsSpinning(false); 
        alert(e.response?.data?.error || "Error"); 
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
      <div className="glass-card w-full max-w-md p-8 rounded-[2.5rem] neon-border-red relative z-10">
        <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter italic">
          {authMode === 'login' ? t.welcome : t.create}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={formData.email} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:neon-border-blue transition-all" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Password" value={formData.password} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:neon-border-red transition-all" onChange={e => setFormData({...formData, password: e.target.value})} />
          <button className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 transition-all">
            {authMode === 'login' ? t.login : t.join}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-8 text-gray-500 text-xs font-bold uppercase tracking-widest">
            {authMode === 'login' ? t.reg : t.hasAcc}
        </button>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-black">
      <div className="text-4xl animate-bounce mb-4">💎</div>
      <div className="tracking-[0.5em] text-sm animate-pulse">{t.sync}</div>
    </div>
  );

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none font-sans">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>

      {/* Floating Numbers */}
      {clicks.map(c => (
        <span key={c.id} className="absolute pointer-events-none text-3xl font-black text-white z-[100] animate-float-up" style={{ left: c.x, top: c.y }}>
          +${c.val}
        </span>
      ))}

      {/* Header */}
      <header className="p-5 flex justify-between items-center z-10 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <button onClick={() => setShowLeagueModal(true)} className="flex items-center gap-3 glass-card pr-5 pl-2 py-2 rounded-full border border-white/10 active:scale-95 transition-all">
           <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${leagueInfo?.current?.color} shadow-lg`}></div>
           <div className="flex flex-col items-start">
             <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{user.league}</span>
             <span className="text-[8px] text-gray-400 font-bold uppercase">{t.nextLeague} ${leagueInfo?.next?.min || 'Max'}</span>
           </div>
        </button>
        <div className="flex gap-3">
          <button onClick={() => setLang(lang === 'ua' ? 'en' : 'ua')} className="glass-card px-4 py-2 rounded-2xl text-[10px] font-black border-white/10 hover:bg-white/10">
            {lang === 'ua' ? '🇺🇦 UA' : '🇺🇸 EN'}
          </button>
          <button onClick={() => setShowSpin(true)} className="text-2xl hover:scale-110 transition-transform">🎡</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 pb-32 overflow-y-auto">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center justify-center h-full w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="text-center mb-12">
              <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.5em] mb-3">{t.totalBal}</p>
              <h1 className="text-7xl font-black tracking-tighter drop-shadow-2xl">${user.balance.toFixed(3)}</h1>
              <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                +${user.passiveIncome.toFixed(2)} / HR
              </div>
            </div>

            <button onPointerDown={handleTap} className="relative w-72 h-72 mb-14 active:scale-[0.92] transition-all duration-75 group">
              <div className="absolute inset-0 bg-blue-500/30 blur-[80px] rounded-full group-active:bg-red-500/40 transition-colors"></div>
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a24] to-[#050505] rounded-full border-[8px] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <span className="text-9xl drop-shadow-[0_0_30px_rgba(59,130,246,0.6)] group-active:scale-110 transition-transform">💎</span>
              </div>
            </button>

            <div className="w-full glass-card p-6 rounded-[2.5rem] neon-border-blue">
              <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase mb-1">{t.energy}</span>
                  <span className="text-xl font-black text-blue-400">{Math.floor(user.energy)} <span className="text-gray-600 text-sm">/ {user.maxEnergy}</span></span>
                </div>
                <div className="text-[10px] font-bold text-gray-500 italic">RECHARGING...</div>
              </div>
              <div className="h-4 bg-black/40 rounded-full overflow-hidden p-[3px] border border-white/5 shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${(user.energy/user.maxEnergy)*100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-8">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.tasks}</h2>
            <div className="relative overflow-hidden glass-card p-8 rounded-[3rem] neon-border-blue group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:rotate-12 transition-transform">📖</div>
                <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">{t.daily}</span>
                <h3 className="text-2xl font-black mt-3 mb-1">{t.quizTitle}</h3>
                <p className="text-gray-400 text-xs mb-6 uppercase font-bold">{t.quizDesc}</p>
                <button 
                  onClick={() => { setShowQuiz(true); setQuizFinished(false); setCurrentQuestion(0); setPenalty(0); }}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-sm active:scale-95 transition-all shadow-xl"
                >
                  {t.startQuiz}
                </button>
            </div>

            <div className="space-y-4">
              {availableTasks.map(task => (
                <div key={task.id} className="glass-card p-5 rounded-[2.2rem] flex justify-between items-center border border-white/5 hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="text-3xl glass-card w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">{task.icon}</div>
                    <div>
                      <h4 className="font-black text-sm">{task.title}</h4>
                      <span className="text-green-400 text-xs font-black">+${task.reward}</span>
                    </div>
                  </div>
                  <button 
                    disabled={task.completed}
                    onClick={() => checkTaskRequirement(task)}
                    className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all ${task.completed ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white text-black active:scale-90 shadow-lg'}`}
                  >
                    {task.completed ? t.done : t.claim}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4 animate-in slide-in-from-bottom-8">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.shop}</h2>
            {[
              { id: 'miner_v1', name: 'Micro Miner', price: 50, desc: '+0.50 profit/hr', icon: '⚡' },
              { id: 'miner_v2', name: 'Advanced Rig', price: 250, desc: '+2.50 profit/hr', icon: '🚀' },
              { id: 'multitap', name: 'Multi-Tap', price: 100, desc: '+0.01 per click', icon: '🖱️' }
            ].map(item => (
              <div key={item.id} className="glass-card p-6 rounded-[2.5rem] flex justify-between items-center hover:neon-border-blue transition-all border border-white/5">
                <div className="flex items-center gap-5">
                  <div className="text-4xl glass-card w-16 h-16 flex items-center justify-center rounded-3xl bg-white/5 border border-white/10">{item.icon}</div>
                  <div>
                    <h4 className="font-black text-md">{item.name}</h4>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{item.desc}</p>
                  </div>
                </div>
                <button onClick={() => buyUpgrade(item.id)} className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-black active:scale-90 transition-all shadow-xl">
                  ${item.price}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-8">
             <div className="glass-card p-10 rounded-[3.5rem] text-center neon-border-red relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">{t.invite}</h2>
                <p className="text-gray-400 text-xs mb-8 font-bold">{t.inviteDesc}</p>
                <div className="bg-black/60 p-5 rounded-3xl border border-white/10 flex justify-between items-center mb-2 shadow-inner">
                  <code className="text-red-400 font-black text-lg tracking-widest">{user.referralCode || '...'}</code>
                  <button onClick={() => { navigator.clipboard.writeText(user.referralCode); alert("Copied!"); }} className="text-[11px] font-black uppercase text-white bg-red-500/20 px-5 py-3 rounded-2xl active:bg-white active:text-black transition-all border border-red-500/20">{t.copy}</button>
                </div>
             </div>
             <div className="text-center py-16 opacity-20">
                <div className="text-7xl mb-6 grayscale">👥</div>
                <p className="font-black text-xs uppercase tracking-[0.3em]">{t.noFriends}</p>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-8">
            <div className="glass-card p-10 rounded-[3.5rem] text-center border border-white/5">
              <div className="w-24 h-24 bg-gradient-to-tr from-red-600 via-purple-600 to-blue-600 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl border-4 border-white/10 rotate-3">👤</div>
              <h3 className="text-2xl font-black tracking-tight">{user.email.split('@')[0]}</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-50">ID: {user.id.slice(-8)}</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="glass-card p-6 rounded-[2.5rem] text-center border border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Total</p>
                <p className="text-2xl font-black text-green-400">${user.totalEarned?.toFixed(2) || 0}</p>
              </div>
              <div className="glass-card p-6 rounded-[2.5rem] text-center border border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Click LVL</p>
                <p className="text-2xl font-black text-blue-400">{user.clickLevel}</p>
              </div>
            </div>

            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full py-5 bg-red-500/5 text-red-500 rounded-[2rem] font-black text-xs uppercase border border-red-500/10 hover:bg-red-500 hover:text-white transition-all">
              {t.logout}
            </button>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md glass-card h-24 rounded-[3.5rem] flex justify-around items-center backdrop-blur-3xl z-50 px-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          {[
            { id: 'miner', icon: '⛏️', label: t.miner },
            { id: 'tasks', icon: '📋', label: t.tasks },
            { id: 'upgrades', icon: '⚡', label: t.shop },
            { id: 'partners', icon: '👥', label: t.friends },
            { id: 'profile', icon: '👤', label: t.profile }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-2 px-5 py-3 rounded-[2rem] transition-all duration-300 ${activeTab === item.id ? 'bg-white/10 scale-110 shadow-lg neon-border-blue' : 'opacity-30 hover:opacity-100'}`}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* Modals with enhanced styling */}
      {showQuiz && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm glass-card rounded-[3.5rem] p-10 relative neon-border-blue shadow-[0_0_100px_rgba(59,130,246,0.2)]">
            {!quizFinished ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-[10px] font-black text-blue-500 uppercase mb-4 border border-blue-500/20">
                    Question {currentQuestion + 1} / {quizData.length}
                  </div>
                  <h3 className="text-2xl font-black leading-tight">{quizData[currentQuestion]?.question}</h3>
                  <p className="text-xs font-bold text-green-400 mt-4 uppercase tracking-widest bg-green-400/10 py-2 rounded-xl">
                    Reward: ${Math.max(0.1, (quizData[currentQuestion]?.reward - penalty)).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-3">
                  {quizData[currentQuestion]?.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white hover:text-black hover:scale-[1.02] transition-all active:scale-95">
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10 animate-in zoom-in">
                <div className="text-8xl mb-6">🏆</div>
                <h3 className="text-3xl font-black mb-8 uppercase italic">Excellent!</h3>
                <button onClick={() => setShowQuiz(false)} className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase text-sm shadow-2xl">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showLeagueModal && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in" onClick={() => setShowLeagueModal(false)}>
            <div className="w-full max-w-sm glass-card rounded-[4rem] p-10 shadow-2xl border border-white/5" onClick={e => e.stopPropagation()}>
               <h2 className="text-3xl font-black mb-10 italic uppercase text-center tracking-tighter">Leagues</h2>
               <div className="space-y-4">
                 {LEAGUES.map(l => {
                   const isCurrent = user.league === l.name;
                   const isLocked = (user.totalEarned || 0) < l.min;
                   return (
                     <div key={l.name} className={`p-5 rounded-[2.5rem] border transition-all duration-500 ${isCurrent ? 'bg-white text-black border-white shadow-[0_0_30px_white]' : 'bg-white/5 border-white/10 opacity-40'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${l.color}`}></div>
                              <span className="font-black uppercase text-sm tracking-widest">{l.name}</span>
                            </div>
                            {isLocked ? <span className="text-[10px] font-black italic opacity-60">MIN ${l.min}</span> : <span className="text-xs">✔</span>}
                        </div>
                     </div>
                   )
                 })}
               </div>
            </div>
        </div>
      )}

      {showSpin && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in zoom-in">
          <div className="glass-card w-full max-w-sm rounded-[4rem] p-12 text-center neon-border-blue relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 pointer-events-none"></div>
            <h3 className="text-2xl font-black mb-10 uppercase italic tracking-tighter">Fortune Wheel</h3>
            <div className="relative mb-12 flex justify-center">
                <div className={`text-9xl transition-all duration-[4000ms] ease-out ${isSpinning ? 'rotate-[3600deg]' : 'scale-100'} drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>🎡</div>
                <div className="absolute top-[-20px] text-3xl animate-bounce">▼</div>
            </div>
            <button onClick={handleSpin} disabled={isSpinning} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black uppercase text-sm active:scale-95 transition-all shadow-2xl relative z-10">
                {isSpinning ? 'SPINNING...' : 'Spin Wheel'}
            </button>
            <button onClick={() => !isSpinning && setShowSpin(false)} className="mt-8 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
