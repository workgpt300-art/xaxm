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
    logout: "Log Out", copy: "Copy", sync: "SYNCING...", nextLeague: "Next League at",
    combo: "COMBO", dailyCheck: "Daily Reward", bonus: "COMBO BONUS", copied: "Copied!", lowBalance: "Low balance!",
    wait: "Wait", checking: "Checking..."
  },
  ua: {
    miner: "Майнер", tasks: "Завдання", shop: "Магазин", friends: "Друзі", profile: "Профіль",
    welcome: "З поверненням", create: "Створити акаунт", login: "Уйти", join: "Приєднатися",
    reg: "Реєстрація", hasAcc: "Вже є акаунт?", totalBal: "Загальний баланс",
    energy: "Енергія", daily: "Щоденно", quizTitle: "Вікторина знань", quizDesc: "Зароби до $5.00",
    startQuiz: "Почати тест", done: "Готово", claim: "Забрати", invite: "Запросити друзів",
    inviteDesc: "Отримуй 10% від заробітку друзів", noFriends: "Друзів поки немає",
    logout: "Вийти", copy: "Копіювати", sync: "СИНХРОНІЗАЦІЯ...", nextLeague: "Наступна ліга через",
    combo: "КОМБО", dailyCheck: "Щоденна нагорода", bonus: "КОМБО БОНУС", copied: "Скопійовано!", lowBalance: "Недостатньо коштів!",
    wait: "Зачекайте", checking: "Перевірка..."
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [authMode, setAuthMode] = useState('login'); 
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'ua');
  const [showSpin, setShowSpin] = useState(false);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [quizData, setQuizData] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [penalty, setPenalty] = useState(0); 
  const [combo, setCombo] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [notif, setNotif] = useState(null);
  
  const [wheelCooldown, setWheelCooldown] = useState(0);
  const [dailyCooldown, setDailyCooldown] = useState(0);
  const [taskLoading, setTaskLoading] = useState(null);

  const t = translations[lang];

  const showMessage = (msg) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2000);
  };

  const [availableTasks, setAvailableTasks] = useState([
    { id: 'tg_join', title: 'Join Telegram', reward: 50, icon: '✈️', type: 'link', link: 'https://t.me/EarnIO_News', completed: false },
    { id: 'earn_350', title: 'Earn $350 total', reward: 100, icon: '💰', type: 'progress', goal: 350, completed: false },
    { id: 'click_master', title: 'Level 5 Clicker', reward: 75, icon: '🖱️', type: 'requirement', reqValue: 5, completed: false },
    { id: 'wheel_spin', title: 'Spin the Wheel', reward: 25, icon: '🎡', type: 'action', completed: false }
  ]);

  const comboBonus = useMemo(() => Math.floor(combo / 25) * 0.25, [combo]);

  const leagueInfo = useMemo(() => {
    if (!user) return null;
    const current = LEAGUES.find(l => l.name === user.league) || LEAGUES[0];
    const nextIdx = LEAGUES.indexOf(current) + 1;
    const next = LEAGUES[nextIdx] || null;
    return { current, next };
  }, [user]);

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const checkTimers = () => {
      const lastSpin = localStorage.getItem('last_spin_time');
      const lastDaily = localStorage.getItem('last_daily_time');
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      if (lastSpin) {
        const left = (parseInt(lastSpin) + day) - now;
        setWheelCooldown(left > 0 ? left : 0);
      }
      if (lastDaily) {
        const leftDaily = (parseInt(lastDaily) + day) - now;
        setDailyCooldown(leftDaily > 0 ? leftDaily : 0);
      }
    };
    checkTimers();
    const interval = setInterval(checkTimers, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

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
      if (Date.now() - lastTap > 2000) setCombo(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastTap]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('remembered_email', formData.email);
      localStorage.setItem('remembered_password', formData.password);
      setToken(res.data.token);
    } catch (e) { showMessage(e.response?.data?.error || "Auth Error"); }
  };

  const handleTap = async (e) => {
    if (!user || user.energy < 1) return;
    if (window.navigator.vibrate) window.navigator.vibrate(12);

    const now = Date.now();
    setLastTap(now);
    const newCombo = combo + 1;
    setCombo(newCombo);

    const baseClick = (user.clickLevel * 0.01);
    const currentBonus = Math.floor(newCombo / 25) * 0.25;
    const totalClickValue = baseClick + currentBonus;

    const id = now;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    
    setClicks(prev => [...prev, { 
        id, 
        x, 
        y, 
        val: totalClickValue.toFixed(2), 
        isCombo: newCombo >= 25 
    }]);
    
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);

    setUser(p => ({ 
      ...p, 
      balance: p.balance + totalClickValue, 
      energy: p.energy - 1,
      totalEarned: (p.totalEarned || 0) + totalClickValue,
      totalClicks: (p.totalClicks || 0) + 1
    }));
    
    await axios.post(`${API_URL}/api/user/tap`, { 
        bonus: currentBonus 
    }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const completeTask = async (taskId, reward) => {
    setTaskLoading(taskId);
    try {
      const res = await axios.post(`${API_URL}/api/user/reward`, 
        { amount: reward, taskId: `task_${taskId}` }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.user) setUser(res.data.user);
      setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      showMessage(`+${reward} Reward!`);
    } catch (e) {
      if (e.response?.status === 400) {
        setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      }
    } finally {
      setTaskLoading(null);
    }
  };

  const checkTaskRequirement = (task) => {
    if (task.completed || taskLoading === task.id) return;
    
    if (task.id === 'earn_350') {
      if ((user.totalEarned || user.balance) >= 350) completeTask(task.id, task.reward);
      else showMessage(`Need $${(350 - (user.totalEarned || 0)).toFixed(2)} more!`);
    } else if (task.id === 'click_master') {
      if (user.clickLevel >= 5) completeTask(task.id, task.reward);
      else showMessage(`Upgrade Multi-Tap to LVL 5!`);
    } else if (task.type === 'link') {
      window.open(task.link, '_blank');
      setTaskLoading(task.id);
      setTimeout(() => completeTask(task.id, task.reward), 3000);
    } else if (task.id === 'wheel_spin') {
      setShowSpin(true);
    }
  };

  const handleDailyClaim = async () => {
    if (dailyCooldown > 0) return;
    try {
      const reward = 10.00;
      const res = await axios.post(`${API_URL}/api/user/reward`, 
        { amount: reward, taskId: 'daily_login' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.user) setUser(res.data.user);
      localStorage.setItem('last_daily_time', Date.now().toString());
      setDailyCooldown(24 * 60 * 60 * 1000);
      showMessage(`Daily Reward: +$${reward}`);
    } catch (e) {
      showMessage("Already claimed today");
    }
  };

  const handleQuizAnswer = async (index) => {
    const question = quizData[currentQuestion];
    if (index === question.correct) {
      if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10]);
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
      if (window.navigator.vibrate) window.navigator.vibrate(200);
      setPenalty(prev => (prev === 0 ? 1.0 : prev === 1.0 ? 2.5 : prev + 2.0));
    }
  };

  // --- ПОКРАЩЕНА ФУНКЦІЯ BUYUPGRADE ---
  const buyUpgrade = async (id) => {
    const shopPrices = { 'miner_v1': 50, 'miner_v2': 250, 'multitap': 100 };
    const price = shopPrices[id];

    if (user.balance < price) {
      showMessage(`${t.lowBalance} ($${price})`);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
      showMessage("Upgrade Success!");
    } catch (e) { 
      showMessage(e.response?.data?.error || t.lowBalance);
      fetchUser(token); // При помилці 400 оновлюємо баланс з сервера
    }
  };

  const handleSpin = async () => {
    if (isSpinning || wheelCooldown > 0) return;
    setIsSpinning(true);
    try {
      const res = await axios.post(`${API_URL}/api/spin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => {
        setIsSpinning(false);
        setShowSpin(false);
        showMessage(`Win:$${res.data.win}!`);
        
        localStorage.setItem('last_spin_time', Date.now().toString());
        setWheelCooldown(24 * 60 * 60 * 1000);

        const spinTask = availableTasks.find(t => t.id === 'wheel_spin');
        if (spinTask && !spinTask.completed) completeTask('wheel_spin', spinTask.reward);
        fetchUser(token);
      }, 4000);
    } catch (e) { 
        setIsSpinning(false); 
        showMessage(e.response?.data?.error || "Error"); 
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
      <div className="glass-card w-full max-w-md p-8 rounded-[2.5rem] neon-border-red relative z-10 animate-in fade-in zoom-in-90 duration-500">
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
      {notif && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-white text-black px-6 py-3 rounded-full font-black text-[10px] uppercase shadow-[0_0_30px_rgba(255,255,255,0.4)] animate-in slide-in-from-top-10">
          {notif}
        </div>
      )}

      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>

      {clicks.map(c => (
        <span key={c.id} className={`absolute pointer-events-none font-black z-[100] animate-float-up ${c.isCombo ? 'text-yellow-400 text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white text-3xl'}`} style={{ left: c.x, top: c.y }}>
          +${c.val} {c.isCombo && '🔥'}
        </span>
      ))}

      <header className="px-5 py-4 flex justify-between items-center z-10 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <button onClick={() => { setShowLeagueModal(true); if(window.navigator.vibrate) window.navigator.vibrate(5); }} className="flex items-center gap-2 glass-card pr-4 pl-1.5 py-1.5 rounded-full border border-white/10 active:scale-95 transition-all">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${leagueInfo?.current?.color} shadow-lg`}></div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[9px] font-black uppercase tracking-tighter">{user.league}</span>
              <span className="text-[7px] text-gray-400 font-bold uppercase">{t.nextLeague} ${leagueInfo?.next?.min || 'Max'}</span>
            </div>
        </button>
        <div className="flex gap-2 items-center">
          {combo > 0 && (
            <div className="flex flex-col items-end leading-none mr-2">
              <span className={`text-[8px] font-black uppercase ${combo >= 25 ? 'text-yellow-500' : 'text-gray-500'}`}>{t.combo}</span>
              <span className={`text-base font-black italic ${combo >= 25 ? 'text-yellow-400 scale-110' : 'text-white'} transition-all`}>x{combo}</span>
            </div>
          )}
          <button onClick={() => setLang(lang === 'ua' ? 'en' : 'ua')} className="glass-card px-3 py-1.5 rounded-xl text-[9px] font-black border-white/10">
            {lang === 'ua' ? 'UA' : 'EN'}
          </button>
          <button onClick={() => setShowSpin(true)} className="text-xl active:scale-125 transition-transform">🎡</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32">
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center justify-between min-h-full py-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">{t.totalBal}</p>
              <h1 className="text-6xl font-black tracking-tighter drop-shadow-2xl animate-pulse-subtle">${(user.balance || 0).toFixed(3)}</h1>
              
              <div className="flex flex-col gap-2 mt-3 items-center">
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                    +${(user.passiveIncome || 0).toFixed(2)} / HR
                  </div>
                  {comboBonus > 0 && (
                    <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-widest animate-pulse">
                        {t.bonus}: +${comboBonus.toFixed(2)}
                    </div>
                  )}
              </div>
            </div>

            <button onPointerDown={handleTap} className="relative w-64 h-64 sm:w-72 sm:h-72 my-8 active:scale-[0.92] transition-all duration-75 group touch-none">
              <div className={`absolute inset-0 blur-[60px] rounded-full transition-colors duration-500 ${combo >= 25 ? 'bg-yellow-500/40' : 'bg-blue-500/20'}`}></div>
              <div className={`w-full h-full bg-gradient-to-b from-[#1a1a24] to-[#050505] rounded-full border-[6px] transition-all duration-300 ${combo >= 25 ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)] scale-105' : 'border-white/10'} shadow-2xl flex items-center justify-center relative z-10 overflow-hidden`}>
                <span className={`text-8xl transition-transform duration-300 ${combo >= 25 ? 'brightness-125 scale-125' : 'group-active:scale-90'}`}>💎</span>
              </div>
            </button>

            <div className="w-full glass-card p-5 rounded-[2rem] neon-border-blue max-w-sm">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-black text-gray-500 uppercase">{t.energy}</span>
                <span className="text-lg font-black text-blue-400">{Math.floor(user.energy || 0)} <span className="text-gray-600 text-xs">/ {user.maxEnergy || 1000}</span></span>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${((user.energy || 0)/(user.maxEnergy || 1000))*100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="w-full max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.tasks}</h2>
            <div className={`glass-card p-5 rounded-[2.5rem] border border-yellow-500/30 bg-yellow-500/5 flex justify-between items-center group transition-opacity ${dailyCooldown > 0 ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-125 transition-transform">🎁</span>
                    <div>
                        <h4 className="font-black text-xs uppercase">{t.dailyCheck}</h4>
                        <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-tighter">
                          {dailyCooldown > 0 ? `Next: ${formatTime(dailyCooldown)}` : 'Available Now!'}
                        </span>
                    </div>
                </div>
                <button 
                  onClick={handleDailyClaim}
                  disabled={dailyCooldown > 0}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${dailyCooldown > 0 ? 'bg-gray-800 text-gray-500' : 'bg-yellow-500 text-black active:scale-95'}`}
                >
                  {dailyCooldown > 0 ? t.wait : t.claim}
                </button>
            </div>
            <div className="relative overflow-hidden glass-card p-6 rounded-[2.5rem] neon-border-blue">
                <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">{t.daily}</span>
                <h3 className="text-xl font-black mt-2 mb-1">{t.quizTitle}</h3>
                <p className="text-gray-400 text-[10px] mb-4 uppercase font-bold">{t.quizDesc}</p>
                <button onClick={() => { setShowQuiz(true); setQuizFinished(false); setCurrentQuestion(0); setPenalty(0); }} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl">
                  {t.startQuiz}
                </button>
            </div>
            <div className="space-y-3">
              {availableTasks.map(task => (
                <div key={task.id} className="glass-card p-4 rounded-[2rem] flex justify-between items-center border border-white/5 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl glass-card w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">{task.icon}</div>
                    <div>
                      <h4 className="font-black text-xs">{task.title}</h4>
                      <span className="text-green-400 text-[10px] font-black">+${task.reward}</span>
                    </div>
                  </div>
                  <button 
                    disabled={task.completed || taskLoading === task.id} 
                    onClick={() => checkTaskRequirement(task)} 
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${task.completed ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white text-black active:scale-90 shadow-lg'}`}
                  >
                    {taskLoading === task.id ? t.checking : task.completed ? t.done : t.claim}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.shop}</h2>
            {[
              { id: 'miner_v1', name: 'Micro Miner', price: 50, desc: '+0.50 profit/hr', icon: '⚡' },
              { id: 'miner_v2', name: 'Advanced Rig', price: 250, desc: '+2.50 profit/hr', icon: '🚀' },
              { id: 'multitap', name: 'Multi-Tap', price: 100, desc: '+0.01 per click', icon: '🖱️' }
            ].map(item => (
              <div key={item.id} className="glass-card p-5 rounded-[2rem] flex justify-between items-center border border-white/5 hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-3xl glass-card w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">{item.icon}</div>
                  <div>
                    <h4 className="font-black text-sm">{item.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.desc}</p>
                  </div>
                </div>
                <button onClick={() => buyUpgrade(item.id)} className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black active:scale-90 transition-all">
                  ${item.price}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
             <div className="glass-card p-8 rounded-[3rem] text-center neon-border-red relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🤝</div>
                <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter relative z-10">{t.invite}</h2>
                <p className="text-gray-400 text-[10px] mb-6 font-bold relative z-10">{t.inviteDesc}</p>
                <div className="bg-black/60 p-4 rounded-2xl border border-white/10 flex justify-between items-center shadow-inner relative z-10">
                  <code className="text-red-400 font-black text-base tracking-widest">{user.referralCode || '...'}</code>
                  <button onClick={() => { navigator.clipboard.writeText(user.referralCode); showMessage(t.copied); }} className="text-[10px] font-black uppercase text-white bg-red-500/20 px-4 py-2 rounded-xl border border-red-500/20 active:scale-90 transition-all">{t.copy}</button>
                </div>
             </div>
             <div className="text-center py-12 opacity-20">
                <div className="text-6xl mb-4 grayscale">👥</div>
                <p className="font-black text-xs uppercase tracking-[0.3em]">{t.noFriends}</p>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="glass-card p-8 rounded-[3rem] text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-red-600 via-purple-600 to-blue-600 rounded-[2rem] mx-auto mb-4 flex items-center justify-center text-3xl shadow-2xl border-2 border-white/10 rotate-3 animate-float">👤</div>
              <h3 className="text-xl font-black tracking-tight">{user.email?.split('@')[0]}</h3>
              <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.4em] mt-1 opacity-50">ID: {user.id?.slice(-8)}</p>
              <div className="mt-6">
                 <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                    <span>Rank Progress</span>
                    <span>{Math.floor(((user.totalEarned % 100) / 100) * 100)}%</span>
                 </div>
                 <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(user.totalEarned % 100)}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5 rounded-[2rem] text-center border border-white/5">
                <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Earned</p>
                <p className="text-xl font-black text-green-400">${(user.totalEarned || 0).toFixed(2)}</p>
              </div>
              <div className="glass-card p-5 rounded-[2rem] text-center border border-white/5">
                <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Taps</p>
                <p className="text-xl font-black text-blue-400">{user.totalClicks || 0}</p>
              </div>
            </div>

            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full py-4 bg-red-500/5 text-red-500 rounded-[1.5rem] font-black text-[10px] uppercase border border-red-500/10 active:bg-red-500 active:text-white transition-all">
              {t.logout}
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md h-20 glass-card rounded-[2.5rem] flex justify-around items-center backdrop-blur-2xl z-50 px-2 shadow-2xl border border-white/10">
          {[
            { id: 'miner', icon: '⛏️', label: t.miner },
            { id: 'tasks', icon: '📋', label: t.tasks },
            { id: 'upgrades', icon: '⚡', label: t.shop },
            { id: 'partners', icon: '👥', label: t.friends },
            { id: 'profile', icon: '👤', label: t.profile }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if(window.navigator.vibrate) window.navigator.vibrate(5); }} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-white/10 scale-105 shadow-lg' : 'opacity-30 hover:opacity-50'}`}>
              <span className={`text-xl transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
      </nav>

      {showQuiz && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-card rounded-[3rem] p-8 relative neon-border-blue shadow-2xl animate-in zoom-in-95">
            {!quizFinished ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-[9px] font-black text-blue-500 uppercase mb-3 border border-blue-500/20">
                    Question {currentQuestion + 1} / {quizData.length}
                  </div>
                  <h3 className="text-xl font-black leading-tight">{quizData[currentQuestion]?.question}</h3>
                  <p className="text-[9px] font-bold text-green-400 mt-3 uppercase tracking-widest bg-green-400/10 py-1.5 rounded-lg">
                    Reward: ${Math.max(0.1, (quizData[currentQuestion]?.reward - penalty)).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  {quizData[currentQuestion]?.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold">
                        {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
                <div className="text-center py-10">
                    <div className="text-5xl mb-4">🏆</div>
                    <h3 className="text-2xl font-black mb-2 italic">QUIZ COMPLETED</h3>
                    <button onClick={() => setShowQuiz(false)} className="mt-6 px-10 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs">BACK</button>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
