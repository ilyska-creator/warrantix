document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navList.classList.toggle('active');
            mobileMenu.classList.toggle('is-active');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            if (navList) navList.classList.remove('active');

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    const form = document.querySelector('.waitlist-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            btn.style.background = '#10b981';

            setTimeout(() => {
                alert('Спасибо! Вы добавлены в лист ожидания бета-теста.');
                form.reset();
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 1000);
        });
    }

    let currentLang = 'ru';
    const langToggle = document.getElementById('lang-toggle');

    const translations = {
        ru: {
            nav_features: "Возможности", nav_how: "Как это работает", nav_mission: "Миссия", nav_login: "Вход",
            hero_badge: " Этап 1: Бета-версия уже доступна",
            hero_title: 'Гарантия больше не <br><span class="highlight">бумажка в ящике</span>',
            hero_desc: "Первая в мире платформа, которая объединяет чеки, серийные номера и инструкции в единый цифровой профиль для каждой вашей вещи.",
            form_placeholder: "Ваш email", hero_subtext: "Бесплатно навсегда для ранних пользователей",
            card_status: "Активна", card_days_left: "Осталось дней", card_manual: "Инструкция", card_service: "Сервис",
            float_receipt: "Чек сохранен", float_reminder: "Напоминание",
            feat_title: "Все инструменты защиты <br>ваших покупок",
            feat_desc: "Мы убрали хаос из гарантийного обслуживания, оставив только то, что действительно важно.",
            feat_1_title: "Облачный архив чеков", feat_1_desc: "Загружайте фото или PDF чеков. Наша система распознает данные и привяжет их к товару автоматически.",
            feat_2_title: "Живой таймер гарантии", feat_2_desc: 'Больше никаких "куплено вроде год назад". Точный расчет сроков с учетом законодательства страны.',
            feat_3_title: "Библиотека инструкций", feat_3_desc: "Доступ к официальным мануалам в один клик. Поиск по ключевым словам внутри документов.",
            proc_title: "Путь от покупки до спокойствия",
            proc_1_title: "Сканирование", proc_1_desc: "Наведите камеру на чек или введите серийный номер устройства вручную.",
            proc_2_title: "Верификация", proc_2_desc: "Система определяет модель, срок гарантии и добавляет товар в ваш личный кабинет.",
            proc_3_title: "Мониторинг", proc_3_desc: "Получайте уведомления об окончании срока и находите сервисы рядом в случае поломки.",
            vision_title: "Строим мировую инфраструктуру доверия",
            vision_desc: "Наша цель — создать единый стандарт цифрового владения. В будущем Warrantix станет обязательным элементом для любой крупной покупки, обеспечивая прозрачность между покупателем, магазином и производителем.",
            vision_btn: "Читать Roadmap", footer_tagline: "Управляйте гарантиями умнее.",
            footer_prod: "Продукт", footer_sec: "Безопасность", footer_biz: "Для бизнеса",
            footer_comp: "Компания", footer_about: "О нас", footer_career: "Карьера", footer_contact: "Контакты", footer_social: "Соцсети"
        },
        en: {
            nav_features: "Features", nav_how: "How it works", nav_mission: "Mission", nav_login: "Login",
            hero_badge: "🚀 Phase 1: Beta is live",
            hero_title: 'Warranty is no longer <br><span class="highlight">paper in a drawer</span>',
            hero_desc: "The world's first platform unifying receipts, serial numbers, and manuals into a single digital profile for every item you own.",
            form_placeholder: "Your email", hero_subtext: "Free forever for early adopters",
            card_status: "Active", card_days_left: "Days left", card_manual: "Manual", card_service: "Service",
            float_receipt: "Receipt saved", float_reminder: "Reminder",
            feat_title: "All protection tools <br>for your purchases",
            feat_desc: "We removed the chaos from warranty service, keeping only what truly matters.",
            feat_1_title: "Cloud Receipt Archive", feat_1_desc: "Upload photos or PDFs of receipts. Our system recognizes data and links it to products automatically.",
            feat_2_title: "Live Warranty Timer", feat_2_desc: 'No more "bought like a year ago". Precise deadline calculation based on local laws.',
            feat_3_title: "Manual Library", feat_3_desc: "Access official manuals in one click. Keyword search inside documents.",
            proc_title: "From purchase to peace of mind",
            proc_1_title: "Scanning", proc_1_desc: "Point camera at receipt or enter device serial number manually.",
            proc_2_title: "Verification", proc_2_desc: "System identifies model, warranty period and adds item to your dashboard.",
            proc_3_title: "Monitoring", proc_3_desc: "Get notifications before expiry and find nearby service centers if broken.",
            vision_title: "Building global trust infrastructure",
            vision_desc: "Our goal is to create a unified standard of digital ownership. In the future, Warrantix will be essential for any major purchase, ensuring transparency between buyer, store, and manufacturer.",
            vision_btn: "Read Roadmap", footer_tagline: "Manage warranties smarter.",
            footer_prod: "Product", footer_sec: "Security", footer_biz: "For Business",
            footer_comp: "Company", footer_about: "About Us", footer_career: "Careers", footer_contact: "Contact", footer_social: "Socials"
        }
    };

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            currentLang = currentLang === 'ru' ? 'en' : 'ru';
            langToggle.textContent = currentLang.toUpperCase();

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
            });
        });
    }
});