
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center p-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
                Asistente de Loterías
            </h1>
            <p className="text-lg text-brand-gold font-semibold">Los Patios 70</p>
        </header>
    );
};

export default Header;