const translations = {
    ru: {
        page_title: "Valuon — Личный кабинет",
        nav_items: "Мои вещи",
        nav_receipts: "Чеки и документы",
        nav_notifications: "Уведомления",
        nav_settings: "Настройки",
        btn_logout: "Выйти",
        dashboard_title: "Мои активы",
        btn_add: "+ Добавить вещь",
        stat_total: "Всего вещей",
        stat_active: "Активных гарантий",
        stat_expiring: "Истекают скоро",
        section_recent: "Недавние покупки",
        empty_state: "У вас пока нет добавленных вещей."
    },
    en: {
        page_title: "Valuon — Dashboard",
        nav_items: "My Items",
        nav_receipts: "Receipts & Docs",
        nav_notifications: "Notifications",
        nav_settings: "Settings",
        btn_logout: "Log Out",
        dashboard_title: "My Assets",
        btn_add: "+ Add Item",
        stat_total: "Total Items",
        stat_active: "Active Warranties",
        stat_expiring: "Expiring Soon",
        section_recent: "Recent Purchases",
        empty_state: "You haven't added any items yet."
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