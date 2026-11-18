<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiAnalysisRun extends Model
{
    protected $fillable = [
        'project_id',
        'uploaded_asset_id',
        'model_name',
        'prompt_version',
        'status',
        'processing_time_ms',
        'raw_response',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'processing_time_ms' => 'integer',
            'raw_response' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function uploadedAsset(): BelongsTo
    {
        return $this->belongsTo(UploadedAsset::class);
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(AiRecommendation::class);
    }
}
