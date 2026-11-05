<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            ->latest()
            ->get();

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

        $areas = $shirt->printAreas()->get();

        return response()->json([
            'success' => true,
            'message' => 'Area cetak berhasil diambil.',
            'data' => $areas,
        ]);
    }
}
