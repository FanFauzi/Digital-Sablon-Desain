# Digital Sablon Studio

Aplikasi web untuk kustomisasi desain kaos dan hoodie: editor 2D berbasis Fabric.js, preview/configurator 3D, penyimpanan proyek, dan ekspor file produksi sablon.

> **Status:** prototype fungsional dalam tahap finalisasi. Pemeriksaan lint, build, unit test frontend, integritas aset GLB, dan PHPUnit backend dijalankan melalui GitHub Actions. Uji visual browser, alur end-to-end, validasi file produksi, dan pengukuran hasil cetak fisik masih menjadi gerbang finalisasi. Integrasi Gemini sudah ada di backend, tetapi keberhasilan layanan AI secara live masih perlu divalidasi dengan API key dan kuota aktif.

## Fitur utama

- Autentikasi pengguna dan pembatasan akses proyek/aset berdasarkan pemilik.
- Katalog produk dan pilihan model Regular T-Shirt, Oversized T-Shirt, serta Classic Hoodie.
- Editor 2D Fabric.js: upload PNG/JPG/WEBP, teks, geser, skala, rotasi, layer, duplikasi, hapus, undo, dan redo.
- Area desain terpisah untuk depan, belakang, lengan kiri, dan lengan kanan.
- Preset penempatan desain serta preview pakaian 3D menggunakan Three.js / React Three Fiber.
- Pengaturan warna dan ukuran, latar studio, tekstur kain, efek visual, dan gerakan model.
- Simpan, buka, perbarui, dan hapus proyek cloud; proyek lokal lama tetap dapat dibaca.
- Ekspor file cetak PNG transparan berdasarkan ukuran fisik area cetak dan metadata DPI.
- Ekspor mockup 3D PNG/JPG, model GLB, dan video jika didukung browser.
- Endpoint analisis gambar Gemini yang dilindungi autentikasi dan pembatasan permintaan.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React, Vite, JavaScript |
| Editor 2D | Fabric.js 7 |
| Preview 3D | Three.js, React Three Fiber |
| State | Zustand |
| HTTP client | Axios |
| Backend | PHP 8.3+, Laravel 13, Sanctum |
| Database | SQLite untuk setup lokal sederhana; MySQL/MariaDB juga dapat digunakan |
| Tes backend | PHPUnit melalui `php artisan test` |
| Tes frontend | Node.js built-in test runner (`node --test`) |

## Struktur repository

```text
.
├── frontend/
│   ├── public/models/                 # Aset model GLB
│   └── src/
│       ├── features/editor/           # Canvas Fabric.js, analisis, ekspor
│       ├── features/configurator/     # Viewer 3D, model, store, konfigurator
│       ├── pages/                     # Halaman aplikasi
│       └── services/                  # API, aset, proyek, penyimpanan lokal
├── backend/
│   ├── app/Http/Controllers/Api/V1/   # API proyek, aset, analisis
│   ├── database/                      # Migration dan seeder
│   └── tests/                          # Feature/unit tests Laravel
├── .github/workflows/quality.yml      # CI lint, tests, build, validasi GLB
├── PRD.md
└── PRD-3D-CONFIGURATOR.md
```

## Persyaratan lokal

- PHP 8.3 atau lebih baru beserta ekstensi Laravel yang diperlukan (minimal PDO untuk database, cURL, Fileinfo, GD, OpenSSL, Mbstring, XML).
- Composer 2.
- Node.js 22 LTS dan npm.
- SQLite (default) atau MySQL/MariaDB.
- Browser modern dengan WebGL aktif untuk preview 3D.

## Menjalankan aplikasi di Windows (PowerShell)

### 1. Clone repository dan pilih branch kerja

```powershell
git clone https://github.com/FanFauzi/Digital-Sablon-Desain.git
cd Digital-Sablon-Desain
git checkout fix/fabric-canvas-print-area
```

### 2. Siapkan backend Laravel

```powershell
cd backend
Copy-Item .env.example .env
composer install
php artisan key:generate
```

Konfigurasi default memakai SQLite. Buat file database bila belum ada:

```powershell
New-Item -ItemType File -Path database/database.sqlite -Force
php artisan migrate --seed
```

Jalankan API:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

API lokal berjalan pada `http://127.0.0.1:8000`.

**Menggunakan MySQL/MariaDB:** buat database terlebih dahulu, lalu ubah bagian database di `backend/.env` menjadi misalnya:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=digital_sablon_studio
DB_USERNAME=root
DB_PASSWORD=
```

Sesuaikan username/password dengan instalasi lokal, lalu jalankan `php artisan migrate --seed`.

### 3. Siapkan frontend React

Buka terminal PowerShell baru dari root repository:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Nilai API default di `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Buka URL Vite yang ditampilkan di terminal (umumnya `http://localhost:5173`). Pastikan backend tetap berjalan.

## Konfigurasi Gemini (opsional selama validasi AI)

Kunci Gemini hanya boleh ditempatkan pada environment backend, bukan variabel `VITE_*` di frontend:

```dotenv
GEMINI_API_KEY=isi_api_key_di_mesin_lokal
GEMINI_MODEL=gemini-3.8-flash
```

Model dan kuota API perlu diperiksa pada Google AI Studio untuk project/key yang digunakan. Endpoint analisis dibatasi autentikasi dan maksimal tiga permintaan per menit per pengguna/rute. Jangan commit file `.env`, API key, token, atau kredensial ke Git.

## Pemeriksaan kualitas

Dari direktori `frontend`:

```powershell
npm ci
npm test
npm run lint
npm run build
```

Dari direktori `backend`:

```powershell
composer install
php artisan test
```

GitHub Actions menjalankan pemeriksaan frontend dan backend tersebut serta memvalidasi ukuran, header, struktur JSON, dan lima mesh wajib pada model oversized.

## Catatan penting untuk finalisasi

1. Jalankan skenario browser dari [FINAL-ACCEPTANCE-CHECKLIST.md](./FINAL-ACCEPTANCE-CHECKLIST.md), terutama pergantian sisi, preset, save/load antarproyek, dan ekspor 300 DPI.
2. Periksa file PNG hasil ekspor dengan aplikasi pembaca metadata; cocokkan dimensi piksel, metadata pHYs/DPI, transparansi, dan ukuran fisik yang diminta. Metadata 300 DPI tidak menggantikan validasi kualitas gambar sumber.
3. Lakukan uji langsung Gemini setelah API key, model, dan kuota aktif. Catat waktu respons, status HTTP, keberhasilan parsing rekomendasi, dan perilaku saat 429/503/timeout.
4. Sebelum deployment, gunakan HTTPS, `APP_ENV=production`, `APP_DEBUG=false`, database produksi, kebijakan CORS yang ketat, penyimpanan aset privat, backup, serta secret manager/environment variables.
5. Jangan menganggap hasil CI sebagai pengganti pengujian visual lintas browser maupun uji cetak fisik.

## Branch pengembangan

Branch pengembangan yang digunakan saat ini: `fix/fabric-canvas-print-area`. Perubahan belum otomatis digabung ke `main`.
