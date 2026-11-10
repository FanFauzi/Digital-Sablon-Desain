<?php

namespace Tests\Feature;

use App\Models\UploadedAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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
            ->assertJsonPath('data.canvas_config.shirt_id', $shirtId);

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

    public function test_project_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/projects')->assertUnauthorized();
        $this->postJson('/api/v1/projects', [])->assertUnauthorized();
        $this->postJson('/api/v1/assets', [])->assertUnauthorized();
    }
}
