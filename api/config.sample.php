<?php
/**
 * Plantilla de configuración del backend. Copia este archivo a config.php y
 * ajusta los valores. config.php NO se versiona (ver .gitignore).
 *
 *   cp api/config.sample.php api/config.php
 */
return [
    // --- CORS ---
    // Dominio permitido, p. ej. 'https://loteriasmalaga70.com'. Déjalo vacío si
    // la app y el PHP están en el mismo dominio (no hace falta).
    'allowed_origin' => '',

    // --- Proxy antibot para SELAE ---
    // SELAE protege su API con Akamai, que BLOQUEA las IPs de hosting (error
    // 403). Si la app se despliega en un hosting bloqueado, enruta las llamadas
    // por un servicio antibot poniendo aquí su plantilla de URL, con {url} donde
    // va la URL de SELAE. Déjalo vacío para llamar directo (sirve en local).
    //
    // Ejemplos (sustituye TU_CLAVE):
    //   ScraperAPI:  'https://api.scraperapi.com/?api_key=TU_CLAVE&url={url}'
    //     (si sigue dando 403, prueba a añadir &ultra_premium=true)
    //   ZenRows:     'https://api.zenrows.com/v1/?apikey=TU_CLAVE&url={url}&antibot=true'
    //
    // Con la caché de 20 min, el consumo es bajo: un plan gratuito suele bastar.
    'selae_proxy' => '',
];
