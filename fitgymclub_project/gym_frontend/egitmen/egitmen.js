/**
 * FIT GYM CLUB — Eğitmen Paneli v5.0 (Bootstrap 5)
 */
'use strict';

const API = '../../gym_backend/api/trainer/trainer.php';

let searchTimer = null;
let allServices = [];
let bsModal     = null;

/* ════════════════════════════════════════
   API
════════════════════════════════════════ */
async function apiFetch(url, opts = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...opts,
    });
    if (res.status === 401) { localStorage.clear(); redirect('../pages/giris.html'); throw new Error('Oturum süresi doldu.'); }
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('Sunucu HTML döndürdü.');
    try { return JSON.parse(text); }
    catch (e) { throw new Error('JSON parse hatası: ' + e.message); }
}

function redirect(url) { window.location.href = url; }

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const cls = type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info';
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast trainer-toast ${cls} show mb-2" role="alert">
            <div class="d-flex align-items-center justify-content-between p-3">
                <span>${msg}</span>
                <button type="button" class="btn-close btn-close-white btn-sm ms-3" onclick="this.closest('.toast').remove()"></button>
            </div>
        </div>`);
    setTimeout(() => document.getElementById(id)?.remove(), 3500);
}

/* ════════════════════════════════════════
   MODAL
════════════════════════════════════════ */
function showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    if (!bsModal) bsModal = new bootstrap.Modal(document.getElementById('trainerModal'));
    bsModal.show();
}

window.closeModal = function () { bsModal?.hide(); };

/* ════════════════════════════════════════
   ROUTER
════════════════════════════════════════ */
const LABELS = {
    'dashboard':  'Genel Bakış',
    'my-classes': 'Derslerim',
    'students':   'Öğrencilerim',
    'approvals':  'Onay Bekleyenler',
    'schedule':   'Haftalık Takvim',
};

window.loadSection = async function (section) {
    document.querySelectorAll('.tnav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + section)?.classList.add('active');

    const title   = document.getElementById('section-title');
    const toolbar = document.getElementById('toolbar');
    if (title)   title.textContent = LABELS[section] || section;
    if (toolbar) {
        toolbar.className = section === 'my-classes'
            ? 'd-flex align-items-center gap-2'
            : 'd-none d-flex align-items-center gap-2';
    }

    const area = document.getElementById('dynamic-content');
    area.innerHTML = `<div class="d-flex align-items-center justify-content-center" style="height:300px">
        <div class="spinner-border spinner-border-sm text-secondary me-2"></div>
        <span class="text-muted">Yükleniyor...</span>
    </div>`;

    if (section === 'dashboard')  await renderDashboard();
    if (section === 'my-classes') await loadMyClasses();
    if (section === 'students')   await renderStudents();
    if (section === 'approvals')  await renderApprovals();
    if (section === 'schedule')   await loadSchedule();
};

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
async function renderDashboard() {
    const area = document.getElementById('dynamic-content');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const name = user.ad || 'Eğitmen';
    const surname = user.soyad || '';
    const fullName = `${name} ${surname}`.trim();

    const lowerName = (name || '').toLowerCase();

    let trainerPhoto = '../assets/img/default.webp';

    if (lowerName.includes('ahmet')) {
       trainerPhoto = '../assets/img/ahmet.webp';
    }

    if (lowerName.includes('ayse')) {
    trainerPhoto = '../assets/img/ayse.webp';
    }
       
    try {
        const result  = await apiFetch(`${API}?action=my_classes`);
        const classes = result?.data?.classes ?? [];

        const today      = new Date().toISOString().split('T')[0];
        const weekEnd    = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        const bugun          = classes.filter(c => c.tarih === today);
        const gelecek        = classes.filter(c => c.tarih > today);
        const bugunVeGelecek = classes.filter(c => c.tarih >= today && c.tarih <= weekEndStr).length;

        const toplamUye = classes.reduce((s, c) => {
            return s + ((c.max_kapasite || 0) - (c.mevcut_kapasite ?? c.max_kapasite ?? 0));
        }, 0);

        const upcoming = [...bugun, ...gelecek].slice(0, 4);

        let pendingCount = 0;

        try {
            const memberRequests = classes.map(c =>
                apiFetch(`${API}?action=class_members&slot_id=${c.slot_id}`).catch(() => null)
            );

            const memberResults = await Promise.all(memberRequests);

            memberResults.forEach(r => {
                if (r?.data?.members) {
                    pendingCount += r.data.members.filter(m => m.durum === 'beklemede').length;
                }
            });
        } catch (_) {}

        updateTodayCount(bugun.length);

        let upcomingHtml = '';

        if (upcoming.length) {
            upcoming.forEach(c => {
                const kayitli = (c.max_kapasite || 0) - (c.mevcut_kapasite ?? c.max_kapasite ?? 0);
                const pct     = c.max_kapasite > 0 ? Math.round((kayitli / c.max_kapasite) * 100) : 0;
                const capCls  = pct >= 100 ? 'cap-full' : pct >= 75 ? 'cap-high' : pct >= 40 ? 'cap-mid' : 'cap-low';
                const isToday = c.tarih === today;
                const dersAdi = c.hizmet_adi.replace(/'/g, "\\'");

                upcomingHtml += `
                    <div class="section-box p-3 mb-2"
                         style="cursor:pointer;transition:all .25s;${isToday ? 'border-color:rgba(188,255,0,0.2)' : ''}"
                         onclick="openMembersModal(${c.slot_id},'${dersAdi}')">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width:3px;height:50px;background:linear-gradient(180deg,var(--lime),transparent);border-radius:2px;flex-shrink:0"></div>

                            <div class="flex-grow-1">
                                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:3px">
                                    <span style="color:#e4e4e7;font-size:.9rem;font-weight:700">${c.hizmet_adi}</span>
                                    ${isToday ? '<span class="badge-lime">Bugün</span>' : ''}
                                </div>

                                <div style="color:var(--laurel);font-size:.7rem">
                                    ${formatDate(c.tarih)} · ${c.baslangic_saati?.slice(0,5)} – ${c.bitis_saati?.slice(0,5)}
                                </div>

                                <div style="margin-top:6px;display:flex;align-items:center;gap:.5rem">
                                    <div class="cap-bar">
                                        <div class="cap-fill ${capCls}" style="width:${pct}%"></div>
                                    </div>
                                    <span style="color:var(--laurel);font-size:.65rem">${kayitli}/${c.max_kapasite} kayıtlı</span>
                                </div>
                            </div>

                            <div style="text-align:right;flex-shrink:0">
                                <div style="color:var(--lime);font-size:1.5rem;font-weight:900;line-height:1">${kayitli}</div>
                                <div style="color:var(--laurel);font-size:.55rem;text-transform:uppercase;letter-spacing:.05em">üye</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            upcomingHtml = `
                <div class="section-box p-4 text-center" style="border-style:dashed">
                    <i class="bi bi-calendar-x" style="font-size:2rem;color:var(--laurel)"></i>
                    <p style="color:var(--laurel);font-size:.875rem;margin:.75rem 0 0;font-style:italic">
                        Yaklaşan ders yok
                    </p>
                </div>
            `;
        }

        const tarihStr = new Date().toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        area.innerHTML = `
            <!-- EĞİTMEN KARŞILAMA ALANI -->
            <section class="trainer-hero mb-4">
                <div class="trainer-hero-inner">

                    <div class="trainer-hero-image-wrap">
                        <img
                            class="trainer-hero-image"
                            src="${trainerPhoto}"
                            alt="${fullName}"
                            onerror="this.src='https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=80'"
                        >

                        <div class="trainer-branch-badge">
                            EĞİTMEN
                        </div>
                    </div>

                    <div class="trainer-hero-info">
                        <span class="trainer-hero-small">
                            ${tarihStr}
                        </span>

                        <h2 class="trainer-hero-name">
                            ${fullName}
                        </h2>

                        <p class="trainer-hero-desc">
                            Bugünkü derslerini ve öğrencilerini yönet.
                        </p>

                        <div class="trainer-hero-actions">
                            <button class="btn-lime" onclick="loadSection('my-classes')">
                                <i class="bi bi-activity"></i>
                                Derslerimi Gör
                            </button>

                            <button class="btn-outline-muted" onclick="loadSection('approvals')">
                                <i class="bi bi-check-circle"></i>
                                Onay Bekleyenler
                            </button>
                        </div>
                    </div>

                </div>
            </section>

            <!-- İSTATİSTİK KARTLARI -->
            <div class="row g-3 mb-5">
                <div class="col-md-4">
                    ${dashCard('Toplam Ders', classes.length, 'bi-activity', 'lime', 'Tüm programlı dersler', "loadSection('my-classes')")}
                </div>

                <div class="col-md-4">
                    ${dashCard('Bugünkü Dersler', bugun.length, 'bi-calendar-check', bugun.length > 0 ? 'lime' : 'muted', 'Bugün yapılacak', "loadSection('my-classes')")}
                </div>

                <div class="col-md-4">
                    ${dashCard('Kayıtlı Üye', toplamUye, 'bi-people', 'lime', 'Derslerde toplam kayıt', "loadSection('students')")}
                </div>

                <div class="col-md-4">
                    ${dashCard('Bu Hafta', bugunVeGelecek, 'bi-calendar-week', 'muted', 'Haftalık ders sayısı', "loadSection('schedule')")}
                </div>

                <div class="col-md-4">
                    ${dashCard('Yaklaşan', gelecek.length, 'bi-arrow-right-circle', 'muted', 'Gelecek günlerde', "loadSection('my-classes')")}
                </div>

                <div class="col-md-4">
                    ${dashCard('Onay Bekleyen', pendingCount, 'bi-clock-history', pendingCount > 0 ? 'orange' : 'muted', 'Rezervasyon onayı', "loadSection('approvals')")}
                </div>
            </div>

            <!-- ALT BÖLÜM -->
            <div class="row g-4">
                <div class="col-lg-7">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
                        <div>
                            <div style="color:var(--laurel);font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.15em;display:flex;align-items:center;gap:.4rem">
                                <i class="bi bi-calendar-event" style="color:var(--lime)"></i>
                                Yaklaşan Dersler
                            </div>
                            <div style="height:2px;width:28px;background:linear-gradient(90deg,var(--lime),transparent);margin-top:5px;border-radius:1px"></div>
                        </div>

                        <button class="btn-outline-muted" style="font-size:.7rem" onclick="loadSection('my-classes')">
                            Tümünü Gör <i class="bi bi-arrow-right ms-1"></i>
                        </button>
                    </div>

                    ${upcomingHtml}
                </div>

                <div class="col-lg-5">
                    <div style="margin-bottom:1.25rem">
                        <div style="color:var(--laurel);font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.15em;display:flex;align-items:center;gap:.4rem">
                            <i class="bi bi-lightning-charge-fill" style="color:var(--lime)"></i>
                            Hızlı Erişim
                        </div>
                        <div style="height:2px;width:28px;background:linear-gradient(90deg,var(--lime),transparent);margin-top:5px;border-radius:1px"></div>
                    </div>

                    <div class="d-grid gap-2">
                        ${quickCard('Yeni Ders Ekle', 'bi-plus-circle', 'openAddClassModal()')}
                        ${quickCard('Öğrencilerim', 'bi-people', "loadSection('students')")}
                        ${quickCard('Onay Bekleyenler', 'bi-check-circle', "loadSection('approvals')")}
                        ${quickCard('Haftalık Takvim', 'bi-calendar3', "loadSection('schedule')")}
                        ${quickCard('Derslerimi Gör', 'bi-activity', "loadSection('my-classes')")}
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        area.innerHTML = errorBox(e.message);
    }
}
/* ════════════════════════════════════════
   YARDIMCI FONKSİYONLAR
════════════════════════════════════════ */
function dashCard(label, val, icon, color, sub, onclick) {
    const colors = {
        lime:   { num: 'var(--lime)', shadow: '0 0 20px rgba(195,244,0,0.25)',  border: 'rgba(195,244,0,0.15)',  bg: 'rgba(195,244,0,0.04)'  },
        orange: { num: '#f97316',     shadow: '0 0 20px rgba(249,115,22,0.25)', border: 'rgba(249,115,22,0.2)',  bg: 'rgba(249,115,22,0.04)' },
        muted:  { num: '#a1a1aa',     shadow: 'none',                           border: '#1f1f1f',               bg: 'var(--card)'           },
    };
    const c = colors[color] || colors.muted;
    const cursor = onclick ? 'cursor:pointer' : '';
    const clickAttr = onclick ? `onclick="${onclick}"` : '';
    return `
    <div style="background:${c.bg};border:1px solid ${c.border};border-radius:1rem;padding:1.5rem;
                position:relative;overflow:hidden;transition:all .25s;${cursor}"
         ${clickAttr}
         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,.5)'"
         onmouseout="this.style.transform='';this.style.boxShadow='none'">
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${c.border},transparent)"></div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.875rem">
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:.625rem;
                        width:38px;height:38px;display:flex;align-items:center;justify-content:center">
                <i class="bi ${icon}" style="color:${c.num};font-size:1rem;filter:drop-shadow(0 0 4px ${c.num})"></i>
            </div>
            <div style="color:#52525b;font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;text-align:right;line-height:1.4">${label}</div>
        </div>
        <div style="font-size:2.5rem;font-weight:900;color:${c.num};line-height:1;letter-spacing:-2px;text-shadow:${c.shadow}">${val}</div>
        <div style="color:#52525b;font-size:.7rem;margin-top:.5rem;font-weight:500">${sub}</div>
    </div>`;
}


function miniStat(label, val, icon) {
    return `
        <div class="mini-stat">
            <i class="bi ${icon}" style="color:var(--lime);font-size:1.1rem;display:block;margin-bottom:.35rem;filter:drop-shadow(0 0 4px rgba(195,244,0,0.5))"></i>
            <div class="mini-stat-val">${val}</div>
            <div class="mini-stat-label">${label}</div>
        </div>`;
}

function quickCard(label, icon, onclick) {
    return `<button class="quick-card" onclick="${onclick}">
        <i class="bi ${icon}" style="color:var(--lime);font-size:1rem;filter:drop-shadow(0 0 4px rgba(195,244,0,0.4))"></i>${label}
    </button>`;
}

/* ════════════════════════════════════════
   DERSLERİM
════════════════════════════════════════ */
window.loadMyClasses = async function () {
    const area   = document.getElementById('dynamic-content');
    const search = document.getElementById('search-input')?.value ?? '';
    const tarih  = document.getElementById('date-filter')?.value  ?? '';

    const params = new URLSearchParams({ action: 'my_classes' });
    if (search) params.set('search', search);
    if (tarih)  params.set('tarih', tarih);

    try {
        const result  = await apiFetch(`${API}?${params}`);
        const classes = result?.data?.classes ?? [];
        updateTodayCount(classes.filter(c => c.tarih === new Date().toISOString().split('T')[0]).length);
        renderClassTable(classes);
    } catch (e) { area.innerHTML = errorBox(e.message); }
};

function renderClassTable(classes) {
    const area = document.getElementById('dynamic-content');

    const toolbar = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <p style="color:var(--muted);font-size:.75rem" class="mb-0">${classes.length} ders</p>
            <button class="btn-lime" onclick="openAddClassModal()">
                <i class="bi bi-plus-lg"></i> Ders Ekle
            </button>
        </div>`;

    if (!classes.length) {
        area.innerHTML = toolbar + emptyState('Henüz ders eklemediniz.');
        return;
    }

    const rows = classes.map(c => {
        const kayitli = (c.max_kapasite||0) - (c.mevcut_kapasite ?? c.max_kapasite ?? 0);
        const pct     = c.max_kapasite > 0 ? Math.round((kayitli / c.max_kapasite) * 100) : 0;
        const capCls  = pct >= 100 ? 'cap-full' : pct >= 75 ? 'cap-high' : pct >= 40 ? 'cap-mid' : 'cap-low';
        const dersAdi = c.hizmet_adi.replace(/'/g, "\\'");

        return `
            <tr>
                <td>
                    <div class="fw-semibold" style="color:#e4e4e7;font-size:.8125rem">${c.hizmet_adi}</div>
                    <div style="color:#52525b;font-size:.7rem">${formatDate(c.tarih)}</div>
                </td>
                <td style="color:#a1a1aa">${c.baslangic_saati?.slice(0,5)} – ${c.bitis_saati?.slice(0,5)}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="cap-bar"><div class="cap-fill ${capCls}" style="width:${pct}%"></div></div>
                        <span style="color:#52525b;font-size:.7rem">${kayitli}/${c.max_kapasite}</span>
                    </div>
                </td>
                <td>${c.mevcut_kapasite === 0 ? '<span class="badge-red">Dolu</span>' : `<span class="badge-green">${c.mevcut_kapasite} boş</span>`}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn-outline-lime" onclick="openMembersModal(${c.slot_id},'${dersAdi}')">
                            <i class="bi bi-people"></i> Üyeler
                        </button>
                        <button class="btn-outline-lime" onclick="openEditModal(${c.slot_id},${c.max_kapasite},'${c.baslangic_saati}','${c.bitis_saati}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-outline-danger" onclick="deleteClass(${c.slot_id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    area.innerHTML = toolbar + `
        <div class="section-box">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Ders</th><th>Saat</th><th>Doluluk</th><th>Durum</th><th>İşlemler</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

/* ════════════════════════════════════════
   ÖĞRENCİLERİM
════════════════════════════════════════ */
async function renderStudents() {
    const area = document.getElementById('dynamic-content');
    try {
        const result  = await apiFetch(`${API}?action=my_classes`);
        const classes = result?.data?.classes ?? [];
        if (!classes.length) { area.innerHTML = emptyState('Henüz dersiniz yok.'); return; }

        const allMembers = [];
        for (const c of classes) {
            try {
                const r = await apiFetch(`${API}?action=class_members&slot_id=${c.slot_id}`);
                (r?.data?.members ?? []).forEach(m => {
                    if (!allMembers.find(x => x.uye_id === m.uye_id))
                        allMembers.push({ ...m, ders: c.hizmet_adi });
                });
            } catch (_) {}
        }

        if (!allMembers.length) { area.innerHTML = emptyState('Henüz kayıtlı öğrenci yok.'); return; }

        const rows = allMembers.map(m => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="trainer-avatar" style="width:30px;height:30px;font-size:.75rem;border-radius:6px">
                            ${(m.ad||'?')[0].toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold" style="color:#e4e4e7;font-size:.8125rem">${m.ad} ${m.soyad}</div>
                            <div style="color:#52525b;font-size:.7rem">${m.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge-lime">${m.ders}</span></td>
                <td><span class="${m.durum === 'onaylandi' ? 'badge-green' : m.durum === 'iptal' ? 'badge-red' : 'badge-yellow'}">${m.durum}</span></td>
                <td style="color:#52525b;font-size:.7rem">${m.rezervasyon_tarihi?.slice(0,10) ?? '—'}</td>
            </tr>`).join('');

        area.innerHTML = `
            <p style="color:var(--muted);font-size:.75rem" class="mb-3">${allMembers.length} kayıtlı öğrenci</p>
            <div class="section-box">
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Öğrenci</th><th>Ders</th><th>Durum</th><th>Tarih</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    } catch (e) { area.innerHTML = errorBox(e.message); }
}

/* ════════════════════════════════════════
   ONAY BEKLEYENLEr
════════════════════════════════════════ */
async function renderApprovals() {
    const area = document.getElementById('dynamic-content');
    try {
        const result  = await apiFetch(`${API}?action=my_classes`);
        const classes = result?.data?.classes ?? [];
        const pending = [];

        for (const c of classes) {
            try {
                const r = await apiFetch(`${API}?action=class_members&slot_id=${c.slot_id}`);
                (r?.data?.members ?? [])
                    .filter(m => m.durum === 'beklemede')
                    .forEach(m => pending.push({ ...m, slot_id: c.slot_id, ders: c.hizmet_adi, tarih: c.tarih }));
            } catch (_) {}
        }

        const badge = document.getElementById('approval-badge');
        if (badge) {
            badge.textContent = pending.length;
            badge.className = pending.length > 0 ? 'badge-approval ms-auto' : 'badge-approval ms-auto d-none';
        }

        if (!pending.length) {
            area.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center py-5" style="color:#27272a">
                <i class="bi bi-check-circle" style="font-size:2.5rem;color:var(--lime);opacity:.4"></i>
                <p class="mt-2 fst-italic small text-muted">Onay bekleyen rezervasyon yok.</p>
            </div>`;
            return;
        }

        const rows = pending.map(m => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="trainer-avatar" style="width:30px;height:30px;font-size:.75rem;border-radius:6px">
                            ${(m.ad||'?')[0].toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold" style="color:#e4e4e7;font-size:.8125rem">${m.ad} ${m.soyad}</div>
                            <div style="color:#52525b;font-size:.7rem">${m.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge-lime">${m.ders}</span></td>
                <td style="color:#a1a1aa;font-size:.75rem">${formatDate(m.tarih)}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn-lime" style="font-size:.7rem" onclick="approveReservation(${m.rezervasyon_id}, 'onayla')">
                            <i class="bi bi-check-lg"></i> Onayla
                        </button>
                        <button class="btn-outline-danger" onclick="approveReservation(${m.rezervasyon_id}, 'iptal')">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        area.innerHTML = `
            <p style="color:var(--muted);font-size:.75rem" class="mb-3">${pending.length} onay bekliyor</p>
            <div class="section-box">
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Öğrenci</th><th>Ders</th><th>Tarih</th><th>İşlem</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    } catch (e) { area.innerHTML = errorBox(e.message); }
}

window.approveReservation = async function (rezId, islem) {
    if (!rezId) { toast('Rezervasyon ID bulunamadı.', 'error'); return; }
    try {
        await apiFetch(`${API}?action=update_reservation`, {
            method: 'PUT',
            body: JSON.stringify({ rezervasyon_id: rezId, islem })
        });
        toast(islem === 'onayla' ? 'Rezervasyon onaylandı!' : 'Rezervasyon reddedildi.', islem === 'onayla' ? 'success' : 'info');
        await renderApprovals();
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   ÜYELER MODALİ
════════════════════════════════════════ */
window.openMembersModal = async function (slotId, dersAdi) {
    showModal(`<div class="d-flex align-items-center gap-2 text-muted p-2"><div class="spinner-border spinner-border-sm me-2"></div>Yükleniyor...</div>`);
    try {
        const result  = await apiFetch(`${API}?action=class_members&slot_id=${slotId}`);
        const members = result?.data?.members ?? [];
        const slot    = result?.data?.slot    ?? {};

        const memberRows = members.length
            ? members.map(m => `
                <div class="member-row">
                    <div class="d-flex align-items-center gap-2">
                        <div class="trainer-avatar" style="width:30px;height:30px;font-size:.75rem;border-radius:6px">
                            ${(m.ad||'?')[0].toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold" style="color:#e4e4e7;font-size:.8125rem">${m.ad} ${m.soyad}</div>
                            <div style="color:#52525b;font-size:.7rem">${m.email}</div>
                        </div>
                    </div>
                    <span class="${m.durum === 'onaylandi' ? 'badge-green' : m.durum === 'iptal' ? 'badge-red' : 'badge-yellow'}">${m.durum}</span>
                </div>`).join('')
            : '<p class="text-muted fst-italic small text-center py-4">Bu derse kayıtlı üye yok.</p>';

        showModal(`
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h5 class="fw-black mb-0" style="color:#fff">${dersAdi}</h5>
                    <p class="mb-0 mt-1" style="color:#52525b;font-size:.75rem">
                        ${formatDate(slot.tarih)} · ${slot.baslangic_saati?.slice(0,5)} – ${slot.bitis_saati?.slice(0,5)}
                    </p>
                </div>
                <button class="btn-close btn-close-white" onclick="closeModal()"></button>
            </div>
            <div style="color:var(--muted);font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;font-weight:700" class="mb-2">
                ${members.length} kayıtlı üye
            </div>
            <div class="section-box" style="max-height:280px;overflow-y:auto">${memberRows}</div>
            <button onclick="closeModal()" class="btn-lime w-100 justify-content-center mt-3">Kapat</button>`);
    } catch (e) { showModal(errorBox(e.message)); }
};

/* ════════════════════════════════════════
   DERS EKLEME MODALİ
════════════════════════════════════════ */
window.openAddClassModal = async function () {
    if (!allServices.length) {
        try {
            const r = await apiFetch(`${API}?action=all_services`);
            allServices = r?.data?.services ?? [];
        } catch (_) {}
    }

    const opts = allServices.length
        ? allServices.map(s => `<option value="${s.hizmet_id}">${s.hizmet_adi}</option>`).join('')
        : '<option value="">Hizmet bulunamadı</option>';

    const today = new Date().toISOString().split('T')[0];

    showModal(`
        <div class="d-flex justify-content-between align-items-start mb-4">
            <div>
                <div style="color:var(--lime);font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.2em;margin-bottom:.35rem">
                    <i class="bi bi-plus-circle me-1"></i>YENİ DERS
                </div>
                <h5 class="fw-black mb-0" style="color:#fff;font-size:1.25rem;letter-spacing:-.03em">Ders Ekle</h5>
            </div>
            <button onclick="closeModal()" style="background:rgba(255,255,255,.05);border:1px solid #1f1f1f;color:#52525b;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .15s"
                onmouseover="this.style.background='rgba(239,68,68,.1)';this.style.color='#f87171'"
                onmouseout="this.style.background='rgba(255,255,255,.05)';this.style.color='#52525b'">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,var(--lime),transparent);opacity:.2;margin-bottom:1.5rem"></div>
        <div class="mb-3">
            <label class="form-label-trainer"><i class="bi bi-activity me-1" style="color:var(--lime)"></i>Ders / Hizmet</label>
            <select id="f-hizmet" class="form-control-trainer" style="cursor:pointer">
                <option value="">— Seçiniz —</option>${opts}
            </select>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-6">
                <label class="form-label-trainer"><i class="bi bi-calendar3 me-1" style="color:var(--lime)"></i>Tarih</label>
                <input type="date" id="f-tarih" class="form-control-trainer" min="${today}">
            </div>
            <div class="col-6">
                <label class="form-label-trainer"><i class="bi bi-people me-1" style="color:var(--lime)"></i>Max Kapasite</label>
                <input type="number" id="f-max" class="form-control-trainer" placeholder="20" min="1" max="100">
            </div>
        </div>
        <div class="row g-3 mb-4">
            <div class="col-6">
                <label class="form-label-trainer"><i class="bi bi-clock me-1" style="color:var(--lime)"></i>Başlangıç</label>
                <input type="time" id="f-baslangic" class="form-control-trainer">
            </div>
            <div class="col-6">
                <label class="form-label-trainer"><i class="bi bi-clock-history me-1" style="color:var(--lime)"></i>Bitiş</label>
                <input type="time" id="f-bitis" class="form-control-trainer">
            </div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);margin-bottom:1.25rem"></div>
        <div class="d-flex gap-2">
            <button onclick="closeModal()" class="btn-outline-muted flex-grow-1" style="justify-content:center">
                <i class="bi bi-x-lg me-1"></i>İptal
            </button>
            <button onclick="submitAddClass()" class="btn-lime flex-grow-1 justify-content-center" style="padding:.75rem">
                <i class="bi bi-check-lg me-1"></i>Dersi Ekle
            </button>
        </div>`);
};

window.submitAddClass = async function () {
    const body = {
        hizmet_id:       parseInt(document.getElementById('f-hizmet').value),
        tarih:           document.getElementById('f-tarih').value,
        baslangic_saati: document.getElementById('f-baslangic').value,
        bitis_saati:     document.getElementById('f-bitis').value,
        max_kapasite:    parseInt(document.getElementById('f-max').value),
    };
    if (!body.hizmet_id || !body.tarih || !body.baslangic_saati || !body.bitis_saati || !body.max_kapasite) {
        toast('Tüm alanları doldurun.', 'error'); return;
    }
    if (body.baslangic_saati >= body.bitis_saati) {
        toast('Bitiş saati başlangıçtan sonra olmalıdır.', 'error'); return;
    }
    try {
        await apiFetch(`${API}?action=add_class`, { method: 'POST', body: JSON.stringify(body) });
        closeModal(); toast('Ders eklendi!');
        await loadMyClasses();
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   DERS DÜZENLEME
════════════════════════════════════════ */
window.openEditModal = function (slotId, maxKap, baslangic, bitis) {
    showModal(`
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-black mb-0" style="color:#fff">Dersi Düzenle</h5>
            <button class="btn-close btn-close-white" onclick="closeModal()"></button>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-6">
                <label class="form-label-trainer">Başlangıç</label>
                <input type="time" id="e-baslangic" class="form-control-trainer" value="${baslangic?.slice(0,5)}">
            </div>
            <div class="col-6">
                <label class="form-label-trainer">Bitiş</label>
                <input type="time" id="e-bitis" class="form-control-trainer" value="${bitis?.slice(0,5)}">
            </div>
        </div>
        <div class="mb-4">
            <label class="form-label-trainer">Max Kapasite</label>
            <input type="number" id="e-max" class="form-control-trainer" value="${maxKap}" min="1" max="100">
        </div>
        <div class="d-flex gap-2">
            <button onclick="closeModal()" class="btn-outline-muted flex-grow-1">İptal</button>
            <button onclick="submitEdit(${slotId})" class="btn-lime flex-grow-1 justify-content-center">
                <i class="bi bi-floppy"></i> Kaydet
            </button>
        </div>`);
};

window.submitEdit = async function (slotId) {
    const body = {
        slot_id:         slotId,
        baslangic_saati: document.getElementById('e-baslangic').value,
        bitis_saati:     document.getElementById('e-bitis').value,
        max_kapasite:    parseInt(document.getElementById('e-max').value),
    };
    try {
        await apiFetch(`${API}?action=update_class`, { method: 'PUT', body: JSON.stringify(body) });
        closeModal(); toast('Ders güncellendi!');
        await loadMyClasses();
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   DERS SİLME
════════════════════════════════════════ */
window.deleteClass = async function (slotId) {
    if (!confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;
    try {
        await apiFetch(`${API}?action=delete_class&slot_id=${slotId}`, { method: 'DELETE' });
        toast('Ders silindi.');
        await loadMyClasses();
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
};

/* ════════════════════════════════════════
   TAKVİM
════════════════════════════════════════ */
async function loadSchedule() {
    const area = document.getElementById('dynamic-content');
    try {
        const result  = await apiFetch(`${API}?action=my_classes`);
        const classes = result?.data?.classes ?? [];
        renderSchedule(classes);
    } catch (e) { area.innerHTML = errorBox(e.message); }
}

function renderSchedule(classes) {
    const area  = document.getElementById('dynamic-content');
    const today = new Date();
    const mon   = new Date(today);
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const days     = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    const dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    const todayStr = today.toISOString().split('T')[0];

    const cols = days.map((day, i) => {
        const ds      = day.toISOString().split('T')[0];
        const slots   = classes.filter(c => c.tarih === ds);
        const isToday = ds === todayStr;

        const slotHtml = slots.length
            ? slots.map(s => {
                const dersAdi = s.hizmet_adi.replace(/'/g, "\\'");
                return `
                <div class="schedule-slot" onclick="openMembersModal(${s.slot_id},'${dersAdi}')">
                    <div class="schedule-slot-time">${s.baslangic_saati?.slice(0,5)}</div>
                    <div class="schedule-slot-name">${s.hizmet_adi}</div>
                </div>`;
            }).join('')
            : '<div style="color:#27272a;font-size:.65rem;font-style:italic;margin-top:.5rem">Boş</div>';

        return `
            <div class="week-day ${isToday ? 'is-today' : ''}">
                <div class="week-day-header">${dayNames[i]}</div>
                <div class="week-date">${day.getDate()}</div>
                ${slotHtml}
            </div>`;
    }).join('');

    const mon2 = mon.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const sun  = days[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    area.innerHTML = `
        <p class="text-muted small mb-3">${mon2} – ${sun}</p>
        <div class="week-grid">${cols}</div>`;
}

/* ════════════════════════════════════════
   GENEL YARDIMCILAR
════════════════════════════════════════ */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function errorBox(msg) {
    return `<div class="p-4 rounded-3" style="background:rgba(26,2,2,0.8);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:.875rem">
        <i class="bi bi-exclamation-triangle me-2" style="color:#ef4444"></i>${msg}
    </div>`;
}

function emptyState(msg) {
    return `<div class="d-flex flex-column align-items-center justify-content-center py-5" style="color:#1a1a1a">
        <i class="bi bi-inbox" style="font-size:3rem;color:#1f1f1f;filter:drop-shadow(0 0 8px rgba(195,244,0,0.1))"></i>
        <p class="mt-3 fst-italic small" style="color:#2a2a2a">${msg}</p>
    </div>`;
}

function updateTodayCount(count) {
    const el = document.getElementById('today-count');
    if (el) el.textContent = count > 0 ? `Bugün ${count} ders` : 'Bugün ders yok';
}

window.debounceSearch = function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadMyClasses(), 380);
};

window.logout = function () { localStorage.clear(); redirect('../pages/giris.html'); };

/* ════════════════════════════════════════
   BAŞLANGIÇ
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('user');
    if (!raw) { redirect('../pages/giris.html'); return; }

    try {
        const user = JSON.parse(raw);
        if (!['egitmen', 'admin'].includes(user.rol)) {
            alert('Bu alana erişim yetkiniz yok.');
            redirect('../pages/giris.html');
            return;
        }
        const name = user.ad || 'Eğitmen';
        document.getElementById('profile-name').textContent   = name;
        document.getElementById('profile-avatar').textContent = name[0].toUpperCase();
    } catch (_) { redirect('../pages/giris.html'); return; }

    loadSection('dashboard');
});