// gym_frontend/js/rezervasyon.js

document.addEventListener('DOMContentLoaded', async () => {
    const dropdown = document.getElementById('serviceDropdown');
    const container = document.getElementById('slotsContainer');
    const tarihInput = document.getElementById('rezTarih'); // Takvim eklendi

    // 1. Hizmetleri Yükle (Dropdown Doldurma)
    try {
        const res = await fetch('http://localhost:8000/api/reservations/slots.php');
        const result = await res.json();
        
        if (result.success) {
            dropdown.innerHTML = '<option value="">Lütfen bir ders seçin...</option>'; // Temiz başla
            result.data.forEach(service => {
                const opt = document.createElement('option');
                // Sütun isimlerini veritabanına göre kontrol et (id mi hizmet_id mi?)
                opt.value = service.id || service.hizmet_id; 
                opt.innerText = service.ad || service.hizmet_adi;
                dropdown.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Hizmetler yüklenemedi:", err);
    }

    // 2. Filtreleme Fonksiyonu (Hem ders hem tarih değişince çalışır)
    async function loadSlots() {
        const hizmetId = dropdown.value;
        const seciliTarih = tarihInput.value;

        if (!hizmetId) return;

        container.innerHTML = "<p style='color:#888;'>Slotlar yükleniyor...</p>";

        try {
            // URL'ye tarih parametresini de ekliyoruz
            let url = `http://localhost:8000/api/reservations/slots.php?hizmet_id=${hizmetId}`;
            if (seciliTarih) {
                url += `&tarih=${seciliTarih}`;
            }

            const slotRes = await fetch(url);
            const slotData = await slotRes.json();

            container.innerHTML = ""; // Temizle
            
            if (slotData.success && slotData.data.length > 0) {
                slotData.data.forEach(slot => {
                    const card = document.createElement('div');
                    // Mevcut kapasite 0 ise 'full' class'ı ekle
                    card.className = `slot-card ${slot.mevcut_kapasite <= 0 ? 'full' : ''}`;
                    
                    card.innerHTML = `
                        <span class="time">${slot.baslangic_saati.substring(0,5)}</span>
                        <span class="date">${slot.tarih}</span>
                        <div class="capacity">Kontenjan: ${slot.mevcut_kapasite}</div>
                        ${slot.mevcut_kapasite > 0 
                            ? `<button onclick="makeReservation(${slot.slot_id || slot.id})" class="btn-reserve">Rezerve Et</button>` 
                            : '<b style="color:#ff0055;">DOLU</b>'}
                    `;
                    container.appendChild(card);
                });
            } else {
                container.innerHTML = "<p>Seçilen kriterlere uygun boş saat bulunamadı.</p>";
            }
        } catch (err) {
            console.error("Slotlar çekilemedi:", err);
            container.innerHTML = "<p style='color:red;'>Bağlantı hatası oluştu.</p>";
        }
    }

    // Hem ders seçimi hem de tarih seçimi değiştiğinde listeyi yenile
    dropdown.addEventListener('change', loadSlots);
    tarihInput.addEventListener('change', loadSlots);
});

// 3. Rezervasyon Yapma Fonksiyonu (create.php'ye gönderir)
async function makeReservation(slotId) {
    if (!confirm("Rezervasyonu onaylıyor musunuz?")) return;

    try {
        const response = await fetch('http://localhost:8000/api/reservations/create.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_id: slotId }),
            credentials: 'include' // Session/Cookie gönderimi için önemli
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message || "Harika! Yeriniz ayrıldı.");
            window.location.href = 'profil.html'; // Başarılıysa Dashboard'a git
        } else {
            alert(result.message || "Rezervasyon sırasında bir hata oluştu.");
        }
    } catch (err) {
        console.error("Rezervasyon Hatası:", err);
        alert("Bağlantı hatası! Lütfen backend sunucusunu kontrol edin.");
    }
}