<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use JsonException;

class DesignAnalysisController extends Controller
{
    private const PLACEMENT_PRESETS = [
        'left_chest' => [
            'position_code' => 'left_chest',
            'side' => 'front',
            'area' => 'Dada Kiri (Logo Pocket)',
            'scale_category' => 'small',
            'position_x_percent' => 72,
            'position_y_percent' => 22,
            'width_percent' => 25,
        ],
        'right_chest' => [
            'position_code' => 'right_chest',
            'side' => 'front',
            'area' => 'Dada Kanan',
            'scale_category' => 'small',
            'position_x_percent' => 28,
            'position_y_percent' => 22,
            'width_percent' => 25,
        ],
        'center_chest' => [
            'position_code' => 'center_chest',
            'side' => 'front',
            'area' => 'Dada Tengah Atas',
            'scale_category' => 'medium',
            'position_x_percent' => 50,
            'position_y_percent' => 30,
            'width_percent' => 56,
        ],
        'full_front' => [
            'position_code' => 'full_front',
            'side' => 'front',
            'area' => 'Depan Tengah Penuh (Center Graphic)',
            'scale_category' => 'large',
            'position_x_percent' => 50,
            'position_y_percent' => 46,
            'width_percent' => 78,
        ],
        'upper_back' => [
            'position_code' => 'upper_back',
            'side' => 'back',
            'area' => 'Punggung Atas (Nape / Yoke)',
            'scale_category' => 'small',
            'position_x_percent' => 50,
            'position_y_percent' => 18,
            'width_percent' => 34,
        ],
        'back_center' => [
            'position_code' => 'back_center',
            'side' => 'back',
            'area' => 'Punggung Tengah Penuh (Back Graphic)',
            'scale_category' => 'large',
            'position_x_percent' => 50,
            'position_y_percent' => 45,
            'width_percent' => 80,
        ],
        'bottom_left' => [
            'position_code' => 'bottom_left',
            'side' => 'front',
            'area' => 'Bawah Kiri Kaos (Hem Tag)',
            'scale_category' => 'small',
            'position_x_percent' => 72,
            'position_y_percent' => 80,
            'width_percent' => 26,
        ],
        'left_sleeve' => [
            'position_code' => 'left_sleeve',
            'side' => 'left_sleeve',
            'area' => 'Lengan Kiri',
            'scale_category' => 'small',
            'position_x_percent' => 50,
            'position_y_percent' => 48,
            'width_percent' => 55,
        ],
        'right_sleeve' => [
            'position_code' => 'right_sleeve',
            'side' => 'right_sleeve',
            'area' => 'Lengan Kanan',
            'scale_category' => 'small',
            'position_x_percent' => 50,
            'position_y_percent' => 48,
            'width_percent' => 55,
        ],
    ];

    public function analyze(Request $request): JsonResponse
    {
        // Beri waktu lebih panjang untuk respons analisis multimodal dari Gemini.
        set_time_limit(120);

        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
            'shirt_type' => ['nullable', 'string', 'max:40'],
            'current_side' => ['nullable', 'string', 'in:front,back,left_sleeve,right_sleeve'],
            'current_color' => ['nullable', 'string', 'max:32'],
            'project_id' => [
                'nullable',
                'integer',
                Rule::exists('projects', 'id')->where(
                    fn ($query) => $query->where('user_id', $request->user()->id)
                ),
            ],
            'uploaded_asset_id' => [
                'nullable',
                'integer',
                Rule::exists('uploaded_assets', 'id')->where(
                    fn ($query) => $query->where('user_id', $request->user()->id)
                ),
            ],
        ]);

        $startedAtMs = (int) round(microtime(true) * 1000);

        $apiKey = trim((string) config('services.gemini.api_key'), " \t\n\r\0\x0B\"'");
        $configuredModel = trim((string) config('services.gemini.model', 'gemini-3.8-flash'));
        if (in_array($configuredModel, ['', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'], true)) {
            $configuredModel = 'gemini-3.8-flash';
        }

        if ($apiKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API belum dikonfigurasi. Tambahkan GEMINI_API_KEY pada file backend/.env lalu jalankan php artisan optimize:clear.',
            ], 503);
        }

        $file = $validated['image'];
        $mimeType = $file->getMimeType();
        $shirtType = $validated['shirt_type'] ?? 'tshirt';
        $currentSide = $validated['current_side'] ?? 'front';
        $currentColor = $validated['current_color'] ?? '#ffffff';

        $imageDimensions = @getimagesize($file->getRealPath());
        $imgWidth = is_array($imageDimensions) ? (int) ($imageDimensions[0] ?? 0) : 0;
        $imgHeight = is_array($imageDimensions) ? (int) ($imageDimensions[1] ?? 0) : 0;
        $aspectRatio = ($imgWidth > 0 && $imgHeight > 0)
            ? round($imgWidth / $imgHeight, 2)
            : 1.0;

        $prompt = <<<PROMPT
You are an expert garment graphic designer and visual analyst for custom T-shirt and Hoodie printing (sablon digital).
Analyze the uploaded artwork image carefully and recommend the most visually proportional placement on the garment print area.

Context:
- Product type: {$shirtType}
- Active canvas side: {$currentSide} (front, back, left_sleeve, or right_sleeve)
- Current garment color: {$currentColor}
- Uploaded image dimensions: {$imgWidth}x{$imgHeight} px (aspect ratio: {$aspectRatio})

Coordinate system inside the garment print area:
- position_x_percent: horizontal center of the artwork inside the print box (0 = left edge of canvas, 50 = horizontal center, 72 = wearer's left chest / right side when viewing front).
- position_y_percent: vertical center of the artwork inside the print box (18-24 = upper chest / upper back, 30-34 = center chest, 45-48 = full center torso, 78-82 = lower hem).
- width_percent: artwork width relative to print box width (22-28 = small badge/logo/emblem, 48-60 = medium chest graphic/typography, 72-84 = large full illustration/poster).

Available placement position_code presets:
1. "left_chest" -> small logo/badge/emblem/monogram/icon (side: "front", X: 70-74, Y: 20-24, width: 22-28)
2. "center_chest" -> horizontal wordmark/medium graphic/chest banner (side: "front", X: 50, Y: 28-34, width: 50-60)
3. "full_front" -> detailed illustration/character/large vertical or square graphic on front (side: "front", X: 50, Y: 44-48, width: 72-82)
4. "upper_back" -> small back collar/yoke logo or label (side: "back", X: 50, Y: 16-22, width: 30-38)
5. "back_center" -> large street-style back artwork/poster graphic (side: "back", X: 50, Y: 44-48, width: 75-84)
6. "bottom_left" -> small lower hem tag/stamp graphic (side: "front", X: 72, Y: 78-82, width: 24-30)
7. "left_sleeve" -> small sleeve graphic on the left sleeve print surface (side: "left_sleeve", X: 50, Y: 48, width: 45-60)
8. "right_sleeve" -> small sleeve graphic on the right sleeve print surface (side: "right_sleeve", X: 50, Y: 48, width: 45-60)

Return one valid JSON object, without markdown fences, using this exact schema:
{
  "summary": "ringkasan visual desain dalam bahasa Indonesia",
  "objects": [{"name": "nama objek/subjek", "description": "karakteristik visual"}],
  "dominant_colors": [{"name": "nama warna", "hex": "#RRGGBB"}],
  "composition": {
    "orientation": "portrait | landscape | square",
    "complexity": "simple | moderate | complex",
    "focal_point": "fokus visual utama"
  },
  "recommendations": {
    "shirt_colors": [{"name": "nama warna kaos", "hex": "#RRGGBB", "reason": "alasan kontras dalam bahasa Indonesia"}],
    "placement": {
      "position_code": "choose a preset compatible with the active canvas side",
      "side": "must exactly match the active canvas side: front, back, left_sleeve, or right_sleeve",
      "area": "nama area penempatan dalam bahasa Indonesia",
      "scale_category": "small | medium | large",
      "position_x_percent": "<integer tailored to the chosen zone>",
      "position_y_percent": "<integer tailored to the chosen zone>",
      "width_percent": "<integer tailored to the artwork complexity and aspect ratio>",
      "reason": "penjelasan spesifik mengapa posisi dan ukuran ini paling proporsional untuk gambar ini"
    },
    "placement_options": [
      {
        "position_code": "a preset compatible with the active canvas side",
        "side": "must exactly match the active canvas side",
        "area": "nama area",
        "scale_category": "small | medium | large",
        "position_x_percent": "<integer>",
        "position_y_percent": "<integer>",
        "width_percent": "<integer>",
        "reason": "alasan singkat"
      }
    ],
    "print_method": {
      "method": "DTF, Sablon Plastisol, Discharge, atau metode relevan lainnya",
      "reason": "alasan teknis berdasarkan jumlah warna, gradasi, dan detail"
    },
    "warnings": ["catatan produksi praktis dalam bahasa Indonesia"]
  },
  "confidence": {
    "score": "<integer 1-100>",
    "explanation": "penjelasan singkat tingkat keyakinan analisis dalam bahasa Indonesia"
  }
}

Rules:
- NEVER output generic placeholder numbers like 50, 45, 35 together. Choose coordinates and width_percent that genuinely match the visual nature of the uploaded image (e.g., small badge/icon -> left_chest with width ~25%; wide text/logo -> center_chest with Y ~30% and width ~55%; complex artwork/poster -> full_front or back_center with width ~76-82%).
- The recommendation and every item in `placement_options` MUST target the active canvas side only. Do not recommend a different side because the user is analyzing a specific print surface.
- For front/back surfaces, provide up to 3 distinct placement options on that same side. For sleeve surfaces, provide one suitable sleeve placement.
- All numeric fields (`position_x_percent`, `position_y_percent`, `width_percent`, `confidence.score`) MUST be numbers, not strings.
PROMPT;

        try {
            $payload = [
                'contents' => [[
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => base64_encode(file_get_contents($file->getRealPath())),
                            ],
                        ],
                    ],
                ]],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'temperature' => 0.35,
                ],
            ];

            // Batasi total percobaan: satu request per model, lalu fallback jika model sibuk/tidak tersedia.
            // Batas waktu 22 detik per model menjaga request web tetap di bawah batas eksekusi backend.
            $modelsToTry = array_values(array_unique([
                $configuredModel,
                'gemini-3.8-flash',
                'gemini-3.6-flash',
                'gemini-3.5-flash-lite',
            ]));
            $response = null;
            $usedModel = null;
            $lastConnectionError = null;
            $totalDeadline = microtime(true) + 25.0;

            foreach ($modelsToTry as $candidateModel) {
                $remainingSeconds = $totalDeadline - microtime(true);
                if ($remainingSeconds <= 1.0) {
                    Log::warning('Gemini fallback budget exhausted before the next model attempt.', [
                        'last_model' => $usedModel,
                    ]);
                    break;
                }

                $requestTimeout = min(22.0, $remainingSeconds);
                $connectTimeout = min(8.0, $requestTimeout);

                try {
                    $attemptResponse = Http::acceptJson()
                        ->withHeaders(['x-goog-api-key' => $apiKey])
                        ->connectTimeout($connectTimeout)
                        ->timeout($requestTimeout)
                        ->post(
                            "https://generativelanguage.googleapis.com/v1beta/models/{$candidateModel}:generateContent",
                            $payload
                        );
                    $response = $attemptResponse;
                    $usedModel = $candidateModel;
                    $lastConnectionError = null;
                } catch (ConnectionException $exception) {
                    $lastConnectionError = $exception;
                    Log::warning('Gemini connection attempt failed.', [
                        'model' => $candidateModel,
                        'message' => $exception->getMessage(),
                    ]);

                    // Lanjut ke model cadangan tanpa mengulang request yang sama.
                    continue;
                }

                if ($response->successful()) {
                    break;
                }

                $status = $response->status();
                $errorMessage = (string) ($response->json('error.message') ?? '');
                Log::notice('Gemini returned an error during design analysis.', [
                    'model' => $candidateModel,
                    'status' => $status,
                    'body' => $errorMessage,
                ]);

                // Kredensial salah dan kuota habis tidak akan diselesaikan dengan mencoba model lain.
                if (
                    ($status === 400 && str_contains(strtolower($errorMessage), 'api key')) ||
                    $status === 429
                ) {
                    break;
                }

                // Untuk 4xx terkait model dan 5xx kapasitas/provider, coba model cadangan berikutnya.
                if (in_array($status, [400, 403, 404, 500, 502, 503, 504], true)) {
                    continue;
                }

                break;
            }

            if (!$response || !$response->successful()) {
                if ($response) {
                    $status = $response->status();
                    $upstreamError = trim((string) ($response->json('error.message') ?? ''));
                    Log::warning('Gemini design analysis failed after retries.', [
                        'model' => $usedModel,
                        'status' => $status,
                        'body' => $upstreamError,
                    ]);

                    if ($status === 429) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Batas penggunaan Gemini tercapai. Periksa kuota atau coba lagi setelah beberapa saat.',
                        ], 429);
                    }

                    if (in_array($status, [503, 504], true)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Model AI utama dan cadangan sedang sibuk. Silakan coba lagi beberapa saat.',
                        ], 503);
                    }

                    if (str_contains(strtolower($upstreamError), 'api key')) {
                        return response()->json([
                            'success' => false,
                            'message' => 'GEMINI_API_KEY pada backend/.env tidak valid. Periksa kembali API key Anda lalu jalankan php artisan optimize:clear.',
                        ], 502);
                    }

                    $detailSuffix = (app()->environment('local') && $upstreamError !== '')
                        ? " (Detail: {$upstreamError})"
                        : '';

                    return response()->json([
                        'success' => false,
                        'message' => 'Layanan AI gagal menganalisis gambar. Periksa konfigurasi Gemini dan coba lagi.' . $detailSuffix,
                    ], 502);
                }

                Log::error('All Gemini model connection attempts failed.', [
                    'message' => $lastConnectionError?->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Koneksi ke layanan AI terputus atau terlalu lama. Silakan coba lagi.',
                ], 504);
            }

            $text = $response->json('candidates.0.content.parts.0.text');

            if (!is_string($text) || trim($text) === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'AI tidak mengembalikan hasil analisis yang dapat dibaca.',
                ], 502);
            }

            $cleanedText = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text));
            $analysis = json_decode($cleanedText ?: $text, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($analysis) || !isset($analysis['summary'], $analysis['recommendations'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format hasil analisis AI tidak sesuai.',
                ], 502);
            }

            $analysis = $this->normalizeAnalysisPayload($analysis, $aspectRatio, $currentSide);
            $processingTimeMs = max(1, (int) round(microtime(true) * 1000) - $startedAtMs);

            $runRecordId = null;
            if (! empty($validated['project_id'])) {
                try {
                    $run = \App\Models\AiAnalysisRun::create([
                        'project_id' => (int) $validated['project_id'],
                        'uploaded_asset_id' => ! empty($validated['uploaded_asset_id'])
                            ? (int) $validated['uploaded_asset_id']
                            : null,
                        'model_name' => $usedModel,
                        'prompt_version' => 'v2.0',
                        'status' => 'completed',
                        'processing_time_ms' => $processingTimeMs,
                        'raw_response' => $analysis,
                    ]);
                    $runRecordId = $run->id;

                    $confidenceDecimal = isset($analysis['confidence']['score'])
                        ? round(min(1, max(0, ((float) $analysis['confidence']['score']) / 100)), 5)
                        : null;

                    $optionsToSave = $analysis['recommendations']['placement_options'] ?? [];
                    foreach ($optionsToSave as $idx => $opt) {
                        $run->recommendations()->create([
                            'position_code' => substr((string) ($opt['position_code'] ?? 'center_chest'), 0, 50),
                            'scale_category' => substr((string) ($opt['scale_category'] ?? 'medium'), 0, 30),
                            'reason' => $opt['reason'] ?? null,
                            'confidence' => $confidenceDecimal,
                            'coordinates' => [
                                'side' => $opt['side'] ?? $currentSide,
                                'area' => $opt['area'] ?? null,
                                'position_x_percent' => $opt['position_x_percent'] ?? 50,
                                'position_y_percent' => $opt['position_y_percent'] ?? 32,
                                'width_percent' => $opt['width_percent'] ?? 50,
                            ],
                            'is_selected' => $idx === 0,
                        ]);
                    }
                } catch (\Throwable $persistError) {
                    Log::warning('Failed to persist AI analysis run history.', [
                        'message' => $persistError->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Analisis desain berhasil.',
                'data' => $analysis,
                'meta' => [
                    'model' => $usedModel,
                    'mime_type' => $mimeType,
                    'image_size_bytes' => $file->getSize(),
                    'image_width' => $imgWidth,
                    'image_height' => $imgHeight,
                    'processing_time_ms' => $processingTimeMs,
                    'analysis_run_id' => $runRecordId,
                ],
            ]);
        } catch (JsonException $exception) {
            Log::warning('Gemini returned invalid JSON for design analysis.');
            return response()->json([
                'success' => false,
                'message' => 'Hasil analisis AI tidak dapat diproses. Silakan coba lagi.',
            ], 502);
        } catch (\Throwable $exception) {
            Log::error('Design analysis failed.', ['message' => $exception->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghubungi layanan AI.',
            ], 500);
        }
    }

    private function normalizeAnalysisPayload(array $analysis, float $aspectRatio, string $currentSide): array
    {
        $complexity = strtolower((string) ($analysis['composition']['complexity'] ?? 'moderate'));
        $rawPlacement = is_array($analysis['recommendations']['placement'] ?? null)
            ? $analysis['recommendations']['placement']
            : [];

        $primaryPlacement = $this->normalizeSinglePlacement($rawPlacement, $complexity, $aspectRatio, $currentSide);
        $analysis['recommendations']['placement'] = $primaryPlacement;

        $rawOptions = is_array($analysis['recommendations']['placement_options'] ?? null)
            ? $analysis['recommendations']['placement_options']
            : [];

        $normalizedOptions = [];
        $usedCodes = [];

        // Selalu tempatkan rekomendasi utama sebagai opsi pertama.
        $normalizedOptions[] = $primaryPlacement;
        $usedCodes[$primaryPlacement['position_code']] = true;

        foreach ($rawOptions as $option) {
            if (!is_array($option)) {
                continue;
            }
            $normalized = $this->normalizeSinglePlacement($option, $complexity, $aspectRatio, $currentSide);
            $code = $normalized['position_code'];
            if (!isset($usedCodes[$code])) {
                $normalizedOptions[] = $normalized;
                $usedCodes[$code] = true;
            }
            if (count($normalizedOptions) >= 3) {
                break;
            }
        }

        // Tambahkan alternatif yang tetap berada pada permukaan aktif.
        $fallbackOrder = match ($currentSide) {
            'back' => ['back_center', 'upper_back'],
            'left_sleeve' => ['left_sleeve'],
            'right_sleeve' => ['right_sleeve'],
            default => ['center_chest', 'left_chest', 'full_front', 'right_chest', 'bottom_left'],
        };
        foreach ($fallbackOrder as $fallbackCode) {
            if (count($normalizedOptions) >= 3) {
                break;
            }
            if (isset($usedCodes[$fallbackCode])) {
                continue;
            }
            $preset = self::PLACEMENT_PRESETS[$fallbackCode];
            $normalizedOptions[] = array_merge($preset, [
                'reason' => $this->defaultReasonForPreset($fallbackCode),
            ]);
            $usedCodes[$fallbackCode] = true;
        }

        $analysis['recommendations']['placement_options'] = $normalizedOptions;

        if (isset($analysis['confidence']['score'])) {
            $analysis['confidence']['score'] = max(1, min(100, (int) round((float) $analysis['confidence']['score'])));
        }

        return $analysis;
    }

    private function normalizeSinglePlacement(
        array $placement,
        string $complexity,
        float $aspectRatio,
        string $currentSide
    ): array {
        $code = strtolower(trim((string) ($placement['position_code'] ?? '')));
        $areaText = strtolower(trim((string) ($placement['area'] ?? '')));

        if (!isset(self::PLACEMENT_PRESETS[$code])) {
            $code = $this->inferPresetCodeFromText($areaText, $complexity, $aspectRatio, $currentSide);
        }

        // Jangan izinkan AI menempatkan desain pada sisi yang berbeda dari canvas aktif.
        $requestedPresetSide = self::PLACEMENT_PRESETS[$code]['side'] ?? null;
        $requestedPlacementSide = $placement['side'] ?? null;
        $sideMismatch = $requestedPresetSide !== $currentSide
            || (is_string($requestedPlacementSide) && $requestedPlacementSide !== $currentSide);

        if ($sideMismatch) {
            $code = $this->defaultPresetCodeForSide($currentSide, $complexity, $aspectRatio);
            $fallbackPreset = self::PLACEMENT_PRESETS[$code];
            $placement['area'] = $fallbackPreset['area'];
            $placement['scale_category'] = $fallbackPreset['scale_category'];
            $placement['position_x_percent'] = $fallbackPreset['position_x_percent'];
            $placement['position_y_percent'] = $fallbackPreset['position_y_percent'];
            $placement['width_percent'] = $fallbackPreset['width_percent'];
            $placement['reason'] = $this->defaultReasonForPreset($code);
        }

        $preset = self::PLACEMENT_PRESETS[$code] ?? self::PLACEMENT_PRESETS['center_chest'];

        $posX = is_numeric($placement['position_x_percent'] ?? null)
            ? (int) round((float) $placement['position_x_percent'])
            : $preset['position_x_percent'];
        $posY = is_numeric($placement['position_y_percent'] ?? null)
            ? (int) round((float) $placement['position_y_percent'])
            : $preset['position_y_percent'];
        $width = is_numeric($placement['width_percent'] ?? null)
            ? (int) round((float) $placement['width_percent'])
            : $preset['width_percent'];

        // Jika nilai koordinat masih berupa angka template generik (50, 45, 35) atau tidak sesuai zona preset,
        // sesuaikan dengan koordinat zona preset agar perubahan di kanvas benar-benar akurat dan terlihat.
        $isGenericTemplate = ($posX === 50 && $posY === 45 && $width === 35);

        if ($isGenericTemplate) {
            $posX = $preset['position_x_percent'];
            $posY = $preset['position_y_percent'];
            $width = $preset['width_percent'];
        } else {
            if ($code === 'left_chest') {
                $posX = max(65, min(78, $posX === 50 ? $preset['position_x_percent'] : $posX));
                $posY = max(16, min(28, $posY > 32 ? $preset['position_y_percent'] : $posY));
                $width = max(18, min(30, $width > 32 ? $preset['width_percent'] : $width));
            } elseif ($code === 'right_chest') {
                $posX = max(22, min(35, $posX === 50 ? $preset['position_x_percent'] : $posX));
                $posY = max(16, min(28, $posY > 32 ? $preset['position_y_percent'] : $posY));
                $width = max(18, min(30, $width > 32 ? $preset['width_percent'] : $width));
            } elseif ($code === 'center_chest') {
                $posX = 50;
                $posY = max(24, min(36, $posY > 38 ? $preset['position_y_percent'] : $posY));
                $width = max(45, min(64, $width < 42 ? $preset['width_percent'] : $width));
            } elseif ($code === 'full_front') {
                $posX = 50;
                $posY = max(42, min(52, $posY));
                $width = max(68, min(86, $width < 65 ? $preset['width_percent'] : $width));
            } elseif ($code === 'upper_back') {
                $posX = 50;
                $posY = max(14, min(24, $posY > 28 ? $preset['position_y_percent'] : $posY));
                $width = max(26, min(42, $width));
            } elseif ($code === 'back_center') {
                $posX = 50;
                $posY = max(42, min(52, $posY));
                $width = max(70, min(86, $width < 68 ? $preset['width_percent'] : $width));
            } elseif ($code === 'bottom_left') {
                $posX = max(65, min(78, $posX === 50 ? $preset['position_x_percent'] : $posX));
                $posY = max(72, min(84, $posY < 65 ? $preset['position_y_percent'] : $posY));
                $width = max(20, min(32, $width));
            } elseif ($code === 'left_sleeve' || $code === 'right_sleeve') {
                $posX = 50;
                $posY = max(25, min(75, $posY));
                $width = max(35, min(70, $width));
            }
        }

        $side = $currentSide;

        return [
            'position_code' => $code,
            'side' => $side,
            'area' => trim((string) ($placement['area'] ?? '')) !== ''
                ? $placement['area']
                : $preset['area'],
            'scale_category' => $placement['scale_category'] ?? $preset['scale_category'],
            'position_x_percent' => $posX,
            'position_y_percent' => $posY,
            'width_percent' => $width,
            'reason' => trim((string) ($placement['reason'] ?? '')) !== ''
                ? $placement['reason']
                : $this->defaultReasonForPreset($code),
        ];
    }

    private function inferPresetCodeFromText(
        string $areaText,
        string $complexity,
        float $aspectRatio,
        string $currentSide
    ): string {
        if (str_contains($areaText, 'kiri') || str_contains($areaText, 'left') || str_contains($areaText, 'pocket') || str_contains($areaText, 'saku')) {
            return str_contains($areaText, 'bawah') || str_contains($areaText, 'bottom')
                ? 'bottom_left'
                : 'left_chest';
        }

        if (str_contains($areaText, 'kanan') || str_contains($areaText, 'right')) {
            return 'right_chest';
        }

        if (str_contains($areaText, 'belakang') || str_contains($areaText, 'punggung') || str_contains($areaText, 'back')) {
            return (str_contains($areaText, 'atas') || str_contains($areaText, 'upper') || str_contains($areaText, 'kerah'))
                ? 'upper_back'
                : 'back_center';
        }

        if (str_contains($areaText, 'penuh') || str_contains($areaText, 'full') || str_contains($areaText, 'besar') || str_contains($areaText, 'utama')) {
            return $currentSide === 'back' ? 'back_center' : 'full_front';
        }

        if (str_contains($areaText, 'dada tengah') || str_contains($areaText, 'center chest') || str_contains($areaText, 'tengah atas')) {
            return 'center_chest';
        }

        if ($currentSide === 'left_sleeve') {
            return 'left_sleeve';
        }

        if ($currentSide === 'right_sleeve') {
            return 'right_sleeve';
        }

        if ($currentSide === 'back') {
            return $complexity === 'simple' ? 'upper_back' : 'back_center';
        }

        if ($complexity === 'simple' && $aspectRatio >= 0.75 && $aspectRatio <= 1.35) {
            return 'left_chest';
        }

        if ($complexity === 'complex' || $aspectRatio < 0.85) {
            return 'full_front';
        }

        return 'center_chest';
    }

    private function defaultPresetCodeForSide(
        string $side,
        string $complexity,
        float $aspectRatio
    ): string {
        return match ($side) {
            'back' => $complexity === 'simple' ? 'upper_back' : 'back_center',
            'left_sleeve' => 'left_sleeve',
            'right_sleeve' => 'right_sleeve',
            default => $complexity === 'simple'
                ? 'left_chest'
                : ($aspectRatio < 0.85 ? 'full_front' : 'center_chest'),
        };
    }

    private function defaultReasonForPreset(string $code): string
    {
        return match ($code) {
            'left_chest' => 'Ukuran logo kecil di dada kiri memberikan kesan rapi, minimalis, dan proporsional.',
            'right_chest' => 'Penempatan aksen di dada kanan seimbang untuk badge atau emblem sekunder.',
            'center_chest' => 'Posisi dada tengah atas membuat grafik atau tipografi langsung menjadi fokus pandang.',
            'full_front' => 'Ilustrasi tampil maksimal sebagai fokus utama di area tengah depan kaos.',
            'upper_back' => 'Penempatan di punggung atas dekat kerah cocok untuk identitas brand atau aksen minimalis.',
            'back_center' => 'Area punggung tengah memberikan ruang terluas untuk karya visual berdetail tinggi.',
            'bottom_left' => 'Penempatan di sisi bawah kaos memberikan aksen streetwear modern.',
            'left_sleeve' => 'Ukuran dan posisi disesuaikan dengan permukaan cetak lengan kiri.',
            'right_sleeve' => 'Ukuran dan posisi disesuaikan dengan permukaan cetak lengan kanan.',
            default => 'Posisi disesuaikan secara proporsional terhadap area cetak.',
        };
    }
}
