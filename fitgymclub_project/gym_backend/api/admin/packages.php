<?php
/**
 * FIT GYM CLUB — Admin API (Satış / Paket Yönetimi)
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/logs.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

if      ($method === 'GET')  handleGet($db);
elseif  ($method === 'POST') handlePost($db);
else    error('Metot desteklenmiyor.', 405);

/* ════════════ GET ════════════ */
function handleGet($db): void
{
    $result = mysqli_query($db,
        "SELECT p.satis_id, p.uye_id, p.paket_adi, p.tutar, p.odeme_tarihi,
                u.ad, u.soyad
         FROM paket_satislar p
         JOIN uyeler u ON p.uye_id = u.uye_id
         ORDER BY p.odeme_tarihi DESC"
    );

    $data = mysqli_fetch_all($result, MYSQLI_ASSOC);
    success(['data' => $data]);
}

/* ════════════ POST ════════════ */
function handlePost($db): void
{
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $uyeId  = (int)($body['uye_id']   ?? 0);
    $paket  = trim($body['paket_adi'] ?? '');
    $tutar  = (float)($body['tutar']  ?? 0);

    if (!$uyeId || !$paket || $tutar <= 0) {
        error('Geçersiz paket bilgileri.', 422);
    }

    $stmt = mysqli_prepare($db,
        "INSERT INTO paket_satislar (uye_id, paket_adi, tutar) VALUES (?, ?, ?)"
    );
    mysqli_stmt_bind_param($stmt, 'isd', $uyeId, $paket, $tutar);
    mysqli_stmt_execute($stmt);
    $satisId = mysqli_insert_id($db);
    mysqli_stmt_close($stmt);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Paket satıldı: $paket — $tutar TL (Üye ID: $uyeId)");

    success(['satis_id' => $satisId], 201);
}
?>