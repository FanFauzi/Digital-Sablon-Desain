# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# DIGITAL SABLON – 3D T-SHIRT CONFIGURATOR

**Versi:** 1.0  
**Tanggal:** 10 November 2026  
**Status:** Implemented – Production Ready  
**Produk:** Digital Sablon Studio  
**Referensi:** VirtualThreads 3D Configurator  
**Platform:** Web Application (Desktop & Mobile Responsive)

---

## Ringkasan Implementasi

Seluruh modul pada spesifikasi **Digital Sablon – 3D T-Shirt Configurator** telah diimplementasikan secara modular tanpa merusak fitur editor 2D Fabric.js maupun asisten AI Multimodal Gemini:

1. **Model 3D GLB Ber-UV Mapping (`frontend/public/models/`):**
   - `tshirt-regular.glb` (Regular Fit T-Shirt dengan 5 mesh: `Garment_Body`, `Print_Front`, `Print_Back`, `Print_LeftSleeve`, `Print_RightSleeve`)
   - `tshirt-oversized.glb` (Oversized Boxy Drop-Shoulder T-Shirt dengan 5 mesh)
   - `hoodie-classic.glb` (Classic Pullover Hoodie dengan tudung 3D, kantong kanguru, manset lengan, dan 5 mesh)
2. **State Management Terpusat (`frontend/src/features/configurator/store/configuratorStore.js`):**
   - Menggunakan Zustand untuk mengelola `garmentStyle`, `activeTab`, `workspaceMode` (`split`, `3d`, `2d`), kamera & zoom, background studio, efek material (`fabricType`, `acidWash`, `puffPrint`, `lighting`), animasi `motion` (`static`, `waves`, `walk`, `knit`), serta konfigurasi ekspor.
3. **7 Menu Navigasi Studio (`frontend/src/features/configurator/components/Sidebar.jsx`):**
   - **Upload Design:** Pemilih model 3D (`Regular T-Shirt`, `Oversized T-Shirt`, `Classic Hoodie`), Drag & Drop multi-file (`PNG`, `JPG`, `JPEG`, `WEBP`), dan tambah teks.
   - **Image / Artwork:** Pemilihan 4 sisi cetak (`Front`, `Back`, `Left Sleeve`, `Right Sleeve`), 7 preset penempatan standar industri (`Front Center`, `Front Left Chest`, `Front Right Chest`, `Back Center`, `Back Upper`, `Left Sleeve`, `Right Sleeve`), serta pemicu analisis AI.
   - **Garment Color:** Preset warna kaos, Custom Color Picker, input kode HEX (`#RRGGBB`), pemilihan ukuran (`S`, `M`, `L`, `XL`, `XXL`), dan tombol reset warna default.
   - **Background:** Preset latar (`Studio Light Grey`, `Pure White`, `Dark Studio`, `Warm Editorial`, `Transparent Grid`), warna latar kustom, dan unggah gambar latar belakang.
   - **Motion:** 4 mode simulasi gerakan (`Static`, `Waves`, `Walk`, `Knit`), pengatur kecepatan (`0.25x – 2.0x`), tombol Play/Pause, dan Turntable 360°.
   - **Effects:** Tekstur kain (`Cotton Standard`, `Cotton Combed 30s`, `Polyester Sport`, `Heavy Fleece`), efek **Acid Wash** (intensity & scale), efek **Puff Print** sablon timbul (height, intensity, roughness), serta kontrol pencahayaan & bayangan.
   - **Export:** Unduh 3D Mockup (`PNG`, `JPG` pada resolusi `1024×1024`, `1920×1080`, `2048×2048`), rekam video animasi 3D (`.webm`/`.mp4`), unduh model 3D (`.glb`), dan ekspor file cetak produksi 2D (`300 DPI`).
4. **Backend & API Laravel (`backend/`):**
   - Mendukung 4 area cetak (`front`, `back`, `left_sleeve`, `right_sleeve`), path model 3D (`model_3d_path`), auto-migrasi area cetak lengan pada produk lama di `ShirtController`, penyimpanan metadata konfigurator 3D di `canvas_config`, serta endpoint `/api/v1/design-projects` dan `/api/v1/projects`.
