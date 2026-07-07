const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000; // 15 минут

/**
 * Проверяет и регистрирует попытку входа
 * @param {string} identifier - email или username
 * @returns {Object} { allowed: boolean, remainingAttempts: number, resetIn: string }
 */
export function checkLoginRateLimit(identifier) {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();

    const attempts = loginAttempts.get(key) || [];
    const recentAttempts = attempts.filter(t => now - t < LOGIN_TIMEOUT_MS);

    loginAttempts.set(key, recentAttempts);

    if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
        const oldestAttempt = Math.min(...recentAttempts);
        const resetTime = new Date(oldestAttempt + LOGIN_TIMEOUT_MS);
        const minutes = Math.ceil((resetTime - now) / 60000);

        return {
            allowed: false,
            remainingAttempts: 0,
            resetIn: `${minutes} мин`
        };
    }

    recentAttempts.push(now);
    loginAttempts.set(key, recentAttempts);

    return {
        allowed: true,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - recentAttempts.length,
        resetIn: null
    };
}

/**
 * Проверяет rate limit для регистрации
 * @param {string} email
 * @returns {Object} { allowed: boolean }
 */
const signupAttempts = new Map();
const MAX_SIGNUP_ATTEMPTS = 3;
const SIGNUP_TIMEOUT_MS = 60 * 60 * 1000; // 1 час

export function checkSignupRateLimit(email) {
    const key = email.toLowerCase().trim();
    const now = Date.now();

    const attempts = signupAttempts.get(key) || [];
    const recentAttempts = attempts.filter(t => now - t < SIGNUP_TIMEOUT_MS);

    signupAttempts.set(key, recentAttempts);

    if (recentAttempts.length >= MAX_SIGNUP_ATTEMPTS) {
        return { allowed: false };
    }

    recentAttempts.push(now);
    signupAttempts.set(key, recentAttempts);

    return { allowed: true };
}

// ============================================================================
// БЕЗОПАСНАЯ РАБОТА С HTML
// ============================================================================

/**
 * Безопасно устанавливает внутренний HTML элемента
 * Предпочитает textContent для простого текста
 * @param {HTMLElement} element
 * @param {string} html - может содержать HTML
 * @param {boolean} allowHTML - разрешить ли HTML (для иконок и т.д.)
 */
export function setSafeHTML(element, html, allowHTML = false) {
    if (!element) return;

    if (allowHTML) {
        // Для контролируемого HTML (иконки, структурированный контент)
        element.innerHTML = html;
    } else {
        // Для пользовательского контента - только текст
        element.textContent = html;
    }
}

/**
 * Устанавливает спиннер загрузки безопасно
 * @param {HTMLElement} button
 */
export function setLoadingButton(button) {
    if (!button) return;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
}

/**
 * Восстанавливает кнопку из состояния загрузки
 * @param {HTMLElement} button
 * @param {string} originalHTML - исходный HTML
 */
export function resetLoadingButton(button, originalHTML) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = originalHTML;
}

/**
 * Безопасно создаёт элемент с HTML контентом
 * @param {string} tag - название тега
 * @param {string} html - содержимое (может быть HTML)
 * @param {string} className - класс элемента
 * @returns {HTMLElement}
 */
export function createSafeElement(tag, html, className = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.innerHTML = html;
    return el;
}

// ============================================================================
// ВАЛИДАЦИЯ И ЭКРАНИРОВАНИЕ
// ============================================================================

/**
 * Экранирует HTML специальные символы
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Проверяет валидность email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Проверяет силу пароля
 * @param {string} password
 * @returns {Object} { valid: boolean, strength: 'weak'|'medium'|'strong', issues: string[] }
 */
export function validatePassword(password) {
    const issues = [];

    if (password.length < 8) issues.push('Минимум 8 символов');
    if (!/[A-Z]/.test(password)) issues.push('Хотя бы одна заглавная буква');
    if (!/[a-z]/.test(password)) issues.push('Хотя бы одна строчная буква');
    if (!/\d/.test(password)) issues.push('Хотя бы одна цифра');
    if (!/[!@#$%^&*\-_+=]/.test(password)) issues.push('Хотя бы один спецсимвол (!@#$%^&*-_+=)');

    let strength = 'weak';
    if (issues.length <= 1) strength = 'strong';
    else if (issues.length <= 2) strength = 'medium';

    return {
        valid: issues.length === 0,
        strength,
        issues
    };
}

// ============================================================================
// ОЧИСТКА ПАМЯТИ
// ============================================================================

/**
 * Очищает старые попытки входа (каждый час)
 */
export function cleanupOldAttempts() {
    setInterval(() => {
        const now = Date.now();

        // Очистить login attempts
        for (const [key, attempts] of loginAttempts.entries()) {
            const recent = attempts.filter(t => now - t < LOGIN_TIMEOUT_MS);
            if (recent.length === 0) {
                loginAttempts.delete(key);
            } else {
                loginAttempts.set(key, recent);
            }
        }

        // Очистить signup attempts
        for (const [key, attempts] of signupAttempts.entries()) {
            const recent = attempts.filter(t => now - t < SIGNUP_TIMEOUT_MS);
            if (recent.length === 0) {
                signupAttempts.delete(key);
            } else {
                signupAttempts.set(key, recent);
            }
        }
    }, 60 * 60 * 1000); // Каждый час
}

// Запустить очистку памяти при загрузке
if (typeof window !== 'undefined') {
    window.addEventListener('load', cleanupOldAttempts);
}
