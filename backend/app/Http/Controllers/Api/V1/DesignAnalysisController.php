<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use JsonException;

class DesignAnalysisController extends Controller
{
    public function analyze(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
        ]);

        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2.5-flash');

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
            $response = Http::acceptJson()
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->timeout(60)
                ->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                    [
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
                            'temperature' => 0.2,
                        ],
                    ]
                );

            if (!$response->successful()) {
                Log::warning('Gemini design analysis request failed.', [
                    'status' => $response->status(),
                    'body' => $response->json('error.message'),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Layanan AI gagal menganalisis gambar. Coba lagi beberapa saat.',
                ], 502);
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
                    'model' => $model,
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
