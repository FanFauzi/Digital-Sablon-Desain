# Test Plan — Digital Sablon Studio

Dokumen ini menjadi prosedur uji manual dan pencatatan bukti untuk melengkapi CI. Isi kolom hasil hanya setelah skenario benar-benar dijalankan pada build yang dicatat.

## 1. Identitas pengujian

| Field | Nilai yang harus dicatat |
|---|---|
| Build / commit | SHA commit dari branch yang diuji |
| Tanggal dan waktu | Waktu lokal pengujian |
| Penguji | Nama/inisial operator |
| OS | Versi Windows/macOS/Linux |
| Browser | Nama dan versi browser |
| Backend | Versi PHP, Laravel, database |
| Frontend | Versi Node.js dan hasil build |
| Resolusi | Resolusi layar dan viewport |
| WebGL | Aktif/tidak, GPU/renderer jika tersedia |

## 2. Skenario penerimaan manual

Gunakan akun uji, bukan akun pribadi/produksi. Jangan mencatat password, token, atau API key ke laporan.

| ID | Area | Langkah ringkas | Hasil yang diharapkan | Hasil aktual / bukti |
|---|---|---|---|---|
| MAN-01 | Auth | Buka editor tanpa login | Dialihkan ke login; setelah login kembali ke tujuan yang diminta | Belum diuji |
| MAN-02 | Auth | Login, refresh, logout | Sesi pulih setelah refresh dan terhapus setelah logout | Belum diuji |
| MAN-03 | Katalog | Buka katalog dan tiap produk | Regular, Oversized, Hoodie tampil dan membuka editor yang benar | Belum diuji |
| MAN-04 | Model 3D | Putar model 360° dan ganti warna | Model tetap terlihat, warna berubah, tidak ada mesh hilang | Belum diuji |
| MAN-05 | Editor 2D | Upload PNG, JPEG, WEBP | Gambar tampil pada kanvas; format/ukuran invalid ditolak dengan pesan | Belum diuji |
| MAN-06 | Editor 2D | Tambah teks, ubah properti, geser, skala, rotasi, duplikasi, hapus | Objek dan layer diperbarui sesuai tindakan | Belum diuji |
| MAN-07 | History | Lakukan beberapa perubahan, undo lalu redo | Kanvas kembali ke keadaan sebelum/sesudah perubahan secara konsisten | Belum diuji |
| MAN-08 | Multi-side | Buat desain berbeda pada depan, belakang, lengan kiri, lengan kanan | Masing-masing desain tetap berada pada sisi asal setelah berpindah sisi berulang kali | Belum diuji |
| MAN-09 | Sinkronisasi 3D | Ubah artwork pada tiap sisi dan putar model | Tekstur tampil pada mesh sisi yang sesuai; tidak ada tekstur lama | Belum diuji |
| MAN-10 | Preset | Terapkan setiap preset penempatan yang tersedia | Posisi dan skala sesuai sisi/area yang ditampilkan | Belum diuji |
| MAN-11 | Proyek | Simpan proyek baru, refresh, buka kembali | Nama, warna, ukuran, sisi aktif, seluruh objek dan aset pulih | Belum diuji |
| MAN-12 | Isolasi proyek | Buka proyek A, kemudian proyek B, lalu kembali ke A | Tidak ada artwork, preview, atau konfigurasi silang antarproyek | Belum diuji |
| MAN-13 | Proyek | Perbarui lalu hapus proyek uji | Proyek yang sama diperbarui; hanya proyek terpilih yang dihapus | Belum diuji |
| MAN-14 | Ekspor | Ekspor PNG pada setiap sisi | File transparan, nama sisi benar, area dan rasio sesuai | Belum diuji |
| MAN-15 | Metadata | Periksa PNG pada aplikasi pembaca metadata | pHYs setara DPI yang dipilih dan dimensi piksel sesuai ukuran fisik | Belum diuji |
| MAN-16 | 3D Export | Ekspor mockup PNG/JPG dan GLB | File dapat dibuka dan model sesuai konfigurasi | Belum diuji |
| MAN-17 | Video | Ekspor video pada browser target | File dapat diputar; jika codec tidak didukung, pengguna menerima pesan yang jelas | Belum diuji |
| MAN-18 | Responsif | Uji desktop, laptop, dan viewport mobile | Kontrol utama tidak tertutup/terpotong dan kanvas tetap dapat digunakan | Belum diuji |

### Rumus verifikasi ekspor

Untuk ukuran fisik dalam sentimeter dan resolusi DPI:

    pixel = round((ukuran_cm / 2.54) * DPI)

Contoh perhitungan: area 30 × 40 cm pada 300 DPI menghasilkan sekitar 3543 × 4724 piksel. Ukuran akhir harus mengikuti print area dan nilai aktual yang digunakan aplikasi.

Metadata DPI tidak menambah detail pada gambar sumber. Pastikan resolusi artwork asli cukup untuk ukuran cetak yang ditargetkan.

## 3. Protokol uji Gemini live

Lakukan setelah API key tersedia pada environment backend. Jangan menaruh API key dalam screenshot, log publik, atau laporan.

Untuk setiap gambar uji, simpan:
- ID gambar anonim dan checksum file.
- Format, ukuran file, lebar/tinggi piksel.
- Jenis pakaian dan sisi aktif.
- Output rekomendasi mentah yang sudah disanitasi dari data sensitif.
- Rekomendasi ternormalisasi: sisi, position code, X%, Y%, width%.
- HTTP status, durasi respons, jumlah percobaan/fallback.
- Status berhasil/gagal dan kategori error (400/413/429/5xx/timeout).

Uji kondisi sukses, payload invalid, gambar terlalu besar, API key invalid, kuota/rate limit, provider overload, timeout, dan respons JSON yang tidak sesuai skema. Jangan mengulang request secara agresif ketika mendapat 429.

## 4. Evaluasi kualitas rekomendasi AI untuk penelitian

Pisahkan keberhasilan sistem dari kualitas rekomendasi. HTTP 200 atau JSON valid tidak otomatis berarti posisi desain benar.

Sebelum pengujian, tetapkan dataset gambar, kriteria inklusi, label acuan (ground truth), serta rubrik penilaian. Untuk menghindari kebutuhan responden, ground truth dapat dibentuk dari aturan penempatan yang terdokumentasi dan/atau penilaian ahli yang dicatat sebagai sumber acuan; jangan mengklaim validasi ahli jika belum dilakukan.

Metrik yang dapat dihitung:
- Valid output rate = jumlah keluaran yang lolos validasi skema / seluruh percobaan.
- Exact placement accuracy = jumlah position code yang sama dengan label acuan / jumlah keluaran valid.
- Coordinate error = rata-rata selisih absolut X dan Y terhadap koordinat acuan, dalam poin persentase.
- Width error = rata-rata selisih absolut lebar rekomendasi terhadap lebar acuan, dalam poin persentase.
- Wrong-side rate = jumlah rekomendasi yang menyebut sisi berbeda dari sisi aktif / seluruh keluaran.
- Provider success rate = jumlah request live yang berhasil / seluruh request live.
- Latency = median dan persentil ke-95 waktu respons, dilaporkan bersama jumlah sampel.

Laporkan hasil per jenis pakaian dan per sisi jika jumlah sampelnya memadai. Catat versi model, tanggal, konfigurasi prompt, parameter, serta versi kode agar eksperimen dapat diulang. Hindari menyimpulkan akurasi umum dari dataset yang terlalu kecil atau tidak seimbang.

## 5. Uji hasil produksi sablon

Sebelum menyatakan file siap produksi:
1. Konfirmasi ukuran fisik area cetak dan toleransi dengan operator/vendor sablon.
2. Periksa transparansi, warna, dimensi piksel, metadata DPI, dan rasio aspek.
3. Periksa clipping serta jarak aman desain terhadap tepi area cetak.
4. Cetak sampel dengan metode dan bahan yang benar-benar akan digunakan.
5. Catat perbedaan antara preview 3D, file PNG, dan hasil cetak fisik.

## 6. Format keputusan per skenario

Gunakan salah satu status:
- PASS — hasil sesuai seluruh kriteria.
- FAIL — hasil tidak sesuai; sertakan langkah reproduksi dan bukti.
- BLOCKED — tidak dapat diuji karena dependensi/akses/perangkat.
- NOT APPLICABLE — di luar ruang lingkup rilis yang disepakati.

Jangan menandai skenario sebagai PASS hanya karena halaman dapat dibuka. Simpan bukti yang tidak memuat data pribadi atau kredensial.