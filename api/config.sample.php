<?php
/**
 * Plantilla de configuración del backend. Copia este archivo a config.php y
 * ajusta los valores. config.php NO se versiona (ver .gitignore).
 *
 *   cp api/config.sample.php api/config.php
 *
 * Solo hace falta si la app (dist/) y el PHP están en dominios DISTINTOS.
 * Si están en el mismo dominio, no necesitas crear config.php.
 */
return [
    // Dominio permitido para CORS, p. ej. 'https://loteriasmalaga70.com'.
    // Déjalo vacío si la app y el PHP están en el mismo dominio.
    'allowed_origin' => '',
];
