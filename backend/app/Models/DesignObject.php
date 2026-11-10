<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignObject extends Model
{
    protected $fillable = [
        'project_id',
        'uploaded_asset_id',
        'object_type',
        'object_name',
        'position_x',
        'position_y',
        'object_width',
        'object_height',
        'rotation',
        'scale_x',
        'scale_y',
        'layer_order',
        'properties',
    ];

    protected function casts(): array
    {
        return [
            'position_x' => 'float',
            'position_y' => 'float',
            'object_width' => 'float',
            'object_height' => 'float',
            'rotation' => 'float',
            'scale_x' => 'float',
            'scale_y' => 'float',
            'layer_order' => 'integer',
            'properties' => 'array',
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
}
