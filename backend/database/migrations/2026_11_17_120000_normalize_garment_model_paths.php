<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('shirts')
            ->where('model_3d_path', '/models/T SHIRT.fbx')
            ->update(['model_3d_path' => '/models/tshirt-regular.glb']);

        DB::table('shirts')
            ->where('model_3d_path', '/models/t-shirt.fbx')
            ->update(['model_3d_path' => '/models/tshirt-regular.glb']);

        DB::table('shirts')
            ->where('model_3d_path', '/models/oversized_t-shirt.glb')
            ->update(['model_3d_path' => '/models/tshirt-oversized.glb']);
    }

    public function down(): void
    {
        // Do not restore references to removed model assets.
    }
};
