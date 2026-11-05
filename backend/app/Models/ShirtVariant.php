<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShirtVariant extends Model
{
    protected $fillable = [
        'shirt_id',
        'color_name',
        'color_hex',
        'size',
        'texture_path',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function shirt(): BelongsTo
    {
        return $this->belongsTo(Shirt::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
