FIT GYM CLUB - Veritabanı Yönetim Sistemli Spor Salonu Otomasyonu
Bu proje, modern bir spor salonunun ihtiyaç duyduğu üyelik, hizmet yönetimi ve rezervasyon süreçlerini uçtan uca yöneten web tabanlı bir sistemdir. PHP tabanlı monolitik bir mimari ile geliştirilmiştir.

Proje Mimarisi ve Teknik Detaylar
1. Veritabanı Modeli (MySQL)

Sistem, ilişkisel veritabanı prensiplerine göre tasarlanmış dört ana tablodan oluşur:

uyeler: Kullanıcı bilgilerini ve yetki seviyelerini (Uye/Admin) tutar.

hizmetler: Spor branşlarının tanımlandığı tablodur.

slotlar: Belirli bir hizmetin, belirli bir tarihteki saat dilimlerini ve kapasitesini yönetir.

rezervasyonlar: Üyeler ile slotlar arasındaki ilişkiyi kurar.

2. Güvenlik Katmanı

SQL Injection Koruması: Tüm veritabanı işlemleri PDO Prepared Statements kullanılarak modernize edilmiştir.

Parola Güvenliği: Kullanıcı şifreleri veritabanında password_hash() fonksiyonu ile şifrelenmiş olarak saklanır.

Oturum Yönetimi: PHP Session yönetimi ile yetkisiz erişimler engellenir (Auth Middleware).

3. Kullanıcı Özellikleri

Branş bazlı (Fitness, Pilates, Yüzme) ders listeleme.

Müsaitlik durumuna göre online rezervasyon oluşturma ve iptal etme.

Kişisel profil ve rezervasyon geçmişi takibi.

4. Yönetici (Admin) Özellikleri

Yeni hizmet ve slot ekleme/düzenleme.

Üye listesi görüntüleme ve yetkilendirme.

Rezervasyon doluluk oranlarını izleme.

Kurulum Yönergesi
Gereksinimler

PHP 8.0 veya üzeri

MySQL 5.7 veya üzeri

Web Sunucusu (Apache/Nginx veya PHP Yerleşik Sunucu)

Adımlar

Veritabanı Kurulumu:
MySQL arayüzünüzde fit_gym_db isminde bir veritabanı oluşturun ve sağlanan SQL şemasını içeri aktarın.

Konfigürasyon:
config/db.php dosyasındaki bağlantı parametrelerini yerel ortamınıza göre düzenleyin:

PHP
$host = '127.0.0.1';
$dbname = 'fit_gym_db';
$user = 'root';
$pass = 'sifreniz';
Sunucuyu Başlatma:
Terminal üzerinden proje klasöründe şu komutu çalıştırarak uygulamayı ayağa kaldırın:

Bash
php -S localhost:8000
