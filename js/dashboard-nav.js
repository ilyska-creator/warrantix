document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
    const views = document.querySelectorAll('.dashboard-view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            views.forEach(view => view.classList.remove('active'));
            const targetId = link.getAttribute('href').replace('#', '');
            document.getElementById(targetId)?.classList.add('active');

            if (window.innerWidth <= 900) {
                document.getElementById('sidebar')?.classList.remove('active');
                document.getElementById('sidebar-overlay')?.classList.remove('active');
            }
        });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        navLinks.forEach(l => l.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));

        document.querySelector(`[href="#${hash}"]`)?.classList.add('active');
        document.getElementById(hash)?.classList.add('active');
    }
});