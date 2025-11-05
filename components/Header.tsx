import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center px-4 py-6 sm:py-8 border-b border-brand-gold/20">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Asistente de Loterías
            </h1>
            <p className="text-base sm:text-lg text-brand-gold font-semibold">Los Patios 70</p>
        </header>
    );
};

export default Header;