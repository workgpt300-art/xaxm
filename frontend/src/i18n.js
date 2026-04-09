import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 1. Описуємо переклади для всіх мов
const resources = {
  en: {
    translation: {
      login: { title: "Welcome Back", email: "Email", password: "Password", submit: "Sign In", success: "Success!", error: "Failed to login" },
      dashboard: { balance: "Balance", available_tasks: "Available Tasks" },
      tasks: { button: "Complete", done: "Money earned!", error: "Error completing task" }
    }
  },
  ua: {
    translation: {
      login: { title: "З поверненням", email: "Ел. пошта", password: "Пароль", submit: "Увійти", success: "Успішно!", error: "Помилка входу" },
      dashboard: { balance: "Баланс", available_tasks: "Доступні завдання" },
      tasks: { button: "Виконати", done: "Гроші зараховано!", error: "Помилка виконання" }
    }
  },
  ru: {
    translation: {
      login: { title: "С возвращением", email: "Эл. почта", password: "Пароль", submit: "Войти", success: "Успешно!", error: "Ошибка входа" },
      dashboard: { balance: "Баланс", available_tasks: "Доступные задания" },
      tasks: { button: "Выполнить", done: "Деньги начислены!", error: "Ошибка выполнения" }
    }
  }
};

// 2. Ініціалізація
i18n
  .use(initReactI18next)
  .init({
    resources,
    // Беремо мову з localStorage, якщо її там немає — ставимо англійську
    lng: localStorage.getItem('lng') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React вже захищає від XSS
    }
  });

export default i18n;
