<?php
/**
 * FIT GYM CLUB — Kayıt API
 * Ders 08: session_start() + $_POST kullanımı
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// Sadece POST kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek yöntemi.']);
    exit;
}

require_once __DIR__ . "/../../config/db.php";

// Ders 07: JSON verisini al
$data  = json_decode(file_get_contents("php://input"), true) ?: $_POST;
$ad    = trim($data['ad']    ?? '');
$soyad = trim($data['soyad'] ?? '');
$email = trim($data['email'] ?? '');
$sifre = $data['sifre']      ?? '';

// Alan kontrolü
if (empty($ad) || empty($soyad) || empty($email) || empty($sifre)) {
    echo json_encode(['success' => false, 'message' => 'Lütfen tüm alanları doldurun.']);
    exit;
}

// E-posta format kontrolü
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz e-posta formatı.']);
    exit;
}

// Ders 09: E-posta zaten kayıtlı mı?
$chk = mysqli_prepare($db, "SELECT uye_id FROM uyeler WHERE email = ?");
mysqli_stmt_bind_param($chk, 's', $email);
mysqli_stmt_execute($chk);
mysqli_stmt_store_result($chk);

if (mysqli_stmt_num_rows($chk) > 0) {
    mysqli_stmt_close($chk);
    echo json_encode(['success' => false, 'message' => 'Bu e-posta adresi zaten kayıtlı.']);
    exit;
}
mysqli_stmt_close($chk);

// Şifreyi hashle
$hashedPassword = password_hash($sifre, PASSWORD_BCRYPT);
$rol = 'uye';

// Ders 09: Kayıt işlemi
$stmt = mysqli_prepare($db,
    "INSERT INTO uyeler (ad, soyad, email, sifre, rol) VALUES (?, ?, ?, ?, ?)"
);
mysqli_stmt_bind_param($stmt, 'sssss', $ad, $soyad, $email, $hashedPassword, $rol);
$result = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if ($result) {
    echo json_encode(['success' => true, 'message' => 'Kaydınız başarıyla tamamlandı. Giriş yapabilirsiniz.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Kayıt sırasında bir hata oluştu.']);
}
?>