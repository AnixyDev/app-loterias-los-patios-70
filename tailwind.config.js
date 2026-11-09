/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './index.tsx',
        './App.tsx',
        './components/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                'brand-gold': '#EAB308',
                'brand-black': '#1a1a1a',
                'brand-white': '#ffffff',
            },
            animation: {
                scroll: 'scroll 30s linear infinite',
                'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
            },
            keyframes: {
                scroll: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
