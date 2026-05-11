<?php
/**
 * FIT GYM CLUB — Oturum & Yetki Kontrolü
 * Ders 08: Session kullanımına uygun hazırlanmıştır.
 */

require_once __DIR__ . '/response.php';

function requireAdmin(): void
{
    if (session_status() === PHP_SESSION_NONE) session_start();

    if (empty($_SESSION['user_id'])) {
        error('Oturum açmanız gerekiyor.', 401);
    }
    if (($_SESSION['rol'] ?? '') !== 'admin') {
        error('Bu işlem için yönetici yetkisi gereklidir.', 403);
    }
}

function requireTrainerOrAdmin(): void
{
    if (session_status() === PHP_SESSION_NONE) session_start();

    if (empty($_SESSION['user_id'])) {
        error('Oturum açmanız gerekiyor.', 401);
    }
    if (!in_array($_SESSION['rol'] ?? '', ['egitmen', 'admin'], true)) {
        error('Bu alana erişim için eğitmen veya yönetici yetkisi gereklidir.', 403);
    }
}
?>