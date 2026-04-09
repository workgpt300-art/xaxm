import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      // Функція для входу
      setAuth: (user, token) => set({ user, token }),

      // Функція для виходу
      logout: () => {
        set({ user: null, token: null });
        // Очищуємо пам'ять і перенаправляємо
        localStorage.removeItem('auth-storage');
        window.location.href = '/';
      },

      // Оновлення балансу
      updateBalance: (newBalance) => {
        set((state) => ({
          user: state.user ? { ...state.user, balance: newBalance } : null
        }));
      }
    }),
    {
      name: 'auth-storage', // Нова назва ключа, щоб уникнути старих помилок
    }
  )
);
