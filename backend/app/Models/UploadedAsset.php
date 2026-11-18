<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadedAsset extends Model
{
    protected $fillable = [
        'user_id',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'image_width',
        'image_height',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'image_width' => 'integer',
            'image_height' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
