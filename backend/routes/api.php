<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ShirtController;
use App\Http\Controllers\Api\V1\DesignAnalysisController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::post('/designs/analyze', [DesignAnalysisController::class, 'analyze']);
    Route::get('/shirts', [ShirtController::class, 'index']);
    Route::get('/shirts/{id}', [ShirtController::class, 'show'])
        ->whereNumber('id');

    Route::get('/shirts/{id}/print-areas', [
        ShirtController::class,
        'printAreas',
    ])->whereNumber('id');
});