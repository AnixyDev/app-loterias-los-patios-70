# Asistente de Loterías — Los Patios 70

Aplicación web (React + TypeScript + Vite) de la Administración de Loterías **Los Patios 70** (Málaga) con:

- **Resultados oficiales** de SELAE (destacados, ticker e historial con escrutinio completo).
- **Comprobador de boletos** contra los resultados oficiales — determinista, sin IA — con entrada manual o **escaneo del QR** del resguardo.
- **Generador de números** y **chat** asistidos por IA (Gemini).

Juegos soportados en resultados y comprobador: Euromillones, La Primitiva, Bonoloto, El Gordo de la Primitiva y EuroDreams.

## Arquitectura

- **Frontend:** React + Vite (carpeta raíz, `components/`, `services/`).
- **Backend (PHP):** carpeta `api/`, pensada para un hosting con PHP (Apache/cPanel):
  - `loteria-oficial.php` — descarga los resultados de SELAE (con bypass de Akamai y caché) y comprueba boletos **en el servidor**. No necesita clave.
  - `gemini-proxy.php` — proxy del generador y el chat hacia Gemini; **la clave vive solo aquí** (nunca en el navegador).

La clave de Gemini se guarda en `api/config.php` (no se versiona). Ver `api/config.sample.php`.

## Ejecutar en local

**Requisitos:** Node.js y PHP (con la extensión cURL: `php-cli php-curl`).

1. Instala dependencias:
   ```bash
   npm install
   ```
2. (Opcional, solo para generador/chat) copia la plantilla de config y pon tu clave:
   ```bash
   cp api/config.sample.php api/config.php   # edita y añade tu GEMINI_API_KEY
   ```
3. Arranca el backend PHP en una terminal:
   ```bash
   php -S localhost:8000
   ```
4. Arranca el frontend en otra terminal:
   ```bash
   npm run dev
   ```
5. Abre **http://localhost:3000** (Vite reenvía las llamadas `/api/...` al PHP del puerto 8000).

> Resultados y comprobador funcionan solo con el PHP arrancado (no necesitan clave). El generador y el chat necesitan `api/config.php` con la clave de Gemini.

## Comprobaciones

```bash
npm run typecheck   # tipos (TypeScript)
npm run build       # compilación de producción (genera dist/)
```

Ambas se ejecutan automáticamente en cada push y pull request (ver `.github/workflows/ci.yml`).

## Desplegar

1. Sube la carpeta `api/` al hosting (con `api/config.php` creado en el servidor).
2. `npm run build` y sube el contenido de `dist/` al mismo dominio.

Si la app y el PHP están en el mismo dominio no hace falta configuración extra; si no, ajusta `allowed_origin` en `config.php` y `VITE_*_PROXY_URL` al compilar.
