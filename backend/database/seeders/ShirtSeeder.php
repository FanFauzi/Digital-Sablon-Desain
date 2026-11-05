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
        $products = [
            [
                'name' => 'Basic T-Shirt',
                'type' => 'tshirt',
                'description' => 'Kaos basic untuk kebutuhan desain sablon custom.',
                'variants' => [
                    ['color_name' => 'Black', 'color_hex' => '#000000'],
                    ['color_name' => 'White', 'color_hex' => '#FFFFFF'],
                    ['color_name' => 'Red', 'color_hex' => '#E53E3E'],
                    ['color_name' => 'Navy', 'color_hex' => '#1A365D'],
                ],
                'areas' => [
                    [
                        'view_side' => 'front',
                        'area_name' => 'Front Print Area',
                        'width' => 25,
                        'height' => 30,
                    ],
                    [
                        'view_side' => 'back',
                        'area_name' => 'Back Print Area',
                        'width' => 30,
                        'height' => 40,
                    ],
                ],
            ],
            [
                'name' => 'Classic Hoodie',
                'type' => 'hoodie',
                'description' => 'Hoodie custom untuk desain sablon bagian depan dan belakang.',
                'variants' => [
                    ['color_name' => 'Black', 'color_hex' => '#000000'],
                    ['color_name' => 'White', 'color_hex' => '#FFFFFF'],
                    ['color_name' => 'Grey', 'color_hex' => '#808080'],
                    ['color_name' => 'Navy', 'color_hex' => '#1A365D'],
                ],
                'areas' => [
                    [
                        'view_side' => 'front',
                        'area_name' => 'Front Print Area',
                        'width' => 25,
                        'height' => 30,
                    ],
                    [
                        'view_side' => 'back',
                        'area_name' => 'Back Print Area',
                        'width' => 30,
                        'height' => 40,
                    ],
                ],
            ],
        ];

        foreach ($products as $product) {
            $shirt = Shirt::updateOrCreate(
                ['type' => $product['type']],
                [
                    'name' => $product['name'],
                    'description' => $product['description'],
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
