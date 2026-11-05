<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintArea extends Model
{
    protected $fillable = [
        'shirt_id',
        'view_side',
        'area_name',
        'logical_width',
        'logical_height',
        'physical_width_cm',
        'physical_height_cm',
        'dpi',
        'position_config',
    ];

    protected function casts(): array
    {
        return [
            'position_config' => 'array',
            'physical_width_cm' => 'decimal:2',
            'physical_height_cm' => 'decimal:2',
        ];
    }

    public function shirt(): BelongsTo
    {
        return $this->belongsTo(Shirt::class);
    }
}
