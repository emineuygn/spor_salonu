<?php
/**
 * FIT GYM CLUB — Giriş API
 * Ders 08: session_start() + $_SESSION kullanımı
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

session_start();

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . "/../../config/db.php";

// Ders 07: JSON verisini al
$data  = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');
$sifre = $data['sifre'] ?? '';

// Ders 07: $_POST kontrolü
if (empty($email) || empty($sifre)) {
    echo json_encode(["success" => false, "message" => "Lütfen tüm alanları doldurun."]);
    exit;
}

// Ders 09: mysqli_prepare ile güvenli sorgu
$stmt = mysqli_prepare($db, "SELECT uye_id, ad, soyad, email, sifre, rol FROM uyeler WHERE email = ?");
mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);
$user   = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if ($user && password_verify($sifre, $user['sifre'])) {

    // Ders 08: Oturum güvenliği
    session_regenerate_id(true);

    // Ders 08: $_SESSION ile kullanıcı bilgisi sakla
    $_SESSION['user_id'] = $user['uye_id'];
    $_SESSION['rol']     = $user['rol'];
    $_SESSION['user_ad'] = $user['ad'];

    echo json_encode([
        "success" => true,
        "message" => "Giriş başarılı!",
        "data"    => [
            "uye_id" => $user['uye_id'],
            "ad"     => $user['ad'],
            "soyad"  => $user['soyad'],
            "rol"    => $user['rol'],
            "email"  => $user['email'],
        ]
    ]);

} else {
    echo json_encode(["success" => false, "message" => "E-posta veya şifre hatalı."]);
}
?>