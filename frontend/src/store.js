import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      // --- АВТОРИЗАЦІЯ ---
      setAuth: (user, token) => set({ user, token }),

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('auth-storage');
        window.location.href = '/';
      },

      // --- ОНОВЛЕННЯ ДАНИХ КОРИСТУВАЧА ---
      // Універсальний метод для оновлення будь-яких полів (баланс, енергія, рівень)
      updateUser: (updatedFields) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null
        }));
      },

      // Специфічне оновлення для тапу (баланс - енергія)
      handleTap: (tapValue, energyCost) => {
        const { user } = get();
        if (user && user.energy >= energyCost) {
          set({
            user: {
              ...user,
              balance: user.balance + tapValue,
              energy: user.energy - energyCost
            }
          });
        }
      },

      // --- РЕФЕРАЛИ ТА ПАРТНЕРСТВО ---
      setReferralData: (referrals, stats) => {
        set((state) => ({
          user: state.user ? { ...state.user, referralList: referrals, referralStats: stats } : null
        }));
      },

      // --- ТРАНЗАКЦІЇ ТА ЗАВДАННЯ ---
      addTransaction: (transaction) => {
        set((state) => ({
          user: state.user 
            ? { ...state.user, transactions: [transaction, ...(state.user.transactions || [])] } 
            : null
        }));
      },

      completeTask: (taskId, reward) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              balance: user.balance + reward,
              completedTaskIds: [...(user.completedTaskIds || []), taskId]
            }
          });
        }
      },

      // --- СТАТУС ЗАВАНТАЖЕННЯ (для UI-спінерів) ---
      setLoading: (status) => set({ isLoading: status })
    }),
    {
      name: 'auth-storage',
      // Часткове збереження: не зберігаємо isLoading у localStorage
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
