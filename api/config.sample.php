<?php
/**
 * config.sample.php  →  cópialo como  config.php  y rellena tu clave.
 *
 * IMPORTANTE:
 *  - NO subas config.php a GitHub (ya está en .gitignore).
 *  - Lo ideal en cPanel es colocar config.php FUERA de la carpeta pública
 *    (p. ej. en /home/TU_USUARIO/private/) e incluirlo por ruta absoluta.
 *    Si no puedes, déjalo aquí: el .htaccess de esta carpeta bloquea su
 *    acceso directo y, al ser PHP, nunca se sirve como texto.
 *  - Alternativa sin este archivo: define la variable de entorno
 *    GEMINI_API_KEY en el servidor (cPanel → MultiPHP INI / .htaccess SetEnv)
 *    y el proxy la usará automáticamente.
 */

return [
    // Tu clave de Google Gemini (NO la de nadie más, NO la pongas en el cliente).
    'api_key' => 'PON_AQUI_TU_CLAVE_DE_GEMINI',

    // Origen de la app React.
    //  - Si la app y este PHP están en el MISMO dominio: déjalo como '' (vacío).
    //  - Si están en dominios distintos: pon el origen EXACTO, p. ej.
    //    'https://app.loteriasmalaga70.com'
    'allowed_origin' => '',
];
