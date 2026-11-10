<?php

namespace Database\Seeders;

use App\Models\Shirt;
use App\Models\ShirtVariant;
use App\Models\PrintArea;
use Illuminate\Database\Seeder;

class ShirtSeeder extends Seeder
{
    public function run(): void
    {
        $defaultColors = [
            ['color_name' => 'White', 'color_hex' => '#FFFFFF'],
            ['color_name' => 'Black', 'color_hex' => '#000000'],
            ['color_name' => 'Red', 'color_hex' => '#E53E3E'],
            ['color_name' => 'Blue', 'color_hex' => '#3182CE'],
            ['color_name' => 'Green', 'color_hex' => '#38A169'],
            ['color_name' => 'Yellow', 'color_hex' => '#D69E2E'],
            ['color_name' => 'Grey', 'color_hex' => '#808080'],
            ['color_name' => 'Navy', 'color_hex' => '#1A365D'],
        ];

        $products = [
            [
                'name' => 'Basic T-Shirt',
                'type' => 'tshirt',
                'model_3d_path' => '/models/tshirt-regular.glb',
                'description' => 'Kaos regular fit berbahan cotton combed untuk kustomisasi sablon depan, belakang, dan lengan.',
                'variants' => $defaultColors,
                'areas' => [
                    [
                        'view_side' => 'front',
                        'area_name' => 'Front Print Area',
                        'width' => 28,
                        'height' => 36,
                    ],
                    [
                        'view_side' => 'back',
                        'area_name' => 'Back Print Area',
                        'width' => 30,
                        'height' => 40,
                    ],
                    [
                        'view_side' => 'left_sleeve',
                        'area_name' => 'Left Sleeve Print Area',
                        'width' => 10,
                        'height' => 12,
                    ],
                    [
                        'view_side' => 'right_sleeve',
                        'area_name' => 'Right Sleeve Print Area',
                        'width' => 10,
                        'height' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Oversized T-Shirt',
                'type' => 'tshirt',
                'model_3d_path' => '/models/tshirt-oversized.glb',
                'description' => 'Kaos potongan boxy drop-shoulder streetwear dengan area cetak lebih lebar.',
                'variants' => $defaultColors,
                'areas' => [
                    [
                        'view_side' => 'front',
                        'area_name' => 'Front Print Area',
                        'width' => 32,
                        'height' => 40,
                    ],
                    [
                        'view_side' => 'back',
                        'area_name' => 'Back Print Area',
                        'width' => 34,
                        'height' => 44,
                    ],
                    [
                        'view_side' => 'left_sleeve',
                        'area_name' => 'Left Sleeve Print Area',
                        'width' => 12,
                        'height' => 15,
                    ],
                    [
                        'view_side' => 'right_sleeve',
                        'area_name' => 'Right Sleeve Print Area',
                        'width' => 12,
                        'height' => 15,
                    ],
                ],
            ],
            [
                'name' => 'Classic Hoodie',
                'type' => 'hoodie',
                'model_3d_path' => '/models/hoodie-classic.glb',
                'description' => 'Hoodie fleece lengkap dengan tudung 3D, kantong kanguru, serta area cetak dada, punggung, dan lengan.',
                'variants' => $defaultColors,
                'areas' => [
                    [
                        'view_side' => 'front',
                        'area_name' => 'Front Chest Print Area',
                        'width' => 26,
                        'height' => 26,
                    ],
                    [
                        'view_side' => 'back',
                        'area_name' => 'Back Print Area',
                        'width' => 32,
                        'height' => 42,
                    ],
                    [
                        'view_side' => 'left_sleeve',
                        'area_name' => 'Left Sleeve Print Area',
                        'width' => 10,
                        'height' => 28,
                    ],
                    [
                        'view_side' => 'right_sleeve',
                        'area_name' => 'Right Sleeve Print Area',
                        'width' => 10,
                        'height' => 28,
                    ],
                ],
            ],
        ];

        foreach ($products as $product) {
            $shirt = Shirt::updateOrCreate(
                ['name' => $product['name']],
                [
                    'type' => $product['type'],
                    'description' => $product['description'],
                    'model_3d_path' => $product['model_3d_path'],
                    'is_active' => true,
                ]
            );

            foreach ($product['variants'] as $variant) {
                foreach (['S', 'M', 'L', 'XL', 'XXL'] as $size) {
                    ShirtVariant::updateOrCreate(
                        [
                            'shirt_id' => $shirt->id,
                            'color_hex' => $variant['color_hex'],
                            'size' => $size,
                        ],
                        [
                            'color_name' => $variant['color_name'],
                            'is_active' => true,
                        ]
                    );
                }
            }

            foreach ($product['areas'] as $area) {
                PrintArea::updateOrCreate(
                    [
                        'shirt_id' => $shirt->id,
                        'view_side' => $area['view_side'],
                    ],
                    [
                        'area_name' => $area['area_name'],
                        'logical_width' => 1000,
                        'logical_height' => 1200,
                        'physical_width_cm' => $area['width'],
                        'physical_height_cm' => $area['height'],
                        'dpi' => 300,
                        'position_config' => [
                            'origin' => 'center',
                            'coordinate_system' => 'logical_canvas',
                        ],
                    ]
                );
            }
        }
    }
}
