import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
    || 'https://qjnzawjivqvgupbgxdao.supabase.co';
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY)
    || 'sb_publishable_AwSiUBE-lYKiQAvA_T5ryw_2r_JOOH8';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export async function getAuthSession() {
    let client = createClient(supabaseUrl, supabaseKey, { auth: { storage: localStorage } });
    let { data: { session } } = await client.auth.getSession();

    if (!session) {
        client = createClient(supabaseUrl, supabaseKey, { auth: { storage: sessionStorage } });
        ({ data: { session } } = await client.auth.getSession());
    }

    return { session, client };
}

export function setupLogout(currentClient) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await currentClient.auth.signOut();
                localStorage.removeItem('valuon-remember-email');
                sessionStorage.clear();
                window.location.href = 'index.html';
            } catch (err) {
                console.error(err);
                localStorage.removeItem('valuon-remember-email');
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }
}

export async function requireAuth() {
    const { session, client } = await getAuthSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return { user: session.user, client };
}