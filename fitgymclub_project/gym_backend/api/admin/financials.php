<?php
/**
 * FIT GYM CLUB — Finansal Özet API
 * Ders 09: mysqli kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireAdmin();

// Toplam üye
$r1 = mysqli_query($db, "SELECT COUNT(*) AS toplam FROM uyeler WHERE rol = 'uye'");
$totalMembers = (int)mysqli_fetch_assoc($r1)['toplam'];

// Toplam gelir
$r2 = mysqli_query($db, "SELECT COALESCE(SUM(tutar), 0) AS toplam FROM paket_satislar");
$totalRevenue = (float)mysqli_fetch_assoc($r2)['toplam'];

// Bu ay yeni üye
$r3 = mysqli_query($db,
    "SELECT COUNT(*) AS toplam FROM uyeler
     WHERE rol = 'uye'
       AND MONTH(kayit_tarihi) = MONTH(NOW())
       AND YEAR(kayit_tarihi)  = YEAR(NOW())"
);
$newThisMonth = (int)mysqli_fetch_assoc($r3)['toplam'];

// Aktif ders slotu
$r4 = mysqli_query($db, "SELECT COUNT(*) AS toplam FROM slotlar WHERE tarih >= CURDATE()");
$activeSlots = (int)mysqli_fetch_assoc($r4)['toplam'];

// Son 5 satış
$r5 = mysqli_query($db,
    "SELECT p.paket_adi, p.tutar, p.odeme_tarihi, u.ad, u.soyad
     FROM paket_satislar p
     JOIN uyeler u ON p.uye_id = u.uye_id
     ORDER BY p.odeme_tarihi DESC
     LIMIT 5"
);
$recentSales = mysqli_fetch_all($r5, MYSQLI_ASSOC);

success([
    'total_members'  => $totalMembers,
    'total_revenue'  => $totalRevenue,
    'new_this_month' => $newThisMonth,
    'active_slots'   => $activeSlots,
    'recent_sales'   => $recentSales,
]);
?>