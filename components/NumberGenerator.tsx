import React, { useState, useEffect } from 'react';
import { LotteryGame, GenerationStrategy } from '../types';

interface NumberGeneratorProps {
    games: LotteryGame[];
    onGenerate: (game: LotteryGame, strategy: GenerationStrategy, includeAddOn: boolean, inspirationText?: string) => void;
    isGenerating: boolean;
}

const NumberGenerator: React.FC<NumberGeneratorProps> = ({ games, onGenerate, isGenerating }) => {
    const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
    const [selectedStrategy, setSelectedStrategy] = useState<GenerationStrategy>(GenerationStrategy.RANDOM);
    const [includeAddOn, setIncludeAddOn] = useState(true);
    const [inspirationText, setInspirationText] = useState('');

    const selectedGame = games.find(g => g.id === selectedGameId);

    useEffect(() => {
        // Automatically check the add-on if the game has one and it's selected
        // and uncheck if it doesn't have one.
        if (selectedGame) {
            setIncludeAddOn(!!selectedGame.addOn);
        }
    }, [selectedGameId, selectedGame]);

    const handleGenerateClick = () => {
        if (selectedGame) {
            onGenerate(selectedGame, selectedStrategy, includeAddOn, inspirationText);
        }
    };

    const GameSelector: React.FC = () => (
        <div>
            <label htmlFor="game-select" className="block text-sm font-medium text-gray-300 mb-2">
                Sorteo
            </label>
            <select
                id="game-select"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
                {games.map(game => (
                    <option key={game.id} value={game.id}>
                        {game.name}
                    </option>
                ))}
            </select>
        </div>
    );

    const StrategySelector: React.FC = () => (
        <div>
            <label htmlFor="strategy-select" className="block text-sm font-medium text-gray-300 mb-2">
                Estrategia de Generación
            </label>
            <select
                id="strategy-select"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as GenerationStrategy)}
                className="w-full p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
                {Object.values(GenerationStrategy).map(strategy => (
                    <option key={strategy} value={strategy}>
                        {strategy}
                    </option>
                ))}
            </select>
        </div>
    );

    const InspirationInput: React.FC = () => {
        if (selectedStrategy !== GenerationStrategy.DREAM) return null;
        
        return (
             <div className="mt-4">
                <label htmlFor="inspiration-text" className="block text-sm font-medium text-gray-300 mb-2">
                    Tu Sueño o Frase de Inspiración
                </label>
                <textarea
                    id="inspiration-text"
                    rows={3}
                    value={inspirationText}
                    onChange={(e) => setInspirationText(e.target.value)}
                    placeholder="Ej: Soñé que volaba sobre una playa dorada..."
                    className="w-full p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none resize-none"
                />
            </div>
        )
    }

    const AddOnCheckbox: React.FC = () => {
        if (!selectedGame || !selectedGame.addOn) {
            return <div className="h-8"/>; // Keep layout consistent
        }

        return (
            <div className="flex items-center h-8">
                <input
                    id="addon-checkbox"
                    type="checkbox"
                    checked={includeAddOn}
                    onChange={(e) => setIncludeAddOn(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-400 text-brand-gold focus:ring-brand-gold bg-gray-700"
                />
                <label htmlFor="addon-checkbox" className="ml-3 text-sm text-gray-200">
                    Incluir {selectedGame.addOn.name}
                </label>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GameSelector />
                <StrategySelector />
            </div>
            <InspirationInput />
            <div className="flex justify-between items-center mt-2">
                <AddOnCheckbox />
                <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating || !selectedGame || (selectedStrategy === GenerationStrategy.DREAM && !inspirationText.trim())}
                    className="px-8 py-3 bg-brand-gold text-black font-bold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-gold disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[200px]"
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generando...
                        </>
                    ) : (
                        'Generar Combinación'
                    )}
                </button>
            </div>
        </div>
    );
};

export default NumberGenerator;