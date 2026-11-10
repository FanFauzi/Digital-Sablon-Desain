<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UploadedAsset;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UploadedAssetController extends Controller
{
    private const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => [
                'required',
                'file',
                'mimes:png,jpg,jpeg',
                'mimetypes:image/png,image/jpeg',
                'max:15360',
            ],
        ], [
            'image.required' => 'File gambar wajib diunggah.',
            'image.mimes' => 'Format gambar harus PNG atau JPG/JPEG.',
            'image.mimetypes' => 'Format gambar harus PNG atau JPG/JPEG.',
            'image.max' => 'Ukuran gambar maksimal 15 MB.',
        ]);

        $file = $validated['image'];
        $realPath = $file->getRealPath();
        $imageInfo = $realPath ? @getimagesize($realPath) : false;

        if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
            throw ValidationException::withMessages([
                'image' => ['File gambar tidak valid atau rusak.'],
            ]);
        }

        $mimeType = $imageInfo['mime'] ?? $file->getMimeType() ?? 'image/png';
        if (! in_array($mimeType, ['image/png', 'image/jpeg'], true)) {
            throw ValidationException::withMessages([
                'image' => ['Format gambar harus PNG atau JPG/JPEG.'],
            ]);
        }

        $extension = $mimeType === 'image/jpeg' ? 'jpg' : 'png';
        $user = $request->user();
        $relativePath = sprintf(
            'uploaded-assets/%d/%s.%s',
            $user->id,
            (string) Str::uuid(),
            $extension
        );

        $stored = Storage::disk('local')->putFileAs(
            dirname($relativePath),
            $file,
            basename($relativePath)
        );

        if (! $stored) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan file gambar ke storage server.',
            ], 500);
        }

        $originalName = trim((string) $file->getClientOriginalName()) ?: basename($relativePath);

        $asset = $user->uploadedAssets()->create([
            'original_name' => Str::limit($originalName, 255, ''),
            'file_path' => $relativePath,
            'mime_type' => $mimeType,
            'file_size' => (int) $file->getSize(),
            'image_width' => (int) $imageInfo[0],
            'image_height' => (int) $imageInfo[1],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Gambar desain berhasil diunggah.',
            'data' => self::formatAssetResponse($asset),
        ], 201);
    }

    public function showContent(Request $request, int $asset): StreamedResponse|JsonResponse
    {
        $record = $request->user()->uploadedAssets()->findOrFail($asset);

        if (! Storage::disk('local')->exists($record->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File gambar tidak ditemukan pada storage server.',
            ], 404);
        }

        return Storage::disk('local')->response(
            $record->file_path,
            $record->original_name,
            [
                'Content-Type' => $record->mime_type,
                'Cache-Control' => 'private, max-age=86400',
            ]
        );
    }

    public static function storeFromDataUrl(
        User $user,
        string $dataUrl,
        ?string $originalName = null
    ): UploadedAsset {
        if (! preg_match('/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/s', $dataUrl, $matches)) {
            throw ValidationException::withMessages([
                'editor_state' => ['Format data gambar pada proyek tidak didukung. Gunakan PNG atau JPG.'],
            ]);
        }

        $rawMime = strtolower($matches[1]);
        $mimeType = $rawMime === 'image/png' ? 'image/png' : 'image/jpeg';
        $binary = base64_decode(str_replace([' ', "\r", "\n"], '', $matches[2]), true);

        if ($binary === false || strlen($binary) === 0) {
            throw ValidationException::withMessages([
                'editor_state' => ['Data gambar Base64 pada proyek tidak valid.'],
            ]);
        }

        $fileSize = strlen($binary);
        if ($fileSize > self::MAX_FILE_SIZE_BYTES) {
            throw ValidationException::withMessages([
                'editor_state' => ['Ukuran gambar pada proyek melebihi batas maksimal 15 MB.'],
            ]);
        }

        $imageInfo = @getimagesizefromstring($binary);
        if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
            throw ValidationException::withMessages([
                'editor_state' => ['Data gambar pada proyek rusak atau tidak dapat dibaca.'],
            ]);
        }

        $detectedMime = $imageInfo['mime'] ?? $mimeType;
        if (! in_array($detectedMime, ['image/png', 'image/jpeg'], true)) {
            throw ValidationException::withMessages([
                'editor_state' => ['Format gambar pada proyek harus PNG atau JPG/JPEG.'],
            ]);
        }

        $extension = $detectedMime === 'image/jpeg' ? 'jpg' : 'png';
        $relativePath = sprintf(
            'uploaded-assets/%d/%s.%s',
            $user->id,
            (string) Str::uuid(),
            $extension
        );

        $stored = Storage::disk('local')->put($relativePath, $binary);
        if (! $stored) {
            throw ValidationException::withMessages([
                'editor_state' => ['Gagal menyimpan gambar proyek ke storage server.'],
            ]);
        }

        $cleanName = trim((string) $originalName) ?: ('design-image.' . $extension);

        return $user->uploadedAssets()->create([
            'original_name' => Str::limit($cleanName, 255, ''),
            'file_path' => $relativePath,
            'mime_type' => $detectedMime,
            'file_size' => $fileSize,
            'image_width' => (int) $imageInfo[0],
            'image_height' => (int) $imageInfo[1],
        ]);
    }

    public static function assetContentPath(int $assetId): string
    {
        return "/api/v1/assets/{$assetId}/content";
    }

    public static function formatAssetResponse(UploadedAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'original_name' => $asset->original_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'image_width' => $asset->image_width,
            'image_height' => $asset->image_height,
            'url' => self::assetContentPath($asset->id),
        ];
    }
}
