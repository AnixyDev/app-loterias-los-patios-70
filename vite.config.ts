import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La clave de Gemini YA NO se inyecta en el cliente: vive en el proxy PHP.
// Aquí solo queda la URL opcional del proxy (pública, no es un secreto).
export default defineConfig(() => {
    return {
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
