<?php
/**
 * FIT GYM CLUB — Müsait Slotları Listele
 * Endpoint: gym_backend/api/reservations/slots.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek.']);
    exit;
}

$hizmetId = (int)($_GET['hizmet_id'] ?? 0);
$tarih    = trim($_GET['tarih'] ?? '');

if ($hizmetId < 1) {
    echo json_encode(['success' => false, 'message' => 'Hizmet ID gereklidir.']);
    exit;
}

// Dinamik sorgu — tarih seçildiyse o güne, seçilmediyse bugün ve sonrasına bak
if ($tarih !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih)) {
    $stmt = mysqli_prepare($db,
        "SELECT s.slot_id, h.hizmet_adi, s.tarih,
                s.baslangic_saati, s.bitis_saati,
                s.max_kapasite, s.mevcut_kapasite
         FROM slotlar s
         JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
         WHERE s.hizmet_id = ? AND s.mevcut_kapasite > 0 AND s.tarih = ?
         ORDER BY s.tarih ASC, s.baslangic_saati ASC"
    );
    mysqli_stmt_bind_param($stmt, 'is', $hizmetId, $tarih);
} else {
    $stmt = mysqli_prepare($db,
        "SELECT s.slot_id, h.hizmet_adi, s.tarih,
                s.baslangic_saati, s.bitis_saati,
                s.max_kapasite, s.mevcut_kapasite
         FROM slotlar s
         JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
         WHERE s.hizmet_id = ? AND s.mevcut_kapasite > 0 AND s.tarih >= CURDATE()
         ORDER BY s.tarih ASC, s.baslangic_saati ASC"
    );
    mysqli_stmt_bind_param($stmt, 'i', $hizmetId);
}

mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$slots  = mysqli_fetch_all($result, MYSQLI_ASSOC);
mysqli_stmt_close($stmt);

echo json_encode(['success' => true, 'message' => 'Slotlar listelendi.', 'data' => $slots]);
?>