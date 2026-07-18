# Аудит проекта Valuon

**Дата:** 19.07.2026
**Охват:** 25 JS, 11 HTML, 8 CSS файлов

---

## Содержание

1. [Критические](#1-критические)
2. [Безопасность](#2-безопасность)
3. [JavaScript — мёртвый код и баги](#3-javascript--мёртвый-код-и-баги)
4. [CSS — мёртвый код и дубликаты](#4-css--мёртвый-код-и-дубликаты)
5. [HTML — битые ссылки, атрибуты](#5-html--битые-ссылки-атрибуты)
6. [i18n — несоответствия переводов](#6-i18n--несоответствия-переводов)
7. [Функциональные баги](#7-функциональные-баги)

---

## 1. Критические

### ~~1.1 CustomEvents на `window`, слушатели на `document`~~ **FIXED**
**Файлы:** `js/dashboard-settings.js:293,314`
**Было:** Слушатели `themeChange` и `lang-changed` висели на `document`, а диспатчились на `window` — никогда не срабатывали.
**Фикс:** `document.addEventListener` → `window.addEventListener`.

### 1.2 Приватные ключи Ed25519 через анонимный Supabase-клиент
**Файл:** `js/business-panel.js:288-295`
**Описание:** При создании магазина приватный ключ (base64 pkcs8) сохраняется в таблицу `shops` через клиент с анонимным ключом. Если RLS на таблице `shops` не настроена строго (`owner_id = auth.uid()`), любой авторизованный пользователь может прочитать чужие приватные ключи и подписывать чеки от имени любого магазина.

### 1.3 Content Security Policy (CSP) отсутствует
**Описание:** Ни один HTML-файл не содержит `<meta http-equiv="Content-Security-Policy">`. Файлы `vercel.json` и `_headers` отсутствуют. Все CDN-скрипты (jsdelivr, cdnjs, google fonts, cloudflare) загружаются без SRI/integrity. Supply-chain атака на любой CDN скомпрометирует всех пользователей. **Команда знает об этом** (`js/roadmap-lang.js:45`, `docs/CODE_AUDIT.md:53`), но не починила.

### 1.4 Нет SQL-миграций
**Описание:** В проекте нет `.sql` файлов миграций. Схема БД (таблицы `profiles`, `items`, `receipts`, `business_receipts`, `receipt_items`, `shops`, RPC `check_profile_exists`) управляется вручную через дашборд Supabase. При развёртывании на новом проекте ничего не воспроизведётся.

---

## 2. Безопасность

### ~~2.1 XSS — escapeHtml используется последовательно~~ **НЕ ПРОБЛЕМА**
**Статус:** ✅ Все точки вставки пользовательских данных через `innerHTML` экранируются функцией `escapeHtml()` из `js/security.js:92-101`.

### 2.2 Open redirect через `?from=`
**Файл:** `js/verify.js:691-702`
**Серьёзность:** Низкая
**Описание:** Параметр `?from=` может вести на любой внешний URL. XSS нет (устанавливается `href`, не `innerHTML`), но может использоваться для фишинга.

### 2.3 Приватный ключ магазина в sessionStorage
**Файл:** `js/business-panel.js:231-233`
**Серьёзность:** Средняя
**Описание:** Объект `shop` с полем `private_key` кешируется в `sessionStorage`. Любой JS-код на странице (включая скомпрометированные CDN-скрипты) имеет доступ к sessionStorage.

### 2.4 Самодельный `sanitizeHTML` вместо DOMPurify
**Файлы:** `js/script.js:124-129`
**Серьёзность:** Средняя
**Описание:** Регулярками вырезается только `javascript:`. Пропускает `<img src=x>`, `<div>`, `<a href="http://evil.com">`. Сейчас данные в него — только хардкодные строки переводов, но при первом внесении динамических данных возможен XSS.

### 2.5 `console.error` может содержать email
**Серьёзность:** Низкая
**Описание:** Во всех модулях `console.error(err)` используется для логирования. В некоторых местах (например, `dashboard-settings.js:145`) сообщение ошибки Supabase может содержать email пользователя.

---

## 3. JavaScript — мёртвый код и баги

### 3.1 Мёртвый код

| # | Файл | Строки | Что |
|---|------|--------|-----|
| D1 | `security.js` | 80-85 | `createSafeElement()` — экспортируется, никем не импортируется |
| D2 | `security.js` | 108-146 | `validatePassword()` + `passwordIssues()` — экспортируются, никем не импортируются, хотя содержат i18n-строки |
| D3 | `register.js` | 2 | Импорты `setLoadingButton` и `resetLoadingButton` из `security.js` — не используются, вместо них ручное управление кнопкой |
| D4 | `register.js` | 143 | Деструктуризация `count` — переменная нигде не используется |

### 3.2 Потенциальные баги

| # | Файл | Строки | Описание |
|---|------|--------|----------|
| B1 | `dashboard-items.js` | 68-71 | `calculateDaysLeft()` вызывает `purchaseDate.split('-')` без проверки типа. Если `purchaseDate` — объект Date, будет TypeError |
| B2 | `dashboard-notifications.js` | 13-14 | Та же проблема с `calculateDaysLeft()` |
| B3 | `business-panel.js` | 37,183,474 | `r.id.slice(0, 8)` — если `r.id` не строка (например, autoincrement number), будет TypeError |
| B4 | `receipts.js` | 180 | Та же проблема `r.id.slice(0, 8)` |
| B5 | `business-panel.js` | 540-611 | `deleteModal.addEventListener('click', handleClickOutside)` — новый listener при каждом клике. При быстрых множественных кликах до закрытия — утечка listener'ов |
| B6 | `dashboard-settings.js` | 68-69 | Несогласованная обработка пустой строки `birthdate`: `|| null` vs присвоение `""` |
| B7 | `register.js` | 143 | `.update().select('id', { count: 'exact' })` — `count` будет `undefined`, т.к. `.update().select()` возвращает строки, не счётчик |

### 3.3 Проблемы с async/await (Unhandled Promise Rejections)

| # | Файл | Строки | Описание |
|---|------|--------|----------|
| A1 | `dashboard-settings.js` | 322 | `ensureSettingsLoaded()` вызывает `initSettings()` (async) без `await` |
| A2 | `dashboard-notifications.js` | 153 | `ensureNotifLoaded()` (async) как обработчик клика без обработки Promise |
| A3 | `dashboard-notifications.js` | 157 | `ensureNotifLoaded()` вызвана без `await` и `.catch()` |
| A4 | `business-panel.js` | 815 | `initBusinessPanel()` (async) на верхнем уровне без `await` |

### 3.4 Необъявленные глобалы (зависимость от CDN)

| # | Файл | Строки | Глобал |
|---|------|--------|--------|
| G1 | `verify.js` | 140 | `jsQR` — ReferenceError при недоступности CDN |
| G2 | `verify.js` | 148, 622 | `pdfjsLib` — ReferenceError при недоступности CDN |
| G3 | `verify.js` | 745 | `Chart` — ReferenceError при недоступности CDN |
| G4 | `receipt-generator.js` | 2, 41 | `qrcode`, `jspdf` |
| G5 | `receipts.js` | 357, 365 | `jspdf`, `qrcode` |
| G6 | `business-panel.js` | 745 | `Chart` |
| G7 | `auth.js` | 48, 93, 131, 162, 236, 263 | `turnstile` |
| G8 | `business-panel.js` | 12 | `showToast` — fallback-заглушка, но при отсутствии `toast.js` тост не появится |

### 3.5 Дублирование кода

| # | Что | Файлы |
|---|-----|-------|
| Q1 | `calculateDaysLeft()` — одинаковая логика | `dashboard-items.js:68`, `dashboard-notifications.js:13` |
| Q2 | IIFE темы (localStorage → data-theme) — 4 копии | `theme.js:1`, `privacy-lang.js:247`, `terms-lang.js:201`, `roadmap-lang.js:268` |
| Q3 | `DOMContentLoaded` theme-toggle — 4 копии | `theme.js:10`, `privacy-lang.js:256`, `terms-lang.js:210`, `roadmap-lang.js:277` |
| Q4 | `storage` listener для темы — 4 копии | `theme.js:40`, `privacy-lang.js:240`, `terms-lang.js:194`, `roadmap-lang.js:261` |
| Q5 | `getLang()` — одинаковая логика | 5 файлов |
| Q6 | HTML-шаблон карточек чеков | `business-panel.js`, `receipts.js` |

### 3.6 Утечки памяти

| # | Файл | Строки | Описание |
|---|------|--------|----------|
| M1 | `security.js` | 148-170 | `setInterval(... 60*60*1000)` никогда не очищается |
| M2 | `business-panel.js` | 540-611 | `refreshDashboard()` создаёт новые listener'ы при каждом вызове |

---

## 4. CSS — мёртвый код и дубликаты

### 4.1 Классы в HTML/JS, не определённые в CSS

| Класс | Файл | Строка |
|-------|------|--------|
| `.contact-links` | `index.html` | 341 |
| `.bg-decoration` | `business.html` | 93, 94 |
| `.bg-blob-1`, `.bg-blob-2` | `business.html` | 93, 94 |
| `.card-icon` | `business.html` | 59 |
| `.mt-2` | `business.html` | 225 |

### 4.2 Классы в CSS, не используемые в HTML/JS

| Класс | Файл CSS | Строка |
|-------|----------|--------|
| `.reveal` / `.reveal.active` | `style.css` | 949-958 (JS в `script.js:187` ищет `.reveal`, но в HTML ни одного) |

### 4.3 Конфликтующие @keyframes

| Имя | Где | Проблема |
|-----|-----|----------|
| `badgePulse` | `style.css:347` vs `verify.css:674` | **Разная анимация** с одинаковым именем. Какая применится — зависит от порядка загрузки CSS |
| `fadeIn` | `business.css:268` vs `dashboard.css:1089` | Полный дубликат |

### 4.4 Массовое дублирование CSS-классов между файлами

Более 30 классов (`.icon-btn`, `.navbar`, `.btn-danger`, `.input-group`, `.modal-overlay`, `.item-card`, `.progress-bar-bg`, `.stats-grid`, `.empty-state`, `.btn-action` и др.) определены в 2–4 разных CSS-файлах. Проект использует стратегию copy-paste вместо единой системы компонентов.

### 4.5 Недостающие `backdrop-filter` (только -webkit-)

`dashboard.css:981,1200,1658`, `business.css:735,1262`, `style.css:1211,1169` — везде только `-webkit-backdrop-filter`, без стандартного `backdrop-filter`.

### 4.6 `!important` блокирует `.active`

**Файл:** `dashboard.css:700-701`
`.sidebar-overlay { display: none !important; }` в `@media (max-width: 900px)` — `!important` перекрывает `.sidebar-overlay.active { display: block; }`. Overlay не появится на мобильных даже с JS.

### 4.7 Мёртвый media query

**Файл:** `style.css:536` — `@media (max-width: 767px)` содержит `.btn.large { width: 70%; }`, но `@media (max-width: 768px)` ниже переопределяет на `width: 100%` для всех экранов ≤768px. Первый медиа-запрос никогда не применяется.

### 4.8 Неопределённые CSS-переменные

- `--primary-color` в `style.css:1465` (`.email-link`) — не определена в `:root`, всегда срабатывает fallback
- `--text-heading` в `business.css:1196` — не определена

### 4.9 ~30KB неиспользуемого CSS

Страницы dashboard, business, verify, receipts подключают `css/style.css`, который содержит стили лендинга (hero, features, timeline, footer), не нужные на этих страницах.

---

## 5. HTML — битые ссылки, атрибуты

### 5.1 Формы без `action`

Все формы (login, register, reset-password, dashboard modal, business) не имеют атрибута `action`. Полная зависимость от JS.

### 5.2 Хардкодные Supabase credentials в inline-скриптах

**Файл:** `reset-password.html:98-101` — Supabase URL и anon-ключ дублируются в inline-скрипте. Дубликат 5 других файлов.

### 5.3 Блокирующие скрипты без async/defer

`business.html:18-20`, `verify.html:21-22` — jspdf, qrcode, chart, jsQR, pdf.min.js грузятся без `async`/`defer`, блокируя рендеринг.

---

## 6. i18n — несоответствия переводов

### 6.1 Отсутствующий ключ в en

| Ключ | Файл | Проблема |
|------|------|----------|
| `msg_success` | `js/script.js` | Есть в `ru`, **отсутствует** в `en`. `t.msg_success` вернёт `undefined` при английском языке |

### 6.2 Мёртвые ключи переводов

| Ключ | Файл |
|------|------|
| `form_placeholder` | `js/script.js` (оба языка) |
| `card_manual` | `js/script.js` (оба языка) |
| `card_service` | `js/script.js` (оба языка) |
| `privacy_callout` | `js/privacy-lang.js` (оба языка, нет `data-i18n` в HTML) |

### 6.3 Хардкодные строки в JS без i18n

| # | Файл | Сколько |
|---|------|---------|
| H1 | `js/dashboard-items.js:54,317` | 2 строки ("Ошибка загрузки") |
| H2 | `js/business-panel.js` | ~20 строк (ошибки, статусы, тосты) |
| H3 | `js/receipts.js` | ~15 строк (ошибки, навигация) |

### 6.4 `business.html` — русский текст без data-i18n

~30 элементов на странице бизнеса не имеют `data-i18n`. Перевод выполняется через JS-функцию после загрузки. При первом рендере — flash of untranslated content. При отключённом JS — весь текст остаётся на русском.

---

## 7. Функциональные баги

### ~~7.1 Нет валидации отрицательных цен~~ **FIXED**

**Файлы:** `receipts.js:718`, `dashboard-items.js:495`
**Было:** `parseFloat(amount) || 0` — отрицательное значение проходило.
**Фикс:** `Math.max(0, parseFloat(...) || 0)` — отрицательные обрезаются до 0.

### ~~7.2 Orphaned-файлы в storage при ошибке БД~~ **FIXED**

**Файл:** `receipts.js:733`
**Было:** При ошибке `INSERT` файл оставался в storage.
**Фикс:** В блоке `if (dbError)` вызывается `client.storage.from('receipts').remove([filePath])` перед `throw`.

### ~~7.3 `updated_at` не записывается при создании профиля~~ **FIXED**

**Файл:** `dashboard-settings.js:50-58`
**Было:** `INSERT` в `profiles` без `updated_at`.
**Фикс:** Добавлено `updated_at: new Date().toISOString()` в объект вставки.

### ~~7.4 `warranty_months = 0` показывает как просроченное~~ **FIXED**

**Файл:** `dashboard-items.js:69`
**Было:** `if (!months) return -999` — `0` был falsy.
**Фикс:** `if (months == null || months === '')` — только null/undefined/'' возвращают -999.

### ~~7.5 Email сохраняется в localStorage после успешного логина~~ **FIXED**

**Файл:** `auth.js:114-118`
**Было:** `localStorage.setItem` после вызова API.
**Фикс:** Сохранение email вынесено **до** `signInWithPassword`.

### ~~7.6 `showToast` — непоследовательная инициализация~~ **FIXED**

**Файл:** `business-panel.js:11-13`
**Было:** Заглушка только логировала в консоль, тост не появлялся.
**Фикс:** Fallback создаёт `#toast-container` динамически и рендерит toast через DOM.

---

## Сводка по критичности

| Категория | Крит. | Выс. | Сред. | Низк. |
|-----------|-------|------|-------|-------|
| **Безопасность** | 2 (1.2, 1.3) | — | 2 (2.3, 2.4) | 2 (2.2, 2.5) |
| **JS — мёртвый код** | — | — | 2 (D2, D4) | 2 (D1, D3) |
| **JS — баги** | 2 (1.1, B5) | 1 (B4) | 3 (B1, B2, B3) | 2 (B6, B7) |
| **JS — unhandled promises** | 4 (A1-A4) | — | — | — |
| **JS — необъявленные глобалы** | — | 6 (G1-G6) | 1 (G7) | 1 (G8) |
| **CSS** | — | 1 (4.6) | 3 (4.3, 4.5, 4.8) | 3 (4.1, 4.7, 4.9) |
| **HTML** | — | — | 2 (5.2, 5.3) | 1 (5.1) |
| **i18n** | — | — | 3 (6.1, 6.3, 6.4) | 1 (6.2) |
| **Функционал** | — | 1 (7.1) | 3 (7.2, 7.3, 7.4) | 1 (7.6) |
| **Итого** | **8** | **9** | **20** | **13** |

---

## Топ-10 что чинить в первую очередь

1. **CustomEvent на window, слушатели на document** — `dashboard-settings.js:293,314` — обработчики никогда не срабатывают
2. **CSP отсутствует** — supply-chain атака через любой CDN
3. **Приватные ключи Ed25519 через anon-key** — RLS должна быть строгой
4. **Unhandled Promise Rejections** — 4 места (A1-A4)
5. **CDN-глобалы без защиты** — 6 мест (G1-G6)
6. **`!important` на `.sidebar-overlay`** — блокирует `.active` на мобильных
7. **`msg_success` отсутствует в en** — `js/script.js`
8. **Orphaned файлы в storage** — `receipts.js:688-693`
9. **validatePassword() мёртвый** — `security.js:108-146`
10. **Дублирование theme-кода** — 4 копии в разных файлах
