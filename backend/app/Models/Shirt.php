<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shirt extends Model
{
    protected $fillable = [
        'name',
        'type',
        'description',
        'thumbnail',
        'model_3d_path',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ShirtVariant::class);
    }

    public function printAreas(): HasMany
    {
        return $this->hasMany(PrintArea::class);
    }
}
