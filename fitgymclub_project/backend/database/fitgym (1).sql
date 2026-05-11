-- ============================================================
-- FIT GYM CLUB — Veritabanı
-- fitgym_db.sql
-- ============================================================

/*mysql -u root -p < fitgym_db.sql*/ 

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Veritabanı ──────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS fitgym_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitgym_db;

-- ── Tablolar ────────────────────────────────────────────────

-- 1. uyeler
DROP TABLE IF EXISTS uyeler;
CREATE TABLE uyeler (
  uye_id              INT           NOT NULL AUTO_INCREMENT,
  ad                  VARCHAR(50)   NOT NULL,
  soyad               VARCHAR(50)   NOT NULL,
  email               VARCHAR(100)  NOT NULL,
  telefon             VARCHAR(15)   DEFAULT NULL,
  dogum_tarihi        DATE          DEFAULT NULL,
  sifre               VARCHAR(255)  NOT NULL,
  uyelik_tipi         ENUM('temel','standart','premium') DEFAULT 'temel',
  rol                 ENUM('uye','egitmen','admin')      DEFAULT 'uye',
  kayit_tarihi        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  uyelik_bitis_tarihi DATE          DEFAULT NULL,
  PRIMARY KEY (uye_id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. hizmetler
DROP TABLE IF EXISTS hizmetler;
CREATE TABLE hizmetler (
  hizmet_id   INT          NOT NULL AUTO_INCREMENT,
  hizmet_adi  VARCHAR(100) NOT NULL,
  aciklama    TEXT         DEFAULT NULL,
  kapasite    INT          NOT NULL DEFAULT 20,
  sure_dakika INT          NOT NULL DEFAULT 60,
  PRIMARY KEY (hizmet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. slotlar
DROP TABLE IF EXISTS slotlar;
CREATE TABLE slotlar (
  slot_id          INT  NOT NULL AUTO_INCREMENT,
  hizmet_id        INT  DEFAULT NULL,
  egitmen_id       INT  DEFAULT NULL,
  tarih            DATE NOT NULL,
  baslangic_saati  TIME NOT NULL,
  bitis_saati      TIME NOT NULL,
  max_kapasite     INT  NOT NULL DEFAULT 20,
  mevcut_kapasite  INT  NOT NULL DEFAULT 20,
  PRIMARY KEY (slot_id),
  KEY hizmet_id (hizmet_id),
  KEY egitmen_id (egitmen_id),
  CONSTRAINT slotlar_ibfk_1 FOREIGN KEY (hizmet_id)  REFERENCES hizmetler (hizmet_id) ON DELETE CASCADE,
  CONSTRAINT slotlar_ibfk_2 FOREIGN KEY (egitmen_id) REFERENCES uyeler    (uye_id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. rezervasyonlar
DROP TABLE IF EXISTS rezervasyonlar;
CREATE TABLE rezervasyonlar (
  rezervasyon_id    INT  NOT NULL AUTO_INCREMENT,
  uye_id            INT  DEFAULT NULL,
  slot_id           INT  DEFAULT NULL,
  rezervasyon_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  durum             ENUM('beklemede','onaylandi','iptal') DEFAULT 'beklemede',
  PRIMARY KEY (rezervasyon_id),
  KEY uye_id  (uye_id),
  KEY slot_id (slot_id),
  CONSTRAINT rezervasyonlar_ibfk_1 FOREIGN KEY (uye_id)  REFERENCES uyeler  (uye_id)  ON DELETE CASCADE,
  CONSTRAINT rezervasyonlar_ibfk_2 FOREIGN KEY (slot_id) REFERENCES slotlar (slot_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. paket_satislar
DROP TABLE IF EXISTS paket_satislar;
CREATE TABLE paket_satislar (
  satis_id      INT            NOT NULL AUTO_INCREMENT,
  uye_id        INT            DEFAULT NULL,
  paket_adi     VARCHAR(100)   NOT NULL,
  tutar         DECIMAL(10,2)  NOT NULL,
  odeme_tarihi  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (satis_id),
  KEY uye_id (uye_id),
  CONSTRAINT paket_satislar_ibfk_1 FOREIGN KEY (uye_id) REFERENCES uyeler (uye_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. loglar
DROP TABLE IF EXISTS loglar;
CREATE TABLE loglar (
  log_id      INT          NOT NULL AUTO_INCREMENT,
  islem       TEXT         NOT NULL,
  admin_isim  VARCHAR(100) DEFAULT NULL,
  tarih       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Test Verileri ────────────────────────────────────────────

-- Kullanıcılar
-- Şifreler: Admin123! → admin, password → diğerleri
INSERT INTO uyeler (ad, soyad, email, telefon, sifre, uyelik_tipi, rol) VALUES
('Admin',  'Sistem',  'admin@fitgym.com',  NULL,          '$2y$12$fU5l0v17DZ1yQhBermLi9uJtYM2qJbeX9Pac9Y/iI7FzENGGaIA3S', 'temel',    'admin'),
('Ahmet',  'Hoca',    'ahmet@fitgym.com',  '05551234567', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'temel',    'egitmen'),
('Ayşe',   'Eğitmen', 'ayse@fitgym.com',   '05557654321', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'temel',    'egitmen'),
('Test',   'Member',  'test@fitgym.com',   NULL,          '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'standart', 'uye'),
('Helin',  'Berk',    'heliinberk@gmail.com', '05530454939', '$2y$12$ZaoWLGzINlZgfGPKo/oTk.y0RYM3bOyMXEj8R.UgGKFIAtqjT7fF2', 'temel',  'uye'),
('Emine',  'Uygun',   'emine@fitgym.com',  NULL,          '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'premium',  'uye');

-- Hizmetler
INSERT INTO hizmetler (hizmet_adi, aciklama, kapasite, sure_dakika) VALUES
('Pilates',  'Core gücü ve esneklik odaklı reformer seansları', 15, 60),
('Yoga',     'Ruhsal denge ve esneklik egzersizleri',           12, 60),
('Fitness',  'Kişisel ağırlık antrenmanları',                   20, 60),
('Boks',     'Yüksek yoğunluklu kardiyo ve teknik vuruş',       10, 60),
('Zumba',    'Yüksek enerjili dans egzersizleri',               20, 45);

-- Slotlar (egitmen_id=2 → Ahmet)
INSERT INTO slotlar (hizmet_id, egitmen_id, tarih, baslangic_saati, bitis_saati, max_kapasite, mevcut_kapasite) VALUES
(1, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  '10:00:00', '11:00:00', 15, 15),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  '14:00:00', '15:00:00', 12, 10),
(3, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  '11:00:00', '12:00:00', 20, 18),
(1, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  '18:00:00', '19:00:00', 15, 12),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY),  '09:00:00', '10:00:00', 12,  8),
(4, 2, DATE_ADD(CURDATE(), INTERVAL 4 DAY),  '19:00:00', '20:00:00', 10,  6),
(5, 2, DATE_ADD(CURDATE(), INTERVAL 5 DAY),  '10:00:00', '10:45:00', 20, 15);

-- Paket Satışları
INSERT INTO paket_satislar (uye_id, paket_adi, tutar) VALUES
(4, 'Standart Aylık', 850.00),
(5, 'Temel Aylık',    550.00),
(6, 'Premium Aylık', 1250.00),
(4, 'Standart Aylık', 850.00);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Giriş Bilgileri:
--   Admin   : admin@fitgym.com   / Admin123!
--   Eğitmen : ahmet@fitgym.com   / password
--   Eğitmen : ayse@fitgym.com    / password
--   Üye     : test@fitgym.com    / password
--   Üye     : heliinberk@gmail.com / (mevcut şifre)
-- ============================================================