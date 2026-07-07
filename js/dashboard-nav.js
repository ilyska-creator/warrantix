document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
    const views = document.querySelectorAll('.dashboard-view');

    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    let scrollPosition = 0;

    function lockScroll() {
        scrollPosition = window.scrollY;
        document.body.classList.add('scroll-locked');
        document.body.style.top = `-${scrollPosition}px`;
    }

    function unlockScroll() {
        document.body.classList.remove('scroll-locked');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);

        if ('ontouchstart' in window) {
            document.body.dispatchEvent(new Event('touchstart'));
        }
    }

    function openSidebar() {
        sidebar?.classList.add('active');
        overlay?.classList.add('active');
        lockScroll();
    }

    function closeSidebar() {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        setTimeout(unlockScroll, 450);
    }

    function toggleSidebar() {
        if (sidebar?.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function activateView(targetId) {
        navLinks.forEach(l => l.classList.remove('active'));
        views.forEach(view => view.classList.remove('active'));

        document.querySelector(`.sidebar-nav .nav-item[href="#${targetId}"]`)?.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
    }

    menuBtn?.addEventListener('click', toggleSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('href').replace('#', '');
            activateView(targetId);

            if (window.innerWidth <= 900 && sidebar?.classList.contains('active')) {
                closeSidebar();
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        activateView(hash);
    }

    unlockScroll();
});