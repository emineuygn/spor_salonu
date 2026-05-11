<?php
/**
 * FIT GYM CLUB — Çıkış API
 * Ders 08: session_destroy() kullanımı
 */

header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json; charset=UTF-8');

// Ders 08: Oturumu başlat ve yok et
session_start();
session_unset();
session_destroy();

echo json_encode(['success' => true, 'message' => 'Çıkış yapıldı.']);
?>