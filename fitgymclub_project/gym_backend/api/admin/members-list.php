<?php
/**
 * FIT GYM CLUB — Admin API (Üye Listeleme)
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/logs.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {

    $search = '%' . trim($_GET['search'] ?? '') . '%';
    $rol    = 'uye';

    $stmt = mysqli_prepare($db,
        "SELECT uye_id, ad, soyad, email, uyelik_tipi, kayit_tarihi
         FROM uyeler
         WHERE rol = ? AND (ad LIKE ? OR soyad LIKE ? OR email LIKE ?)
         ORDER BY kayit_tarihi DESC"
    );
    mysqli_stmt_bind_param($stmt, 'ssss', $rol, $search, $search, $search);
    mysqli_stmt_execute($stmt);

    $result  = mysqli_stmt_get_result($stmt);
    $members = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    success(['data' => $members]);

} elseif ($method === 'DELETE') {

    $id = (int)($_GET['id'] ?? 0);
    if ($id === 0) error('Üye ID belirtilmedi.', 422);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Üye silindi (ID: $id)");

    $rol  = 'uye';
    $stmt = mysqli_prepare($db, "DELETE FROM uyeler WHERE uye_id = ? AND rol = ?");
    mysqli_stmt_bind_param($stmt, 'is', $id, $rol);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    success(['message' => 'Üye başarıyla silindi.']);

} else {
    error('Metot desteklenmiyor.', 405);
}
?>