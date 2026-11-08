<?php
/**
 * Tests del comprobador (sin red). Incluye la lógica de api/loteria-oficial.php
 * y la ejecuta contra fixtures con la forma de SELAE.
 *
 *   php tests/checker_test.php
 *
 * Los fixtures de los 5 juegos de combinación son sintéticos (ejercitan cada
 * categoría); el de Lotería Nacional es un escrutinio real.
 */

define('LOTERIA_OFICIAL_LIB', true);           // no ejecutar los dispatchers
require __DIR__ . '/../api/loteria-oficial.php';

$FIX = __DIR__ . '/fixtures';
$pasados = 0; $fallos = 0;

function cargar(string $file): array {
    $d = json_decode((string)file_get_contents($file), true);
    return is_array($d) ? $d : [];
}

/** Comprueba que $got === $want; imprime OK/XX. */
function eq(string $label, $got, $want): void {
    global $pasados, $fallos;
    if ($got === $want) { $pasados++; echo "OK  $label\n"; }
    else { $fallos++; echo "XX  $label  (got=" . var_export($got, true) . " want=" . var_export($want, true) . ")\n"; }
}

// Comprueba premio + categoría de un boleto de combinación.
function caso(string $game, array $sorteo, array $main, array $special, string $premio, ?string $cat): void {
    $r = check_ticket($game, $main, $special, $sorteo);
    $et = "$game [" . implode(',', $main) . ($special ? ' | ' . implode(',', $special) : '') . "]";
    eq("$et premio", (string)$r['premio'], $premio);
    eq("$et categoría", $r['categoriaTxt'], $cat);
}

// Comprueba premio de un décimo de Lotería Nacional.
function casoNacional(array $sorteo, string $numero, string $premio, ?string $cat): void {
    $r = check_nacional($numero, $sorteo);
    eq("nacional $numero premio", (string)$r['premio'], $premio);
    eq("nacional $numero categoría", $r['categoriaTxt'], $cat);
}

echo "== EUROMILLONES ==\n";
$em = cargar("$FIX/euromillones.json");
caso('euromillones', $em, [7,13,37,47,49], [7,11], '17000000', 'Categoría 1 (5 + 2)');
caso('euromillones', $em, [7,13,37,1,2], [1,2],  '15.50',    'Categoría 7 (3 + 0)');
caso('euromillones', $em, [1,2,3,4,5],   [1,2],  '0',        null);

echo "== PRIMITIVA ==\n";
$pr = cargar("$FIX/primitiva.json");
caso('primitiva', $pr, [9,13,19,25,26,30], [4], '5000000', 'Especial (6 Aciertos + R)');
caso('primitiva', $pr, [9,13,19,25,26,30], [5], '500000',  '1ª Categoría (6 Aciertos)');  // 6 sin reintegro ≠ Especial
caso('primitiva', $pr, [9,13,19,25,26,34], [0], '50000',   '2ª Categoría (5 Aciertos + C)');
caso('primitiva', $pr, [9,13,19,25,26,99], [0], '1000',    '3ª Categoría (5 Aciertos)');
caso('primitiva', $pr, [9,13,19,25,1,2],   [0], '50',      '4ª Categoría (4 Aciertos)');
caso('primitiva', $pr, [9,13,19,1,2,3],    [0], '8',       '5ª Categoría (3 Aciertos)');
caso('primitiva', $pr, [1,2,3,4,5,6],      [4], '1',       'Reintegro');
caso('primitiva', $pr, [1,2,3,4,5,6],      [5], '0',       null);

echo "== BONOLOTO ==\n";
$bo = cargar("$FIX/bonoloto.json");
caso('bonoloto', $bo, [3,11,22,33,1,2], [0], '25', '4ª Categoría (4 Aciertos)');
caso('bonoloto', $bo, [1,2,3,4,5,6],    [2], '0.50', 'Reintegro');

echo "== EL GORDO ==\n";
$go = cargar("$FIX/gordo.json");
caso('gordo', $go, [1,2,3,4,5],    [7], '1000000', '1ª Categoría (5 + 1)');
caso('gordo', $go, [1,2,3,4,5],    [9], '100000',  '2ª Categoría (5 + 0)');
caso('gordo', $go, [1,2,3,4,99],   [9], '200',     '4ª Categoría (4 + 0)');
caso('gordo', $go, [50,51,52,53,54], [7], '1.50',  'Reintegro');

echo "== EURODREAMS ==\n";
$ed = cargar("$FIX/eurodreams.json");
caso('eurodreams', $ed, [1,2,3,4,5,6],   [3], '20000', 'Categoría 1 (6 + 1)');
caso('eurodreams', $ed, [1,2,3,4,5,6],   [9], '2000',  'Categoría 2 (6 + 0)');
caso('eurodreams', $ed, [1,2,3,4,5,99],  [9], '500',   'Categoría 3 (5 + 0/1)');
caso('eurodreams', $ed, [1,2,99,98,97,96], [9], '4',   'Categoría 8 (2 + 0/1)');

echo "== LOTERÍA NACIONAL ==\n";
$ln = cargar("$FIX/nacional.json");
$jueves = $ln[1];   // sorteo 89 (jueves 05/11/2026)
$extra  = $ln[0];   // sorteo 90 (extraordinario 07/11/2026)
casoNacional($jueves, '06983', '0',      null);          // décimo real sin premio
casoNacional($jueves, '90189', '30003',  '1er Premio');  // 1er premio + reintegro
casoNacional($jueves, '73802', '6006',   '2º Premio');   // 2º premio + reintegro
casoNacional($jueves, '18190', '75',     'Terminación 8190 (4 cifras)');
casoNacional($jueves, '55551', '3',      'Reintegro');
casoNacional($extra,  '11438', '150015', '1er Premio');   // + reintegro 8
casoNacional($extra,  '01728', '15030',  'Premio a las 5 cifras'); // pedrea repetida + reintegro

echo "\n$pasados OK, $fallos fallos\n";
exit($fallos > 0 ? 1 : 0);
