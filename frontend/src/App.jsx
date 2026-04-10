import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'https://xaxm-backend.onrender.com';
const QUIZ_JSON_URL = 'https://raw.githubusercontent.com/workgpt300-art/xaxm/refs/heads/main/frontend/src/quiz.json';

const LEAGUES = [
  { name: "Bronze", min: 0, next: 100 },
  { name: "Silver", min: 100, next: 500 },
  { name: "Gold", min: 500, next: 1000 },
  { name: "Platinum", min: 1000, next: 5000 },
  { name: "Diamond", min: 5000, next: Infinity }
];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('miner');
  const [authMode, setAuthMode] = useState('login'); 
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  const [showSpin, setShowSpin] = useState(false);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [clicks, setClicks] = useState([]);

  // --- СТАНИ ДЛЯ ВІКТОРИНИ ---
  const [quizData, setQuizData] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [penalty, setPenalty] = useState(0); 

  // --- СТАНИ ДЛЯ ЗАВДАНЬ ---
  const [availableTasks, setAvailableTasks] = useState([
    { id: 'tg_join', title: 'Join Telegram', reward: 50, icon: '✈️', type: 'link', link: 'https://t.me/EarnIO_News', completed: false },
    { id: 'earn_350', title: 'Earn $350 total', reward: 100, icon: '💰', type: 'progress', goal: 350, completed: false },
    { id: 'click_master', title: 'Level 5 Clicker', reward: 75, icon: '🖱️', type: 'requirement', reqValue: 5, completed: false },
    { id: 'wheel_spin', title: 'Spin the Wheel', reward: 25, icon: '🎡', type: 'action', completed: false }
  ]);

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

  const fetchUser = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${t}` } });
      setUser(res.data);
      if (res.data.offlineEarned > 0) alert(`Offline profit: +$${res.data.offlineEarned.toFixed(2)}`);
    } catch (e) { localStorage.removeItem('token'); setToken(null); }
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

  // --- ОНОВЛЕНА ФУНКЦІЯ ДЛЯ ЗАВДАНЬ ---
  const completeTask = async (taskId, reward) => {
    try {
      const res = await axios.post(`${API_URL}/api/user/reward`, 
        { amount: reward, taskId: `task_${taskId}` }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Оновлюємо стан, використовуючи дані з сервера, але ПРИМУСОВО додаємо ревард, якщо сервер повернув старий баланс
      setUser(prev => {
        const baseUser = res.data.user || prev;
        return {
          ...baseUser,
          balance: baseUser.balance + reward, // Гарантуємо додавання
          totalEarned: (baseUser.totalEarned || 0) + reward
        };
      });
      
      setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      alert(`Task completed! +$${reward}`);
    } catch (e) {
      // Якщо на бекенді вже зараховано, просто ставимо статус виконано локально
      setAvailableTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
      console.log("Task already rewarded on server");
    }
  };

  const checkTaskRequirement = (task) => {
    if (task.completed) return;

    if (task.id === 'earn_350') {
      if ((user.totalEarned || user.balance) >= 350) completeTask(task.id, task.reward);
      else alert(`You need$${(350 - (user.totalEarned || 0)).toFixed(2)} more!`);
    } else if (task.id === 'click_master') {
      if (user.clickLevel >= 5) completeTask(task.id, task.reward);
      else alert(`Upgrade your Multi-Tap to level 5 first!`);
    } else if (task.type === 'link') {
      window.open(task.link, '_blank');
      // Невелика затримка перед клеймом для лінків
      setTimeout(() => completeTask(task.id, task.reward), 1000);
    } else if (task.id === 'wheel_spin') {
      alert("Spin the wheel first!");
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

        setUser(prev => {
            const baseUser = res.data.user || prev;
            return {
                ...baseUser,
                balance: baseUser.balance + finalReward,
                totalEarned: (baseUser.totalEarned || 0) + finalReward
            };
        });

        setPenalty(0);
        if (currentQuestion < quizData.length - 1) setCurrentQuestion(prev => prev + 1);
        else setQuizFinished(true);
      } catch (e) {
        alert("Reward already claimed!");
        if (currentQuestion < quizData.length - 1) setCurrentQuestion(prev => prev + 1);
        else setQuizFinished(true);
      }
    } else {
      alert("Wrong answer! Reward decreased.");
      setPenalty(prev => (prev === 0 ? 1.0 : prev === 1.0 ? 2.5 : prev + 2.0));
    }
  };

  const buyUpgrade = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/upgrades/buy`, { upgradeId: id }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
      alert("Upgrade successful!");
    } catch (e) { alert(e.response?.data?.error || "Not enough balance!"); }
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
        
        // Зараховуємо завдання "Spin the Wheel"
        const spinTask = availableTasks.find(t => t.id === 'wheel_spin');
        if (spinTask && !spinTask.completed) {
            completeTask('wheel_spin', spinTask.reward);
        }
        
        // Оновлюємо дані користувача після спіну
        fetchUser(token);
      }, 4000);
    } catch (e) { 
        setIsSpinning(false); 
        alert(e.response?.data?.error || "Error spinning wheel"); 
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-8 uppercase tracking-tighter">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email Address" value={formData.email} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Password" value={formData.password} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all" onChange={e => setFormData({...formData, password: e.target.value})} />
          <button className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-sm">
            {authMode === 'login' ? 'Sign In' : 'Join Now'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-gray-500 text-sm font-bold">
            {authMode === 'login' ? "Register account" : "Login to account"}
        </button>
      </div>
    </div>
  );

  if (!user) return <div className="h-screen bg-black text-white flex items-center justify-center font-black animate-pulse">SYNCING...</div>;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none font-sans">
      
      {clicks.map(c => (
        <span key={c.id} className="absolute pointer-events-none text-2xl font-black text-white z-[100] animate-float-up" style={{ left: c.x, top: c.y }}>
          +${c.val}
        </span>
      ))}

      <header className="p-4 flex justify-between items-center z-10 backdrop-blur-md bg-black/20">
        <button onClick={() => setShowLeagueModal(true)} className="flex items-center gap-2 bg-white/5 pr-4 pl-1.5 py-1 rounded-full border border-white/10 active:scale-95 transition-all">
           <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500"></div>
           <span className="text-[10px] font-black uppercase tracking-widest">{user.league} League ›</span>
        </button>
        <button onClick={() => setShowSpin(true)} className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform">🎡</button>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 pb-32 overflow-y-auto">
        
        {activeTab === 'miner' && (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="text-center mb-10">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Total Balance</p>
              <h1 className="text-6xl font-black tracking-tighter">${user.balance.toFixed(3)}</h1>
              <div className="mt-2 text-green-400 text-[10px] font-bold uppercase tracking-widest">+${user.passiveIncome.toFixed(2)} / HR</div>
            </div>

            <button onPointerDown={handleTap} className="relative w-64 h-64 mb-12 active:scale-95 transition-transform group">
              <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full group-active:bg-purple-600/30"></div>
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] rounded-full border-[6px] border-[#22222d] shadow-2xl flex items-center justify-center relative z-10">
                <span className="text-8xl">💎</span>
              </div>
            </button>

            <div className="w-full max-w-xs bg-white/5 border border-white/10 p-5 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase">Energy</span>
                <span className="text-xs font-bold">{Math.floor(user.energy)}/{user.maxEnergy}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden p-[2px]">
                <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-300 rounded-full transition-all duration-300" style={{ width: `${(user.energy/user.maxEnergy)*100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black mb-2 italic uppercase">Quests</h2>
            
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 to-[#0f0f1a] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
              <div className="relative z-10">
                <span className="bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Daily</span>
                <h3 className="text-xl font-black mt-2 mb-1">Knowledge Quiz</h3>
                <p className="text-gray-400 text-[10px] mb-4 uppercase">Earn up to $5.00</p>
                <button 
                  onClick={() => { setShowQuiz(true); setQuizFinished(false); setCurrentQuestion(0); setPenalty(0); }}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs active:scale-95 transition-all"
                >
                  Start Quiz
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {availableTasks.map(task => (
                <div key={task.id} className="bg-white/5 border border-white/10 p-4 rounded-[2rem] flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl bg-black/40 w-12 h-12 flex items-center justify-center rounded-2xl border border-white/5">{task.icon}</div>
                    <div>
                      <h4 className="font-black text-sm">{task.title}</h4>
                      <span className="text-green-400 text-[10px] font-bold">+${task.reward}</span>
                    </div>
                  </div>
                  <button 
                    disabled={task.completed}
                    onClick={() => checkTaskRequirement(task)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${task.completed ? 'bg-green-500/20 text-green-500' : 'bg-white text-black active:scale-90'}`}
                  >
                    {task.completed ? 'Done' : 'Claim'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black mb-6 italic uppercase">Market</h2>
            {[
              { id: 'miner_v1', name: 'Micro Miner', price: 50, desc: '+0.50 profit/hr', icon: '⚡' },
              { id: 'miner_v2', name: 'Advanced Rig', price: 250, desc: '+2.50 profit/hr', icon: '🚀' },
              { id: 'multitap', name: 'Multi-Tap', price: 100, desc: '+0.01 per click', icon: '🖱️' }
            ].map(item => (
              <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex justify-between items-center hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-3xl bg-black/40 w-14 h-14 flex items-center justify-center rounded-2xl border border-white/5">{item.icon}</div>
                  <div>
                    <h4 className="font-black text-sm">{item.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{item.desc}</p>
                  </div>
                </div>
                <button onClick={() => buyUpgrade(item.id)} className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-black active:scale-90 transition-transform">
                  ${item.price}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="w-full max-w-md space-y-6">
             <div className="bg-gradient-to-br from-purple-900/40 to-black p-8 rounded-[3rem] border border-white/10 text-center">
                <h2 className="text-3xl font-black mb-2">INVITE</h2>
                <p className="text-gray-400 text-xs mb-6 font-medium">Get 10% from friend's earnings</p>
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center mb-4">
                  <code className="text-purple-400 font-bold">{user.referralCode || 'GENERATING...'}</code>
                  <button onClick={() => { navigator.clipboard.writeText(user.referralCode); alert("Copied!"); }} className="text-[10px] font-black uppercase text-white bg-white/10 px-4 py-2 rounded-xl active:bg-white active:text-black">Copy</button>
                </div>
             </div>
             <div className="text-center py-10 opacity-30">
                <div className="text-5xl mb-4">👥</div>
                <p className="font-black text-[10px] uppercase tracking-widest">No friends yet</p>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-md space-y-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg border-2 border-white/20">👤</div>
              <h3 className="text-xl font-black">{user.email.split('@')[0]}</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Player ID: {user.id.slice(0,8)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Total Earned</p>
                <p className="text-lg font-black">${user.totalEarned?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Click Level</p>
                <p className="text-lg font-black">LVL {user.clickLevel}</p>
              </div>
            </div>

            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase border border-red-500/20">Log Out</button>
          </div>
        )}
      </main>

      {/* MODAL: QUIZ */}
      {showQuiz && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[3rem] p-8 relative">
            {!quizFinished ? (
              <>
                <div className="text-center mb-6">
                  <span className="text-[10px] font-black text-purple-500 uppercase">Question {currentQuestion + 1}/{quizData.length}</span>
                  <h3 className="text-xl font-black mt-2">{quizData[currentQuestion]?.question}</h3>
                  <p className="text-[10px] font-bold text-green-400 mt-2 uppercase tracking-widest">
                    Current Reward: ${Math.max(0.1, (quizData[currentQuestion]?.reward - penalty)).toFixed(2)}
                    {penalty > 0 && <span className="text-red-500 ml-2">(-${penalty.toFixed(1)})</span>}
                  </p>
                </div>
                <div className="space-y-3">
                  {quizData[currentQuestion]?.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white hover:text-black transition-all">
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <span className="text-6xl mb-4 block">🏆</span>
                <h3 className="text-2xl font-black mb-2">Great!</h3>
                <p className="text-gray-400 text-sm mb-6">Quiz completed.</p>
                <button onClick={() => setShowQuiz(false)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs">Close</button>
              </div>
            )}
            {!quizFinished && <button onClick={() => setShowQuiz(false)} className="w-full mt-6 text-gray-500 text-[10px] font-black uppercase">Cancel</button>}
          </div>
        </div>
      )}

      {/* MODAL: LEAGUE PROGRESS */}
      {showLeagueModal && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setShowLeagueModal(false)}>
            <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[3rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
               <h2 className="text-2xl font-black mb-8 italic uppercase text-center">League Progress</h2>
               <div className="space-y-4">
                 {LEAGUES.map(l => {
                   const isCurrent = user.league === l.name;
                   const isLocked = user.totalEarned < l.min;
                   return (
                     <div key={l.name} className={`p-4 rounded-3xl border transition-all ${isCurrent ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 opacity-50'}`}>
                        <div className="flex justify-between items-center">
                           <span className="font-black uppercase text-xs">{l.name}</span>
                           {isLocked ? <span className="text-[10px] font-bold italic">Need ${l.min}</span> : <span className="text-xs">✅</span>}
                        </div>
                        {isCurrent && (
                          <div className="mt-3">
                             <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-black transition-all" style={{ width: `${Math.min(100, (user.totalEarned / (l.next === Infinity ? user.totalEarned : l.next) * 100))}%` }}></div>
                             </div>
                          </div>
                        )}
                     </div>
                   )
                 })}
               </div>
               <button onClick={() => setShowLeagueModal(false)} className="w-full mt-8 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] rounded-2xl">Close</button>
            </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#111]/90 border border-white/10 h-22 rounded-[3rem] flex justify-around items-center backdrop-blur-2xl z-50 px-2 shadow-2xl">
          {[
            { id: 'miner', icon: '⛏️', label: 'Miner' },
            { id: 'tasks', icon: '📋', label: 'Tasks' },
            { id: 'upgrades', icon: '⚡', label: 'Shop' },
            { id: 'partners', icon: '👥', label: 'Friends' },
            { id: 'profile', icon: '👤', label: 'Account' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/10 scale-105' : 'opacity-40 hover:opacity-100'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* WHEEL MODAL */}
      {showSpin && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/10 w-full max-w-xs rounded-[3.5rem] p-10 text-center shadow-2xl">
            <h3 className="text-xl font-black mb-8 uppercase italic">Fortune Wheel</h3>
            <div className={`text-8xl mb-12 transition-all duration-[4000ms] ${isSpinning ? 'rotate-[3600deg]' : 'scale-100'}`}>🎡</div>
            <button onClick={handleSpin} disabled={isSpinning} className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase text-xs active:scale-95 transition-transform">
                {isSpinning ? 'Spinning...' : 'Spin for free'}
            </button>
            <button onClick={() => !isSpinning && setShowSpin(false)} className="mt-6 text-gray-500 font-bold text-[10px] uppercase">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
