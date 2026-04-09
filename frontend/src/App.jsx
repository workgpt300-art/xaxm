const Dashboard = () => {
  const { user, token, logout } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [balance, setBalance] = useState(user?.balance || 0);

  useEffect(() => {
    // 🔧 Можеш увімкнути mock якщо нема БД
    // const mockTasks = [
    //   { id: '1', title: 'Subscribe to Telegram Channel', reward: 0.50 },
    //   { id: '2', title: 'Watch Promo Video (30s)', reward: 1.20 },
    //   { id: '3', title: 'Install Partner App', reward: 5.00 },
    // ];
    // setTasks(mockTasks);

    axios.get(`${API_URL}/api/tasks`)
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]));
  }, []);

  const completeTask = async (taskId) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/tasks/complete`,
        { taskId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBalance(data.newBalance);

      toast.success(`+$${data.reward} added to your balance!`, {
        icon: '💰',
        style: {
          borderRadius: '20px',
          background: '#1e1e2e',
          color: '#fff',
          border: '1px solid #313244'
        }
      });
    } catch (err) {
      toast.error('Error completing task');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 font-sans pb-16 relative overflow-hidden">

      {/* 🔥 ФОН */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
      <div className="fixed -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] opacity-50"></div>

      {/* 🔝 NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#111116]/80 border-b border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-6 h-24 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">E</span>
            </div>
            <span className="text-2xl font-black text-white">
              EARN<span className="text-purple-400">.IO</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="bg-[#1a1a22] px-6 py-3 rounded-full border border-[#2a2a35] flex items-center gap-4">
              <span className="text-slate-500 text-sm">BALANCE</span>
              <span className="text-2xl font-extrabold text-white">
                ${balance.toFixed(2)}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-3 bg-[#1a1a22] hover:bg-red-950/40 text-red-400 rounded-full border border-[#2a2a35]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 📊 MAIN */}
      <main className="max-w-6xl mx-auto px-6 mt-16 relative z-10">

        <header className="mb-12 flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            <p className="text-purple-400 text-xs uppercase">Dashboard</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-1">
              Hello, {user?.name || 'Explorer'} 👋
            </h1>
          </div>

          <div className="text-slate-400 bg-[#1a1a22] px-5 py-2 rounded-full border border-[#2a2a35]">
            <span className="text-white font-bold">{tasks.length}</span> Tasks
          </div>
        </header>

        {/* 🧩 TASKS */}
        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="bg-[#111116] border border-[#2a2a35] rounded-3xl p-16 text-center">
              <h3 className="text-xl font-bold text-white">No tasks yet</h3>
              <p className="text-slate-500 mt-2">
                Come back later for new opportunities
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className="group backdrop-blur-sm bg-[#111116]/80 p-8 rounded-[2rem] border border-[#2a2a35] hover:border-purple-700 transition-all flex flex-col lg:flex-row justify-between items-center"
              >
                <div className="flex items-center gap-6 mb-6 lg:mb-0">
                  
                  <div className="w-14 h-14 bg-[#1a1a22] rounded-2xl flex items-center justify-center text-purple-400">
                    ⚡
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{task.title}</h3>
                    <p className="text-green-400 font-bold">
                      + ${task.reward.toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => completeTask(task.id)}
                  className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Claim Reward
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
