# 🏋️ FİT GYM CLUB — Web Projesi
Emine UYGUN -Helin BERK
Bu proje, bir spor salonu yönetim sisteminin **Frontend** ve **Backend** olarak ayrık mimaride geliştirilmiş halidir. Tüm veri iletişimi RESTful API endpoint'leri üzerinden Vanilla JavaScript Fetch API kullanılarak gerçekleştirilmektedir.

---

## 📂 Klasör Yapısı

```
school/
├── gym_frontend/                  → HTML, CSS, JS dosyaları (PHP yok)
│   ├── index.html                 → Ana sayfa
│   ├── pages/
│   │   ├── giris.html             → Giriş sayfası
│   │   ├── kayit.html             → Kayıt sayfası
│   │   ├── profil.html            → Üye profil sayfası
│   │   ├── hakkimizda.html        → Hakkımızda sayfası
│   │   ├── hizmetler.html         → Hizmetler & Paketler
│   │   └── odeme.html             → Ödeme sayfası
│   ├── admin/
│   │   ├── admin-panel.html       → Admin yönetim paneli
│   │   ├── admin.css
│   │   └── admin.js
│   ├── egitmen/
│   │   ├── egitmen-panel.html     → Eğitmen paneli
│   │   ├── egitmen.css
│   │   └── egitmen.js
│   └── js/
│       └── auth.js                → Giriş / Kayıt / Yönlendirme
│
└── gym_backend/                   → PHP API katmanı
    ├── api/
    │   ├── auth/
    │   │   ├── login.php
    │   │   ├── register.php
    │   │   └── logout.php
    │   ├── admin/
    │   │   ├── users.php
    │   │   ├── classes.php
    │   │   ├── packages.php
    │   │   ├── financials.php
    │   │   ├── logs.php
    │   │   └── members-list.php
    │   ├── trainer/
    │   │   └── trainer.php
    │   ├── reservations/
    │   │   ├── create.php
    │   │   ├── cancel.php
    │   │   ├── history.php
    │   │   └── slots.php
    │   ├── payments/
    │   │   └── pay.php
    │   └── members/
    │       ├── profile.php
    │       └── change-password.php
    ├── config/
    │   └── db.php
    ├── helpers/
    │   ├── auth-check.php
    │   ├── response.php
    │   └── validate.php
    └── database/
        └── fitgym_db.sql
```

---

## 🚀 Kurulum ve Çalıştırma

### 1. Veritabanı Yapılandırması

MySQL Workbench'te şu adımları izle:

- **File → Open SQL Script** → `gym_backend/database/fitgym_db.sql` dosyasını seç
- ⚡ **Run** butonuna tıkla — veritabanı, tablolar ve test verileri otomatik oluşur

Veya terminal ile:
```bash
mysql -u root -p < gym_backend/database/fitgym_db.sql
```

### 2. Sunucuyu Başlatma

```bash
# gym_backend/ dizininde:
cd gym_backend
php -S localhost:8000
```

### 3. Siteye Erişim

```
Ana Sayfa  : http://localhost:8000/gym_frontend/index.html
Giriş      : http://localhost:8000/gym_frontend/pages/giris.html
```

---

## 👤 Test Kullanıcı Bilgileri

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | `admin@fitgym.com` | `Admin123!` |
| Eğitmen | `ahmet@fitgym.com` | `password` |
| Eğitmen | `ayse@fitgym.com` | `password` |
| Üye | `test@fitgym.com` | `password` |

---

## 🔀 Giriş Yönlendirme

Tek giriş sayfası üzerinden rol'e göre otomatik yönlendirme:

```
giris.html → admin   → admin/admin-panel.html
giris.html → egitmen → egitmen/egitmen-panel.html
giris.html → uye     → pages/profil.html
```

---

## ⚙️ Teknik Yapı

| Katman | Teknoloji |
|--------|-----------|
| Frontend | HTML5, Bootstrap 5, Vanilla JS (Fetch API) |
| Backend | PHP 8.x, mysqli |
| Veritabanı | MySQL |
| Şifreleme | bcrypt (`password_hash`) |
| API | RESTful JSON |
| Oturum | PHP `session_start()` + `$_SESSION` |

---

## 🔐 Güvenlik

- Tüm sorgularda **Prepared Statements** — `mysqli_prepare` + `mysqli_stmt_bind_param` (SQL Injection önlemi)
- Şifreler **bcrypt** ile hashlenir (`password_hash` / `password_verify`)
- Rol bazlı erişim kontrolü (`requireAdmin`, `requireTrainerOrAdmin`)
- Session tabanlı kimlik doğrulama (`$_SESSION`)
- XSS koruması — `htmlspecialchars` (`validate.php`)

---

## 📋 API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/gym_backend/api/auth/login.php` | Giriş |
| POST | `/gym_backend/api/auth/register.php` | Kayıt |
| POST | `/gym_backend/api/auth/logout.php` | Çıkış |

### Admin
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/users.php?role=uye` | Üye listesi |
| GET | `/api/admin/users.php?role=egitmen` | Eğitmen listesi |
| POST | `/api/admin/users.php?role=uye` | Yeni üye ekle |
| DELETE | `/api/admin/users.php?role=uye&id=X` | Üye sil |
| GET | `/api/admin/classes.php` | Ders listesi |
| GET | `/api/admin/financials.php` | Dashboard istatistikleri |
| GET | `/api/admin/packages.php` | Paket satışları |
| GET | `/api/admin/logs.php` | İşlem logları |

### Eğitmen
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/trainer/trainer.php?action=my_classes` | Derslerim |
| GET | `/api/trainer/trainer.php?action=class_members&slot_id=X` | Ders üyeleri |
| POST | `/api/trainer/trainer.php?action=add_class` | Ders ekle |
| PUT | `/api/trainer/trainer.php?action=update_class` | Ders güncelle |
| PUT | `/api/trainer/trainer.php?action=update_reservation` | Rezervasyon onayla/reddet |
| DELETE | `/api/trainer/trainer.php?action=delete_class&slot_id=X` | Ders sil |

### Rezervasyon
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/reservations/create.php` | Rezervasyon oluştur |
| POST | `/api/reservations/cancel.php` | Rezervasyon iptal |
| GET | `/api/reservations/history.php` | Rezervasyon geçmişi |
| GET | `/api/reservations/slots.php?hizmet_id=X` | Müsait slotlar |

### Üye
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/members/profile.php` | Profil getir |
| POST | `/api/members/profile.php` | Profil güncelle |
| POST | `/api/members/change-password.php` | Şifre değiştir |
| POST | `/api/payments/pay.php` | Ödeme / Üyelik yenile |

---

## 🗄️ Veritabanı Şeması

| Tablo | Açıklama |
|-------|----------|
| `uyeler` | Kullanıcılar (uye / egitmen / admin rolleri) |
| `hizmetler` | Ders türleri (Pilates, Yoga, Fitness...) |
| `slotlar` | Ders slotları (tarih, saat, eğitmen, kapasite) |
| `rezervasyonlar` | Üye rezervasyonları (beklemede / onaylandi / iptal) |
| `paket_satislar` | Üyelik paket satışları |
| `loglar` | Admin işlem logları |

---

*© 2026 FIT GYM CLUB — THE KINETIC VAULT*
