import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // При завантаженні намагаємось дістати дані з пам'яті браузера
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,

  // Функція для входу (зберігаємо юзера та токен)
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  // Функція для виходу (очищаємо все)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
    window.location.href = '/'; // Повертаємо на сторінку входу
  },

  // Функція для швидкого оновлення балансу (без перелогіну)
  updateBalance: (newBalance) => {
    set((state) => {
      const updatedUser = { ...state.user, balance: newBalance };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  }
}));
