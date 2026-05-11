document.addEventListener('DOMContentLoaded', async () => {
    // 1. Bilgileri Getir (GET)
    try {
        const response = await fetch('http://localhost:8000/api/members/profile.php', {
            credentials: 'include' 
        });
        
        const result = await response.json();

        if (result.success) {
            const user = result.data;
            // Verileri kutucuklara yerleştiriyoruz
            if (document.getElementById('profAd')) document.getElementById('profAd').value = user.ad || '';
            if (document.getElementById('profSoyad')) document.getElementById('profSoyad').value = user.soyad || '';
            if (document.getElementById('profTel')) document.getElementById('profTel').value = user.telefon || '';
            if (document.getElementById('displayEmail')) document.getElementById('displayEmail').innerText = user.email || '---';
            
            const badge = document.getElementById('membershipBadge');
            if(badge) badge.innerText = (user.uyelik_tipi || 'uye').toUpperCase();
            
            // "Yükleniyor..." badge'ini gizle
            const loadingBadge = document.querySelector('.badge.bg-secondary');
            if (loadingBadge) loadingBadge.style.display = 'none';

        } else {
            // Oturum geçersizse girişe yönlendir
            window.location.href = 'giris.html';
        }
    } catch (err) {
        console.error("Profil verisi çekilemedi:", err);
    }
});

// 2. Güncelleme İşlemi (Düzeltildi)
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updateData = {
        ad: document.getElementById('profAd').value,
        soyad: document.getElementById('profSoyad').value,
        telefon: document.getElementById('profTel').value
    };

    try {
        // DÜZELTME: PUT yerine POST kullanıyoruz çünkü PHP tarafı POST bekliyor
        const response = await fetch('http://localhost:8000/api/members/profile.php', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
            credentials: 'include'
        });

        const result = await response.json();
        const msg = document.getElementById('profileMsg');
        
        if(msg) {
            msg.innerText = result.message;
            msg.style.color = result.success ? "#ccff00" : "red";
        }

        if (result.success) {
            msg.innerText = result.message;
            msg.style.color = "#ccff00"; 
            setTimeout(() => {
                window.location.href = 'index.html'; // Buraya hangi sayfaya gitmesini istiyorsan onu yaz (örn: ana-sayfa.html)
            }, 2000);
        }
    } catch (err) {
        console.error("Güncelleme hatası:", err);
        alert("Bağlantı hatası! Lütfen backend sunucusunu kontrol edin.");
    }
});