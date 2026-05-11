<?php
/**
 * FIT GYM CLUB — Ödeme / Üyelik Güncelleme
 * Endpoint: gym_backend/api/payments/pay.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';

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

$data     = json_decode(file_get_contents('php://input'), true);
$hizmetId = (int)($data['hizmet_id'] ?? 0);
$userId   = (int)$_SESSION['user_id'];

if ($hizmetId < 1) {
    echo json_encode(['success' => false, 'message' => 'Hizmet bilgisi alınamadı.']);
    exit;
}

// Üyelik tipini belirle
$uyeTipi = match($hizmetId) {
    1 => 'temel',
    2 => 'standart',
    3 => 'premium',
    default => 'temel'
};

// 30 gün ekle
$yeniBitis = date('Y-m-d', strtotime('+30 days'));

// Ders 09: mysqli_prepare ile güvenli güncelleme
$stmt = mysqli_prepare($db,
    "UPDATE uyeler SET uyelik_bitis_tarihi = ?, uyelik_tipi = ? WHERE uye_id = ?"
);
mysqli_stmt_bind_param($stmt, 'ssi', $yeniBitis, $uyeTipi, $userId);
$result = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if ($result) {
    // Paket satışını kaydet
    $paketAdi = ucfirst($uyeTipi) . ' Aylık';
    $tutar    = match($uyeTipi) {
        'temel'    => 550.00,
        'standart' => 850.00,
        'premium'  => 1250.00,
        default    => 550.00
    };

    $ins = mysqli_prepare($db,
        "INSERT INTO paket_satislar (uye_id, paket_adi, tutar) VALUES (?, ?, ?)"
    );
    mysqli_stmt_bind_param($ins, 'isd', $userId, $paketAdi, $tutar);
    mysqli_stmt_execute($ins);
    mysqli_stmt_close($ins);

    echo json_encode([
        'success' => true,
        'message' => "Ödemeniz onaylandı! Üyeliğiniz $yeniBitis tarihine kadar güncellendi.",
        'data'    => ['bitis_tarihi' => $yeniBitis, 'paket' => $uyeTipi]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Üyelik güncellenemedi.']);
}
?>