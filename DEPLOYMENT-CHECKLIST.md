# Deployment Checklist — Digital Sablon Studio

Dokumen ini adalah gerbang sebelum aplikasi dipasang pada server publik. CI yang hijau tidak berarti aplikasi sudah siap produksi: pengujian browser, konfigurasi domain, dan uji Gemini live tetap harus dilakukan.

## 1. Konfigurasi environment backend

Buat environment production di server, jangan menyalin file .env lokal ke Git.

APP_NAME="Digital Sablon Studio"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
APP_KEY=generate-once-on-server

LOG_LEVEL=warning
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=digital_sablon_studio
DB_USERNAME=REPLACE_WITH_DB_USER
DB_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

FILESYSTEM_DISK=local
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

# Exact frontend origin; comma-separate multiple origins.
CORS_ALLOWED_ORIGINS=https://app.example.com

Ganti semua domain dan kredensial contoh dengan nilai server yang sebenarnya. Gunakan secret manager atau environment variables milik hosting untuk APP_KEY, password database, dan GEMINI_API_KEY. Jangan pernah menaruh rahasia di variabel frontend VITE_*.

- Jalankan php artisan key:generate hanya untuk instalasi baru.
- Pastikan database produksi sudah dibuat dan user database hanya memiliki hak yang diperlukan.
- Simpan APP_DEBUG=false; jangan aktifkan debug pada server publik.
- Pakai HTTPS untuk frontend dan API. Jangan mengirim Bearer Token melalui HTTP.
- Set GEMINI_API_KEY hanya jika fitur AI akan diuji/digunakan; rahasia ini hanya berada di backend.
- Jika frontend dan API memakai domain/subdomain berbeda, isi CORS_ALLOWED_ORIGINS dengan origin frontend yang persis, termasuk skema HTTPS dan port jika ada.

## 2. Konfigurasi frontend

Set variabel saat build frontend:

VITE_API_BASE_URL=https://api.example.com/api/v1

Vite memasukkan variabel VITE_* ke bundle browser. Isinya harus berupa URL API publik, bukan API key, password, atau secret.

## 3. CORS dan autentikasi

Backend menyediakan config/cors.php dengan daftar origin dari CORS_ALLOWED_ORIGINS. Aplikasi saat ini mengirim Sanctum personal access token sebagai header Authorization: Bearer ..., bukan autentikasi cookie SPA.

- Daftarkan hanya origin frontend yang dipercaya; jangan gunakan wildcard untuk deployment publik.
- supports_credentials sengaja false karena frontend tidak menggunakan cookie lintas-origin.
- Pastikan proxy/reverse proxy meneruskan header Authorization ke PHP.
- Jangan mencatat nilai token pada access log, application log, analytics, atau laporan bug.
- Pastikan endpoint privat tetap memerlukan autentikasi dan resource hanya dapat diakses pemiliknya.
- Setelah mengubah environment/config, jalankan php artisan optimize:clear, kemudian php artisan config:cache.

## 4. Penyimpanan aset dan izin filesystem

Uploaded assets disimpan melalui disk local pada storage/app/private dan diambil melalui endpoint terautentikasi. Pertahankan penyimpanan ini sebagai privat.

- Jangan memindahkan uploaded-assets ke public/storage dan jangan membuat URL publik langsung untuk aset desain pengguna.
- Pastikan user proses web dapat menulis ke direktori storage dan bootstrap/cache.
- Backup database dan storage/app/private; backup database saja tidak cukup untuk memulihkan gambar.
- Uji pemulihan backup di lingkungan staging.
- Periksa kebijakan retensi dan penghapusan file yatim sebelum membuat job pembersihan otomatis.

## 5. Upload dan batas request

Batas upload aplikasi adalah 15 MB. Sesuaikan seluruh lapisan agar request tidak ditolak lebih awal:

- PHP: upload_max_filesize minimal 20M, post_max_size minimal 24M, memory_limit disesuaikan dengan beban.
- Web server/reverse proxy: batas body request harus lebih besar dari 15 MB.
- Uji PNG, JPEG, WEBP valid, file rusak, tipe MIME palsu, dan file lebih besar dari batas.
- Jangan menaikkan batas upload tanpa mempertimbangkan memori, bandwidth, dan kapasitas disk.

## 6. Perintah deployment backend

Lakukan maintenance window ketika menjalankan migrasi atau perubahan yang tidak kompatibel:

composer install --no-dev --prefer-dist --optimize-autoloader
php artisan down
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up

Jalankan perintah dari direktori backend. Pastikan deployment pipeline mengembalikan aplikasi dari maintenance mode jika proses gagal. Jangan menjalankan migrate:fresh pada database produksi.

## 7. Pemeriksaan pascadeploy

- [ ] GET /up memberikan status sehat.
- [ ] Frontend production dapat memuat katalog dari API.
- [ ] Login, refresh halaman, dan logout berfungsi; token tidak bocor ke log.
- [ ] Pengguna A tidak dapat membaca proyek/aset milik pengguna B.
- [ ] Upload dan buka kembali PNG, JPEG, dan WEBP berhasil.
- [ ] File aset tidak dapat dibuka tanpa autentikasi.
- [ ] Simpan, buka, perbarui, dan hapus proyek bekerja setelah deploy.
- [ ] CORS menerima origin frontend resmi dan menolak origin yang tidak terdaftar.
- [ ] Model GLB dapat dimuat melalui HTTPS; periksa ukuran respons dan cache.
- [ ] Ekspor PNG mempertahankan transparansi, dimensi, dan metadata DPI yang diharapkan.
- [ ] Log tidak menampilkan API key, password, token, atau isi gambar pengguna.
- [ ] Backup database dan storage privat telah dijadwalkan dan uji restore berhasil.

## 8. Validasi Gemini live

Jangan menganggap endpoint AI siap hanya karena tes otomatis memakai provider mock.

- Pastikan key dan model tersedia untuk project Google AI Studio yang benar.
- Uji satu permintaan normal terlebih dahulu, lalu catat status HTTP, durasi, model aktual, hasil parsing, dan fallback yang dipakai.
- Uji perilaku 429, 503, timeout, respons malformed, dan payload gambar terlalu besar.
- Jangan melakukan retry tanpa batas; patuhi rate limit dan batas waktu aplikasi.
- Jangan simpan gambar pengguna atau prompt yang berisi data pribadi pada log diagnostik.
- Jika provider gagal, UI harus menampilkan status gagal yang jelas dan tidak mengarang rekomendasi.

## 9. Batas klaim kesiapan

Deployment baru boleh dinyatakan lulus setelah checklist ini dijalankan pada domain dan server target. Hasil GitHub Actions hanya membuktikan pemeriksaan otomatis pada lingkungan CI, bukan konfigurasi server, keamanan domain, performa beban, keberhasilan Gemini live, atau kualitas hasil cetak fisik.
