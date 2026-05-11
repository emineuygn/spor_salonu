<?php
/**
 * FIT GYM CLUB — Eğitmen API (Trainer Panel)
 * Endpoint : gym_backend/api/trainer/trainer.php
 * Ders 09: mysqli_prepare + mysqli_stmt_bind_param kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireTrainerOrAdmin();

$action = trim($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

if      ($method === 'GET'    && $action === 'my_classes')         getMyClasses($db);
elseif  ($method === 'GET'    && $action === 'class_members')      getClassMembers($db);
elseif  ($method === 'GET'    && $action === 'all_services')       getAllServices($db);
elseif  ($method === 'POST'   && $action === 'add_class')          addClass($db);
elseif  ($method === 'PUT'    && $action === 'update_class')       updateClass($db);
elseif  ($method === 'PUT'    && $action === 'update_reservation') updateReservation($db);
elseif  ($method === 'DELETE' && $action === 'delete_class')       deleteClass($db);
else    error("Geçersiz action veya metot: $method/$action", 400);

/* ════════════ GET: Eğitmenin Dersleri ════════════ */
function getMyClasses($db): void
{
    $trainerId = (int)$_SESSION['user_id'];
    $search    = trim($_GET['search'] ?? '');
    $tarih     = trim($_GET['tarih']  ?? '');

    $where  = ['s.egitmen_id = ?'];
    $types  = 'i';
    $params = [$trainerId];

    if ($search !== '') {
        $where[]  = 'h.hizmet_adi LIKE ?';
        $types   .= 's';
        $s        = '%' . $search . '%';
        $params[] = $s;
    }
    if ($tarih !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih)) {
        $where[]  = 's.tarih = ?';
        $types   .= 's';
        $params[] = $tarih;
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $sql = "SELECT s.slot_id, h.hizmet_adi, s.tarih,
                   s.baslangic_saati, s.bitis_saati,
                   s.max_kapasite, s.mevcut_kapasite,
                   (s.max_kapasite - s.mevcut_kapasite) AS kayitli_uye_sayisi
            FROM slotlar s
            JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
            $whereSql
            ORDER BY s.tarih DESC, s.baslangic_saati ASC";

    $stmt = mysqli_prepare($db, $sql);
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    mysqli_stmt_execute($stmt);
    $result  = mysqli_stmt_get_result($stmt);
    $classes = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    success(['classes' => $classes]);
}

/* ════════════ GET: Derse Kayıtlı Üyeler ════════════ */
function getClassMembers($db): void
{
    $trainerId = (int)$_SESSION['user_id'];
    $slotId    = (int)($_GET['slot_id'] ?? 0);

    if ($slotId < 1) error('Geçersiz slot ID.', 422);

    // Sahiplik kontrolü
    $chk = mysqli_prepare($db, "SELECT COUNT(*) FROM slotlar WHERE slot_id = ? AND egitmen_id = ?");
    mysqli_stmt_bind_param($chk, 'ii', $slotId, $trainerId);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $count);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ((int)$count === 0) error('Bu derse erişim yetkiniz yok.', 403);

    // Üyeler
    $stmt = mysqli_prepare($db,
        "SELECT u.uye_id, u.ad, u.soyad, u.email, u.telefon,
                r.rezervasyon_id, r.rezervasyon_tarihi, r.durum
         FROM rezervasyonlar r
         JOIN uyeler u ON r.uye_id = u.uye_id
         WHERE r.slot_id = ?
         ORDER BY r.rezervasyon_tarihi ASC"
    );
    mysqli_stmt_bind_param($stmt, 'i', $slotId);
    mysqli_stmt_execute($stmt);
    $result  = mysqli_stmt_get_result($stmt);
    $members = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    // Slot bilgisi
    $si = mysqli_prepare($db,
        "SELECT h.hizmet_adi, s.tarih, s.baslangic_saati, s.bitis_saati
         FROM slotlar s
         JOIN hizmetler h ON s.hizmet_id = h.hizmet_id
         WHERE s.slot_id = ?"
    );
    mysqli_stmt_bind_param($si, 'i', $slotId);
    mysqli_stmt_execute($si);
    $slotResult = mysqli_stmt_get_result($si);
    $slot       = mysqli_fetch_assoc($slotResult);
    mysqli_stmt_close($si);

    success(['slot' => $slot, 'members' => $members]);
}

/* ════════════ GET: Tüm Hizmetler ════════════ */
function getAllServices($db): void
{
    $result   = mysqli_query($db, "SELECT hizmet_id, hizmet_adi FROM hizmetler ORDER BY hizmet_adi");
    $services = mysqli_fetch_all($result, MYSQLI_ASSOC);
    success(['services' => $services]);
}

/* ════════════ POST: Yeni Ders Ekle ════════════ */
function addClass($db): void
{
    $trainerId   = (int)$_SESSION['user_id'];
    $body        = getJsonBody();
    $hizmetId    = (int)($body['hizmet_id']     ?? 0);
    $tarih       = trim($body['tarih']           ?? '');
    $baslangic   = trim($body['baslangic_saati'] ?? '');
    $bitis       = trim($body['bitis_saati']     ?? '');
    $maxKapasite = (int)($body['max_kapasite']   ?? 0);

    if (!$hizmetId || !$tarih || !$baslangic || !$bitis || $maxKapasite < 1) {
        error('Tüm alanlar zorunludur.', 422);
    }
    if ($tarih < date('Y-m-d')) {
        error('Geçmiş bir tarihe ders eklenemez.', 422);
    }

    // Çakışma kontrolü
    $chk = mysqli_prepare($db,
        "SELECT COUNT(*) FROM slotlar
         WHERE egitmen_id = ? AND tarih = ?
           AND baslangic_saati < ? AND bitis_saati > ?"
    );
    mysqli_stmt_bind_param($chk, 'isss', $trainerId, $tarih, $bitis, $baslangic);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $conflict);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ((int)$conflict > 0) error('Bu saatte başka bir dersiniz var.', 409);

    $stmt = mysqli_prepare($db,
        "INSERT INTO slotlar (hizmet_id, egitmen_id, tarih, baslangic_saati, bitis_saati, max_kapasite, mevcut_kapasite)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    mysqli_stmt_bind_param($stmt, 'iisssii', $hizmetId, $trainerId, $tarih, $baslangic, $bitis, $maxKapasite, $maxKapasite);
    mysqli_stmt_execute($stmt);
    $slotId = mysqli_insert_id($db);
    mysqli_stmt_close($stmt);

    success(['slot_id' => $slotId], 201);
}

/* ════════════ PUT: Ders Güncelle ════════════ */
function updateClass($db): void
{
    $trainerId   = (int)$_SESSION['user_id'];
    $body        = getJsonBody();
    $slotId      = (int)($body['slot_id']       ?? 0);
    $baslangic   = trim($body['baslangic_saati'] ?? '');
    $bitis       = trim($body['bitis_saati']     ?? '');
    $maxKapasite = (int)($body['max_kapasite']   ?? 0);

    if ($slotId < 1) error('Geçersiz slot ID.', 422);

    // Sahiplik kontrolü
    $chk = mysqli_prepare($db, "SELECT COUNT(*) FROM slotlar WHERE slot_id = ? AND egitmen_id = ?");
    mysqli_stmt_bind_param($chk, 'ii', $slotId, $trainerId);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $count);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ((int)$count === 0) error('Bu dersi düzenleme yetkiniz yok.', 403);

    $upd = mysqli_prepare($db,
        "UPDATE slotlar SET baslangic_saati = ?, bitis_saati = ?, max_kapasite = ? WHERE slot_id = ?"
    );
    mysqli_stmt_bind_param($upd, 'ssii', $baslangic, $bitis, $maxKapasite, $slotId);
    mysqli_stmt_execute($upd);
    $affected = mysqli_stmt_affected_rows($upd);
    mysqli_stmt_close($upd);

    success(['updated' => $affected]);
}

/* ════════════ PUT: Rezervasyon Onayla / Reddet ════════════ */
function updateReservation($db): void
{
    $trainerId = (int)$_SESSION['user_id'];
    $body      = getJsonBody();
    $rezId     = (int)($body['rezervasyon_id'] ?? 0);
    $islem     = trim($body['islem'] ?? '');

    if ($rezId < 1) error('Geçersiz rezervasyon ID.', 422);
    if (!in_array($islem, ['onayla', 'iptal'], true)) error('Geçersiz işlem.', 422);

    // Sahiplik kontrolü
    $chk = mysqli_prepare($db,
        "SELECT COUNT(*) FROM rezervasyonlar r
         JOIN slotlar s ON r.slot_id = s.slot_id
         WHERE r.rezervasyon_id = ? AND s.egitmen_id = ?"
    );
    mysqli_stmt_bind_param($chk, 'ii', $rezId, $trainerId);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $count);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ((int)$count === 0) error('Bu rezervasyona erişim yetkiniz yok.', 403);

    $yeniDurum = $islem === 'onayla' ? 'onaylandi' : 'iptal';

    $upd = mysqli_prepare($db, "UPDATE rezervasyonlar SET durum = ? WHERE rezervasyon_id = ?");
    mysqli_stmt_bind_param($upd, 'si', $yeniDurum, $rezId);
    mysqli_stmt_execute($upd);
    mysqli_stmt_close($upd);

    success(['updated' => $rezId, 'durum' => $yeniDurum]);
}

/* ════════════ DELETE: Ders Sil ════════════ */
function deleteClass($db): void
{
    $trainerId = (int)$_SESSION['user_id'];
    $slotId    = (int)($_GET['slot_id'] ?? 0);

    if ($slotId < 1) error('Geçersiz slot ID.', 422);

    // Sahiplik kontrolü
    $chk = mysqli_prepare($db, "SELECT COUNT(*) FROM slotlar WHERE slot_id = ? AND egitmen_id = ?");
    mysqli_stmt_bind_param($chk, 'ii', $slotId, $trainerId);
    mysqli_stmt_execute($chk);
    mysqli_stmt_bind_result($chk, $count);
    mysqli_stmt_fetch($chk);
    mysqli_stmt_close($chk);
    if ((int)$count === 0) error('Bu dersi silme yetkiniz yok.', 403);

    // Onaylanmış rezervasyon var mı?
    $res = mysqli_prepare($db,
        "SELECT COUNT(*) FROM rezervasyonlar WHERE slot_id = ? AND durum = 'onaylandi'"
    );
    mysqli_stmt_bind_param($res, 'i', $slotId);
    mysqli_stmt_execute($res);
    mysqli_stmt_bind_result($res, $resCount);
    mysqli_stmt_fetch($res);
    mysqli_stmt_close($res);
    if ((int)$resCount > 0) error('Onaylanmış rezervasyonu olan ders silinemez.', 409);

    $del = mysqli_prepare($db, "DELETE FROM slotlar WHERE slot_id = ?");
    mysqli_stmt_bind_param($del, 'i', $slotId);
    mysqli_stmt_execute($del);
    mysqli_stmt_close($del);

    success(['deleted' => $slotId]);
}

/* ── Helper ── */
function getJsonBody(): array
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
?>