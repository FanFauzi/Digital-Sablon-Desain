# Final Acceptance Checklist — Digital Sablon Studio

Checklist ini memisahkan pemeriksaan otomatis dari uji manual yang perlu dilakukan menggunakan browser dan lingkungan lokal. Tandai lulus hanya setelah hasil benar-benar diamati.

## A. Otomatis (CI)

- [ ] Frontend `npm test` lulus.
- [ ] Frontend `npm run lint` lulus.
- [ ] Frontend `npm run build` lulus.
- [ ] Backend `php artisan test` lulus, termasuk persistensi proyek untuk empat permukaan cetak.
- [ ] Aset GLB regular, oversized, dan hoodie masing-masing tidak melebihi 1 MiB, dapat dibaca sebagai GLB v2, dan memiliki lima mesh permukaan yang diwajibkan.

## B. Akun dan keamanan

- [ ] Pengguna dapat mendaftar, login, refresh halaman, dan logout.
- [ ] Halaman editor mengarahkan pengguna tanpa sesi ke login.
- [ ] Pengguna A tidak dapat membaca, memperbarui, menghapus, atau memakai asset/proyek milik pengguna B.
- [ ] API key Gemini tidak pernah dikirim ke bundle frontend atau disimpan di repository.
- [ ] Permintaan analisis tanpa autentikasi ditolak dan throttling berjalan.

## C. Katalog dan model pakaian

- [ ] Katalog menampilkan produk aktif dan membuka editor untuk produk yang dipilih.
- [ ] Regular, Oversized, dan Hoodie memuat model yang sesuai.
- [ ] Warna, ukuran, dan tipe pakaian tetap konsisten antara kontrol UI dan model 3D.
- [ ] Tidak ada mesh sablon yang hilang pada bagian depan, belakang, lengan kiri, dan lengan kanan.
- [ ] Viewer 3D dapat diputar dan tetap responsif ketika berpindah mode Split / Full 3D / Full 2D.

## D. Editor 2D dan sinkronisasi 3D

- [ ] Upload PNG, JPEG/JPG, dan WEBP berhasil; format tidak didukung dan ukuran melebihi batas ditolak dengan pesan yang jelas.
- [ ] Tambah teks, ubah properti, geser, skala, rotasi, duplikasi, hapus, ubah urutan layer, undo, dan redo berfungsi.
- [ ] Desain yang sama muncul pada permukaan 3D yang sesuai.
- [ ] Mengganti artwork atau mengaktifkan/nonaktifkan Puff Print tidak menampilkan tekstur lama.
- [ ] Preset Front Center, Front Left Chest, Front Right Chest, Back Center, Back Upper, Left Sleeve, dan Right Sleeve menggunakan koordinat serta lebar yang sesuai.
- [ ] Ketika preset meminta pindah sisi, desain diterapkan setelah perpindahan berhasil; jika perpindahan gagal, desain tidak diterapkan pada sisi yang salah.
- [ ] Desain pada satu sisi tidak berpindah atau menimpa desain sisi lain.

## E. Penyimpanan dan pemulihan proyek

- [ ] Simpan proyek baru menghasilkan proyek cloud.
- [ ] Simpan ulang proyek cloud memperbarui proyek yang sama, bukan membuat duplikat.
- [ ] Buka proyek mengembalikan warna, ukuran, tipe pakaian, sisi aktif, objek, layer, dan artwork.
- [ ] Buka dua proyek berbeda secara bergantian tidak menampilkan preview atau gambar dari proyek sebelumnya.
- [ ] Gambar cloud dapat dimuat ulang setelah browser direfresh atau sesi login dibuat kembali.
- [ ] Proyek lama dengan format snapshot tunggal tetap dapat dibuka bila ada data legacy yang masih digunakan.
- [ ] Hapus proyek hanya menghapus proyek yang dimiliki pengguna aktif.

## F. Ekspor file

- [ ] Ekspor PNG 2D menghasilkan transparansi dan crop sesuai area cetak.
- [ ] Dimensi piksel sesuai rumus pembulatan `(cm / 2.54) × DPI`.
- [ ] Metadata DPI/pHYs dibaca aplikasi pemeriksa gambar; jangan hanya mengandalkan nama file.
- [ ] Rasio aspek gambar hasil ekspor tidak berubah dan sesuai ukuran fisik area cetak; cocokkan dengan rasio permukaan mesh 3D agar desain tidak tampak tertarik/melebar.
- [ ] Objek yang melewati batas area cetak memunculkan peringatan clipping.
- [ ] Setiap sisi menghasilkan file berbeda dengan nama sisi yang benar.
- [ ] Ekspor mockup PNG/JPG, GLB, dan video diuji pada browser yang ditargetkan; format video dapat berbeda mengikuti dukungan codec.
- [ ] Catatan ekspor tersimpan pada proyek cloud yang benar.

## G. AI multimodal (gerbang terpisah)

- [ ] API key aktif dan model yang dipilih tersedia bagi project Gemini.
- [ ] Gambar uji dikirim dengan ukuran payload yang sudah dibatasi dan tidak melampaui batas backend/provider.
- [ ] Hasil analisis berisi skema rekomendasi valid: sisi, posisi X/Y, dan lebar desain.
- [ ] Hasil rekomendasi dapat diterapkan pada objek yang dianalisis, bukan objek yang salah.
- [ ] Uji kondisi 400/413, 401/403, 429, 500/503, dan timeout memberi pesan yang dapat dipahami.
- [ ] Performa dicatat pada beberapa gambar uji dengan ukuran dan kompleksitas yang berbeda.
- [ ] Rekomendasi dinilai memakai rubrik/ground truth yang ditetapkan untuk penelitian, tidak hanya berdasarkan satu contoh yang berhasil.

## H. Responsif, kompatibilitas, dan kesiapan deployment

- [ ] Uji pada Chrome dan setidaknya satu browser lain yang menjadi target.
- [ ] Uji resolusi desktop/laptop dan viewport mobile yang didukung.
- [ ] Tidak ada error JavaScript fatal, request API gagal yang tidak ditangani, atau memory leak nyata setelah pergantian proyek.
- [ ] Kondisi WebGL tidak tersedia memberi fallback/pesan yang jelas.
- [ ] Lingkungan produksi menggunakan HTTPS, APP_DEBUG=false, secrets di environment, database dan storage persisten, backup, serta CORS yang dibatasi.
- [ ] Prosedur deployment, rollback, dan pemulihan backup terdokumentasi.
- [ ] File hasil ekspor telah diperiksa oleh operator sablon pada ukuran dan metode produksi yang sesungguhnya.

## Keputusan rilis

Status rilis hanya dapat dinyatakan final setelah:
1. Semua pemeriksaan A lulus.
2. Semua poin kritikal B–F lulus.
3. AI multimodal dinyatakan selesai atau secara eksplisit dikeluarkan dari ruang lingkup rilis skripsi/prototipe.
4. Uji kompatibilitas dan hasil file produksi selesai.
5. Hasil, tanggal, perangkat/browser, dan bukti uji dicatat.
