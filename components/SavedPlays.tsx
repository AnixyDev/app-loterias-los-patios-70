import React, { useState } from 'react';
import { CTA_LINK, getGameUrl } from '../constants';
import { SavedPlay } from '../App';

interface SavedPlaysProps {
    savedPlays: SavedPlay[];
}

const SavedPlays: React.FC<SavedPlaysProps> = ({ savedPlays }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (play: SavedPlay, index: number) => {
        let textToCopy = `${play.game.name}:\n`;
        textToCopy += `Números: ${play.numbers.main.join(', ')}\n`;
        if (play.numbers.special && play.game.specialNumbers) {
            textToCopy += `${play.game.specialNumbers.name}: ${play.numbers.special.join(', ')}\n`;
        }
        if (play.numbers.addOn) {
            textToCopy += `${play.numbers.addOn.name}: ${String(play.numbers.addOn.numbers[0]).padStart(7, '0')}`;
        }

        navigator.clipboard.writeText(textToCopy.trim());
        
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000);
    };
    
    const NumberBall: React.FC<{ number: number; isSpecial?: boolean }> = ({ number, isSpecial }) => (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-md ${
            isSpecial ? 'bg-brand-gold text-black' : 'bg-gray-800 text-white'
        }`}>
            {number}
        </div>
    );

    const TicketDisplay: React.FC<{ number: number }> = ({ number }) => (
        <div className="w-full sm:w-auto bg-gray-800 border border-dashed border-brand-gold p-2 rounded-md shadow-sm text-center">
           <p className="font-mono text-2xl text-white tracking-wider">{String(number).padStart(5, '0')}</p>
       </div>
   );

    if (savedPlays.length === 0) {
        return (
            <div className="text-center text-gray-400">
                <p>Aún no has guardado ninguna jugada.</p>
                <p>Ve a la pestaña "Generador" para crear y guardar tus combinaciones.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white mb-4">Mis Jugadas Guardadas</h2>
            {savedPlays.map((play, index) => (
                <div key={index} className="bg-gray-900/50 p-4 rounded-lg shadow-md animate-fade-in space-y-3">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg text-brand-gold">{play.game.name}</h3>
                        <div className="flex items-center gap-2">
                             <a href={getGameUrl(play.game.urlSlug)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors bg-brand-gold text-black hover:opacity-90">
                                Jugar
                            </a>
                            <button 
                                onClick={() => handleCopy(play, index)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-all duration-200 ${
                                    copiedIndex === index 
                                    ? 'bg-brand-gold text-black' 
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                            >
                                {copiedIndex === index ? '¡Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {play.game.displayType === 'ticket' && play.numbers.main.length > 0 ? (
                             <TicketDisplay number={play.numbers.main[0]} />
                        ) : (
                            <>
                                {play.numbers.main.map(n => <NumberBall key={n} number={n} />)}
                                {play.numbers.special?.map(n => <NumberBall key={`s-${n}`} number={n} isSpecial />)}
                            </>
                        )}
                    </div>
                     {play.numbers.addOn && (
                        <div className="pt-1">
                             <h4 className="text-sm font-semibold text-white">{play.numbers.addOn.name}:</h4>
                             <p className="font-mono text-xl text-brand-gold tracking-widest">{String(play.numbers.addOn.numbers[0]).padStart(7, '0')}</p>
                        </div>
                    )}
                </div>
            ))}
             <div className="text-center pt-4">
                <a href={CTA_LINK} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 bg-brand-gold text-black font-bold rounded-lg shadow-md hover:opacity-90 transition-opacity transform hover:scale-105">
                    🎉 ¡Ir a la Web Oficial!
                </a>
            </div>
        </div>
    );
};

export default SavedPlays;
