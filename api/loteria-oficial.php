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

// Lotería Nacional va aparte: no se comprueba por combinación sino por número
// de décimo, con una estructura de premios distinta (ver check_nacional).
const GAME_ID_NACIONAL = 'LNAC';

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
//  LOTERÍA NACIONAL (comprobación por número de décimo)
// ===========================================================================
//
// La Nacional no se juega con combinación: cada décimo lleva un NÚMERO de 5
// cifras y gana según coincida con los premios del sorteo. Reglas aplicadas
// (las que el escrutinio de SELAE nos da de forma inequívoca):
//
//   · Premios a las 5 cifras (número completo): 1º, 2º, 3º, 4º, 5º y, en los
//     extraordinarios, la pedrea. Si el número coincide, gana ese premio. Se
//     suman si el mismo número sale varias veces (pedrea).
//   · Terminaciones (4, 3 y 2 cifras): se cobra la de MAYOR importe, no se
//     acumulan entre sí, y solo si el número no ha ganado ya un premio a las
//     5 cifras (que lo absorbe).
//   · Reintegro (última cifra): siempre compatible, se suma.
//
// Importes: el JSON trae `prize` en CÉNTIMOS por décimo. Trabajamos en
// céntimos y formateamos a euros al final.
//
// Nota: este resumen NO incluye centenas ni aproximaciones (SELAE no las da en
// este endpoint), así que para números muy pegados a un premio mayor conviene
// confirmar en la web oficial. La app lo advierte.

/** Normaliza un número de décimo a 5 cifras (quita no-dígitos, rellena ceros). */
function nacional_num(string $numero): string {
    $n = preg_replace('/\D/', '', $numero);
    return str_pad(substr($n, -5), 5, '0', STR_PAD_LEFT);
}

/** Formatea céntimos (int) a euros como string: 3000000 → "30000", 750 → "7,50". */
function nacional_eur(int $centimos): string {
    $s = number_format($centimos / 100, 2, ',', '');
    return rtrim(rtrim($s, '0'), ',');   // quita decimales sobrantes
}

/** Etiqueta legible de un premio (decodifica entidades como "2&#x00ba;"). */
function nacional_label(array $e): string {
    $lit = $e['literalPremio']['es'] ?? null;
    if (is_string($lit) && $lit !== '') {
        return trim(html_entity_decode($lit, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    return 'Premio a las 5 cifras';
}

/**
 * Comprueba un décimo de Lotería Nacional contra un sorteo ya descargado.
 * Devuelve premio total, categoría y desglose.
 */
function check_nacional(string $numeroRaw, array $s): array {
    $numero = nacional_num($numeroRaw);
    $centimos = 0;
    $desglose = [];

    // 1) Premios a las 5 cifras (número completo). Se suman todas las coincidencias.
    $cinco = [];
    foreach (['primerPremio', 'segundoPremio'] as $k) {
        if (!empty($s[$k]['decimo'])) $cinco[] = $s[$k];
    }
    foreach (['tercerosPremios', 'cuartosPremios', 'quintosPremios', 'extraccionesDeCincoCifras'] as $k) {
        foreach (($s[$k] ?? []) as $e) if (isset($e['decimo'])) $cinco[] = $e;
    }
    $gano5 = false;
    foreach ($cinco as $e) {
        if (str_pad((string)$e['decimo'], 5, '0', STR_PAD_LEFT) === $numero) {
            $imp = (int)($e['prize'] ?? 0);
            $centimos += $imp;
            $desglose[] = ['concepto' => nacional_label($e), 'importe' => nacional_eur($imp)];
            $gano5 = true;
        }
    }

    // 2) Terminaciones (4, 3, 2 cifras): la de mayor importe, solo si no ganó 5 cifras.
    if (!$gano5) {
        $mejorTerm = null;
        foreach ([4 => 'extraccionesDeCuatroCifras', 3 => 'extraccionesDeTresCifras', 2 => 'extraccionesDeDosCifras'] as $n => $k) {
            $fin = substr($numero, -$n);
            foreach (($s[$k] ?? []) as $e) {
                if (str_pad((string)$e['decimo'], $n, '0', STR_PAD_LEFT) === $fin) {
                    $imp = (int)($e['prize'] ?? 0);
                    if ($mejorTerm === null || $imp > $mejorTerm['imp']) {
                        $mejorTerm = ['imp' => $imp, 'concepto' => "Terminación $fin ($n cifras)"];
                    }
                }
            }
        }
        if ($mejorTerm !== null) {
            $centimos += $mejorTerm['imp'];
            $desglose[] = ['concepto' => $mejorTerm['concepto'], 'importe' => nacional_eur($mejorTerm['imp'])];
        }
    }

    // 3) Reintegro (última cifra): siempre compatible.
    $fin1 = substr($numero, -1);
    foreach (($s['reintegros'] ?? []) as $e) {
        if ((string)$e['decimo'] === $fin1) {
            $imp = (int)($e['prize'] ?? 0);
            $centimos += $imp;
            $desglose[] = ['concepto' => 'Reintegro', 'importe' => nacional_eur($imp)];
            break;
        }
    }

    $primer = !empty($s['primerPremio']['decimo'])
        ? str_pad((string)$s['primerPremio']['decimo'], 5, '0', STR_PAD_LEFT) : null;

    return [
        'game'         => 'nacional',
        'numero'       => $numero,
        'isWinner'     => $centimos > 0,
        'premio'       => nacional_eur($centimos),
        'categoriaTxt' => $desglose[0]['concepto'] ?? null,
        'desglose'     => $desglose,
        'primerPremio' => $primer,
        'fuente'       => 'SELAE (oficial)',
    ];
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

const SELAE_UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CACHE_TTL = 1200;   // 20 minutos: los resultados no cambian en ese rato.

/** Carpeta de caché (se crea si no existe). */
function cache_dir(): string {
    $dir = sys_get_temp_dir() . '/selae_cache';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

/**
 * Cookie jar "calentado" una sola vez por petición: visita una página de SELAE
 * para recoger las cookies de Akamai y las reutiliza en todas las llamadas al
 * API de esta misma petición (evita calentar una vez por juego).
 */
function selae_cookiejar(): string {
    static $jar = null;
    if ($jar !== null) return $jar;
    $jar = tempnam(sys_get_temp_dir(), 'selae_cj_');
    $ch = curl_init('https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => SELAE_UA,
        CURLOPT_COOKIEJAR      => $jar,
        CURLOPT_COOKIEFILE     => $jar,
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: es-ES,es;q=0.9',
            'Upgrade-Insecure-Requests: 1',
        ],
    ]);
    curl_exec($ch);
    curl_close($ch);
    return $jar;
}

/**
 * Descarga de SELAE los sorteos de un juego en un rango (YYYYMMDD), con caché
 * en disco (CACHE_TTL) para no repetir llamadas ni abusar de SELAE/Akamai.
 */
function fetch_selae(string $gameId, string $fromYmd, string $toYmd): ?array {
    // 1) ¿Está en caché y fresco?
    $cacheFile = cache_dir() . '/' . md5("{$gameId}|{$fromYmd}|{$toYmd}") . '.json';
    if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        $cached = json_decode((string)file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }

    // 2) Llamada real al API, reusando las cookies de Akamai (calentadas una vez).
    $jar = selae_cookiejar();
    $url = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id={$gameId}"
         . "&celebrados=true&fechaInicioInclusiva={$fromYmd}&fechaFinInclusiva={$toYmd}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => SELAE_UA,
        CURLOPT_COOKIEJAR      => $jar,
        CURLOPT_COOKIEFILE     => $jar,
        CURLOPT_HTTPHEADER     => [
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

    if ($resp === false || $code < 200 || $code >= 300) return null;
    $data = json_decode($resp, true);
    if (!is_array($data)) return null;

    @file_put_contents($cacheFile, json_encode($data));   // 3) Guardar en caché
    return $data;
}

// Si se incluye este archivo desde un test (define LOTERIA_OFICIAL_LIB antes de
// requerirlo), cargamos solo las funciones y no ejecutamos los dispatchers.
if (defined('LOTERIA_OFICIAL_LIB')) return;

// ===========================================================================
//  MODO DUMP (CLI, con red) — vuelca el JSON crudo de SELAE para un game_id.
//  Útil para conseguir muestras de juegos nuevos (Lotería Nacional = LNAC).
//    php loteria-oficial.php dump LNAC 20261101 20261108 > lnac.json
// ===========================================================================
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'dump') {
    $gid  = $argv[2] ?? '';
    $from = $argv[3] ?? date('Ymd', strtotime('-10 days'));
    $to   = $argv[4] ?? date('Ymd');
    if ($gid === '') {
        fwrite(STDERR, "Uso: php loteria-oficial.php dump <game_id> <YYYYMMDD> <YYYYMMDD>\n");
        exit(1);
    }
    $data = fetch_selae($gid, $from, $to);
    if ($data === null) {
        fwrite(STDERR, "Sin datos (¿game_id o fechas incorrectos, o bloqueo de red?).\n");
        exit(1);
    }
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    exit;
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
// Comprobar un décimo de Lotería Nacional (sin red):
//   php loteria-oficial.php testnacional <file.json> <numero> [indiceSorteo=0]
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'testnacional') {
    $file = $argv[2] ?? ''; $numero = $argv[3] ?? ''; $idx = (int)($argv[4] ?? 0);
    $arr = json_decode((string)file_get_contents($file), true);
    $s = is_array($arr) ? ($arr[$idx] ?? []) : [];
    echo json_encode(check_nacional($numero, $s), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
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

// -------- Diagnóstico (GET ?diag=1) --------
// Comprueba cURL y la conexión real con SELAE desde este servidor, para depurar
// el despliegue. No expone datos sensibles.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['diag'])) {
    $info = [
        'php'              => PHP_VERSION,
        'curl_cargado'     => extension_loaded('curl'),
        'allow_url_fopen'  => (bool) ini_get('allow_url_fopen'),
        'cache_dir'        => cache_dir(),
        'cache_escribible' => is_writable(cache_dir()),
    ];
    if (!extension_loaded('curl')) {
        $info['selae'] = 'cURL NO está disponible: el hosting no puede llamar a SELAE.';
        echo json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $from = date('Ymd', strtotime('-16 days'));
    $to   = date('Ymd');
    $jar  = selae_cookiejar();
    $url  = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id=EMIL"
          . "&celebrados=true&fechaInicioInclusiva={$from}&fechaFinInclusiva={$to}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => SELAE_UA,
        CURLOPT_COOKIEJAR      => $jar,
        CURLOPT_COOKIEFILE     => $jar,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json, text/plain, */*',
            'Accept-Language: es-ES,es;q=0.9',
            'Referer: https://www.loteriasyapuestas.es/es/resultados-medios/resultados-ultimos-sorteos',
            'X-Requested-With: XMLHttpRequest',
            'Origin: https://www.loteriasyapuestas.es',
            'Connection: keep-alive',
        ],
    ]);
    $resp = curl_exec($ch);
    $info['selae'] = [
        'http_code'  => (int) curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'curl_errno' => curl_errno($ch),
        'curl_error' => curl_error($ch),
        'bytes'      => $resp === false ? 0 : strlen((string)$resp),
        'es_json'    => $resp !== false && is_array(json_decode((string)$resp, true)),
        'muestra'    => $resp === false ? null : mb_substr((string)$resp, 0, 300),
    ];
    curl_close($ch);
    echo json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

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

    // --- Lotería Nacional: se comprueba por número de décimo (ruta propia) ---
    if ($game === 'nacional') {
        $numero = preg_replace('/\D/', '', (string)($p['numero'] ?? ''));
        if ($numero === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400); echo json_encode(['error' => 'Número o fecha no válidos.']); exit;
        }
        $ymd  = str_replace('-', '', $date);
        $data = fetch_selae(GAME_ID_NACIONAL, $ymd, $ymd);
        if ($data === null) { http_response_code(502); echo json_encode(['error' => 'No se pudo obtener el sorteo oficial.']); exit; }
        if (empty($data))   { echo json_encode(['pendiente' => true, 'error' => 'Aún no hay sorteo de Lotería Nacional en esa fecha.']); exit; }
        echo json_encode(check_nacional($numero, $data[0]), JSON_UNESCAPED_UNICODE);
        exit;
    }

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
