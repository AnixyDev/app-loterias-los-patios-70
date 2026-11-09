import React from 'react';

// Página de inicio a la que vuelve el botón "Volver". Se puede cambiar al
// compilar con VITE_HOME_URL; por defecto, la web de la administración.
const HOME_URL =
    (import.meta.env.VITE_HOME_URL as string | undefined) ||
    'https://www.loteriasmalaga70.com/';

const Header: React.FC = () => {
    return (
        <header className="relative text-center px-4 py-7 sm:py-9 border-b border-brand-gold/20">
            {/* Hairline dorada superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />

            {/* Botón volver a la página de inicio */}
            <a
                href={HOME_URL}
                aria-label="Volver a la página de inicio"
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-black/40 px-3 py-1.5 text-xs sm:text-sm font-semibold text-brand-gold transition-colors hover:bg-brand-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Volver</span>
            </a>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Asistente de Loterías
            </h1>
            <div className="mt-2 flex items-center justify-center gap-3">
                <span className="h-px w-6 bg-brand-gold/40" />
                <p className="text-sm sm:text-base font-semibold uppercase tracking-[0.22em] text-brand-gold">
                    Los Patios 70
                </p>
                <span className="h-px w-6 bg-brand-gold/40" />
            </div>
        </header>
    );
};

export default Header;
