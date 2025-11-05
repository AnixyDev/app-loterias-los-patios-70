import React, { useState } from 'react';
import { LotteryGame, GeneratedNumbers, GenerationStrategy } from '../types';
import NumberGenerator from './NumberGenerator';
import SavedPlays from './SavedPlays';
import * as geminiService from '../services/geminiService';

interface GeneratorTabProps {
    games: LotteryGame[];
}

const GeneratorTab: React.FC<GeneratorTabProps> = ({ games }) => {
    const [savedPlays, setSavedPlays] = useState<({ game: LotteryGame } & GeneratedNumbers)[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastGeneratedPlay, setLastGeneratedPlay] = useState<({ game: LotteryGame } & GeneratedNumbers) | null>(null);

    const handleGenerate = async (
        game: LotteryGame,
        strategy: GenerationStrategy,
        includeAddOn: boolean,
        inspirationText?: string
    ) => {
        setIsGenerating(true);
        setError(null);
        setLastGeneratedPlay(null);
        try {
            const generatedNumbers = await geminiService.generateNumbers(game, strategy, includeAddOn, inspirationText);
            const newPlay = { game, ...generatedNumbers };
            setSavedPlays(prevPlays => [newPlay, ...prevPlays]);
            setLastGeneratedPlay(newPlay);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const renderGeneratedPlay = () => {
        if (!lastGeneratedPlay) return null;

        const { game, main, special, addOn } = lastGeneratedPlay;
        const mainNumbersStr = main.join(' - ');
        let specialNumbersStr = '';
        if (special && game.specialNumbers) {
            specialNumbersStr = ` | ${game.specialNumbers.name}: ${special.join(', ')}`;
        }

        return (
             <div className="mt-6 p-4 bg-gray-800/50 border border-brand-gold/50 rounded-lg animate-fade-in-up text-center">
                <h3 className="text-lg font-bold text-brand-gold mb-2">¡Tu combinación para {game.name}!</h3>
                 <p className="text-2xl font-mono tracking-wider text-white">
                    {mainNumbersStr}
                    {specialNumbersStr && <span className="text-brand-gold">{specialNumbersStr}</span>}
                </p>
                 {addOn && addOn.name === 'Joker' && (
                     <p className="text-lg font-mono tracking-wider text-white mt-1">
                         Joker: <span className="text-brand-gold">{String(addOn.numbers[0]).padStart(7, '0')}</span>
                     </p>
                 )}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold mb-4 text-brand-gold">Crear Jugada</h3>
                <NumberGenerator games={games} onGenerate={handleGenerate} isGenerating={isGenerating} />
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
                {renderGeneratedPlay()}
            </div>
            <div>
                 <h3 className="text-xl font-bold mb-4 text-brand-gold">Mis Jugadas Generadas</h3>
                 <SavedPlays plays={savedPlays} />
            </div>
        </div>
    );
};

export default GeneratorTab;
