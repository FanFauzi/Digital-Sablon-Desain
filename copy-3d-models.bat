@echo off
echo Menyalin file model 3D ke frontend\public\models\ ...

if not exist "frontend\public\models" mkdir "frontend\public\models"

if exist "C:\Users\ASUS\Downloads\t-shirt-3d-model-free\source\T SHIRT.fbx" (
    copy /Y "C:\Users\ASUS\Downloads\t-shirt-3d-model-free\source\T SHIRT.fbx" "frontend\public\models\T SHIRT.fbx"
    echo [OK] Berhasil menyalin T SHIRT.fbx
) else (
    echo [INFO] File "C:\Users\ASUS\Downloads\t-shirt-3d-model-free\source\T SHIRT.fbx" tidak ditemukan di lokasi tersebut.
)

if exist "C:\Users\ASUS\Downloads\oversized-t-shirt\source\oversized_t-shirt.glb" (
    copy /Y "C:\Users\ASUS\Downloads\oversized-t-shirt\source\oversized_t-shirt.glb" "frontend\public\models\oversized_t-shirt.glb"
    echo [OK] Berhasil menyalin oversized_t-shirt.glb
) else (
    echo [INFO] File "C:\Users\ASUS\Downloads\oversized-t-shirt\source\oversized_t-shirt.glb" tidak ditemukan di lokasi tersebut.
)

echo Selesai! Silakan refresh halaman 3D Studio di browser Anda.
pause
