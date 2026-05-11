<?php
/**
 * FIT GYM CLUB — Admin API (İşlem Logları)
 * Ders 09: mysqli kullanımı
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/auth-check.php';
require_once __DIR__ . '/../../helpers/response.php';

/* ════════════ logActivity() — diğer dosyalar kullanır ════════════ */
if (!function_exists('logActivity')) {
    function logActivity($db, string $adminIsim, string $action): void
    {
        // Ders 09: mysqli_prepare ile güvenli ekleme
        $stmt = mysqli_prepare($db, "INSERT INTO loglar (islem, admin_isim) VALUES (?, ?)");
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'ss', $action, $adminIsim);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    }
}

/* ════════════ API — doğrudan çağrıldığında ════════════ */
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

    requireAdmin();

    $result = mysqli_query($db,
        "SELECT log_id, islem, admin_isim, tarih
         FROM loglar
         ORDER BY tarih DESC
         LIMIT 100"
    );

    $logs = mysqli_fetch_all($result, MYSQLI_ASSOC);

    success(['data' => $logs]);
}
?>