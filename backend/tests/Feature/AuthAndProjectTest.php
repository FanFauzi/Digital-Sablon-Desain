<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\UploadedAssetController;
use App\Models\UploadedAsset;
use App\Models\Shirt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthAndProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_an_api_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Studio User',
            'email' => 'studio@example.com',
            'password' => 'strong-password',
            'password_confirmation' => 'strong-password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'studio@example.com')
            ->assertJsonStructure([
                'data' => ['user' => ['id', 'name', 'email'], 'token'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'studio@example.com',
        ]);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'strong-password',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'login@example.com',
            'password' => 'strong-password',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user' => ['id', 'email'], 'token']]);
    }

    public function test_authenticated_user_can_upload_and_retrieve_design_asset_with_owner_isolation(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $file = UploadedFile::fake()->image('logo-komunitas.png', 400, 300);

        $uploadResponse = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/assets', [
                'image' => $file,
            ], [
                'Accept' => 'application/json',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.original_name', 'logo-komunitas.png')
            ->assertJsonPath('data.mime_type', 'image/png')
            ->assertJsonPath('data.image_width', 400)
            ->assertJsonPath('data.image_height', 300);

        $assetId = $uploadResponse->json('data.id');
        $assetRecord = UploadedAsset::findOrFail($assetId);

        Storage::disk('local')->assertExists($assetRecord->file_path);

        $this->actingAs($owner, 'sanctum')
            ->get("/api/v1/assets/{$assetId}/content")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $this->actingAs($otherUser, 'sanctum')
            ->get("/api/v1/assets/{$assetId}/content")
            ->assertNotFound();
    }

    public function test_authenticated_user_can_upload_and_retrieve_webp_design_asset(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $webpBytes = base64_decode(
            'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==',
            true
        );
        $this->assertNotFalse($webpBytes);

        $temporaryPath = tempnam(sys_get_temp_dir(), 'dss-webp-');
        file_put_contents($temporaryPath, $webpBytes);

        try {
            $file = new UploadedFile(
                $temporaryPath,
                'illustration.webp',
                'image/webp',
                null,
                true
            );

            $uploadResponse = $this->actingAs($user, 'sanctum')
                ->post('/api/v1/assets', [
                    'image' => $file,
                ], [
                    'Accept' => 'application/json',
                ])
                ->assertCreated()
                ->assertJsonPath('data.original_name', 'illustration.webp')
                ->assertJsonPath('data.mime_type', 'image/webp')
                ->assertJsonPath('data.image_width', 1)
                ->assertJsonPath('data.image_height', 1);

            $asset = UploadedAsset::findOrFail($uploadResponse->json('data.id'));
            $this->assertStringEndsWith('.webp', $asset->file_path);
            Storage::disk('local')->assertExists($asset->file_path);

            $this->actingAs($user, 'sanctum')
                ->get("/api/v1/assets/{$asset->id}/content")
                ->assertOk()
                ->assertHeader('Content-Type', 'image/webp');
        } finally {
            @unlink($temporaryPath);
        }
    }

    public function test_legacy_webp_data_url_can_be_migrated_to_file_storage(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $dataUrl = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==';

        $asset = UploadedAssetController::storeFromDataUrl(
            $user,
            $dataUrl,
            'legacy-artwork.webp'
        );

        $this->assertSame('image/webp', $asset->mime_type);
        $this->assertStringEndsWith('.webp', $asset->file_path);
        Storage::disk('local')->assertExists($asset->file_path);
        $this->assertDatabaseHas('uploaded_assets', [
            'id' => $asset->id,
            'mime_type' => 'image/webp',
            'original_name' => 'legacy-artwork.webp',
        ]);
    }

    public function test_authenticated_user_can_save_update_and_delete_project_with_file_asset_references(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $anotherUser = User::factory()->create();

        $shirtId = DB::table('shirts')->insertGetId([
            'name' => 'Basic T-Shirt',
            'type' => 'tshirt',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $variantId = DB::table('shirt_variants')->insertGetId([
            'shirt_id' => $shirtId,
            'color_name' => 'White',
            'color_hex' => '#ffffff',
            'size' => 'M',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $assetResponse = $this->actingAs($user, 'sanctum')
            ->post('/api/v1/assets', [
                'image' => UploadedFile::fake()->image('front-art.png', 500, 500),
            ], ['Accept' => 'application/json'])
            ->assertCreated();

        $assetId = $assetResponse->json('data.id');
        $assetUrl = $assetResponse->json('data.url');

        $payload = [
            'name' => 'Kaos Komunitas',
            'shirt_variant_id' => $variantId,
            'canvas_config' => [
                'shirt_id' => $shirtId,
                'shirt_name' => 'Basic T-Shirt',
                'selected_color' => '#ffffff',
                'selected_size' => 'M',
                'selected_side' => 'front',
            ],
            'editor_state' => [
                'schemaVersion' => 2,
                'activeSide' => 'front',
                'sides' => [
                    'front' => [
                        'objects' => [
                            [
                                'type' => 'image',
                                'editorId' => 'obj-front-1',
                                'editorName' => 'front-art.png',
                                'uploadedAssetId' => $assetId,
                                'assetUrl' => $assetUrl,
                                'src' => $assetUrl,
                                'left' => 500,
                                'top' => 600,
                            ],
                        ],
                    ],
                    'back' => [
                        'objects' => [
                            [
                                'type' => 'i-text',
                                'editorId' => 'obj-back-1',
                                'editorName' => 'Teks belakang',
                                'text' => 'CREW',
                            ],
                        ],
                    ],
                    'left_sleeve' => [
                        'objects' => [
                            [
                                'type' => 'i-text',
                                'editorId' => 'obj-left-sleeve-1',
                                'editorName' => 'Inisial lengan kiri',
                                'text' => 'DS',
                            ],
                        ],
                    ],
                    'right_sleeve' => [
                        'objects' => [
                            [
                                'type' => 'i-text',
                                'editorId' => 'obj-right-sleeve-1',
                                'editorName' => 'Tahun lengan kanan',
                                'text' => '2026',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $created = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/projects', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Kaos Komunitas');

        $projectId = $created->json('data.id');

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('data.editor_state.schemaVersion', 2)
            ->assertJsonPath('data.editor_state.sides.front.objects.0.uploadedAssetId', $assetId)
            ->assertJsonPath('data.editor_state.sides.front.objects.0.src', "/api/v1/assets/{$assetId}/content")
            ->assertJsonPath('data.editor_state.sides.back.objects.0.text', 'CREW')
            ->assertJsonPath('data.editor_state.sides.left_sleeve.objects.0.text', 'DS')
            ->assertJsonPath('data.editor_state.sides.right_sleeve.objects.0.text', '2026')
            ->assertJsonPath('data.canvas_config.shirt_id', $shirtId);

        $this->assertDatabaseHas('design_objects', [
            'project_id' => $projectId,
            'object_name' => 'Inisial lengan kiri',
            'properties->side' => 'left_sleeve',
        ]);
        $this->assertDatabaseHas('design_objects', [
            'project_id' => $projectId,
            'object_name' => 'Tahun lengan kanan',
            'properties->side' => 'right_sleeve',
        ]);
        $this->assertDatabaseCount('design_objects', 4);

        // Pembaruan proyek (PUT)
        $payload['name'] = 'Kaos Komunitas Revisi';
        $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/projects/{$projectId}", $payload)
            ->assertOk()
            ->assertJsonPath('data.name', 'Kaos Komunitas Revisi');

        // Isolasi kepemilikan untuk pengguna lain
        $this->actingAs($anotherUser, 'sanctum')
            ->getJson("/api/v1/projects/{$projectId}")
            ->assertNotFound();

        $this->actingAs($anotherUser, 'sanctum')
            ->putJson("/api/v1/projects/{$projectId}", $payload)
            ->assertNotFound();

        $this->actingAs($anotherUser, 'sanctum')
            ->deleteJson("/api/v1/projects/{$projectId}")
            ->assertNotFound();

        // Pengguna lain tidak boleh mereferensikan uploadedAssetId milik user pertama
        $this->actingAs($anotherUser, 'sanctum')
            ->postJson('/api/v1/projects', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['editor_state']);

        // Penghapusan proyek oleh pemilik
        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/projects/{$projectId}")
            ->assertOk();

        $this->assertDatabaseMissing('projects', [
            'id' => $projectId,
        ]);
    }

    public function test_project_save_automatically_extracts_legacy_base64_images_to_file_storage(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $shirtId = DB::table('shirts')->insertGetId([
            'name' => 'Classic Hoodie',
            'type' => 'hoodie',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 1x1 PNG transparan dalam format data URL Base64
        $tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $payload = [
            'name' => 'Proyek Migrasi Base64',
            'shirt_variant_id' => null,
            'canvas_config' => [
                'shirt_id' => $shirtId,
                'shirt_name' => 'Classic Hoodie',
                'selected_color' => '#171717',
                'selected_size' => 'L',
                'selected_side' => 'front',
            ],
            'editor_state' => [
                'schemaVersion' => 2,
                'activeSide' => 'front',
                'sides' => [
                    'front' => [
                        'objects' => [
                            [
                                'type' => 'Image',
                                'editorId' => 'legacy-img-1',
                                'editorName' => 'legacy.png',
                                'src' => $tinyPngBase64,
                            ],
                        ],
                    ],
                    'back' => null,
                ],
            ],
        ];

        $created = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/projects', $payload)
            ->assertCreated();

        $projectId = $created->json('data.id');
        $this->assertDatabaseCount('uploaded_assets', 1);

        $asset = UploadedAsset::first();
        Storage::disk('local')->assertExists($asset->file_path);

        $detail = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/projects/{$projectId}")
            ->assertOk();

        $savedSrc = $detail->json('data.editor_state.sides.front.objects.0.src');
        $this->assertSame("/api/v1/assets/{$asset->id}/content", $savedSrc);
        $this->assertStringNotContainsString('data:image/', $savedSrc);
        $this->assertDatabaseHas('design_objects', [
            'project_id' => $projectId,
            'uploaded_asset_id' => $asset->id,
            'object_type' => 'image',
            'object_name' => 'legacy.png',
        ]);

        // Catat metadata hasil ekspor PNG pada proyek tersebut
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/projects/{$projectId}/exports", [
                'file_name' => 'digital-sablon-classic-hoodie-front-300dpi.png',
                'format' => 'png',
                'width_cm' => 30,
                'height_cm' => 40,
                'dpi' => 300,
                'pixel_width' => 3543,
                'pixel_height' => 4724,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('export_files', [
            'project_id' => $projectId,
            'file_name' => 'digital-sablon-classic-hoodie-front-300dpi.png',
            'dpi' => 300,
        ]);
    }

    public function test_shirt_api_normalizes_legacy_model_paths_to_existing_glb_assets(): void
    {
        $regular = Shirt::create([
            'name' => 'Basic T-Shirt',
            'type' => 'tshirt',
            'model_3d_path' => '/models/T SHIRT.fbx',
            'is_active' => true,
        ]);

        $oversized = Shirt::create([
            'name' => 'Oversized T-Shirt',
            'type' => 'tshirt',
            'model_3d_path' => '/models/oversized_t-shirt.glb',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/shirts/' . $regular->id)
            ->assertOk()
            ->assertJsonPath('data.model_3d_path', '/models/tshirt-regular.glb');

        $this->getJson('/api/v1/shirts/' . $oversized->id)
            ->assertOk()
            ->assertJsonPath('data.model_3d_path', '/models/tshirt-oversized.glb');
    }

    public function test_design_analysis_endpoint_requires_authentication(): void
    {
        $this->postJson('/api/v1/designs/analyze', [])->assertUnauthorized();
    }

    public function test_design_analysis_keeps_recommendations_on_the_active_sleeve_surface(): void
    {
        $user = User::factory()->create();
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model' => 'gemini-3.8-flash',
        ]);

        $modelResponse = [
            'candidates' => [[
                'content' => [
                    'parts' => [[
                        'text' => json_encode([
                            'summary' => 'Logo komunitas berbentuk emblem.',
                            'composition' => ['complexity' => 'simple'],
                            'recommendations' => [
                                'placement' => [
                                    'position_code' => 'back_center',
                                    'side' => 'back',
                                    'area' => 'Punggung Tengah',
                                    'scale_category' => 'large',
                                    'position_x_percent' => 50,
                                    'position_y_percent' => 45,
                                    'width_percent' => 80,
                                    'reason' => 'Tempatkan di punggung.',
                                ],
                                'placement_options' => [],
                            ],
                        ], JSON_THROW_ON_ERROR),
                    ]],
                ],
            ]],
        ];

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response($modelResponse, 200),
        ]);

        foreach (['left_sleeve' => 'Lengan Kiri', 'right_sleeve' => 'Lengan Kanan'] as $side => $expectedArea) {
            $this->actingAs($user, 'sanctum')
                ->post('/api/v1/designs/analyze', [
                    'image' => UploadedFile::fake()->image("{$side}.png", 32, 32),
                    'current_side' => $side,
                ], ['Accept' => 'application/json'])
                ->assertOk()
                ->assertJsonPath('data.recommendations.placement.side', $side)
                ->assertJsonPath('data.recommendations.placement.position_code', $side)
                ->assertJsonPath('data.recommendations.placement.area', $expectedArea)
                ->assertJsonPath('data.recommendations.placement_options.0.side', $side)
                ->assertJsonCount(1, 'data.recommendations.placement_options');
        }
    }

    public function test_design_analysis_falls_back_to_the_next_model_after_provider_overload(): void
    {
        $user = User::factory()->create();
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model' => 'gemini-3.8-flash',
        ]);

        $successResponse = [
            'candidates' => [[
                'content' => [
                    'parts' => [[
                        'text' => json_encode([
                            'summary' => 'Logo sederhana untuk kaos.',
                            'composition' => ['complexity' => 'simple'],
                            'recommendations' => [
                                'placement' => [
                                    'position_code' => 'center_chest',
                                    'side' => 'front',
                                    'area' => 'Dada Tengah',
                                    'scale_category' => 'medium',
                                    'position_x_percent' => 50,
                                    'position_y_percent' => 32,
                                    'width_percent' => 55,
                                    'reason' => 'Proporsional untuk area dada.',
                                ],
                                'placement_options' => [],
                            ],
                        ], JSON_THROW_ON_ERROR),
                    ]],
                ],
            ]],
        ];

        $sequence = Http::sequence()
            ->push(['error' => ['message' => 'The model is currently overloaded.']], 503)
            ->push($successResponse, 200);

        Http::fake([
            'generativelanguage.googleapis.com/*' => $sequence,
        ]);

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/designs/analyze', [
                'image' => UploadedFile::fake()->image('fallback-test.png', 32, 32),
                'current_side' => 'front',
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.recommendations.placement.side', 'front');

        Http::assertSentCount(2);
        Http::assertSent(fn (HttpRequest $request) => str_contains(
            $request->url(),
            'models/gemini-3.8-flash:generateContent'
        ));
        Http::assertSent(fn (HttpRequest $request) => str_contains(
            $request->url(),
            'models/gemini-3.6-flash:generateContent'
        ));
    }

    public function test_design_analysis_rejects_project_and_asset_ids_owned_by_another_user(): void
    {
        $owner = User::factory()->create();
        $requestingUser = User::factory()->create();

        $privateProject = $owner->projects()->create([
            'name' => 'Private project',
            'status' => 'draft',
            'canvas_config' => [],
            'editor_state' => [],
        ]);

        $privateAsset = $owner->uploadedAssets()->create([
            'original_name' => 'private-artwork.png',
            'file_path' => 'uploaded-assets/private-artwork.png',
            'mime_type' => 'image/png',
            'file_size' => 1,
            'image_width' => 1,
            'image_height' => 1,
        ]);

        $this->actingAs($requestingUser, 'sanctum')
            ->postJson('/api/v1/designs/analyze', [
                'project_id' => $privateProject->id,
                'uploaded_asset_id' => $privateAsset->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image', 'project_id', 'uploaded_asset_id']);
    }

    public function test_project_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/projects')->assertUnauthorized();
        $this->postJson('/api/v1/projects', [])->assertUnauthorized();
        $this->postJson('/api/v1/assets', [])->assertUnauthorized();
    }
}
