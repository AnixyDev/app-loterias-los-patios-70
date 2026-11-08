<?php
/**
 * loteria-oficial.php
 * Comprobador de boletos con DATOS OFICIALES de SELAE (sin IA).
 *
 * Recibe { action:"checkTicket", payload:{ game, main[], special[], date } },
 * descarga el sorteo de SELAE, compara los números EN CÓDIGO (determinista) y
 * devuelve la categoría y el premio tal como figuran en el escrutinio oficial.
 *
 * La comparación (check_ticket) está separada de la descarga para poder probarla
 * contra un JSON real sin tocar la red:
 *   php loteria-oficial.php test <game> <fichero.json> <main...> [-- <special...>]
 *
 * Juegos soportados: euromillones, primitiva, bonoloto, gordo, eurodreams.
 */

declare(strict_types=1);

const GAME_IDS = [
    'euromillones' => 'EMIL',
    'primitiva'    => 'LAPR',
    'bonoloto'     => 'BONO',
    'gordo'        => 'ELGR',
    'eurodreams'   => 'EDMS',
];

// ===========================================================================
//  LÓGICA (pura, testeable sin red)
// ===========================================================================

/** Convierte "09 - 13 - 19 - 25 - 26 - 30 C(34) R(4)" en {main, comp, reint}. */
function parse_combinacion(string $game, string $comb): array {
    $comp  = preg_match('/C\((\d+)\)/', $comb, $m) ? (int)$m[1] : null;
    $reint = preg_match('/R\((\d+)\)/', $comb, $m) ? (int)$m[1] : null;

    if ($game === 'euromillones') {
        // " 07 - 13 - 37 - 47 - 49 - 07 - 11" = 5 números + 2 estrellas (sin C/R)
        $all = array_map('intval', preg_split('/\D+/', trim($comb), -1, PREG_SPLIT_NO_EMPTY));
        return ['main' => array_slice($all, 0, 5), 'estrellas' => array_slice($all, 5, 2)];
    }

    // El resto: los principales son los números ANTES de "C(" o "R(".
    $head = preg_split('/[CR]\(/', $comb)[0];
    preg_match_all('/\d{1,2}/', $head, $mm);
    $main = array_map('intval', $mm[0]);

    switch ($game) {
        case 'gordo':      return ['main' => array_slice($main, 0, 5), 'clave' => $reint];      // R() = nº clave
        case 'eurodreams': return ['main' => array_slice($main, 0, 6), 'sueno' => $comp];       // C() = sueño
        default:           return ['main' => array_slice($main, 0, 6), 'comp' => $comp, 'reint' => $reint]; // primitiva / bonoloto
    }
}

/** Busca en el escrutinio la primera fila cuyo "tipo" satisface $pred(tipo). */
function find_cat(array $escr, callable $pred): ?array {
    foreach ($escr as $c) {
        if ($pred((string)($c['tipo'] ?? ''))) return $c;
    }
    return null;
}

/** Construye el resultado final a partir de la fila de escrutinio encontrada. */
function resultado(string $game, array $parsed, array $aciertos, array $nAc, ?array $cat): array {
    $premio = $cat ? (string)($cat['premio'] ?? '0') : '0';
    return [
        'game'        => $game,
        'combinacion' => $parsed,
        'aciertos'    => $aciertos,
        'nAciertos'   => $nAc,
        'categoria'   => $cat['categoria'] ?? null,
        'categoriaTxt'=> $cat ? preg_replace('/\s+/', ' ', trim((string)$cat['tipo'])) : null,
        'premio'      => $premio,
        'isWinner'    => ((float)str_replace(',', '.', $premio)) > 0,
        'fuente'      => 'SELAE (oficial)',
    ];
}

/**
 * Comprueba un boleto contra un sorteo ya descargado.
 * $main / $special son los números del usuario.
 */
function check_ticket(string $game, array $main, array $special, array $sorteo): array {
    $d = parse_combinacion($game, (string)($sorteo['combinacion'] ?? ''));
    $escr = $sorteo['escrutinio'] ?? [];

    // --- EUROMILLONES: X aciertos + Y estrellas ---
    if ($game === 'euromillones') {
        $ac  = array_values(array_intersect($main, $d['main']));
        $est = array_values(array_intersect($special, $d['estrellas']));
        $nA = count($ac); $nE = count($est);
        $cat = find_cat($escr, function ($t) use ($nA, $nE) {
            return preg_match('/(\d+)\s*\+\s*(\d+)/', $t, $m) && (int)$m[1] === $nA && (int)$m[2] === $nE;
        });
        return resultado($game, $d, ['main' => $ac, 'estrellas' => $est], ['main' => $nA, 'estrellas' => $nE], $cat);
    }

    // --- EL GORDO: 5 números + nº clave ---
    if ($game === 'gordo') {
        $ac = array_values(array_intersect($main, $d['main']));
        $nA = count($ac);
        $matchClave = (isset($special[0]) && (int)$special[0] === $d['clave']) ? 1 : 0;
        $cat = null;
        if ($nA >= 2) {
            $cat = find_cat($escr, function ($t) use ($nA, $matchClave) {
                return preg_match('/\((\d+)\s*\+\s*(\d+)\)/', $t, $m) && (int)$m[1] === $nA && (int)$m[2] === $matchClave;
            });
        }
        if (!$cat && $matchClave) $cat = find_cat($escr, fn($t) => stripos($t, 'Reintegro') !== false);
        return resultado($game, $d, ['main' => $ac, 'clave' => $matchClave ? [$d['clave']] : []],
                         ['main' => $nA, 'clave' => $matchClave], $cat);
    }

    // --- EURODREAMS: 6 números + sueño (el sueño solo cuenta en 6+1/6+0) ---
    if ($game === 'eurodreams') {
        $ac = array_values(array_intersect($main, $d['main']));
        $nA = count($ac);
        $matchSueno = (isset($special[0]) && (int)$special[0] === $d['sueno']) ? 1 : 0;
        $cat = find_cat($escr, function ($t) use ($nA, $matchSueno) {
            if (!preg_match('/(\d+)\s*\+\s*([0-9\/]+)/', $t, $m)) return false;
            if ((int)$m[1] !== $nA) return false;
            $y = trim($m[2]);
            if ($y === '0/1') return $nA >= 2 && $nA <= 5;         // sueño indiferente
            return (string)$matchSueno === $y;                     // 6 + 1 / 6 + 0
        });
        return resultado($game, $d, ['main' => $ac, 'sueno' => $matchSueno ? [$d['sueno']] : []],
                         ['main' => $nA, 'sueno' => $matchSueno], $cat);
    }

    // --- PRIMITIVA / BONOLOTO: 6 números + complementario + reintegro ---
    $ac = array_values(array_intersect($main, $d['main']));
    $nA = count($ac);
    $noAcertados = array_values(array_diff($main, $d['main']));           // los que el usuario falló
    $matchC = ($nA === 5 && count($noAcertados) === 1 && $noAcertados[0] === $d['comp']);
    $matchR = (isset($special[0]) && $d['reint'] !== null && (int)$special[0] === $d['reint']);
    $tieneEspecial = (bool) find_cat($escr, fn($t) => stripos($t, 'Especial') !== false);

    $cat = null;
    if ($nA === 6 && $matchR && $tieneEspecial)      $cat = find_cat($escr, fn($t) => stripos($t, 'Especial') !== false);
    elseif ($nA === 6)                               $cat = find_cat($escr, fn($t) => stripos($t, '6 Aciertos') !== false && stripos($t, 'Especial') === false);
    elseif ($nA === 5 && $matchC)                    $cat = find_cat($escr, fn($t) => stripos($t, '+ C') !== false);
    elseif ($nA === 5)                               $cat = find_cat($escr, fn($t) => stripos($t, '5 Aciertos') !== false && stripos($t, '+ C') === false);
    elseif ($nA === 4)                               $cat = find_cat($escr, fn($t) => stripos($t, '4 Aciertos') !== false);
    elseif ($nA === 3)                               $cat = find_cat($escr, fn($t) => stripos($t, '3 Aciertos') !== false);
    elseif ($matchR)                                 $cat = find_cat($escr, fn($t) => stripos($t, 'Reintegro') !== false);

    return resultado($game, $d, ['main' => $ac, 'complementario' => $matchC, 'reintegro' => $matchR],
                     ['main' => $nA], $cat);
}

// ===========================================================================
//  RESULTADOS OFICIALES (mapeos puros, testeables sin red)
// ===========================================================================

const NOMBRES = [
    'euromillones' => 'Euromillones', 'primitiva' => 'La Primitiva',
    'bonoloto' => 'Bonoloto', 'gordo' => 'El Gordo de la Primitiva', 'eurodreams' => 'EuroDreams',
];
const JUEGOS_DESTACADOS = ['euromillones', 'primitiva', 'eurodreams'];
const JUEGOS_TICKER     = ['euromillones', 'primitiva', 'bonoloto', 'gordo', 'eurodreams'];

function fmt_fecha(string $f): string {        // "2026-11-06 21:16:00" -> "06/11/2026"
    $p = explode('-', substr($f, 0, 10));
    return count($p) === 3 ? "{$p[2]}/{$p[1]}/{$p[0]}" : $f;
}
function fmt_fecha_corta(string $f): string {  // -> "06/11"
    $p = explode('-', substr($f, 0, 10));
    return count($p) === 3 ? "{$p[2]}/{$p[1]}" : $f;
}

/** Números especiales a mostrar (bolas doradas) según el juego. */
function especiales_display(string $game, array $d): array {
    if ($game === 'euromillones') return $d['estrellas'] ?? [];
    if ($game === 'gordo')        return ($d['clave'] ?? null) !== null ? [$d['clave']] : [];
    if ($game === 'eurodreams')   return ($d['sueno'] ?? null) !== null ? [$d['sueno']] : [];
    return (($d['comp'] ?? null) !== null) ? [$d['comp']] : [];   // primitiva/bonoloto: complementario
}

/** Un sorteo de SELAE -> forma LotteryResult (pestaña Historial). */
function map_result(string $game, array $s): array {
    $d = parse_combinacion($game, (string)($s['combinacion'] ?? ''));
    $tiers = [];
    foreach (($s['escrutinio'] ?? []) as $c) {
        $tiers[] = [
            'category' => preg_replace('/\s+/', ' ', trim((string)($c['tipo'] ?? ''))),
            'winners'  => (string)($c['ganadores'] ?? ''),
            'prize'    => (string)($c['premio'] ?? ''),
        ];
    }
    return [
        'date'           => fmt_fecha((string)($s['fecha_sorteo'] ?? '')),
        'jackpot'        => (string)($s['premio_bote'] ?? ''),
        'mainNumbers'    => $d['main'] ?? [],
        'specialNumbers' => especiales_display($game, $d),
        'prizeTiers'     => $tiers,
    ];
}

/** Un sorteo de SELAE -> forma FeaturedResult (banner Destacados). */
function map_featured(string $game, array $s): array {
    $d = parse_combinacion($game, (string)($s['combinacion'] ?? ''));
    return [
        'gameId'         => $game,
        'gameName'       => NOMBRES[$game] ?? $game,
        'date'           => fmt_fecha((string)($s['fecha_sorteo'] ?? '')),
        'jackpot'        => (string)($s['premio_bote'] ?? ''),
        'mainNumbers'    => $d['main'] ?? [],
        'specialNumbers' => especiales_display($game, $d),
    ];
}

/** Un sorteo de SELAE -> forma WeeklyTickerResult (ticker). */
function map_ticker(string $game, array $s): array {
    return [
        'gameName' => NOMBRES[$game] ?? $game,
        'numbers'  => trim((string)($s['combinacion'] ?? '')),
        'date'     => fmt_fecha_corta((string)($s['fecha_sorteo'] ?? '')),
    ];
}

const SELAE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Descarga de SELAE los sorteos de un juego en un rango de fechas (YYYYMMDD). */
function fetch_selae(string $gameId, string $fromYmd, string $toYmd): ?array {
    // SELAE está tras Akamai Bot Manager. Estrategia: 1) visitar una página normal
    // para que Akamai nos entregue sus cookies; 2) llamar al API reusándolas y
    // mandando las cabeceras que manda el navegador (incl. X-Requested-With).
    $cookieFile = tempnam(sys_get_temp_dir(), 'selae_');

    $comun = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => SELAE_UA,
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
    ];

    // 1) Calentar: recoger cookies de Akamai desde una página de resultados.
    $ch = curl_init('https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos');
    curl_setopt_array($ch, $comun + [
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: es-ES,es;q=0.9',
            'Upgrade-Insecure-Requests: 1',
        ],
    ]);
    curl_exec($ch);
    curl_close($ch);

    // 2) Llamada real al API, reusando las cookies.
    $url = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id={$gameId}"
         . "&celebrados=true&fechaInicioInclusiva={$fromYmd}&fechaFinInclusiva={$toYmd}";
    $ch = curl_init($url);
    curl_setopt_array($ch, $comun + [
        CURLOPT_HTTPHEADER => [
            'Accept: application/json, text/plain, */*',
            'Accept-Language: es-ES,es;q=0.9',
            'Referer: https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos',
            'X-Requested-With: XMLHttpRequest',
            'Origin: https://www.loteriasyapuestas.es',
            'Connection: keep-alive',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @unlink($cookieFile);

    if ($resp === false || $code < 200 || $code >= 300) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
}

// ===========================================================================
//  MODO TEST (CLI, sin red)
// ===========================================================================
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'testresults') {
    $game = $argv[2] ?? ''; $file = $argv[3] ?? '';
    $arr = json_decode((string)file_get_contents($file), true);
    $s = is_array($arr) ? ($arr[0] ?? []) : [];
    echo "RESULT:   " . json_encode(map_result($game, $s), JSON_UNESCAPED_UNICODE) . "\n";
    echo "FEATURED: " . json_encode(map_featured($game, $s), JSON_UNESCAPED_UNICODE) . "\n";
    echo "TICKER:   " . json_encode(map_ticker($game, $s), JSON_UNESCAPED_UNICODE) . "\n";
    exit;
}
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'test') {
    $game = $argv[2] ?? ''; $file = $argv[3] ?? '';
    $main = []; $special = []; $inSpecial = false;
    foreach (array_slice($argv, 4) as $tok) {
        if ($tok === '--') { $inSpecial = true; continue; }
        $inSpecial ? $special[] = (int)$tok : $main[] = (int)$tok;
    }
    $json = json_decode((string)file_get_contents($file), true);
    $sorteo = is_array($json) ? ($json[0] ?? $json) : [];
    $r = check_ticket($game, $main, $special, $sorteo);
    printf("%-28s -> cat %-4s premio %-12s %s\n",
        trim((string)($r['categoriaTxt'] ?? 'sin premio')),
        (string)($r['categoria'] ?? '-'),
        $r['premio'],
        $r['isWinner'] ? '✓ PREMIADO' : '—');
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
$action = (string)$body['action'];
$p = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : [];

$hoy  = date('Ymd');
$hace = date('Ymd', strtotime('-16 days'));   // rango para "último sorteo"

// --- Comprobar boleto ---
if ($action === 'checkTicket') {
    $game = (string)($p['game'] ?? '');
    $date = (string)($p['date'] ?? '');
    $main = array_map('intval', (array)($p['main'] ?? []));
    $special = array_map('intval', (array)($p['special'] ?? []));
    $gameId = GAME_IDS[$game] ?? '';
    if ($gameId === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400); echo json_encode(['error' => 'Juego o fecha no válidos.']); exit;
    }
    $ymd  = str_replace('-', '', $date);
    $data = fetch_selae($gameId, $ymd, $ymd);
    if ($data === null) { http_response_code(502); echo json_encode(['error' => 'No se pudo obtener el sorteo oficial.']); exit; }
    if (empty($data))   { echo json_encode(['pendiente' => true, 'error' => 'Aún no hay resultados para esa fecha.']); exit; }
    echo json_encode(check_ticket($game, $main, $special, $data[0]), JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Historial de resultados (un juego) ---
if ($action === 'getResults') {
    $game = (string)($p['game'] ?? '');
    $date = (string)($p['date'] ?? '');
    $gameId = GAME_IDS[$game] ?? '';
    if ($gameId === '') { http_response_code(400); echo json_encode(['error' => 'Juego no válido.']); exit; }
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) { $from = $to = str_replace('-', '', $date); }
    else { $from = $hace; $to = $hoy; }
    $data = fetch_selae($gameId, $from, $to);
    if ($data === null) { http_response_code(502); echo json_encode(['error' => 'No se pudieron obtener los resultados.']); exit; }
    echo json_encode(array_map(fn($s) => map_result($game, $s), array_slice($data, 0, 3)), JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Destacados (Euromillones, Primitiva, EuroDreams) ---
if ($action === 'getFeatured') {
    $out = [];
    foreach (JUEGOS_DESTACADOS as $g) {
        $data = fetch_selae(GAME_IDS[$g], $hace, $hoy);
        if (!empty($data)) $out[] = map_featured($g, $data[0]);
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Ticker (últimos resultados de varios juegos) ---
if ($action === 'getTicker') {
    $out = [];
    foreach (JUEGOS_TICKER as $g) {
        $data = fetch_selae(GAME_IDS[$g], $hace, $hoy);
        if (!empty($data)) $out[] = map_ticker($g, $data[0]);
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción desconocida.']);
exit;
