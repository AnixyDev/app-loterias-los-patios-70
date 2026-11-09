import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
        // Rutas RELATIVAS a los assets: así el build funciona en cualquier
        // subcarpeta del hosting (p. ej. loteriasmalaga70.com/asistente/) sin
        // reconfigurar nada.
        base: './',
        server: {
            port: 3000,
            host: '0.0.0.0',
            // En desarrollo, reenvía las llamadas /api/*.php a un PHP local
            // (ejecuta:  php -S localhost:8000  en la raíz del proyecto).
            proxy: {
                '/api': { target: 'http://localhost:8000', changeOrigin: true },
            },
        },
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
