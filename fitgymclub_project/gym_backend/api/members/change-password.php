<?php
/**
 * FIT GYM CLUB — Sifre Degistirme
 * Endpoint: gym_backend/api/members/change-password.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanimi
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . "/../../config/db.php";

if (session_status() === PHP_SESSION_NONE) session_start();
if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Oturum acmaniz gerekiyor.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Gecersiz istek.']);
    exit;
}

$data        = json_decode(file_get_contents("php://input"), true) ?: $_POST;
$eskiSifre   = $data['eski_sifre']   ?? '';
$yeniSifre   = $data['yeni_sifre']   ?? '';
$tekrarSifre = $data['tekrar_sifre'] ?? '';
$userId      = (int)$_SESSION['user_id'];

if (empty($eskiSifre) || empty($yeniSifre) || empty($tekrarSifre)) {
    echo json_encode(['success' => false, 'message' => 'Tum alanlari doldurunuz.']);
    exit;
}

if ($yeniSifre !== $tekrarSifre) {
    echo json_encode(['success' => false, 'message' => 'Yeni sifreler eslesmiyor.']);
    exit;
}

if (strlen($yeniSifre) < 6) {
    echo json_encode(['success' => false, 'message' => 'Sifre en az 6 karakter olmalidir.']);
    exit;
}

// Mevcut sifreyi getir
$stmt = mysqli_prepare($db, "SELECT sifre FROM uyeler WHERE uye_id = ?");
mysqli_stmt_bind_param($stmt, 'i', $userId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $hashliSifre);
mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

// Eski sifre dogru mu?
if (!password_verify($eskiSifre, $hashliSifre)) {
    echo json_encode(['success' => false, 'message' => 'Mevcut sifreniz yanlis.']);
    exit;
}

// Yeni sifreyi hashle ve guncelle
$yeniHash = password_hash($yeniSifre, PASSWORD_BCRYPT);
$upd = mysqli_prepare($db, "UPDATE uyeler SET sifre = ? WHERE uye_id = ?");
mysqli_stmt_bind_param($upd, 'si', $yeniHash, $userId);
$result = mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

if ($result) {
    echo json_encode(['success' => true, 'message' => 'Sifreniz basariyla degistirildi.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Sifre degistirilemedi.']);
}
?>