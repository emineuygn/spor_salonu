/**
 * FIT GYM CLUB — Admin Panel v8.0 (Bootstrap 5)
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
    if (text.trim().startsWith('<')) throw new Error('Sunucu HTML döndürdü — PHP hatasını konsola bakın.');

    try { return JSON.parse(text); }
    catch (e) { throw new Error('JSON parse hatası: ' + e.message); }
}

function redirect(url) { window.location.href = url; }

/* ════════════════════════════════════════
   TOAST (Bootstrap 5)
════════════════════════════════════════ */
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const typeClass = type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info';

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast admin-toast ${typeClass} show mb-2" role="alert">
            <div class="d-flex align-items-center justify-content-between p-3">
                <span>${msg}</span>
                <button type="button" class="btn-close btn-close-white btn-sm ms-3" onclick="this.closest('.toast').remove()"></button>
            </div>
        </div>`);

    setTimeout(() => document.getElementById(id)?.remove(), 3500);
}

/* ════════════════════════════════════════
   MODAL (Bootstrap 5)
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
    dashboard: 'Dashboard', members: 'Üyeler', staff: 'Eğitmenler',
    packages: 'Paketler', classes: 'Dersler', logs: 'Loglar',
};

window.loadSection = async function (section) {
    const area  = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + section)?.classList.add('active');
    if (title) title.textContent = SECTION_LABELS[section] || section;

    area.innerHTML = `<div class="d-flex align-items-center justify-content-center" style="height:300px">
        <div class="spinner-border spinner-border-sm text-secondary me-2"></div>
        <span class="text-muted">Yükleniyor...</span>
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
        area.innerHTML = `<div class="alert" style="background:#1a0202;border-color:#3a0808;color:#f87171">
            <i class="bi bi-exclamation-circle me-2"></i>${e.message}
        </div>`;
    }
};

function extractData(result, section) {
    if (!result?.data) return result;
    const d = result.data;
    if (Array.isArray(d?.data))    return d.data;
    if (Array.isArray(d?.classes)) return d.classes;
    if (Array.isArray(d?.logs))    return d.logs;
    if (Array.isArray(d))          return d;
    return d;
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
function renderDashboard(d) {
    const recentHtml = (d?.recent_sales ?? []).length
        ? d.recent_sales.map(s => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:#1f1f1f!important">
                <div>
                    <div class="fw-semibold" style="color:#e4e4e7;font-size:.875rem">${s.ad} ${s.soyad}</div>
                    <div style="color:#52525b;font-size:.75rem">${s.paket_adi} · ${s.odeme_tarihi?.slice(0,10) ?? ''}</div>
                </div>
                <div class="fw-black" style="color:var(--lime);font-size:.875rem">${Number(s.tutar ?? 0).toLocaleString('tr-TR')} ₺</div>
            </div>`).join('')
        : '<p class="text-muted fst-italic small">Henüz satış yok.</p>';

    document.getElementById('dynamic-content').innerHTML = `
        <div class="row g-3 mb-4">
            ${statCard('Toplam Üye',      d?.total_members  ?? 0,  'bi-people')}
            ${statCard('Toplam Gelir',    (Number(d?.total_revenue ?? 0)).toLocaleString('tr-TR') + ' ₺', 'bi-credit-card')}
            ${statCard('Bu Ay Yeni Üye', d?.new_this_month ?? 0,  'bi-person-plus')}
            ${statCard('Aktif Ders',      d?.active_slots   ?? 0,  'bi-activity')}
        </div>

        <div class="row g-3">
            <div class="col-lg-8">
                <div class="section-container p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0 text-uppercase fw-bold" style="color:var(--muted);font-size:.65rem;letter-spacing:.1em">Son Satışlar</h6>
                        <button class="btn-outline-muted btn-sm" onclick="loadSection('packages')">Tümünü Gör →</button>
                    </div>
                    ${recentHtml}
                </div>
            </div>
            <div class="col-lg-4">
                <div class="section-container p-4">
                    <h6 class="mb-3 text-uppercase fw-bold" style="color:var(--muted);font-size:.65rem;letter-spacing:.1em">Hızlı Erişim</h6>
                    <div class="d-grid gap-2">
                        ${quickCard('Üye Ekle',     'bi-person-plus',  "openAddUserModal('uye')")}
                        ${quickCard('Eğitmen Ekle', 'bi-person-badge', "openAddUserModal('egitmen')")}
                        ${quickCard('Dersler',      'bi-activity',     "loadSection('classes')")}
                        ${quickCard('Loglar',       'bi-clock-history',"loadSection('logs')")}
                    </div>
                </div>
            </div>
        </div>`;
}

function statCard(label, value, icon) {
    return `
        <div class="col-6 col-xl-3">
            <div class="stat-card">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <i class="bi ${icon}" style="color:#3f3f46;font-size:1rem"></i>
                    <span class="stat-label">${label}</span>
                </div>
                <div class="stat-value">${value}</div>
            </div>
        </div>`;
}

function quickCard(label, icon, onclick) {
    return `<button class="quick-card" onclick="${onclick}">
        <i class="bi ${icon}" style="color:var(--lime);font-size:1rem"></i>${label}
    </button>`;
}

/* ════════════════════════════════════════
   ÜYELER & EĞİTMENLER
════════════════════════════════════════ */
function renderUsers(list, role) {
    const isStaff = role === 'egitmen';
    const area = document.getElementById('dynamic-content');

    const toolbar = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="search-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input class="search-input" id="user-search" type="text"
                    placeholder="${isStaff ? 'Eğitmen ara...' : 'Üye ara...'}"
                    oninput="filterUserTable(this.value)">
            </div>
            <button class="btn-lime" onclick="openAddUserModal('${role}')">
                <i class="bi bi-plus-lg"></i>${isStaff ? 'Eğitmen Ekle' : 'Üye Ekle'}
            </button>
        </div>`;

    if (!list?.length) {
        area.innerHTML = toolbar + emptyState(isStaff ? 'Eğitmen bulunamadı.' : 'Üye bulunamadı.');
        return;
    }

    const rows = list.map(u => `
        <tr class="user-row" data-name="${(u.ad+' '+u.soyad+' '+u.email).toLowerCase()}">
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="admin-avatar" style="width:32px;height:32px;font-size:.75rem;border-radius:8px">
                        ${(u.ad||'?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div class="fw-semibold" style="color:#e4e4e7;font-size:.8125rem">${u.ad} ${u.soyad}</div>
                        <div style="color:#52525b;font-size:.7rem">${u.email}</div>
                    </div>
                </div>
            </td>
            <td>${u.telefon || '<span style="color:#3f3f46">—</span>'}</td>
            <td><span class="badge-${u.uyelik_tipi === 'premium' ? 'blue' : u.uyelik_tipi === 'standart' ? 'yellow' : 'gray'}">${u.uyelik_tipi || '—'}</span></td>
            <td style="color:#52525b;font-size:.75rem">${u.kayit_tarihi?.slice(0,10) ?? '—'}</td>
            <td>
                <button class="btn-outline-danger" onclick="deleteItem('users.php?role=${role}', ${u.uye_id}, '${isStaff ? 'staff' : 'members'}')">
                    <i class="bi bi-trash"></i> Sil
                </button>
            </td>
        </tr>`).join('');

    area.innerHTML = toolbar + `
        <div class="section-container">
            <div class="table-wrapper">
                <table class="data-table" id="user-table">
                    <thead><tr>
                        <th>Kullanıcı</th><th>Telefon</th><th>Üyelik</th><th>Kayıt</th><th>İşlem</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        <p style="color:#3f3f46;font-size:.75rem" class="mt-2 px-1">${list.length} kayıt</p>`;
}

window.filterUserTable = function (q) {
    document.querySelectorAll('.user-row').forEach(row => {
        row.style.display = row.dataset.name?.includes(q.toLowerCase()) ? '' : 'none';
    });
};

/* ════════════════════════════════════════
   PAKETLER
════════════════════════════════════════ */
function renderPackages(list) {
    const area = document.getElementById('dynamic-content');
    if (!list?.length) { area.innerHTML = emptyState('Paket satışı bulunamadı.'); return; }

    const rows = list.map(p => `
        <tr>
            <td style="color:#52525b;font-size:.75rem;font-family:monospace">#${p.satis_id}</td>
            <td style="color:#e4e4e7;font-size:.8125rem">${p.ad ?? ''} ${p.soyad ?? ''}</td>
            <td><span class="badge-blue">${p.paket_adi}</span></td>
            <td class="fw-black" style="color:var(--lime)">${Number(p.tutar||0).toLocaleString('tr-TR')} ₺</td>
            <td style="color:#52525b;font-size:.75rem">${p.odeme_tarihi?.slice(0,10) ?? '—'}</td>
        </tr>`).join('');

    area.innerHTML = `
        <div class="section-container">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>#</th><th>Üye</th><th>Paket</th><th>Tutar</th><th>Tarih</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

/* ════════════════════════════════════════
   DERSLER
════════════════════════════════════════ */
function renderClasses(list) {
    const area = document.getElementById('dynamic-content');
    if (!list?.length) { area.innerHTML = emptyState('Ders kaydı bulunamadı.'); return; }

    const rows = list.map(s => {
        const kayitli = (s.max_kapasite - s.mevcut_kapasite);
        const pct = s.max_kapasite > 0 ? Math.round((kayitli / s.max_kapasite) * 100) : 0;
        const cls = pct >= 100 ? 'cap-full' : pct >= 75 ? 'cap-high' : pct >= 40 ? 'cap-mid' : 'cap-low';
        return `
            <tr>
                <td class="fw-semibold" style="color:#e4e4e7">${s.hizmet_adi}</td>
                <td style="color:#a1a1aa">${s.tarih}</td>
                <td style="color:#a1a1aa">${s.baslangic_saati?.slice(0,5)} – ${s.bitis_saati?.slice(0,5)}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="cap-bar"><div class="cap-fill ${cls}" style="width:${pct}%"></div></div>
                        <span style="color:#52525b;font-size:.75rem">${kayitli}/${s.max_kapasite}</span>
                    </div>
                </td>
                <td>${s.mevcut_kapasite === 0 ? '<span class="badge-red">Dolu</span>' : `<span class="badge-green">${s.mevcut_kapasite} boş</span>`}</td>
                <td>
                    <button class="btn-outline-danger" onclick="deleteItem('classes.php', ${s.slot_id}, 'classes')">
                        <i class="bi bi-trash"></i> Sil
                    </button>
                </td>
            </tr>`;
    }).join('');

    area.innerHTML = `
        <div class="section-container">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Ders</th><th>Tarih</th><th>Saat</th><th>Doluluk</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

/* ════════════════════════════════════════
   LOGLAR
════════════════════════════════════════ */
function renderLogs(list) {
    const area = document.getElementById('dynamic-content');
    if (!list?.length) { area.innerHTML = emptyState('Log kaydı bulunamadı.'); return; }

    const rows = list.map(l => `
        <tr>
            <td style="color:#52525b;font-size:.75rem;font-family:monospace">#${l.log_id}</td>
            <td style="color:#e4e4e7;font-size:.8125rem">${l.islem}</td>
            <td style="color:#a1a1aa">${l.admin_isim}</td>
            <td style="color:#52525b;font-size:.75rem">${l.tarih?.slice(0,19).replace('T',' ') ?? '—'}</td>
        </tr>`).join('');

    area.innerHTML = `
        <div class="section-container">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>#</th><th>İşlem</th><th>Admin</th><th>Tarih</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

/* ════════════════════════════════════════
   SİLME
════════════════════════════════════════ */
window.deleteItem = async function (endpoint, id, section) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
        const sep = endpoint.includes('?') ? '&' : '?';
        await apiFetch(`${endpoint}${sep}id=${id}`, { method: 'DELETE' });
        toast('Kayıt silindi.');
        loadSection(section);
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   KULLANICI EKLEME MODALİ
════════════════════════════════════════ */
window.openAddUserModal = function (role) {
    const label   = role === 'egitmen' ? 'Eğitmen' : 'Üye';
    const section = role === 'egitmen' ? 'staff' : 'members';

    showModal(`
        <div class="d-flex justify-content-between align-items-start mb-4">
            <div>
                <h5 class="mb-0 fw-black" style="color:#fff">Yeni ${label} Ekle</h5>
                <p class="mb-0 mt-1" style="color:#52525b;font-size:.75rem">Tüm alanları doldurun</p>
            </div>
            <button type="button" class="btn-close btn-close-white" onclick="closeModal()"></button>
        </div>

        <div class="row g-3 mb-3">
            <div class="col-6">
                <label class="form-label-admin">Ad</label>
                <input id="u-ad" type="text" class="form-control-admin" placeholder="Ad">
            </div>
            <div class="col-6">
                <label class="form-label-admin">Soyad</label>
                <input id="u-soyad" type="text" class="form-control-admin" placeholder="Soyad">
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label-admin">E-posta</label>
            <input id="u-email" type="email" class="form-control-admin" placeholder="ornek@email.com">
        </div>
        <div class="mb-4">
            <label class="form-label-admin">Şifre <span style="color:#3f3f46;font-size:.65rem;text-transform:none">(boş bırakılırsa: 123456)</span></label>
            <input id="u-sifre" type="password" class="form-control-admin" placeholder="••••••••">
        </div>

        <div class="d-flex gap-2">
            <button onclick="closeModal()" class="btn-outline-muted flex-grow-1">İptal</button>
            <button onclick="submitAddUser('${role}','${section}')" class="btn-lime flex-grow-1 justify-content-center">
                <i class="bi bi-plus-lg"></i> Ekle
            </button>
        </div>`);
};

window.submitAddUser = async function (role, section) {
    const body = {
        ad:    document.getElementById('u-ad').value.trim(),
        soyad: document.getElementById('u-soyad').value.trim(),
        email: document.getElementById('u-email').value.trim(),
        sifre: document.getElementById('u-sifre').value || '123456',
    };
    if (!body.ad || !body.email) { toast('Ad ve e-posta zorunludur.', 'error'); return; }

    try {
        await apiFetch(`users.php?role=${role}`, { method: 'POST', body: JSON.stringify(body) });
        closeModal();
        toast('Kullanıcı eklendi!');
        loadSection(section);
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   YARDIMCILAR
════════════════════════════════════════ */
function emptyState(msg) {
    return `<div class="d-flex flex-column align-items-center justify-content-center py-5" style="color:#27272a">
        <i class="bi bi-inbox" style="font-size:2.5rem"></i>
        <p class="mt-2 fst-italic small">${msg}</p>
    </div>`;
}

window.logout = function () { localStorage.clear(); redirect('../pages/giris.html'); };

/* ════════════════════════════════════════
   BAŞLANGIÇ
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('user');
    if (!raw) { redirect('../pages/giris.html'); return; }

    try {
        const user = JSON.parse(raw);
        if (user.rol !== 'admin') { alert('Yetkisiz erişim.'); redirect('../pages/giris.html'); return; }

        const name = user.ad || 'Admin';
        document.getElementById('admin-name').textContent   = name;
        document.getElementById('sidebar-name').textContent = name;
        document.getElementById('sidebar-avatar').textContent = name[0].toUpperCase();
    } catch (_) { redirect('../pages/giris.html'); return; }

    loadSection('dashboard');
});