document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        updateThemeIcon(isDark ? 'sun' : 'moon');

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('valuon-theme', newTheme);
            updateThemeIcon(newTheme === 'dark' ? 'sun' : 'moon');
        });
    }

    function updateThemeIcon(iconName) {
        const icon = themeToggle.querySelector('i');
        if (icon) icon.className = `fa-solid fa-${iconName}`;
    }

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        const currentLang = localStorage.getItem('valuon-lang') || 'ru';
        updateLangText(currentLang);

        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const currentLang = localStorage.getItem('valuon-lang') || 'ru';
            const newLang = currentLang === 'ru' ? 'en' : 'ru';

            localStorage.setItem('valuon-lang', newLang);
            updateLangText(newLang);
            window.location.reload();
        });
    }

    function updateLangText(lang) {
        const span = langToggle.querySelector('span');
        if (span) span.textContent = lang.toUpperCase();
    }
});