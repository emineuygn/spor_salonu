/**
 * FIT GYM CLUB — Admin Panel v8.0 (Tailwind & Dark Theme Optimized)
 */
'use strict';

const API = '../../gym_backend/api/admin/';
let bsModal = null;

/* ════════════════════════════════════════
   API
════════════════════════════════════════ */
async function apiFetch(endpoint, opts = {}) {
    const res = await fetch(API + endpoint, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...opts,
    });

    if (res.status === 401) { localStorage.clear(); redirect('../pages/giris.html'); throw new Error('Oturum süresi doldu.'); }

    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('Sunucu HTML döndürdü — PHP hatası.');

    try { return JSON.parse(text); }
    catch (e) { throw new Error('JSON parse hatası: ' + e.message); }
}

function redirect(url) { window.location.href = url; }

/* ════════════════════════════════════════
   TOAST (Tailwind Style)
════════════════════════════════════════ */
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-error/20 border-error/50 text-error';

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="${bgColor} border backdrop-blur-md px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between min-w-[300px] animate-in fade-in slide-in-from-right-5">
            <span class="text-sm font-bold uppercase tracking-wider">${msg}</span>
            <button onclick="this.parentElement.remove()" class="text-white/50 hover:text-white"><i class="bi bi-x-lg"></i></button>
        </div>`);

    setTimeout(() => document.getElementById(id)?.remove(), 3500);
}

/* ════════════════════════════════════════
   MODAL
════════════════════════════════════════ */
function showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    if (!bsModal) bsModal = new bootstrap.Modal(document.getElementById('adminModal'));
    bsModal.show();
}

window.closeModal = function () { bsModal?.hide(); };

/* ════════════════════════════════════════
   ROUTER
════════════════════════════════════════ */
const ENDPOINTS = {
    dashboard: 'financials.php',
    members:   'users.php?role=uye',
    staff:     'users.php?role=egitmen',
    packages:  'packages.php',
    classes:   'classes.php',
    logs:      'logs.php',
};

const SECTION_LABELS = {
    dashboard: 'DASHBOARD', members: 'ÜYE YÖNETİMİ', staff: 'EĞİTMEN KADROSU',
    packages: 'PAKET SATIŞLARI', classes: 'DERS PROGRAMI', logs: 'SİSTEM LOGLARI',
};

window.loadSection = async function (section) {
    const area  = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + section)?.classList.add('active');
    if (title) title.textContent = SECTION_LABELS[section] || section;

    area.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[400px] opacity-50">
            <div class="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
            <div class="text-xs font-bold uppercase tracking-widest">Veriler Yükleniyor...</div>
        </div>`;

    try {
        const result = await apiFetch(ENDPOINTS[section]);
        let data = extractData(result, section);

        switch (section) {
            case 'dashboard': renderDashboard(data); break;
            case 'members':   renderUsers(data, 'uye');     break;
            case 'staff':     renderUsers(data, 'egitmen'); break;
            case 'packages':  renderPackages(data); break;
            case 'classes':   renderClasses(data); break;
            case 'logs':      renderLogs(data);    break;
        }
    } catch (e) {
        area.innerHTML = `
            <div class="kinetic-card p-8 border-error/20 bg-error/5 text-error text-center">
                <i class="bi bi-exclamation-triangle text-3xl mb-4 block"></i>
                <div class="font-bold uppercase tracking-widest">${e.message}</div>
            </div>`;
    }
};

function extractData(result, section) {
    if (!result?.data) return result;
    const d = result.data;
    if (Array.isArray(d?.data))    return d.data;
    if (Array.isArray(d?.classes)) return d.classes;
    if (Array.isArray(d?.logs))    return d.logs;
    return d;
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
function renderDashboard(d) {
    const recentHtml = (d?.recent_sales ?? []).length
        ? d.recent_sales.map(s => `
            <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-4">
                    <div class="text-sm font-bold text-white">${s.ad} ${s.soyad}</div>
                    <div class="text-[10px] text-on-surface-variant uppercase font-bold">${s.paket_adi}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-accent font-black">₺${Number(s.tutar ?? 0).toLocaleString('tr-TR')}</span>
                </td>
                <td class="px-6 py-4 text-right text-xs text-on-surface-variant">
                    ${s.odeme_tarihi?.slice(0,10) ?? ''}
                </td>
            </tr>`).join('')
        : '<tr><td colspan="3" class="p-8 text-center text-on-surface-variant italic">Satış bulunamadı.</td></tr>';

    document.getElementById('dynamic-content').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${statCard('Toplam Üye', d?.total_members ?? 0, 'bi-people-fill', '+12%')}
            ${statCard('Toplam Gelir', '₺' + (Number(d?.total_revenue ?? 0)).toLocaleString('tr-TR'), 'bi-currency-dollar', '+5.4%')}
            ${statCard('Bu Ay Yeni', d?.new_this_month ?? 0, 'bi-person-plus-fill', 'Yeni')}
            ${statCard('Aktif Ders', d?.active_slots ?? 0, 'bi-calendar-check-fill', 'Bugün')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
                <div class="kinetic-card overflow-hidden">
                    <div class="p-6 border-b border-surface-container-high flex justify-between items-center">
                        <h3 class="font-bold text-white uppercase tracking-wider text-sm">Son Satışlar</h3>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                            <tr><th class="px-6 py-4">Üye</th><th class="px-6 py-4">Tutar</th><th class="px-6 py-4 text-right">Tarih</th></tr>
                        </thead>
                        <tbody class="divide-y divide-surface-container-high">${recentHtml}</tbody>
                    </table>
                </div>
            </div>
            <div class="flex flex-col gap-6">
                <div class="kinetic-card p-6">
                    <h3 class="font-bold text-white uppercase tracking-wider text-sm mb-6">Hızlı İşlemler</h3>
                    <div class="grid grid-cols-2 gap-3">
                        ${quickActionBtn('Üye Ekle', 'bi-person-plus', "openAddUserModal('uye')")}
                        ${quickActionBtn('Eğitmen Ekle', 'bi-person-badge', "openAddUserModal('egitmen')")}
                        ${quickActionBtn('Ders Aç', 'bi-calendar-plus', "loadSection('classes')")}
                        ${quickActionBtn('Sistem Log', 'bi-terminal', "loadSection('logs')")}
                    </div>
                </div>
            </div>
        </div>`;
}

function statCard(label, value, icon, trend) {
    return `
        <div class="kinetic-card p-6 flex flex-col gap-4">
            <div class="flex justify-between items-start">
                <div class="stat-icon-box"><i class="bi ${icon} text-xl"></i></div>
                <span class="text-accent text-xs font-bold">${trend}</span>
            </div>
            <div>
                <div class="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">${label}</div>
                <div class="text-3xl font-black text-white">${value}</div>
            </div>
        </div>`;
}

function quickActionBtn(label, icon, onclick) {
    return `
        <button onclick="${onclick}" class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-surface-container-high hover:bg-accent hover:text-black transition-all group border border-transparent">
            <i class="bi ${icon} text-xl group-hover:scale-110 transition-transform"></i>
            <span class="text-[10px] font-bold uppercase">${label}</span>
        </button>`;
}

/* ════════════════════════════════════════
   ÜYELER & EĞİTMENLER
════════════════════════════════════════ */
function renderUsers(list, role) {
    const isStaff = role === 'egitmen';
    const area = document.getElementById('dynamic-content');

    const rows = list.map(u => `
        <tr class="user-row hover:bg-white/[0.02] transition-colors" data-name="${(u.ad+' '+u.soyad+' '+u.email).toLowerCase()}">
            <td class="px-6 py-4 flex items-center gap-3">
                <div class="admin-avatar text-xs">${(u.ad||'?')[0].toUpperCase()}</div>
                <div>
                    <div class="text-sm font-bold text-white">${u.ad} ${u.soyad}</div>
                    <div class="text-[10px] text-on-surface-variant font-bold uppercase">${u.email}</div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-on-surface-variant">${u.telefon || '—'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase ${u.uyelik_tipi === 'premium' ? 'bg-accent/10 text-accent' : 'bg-surface-container-highest text-on-surface-variant'}">
                    ${u.uyelik_tipi || 'STANDART'}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteItem('users.php?role=${role}', ${u.uye_id}, '${isStaff ? 'staff' : 'members'}')" class="text-error hover:bg-error/10 p-2 rounded-lg transition-colors">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </td>
        </tr>`).join('');

    area.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <div class="relative w-72">
                <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"></i>
                <input oninput="filterUserTable(this.value)" type="text" placeholder="Ara..." class="w-full bg-surface-container-low border-none rounded-full py-3 pl-12 pr-6 text-sm focus:ring-2 focus:ring-accent/50">
            </div>
            <button onclick="openAddUserModal('${role}')" class="btn-primary-kinetic">
                <i class="bi bi-plus-lg me-2"></i> YENİ ${isStaff ? 'EĞİTMEN' : 'ÜYE'}
            </button>
        </div>
        <div class="kinetic-card overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                    <tr><th class="px-6 py-4">Kullanıcı</th><th class="px-6 py-4">Telefon</th><th class="px-6 py-4">Üyelik</th><th class="px-6 py-4 text-right">İşlem</th></tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">${rows}</tbody>
            </table>
        </div>`;
}

window.filterUserTable = function (q) {
    document.querySelectorAll('.user-row').forEach(row => {
        row.style.display = row.dataset.name?.includes(q.toLowerCase()) ? '' : 'none';
    });
};

/* ════════════════════════════════════════
   DERSLER
════════════════════════════════════════ */
function renderClasses(list) {
    const area = document.getElementById('dynamic-content');
    const rows = list.map(s => {
        const kayitli = (s.max_kapasite - s.mevcut_kapasite);
        const pct = s.max_kapasite > 0 ? Math.round((kayitli / s.max_kapasite) * 100) : 0;
        return `
            <tr class="hover:bg-white/[0.02]">
                <td class="px-6 py-4 font-bold text-white">${s.hizmet_adi}</td>
                <td class="px-6 py-4 text-xs text-on-surface-variant">${s.tarih} <br> ${s.baslangic_saati?.slice(0,5)}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="flex-grow bg-surface-container-highest h-1 rounded-full overflow-hidden">
                            <div class="bg-accent h-full" style="width: ${pct}%"></div>
                        </div>
                        <span class="text-[10px] font-bold text-accent">${kayitli}/${s.max_kapasite}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteItem('classes.php', ${s.slot_id}, 'classes')" class="text-error/60 hover:text-error transition-colors">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    area.innerHTML = `
        <div class="kinetic-card overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                    <tr><th class="px-6 py-4">Ders Adı</th><th class="px-6 py-4">Tarih / Saat</th><th class="px-6 py-4">Doluluk</th><th class="px-6 py-4 text-right">İşlem</th></tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">${rows}</tbody>
            </table>
        </div>`;
}

/* ════════════════════════════════════════
   LOGLAR
════════════════════════════════════════ */
function renderLogs(list) {
    const area = document.getElementById('dynamic-content');
    const rows = list.map(l => `
        <tr class="hover:bg-white/[0.01]">
            <td class="px-6 py-4 font-mono text-[10px] text-accent opacity-70">#${l.log_id}</td>
            <td class="px-6 py-4 text-sm font-medium text-on-surface">${l.islem}</td>
            <td class="px-6 py-4 text-xs text-on-surface-variant">${l.admin_isim}</td>
            <td class="px-6 py-4 text-right text-xs text-on-surface-variant">${l.tarih?.replace('T',' ') ?? ''}</td>
        </tr>`).join('');

    area.innerHTML = `
        <div class="kinetic-card overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                    <tr><th class="px-6 py-4">ID</th><th class="px-6 py-4">İşlem</th><th class="px-6 py-4">Sorumlu</th><th class="px-6 py-4 text-right">Tarih</th></tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">${rows}</tbody>
            </table>
        </div>`;
}

/* ════════════════════════════════════════
   PAKETLER
════════════════════════════════════════ */
function renderPackages(list) {
    const area = document.getElementById('dynamic-content');
    const rows = list.map(p => `
        <tr class="hover:bg-white/[0.02]">
            <td class="px-6 py-4 text-sm font-bold">${p.ad} ${p.soyad}</td>
            <td class="px-6 py-4"><span class="bg-accent/10 text-accent px-2 py-1 rounded text-[10px] font-black uppercase">${p.paket_adi}</span></td>
            <td class="px-6 py-4 font-black text-white">₺${Number(p.tutar).toLocaleString('tr-TR')}</td>
            <td class="px-6 py-4 text-right text-xs text-on-surface-variant">${p.odeme_tarihi?.slice(0,10)}</td>
        </tr>`).join('');

    area.innerHTML = `
        <div class="kinetic-card overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                    <tr><th class="px-6 py-4">Üye</th><th class="px-6 py-4">Paket</th><th class="px-6 py-4">Tutar</th><th class="px-6 py-4 text-right">Tarih</th></tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">${rows}</tbody>
            </table>
        </div>`;
}

/* ════════════════════════════════════════
   SİLME
════════════════════════════════════════ */
window.deleteItem = async function (endpoint, id, section) {
    if (!confirm('Bu kaydı kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    try {
        const sep = endpoint.includes('?') ? '&' : '?';
        await apiFetch(`${endpoint}${sep}id=${id}`, { method: 'DELETE' });
        toast('Kayıt Başarıyla Silindi.');
        loadSection(section);
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   MODAL: KULLANICI EKLEME
════════════════════════════════════════ */
window.openAddUserModal = function (role) {
    const label = role === 'egitmen' ? 'EĞİTMEN' : 'ÜYE';
    showModal(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-black text-white uppercase tracking-tight">YENİ ${label} KAYDI</h3>
            <button onclick="closeModal()" class="text-on-surface-variant hover:text-white"><i class="bi bi-x-lg text-xl"></i></button>
        </div>
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ad</label>
                    <input id="u-ad" type="text" class="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-accent">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Soyad</label>
                    <input id="u-soyad" type="text" class="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-accent">
                </div>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">E-Posta Adresi</label>
                <input id="u-email" type="email" class="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-accent">
            </div>
            <div>
                <label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Geçici Şifre</label>
                <input id="u-sifre" type="password" placeholder="Varsayılan: 123456" class="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-accent">
            </div>
            <button onclick="submitAddUser('${role}')" class="w-full bg-accent text-black font-black py-4 rounded-xl uppercase tracking-widest hover:scale-[0.98] transition-transform mt-4">
                KAYDI TAMAMLA
            </button>
        </div>`);
};

window.submitAddUser = async function (role) {
    const body = {
        ad: document.getElementById('u-ad').value,
        soyad: document.getElementById('u-soyad').value,
        email: document.getElementById('u-email').value,
        sifre: document.getElementById('u-sifre').value || '123456',
    };
    if (!body.ad || !body.email) { toast('Lütfen gerekli alanları doldurun.', 'error'); return; }
    try {
        await apiFetch(`users.php?role=${role}`, { method: 'POST', body: JSON.stringify(body) });
        closeModal();
        toast('Yeni Kayıt Oluşturuldu!');
        loadSection(role === 'egitmen' ? 'staff' : 'members');
    } catch (e) { toast(e.message, 'error'); }
};

window.logout = function () { localStorage.clear(); redirect('../pages/giris.html'); };

/* ════════════════════════════════════════
   BAŞLANGIÇ
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('user');
    if (!raw) { redirect('../pages/giris.html'); return; }
    const user = JSON.parse(raw);
    if (user.rol !== 'admin') { redirect('../pages/giris.html'); return; }

    const name = user.ad || 'Admin';
    document.getElementById('admin-name').textContent = name;
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-avatar').textContent = name[0].toUpperCase();
    loadSection('dashboard');
});