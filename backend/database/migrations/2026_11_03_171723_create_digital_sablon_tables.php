
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shirts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['tshirt', 'hoodie']);
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('model_3d_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('shirt_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shirt_id')
                ->constrained('shirts')
                ->cascadeOnDelete();
            $table->string('color_name');
            $table->string('color_hex', 7);
            $table->string('size', 10);
            $table->string('texture_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['shirt_id', 'color_hex', 'size']);
        });

        Schema::create('print_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shirt_id')
                ->constrained('shirts')
                ->cascadeOnDelete();
            $table->string('view_side', 30);
            $table->string('area_name');
            $table->unsignedInteger('logical_width')->default(1000);
            $table->unsignedInteger('logical_height')->default(1200);
            $table->decimal('physical_width_cm', 6, 2);
            $table->decimal('physical_height_cm', 6, 2);
            $table->unsignedSmallInteger('dpi')->default(300);
            $table->json('position_config')->nullable();
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('shirt_variant_id')
                ->nullable()
                ->constrained('shirt_variants')
                ->nullOnDelete();
            $table->string('name');
            $table->string('status')->default('draft');
            $table->json('canvas_config')->nullable();
            $table->json('editor_state')->nullable();
            $table->timestamps();
        });

        Schema::create('uploaded_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('original_name');
            $table->string('file_path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->unsignedInteger('image_width')->nullable();
            $table->unsignedInteger('image_height')->nullable();
            $table->timestamps();
        });

        Schema::create('design_objects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('uploaded_asset_id')
                ->nullable()
                ->constrained('uploaded_assets')
                ->nullOnDelete();
            $table->string('object_type', 50);
            $table->string('object_name')->nullable();
            $table->decimal('position_x', 10, 2)->default(0);
            $table->decimal('position_y', 10, 2)->default(0);
            $table->decimal('object_width', 10, 2)->default(100);
            $table->decimal('object_height', 10, 2)->default(100);
            $table->decimal('rotation', 8, 2)->default(0);
            $table->decimal('scale_x', 8, 3)->default(1);
            $table->decimal('scale_y', 8, 3)->default(1);
            $table->integer('layer_order')->default(0);
            $table->json('properties')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_analysis_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('uploaded_asset_id')
                ->nullable()
                ->constrained('uploaded_assets')
                ->nullOnDelete();
            $table->string('model_name')->nullable();
            $table->string('prompt_version')->nullable();
            $table->string('status')->default('pending');
            $table->unsignedInteger('processing_time_ms')->nullable();
            $table->json('raw_response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_analysis_run_id')
                ->constrained('ai_analysis_runs')
                ->cascadeOnDelete();
            $table->string('position_code', 50);
            $table->string('scale_category', 30)->nullable();
            $table->text('reason')->nullable();
            $table->decimal('confidence', 6, 5)->nullable();
            $table->json('coordinates')->nullable();
            $table->boolean('is_selected')->default(false);
            $table->timestamps();
        });

        Schema::create('tryon_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('photo_path')->nullable();
            $table->string('result_path')->nullable();
            $table->string('processing_status')->default('pending');
            $table->timestamps();
        });

        Schema::create('export_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('format', 20);
            $table->decimal('width_cm', 7, 2)->nullable();
            $table->decimal('height_cm', 7, 2)->nullable();
            $table->unsignedSmallInteger('dpi')->default(300);
            $table->unsignedInteger('pixel_width')->nullable();
            $table->unsignedInteger('pixel_height')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('export_files');
        Schema::dropIfExists('tryon_sessions');
        Schema::dropIfExists('ai_recommendations');
        Schema::dropIfExists('ai_analysis_runs');
        Schema::dropIfExists('design_objects');
        Schema::dropIfExists('uploaded_assets');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('print_areas');
        Schema::dropIfExists('shirt_variants');
        Schema::dropIfExists('shirts');
    }
};
