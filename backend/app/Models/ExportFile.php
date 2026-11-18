<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExportFile extends Model
{
    protected $fillable = [
        'project_id',
        'file_name',
        'file_path',
        'format',
        'width_cm',
        'height_cm',
        'dpi',
        'pixel_width',
        'pixel_height',
    ];

    protected function casts(): array
    {
        return [
            'width_cm' => 'float',
            'height_cm' => 'float',
            'dpi' => 'integer',
            'pixel_width' => 'integer',
            'pixel_height' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
