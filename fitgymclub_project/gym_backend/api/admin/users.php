<?php
/**
 * FIT GYM CLUB — Admin API (Kullanıcı Yönetimi)
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/logs.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireAdmin();

$requestedRole = trim($_GET['role'] ?? '');
if (!in_array($requestedRole, ['uye', 'egitmen', 'admin'], true)) {
    error('Geçerli bir rol parametresi zorunludur.', 400);
}

$method = $_SERVER['REQUEST_METHOD'];

if      ($method === 'GET')    handleGet($db, $requestedRole);
elseif  ($method === 'POST')   handlePost($db, $requestedRole);
elseif  ($method === 'PUT')    handlePut($db, $requestedRole);
elseif  ($method === 'DELETE') handleDelete($db, $requestedRole);
else    error('Metot desteklenmiyor.', 405);

/* ════════════ GET ════════════ */
function handleGet($db, string $role): void
{
    $search = '%' . trim($_GET['search'] ?? '') . '%';

    $stmt = mysqli_prepare($db,
        "SELECT uye_id, ad, soyad, email, telefon, uyelik_tipi, kayit_tarihi
         FROM uyeler
         WHERE rol = ? AND (ad LIKE ? OR soyad LIKE ? OR email LIKE ?)
         ORDER BY kayit_tarihi DESC"
    );
    mysqli_stmt_bind_param($stmt, 'ssss', $role, $search, $search, $search);
    mysqli_stmt_execute($stmt);

    $result = mysqli_stmt_get_result($stmt);
    $data   = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    success(['data' => $data]);
}

/* ════════════ POST ════════════ */
function handlePost($db, string $role): void
{
    $body  = getJsonBody();
    $ad    = trim($body['ad']    ?? '');
    $soyad = trim($body['soyad'] ?? '');
    $email = trim($body['email'] ?? '');
    $sifre = $body['sifre']      ?? '123456';

    if (!$ad || !$email) error('Ad ve e-posta zorunludur.', 422);

    // E-posta kontrolü
    $chk = mysqli_prepare($db, "SELECT COUNT(*) FROM uyeler WHERE email = ?");
    mysqli_stmt_bind_param($chk, 's', $email);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $count);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ($count > 0) error('Bu e-posta zaten kayıtlı.', 409);

    $hash = password_hash($sifre, PASSWORD_BCRYPT);

    $stmt = mysqli_prepare($db,
        "INSERT INTO uyeler (ad, soyad, email, sifre, rol, kayit_tarihi)
         VALUES (?, ?, ?, ?, ?, NOW())"
    );
    mysqli_stmt_bind_param($stmt, 'sssss', $ad, $soyad, $email, $hash, $role);
    mysqli_stmt_execute($stmt);
    $newId = mysqli_insert_id($db);
    mysqli_stmt_close($stmt);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Yeni kullanıcı eklendi: $ad ($role)");

    success(['uye_id' => $newId], 201);
}

/* ════════════ PUT ════════════ */
function handlePut($db, string $role): void
{
    $body  = getJsonBody();
    $id    = (int)($body['uye_id'] ?? 0);
    $ad    = trim($body['ad']    ?? '');
    $soyad = trim($body['soyad'] ?? '');

    if ($id < 1) error('Geçersiz ID.', 422);

    $stmt = mysqli_prepare($db,
        "UPDATE uyeler SET ad = ?, soyad = ? WHERE uye_id = ? AND rol = ?"
    );
    mysqli_stmt_bind_param($stmt, 'ssis', $ad, $soyad, $id, $role);
    mysqli_stmt_execute($stmt);
    $affected = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Kullanıcı güncellendi (ID: $id)");

    success(['updated' => $affected]);
}

/* ════════════ DELETE ════════════ */
function handleDelete($db, string $role): void
{
    $id = (int)($_GET['id'] ?? 0);
    if ($id < 1) error('Geçersiz ID.', 422);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Kullanıcı silindi (ID: $id, rol: $role)");

    $stmt = mysqli_prepare($db, "DELETE FROM uyeler WHERE uye_id = ? AND rol = ?");
    mysqli_stmt_bind_param($stmt, 'is', $id, $role);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    success(['deleted' => $id]);
}

function getJsonBody(): array
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
?>