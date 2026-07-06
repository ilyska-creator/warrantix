// js/business-panel.js
import { requireAuth } from './dashboard-auth.js';

let currentClient = null;
let currentUser = null;
let currentShop = null;

async function initBusinessPanel() {
    // ✅ ПУНКТ 3: Обработка ошибок загрузки магазина с fallback UI
    if (typeof window.showToast !== 'function') {
        console.warn('Toast system not loaded');
        window.showToast = (msg) => console.log(`[TOAST] ${msg}`);
    }

    const auth = await requireAuth();
    if (!auth) return;

    const { user, client } = auth;
    currentUser = user;
    currentClient = client;

    // ✅ ПУНКТ 9: Кэширование данных магазина в sessionStorage
    const cachedShop = sessionStorage.getItem('current_shop');
    if (cachedShop) {
        try {
            currentShop = JSON.parse(cachedShop);
        } catch (e) {
            console.error('Failed to parse cached shop:', e);
            currentShop = null;
        }
    }

    const views = {
        shop: document.getElementById('create-shop-view'),
        dashboard: document.getElementById('shop-dashboard-view')
    };
    const forms = {
        shop: document.getElementById('create-shop-form'),
        receipt: document.getElementById('issue-receipt-form')
    };
    const modal = {
        el: document.getElementById('create-receipt-modal'),
        openBtn: document.getElementById('open-create-receipt-btn'),
        closeBtn: document.getElementById('close-receipt-modal'),
        cancelBtn: document.getElementById('cancel-receipt-modal')
    };
    const stats = {
        total: document.getElementById('total-receipts'),
        pending: document.getElementById('pending-receipts')
    };
    const list = {
        grid: document.getElementById('business-receipts-grid'),
        empty: document.getElementById('no-receipts-msg')
    };

    function updateShopInfo(shop) {
        const nameEl = document.getElementById('display-shop-name');
        const vatEl = document.getElementById('display-tax-id');
        const addrEl = document.getElementById('display-address');

        if (nameEl) nameEl.textContent = shop.shop_name || 'Без названия';
        if (vatEl) vatEl.textContent = shop.tax_id || '—';
        if (addrEl) addrEl.textContent = shop.address || '—';
    }

    // Загрузка магазина из БД
    try {
        const { data: shop, error } = await client
            .from('shops')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Shop load failed:', error);
            window.showToast('Не удалось загрузить данные магазина. Проверьте подключение.', 'error');

            // Если есть кэш — показываем дашборд с кэшированными данными
            if (currentShop) {
                updateShopInfo(currentShop);
                renderView(views.dashboard);
                await refreshDashboard(client, currentShop.id, stats, list);
            } else if (views.shop) {
                renderView(views.shop);
            }
            return;
        }

        currentShop = shop;

        // Сохраняем в кэш при успешной загрузке
        if (shop) {
            sessionStorage.setItem('current_shop', JSON.stringify(shop));
        } else {
            sessionStorage.removeItem('current_shop');
        }

        if (!shop && views.shop) {
            renderView(views.shop);
        } else if (shop) {
            updateShopInfo(shop);
            renderView(views.dashboard);
            await refreshDashboard(client, shop.id, stats, list);
        } else {
            renderView(views.dashboard);
        }
    } catch (e) {
        console.error('Shop load failed:', e);
        // ✅ ПУНКТ 3: Fallback на кэш или форму создания
        if (currentShop) {
            updateShopInfo(currentShop);
            renderView(views.dashboard);
            await refreshDashboard(client, currentShop.id, stats, list);
        } else if (views.shop) {
            renderView(views.shop);
        }
    }

    function renderView(targetView) {
        Object.values(views).forEach(v => v?.classList.remove('is-active'));
        targetView?.classList.add('is-active');
    }

    // Создание магазина
    if (forms.shop) {
        forms.shop.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');

            if (btn.disabled) return;
            btn.disabled = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Создание...';

            try {
                const fd = new FormData(e.target);
                const { error } = await client.from('shops').insert([{
                    owner_id: currentUser.id,
                    shop_name: fd.get('shop_name'),
                    tax_id: fd.get('tax_id'),
                    address: fd.get('address')
                }]);

                if (error) {
                    window.showToast(error.code === '23505' ? 'Магазин уже существует' : 'Ошибка создания', 'error');
                    return;
                }

                window.showToast('Магазин создан!', 'success');

                const { data: newShop } = await client
                    .from('shops')
                    .select('*')
                    .eq('owner_id', currentUser.id)
                    .maybeSingle();

                if (newShop) {
                    currentShop = newShop;
                    // ✅ ПУНКТ 9: Обновляем кэш
                    sessionStorage.setItem('current_shop', JSON.stringify(newShop));
                    updateShopInfo(newShop);
                    renderView(views.dashboard);
                    await refreshDashboard(client, newShop.id, stats, list);
                }
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        });
    }

    function toggleModal(show) {
        if (!modal.el) return;

        if (show) {
            if (!currentShop) {
                window.showToast('Сначала создайте магазин', 'warning');
                return;
            }

            modal.el.classList.remove('is-hidden');
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            if (forms.receipt?.purchase_date) {
                forms.receipt.purchase_date.value = now.toISOString().slice(0, 16);
            }
        } else {
            const emailField = forms.receipt?.querySelector('[name="customer_email"]');
            const itemField = forms.receipt?.querySelector('[name="item_name"]');
            const hasData = (emailField?.value && emailField.value.trim() !== '') ||
                (itemField?.value && itemField.value.trim() !== '');

            modal.el.classList.add('is-hidden');
            forms.receipt?.reset();
        }
    }

    modal.openBtn?.addEventListener('click', () => toggleModal(true));
    modal.closeBtn?.addEventListener('click', () => toggleModal(false));
    modal.cancelBtn?.addEventListener('click', () => toggleModal(false));
    modal.el?.addEventListener('click', (e) => {
        if (e.target === modal.el) toggleModal(false);
    });

    // Выписка чека
    if (forms.receipt) {
        forms.receipt.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');

            if (btn.disabled) return;
            btn.disabled = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Выписка...';

            try {
                if (!currentShop) return;

                const fd = new FormData(e.target);
                const email = fd.get('customer_email').toLowerCase().trim();

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    window.showToast('Введите корректный email покупателя', 'warning');
                    return;
                }

                const qty = parseFloat(fd.get('qty')) || 1;
                const price = parseFloat(fd.get('price')) || 0;
                const vatRate = parseFloat(fd.get('vat_rate')) || 19;
                const net = qty * price;
                const vat = net * (vatRate / 100);
                const gross = net + vat;

                const hashData = `${currentShop.tax_id}|${fd.get('item_name')}|${net}|${vat}|${fd.get('purchase_date')}`;
                const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashData));
                const fiscalHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

                const { data: existingUser } = await client
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                const payload = {
                    shop_id: currentShop.id,
                    customer_email: email,
                    item_name: escapeHtml(fd.get('item_name')),
                    qty, unit_price: price, vat_rate: vatRate,
                    net_total: net, vat_amount: vat, gross_total: gross,
                    purchase_date: fd.get('purchase_date'),
                    payment_method: fd.get('payment_method'),
                    status: existingUser ? 'verified' : 'pending',
                    fiscal_hash: fiscalHash
                };

                const { error } = await client.from('business_receipts').insert([payload]);
                if (error) {
                    window.showToast('Ошибка выписки чека', 'error');
                    console.error(error);
                    return;
                }

                window.showToast('Чек выписан!', 'success');
                toggleModal(false);
                await refreshDashboard(client, currentShop.id, stats, list);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        });
    }

    async function refreshDashboard(client, shopId, statsEl, listEl) {
        if (!shopId) return;

        // Индикатор загрузки
        statsEl.total.textContent = '...';
        statsEl.pending.textContent = '...';
        listEl.grid.innerHTML = '<div class="loading-spinner" style="text-align:center;padding:2rem;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';

        // Скрываем сообщение о пустоте во время загрузки
        const emptyMsg = document.getElementById('no-receipts-msg');
        if (emptyMsg) emptyMsg.style.display = 'none';

        try {
            const [totalRes, pendingRes, receiptsRes] = await Promise.all([
                client.from('business_receipts').select('*', { count: 'exact', head: true }).eq('shop_id', shopId),
                client.from('business_receipts').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'pending'),
                client.from('business_receipts').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
            ]);

            if (statsEl.total) statsEl.total.textContent = totalRes.count || 0;
            if (statsEl.pending) statsEl.pending.textContent = pendingRes.count || 0;

            const receipts = receiptsRes.data || [];

            // ✅ ЛОГИКА ОТОБРАЖЕНИЯ ПУСТОГО СОСТОЯНИЯ
            if (receipts.length === 0) {
                listEl.grid.innerHTML = ''; // Очищаем сетку
                if (emptyMsg) emptyMsg.style.display = 'block'; // Показываем сообщение
                return;
            }

            // Если чеки есть, скрываем сообщение и рендерим карточки
            if (emptyMsg) emptyMsg.style.display = 'none';

            listEl.grid.innerHTML = receipts.map(r => {
                const statusClass = r.status === 'verified' ? 'active' : 'warning';
                const statusText = r.status === 'verified' ? 'Привязан' : 'Ожидает регистрации';
                const dateStr = new Date(r.purchase_date).toLocaleDateString('ru-RU');

                return `
            <div class="item-card status-${r.status}">
                <div class="item-header">
                    <div class="item-icon"><i class="fa-solid fa-receipt"></i></div>
                    <span class="item-status-badge ${statusClass}">${escapeHtml(statusText)}</span>
                </div>
                <div class="item-body">
                    <h3 class="item-title" title="${escapeHtml(r.item_name)}">${escapeHtml(r.item_name)}</h3>
                    <div class="item-brand">
                        <i class="fa-regular fa-envelope"></i> ${escapeHtml(r.customer_email)}
                    </div>
                    <div class="item-tags">
                        <span class="tag"><i class="fa-solid fa-tag"></i> $${parseFloat(r.gross_total).toFixed(2)}</span>
                        <span class="tag"><i class="fa-solid fa-calendar-days"></i> ${escapeHtml(dateStr)}</span>
                        <span class="tag"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(r.id.slice(0, 8).toUpperCase())}</span>
                    </div>
                </div>
            </div>`;
            }).join('');
        } catch (e) {
            console.error('Dashboard refresh failed:', e);
            window.showToast('Не удалось обновить данные. Попробуйте позже.', 'error');
            statsEl.total.textContent = '—';
            statsEl.pending.textContent = '—';
            listEl.grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Ошибка загрузки данных</p>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    const firstReceiptBtn = document.getElementById('create-first-receipt-btn');
    if (firstReceiptBtn) {
        firstReceiptBtn.addEventListener('click', () => {
            const openBtn = document.getElementById('open-create-receipt-btn');
            if (openBtn) openBtn.click();
        });
    }
}

initBusinessPanel();