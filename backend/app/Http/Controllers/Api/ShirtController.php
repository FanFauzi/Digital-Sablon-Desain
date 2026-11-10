<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrintArea;
use App\Models\Shirt;
use Illuminate\Http\JsonResponse;

class ShirtController extends Controller
{
    public function index(): JsonResponse
    {
        $shirts = Shirt::query()
            ->where('is_active', true)
            ->with([
                'variants' => fn ($query) => $query
                    ->where('is_active', true),
            ])
            ->orderBy('id')
            ->get();

        foreach ($shirts as $shirt) {
            $this->ensureModel3dPath($shirt);
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar produk berhasil diambil.',
            'data' => $shirts,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $shirt = Shirt::query()
            ->where('is_active', true)
            ->with([
                'variants' => fn ($query) => $query
                    ->where('is_active', true),
                'printAreas',
            ])
            ->findOrFail($id);

        $this->ensureModel3dPath($shirt);
        $this->ensureSleevePrintAreas($shirt);

        return response()->json([
            'success' => true,
            'message' => 'Detail produk berhasil diambil.',
            'data' => $shirt,
        ]);
    }

    public function printAreas(int $id): JsonResponse
    {
        $shirt = Shirt::query()
            ->where('is_active', true)
            ->findOrFail($id);

        $this->ensureSleevePrintAreas($shirt);
        $areas = $shirt->printAreas()->get();

        return response()->json([
            'success' => true,
            'message' => 'Area cetak berhasil diambil.',
            'data' => $areas,
        ]);
    }

    private function ensureModel3dPath(Shirt $shirt): void
    {
        if (! empty($shirt->model_3d_path)) {
            return;
        }

        $nameLower = strtolower((string) $shirt->name);
        if ($shirt->type === 'hoodie' || str_contains($nameLower, 'hoodie')) {
            $shirt->model_3d_path = '/models/hoodie-classic.glb';
        } elseif (str_contains($nameLower, 'oversize')) {
            $shirt->model_3d_path = '/models/oversized_t-shirt.glb';
        } else {
            $shirt->model_3d_path = '/models/T SHIRT.fbx';
        }
    }

    private function ensureSleevePrintAreas(Shirt $shirt): void
    {
        $existingSides = $shirt->printAreas->pluck('view_side')->all();
        $isHoodie = $shirt->type === 'hoodie';
        $sleeveHeight = $isHoodie ? 28 : 12;

        $missing = [
            'left_sleeve' => [
                'area_name' => 'Left Sleeve Print Area',
                'width' => 10,
                'height' => $sleeveHeight,
            ],
            'right_sleeve' => [
                'area_name' => 'Right Sleeve Print Area',
                'width' => 10,
                'height' => $sleeveHeight,
            ],
        ];

        $createdAny = false;
        foreach ($missing as $side => $cfg) {
            if (! in_array($side, $existingSides, true)) {
                PrintArea::firstOrCreate(
                    [
                        'shirt_id' => $shirt->id,
                        'view_side' => $side,
                    ],
                    [
                        'area_name' => $cfg['area_name'],
                        'logical_width' => 1000,
                        'logical_height' => 1200,
                        'physical_width_cm' => $cfg['width'],
                        'physical_height_cm' => $cfg['height'],
                        'dpi' => 300,
                        'position_config' => [
                            'origin' => 'center',
                            'coordinate_system' => 'logical_canvas',
                        ],
                    ]
                );
                $createdAny = true;
            }
        }

        if ($createdAny) {
            $shirt->load('printAreas');
        }
    }
}
