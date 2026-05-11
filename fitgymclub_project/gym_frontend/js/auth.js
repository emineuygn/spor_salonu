// --- 1. GİRİŞ İŞLEMİ (Login) ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn    = loginForm.querySelector('button[type="submit"]');
        const msgDiv = document.getElementById('message');

        const loginData = {
            email: document.getElementById('email').value,
            sifre: document.getElementById('sifre').value
        };

        btn.disabled    = true;
        btn.textContent = "GİRİŞ YAPILIYOR...";

        try {
            const response = await fetch('http://localhost:8000/gym_backend/api/auth/login.php', {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                body:        JSON.stringify(loginData),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                msgDiv.style.color = "#ccff00";
                msgDiv.textContent = "Giriş başarılı! Yönlendiriliyorsunuz...";

                localStorage.setItem('user', JSON.stringify(result.data));

                const userRole = result.data?.rol?.toLowerCase() || '';

                setTimeout(() => {
                    if (userRole === 'admin') {
                        window.location.href = '../admin/admin-panel.html';
                    } else if (userRole === 'egitmen') {
                        window.location.href = '../egitmen/egitmen-panel.html';
                    } else if (userRole === 'uye') {
                        window.location.href = '../pages/profil.html';
                    } else {
                        window.location.href = '../pages/profil.html';
                    }
                }, 1000);

            } else {
                msgDiv.style.color = "red";
                msgDiv.textContent = result.message;
                btn.disabled    = false;
                btn.textContent = "GİRİŞ YAP";
            }

        } catch (error) {
            console.error("Giriş Hatası:", error);
            msgDiv.textContent = "Sunucuya bağlanılamadı. Port 8000 kontrol edin.";
            btn.disabled    = false;
            btn.textContent = "GİRİŞ YAP";
        }
    });
}

// --- 2. KAYIT İŞLEMİ (Register) ---
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn    = registerForm.querySelector('button[type="submit"]');
        const msgDiv = document.getElementById('message');

        const registerData = {
            ad:    document.getElementById('ad').value,
            soyad: document.getElementById('soyad').value,
            email: document.getElementById('email').value,
            sifre: document.getElementById('sifre').value
        };

        btn.disabled    = true;
        btn.textContent = "KAYDEDİLİYOR...";

        try {
            const response = await fetch('http://localhost:8000/gym_backend/api/auth/register.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(registerData)
            });

            const result = await response.json();

            if (result.success) {
                msgDiv.style.color = "#ccff00";
                msgDiv.textContent = "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...";
                setTimeout(() => { window.location.href = "giris.html"; }, 1500);
            } else {
                msgDiv.style.color = "red";
                msgDiv.textContent = result.message;
                btn.disabled    = false;
                btn.textContent = "KAYIT OL";
            }

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            msgDiv.textContent = "Sunucu hatası!";
            btn.disabled    = false;
            btn.textContent = "KAYIT OL";
        }
    });
}