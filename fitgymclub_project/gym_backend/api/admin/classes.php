<?php
/**
 * FIT GYM CLUB — Admin API (Ders / Slot Yönetimi)
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/logs.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

if      ($method === 'GET')    handleGet($db);
elseif  ($method === 'POST')   handlePost($db);
elseif  ($method === 'PUT')    handlePut($db);
elseif  ($method === 'DELETE') handleDelete($db);
else    error('Desteklenmeyen HTTP metodu.', 405);

/* ════════════ GET ════════════ */
function handleGet($db): void
{
    $search = trim($_GET['search'] ?? '');
    $tarih  = trim($_GET['tarih']  ?? '');

    // Dinamik WHERE koşulu
    $where  = [];
    $types  = '';
    $params = [];

    if ($search !== '') {
        $where[]  = 'h.hizmet_adi LIKE ?';
        $types   .= 's';
        $s        = '%' . $search . '%';
        $params[] = &$s;
    }
    if ($tarih !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih)) {
        $where[]  = 's.tarih = ?';
        $types   .= 's';
        $params[] = &$tarih;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT s.slot_id, h.hizmet_adi, s.tarih,
                   s.baslangic_saati, s.bitis_saati,
                   s.max_kapasite, s.mevcut_kapasite
            FROM slotlar s
            JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
            $whereSql
            ORDER BY s.tarih DESC";

    $stmt = mysqli_prepare($db, $sql);

    if ($types && $params) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $result  = mysqli_stmt_get_result($stmt);
    $classes = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    // Toplam slot sayısı
    $r     = mysqli_query($db, "SELECT COUNT(*) AS toplam FROM slotlar");
    $total = (int)mysqli_fetch_assoc($r)['toplam'];

    success(['classes' => $classes, 'total' => $total]);
}

/* ════════════ POST ════════════ */
function handlePost($db): void
{
    $body      = getJsonBody();
    $hizmetAdi = trim($body['hizmet_adi'] ?? '');
    $maxKap    = (int)($body['max_kapasite'] ?? 0);
    $tarih     = trim($body['tarih'] ?? '');
    $baslangic = trim($body['baslangic_saati'] ?? '');
    $bitis     = trim($body['bitis_saati'] ?? '');

    if (!$hizmetAdi || $maxKap < 1) error('Geçersiz ders bilgileri.', 422);

    $hizmetId = getOrCreateHizmet($db, $hizmetAdi);

    $stmt = mysqli_prepare($db,
        "INSERT INTO slotlar (hizmet_id, tarih, baslangic_saati, bitis_saati, max_kapasite, mevcut_kapasite)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    mysqli_stmt_bind_param($stmt, 'isssii', $hizmetId, $tarih, $baslangic, $bitis, $maxKap, $maxKap);
    mysqli_stmt_execute($stmt);
    $slotId = mysqli_insert_id($db);
    mysqli_stmt_close($stmt);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Yeni ders eklendi: $hizmetAdi (Slot ID: $slotId)");

    success(['slot_id' => $slotId], 201);
}

/* ════════════ PUT ════════════ */
function handlePut($db): void
{
    $body = getJsonBody();
    $id   = (int)($body['slot_id'] ?? 0);
    $max  = (int)($body['max_kapasite'] ?? 0);

    if ($id < 1) error('Geçersiz slot ID.', 422);

    $stmt = mysqli_prepare($db, "UPDATE slotlar SET max_kapasite = ? WHERE slot_id = ?");
    mysqli_stmt_bind_param($stmt, 'ii', $max, $id);
    mysqli_stmt_execute($stmt);
    $affected = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Ders kapasitesi güncellendi (Slot ID: $id)");

    success(['updated' => $affected]);
}

/* ════════════ DELETE ════════════ */
function handleDelete($db): void
{
    $id = (int)($_GET['id'] ?? 0);
    if ($id < 1) error('Geçersiz slot ID.', 422);

    $adminIsim = $_SESSION['user_ad'] ?? (string)($_SESSION['user_id'] ?? 'admin');
    logActivity($db, $adminIsim, "Ders slotu silindi (Slot ID: $id)");

    $stmt = mysqli_prepare($db, "DELETE FROM slotlar WHERE slot_id = ?");
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    success(['deleted' => $id]);
}

/* ── Helpers ── */
function getOrCreateHizmet($db, string $adi): int
{
    $stmt = mysqli_prepare($db, "SELECT hizmet_id FROM hizmetler WHERE LOWER(hizmet_adi) = LOWER(?)");
    mysqli_stmt_bind_param($stmt, 's', $adi);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $id);
    mysqli_stmt_fetch($stmt);
    mysqli_stmt_close($stmt);

    if ($id) return (int)$id;

    $ins = mysqli_prepare($db, "INSERT INTO hizmetler (hizmet_adi, kapasite, sure_dakika) VALUES (?, 20, 60)");
    mysqli_stmt_bind_param($ins, 's', $adi);
    mysqli_stmt_execute($ins);
    $newId = mysqli_insert_id($db);
    mysqli_stmt_close($ins);

    return (int)$newId;
}

function getJsonBody(): array
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
?>