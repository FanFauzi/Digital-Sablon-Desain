# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# DIGITAL SABLON STUDIO
### Aplikasi Web Kustomisasi Desain Kaos dan Hoodie dengan Editor Digital, Preview 3D, dan Rekomendasi AI Multimodal

| Informasi | Keterangan |
|---|---|
| Nama Produk | Digital Sablon Studio |
| Jenis Produk | Web Application |
| Versi Dokumen | 1.0 |
| Tanggal | 10 November 2026 |
| Status Dokumen | Draft – Berdasarkan implementasi berjalan |
| Platform | Web Desktop dan Responsive Web |
| Repository | FanFauzi/Digital-Sablon-Desain |
| Branch Pengembangan | `fix/fabric-canvas-print-area` |
| Backend | Laravel 13 |
| Frontend | React + Vite |
| Database | MySQL / MariaDB |
| Canvas Engine | Fabric.js 7 |
| 3D Rendering | Three.js + React Three Fiber |
| AI Integration | Google Gemini API (ditunda sementara) |

---

# 1. PENDAHULUAN

## 1.1 Latar Belakang

Digital Sablon Studio merupakan aplikasi berbasis web yang dirancang untuk membantu pengguna melakukan kustomisasi desain produk sablon, khususnya kaos dan hoodie, secara digital. Aplikasi ini menyediakan lingkungan desain interaktif yang memungkinkan pengguna mengunggah gambar, menambahkan teks, mengatur posisi desain, mengubah ukuran dan rotasi objek, serta melihat hasil desain melalui visualisasi produk tiga dimensi.

Dalam proses pemesanan produk sablon secara konensional, pengguna sering kali harus membuat desain terlebih dahulu menggunakan aplikasi desain terpisah atau menyampaikan instruksi penempatan desain kepada penyedia jasa sablon. Proses tersebut dapat menimbulkan kesulitan dalam memperkirakan ukuran, posisi, warna, dan tampilan akhir desain pada pakaian.

Digital Sablon Studio dikembangkan untuk menyederhanakan proses tersebut melalui integrasi editor desain, visualisasi produk 3D, dan kemampuan penyimpanan proyek. Pengguna dapat membuat desain pada area kerja yang telah disesuaikan dengan area cetak produk, melihat hasil penerapan desain pada tampilan depan maupun belakang pakaian, serta mengekspor hasil desain dengan metadata resolusi untuk kebutuhan produksi.

Aplikasi ini juga dirancang untuk dikembangkan dengan teknologi AI multimodal. AI diharapkan dapat menganalisis gambar desain yang diunggah dan menghasilkan rekomendasi penempatan desain, warna pakaian, serta metode sablon yang sesuai. Fitur AI merupakan bagian dari arah pengembangan produk, tetapi implementasi dan validasinya masih ditunda sementara.

## 1.2 Tujuan Produk

Tujuan utama Digital Sablon Studio adalah:

1. Menyediakan aplikasi web untuk membuat dan mengatur desain sablon kaos maupun hoodie.
2. Mempermudah pengguna dalam menempatkan desain pada area cetak yang telah ditentukan.
3. Menampilkan visualisasi desain pada produk melalui preview 3D.
4. Memisahkan pengelolaan desain sisi depan dan belakang pakaian.
5. Menyediakan fasilitas ekspor desain dengan dimensi dan resolusi yang dapat digunakan sebagai acuan produksi.
6. Menyediakan autentikasi pengguna dan penyimpanan proyek berbasis akun.
7. Mengembangkan kemampuan rekomendasi penempatan desain menggunakan AI multimodal.

## 1.3 Visi Produk

Menjadi platform kustomisasi sablon berbasis web yang memungkinkan pengguna membuat, memvisualisasikan, menyimpan, dan menyiapkan desain pakaian untuk kebutuhan produksi secara mandiri dan terintegrasi.

## 1.4 Sasaran Produk

Sasaran utama aplikasi:

- Individu yang ingin membuat desain kaos atau hoodie custom.
- Pelanggan jasa sablon yang membutuhkan gambaran hasil desain sebelum produksi.
- Pelaku usaha sablon dan DTF yang membutuhkan media visualisasi desain.
- Pengguna yang membutuhkan file desain dengan ukuran dan resolusi tertentu.
- Pengembang atau peneliti yang ingin menguji penerapan AI multimodal pada proses rekomendasi penempatan desain.

---

# 2. RUANG LINGKUP PRODUK

## 2.1 Ruang Lingkup Utama

Digital Sablon Studio mencakup fitur-fitur berikut:

| Kode | Modul | Deskripsi |
|---|---|---|
| MOD-01 | Landing Page | Halaman pengenalan aplikasi |
| MOD-02 | Product Catalog | Menampilkan pilihan kaos dan hoodie |
| MOD-03 | User Authentication | Registrasi, login, dan logout |
| MOD-04 | Product Configuration | Pemilihan warna, ukuran, dan sisi pakaian |
| MOD-05 | Design Editor | Editor desain berbasis Fabric.js |
| MOD-06 | Layer Management | Pengelolaan objek desain |
| MOD-07 | 3D Preview | Visualisasi desain pada produk tiga dimensi |
| MOD-08 | Front/Back Design | Pengelolaan desain depan dan belakang secara terpisah |
| MOD-09 | Print Area Management | Penyesuaian area cetak dan dimensi fisik |
| MOD-10 | Design Export | Ekspor desain PNG dengan metadata DPI |
| MOD-11 | Project Management | Penyimpanan, pembukaan, dan penghapusan proyek |
| MOD-12 | Cloud Storage | Penyimpanan proyek pada server berdasarkan akun |
| MOD-13 | AI Multimodal | Analisis gambar dan rekomendasi penempatan desain |

## 2.2 Di Luar Ruang Lingkup Versi Saat Ini

Fitur berikut belum menjadi bagian dari implementasi yang telah divalidasi:

- Sistem transaksi dan pembayaran online.
- Keranjang belanja dan checkout produk.
- Integrasi pembayaran otomatis.
- Pengelolaan pesanan produksi.
- Pelacakan status pengerjaan sablon.
- Integrasi langsung dengan mesin cetak atau RIP software.
- Dashboard administrasi usaha sablon.
- Sistem manajemen pelanggan dan laporan penjualan.
- Virtual try-on menggunakan foto tubuh pengguna.
- Integrasi AI rekomendasi yang telah tervalidasi secara operasional.

Fitur-fitur tersebut dapat dipertimbangkan sebagai pengembangan lanjutan.

---

# 3. TARGET PENGGUNA DAN HAK AKSES

## 3.1 Target Pengguna

**Customer / User**

Pengguna utama yang menggunakan aplikasi untuk membuat desain pakaian, memilih produk, melakukan kustomisasi, menyimpan proyek, dan mengunduh hasil desain.

## 3.2 Hak Akses Pengguna

| Fitur | Pengunjung | Pengguna Terdaftar |
|---|---:|---:|
| Membuka landing page | Ya | Ya |
| Melihat katalog produk | Ya | Ya |
| Melihat detail produk | Ya | Ya |
| Registrasi akun | Ya | Tidak |
| Login | Ya | Tidak |
| Mengakses editor | Setelah login | Ya |
| Mengunggah desain | Tidak | Ya |
| Mengedit desain | Tidak | Ya |
| Melihat preview 3D | Tidak | Ya |
| Mengekspor desain | Tidak | Ya |
| Menyimpan proyek cloud | Tidak | Ya |
| Membuka proyek akun | Tidak | Ya |
| Menghapus proyek akun | Tidak | Ya |

Catatan: akses editor dalam dokumen ini mengikuti implementasi frontend yang telah menggunakan route protection. Hak akses administrator belum didefinisikan sebagai fitur versi berjalan.

---

# 4. ALUR UTAMA PENGGUNA

## 4.1 Alur Penggunaan Aplikasi

Alur utama aplikasi:

**LANDING PAGE → PRODUCT CATALOG → LOGIN/REGISTER → SELECT PRODUCT → DESIGN EDITOR → 3D PREVIEW → SAVE PROJECT → EXPORT DESIGN**

Rincian alur:

1. Pengguna membuka halaman utama Digital Sablon Studio.
2. Pengguna melihat informasi aplikasi dan katalog produk.
3. Pengguna memilih produk kaos atau hoodie.
4. Jika belum login, pengguna diarahkan ke halaman autentikasi.
5. Pengguna masuk ke editor produk yang dipilih.
6. Pengguna memilih warna, ukuran, dan sisi desain.
7. Pengguna mengunggah gambar atau menambahkan teks.
8. Pengguna mengatur posisi, ukuran, rotasi, dan urutan objek.
9. Aplikasi menampilkan hasil desain pada preview 3D.
10. Pengguna menyimpan proyek ke akun.
11. Pengguna dapat membuka kembali proyek yang telah disimpan.
12. Pengguna mengekspor desain dalam format PNG.

## 4.2 Alur Desain

Alur kerja desain yang menjadi konsep utama:

**UPLOAD IMAGE → PILIH T-SHIRT → AI ANALYSIS → RECOMMEND POSITION → 3D T-SHIRT → EDIT DESIGN → DOWNLOAD**

Pada versi implementasi yang berjalan, proses AI Analysis dan Recommend Position masih berstatus ditunda. Alur operasional yang sudah tersedia berfokus pada upload, pemilihan produk, editing, preview 3D, penyimpanan, dan ekspor.

---

# 5. KEBUTUHAN FUNGSIONAL

## 5.1 Landing Page

**FR-001 – Halaman Utama**

Sistem harus menyediakan halaman utama yang memperkenalkan Digital Sablon Studio.

Kriteria penerimaan:
- Pengguna dapat mengakses halaman utama.
- Halaman menampilkan identitas dan tujuan aplikasi.
- Tersedia navigasi menuju katalog produk.
- Tersedia navigasi autentikasi pengguna.

## 5.2 Product Catalog

**FR-002 – Katalog Produk**

Sistem harus menyediakan daftar produk pakaian yang dapat dipilih pengguna.

Jenis produk:
- Basic T-Shirt.
- Classic Hoodie.

Kriteria penerimaan:
- Sistem menampilkan produk yang tersedia.
- Data produk diambil melalui API backend.
- Pengguna dapat memilih produk.
- Pengguna diarahkan ke halaman editor sesuai ID produk.

**FR-003 – Detail Produk**

Sistem harus menyediakan detail produk yang dipilih.

Informasi produk meliputi:
- Nama produk.
- Jenis produk.
- Deskripsi.
- Varian warna.
- Ukuran.
- Area cetak depan.
- Area cetak belakang.

## 5.3 Authentication

**FR-004 – Registrasi Pengguna**

Sistem harus menyediakan fasilitas pendaftaran akun.

Data:
- Nama.
- Email.
- Password.
- Konfirmasi password.

Kriteria penerimaan:
- Nama dan email wajib diisi.
- Email harus unik.
- Password minimal delapan karakter.
- Password harus sesuai dengan konfirmasi.
- Sistem membuat akun pengguna setelah validasi berhasil.

**FR-005 – Login Pengguna**

Sistem harus menyediakan fasilitas autentikasi pengguna.

Kriteria penerimaan:
- Pengguna dapat login menggunakan email dan password.
- Sistem memvalidasi kredensial.
- Sistem menghasilkan access token.
- Token digunakan untuk mengakses endpoint yang membutuhkan autentikasi.

**FR-006 – Logout Pengguna**

Sistem harus menyediakan fasilitas keluar dari akun.

Kriteria penerimaan:
- Pengguna dapat mengakhiri sesi.
- Token autentikasi aktif dihapus dari sisi server melalui endpoint logout.
- Data sesi frontend dibersihkan.

**FR-007 – Route Protection**

Sistem harus membatasi akses editor dan pengelolaan proyek untuk pengguna yang telah terautentikasi.

Kriteria penerimaan:
- Pengguna belum login diarahkan ke halaman login.
- Pengguna yang telah login dapat mengakses halaman editor.
- Sistem memeriksa kembali sesi pengguna saat aplikasi dimuat.

## 5.4 Product Configuration

**FR-008 – Konfigurasi Produk**

Sistem menyediakan pengaturan produk sebelum dan selama proses desain.

Pengaturan:
- Warna pakaian.
- Ukuran pakaian.
- Sisi desain depan atau belakang.

Kriteria penerimaan:
- Pilihan warna berasal dari varian produk.
- Pilihan ukuran menyesuaikan varian yang tersedia.
- Preview produk mengikuti warna yang dipilih.
- Perubahan sisi memperbarui area kerja dan preview produk.

## 5.5 Design Editor

**FR-009 – Editor Canvas**

Sistem harus menyediakan area kerja desain menggunakan Fabric.js.

Spesifikasi:
- Ukuran logis canvas: 1000 × 1200 unit.
- Area kerja menampilkan batas cetak.
- Tampilan canvas menyesuaikan lebar viewport.
- Perubahan ukuran tampilan tidak mengubah koordinat internal desain.

**FR-010 – Upload Image**

Pengguna dapat mengunggah gambar desain dalam format PNG dan JPG/JPEG.

Kriteria penerimaan:
- Sistem menerima file dengan format yang didukung.
- Gambar ditampilkan sebagai objek pada canvas.
- Objek dapat dipilih dan dimodifikasi.
- Gambar dapat dipindahkan, diperbesar, diperkecil, dan diputar.

**FR-011 – Add Text**

Pengguna dapat menambahkan teks pada canvas.

Kriteria penerimaan:
- Sistem menyediakan objek teks.
- Teks dapat diedit.
- Teks dapat dipindahkan.
- Teks dapat diubah ukurannya dan propertinya melalui editor.

**FR-012 – Object Transformation**

Setiap objek desain harus dapat dimodifikasi.

Operasi:
- Move.
- Scale.
- Rotate.
- Select.
- Delete.

**FR-013 – Layer Management**

Sistem menyediakan pengelolaan lapisan objek.

Kriteria penerimaan:
- Sistem menampilkan daftar objek desain.
- Pengguna dapat memilih objek dari daftar layer.
- Pengguna dapat mengubah urutan layer.
- Pengguna dapat menghapus objek.

**FR-014 – Print Area Boundary**

Sistem harus menampilkan batas area cetak sebagai panduan desain.

Kriteria penerimaan:
- Batas cetak ditampilkan dengan garis putus-putus.
- Batas cetak tidak ikut menjadi objek desain.
- Posisi dan dimensi batas cetak mengikuti konfigurasi produk.
- Objek desain dapat diperiksa terhadap area cetak.

## 5.6 Front and Back Design

**FR-015 – Pemisahan Canvas Depan dan Belakang**

Sistem harus menyimpan kondisi desain depan dan belakang secara terpisah.

Kriteria penerimaan:
- Desain depan tidak tercampur dengan desain belakang.
- Pengguna dapat berpindah sisi.
- Setiap sisi memiliki snapshot canvas sendiri.
- Perpindahan sisi mempertahankan desain sebelumnya.
- Sistem mendukung pemulihan data desain versi multi-side.

Format penyimpanan editor versi 2:

- `schemaVersion`
- `activeSide`
- `sides.front`
- `sides.back`

Sistem juga mempertahankan kompatibilitas terhadap format proyek lama yang hanya memiliki satu snapshot canvas.

## 5.7 3D Preview

**FR-016 – Visualisasi Produk 3D**

Sistem harus menampilkan hasil desain pada visualisasi produk tiga dimensi.

Teknologi:
- Three.js.
- React Three Fiber.

Kriteria penerimaan:
- Model pakaian dapat ditampilkan.
- Warna model mengikuti konfigurasi pengguna.
- Pengguna dapat melihat produk dari sudut berbeda menggunakan kontrol kamera.
- Desain tampil pada permukaan pakaian.
- Pergantian sisi memperbarui tampilan desain.
- Desain belakang dapat terlihat pada sisi belakang model.

Catatan implementasi: model produk saat ini menggunakan pendekatan procedural/extruded geometry, bukan aset model `.glb` yang telah disediakan.

## 5.8 Print Area dan Dimensi Produksi

**FR-017 – Konfigurasi Dimensi Area Cetak**

Sistem harus menggunakan konfigurasi area cetak berdasarkan data produk.

Data:
- Logical width.
- Logical height.
- Physical width.
- Physical height.
- DPI.
- View side.
- Position configuration.

Kriteria penerimaan:
- Setiap sisi dapat memiliki dimensi fisik berbeda.
- Rasio area kerja menyesuaikan dimensi fisik.
- Area cetak menjadi acuan proses ekspor.

## 5.9 Export Design

**FR-018 – Ekspor Desain PNG**

Sistem harus memungkinkan pengguna mengunduh hasil desain dalam format PNG.

Kriteria penerimaan:
- Desain diekspor berdasarkan area cetak.
- Hasil ekspor mempertahankan transparansi gambar desain.
- Resolusi ekspor dihitung dari dimensi fisik dan DPI.
- Metadata DPI disisipkan ke file PNG melalui chunk pHYs.
- Nama file memuat nama produk, sisi, DPI, dan timestamp.

**FR-019 – Export Validation**

Sistem harus melakukan validasi terhadap proses ekspor.

Validasi:
- Objek yang melewati area cetak.
- Dimensi gambar hasil ekspor.
- Batas maksimal 10.000 piksel pada satu sumbu.
- Batas maksimal 40 juta piksel.

Sistem menampilkan peringatan apabila ditemukan potensi masalah pada hasil ekspor.

## 5.10 Project Management

**FR-020 – Save Project**

Sistem harus memungkinkan pengguna menyimpan proyek desain.

Data proyek:
- Nama proyek.
- Pengguna pemilik proyek.
- Produk.
- Varian produk.
- Warna.
- Ukuran.
- Sisi aktif.
- Snapshot desain depan.
- Snapshot desain belakang.

**FR-021 – Load Project**

Pengguna dapat membuka proyek yang telah disimpan.

Kriteria penerimaan:
- Sistem mengambil data proyek berdasarkan ID.
- Data desain dipulihkan ke canvas.
- Konfigurasi produk dipulihkan.
- Desain depan dan belakang dapat dipulihkan secara terpisah.

**FR-022 – Delete Project**

Pengguna dapat menghapus proyek miliknya.

Kriteria penerimaan:
- Sistem menghapus proyek dari penyimpanan yang sesuai.
- Pengguna tidak dapat menghapus proyek milik pengguna lain.

**FR-023 – Cloud Project Storage**

Sistem harus menyimpan proyek berdasarkan akun pengguna.

Kriteria penerimaan:
- Pengguna terautentikasi dapat menyimpan proyek ke server.
- Pengguna dapat melihat daftar proyek miliknya.
- Pengguna dapat membuka kembali proyek dari server.
- Pengguna dapat memperbarui proyek.
- Pengguna tidak dapat mengakses proyek milik pengguna lain.

## 5.11 AI Multimodal

**FR-024 – Analisis Gambar Desain**

Sistem direncanakan menggunakan Gemini API untuk menganalisis gambar yang diunggah pengguna.

Informasi yang diharapkan:
- Karakteristik visual desain.
- Komposisi desain.
- Warna dominan.
- Rasio dan orientasi desain.
- Potensi kesesuaian desain dengan pakaian.

**FR-025 – Rekomendasi Penempatan Desain**

Sistem diharapkan menghasilkan rekomendasi:
- Penempatan depan.
- Penempatan belakang.
- Posisi tengah.
- Posisi dada kiri.
- Posisi punggung.
- Ukuran relatif desain.
- Rekomendasi warna pakaian.
- Rekomendasi metode sablon.

**FR-026 – Warning dan Explanation**

Sistem diharapkan memberikan peringatan jika gambar memiliki karakteristik yang berpotensi kurang sesuai untuk proses sablon.

Catatan status:
- Integrasi Gemini pernah dikembangkan.
- Pengujian mengalami HTTP 413, timeout, dan respons 503.
- Fitur AI saat ini ditunda sesuai keputusan pengembangan.
- Hasil rekomendasi belum dapat dinyatakan valid atau siap digunakan.

---

# 6. KEBUTUHAN NON-FUNGSIONAL

## 6.1 Performance

- Antarmuka editor harus tetap responsif saat pengguna mengubah objek desain.
- Proses perpindahan sisi tidak boleh menghilangkan objek yang telah dibuat.
- Proses penyimpanan proyek harus memiliki penanganan error.
- Gambar yang disimpan tidak boleh menyebabkan ukuran request dan konsumsi memori berlebihan.
- Proses preview 3D harus dapat berjalan tanpa menghambat penggunaan editor.

Target penerimaan performa yang diusulkan:
- Operasi dasar editor memberikan respons dalam waktu kurang dari 1 detik pada perangkat pengujian yang memenuhi spesifikasi.
- Penyimpanan proyek normal ditargetkan selesai dalam waktu maksimal 5 detik setelah optimasi penyimpanan gambar.
- Ukuran payload JSON proyek ditargetkan tidak lebih dari 5 MB untuk skenario desain normal. File gambar disimpan terpisah pada `uploaded_assets`.

## 6.2 Security

- Password pengguna harus disimpan dalam bentuk hash.
- Endpoint proyek dan aset harus dilindungi autentikasi.
- Setiap operasi proyek dan akses file gambar harus dibatasi berdasarkan pemilik akun.
- Validasi format dan ukuran file harus diterapkan.
- Token autentikasi harus dikelola dengan benar.
- Kredensial API tidak boleh ditampilkan pada frontend.
- Error backend tidak boleh membocorkan data sensitif.

## 6.3 Compatibility

Sistem harus mendukung:
- Google Chrome.
- Microsoft Edge.
- Browser modern berbasis Chromium.

Tampilan harus menyesuaikan ukuran layar desktop dan perangkat yang lebih kecil. Namun, pengalaman editor utama diprioritaskan untuk layar desktop atau laptop.

## 6.4 Reliability

- Sistem tidak boleh menghilangkan desain ketika pengguna berpindah sisi.
- Kesalahan penyimpanan harus ditampilkan dengan pesan yang dapat dipahami.
- Pengguna harus dapat membuka kembali proyek yang berhasil disimpan.
- Sistem harus mempertahankan kompatibilitas format snapshot desain lama selama migrasi.

## 6.5 Maintainability

- Backend dan frontend harus memiliki pemisahan tanggung jawab.
- Endpoint API harus memiliki struktur versi.
- Komponen editor dan preview harus dikembangkan secara modular.
- Perubahan struktur data proyek harus mempertimbangkan kompatibilitas data lama.

---

# 7. ARSITEKTUR DAN TEKNOLOGI

## 7.1 Arsitektur Sistem

Arsitektur yang digunakan adalah client-server dengan frontend React yang berkomunikasi dengan backend Laravel melalui REST API.

Alur:

**React Frontend → Axios API Client → Laravel REST API → MySQL Database & Local File Storage (`uploaded_assets`)**

Integrasi tambahan:

- Fabric.js untuk editor canvas.
- Three.js dan React Three Fiber untuk visualisasi produk.
- Google Gemini API untuk rencana analisis AI.
- IndexedDB untuk penyimpanan proyek lokal lama/cadangan.

## 7.2 Technology Stack

| Lapisan | Teknologi | Fungsi |
|---|---|---|
| Frontend | React | Antarmuka aplikasi |
| Build Tool | Vite | Pengembangan dan build frontend |
| Routing | React Router | Navigasi aplikasi |
| HTTP Client | Axios | Komunikasi REST API |
| Canvas | Fabric.js 7 | Editor desain 2D |
| 3D Engine | Three.js | Rendering 3D |
| 3D Framework | React Three Fiber | Integrasi Three.js dengan React |
| Backend | Laravel 13 | Business logic dan API |
| Authentication | Laravel Sanctum | Autentikasi API |
| Database | MySQL/MariaDB | Penyimpanan data |
| AI | Gemini API | Analisis gambar yang direncanakan |
| Local Storage | IndexedDB | Penyimpanan proyek lokal |

## 7.3 API Utama

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/v1/shirts` | Mengambil daftar produk |
| GET | `/api/v1/shirts/{id}` | Mengambil detail produk |
| GET | `/api/v1/shirts/{id}/print-areas` | Mengambil area cetak |
| POST | `/api/v1/auth/register` | Registrasi |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Informasi pengguna aktif |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/assets` | Mengunggah file gambar desain terpisah |
| GET | `/api/v1/assets/{asset}/content` | Mengambil konten file gambar milik pengguna |
| GET | `/api/v1/projects` | Daftar proyek |
| GET | `/api/v1/projects/{id}` | Detail proyek |
| POST | `/api/v1/projects` | Membuat proyek |
| PUT | `/api/v1/projects/{id}` | Memperbarui proyek |
| DELETE | `/api/v1/projects/{id}` | Menghapus proyek |

---

# 8. MODEL DATA

## 8.1 Entitas Utama

| Entitas | Fungsi |
|---|---|
| users | Menyimpan akun pengguna |
| shirts | Menyimpan data produk |
| shirt_variants | Menyimpan varian warna dan ukuran |
| print_areas | Menyimpan area cetak produk |
| projects | Menyimpan proyek desain pengguna |
| uploaded_assets | Struktur penyimpanan metadata file gambar |
| design_objects | Struktur penyimpanan objek desain |
| ai_analysis_runs | Struktur riwayat analisis AI |
| ai_recommendations | Struktur rekomendasi AI |
| tryon_sessions | Struktur sesi virtual try-on |
| export_files | Struktur metadata hasil ekspor |

## 8.2 Relasi Data

- Satu user dapat memiliki banyak project dan uploaded_asset.
- Satu shirt dapat memiliki banyak shirt_variant.
- Satu shirt dapat memiliki beberapa print_area.
- Satu project dapat memiliki banyak design_object.
- Satu project dapat memiliki banyak export_file.
- Satu project dapat memiliki beberapa ai_analysis_run.
- Satu ai_analysis_run dapat memiliki banyak ai_recommendation.

## 8.3 Struktur Penyimpanan Proyek

Data proyek saat ini menggunakan:
- `canvas_config` untuk konfigurasi produk.
- `editor_state` untuk snapshot desain dengan referensi file aset (`uploadedAssetId` dan `assetUrl`).

Struktur multi-side:

```json
{
  "schemaVersion": 2,
  "activeSide": "front",
  "sides": {
    "front": {
      "objects": [
        {
          "type": "image",
          "editorId": "uuid",
          "editorName": "logo.png",
          "uploadedAssetId": 1,
          "assetUrl": "/api/v1/assets/1/content",
          "src": "/api/v1/assets/1/content"
        }
      ]
    },
    "back": {
      "objects": []
    }
  }
}
```
