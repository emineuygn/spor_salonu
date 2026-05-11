// gym_frontend/assets/js/odeme.js

document.addEventListener('DOMContentLoaded', () => {
    // localStorage'dan seçilen hizmet bilgilerini çek
    const secilenHizmetId = localStorage.getItem('secilenHizmetId');
    const secilenHizmetAdi = localStorage.getItem('secilenHizmetAdi') || 'Hizmet Seçilmedi';

    document.getElementById('hizmet-bilgi').innerText = `Seçilen Hizmet: ${secilenHizmetAdi}`;

    const paymentForm = document.getElementById('payment-form');

    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const paymentData = {
            hizmet_id: secilenHizmetId,
            card_name: document.getElementById('card-name').value,
            // Güvenlik gereği kart numaralarını burada şifrelemiyoruz çünkü bu bir okul projesi :)
        };

        try {
            const response = await fetch('http://localhost:8000/api/payments/pay.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Tebrikler! ' + result.message);
                window.location.href = 'profil.html'; // Ödeme sonrası profile yönlendir
            } else {
                alert('Hata: ' + result.message);
            }
        } catch (error) {
            console.error('Ödeme hatası:', error);
            alert('Sunucuya bağlanılamadı.');
        }
    });
});