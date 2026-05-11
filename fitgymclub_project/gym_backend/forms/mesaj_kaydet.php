<?php
// 1. Gerekli altyapı dosyalarını dahil et (Ders 8)
require_once "../config/db.php";
require_once "../helpers/response.php";
require_once "../helpers/validate.php";

// 2. Sadece POST isteklerini kabul et (v2.0 Kuralı)
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendResponse(false, 'Geçersiz istek yöntemi.', null, 405);
}

// 3. Verileri al ve temizle (Ders 7 & helpers/validate.php)
$ad = validateInput($_POST['ad'] ?? '');
$email = validateInput($_POST['email'] ?? '');
$mesaj = validateInput($_POST['mesaj'] ?? '');

// 4. Basit doğrulama (Validation)
if (empty($ad) || empty($email) || empty($mesaj)) {
    sendResponse(false, 'Lütfen tüm alanları doldurun.', null, 400);
}

if (!checkEmail($email)) {
    sendResponse(false, 'Geçersiz e-posta adresi.', null, 400);
}

try {
    // 5. Veritabanına Kayıt (Ders 8: Prepared Statements)
    // Not: Eğer mesajlar için bir tablon yoksa, şimdilik hata loguna da yazdırabilirsin.
    // Şimdilik dokümana uygun PDO örneği:
    $sql = "INSERT INTO iletisim_mesajlari (ad, email, mesaj) VALUES (:ad, :email, :mesaj)";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':ad' => $ad,
        ':email' => $email,
        ':mesaj' => $mesaj
    ]);

    // 6. Başarılı JSON cevabı dön (v2.0 Kuralı)
    sendResponse(true, 'Mesajınız başarıyla iletildi.');

} catch (PDOException $e) {
    // 7. Hata oluşursa logla (Ders 8)
    error_log("Mesaj Kayıt Hatası: " . $e->getMessage(), 3, "../logs/hata.txt");
    sendResponse(false, 'Mesaj gönderilirken bir hata oluştu.', null, 500);
}