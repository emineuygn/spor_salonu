<?php
/**
 * FIT GYM CLUB — Rezervasyon Oluşturma
 * Endpoint: gym_backend/api/reservations/create.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";
require_once __DIR__ . "/../../helpers/auth-check.php";

// Yetki kontrolü (Ders 08: $_SESSION)
if (session_status() === PHP_SESSION_NONE) session_start();
if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Oturum açmanız gerekiyor.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek.']);
    exit;
}

$data   = json_decode(file_get_contents("php://input"), true);
$slotId = (int)($data['slot_id'] ?? 0);
$userId = (int)$_SESSION['user_id'];

if ($slotId < 1) {
    echo json_encode(['success' => false, 'message' => 'Lütfen bir saat seçiniz.']);
    exit;
}

// Mükerrer kayıt kontrolü
$chk = mysqli_prepare($db,
    "SELECT rezervasyon_id FROM rezervasyonlar
     WHERE uye_id = ? AND slot_id = ? AND durum != 'iptal'"
);
mysqli_stmt_bind_param($chk, 'ii', $userId, $slotId);
mysqli_stmt_execute($chk);
mysqli_stmt_store_result($chk);
if (mysqli_stmt_num_rows($chk) > 0) {
    mysqli_stmt_close($chk);
    echo json_encode(['success' => false, 'message' => 'Bu derse zaten rezervasyonunuz bulunuyor.']);
    exit;
}
mysqli_stmt_close($chk);

// Kapasite kontrolü
$cap = mysqli_prepare($db, "SELECT mevcut_kapasite FROM slotlar WHERE slot_id = ?");
mysqli_stmt_bind_param($cap, 'i', $slotId);
mysqli_stmt_execute($cap);
mysqli_stmt_bind_result($cap, $mevcutKapasite);
mysqli_stmt_fetch($cap);
mysqli_stmt_close($cap);

if (!$mevcutKapasite || $mevcutKapasite <= 0) {
    echo json_encode(['success' => false, 'message' => 'Üzgünüz, bu kontenjan doldu.']);
    exit;
}

// Transaction başlat (Ders 09)
mysqli_begin_transaction($db);

// Rezervasyonu oluştur
$insert = mysqli_prepare($db,
    "INSERT INTO rezervasyonlar (uye_id, slot_id, durum) VALUES (?, ?, 'beklemede')"
);
mysqli_stmt_bind_param($insert, 'ii', $userId, $slotId);
$r1 = mysqli_stmt_execute($insert);
mysqli_stmt_close($insert);

// Kapasiteyi düşür
$update = mysqli_prepare($db,
    "UPDATE slotlar SET mevcut_kapasite = mevcut_kapasite - 1 WHERE slot_id = ?"
);
mysqli_stmt_bind_param($update, 'i', $slotId);
$r2 = mysqli_stmt_execute($update);
mysqli_stmt_close($update);

if ($r1 && $r2) {
    mysqli_commit($db);
    echo json_encode(['success' => true, 'message' => 'Rezervasyonunuz başarıyla oluşturuldu!']);
} else {
    mysqli_rollback($db);
    echo json_encode(['success' => false, 'message' => 'Sistemsel bir hata oluştu, lütfen tekrar deneyin.']);
}
?>