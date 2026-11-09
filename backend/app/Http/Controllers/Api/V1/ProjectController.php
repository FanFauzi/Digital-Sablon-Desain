<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ShirtVariant;
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
            ->latest('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    public function show(Request $request, int $project): JsonResponse
    {
        $record = $request->user()->projects()->findOrFail($project);

        return response()->json([
            'success' => true,
            'data' => $record,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateProject($request);

        $project = $request->user()->projects()->create([
            'shirt_variant_id' => $validated['shirt_variant_id'] ?? null,
            'name' => trim($validated['name']),
            'status' => 'draft',
            'canvas_config' => $validated['canvas_config'],
            'editor_state' => $validated['editor_state'],
        ]);

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

        $record->update([
            'shirt_variant_id' => $validated['shirt_variant_id'] ?? null,
            'name' => trim($validated['name']),
            'canvas_config' => $validated['canvas_config'],
            'editor_state' => $validated['editor_state'],
        ]);

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
}
