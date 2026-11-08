<?php
/**
 * gemini-proxy.php
 * Proxy seguro entre la app React y la API de Google Gemini.
 *
 * Por qué existe: la clave de Gemini NUNCA debe ir en el navegador.
 * El cliente envía solo { action, payload } con una acción de una lista cerrada;
 * este archivo construye el prompt en el servidor, llama a Gemini con la clave
 * (que vive solo aquí) y devuelve el texto. Nadie puede usar tu clave para
 * peticiones arbitrarias: solo las 6 acciones permitidas.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1) Configuración: la clave de Gemini y el origen permitido.
//    La clave se lee, por orden: variable de entorno GEMINI_API_KEY, o config.php.
// ---------------------------------------------------------------------------
$API_KEY        = getenv('GEMINI_API_KEY') ?: '';
$ALLOWED_ORIGIN = ''; // ej: 'https://app.loteriasmalaga70.com' ; vacío = mismo dominio

$configPath = __DIR__ . '/config.php';
if (is_file($configPath)) {
    $cfg = require $configPath;
    if (is_array($cfg)) {
        if ($API_KEY === '' && !empty($cfg['api_key']))       $API_KEY        = (string) $cfg['api_key'];
        if (!empty($cfg['allowed_origin']))                   $ALLOWED_ORIGIN = (string) $cfg['allowed_origin'];
    }
}

// ---------------------------------------------------------------------------
// 2) CORS + cabeceras. Si la app y el PHP están en el MISMO dominio, deja
//    $ALLOWED_ORIGIN vacío (no hace falta CORS). Si están en dominios distintos,
//    pon ahí el origen exacto de la app.
// ---------------------------------------------------------------------------
if ($ALLOWED_ORIGIN !== '') {
    header('Access-Control-Allow-Origin: ' . $ALLOWED_ORIGIN);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}
if ($API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Servidor mal configurado: falta la clave de Gemini.']);
    exit;
}

// ---------------------------------------------------------------------------
// 3) Leer y validar la petición del cliente.
// ---------------------------------------------------------------------------
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body) || empty($body['action'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Petición inválida.']);
    exit;
}
$action  = (string) $body['action'];
$payload = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : [];

// ---------------------------------------------------------------------------
// 4) Construir prompt + esquema según la acción (lista cerrada).
// ---------------------------------------------------------------------------
[$prompt, $schema] = build_request($action, $payload);
if ($prompt === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Acción desconocida.']);
    exit;
}

$reqBody = ['contents' => [['parts' => [['text' => $prompt]]]]];
if ($schema !== null) {
    $reqBody['generationConfig'] = [
        'responseMimeType' => 'application/json',
        'responseSchema'   => $schema,
    ];
}

// ---------------------------------------------------------------------------
// 5) Llamar a Gemini (REST) con cURL. La clave va en la URL, en el servidor.
// ---------------------------------------------------------------------------
$MODEL = 'gemini-2.5-flash';
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$MODEL}:generateContent?key=" . urlencode($API_KEY);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode($reqBody),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);
$resp     = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($resp === false) {
    http_response_code(502);
    echo json_encode(['error' => 'No se pudo contactar con el servicio de IA.']);
    exit;
}
if ($httpCode < 200 || $httpCode >= 300) {
    // No reenviamos el error crudo de Gemini (puede filtrar detalles).
    http_response_code(502);
    echo json_encode(['error' => 'El servicio de IA devolvió un error.']);
    exit;
}

$data = json_decode($resp, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
if ($text === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Respuesta vacía del servicio de IA.']);
    exit;
}

// El cliente ya sabe parsear este texto (quita las ```json si las hubiera).
echo json_encode(['text' => $text]);
exit;


// ===========================================================================
//  Definición de las acciones permitidas (prompt + esquema por acción).
//  Tras pasar el comprobador y los resultados a datos oficiales de SELAE,
//  la única acción que usa IA es 'generateNumbers'.
//  Nota: en el esquema REST de Gemini no existe un tipo "ANY"; donde el valor
//  puede ser número o texto usamos STRING y la app ya acepta string|number.
// ===========================================================================
function build_request(string $action, array $p): array {

    switch ($action) {

        case 'generateNumbers':
            $game = is_array($p['game'] ?? null) ? $p['game'] : [];
            $name = (string) ($game['name'] ?? '');
            if ($name === '') return [null, null];
            $strategy    = (string) ($p['strategy'] ?? 'Aleatorio');
            $includeAdd  = !empty($p['includeAddOn']);
            $inspiration = (string) ($p['inspirationText'] ?? '');
            $numbersToPick = (int) ($game['numbersToPick'] ?? 6);
            $maxNumber     = (int) ($game['maxNumber'] ?? 49);

            $specialLine = '';
            if (!empty($game['specialNumbers'])) {
                $s = $game['specialNumbers'];
                $specialLine = "- Pick " . (int) ($s['count'] ?? 1) . " special number(s) called \""
                    . (string) ($s['name'] ?? '') . "\" from 1 to " . (int) ($s['max'] ?? 10) . ".";
            }
            $inspirationLine = ($strategy === 'Inspirado en un sueño o frase' && $inspiration !== '')
                ? "The user's inspiration is: \"{$inspiration}\". Base the numbers on the key concepts in this text." : '';
            $addOnLine = '';
            if ($includeAdd && !empty($game['addOn'])) {
                $a = $game['addOn'];
                $addOnLine = "Also generate " . (int) ($a['numbersToPick'] ?? 1) . " number(s) for the add-on game \""
                    . (string) ($a['name'] ?? '') . "\" up to a max of " . (int) ($a['maxNumber'] ?? 10) . ".";
            }
            $prompt = "Generate a lottery combination for the Spanish game \"{$name}\". Game rules:\n"
                . "- Pick {$numbersToPick} main numbers from 1 to {$maxNumber}.\n"
                . "{$specialLine}\n\nGeneration strategy: {$strategy}. {$inspirationLine}\n{$addOnLine}\n\n"
                . "Return ONLY the numbers in the specified JSON format, with no explanations.";
            $schema = ['type' => 'OBJECT', 'properties' => [
                'main'    => ['type' => 'ARRAY', 'items' => ['type' => 'NUMBER']],
                'special' => ['type' => 'ARRAY', 'items' => ['type' => 'NUMBER']],
                'addOn'   => ['type' => 'OBJECT', 'properties' => [
                    'name'    => ['type' => 'STRING'],
                    'numbers' => ['type' => 'ARRAY', 'items' => ['type' => 'NUMBER']],
                ]],
            ], 'required' => ['main']];
            return [$prompt, $schema];

        default:
            return [null, null];
    }
}
