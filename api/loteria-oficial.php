<?php
/**
 * loteria-oficial.php
 * Comprobador de boletos con DATOS OFICIALES de SELAE (no IA).
 *
 * Flujo: recibe { action:"checkTicket", payload:{ game, main[], special[], date } },
 * descarga el sorteo de SELAE, compara los números EN CÓDIGO (determinista) y
 * devuelve la categoría y el premio tal cual figuran en el escrutinio oficial.
 *
 * La lógica de comparación está separada de la descarga (función check_ticket),
 * para poder probarla contra un JSON real sin tocar la red:
 *     php loteria-oficial.php test <game> <fichero.json> <main...> [-- <special...>]
 */

declare(strict_types=1);

// ------- Mapa juego de la app -> game_id de SELAE -------
const GAME_IDS = [
    'euromillones' => 'EMIL',
    'primitiva'    => 'LAPR',
    'bonoloto'     => 'BONO',
    'gordo'        => 'ELGR',
    'eurodreams'   => 'EDMS',  // por confirmar con una muestra
    'lototurf'     => 'LTUR',  // por confirmar con una muestra
];

// ===========================================================================
//  LÓGICA DE COMPROBACIÓN (pura, testeable sin red)
// ===========================================================================

/** Parte la cadena "combinacion" de SELAE en números principales + especiales. */
function parse_combinacion(string $game, string $combinacion): array {
    // Ej Euromillones: " 07 - 13 - 37 - 47 - 49 - 07 - 11" (5 números + 2 estrellas)
    $nums = array_values(array_filter(array_map('trim', preg_split('/\s*-\s*/', trim($combinacion))), fn($x) => $x !== ''));
    $nums = array_map('intval', $nums);

    switch ($game) {
        case 'euromillones':  // 5 + 2 estrellas
            return ['main' => array_slice($nums, 0, 5), 'special' => array_slice($nums, 5, 2)];
        case 'gordo':         // 5 + 1 nº clave
            return ['main' => array_slice($nums, 0, 5), 'special' => array_slice($nums, 5, 1)];
        case 'eurodreams':    // 6 + 1 sueño
            return ['main' => array_slice($nums, 0, 6), 'special' => array_slice($nums, 6, 1)];
        default:              // primitiva/bonoloto: 6 principales (complementario/reintegro aparte)
            return ['main' => array_slice($nums, 0, 6), 'special' => array_slice($nums, 6)];
    }
}

/** Extrae (principales, especiales) del "tipo" del escrutinio, p.ej. "4ª 4 + 2" -> [4,2]. */
function parse_tipo(string $tipo): ?array {
    if (preg_match('/(\d+)\s*\+\s*(\d+)/', $tipo, $m)) {
        return [(int)$m[1], (int)$m[2]];
    }
    return null;
}

/**
 * Comprueba un boleto contra un sorteo ya descargado (array del JSON de SELAE).
 * Devuelve el resultado o null si el juego no está soportado por esta lógica.
 */
function check_ticket(string $game, array $main, array $special, array $sorteo): array {
    $comb = parse_combinacion($game, (string)($sorteo['combinacion'] ?? ''));

    // Intersección determinista.
    $aciertosMain    = array_values(array_intersect($main, $comb['main']));
    $aciertosSpecial = array_values(array_intersect($special, $comb['special']));
    $nMain = count($aciertosMain);
    $nSpec = count($aciertosSpecial);

    $resultado = [
        'game'            => $game,
        'fecha'           => $sorteo['fecha_sorteo'] ?? null,
        'combinacion'     => $comb,
        'aciertos'        => ['main' => $aciertosMain, 'special' => $aciertosSpecial],
        'nAciertos'       => ['main' => $nMain, 'special' => $nSpec],
        'isWinner'        => false,
        'categoria'       => null,
        'premio'          => '0',
        'fuente'          => 'SELAE (oficial)',
    ];

    // Para juegos "X + Y" (Euromillones, Gordo, EuroDreams) buscamos en el
    // escrutinio la fila cuyo "tipo" coincide con (aciertos principales + especiales).
    if (in_array($game, ['euromillones', 'gordo', 'eurodreams'], true)) {
        foreach (($sorteo['escrutinio'] ?? []) as $cat) {
            $tp = parse_tipo((string)($cat['tipo'] ?? ''));
            if ($tp && $tp[0] === $nMain && $tp[1] === $nSpec) {
                $premio = (string)($cat['premio'] ?? '0');
                $resultado['categoria'] = $cat['categoria'] ?? ($cat['tipo'] ?? null);
                $resultado['premio']    = $premio;
                $resultado['isWinner']  = ((float)str_replace(',', '.', $premio)) > 0;
                break;
            }
        }
    }
    // Primitiva/Bonoloto necesitan lógica de complementario + reintegro: pendiente
    // de ver una muestra real de su JSON (combinacion, complementario, reintegro).

    return $resultado;
}

// ===========================================================================
//  MODO TEST por línea de comandos (no toca la red)
//  Uso: php loteria-oficial.php test euromillones sorteo.json 7 13 37 47 49 -- 7 11
// ===========================================================================
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'test') {
    $game = $argv[2] ?? '';
    $file = $argv[3] ?? '';
    $rest = array_slice($argv, 4);
    $main = []; $special = []; $inSpecial = false;
    foreach ($rest as $tok) {
        if ($tok === '--') { $inSpecial = true; continue; }
        if ($inSpecial) $special[] = (int)$tok; else $main[] = (int)$tok;
    }
    $json = json_decode((string)file_get_contents($file), true);
    $sorteo = is_array($json) ? ($json[0] ?? $json) : [];
    echo json_encode(check_ticket($game, $main, $special, $sorteo), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), "\n";
    exit;
}

// ===========================================================================
//  MODO WEB (endpoint real)
// ===========================================================================
$ALLOWED_ORIGIN = '';
$cfgPath = __DIR__ . '/config.php';
if (is_file($cfgPath)) { $cfg = require $cfgPath; if (is_array($cfg) && !empty($cfg['allowed_origin'])) $ALLOWED_ORIGIN = (string)$cfg['allowed_origin']; }
if ($ALLOWED_ORIGIN !== '') { header('Access-Control-Allow-Origin: ' . $ALLOWED_ORIGIN); header('Vary: Origin'); }
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Método no permitido.']); exit; }

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body) || empty($body['action'])) { http_response_code(400); echo json_encode(['error' => 'Petición inválida.']); exit; }
$action  = (string)$body['action'];
$payload = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : [];

if ($action !== 'checkTicket') { http_response_code(400); echo json_encode(['error' => 'Acción desconocida.']); exit; }

$game = (string)($payload['game'] ?? '');
$date = (string)($payload['date'] ?? '');            // YYYY-MM-DD
$main = array_map('intval', (array)($payload['main'] ?? []));
$special = array_map('intval', (array)($payload['special'] ?? []));
$gameId = GAME_IDS[$game] ?? '';
if ($gameId === '' || $date === '') { http_response_code(400); echo json_encode(['error' => 'Juego o fecha no válidos.']); exit; }

// Descargar el sorteo de SELAE (rango de un día).
$ymd = str_replace('-', '', $date);
$url = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id={$gameId}&celebrados=true&fechaInicioInclusiva={$ymd}&fechaFinInclusiva={$ymd}";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; LosPatios70/1.0)',
]);
$resp = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($resp === false || $code < 200 || $code >= 300) { http_response_code(502); echo json_encode(['error' => 'No se pudo obtener el sorteo oficial.']); exit; }

$data = json_decode($resp, true);
if (!is_array($data) || empty($data)) { echo json_encode(['error' => 'Todavía no hay resultados para esa fecha.', 'pendiente' => true]); exit; }

$sorteo = $data[0];
echo json_encode(check_ticket($game, $main, $special, $sorteo), JSON_UNESCAPED_UNICODE);
exit;
