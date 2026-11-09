import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="relative text-center px-4 py-7 sm:py-9 border-b border-brand-gold/20">
            {/* Hairline dorada superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
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
