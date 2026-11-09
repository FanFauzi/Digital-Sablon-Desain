<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            ShirtSeeder::class,
        ]);

        // Akun demo hanya dibuat pada lingkungan lokal/testing, bukan produksi.
        if (app()->environment(['local', 'testing'])) {
            User::query()->firstOrCreate(
                ['email' => 'test@example.com'],
                [
                    'name' => 'Test User',
                    'password' => 'password',
                ],
            );
        }
    }
}
