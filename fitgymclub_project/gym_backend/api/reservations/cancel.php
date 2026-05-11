<?php
/**
 * FIT GYM CLUB — Rezervasyon İptal
 * Endpoint: gym_backend/api/reservations/cancel.php
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

// Oturum kontrolü (Ders 08)
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

$data  = json_decode(file_get_contents("php://input"), true);
$rezId = (int)($data['rezervasyon_id'] ?? 0);
$userId = (int)$_SESSION['user_id'];

if ($rezId < 1) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz rezervasyon ID.']);
    exit;
}

// Bu rezervasyon bu kullanıcıya mı ait?
$chk = mysqli_prepare($db,
    "SELECT slot_id FROM rezervasyonlar
     WHERE rezervasyon_id = ? AND uye_id = ? AND durum != 'iptal'"
);
mysqli_stmt_bind_param($chk, 'ii', $rezId, $userId);
mysqli_stmt_execute($chk);
mysqli_stmt_bind_result($chk, $slotId);
$found = mysqli_stmt_fetch($chk);
mysqli_stmt_close($chk);

if (!$found) {
    echo json_encode(['success' => false, 'message' => 'Rezervasyon bulunamadı.']);
    exit;
}

// Transaction başlat
mysqli_begin_transaction($db);

// Rezervasyonu iptal et
$upd = mysqli_prepare($db,
    "UPDATE rezervasyonlar SET durum = 'iptal' WHERE rezervasyon_id = ?"
);
mysqli_stmt_bind_param($upd, 'i', $rezId);
$r1 = mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

// Kapasiteyi geri artır
$cap = mysqli_prepare($db,
    "UPDATE slotlar SET mevcut_kapasite = mevcut_kapasite + 1 WHERE slot_id = ?"
);
mysqli_stmt_bind_param($cap, 'i', $slotId);
$r2 = mysqli_stmt_execute($cap);
mysqli_stmt_close($cap);

if ($r1 && $r2) {
    mysqli_commit($db);
    echo json_encode(['success' => true, 'message' => 'Rezervasyonunuz iptal edildi.']);
} else {
    mysqli_rollback($db);
    echo json_encode(['success' => false, 'message' => 'İptal işlemi başarısız.']);
}
?>