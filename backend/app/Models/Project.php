<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $fillable = [
        'user_id',
        'shirt_variant_id',
        'name',
        'status',
        'canvas_config',
        'editor_state',
    ];

    protected function casts(): array
    {
        return [
            'canvas_config' => 'array',
            'editor_state' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shirtVariant(): BelongsTo
    {
        return $this->belongsTo(ShirtVariant::class);
    }

    public function designObjects(): HasMany
    {
        return $this->hasMany(DesignObject::class);
    }

    public function aiAnalysisRuns(): HasMany
    {
        return $this->hasMany(AiAnalysisRun::class);
    }

    public function tryonSessions(): HasMany
    {
        return $this->hasMany(TryonSession::class);
    }

    public function exportFiles(): HasMany
    {
        return $this->hasMany(ExportFile::class);
    }
}
