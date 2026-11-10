<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ShirtController;
use App\Http\Controllers\Api\V1\DesignAnalysisController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\UploadedAssetController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    Route::post('/designs/analyze', [DesignAnalysisController::class, 'analyze']);
    Route::get('/shirts', [ShirtController::class, 'index']);
    Route::get('/shirts/{id}', [ShirtController::class, 'show'])
        ->whereNumber('id');

    Route::get('/shirts/{id}/print-areas', [
        ShirtController::class,
        'printAreas',
    ])->whereNumber('id');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/assets', [UploadedAssetController::class, 'store']);
        Route::get('/assets/{asset}/content', [UploadedAssetController::class, 'showContent'])
            ->whereNumber('asset');

        Route::get('/projects', [ProjectController::class, 'index']);
        Route::get('/projects/{project}', [ProjectController::class, 'show'])->whereNumber('project');
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::put('/projects/{project}', [ProjectController::class, 'update'])
            ->whereNumber('project');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])
            ->whereNumber('project');
        Route::post('/projects/{project}/exports', [ProjectController::class, 'recordExport'])
            ->whereNumber('project');
    });
});
