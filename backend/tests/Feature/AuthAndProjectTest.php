<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_authenticated_user_can_save_and_retrieve_their_own_project(): void
    {
        $user = User::factory()->create();
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
                    'front' => ['objects' => []],
                    'back' => null,
                ],
            ],
        ];

        $created = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/projects', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Kaos Komunitas');

        $projectId = $created->json('data.id');

        $this->getJson("/api/v1/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('data.editor_state.schemaVersion', 2)
            ->assertJsonPath('data.canvas_config.shirt_id', $shirtId);

        $anotherUser = User::factory()->create();

        $this->actingAs($anotherUser, 'sanctum')
            ->getJson("/api/v1/projects/{$projectId}")
            ->assertNotFound();

        $this->assertDatabaseHas('projects', [
            'id' => $projectId,
            'user_id' => $user->id,
        ]);
    }

    public function test_project_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/projects')->assertUnauthorized();
        $this->postJson('/api/v1/projects', [])->assertUnauthorized();
    }
}
