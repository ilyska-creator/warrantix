const translations = {
    ru: {
        page_title: "Valuon — Вход",
        auth_title: "С возвращением!",
        auth_subtitle: "Введите данные для входа в аккаунт",
        label_email: "Email",
        label_password: "Пароль",
        btn_login: "Войти",
        footer_text: "Нет аккаунта?",
        footer_link: "Зарегистрироваться",
        back_home: "← На главную"
    },
    en: {
        page_title: "Valuon — Sign In",
        auth_title: "Welcome back!",
        auth_subtitle: "Enter your credentials to access your account",
        label_email: "Email",
        label_password: "Password",
        btn_login: "Sign In",
        footer_text: "Don't have an account?",
        footer_link: "Sign Up",
        back_home: "← Back to Home"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const currentLang = localStorage.getItem('valuon-lang') || 'ru';

    document.title = translations[currentLang].page_title;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
});