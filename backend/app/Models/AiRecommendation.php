<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRecommendation extends Model
{
    protected $fillable = [
        'ai_analysis_run_id',
        'position_code',
        'scale_category',
        'reason',
        'confidence',
        'coordinates',
        'is_selected',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'float',
            'coordinates' => 'array',
            'is_selected' => 'boolean',
        ];
    }

    public function analysisRun(): BelongsTo
    {
        return $this->belongsTo(AiAnalysisRun::class, 'ai_analysis_run_id');
    }
}
