import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="text-center p-4 text-xs text-gray-400">
            <p>Recuerda jugar siempre de forma responsable. El juego debe ser una actividad de ocio.</p>
            <a href="https://www.loteriasmalaga70.com/" target="_blank" rel="noopener noreferrer" className="text-brand-gold font-semibold hover:underline">
                Administración de loterías los patios 70
            </a>
        </footer>
    );
};

export default Footer;