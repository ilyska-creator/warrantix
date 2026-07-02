import { requireAuth, setupLogout } from './dashboard-auth.js';

const DEVICE_ICONS = {
    laptop: 'fa-laptop',
    phone: 'fa-mobile-screen-button',
    tablet: 'fa-tablet-screen-button',
    watch: 'fa-stopwatch',
    headphones: 'fa-headphones-simple',
    camera: 'fa-camera',
    console: 'fa-gamepad',
    appliance: 'fa-blender',
    other: 'fa-box-open'
};

async function initDashboardItems() {
    const auth = await requireAuth();
    if (!auth) return;

    loadItems(auth.user.id, auth.client);
    setupModal(auth.client);
    setupLogout(auth.client);
}

async function loadItems(userId, client) {
    const grid = document.querySelector('.items-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Загрузка...</div>';

    const { data: items, error } = await client
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        grid.innerHTML = '<p class="empty-state error">Ошибка загрузки данных.</p>';
        return;
    }

    const safeItems = items || []; 

    renderItems(safeItems);
    updateStats(safeItems);

    if (typeof renderNotifications === 'function') {
        renderNotifications(safeItems);
    }
}

export function calculateDaysLeft(purchaseDate, months) {
    if (!purchaseDate || !months) return -999;

    const [year, month, day] = purchaseDate.split('-').map(Number);

    const endDate = new Date(year, month - 1, day);

    const targetMonth = endDate.getMonth() + parseInt(months);
    endDate.setFullYear(endDate.getFullYear() + Math.floor(targetMonth / 12));
    endDate.setMonth(targetMonth % 12);

    if (endDate.getDate() !== day) {
        endDate.setDate(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return daysLeft;
}

function getStatusInfo(daysLeft) {
    if (daysLeft > 30) return { class: 'active', text: 'Активна' };
    if (daysLeft > 0) return { class: 'warning', text: 'Заканчивается' };
    return { class: 'expired', text: 'Истекла' };
}

function renderItems(items) {
    const grid = document.querySelector('.items-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = '<p class="empty-state">У вас пока нет добавленных вещей. Нажмите "Добавить вещь".</p>';
        return;
    }

    grid.innerHTML = items.map(item => {
        const iconClass = DEVICE_ICONS[item.type] || DEVICE_ICONS.other;
        const daysLeft = calculateDaysLeft(item.purchase_date, item.warranty_months);
        const status = getStatusInfo(daysLeft);
        const totalDays = (item.warranty_months || 12) * 30;
        const progress = totalDays > 0 ? Math.max(0, Math.min(100, (daysLeft / totalDays) * 100)) : 0;

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-icon"><i class="fa-solid ${iconClass}"></i></div>
                    <div class="item-status ${status.class}">${status.text}</div>
                </div>
                <h3 class="item-title">${item.name}</h3>
                <p class="item-meta">
                    ${item.brand || 'Бренд не указан'} • 
                    S/N: ${item.serial_number || '—'}
                    ${item.location ? `<br><small style="opacity:0.7">📍 ${item.location}</small>` : ''}
                </p>
                <div class="item-progress">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${status.class}" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text ${status.class === 'active' ? '' : status.class + '-text'}">
                        ${daysLeft > 0 ? `Осталось ${daysLeft} дней` : 'Гарантия истекла'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats(items) {
    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const expiringEl = document.getElementById('stat-expiring');
    const expiredEl = document.getElementById('stat-expired');

    if (!totalEl || !activeEl || !expiringEl) return;

    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    items.forEach(item => {
        const days = calculateDaysLeft(item.purchase_date, item.warranty_months);

        if (days > 30) {
            activeCount++;
        } else if (days > 0 && days <= 30) {
            expiringCount++;
        } else if (days <= 0) {
            expiredCount++;
        }
    });

    totalEl.textContent = items.length;
    activeEl.textContent = activeCount;
    expiringEl.textContent = expiringCount;

    if (expiredEl) expiredEl.textContent = expiredCount;
}

function setupModal(client) {
    const addBtn = document.getElementById('add-item-btn');
    const modal = document.getElementById('add-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.querySelector('.modal-form');

    if (!addBtn || !modal) return;

    let isSubmitting = false;

    addBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn?.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;
        isSubmitting = true;

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            const { data: { user } } = await client.auth.getUser();

            const nameInput = form.querySelector('input[name="name"]') || form.querySelector('input[type="text"]');
            const serialInputs = form.querySelectorAll('input[type="text"]');
            const dateInput = form.querySelector('input[type="date"]');
            const monthsInput = form.querySelector('input[type="number"]');

            const { error } = await client.from('items').insert([{
                user_id: user.id,
                name: nameInput.value.trim(),
                brand: '',
                serial_number: serialInputs.length > 1 ? serialInputs[1].value.trim() : '',
                purchase_date: dateInput.value,
                warranty_months: parseInt(monthsInput.value) || 12
            }]);

            if (error) throw error;

            btn.innerHTML = '<i class="fa-solid fa-check"></i>';

            setTimeout(() => {
                modal.classList.remove('active');
                form.reset();
                btn.innerHTML = originalText;
                btn.disabled = false;
                isSubmitting = false;
                initDashboardItems();
            }, 800);

        } catch (err) {
            if (err.code === '23505') {
                alert('Эта вещь уже добавлена!');
            } else {
                alert('Ошибка сохранения. Попробуйте снова.');
            }
            console.error(err);
            btn.innerHTML = originalText;
            btn.disabled = false;
            isSubmitting = false;
        }
    });
}

initDashboardItems();