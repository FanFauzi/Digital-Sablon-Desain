<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use JsonException;

class DesignAnalysisController extends Controller
{
    public function analyze(Request $request): JsonResponse
    {
        // Beri waktu lebih panjang untuk respons analisis multimodal dari Gemini.
        set_time_limit(120);

        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
        ]);

        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-3.8-flash');

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API belum dikonfigurasi. Tambahkan GEMINI_API_KEY pada backend.',
            ], 503);
        }

        $file = $validated['image'];
        $mimeType = $file->getMimeType();

        $prompt = <<<'PROMPT'
You are an expert visual analyst for custom T-shirt printing.
Analyze the uploaded artwork image only. Do not claim to know fabric or garment details that are not visible.
Return one valid JSON object, without markdown fences, using exactly this structure:
{
  "summary": "short Indonesian summary",
  "objects": [{"name": "object or subject", "description": "visible characteristics"}],
  "dominant_colors": [{"name": "color name", "hex": "#RRGGBB"}],
  "composition": {
    "orientation": "portrait, landscape, or square",
    "complexity": "simple, moderate, or complex",
    "focal_point": "main visual focus"
  },
  "recommendations": {
    "shirt_colors": [{"name": "color name", "hex": "#RRGGBB", "reason": "reason in Indonesian"}],
    "placement": {
      "area": "front chest, center chest, left chest, back, or other suitable area",
      "position_x_percent": 50,
      "position_y_percent": 45,
      "width_percent": 35,
      "reason": "reason in Indonesian"
    },
    "print_method": {
      "method": "DTF, screen printing, or other suitable method",
      "reason": "reason in Indonesian"
    },
    "warnings": ["practical warning in Indonesian, if any"]
  },
  "confidence": {
    "score": 0,
    "explanation": "brief explanation in Indonesian"
  }
}
Rules:
- Write all explanatory text in Indonesian.
- Percentages must be numeric from 0 to 100 and represent a suggested starting point, not a guaranteed production measurement.
- Recommend shirt colors with sufficient contrast against the artwork.
- Be cautious: do not infer exact printability, fabric, or production quality from an image alone.
- If the image is unclear, say so in warnings and lower the confidence score.
- Confidence score is your qualitative self-assessment from 0 to 100, not a measured probability.
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
                ],
            ];

            // Coba model utama terlebih dahulu. Jika 3.8 mengalami overload,
            // alihkan ke 3.6 Flash yang juga mendukung tugas multimodal.
            $modelsToTry = array_values(array_unique([$model, 'gemini-3.6-flash']));
            $retryableStatuses = [429, 500, 502, 503, 504];
            $response = null;
            $usedModel = null;
            $lastConnectionError = null;

            foreach ($modelsToTry as $candidateModel) {
                $response = null;

                for ($attempt = 1; $attempt <= 2; $attempt++) {
                    try {
                        $attemptResponse = Http::acceptJson()
                            ->withHeaders(['x-goog-api-key' => $apiKey])
                            ->connectTimeout(10)
                            ->timeout(20)
                            ->post(
                                "https://generativelanguage.googleapis.com/v1beta/models/{$candidateModel}:generateContent",
                                $payload
                            );
                        $response = $attemptResponse;
                        $usedModel = $candidateModel;
                        $lastConnectionError = null;
                    } catch (ConnectionException $exception) {
                        $response = null;
                        $lastConnectionError = $exception;
                        Log::warning('Gemini connection attempt failed.', [
                            'model' => $candidateModel,
                            'attempt' => $attempt,
                            'message' => $exception->getMessage(),
                        ]);

                        if ($attempt < 2) {
                            usleep(1000000 + random_int(0, 500000));
                            continue;
                        }

                        // Model berikutnya akan dicoba setelah koneksi model ini gagal.
                        break;
                    }

                    if ($response->successful()) {
                        break 2;
                    }

                    $status = $response->status();
                    Log::notice('Gemini returned an error during design analysis.', [
                        'model' => $candidateModel,
                        'attempt' => $attempt,
                        'status' => $status,
                        'body' => $response->json('error.message'),
                    ]);

                    // Jangan pindah model untuk kesalahan autentikasi, model tidak ditemukan,
                    // atau payload tidak valid. 429 juga lebih tepat ditangani sebagai limit akun.
                    if (!in_array($status, $retryableStatuses, true) || $status === 429) {
                        break 2;
                    }

                    if ($attempt < 2) {
                        usleep(1000000 + random_int(0, 500000));
                    }

                    // Setelah dua kali gagal 5xx, lanjutkan ke model cadangan.
                }
            }

            if (!$response || !$response->successful()) {
                if ($response) {
                    $status = $response->status();
                    Log::warning('Gemini design analysis failed after retries.', [
                        'model' => $usedModel,
                        'status' => $status,
                        'body' => $response->json('error.message'),
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

                    return response()->json([
                        'success' => false,
                        'message' => 'Layanan AI gagal menganalisis gambar. Periksa konfigurasi Gemini dan coba lagi.',
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

            $analysis = json_decode($text, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($analysis) || !isset($analysis['summary'], $analysis['recommendations'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format hasil analisis AI tidak sesuai.',
                ], 502);
            }

            return response()->json([
                'success' => true,
                'message' => 'Analisis desain berhasil.',
                'data' => $analysis,
                'meta' => [
                    'model' => $usedModel,
                    'mime_type' => $mimeType,
                    'image_size_bytes' => $file->getSize(),
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
}
