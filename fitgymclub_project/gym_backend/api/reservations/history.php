<?php
/**
 * FIT GYM CLUB — Rezervasyon Geçmişi
 * Endpoint: gym_backend/api/reservations/history.php
 * Ders 09: mysqli_prepare kullanımı
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";

// Oturum kontrolü (Ders 08)
if (session_status() === PHP_SESSION_NONE) session_start();
if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Oturum açmanız gerekiyor.']);
    exit;
}

$uid = (int)$_SESSION['user_id'];

// Kullanıcı bilgileri
$userStmt = mysqli_prepare($db,
    "SELECT ad, soyad, email, telefon, uyelik_tipi, uyelik_bitis_tarihi
     FROM uyeler WHERE uye_id = ?"
);
mysqli_stmt_bind_param($userStmt, 'i', $uid);
mysqli_stmt_execute($userStmt);
$userResult = mysqli_stmt_get_result($userStmt);
$userStats  = mysqli_fetch_assoc($userResult);
mysqli_stmt_close($userStmt);

// Rezervasyonlar
$stmt = mysqli_prepare($db,
    "SELECT r.rezervasyon_id, h.hizmet_adi, s.tarih,
            s.baslangic_saati AS saat, r.durum
     FROM rezervasyonlar r
     JOIN slotlar s  ON r.slot_id  = s.slot_id
     JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
     WHERE r.uye_id = ?
     ORDER BY s.tarih DESC, s.baslangic_saati DESC"
);
mysqli_stmt_bind_param($stmt, 'i', $uid);
mysqli_stmt_execute($stmt);
$result          = mysqli_stmt_get_result($stmt);
$allReservations = mysqli_fetch_all($result, MYSQLI_ASSOC);
mysqli_stmt_close($stmt);

// Yaklaşan / Geçmiş ayır
$today    = date('Y-m-d');
$upcoming = [];
$history  = [];

foreach ($allReservations as $res) {
    if ($res['tarih'] >= $today && $res['durum'] !== 'iptal') {
        $upcoming[] = $res;
    } else {
        $history[] = $res;
    }
}

echo json_encode([
    'success'  => true,
    'message'  => 'Panel verileri getirildi.',
    'user'     => $userStats,
    'upcoming' => $upcoming,
    'history'  => $history,
]);
?>