<?php
/**
 * FIT GYM CLUB — Profil Görüntüle / Güncelle
 * Endpoint: gym_backend/api/members/profile.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

$userId = (int)$_SESSION['user_id'];

/* ════════════ GET: Profil Getir ════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Ders 09: mysqli_prepare ile güvenli sorgu
    $stmt = mysqli_prepare($db,
        "SELECT ad, soyad, email, telefon, dogum_tarihi, uyelik_tipi, uyelik_bitis_tarihi
         FROM uyeler WHERE uye_id = ?"
    );
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);

    $result = mysqli_stmt_get_result($stmt);
    $user   = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($user) {
        echo json_encode(['success' => true, 'message' => 'Profil bilgileri getirildi.', 'data' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı.']);
    }
}

/* ════════════ POST: Profil Güncelle ════════════ */
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $data    = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $ad      = trim($data['ad']      ?? '');
    $soyad   = trim($data['soyad']   ?? '');
    $telefon = trim($data['telefon'] ?? '');

    if (empty($ad) || empty($soyad)) {
        echo json_encode(['success' => false, 'message' => 'Ad ve soyad boş bırakılamaz.']);
        exit;
    }

    $stmt = mysqli_prepare($db,
        "UPDATE uyeler SET ad = ?, soyad = ?, telefon = ? WHERE uye_id = ?"
    );
    mysqli_stmt_bind_param($stmt, 'sssi', $ad, $soyad, $telefon, $userId);
    $result = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if ($result) {
        // Session'ı güncelle (Ders 08)
        $_SESSION['user_ad']    = $ad;
        $_SESSION['user_soyad'] = $soyad;
        echo json_encode(['success' => true, 'message' => 'Profil başarıyla güncellendi.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Güncelleme sırasında bir hata oluştu.']);
    }
}
?>