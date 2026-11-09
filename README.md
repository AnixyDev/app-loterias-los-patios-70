# Asistente de Loterías — Los Patios 70

Aplicación web (React + TypeScript + Vite) de la Administración de Loterías **Los Patios 70** (Málaga) con:

- **Resultados oficiales** de SELAE (destacados, ticker e historial con escrutinio completo).
- **Comprobador de boletos** contra los resultados oficiales — determinista, sin IA — con entrada manual o **escaneo del QR** del resguardo, incluida la **Lotería Nacional** (por número de décimo).

Juegos soportados en resultados y comprobador: Euromillones, La Primitiva, Bonoloto, El Gordo de la Primitiva, EuroDreams y Lotería Nacional.

## Arquitectura

- **Frontend:** React + Vite (carpeta raíz, `components/`, `services/`).
- **Backend (PHP):** carpeta `api/`, pensada para un hosting con PHP (Apache/cPanel):
  - `loteria-oficial.php` — descarga los resultados de SELAE (con bypass de Akamai y caché) y comprueba boletos y décimos **en el servidor**. No necesita clave.

## Ejecutar en local

**Requisitos:** Node.js y PHP (con la extensión cURL: `php-cli php-curl`).

1. Entra en la carpeta del proyecto e instala dependencias:
   ```bash
   npm install
   ```
2. Arranca el backend PHP en una terminal (en la raíz del proyecto):
   ```bash
   php -S localhost:8000
   ```
3. Arranca el frontend en otra terminal:
   ```bash
   npm run dev
   ```
4. Abre **http://localhost:3000** (Vite reenvía las llamadas `/api/...` al PHP del puerto 8000).

## Comprobaciones

```bash
npm run typecheck   # tipos (TypeScript)
npm test            # tests JS (parser de QR, formateo)
npm run test:php    # tests del comprobador (requiere PHP)
npm run build       # compilación de producción (genera dist/)
```

Los tests JS y de compilación se ejecutan automáticamente en cada push y pull request (ver `.github/workflows/ci.yml`).

## Desplegar

1. Sube la carpeta `api/` al hosting.
2. `npm run build` y sube el contenido de `dist/` al mismo dominio.

Si la app y el PHP están en el mismo dominio no hace falta configuración extra; si no, ajusta `allowed_origin` en el servidor y `VITE_OFICIAL_PROXY_URL` al compilar.
