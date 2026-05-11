<?php
/**
 * FIT GYM CLUB - Veritabanı Bağlantı Dosyası
 * Ders 09: PHP + MySQL Uygulamalı Ders notlarına uygun hazırlanmıştır.
 */

$host    = "localhost";
$user    = "root";
$pass    = "";
$db_name = "fitgym_db";

// Bağlantıyı oluşturma (Ders 09, Sayfa 15)
$db = mysqli_connect($host, $user, $pass, $db_name);

// Bağlantı kontrolü (Ders 09, Sayfa 16)
if (!$db) {
    header('Content-Type: application/json');
    die(json_encode([
        'success' => false,
        'message' => 'Bağlantı hatası: ' . mysqli_connect_error()
    ]));
}

// Türkçe karakter desteği
mysqli_set_charset($db, "utf8");
?>