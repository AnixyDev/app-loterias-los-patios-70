import React from 'react';
import { LotteryGame, GeneratedNumbers } from '../types';

interface SavedPlaysProps {
    plays: ({ game: LotteryGame } & GeneratedNumbers)[];
    onRemove?: (index: number) => void;
}

const SavedPlays: React.FC<SavedPlaysProps> = ({ plays, onRemove }) => {

    const PlayItem: React.FC<{ play: { game: LotteryGame } & GeneratedNumbers; index: number }> = ({ play, index }) => {
        const { game, main, special, addOn } = play;
        
        const formatPlayForShare = (): string => {
            let text = `Mi jugada para ${game.name}:\n`;
            if (game.id === 'nacional') {
                text += `Número: ${String(main[0]).padStart(5, '0')}`;
            } else {
                text += `Números: ${main.join(', ')}`;
            }

            if (special && game.specialNumbers) {
                text += `\n${game.specialNumbers.name}: ${special.join(', ')}`;
            }
             if (addOn && addOn.name === 'Joker') {
                text += `\n${addOn.name}: ${String(addOn.numbers[0]).padStart(7, '0')}`;
            } else if (addOn) {
                text += `\n${addOn.name}: ${addOn.numbers.join(', ')}`;
            }
            return text;
        }

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(formatPlayForShare());
                // Optional: show a temporary "Copied!" message
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        };

        const handleShare = async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Jugada de ${game.name}`,
                        text: formatPlayForShare(),
                    });
                } catch (err) {
                    console.error('Error sharing:', err);
                }
            } else {
                // Fallback for browsers that don't support navigator.share
                handleCopy();
                alert('La función de compartir no está disponible en tu navegador. La jugada ha sido copiada al portapapeles.');
            }
        };


        const mainNumbersStr = main.join(', ');
        let specialNumbersStr = '';
        if (special && game.specialNumbers) {
            specialNumbersStr = ` | ${game.specialNumbers.name}: ${special.join(', ')}`;
        }
        let addOnStr = '';
        if (addOn && addOn.name === 'Joker') {
            addOnStr = ` | ${addOn.name}: ${String(addOn.numbers[0]).padStart(7, '0')}`;
        } else if (addOn) {
             addOnStr = ` | ${addOn.name}: ${addOn.numbers.join(', ')}`;
        }


        return (
            <div className="bg-black/70 p-3 rounded-lg border border-white/10 mb-2 transition-all hover:border-brand-gold/50">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-brand-gold">{game.name}</p>
                        <p className="text-sm font-mono tracking-wider">
                            {game.id === 'nacional' ? String(main[0]).padStart(5, '0') : mainNumbersStr}
                            {specialNumbersStr}
                            {addOnStr}
                        </p>
                    </div>
                     <div className="flex space-x-2 shrink-0 ml-2">
                        <button onClick={handleCopy} title="Copiar jugada" aria-label={`Copiar jugada de ${game.name}`} className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        {navigator.share && (
                            <button onClick={handleShare} title="Compartir jugada" className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                            </button>
                        )}
                        {onRemove && (
                            <button onClick={() => onRemove(index)} title="Eliminar jugada" aria-label={`Eliminar jugada de ${game.name}`} className="p-1.5 text-gray-300 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (plays.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
                <p>Aquí aparecerán tus jugadas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 h-full max-h-[250px] overflow-y-auto pr-2">
            {plays.map((play, index) => (
                <PlayItem key={`${play.game.id}-${index}`} play={play} index={index} />
            ))}
        </div>
    );
};

export default SavedPlays;