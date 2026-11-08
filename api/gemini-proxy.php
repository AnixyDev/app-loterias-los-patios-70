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
//  Definición de las 6 acciones permitidas (prompt + esquema por acción).
//  Nota: en el esquema REST de Gemini no existe un tipo "ANY"; donde el valor
//  puede ser número o texto usamos STRING y la app ya acepta string|number.
// ===========================================================================
function build_request(string $action, array $p): array {

    switch ($action) {

        case 'featured':
            $prompt = "Provide the latest featured lottery results for Spain. I need the 3 most important ones, "
                . "typically Euromillones, Primitiva, and Eurodreams. For each game, give me the game ID, game name, "
                . "draw date (in \"DD/MM/YYYY\" format), the main jackpot amount as a number (or a string like \"Sin Bote\"), "
                . "the main winning numbers, and special numbers (if any). The game IDs should be: 'euromillones', "
                . "'primitiva', 'eurodreams'.";
            $schema = ['type' => 'ARRAY', 'items' => ['type' => 'OBJECT', 'properties' => [
                'gameId'         => ['type' => 'STRING'],
                'gameName'       => ['type' => 'STRING'],
                'date'           => ['type' => 'STRING'],
                'jackpot'        => ['type' => 'STRING'],
                'mainNumbers'    => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'specialNumbers' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            ], 'required' => ['gameId', 'gameName', 'date', 'jackpot', 'mainNumbers']]];
            return [$prompt, $schema];

        case 'weeklyTicker':
            $prompt = "Provide a ticker of the latest results for about 5-7 main Spanish lotteries from the last 7 days "
                . "(e.g., Bonoloto, Gordo, Nacional, Quiniela). For each, provide the game name, a compact string "
                . "representation of the winning numbers, and the draw date in \"DD/MM\" format. "
                . "Example for Bonoloto: \"6, 12, 23, 34, 45, 48 C(9) R(1)\".";
            $schema = ['type' => 'ARRAY', 'items' => ['type' => 'OBJECT', 'properties' => [
                'gameName' => ['type' => 'STRING'],
                'numbers'  => ['type' => 'STRING'],
                'date'     => ['type' => 'STRING'],
            ], 'required' => ['gameName', 'numbers', 'date']]];
            return [$prompt, $schema];

        case 'latestResults':
            $game = is_array($p['game'] ?? null) ? $p['game'] : [];
            $name = (string) ($game['name'] ?? '');
            if ($name === '') return [null, null];
            $date       = isset($p['date']) ? (string) $p['date'] : '';
            $specialNm  = (string) ($game['specialNumbers']['name'] ?? '');
            $dateQuery  = $date !== '' ? "for the draw on or nearest to the date {$date}" : 'for the most recent draw';
            $prompt = "Get the lottery results for the game \"{$name}\" in Spain, {$dateQuery}. "
                . "If it's a game with daily draws (like Bonoloto) and no date is specified, return the last 3 results. "
                . "Otherwise, get the single most recent result. Provide the draw date, main numbers, special numbers "
                . "(if any, using the correct name like \"{$specialNm}\"), the main jackpot amount (as a string), the next "
                . "jackpot amount (if available, as a string), and a detailed prize tiers breakdown (category, number of "
                . "winners, prize per winner). If a jackpot was won, mention the location(s) where the winning ticket was "
                . "sold if that information is public.";
            $schema = ['type' => 'ARRAY', 'items' => ['type' => 'OBJECT', 'properties' => [
                'date'           => ['type' => 'STRING'],
                'jackpot'        => ['type' => 'STRING'],
                'nextJackpot'    => ['type' => 'STRING'],
                'mainNumbers'    => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'specialNumbers' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'prizeLocation'  => ['type' => 'STRING'],
                'prizeTiers'     => ['type' => 'ARRAY', 'items' => ['type' => 'OBJECT', 'properties' => [
                    'category' => ['type' => 'STRING'],
                    'winners'  => ['type' => 'STRING'],
                    'prize'    => ['type' => 'STRING'],
                ], 'required' => ['category', 'winners', 'prize']]],
            ], 'required' => ['date', 'mainNumbers']]];
            return [$prompt, $schema];

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

        case 'chat':
            $newMessage = (string) ($p['newMessage'] ?? '');
            $history    = isset($p['history']) ? $p['history'] : [];
            $historyJson = json_encode($history);
            $prompt = "You are a helpful assistant for a Spanish lottery results website called "
                . "\"Asistente de Loterías Los Patios 70\". The user's latest message is: \"{$newMessage}\". "
                . "Previous conversation for context: {$historyJson}. Answer the user's question concisely and accurately. "
                . "You can talk about lottery results, how to play, or generate numbers. If asked to generate numbers, "
                . "suggest they use the \"Generador\" tab for a better experience. If asked for results, suggest they use "
                . "the \"Historial\" tab for detailed information. Keep responses short, friendly, and helpful.";
            return [$prompt, null]; // texto libre, sin esquema JSON

        default:
            return [null, null];
    }
}
