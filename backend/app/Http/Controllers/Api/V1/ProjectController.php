<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ShirtVariant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $projects = $request->user()
            ->projects()
            ->select([
                'id',
                'name',
                'status',
                'shirt_variant_id',
                'canvas_config',
                'created_at',
                'updated_at',
            ])
            ->withCount(['designObjects', 'exportFiles'])
            ->latest('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    public function show(Request $request, int $project): JsonResponse
    {
        $record = $request->user()
            ->projects()
            ->with(['designObjects', 'exportFiles'])
            ->findOrFail($project);

        return response()->json([
            'success' => true,
            'data' => $record,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateProject($request);
        $editorState = $this->normalizeEditorStateAssets(
            $request->user(),
            $validated['editor_state']
        );

        $project = $request->user()->projects()->create([
            'shirt_variant_id' => $validated['shirt_variant_id'] ?? null,
            'name' => trim($validated['name']),
            'status' => 'draft',
            'canvas_config' => $validated['canvas_config'],
            'editor_state' => $editorState,
        ]);

        $this->syncDesignObjects($project, $editorState);

        return response()->json([
            'success' => true,
            'message' => 'Proyek berhasil disimpan ke server.',
            'data' => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'shirt_variant_id' => $project->shirt_variant_id,
                'canvas_config' => $project->canvas_config,
                'updated_at' => $project->updated_at,
            ],
        ], 201);
    }

    public function update(Request $request, int $project): JsonResponse
    {
        $record = $request->user()->projects()->findOrFail($project);
        $validated = $this->validateProject($request);
        $editorState = $this->normalizeEditorStateAssets(
            $request->user(),
            $validated['editor_state']
        );

        $record->update([
            'shirt_variant_id' => $validated['shirt_variant_id'] ?? null,
            'name' => trim($validated['name']),
            'canvas_config' => $validated['canvas_config'],
            'editor_state' => $editorState,
        ]);

        $this->syncDesignObjects($record, $editorState);

        return response()->json([
            'success' => true,
            'message' => 'Perubahan proyek berhasil disimpan.',
            'data' => [
                'id' => $record->id,
                'name' => $record->name,
                'status' => $record->status,
                'shirt_variant_id' => $record->shirt_variant_id,
                'canvas_config' => $record->canvas_config,
                'updated_at' => $record->updated_at,
            ],
        ]);
    }

    public function destroy(Request $request, int $project): JsonResponse
    {
        $record = $request->user()->projects()->findOrFail($project);
        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Proyek berhasil dihapus dari server.',
        ]);
    }

    public function recordExport(Request $request, int $project): JsonResponse
    {
        $record = $request->user()->projects()->findOrFail($project);

        $validated = $request->validate([
            'file_name' => ['required', 'string', 'max:255'],
            'format' => ['nullable', 'string', 'max:20'],
            'width_cm' => ['nullable', 'numeric', 'min:0.1', 'max:500'],
            'height_cm' => ['nullable', 'numeric', 'min:0.1', 'max:500'],
            'dpi' => ['nullable', 'integer', 'min:72', 'max:600'],
            'pixel_width' => ['nullable', 'integer', 'min:1', 'max:20000'],
            'pixel_height' => ['nullable', 'integer', 'min:1', 'max:20000'],
        ]);

        $exportFile = $record->exportFiles()->create([
            'file_name' => $validated['file_name'],
            'file_path' => 'client-download/' . $validated['file_name'],
            'format' => strtolower((string) ($validated['format'] ?? 'png')),
            'width_cm' => $validated['width_cm'] ?? null,
            'height_cm' => $validated['height_cm'] ?? null,
            'dpi' => $validated['dpi'] ?? 300,
            'pixel_width' => $validated['pixel_width'] ?? null,
            'pixel_height' => $validated['pixel_height'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Metadata hasil ekspor berhasil dicatat.',
            'data' => $exportFile,
        ], 201);
    }

    private function validateProject(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'shirt_variant_id' => ['nullable', 'integer', 'exists:shirt_variants,id'],
            'canvas_config' => ['required', 'array'],
            'canvas_config.shirt_id' => ['required', 'integer', 'exists:shirts,id'],
            'canvas_config.shirt_name' => ['nullable', 'string', 'max:255'],
            'canvas_config.selected_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'canvas_config.selected_size' => ['nullable', 'string', 'max:10'],
            'canvas_config.selected_side' => ['required', 'in:front,back'],
            'editor_state' => ['required', 'array'],
            'editor_state.schemaVersion' => ['nullable', 'integer', 'in:2'],
            'editor_state.activeSide' => ['nullable', 'in:front,back'],
            'editor_state.sides' => ['sometimes', 'array'],
            'editor_state.sides.front' => ['sometimes', 'nullable', 'array'],
            'editor_state.sides.back' => ['sometimes', 'nullable', 'array'],
            'editor_state.objects' => ['sometimes', 'array'],
        ]);

        if (
            isset($validated['shirt_variant_id']) &&
            ! ShirtVariant::query()
                ->whereKey($validated['shirt_variant_id'])
                ->where('shirt_id', $validated['canvas_config']['shirt_id'])
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'shirt_variant_id' => ['Varian produk tidak sesuai dengan produk yang dipilih.'],
            ]);
        }

        if (
            ! isset($validated['editor_state']['sides']) &&
            ! isset($validated['editor_state']['objects'])
        ) {
            throw ValidationException::withMessages([
                'editor_state' => ['Data desain tidak memiliki objek atau sisi yang valid.'],
            ]);
        }

        return $validated;
    }

    private function normalizeEditorStateAssets(User $user, array $editorState): array
    {
        if (isset($editorState['sides']) && is_array($editorState['sides'])) {
            foreach (['front', 'back'] as $side) {
                if (isset($editorState['sides'][$side]) && is_array($editorState['sides'][$side])) {
                    $editorState['sides'][$side] = $this->normalizeCanvasSnapshot(
                        $user,
                        $editorState['sides'][$side]
                    );
                }
            }
        }

        if (isset($editorState['objects']) && is_array($editorState['objects'])) {
            $editorState = $this->normalizeCanvasSnapshot($user, $editorState);
        }

        return $editorState;
    }

    private function normalizeCanvasSnapshot(User $user, array $snapshot): array
    {
        if (! isset($snapshot['objects']) || ! is_array($snapshot['objects'])) {
            return $snapshot;
        }

        foreach ($snapshot['objects'] as $index => $object) {
            if (! is_array($object)) {
                continue;
            }

            $type = strtolower((string) ($object['type'] ?? ''));
            if ($type !== 'image') {
                continue;
            }

            $snapshot['objects'][$index] = $this->normalizeImageObject($user, $object);
        }

        return $snapshot;
    }

    private function normalizeImageObject(User $user, array $object): array
    {
        $src = is_string($object['src'] ?? null) ? trim($object['src']) : '';
        $assetId = isset($object['uploadedAssetId']) && is_numeric($object['uploadedAssetId'])
            ? (int) $object['uploadedAssetId']
            : null;

        if ($assetId === null && $src !== '') {
            $assetId = $this->extractAssetIdFromPath($src);
        }

        if ($assetId === null && isset($object['assetUrl']) && is_string($object['assetUrl'])) {
            $assetId = $this->extractAssetIdFromPath($object['assetUrl']);
        }

        if ($assetId !== null) {
            $ownsAsset = $user->uploadedAssets()->whereKey($assetId)->exists();
            if (! $ownsAsset) {
                throw ValidationException::withMessages([
                    'editor_state' => ['Aset gambar yang direferensikan tidak ditemukan atau bukan milik akun ini.'],
                ]);
            }

            $contentPath = UploadedAssetController::assetContentPath($assetId);
            $object['uploadedAssetId'] = $assetId;
            $object['assetUrl'] = $contentPath;
            $object['src'] = $contentPath;

            return $object;
        }

        if (str_starts_with($src, 'data:image/')) {
            $asset = UploadedAssetController::storeFromDataUrl(
                $user,
                $src,
                is_string($object['editorName'] ?? null) ? $object['editorName'] : null
            );

            $contentPath = UploadedAssetController::assetContentPath($asset->id);
            $object['uploadedAssetId'] = $asset->id;
            $object['assetUrl'] = $contentPath;
            $object['src'] = $contentPath;

            return $object;
        }

        throw ValidationException::withMessages([
            'editor_state' => ['Objek gambar pada proyek harus memiliki referensi file aset yang valid.'],
        ]);
    }

    private function extractAssetIdFromPath(string $path): ?int
    {
        if (preg_match('#/api/v1/assets/(\d+)/content(?:\?.*)?$#', $path, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    private function syncDesignObjects(Project $project, array $editorState): void
    {
        $project->designObjects()->delete();

        $sideGroups = [];

        if (isset($editorState['sides']) && is_array($editorState['sides'])) {
            foreach (['front', 'back'] as $side) {
                $objects = $editorState['sides'][$side]['objects'] ?? [];
                if (is_array($objects)) {
                    $sideGroups[$side] = $objects;
                }
            }
        } elseif (isset($editorState['objects']) && is_array($editorState['objects'])) {
            $activeSide = is_string($editorState['activeSide'] ?? null) ? $editorState['activeSide'] : 'front';
            $sideGroups[$activeSide] = $editorState['objects'];
        }

        foreach ($sideGroups as $side => $objects) {
            foreach ($objects as $index => $object) {
                if (! is_array($object)) {
                    continue;
                }

                $type = strtolower((string) ($object['type'] ?? 'unknown'));
                $assetId = isset($object['uploadedAssetId']) && is_numeric($object['uploadedAssetId'])
                    ? (int) $object['uploadedAssetId']
                    : null;

                $scaleX = is_numeric($object['scaleX'] ?? null) ? (float) $object['scaleX'] : 1.0;
                $scaleY = is_numeric($object['scaleY'] ?? null) ? (float) $object['scaleY'] : 1.0;
                $rawWidth = is_numeric($object['width'] ?? null) ? (float) $object['width'] : 100.0;
                $rawHeight = is_numeric($object['height'] ?? null) ? (float) $object['height'] : 100.0;

                $project->designObjects()->create([
                    'uploaded_asset_id' => $assetId,
                    'object_type' => substr($type, 0, 50),
                    'object_name' => substr((string) ($object['editorName'] ?? ucfirst($type) . ' ' . ($index + 1)), 0, 255),
                    'position_x' => is_numeric($object['left'] ?? null) ? round((float) $object['left'], 2) : 0,
                    'position_y' => is_numeric($object['top'] ?? null) ? round((float) $object['top'], 2) : 0,
                    'object_width' => round($rawWidth * abs($scaleX), 2),
                    'object_height' => round($rawHeight * abs($scaleY), 2),
                    'rotation' => is_numeric($object['angle'] ?? null) ? round((float) $object['angle'], 2) : 0,
                    'scale_x' => round($scaleX, 3),
                    'scale_y' => round($scaleY, 3),
                    'layer_order' => (int) $index,
                    'properties' => [
                        'side' => $side,
                        'editor_id' => $object['editorId'] ?? null,
                        'text' => $object['text'] ?? null,
                        'font_family' => $object['fontFamily'] ?? null,
                        'font_size' => $object['fontSize'] ?? null,
                        'font_weight' => $object['fontWeight'] ?? null,
                        'fill' => $object['fill'] ?? null,
                    ],
                ]);
            }
        }
    }
}
