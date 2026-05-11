

function renderNavbar() {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    const navLinks = document.getElementById('nav-links');
    const navButtons = document.getElementById('nav-buttons');

    if (!navLinks || !navButtons) return;

    navLinks.innerHTML = '';
    navButtons.innerHTML = '';

    if (user) {
        if (!user.ad || !user.soyad) {
            navLinks.innerHTML = `
                <li><a href="profil.html" class="active">Profili Tamamla</a></li>
            `;
        } else {
            navLinks.innerHTML = `
                <li><a href="index.html">Ana Sayfa</a></li>
                <li><a href="rezervasyon.html">Rezervasyon Yap</a></li>
                <li><a href="profil.html">Profilim</a></li>
            `;
        }

        navButtons.innerHTML = `
            <a href="#" class="btn-outline" id="logoutBtn">Çıkış Yap</a>
        `;

    } else {
        navLinks.innerHTML = `
            <li><a href="hizmetler.html">Hizmetler</a></li>
            <li><a href="hakkimizda.html">Hakkımızda</a></li>
        `;
        
        navButtons.innerHTML = `
            <a href="giris.html" class="btn-outline">Giriş Yap</a>
            <a href="kayit.html" class="btn-primary-nav">Hemen Katıl</a>
        `;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'giris.html';
    });
}

function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const navRight = document.querySelector('.nav-right'); 
    
    toggle?.addEventListener('click', () => {
        navRight?.classList.toggle('active');
        if(!navRight) document.querySelector('.nav-links')?.classList.toggle('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    initMobileMenu();
});