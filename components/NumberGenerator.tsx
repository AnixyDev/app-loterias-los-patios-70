
import React, { useState, useCallback, useEffect } from 'react';
import { LOTTERY_GAMES, getGameUrl } from '../constants';
import { LotteryGame, GenerationStrategy, GeneratedNumbers } from '../types';
import { generateLotteryNumbers } from '../services/geminiService';

interface NumberGeneratorProps {
    onSavePlay: (game: LotteryGame, numbers: GeneratedNumbers) => void;
}

const NumberGenerator: React.FC<NumberGeneratorProps> = ({ onSavePlay }) => {
    const [selectedGame, setSelectedGame] = useState<LotteryGame>(LOTTERY_GAMES[0]);
    const [strategy, setStrategy] = useState<GenerationStrategy>(GenerationStrategy.RANDOM);
    const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumbers | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'generate' | 'manual'>('generate');
    const [includeAddOn, setIncludeAddOn] = useState(false);
    
    const [manualMain, setManualMain] = useState<Set<number>>(new Set());
    const [manualSpecial, setManualSpecial] = useState<Set<number>>(new Set());
    const [manualTicket, setManualTicket] = useState<string>('');
    const [manualAddOn, setManualAddOn] = useState<number[] | null>(null);

    const gameUrl = getGameUrl(selectedGame.urlSlug);

    useEffect(() => {
        setGeneratedNumbers(null);
        // Fix: Explicitly type `new Set` to prevent TypeScript from inferring `Set<unknown>`.
        setManualMain(new Set<number>());
        // Fix: Explicitly type `new Set` to prevent TypeScript from inferring `Set<unknown>`.
        setManualSpecial(new Set<number>());
        setManualTicket('');
        setIncludeAddOn(false);
        setManualAddOn(null);
    }, [selectedGame, selectionMode]);

    const isMainComplete = manualMain.size === selectedGame.numbersToPick;
    const isSpecialComplete = !selectedGame.specialNumbers || manualSpecial.size === selectedGame.specialNumbers.count;
    const isTicketComplete = selectedGame.id === 'nacional' && manualTicket.length === 5;
    const isManualSelectionComplete = (selectedGame.displayType === 'ticket' && isTicketComplete) || (selectedGame.displayType !== 'ticket' && isMainComplete && isSpecialComplete);

    useEffect(() => {
        if (selectionMode === 'manual' && isManualSelectionComplete && includeAddOn && selectedGame.addOn) {
            if (!manualAddOn) {
                setManualAddOn([Math.floor(Math.random() * (selectedGame.addOn.maxNumber + 1))]);
            }
        } else {
            setManualAddOn(null);
        }
    }, [isManualSelectionComplete, includeAddOn, selectedGame, manualAddOn, selectionMode]);


    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setGeneratedNumbers(null);
        const effectiveStrategy = selectedGame.id === 'nacional' ? GenerationStrategy.RANDOM : strategy;
        const numbers = await generateLotteryNumbers(selectedGame, effectiveStrategy, includeAddOn);
        setGeneratedNumbers(numbers);
        setIsLoading(false);
    }, [selectedGame, strategy, includeAddOn]);

    const handleSave = () => {
        let numbersToSave: GeneratedNumbers | null = null;
        if (selectionMode === 'generate' && generatedNumbers) {
            numbersToSave = generatedNumbers;
        } else if (selectionMode === 'manual' && isManualSelectionComplete) {
            numbersToSave = {
                main: selectedGame.id === 'nacional' ? [parseInt(manualTicket, 10)] : Array.from(manualMain).sort((a: number, b: number) => a - b),
                special: selectedGame.specialNumbers ? Array.from(manualSpecial).sort((a: number, b: number) => a - b) : undefined,
                addOn: manualAddOn && selectedGame.addOn ? { name: selectedGame.addOn.name, numbers: manualAddOn } : undefined
            };
        }
        
        if (numbersToSave) {
            onSavePlay(selectedGame, numbersToSave);
        }
    };

    const handleMainNumberSelect = (num: number) => {
        setManualMain(prev => {
            // Fix: Explicitly type `new Set` to prevent TypeScript from inferring `Set<unknown>`, which causes type errors with array operations like `sort`.
            const newSet = new Set<number>(prev);
            if (newSet.has(num)) {
                newSet.delete(num);
            } else if (newSet.size < selectedGame.numbersToPick) {
                newSet.add(num);
            }
            return newSet;
        });
    };

    const handleSpecialNumberSelect = (num: number) => {
        if (!selectedGame.specialNumbers) return;
        setManualSpecial(prev => {
            // Fix: Explicitly type `new Set` to prevent TypeScript from inferring `Set<unknown>`, which causes type errors with array operations like `sort`.
            const newSet = new Set<number>(prev);
            if (newSet.has(num)) {
                newSet.delete(num);
            } else if (newSet.size < selectedGame.specialNumbers!.count) {
                newSet.add(num);
            }
            return newSet;
        });
    };
    
    const NumberBall: React.FC<{ number: number; isSpecial?: boolean }> = ({ number, isSpecial }) => (
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-transform transform hover:scale-110 ${
            isSpecial ? 'bg-brand-gold text-black' : 'bg-gray-800 text-white'
        }`}>
            {number}
        </div>
    );

    const TicketDisplay: React.FC<{ number: number }> = ({ number }) => (
         <div className="w-full bg-gray-800 border-2 border-dashed border-brand-gold p-4 rounded-lg shadow-lg text-center">
            <p className="text-sm text-white font-semibold">Lotería Nacional</p>
            <p className="font-mono text-5xl md:text-6xl text-white tracking-widest my-2">{String(number).padStart(5, '0')}</p>
        </div>
    );

    const NumberGrid: React.FC<{max: number, selected: Set<number>, onSelect: (n: number) => void, title: string, helpText: string, isSpecial?: boolean}> = 
    ({ max, selected, onSelect, title, helpText, isSpecial }) => (
        <div className="p-3 bg-gray-900 rounded-lg">
            <p className="font-semibold text-gray-200">{title}</p>
            <p className="text-xs text-gray-400 mb-2">{helpText}</p>
            <div className={`grid gap-1 ${max <= 12 ? 'grid-cols-6' : 'grid-cols-7 sm:grid-cols-10'}`}>
                {Array.from({ length: max }, (_, i) => i + 1).map(num => (
                    <button 
                        key={num} 
                        onClick={() => onSelect(num)}
                        className={`w-9 h-9 text-sm rounded-full transition-colors duration-150 ${
                            selected.has(num) 
                            ? 'bg-brand-gold text-black font-bold'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >{num}</button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center space-y-6 animate-fade-in">
            <div className="w-full max-w-md p-4 bg-gray-900/50 rounded-lg shadow-md space-y-4">
                <div>
                    <label htmlFor="lottery-game" className="block text-sm font-medium text-gray-300 mb-1">Elige un sorteo:</label>
                    <select
                        id="lottery-game"
                        value={selectedGame.id}
                        onChange={(e) => {
                            const game = LOTTERY_GAMES.find(g => g.id === e.target.value) || LOTTERY_GAMES[0];
                            setSelectedGame(game);
                        }}
                        className="w-full p-2 border border-brand-gold/50 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold bg-gray-800 text-white"
                    >
                        {LOTTERY_GAMES.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                </div>

                {selectedGame.addOn && (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="include-addon"
                            checked={includeAddOn}
                            onChange={(e) => setIncludeAddOn(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-brand-gold focus:ring-brand-gold"
                        />
                        <label htmlFor="include-addon" className="ml-2 block text-sm text-gray-300">
                            Incluir {selectedGame.addOn.name}
                        </label>
                    </div>
                )}

                <div className="relative flex p-1 bg-gray-800 rounded-full">
                    <button onClick={() => setSelectionMode('generate')} className={`w-1/2 rounded-full py-1.5 text-sm font-semibold transition-colors ${selectionMode === 'generate' ? 'bg-brand-gold text-black shadow' : 'text-gray-300'}`}>Generar Automáticamente</button>
                    <button onClick={() => setSelectionMode('manual')} className={`w-1/2 rounded-full py-1.5 text-sm font-semibold transition-colors ${selectionMode === 'manual' ? 'bg-brand-gold text-black shadow' : 'text-gray-300'}`}>Elegir Manualmente</button>
                </div>
            </div>

            {selectionMode === 'generate' && (
                <div className="w-full max-w-md space-y-6">
                    {selectedGame.displayType !== 'ticket' && (
                        <div className="p-4 bg-gray-900/50 rounded-lg shadow-md">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Estrategia de generación:</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(GenerationStrategy).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStrategy(s)}
                                        className={`px-3 py-2 text-sm rounded-md transition-colors ${strategy === s ? 'bg-brand-gold text-black font-semibold' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full px-6 py-3 bg-brand-gold text-black font-bold text-lg rounded-lg shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        {isLoading ? 'Generando...' : '¡Generar Mis Números!'}
                    </button>
                </div>
            )}

             {selectionMode === 'manual' && (
                <div className="w-full max-w-md p-4 bg-gray-900/50 rounded-lg shadow-md space-y-4">
                    {selectedGame.displayType === 'ticket' ? (
                        <div>
                             <label htmlFor="ticket-number" className="block text-sm font-medium text-gray-300 mb-1">Introduce tu número (5 cifras):</label>
                             <input
                                id="ticket-number"
                                type="text"
                                value={manualTicket}
                                onChange={(e) => {
                                    if (/^\d{0,5}$/.test(e.target.value)) {
                                        setManualTicket(e.target.value);
                                    }
                                }}
                                placeholder="00000"
                                className="w-full p-2 font-mono text-2xl tracking-widest text-center border border-brand-gold/50 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold bg-gray-800 text-white"
                             />
                        </div>
                    ) : (
                        <>
                            <NumberGrid 
                                max={selectedGame.maxNumber}
                                selected={manualMain}
                                onSelect={handleMainNumberSelect}
                                title="Números Principales"
                                helpText={`Elige ${selectedGame.numbersToPick} de ${selectedGame.maxNumber}`}
                            />
                            {selectedGame.specialNumbers && (
                                <NumberGrid 
                                    max={selectedGame.specialNumbers.max}
                                    selected={manualSpecial}
                                    onSelect={handleSpecialNumberSelect}
                                    title={selectedGame.specialNumbers.name}
                                    helpText={`Elige ${selectedGame.specialNumbers.count} de ${selectedGame.specialNumbers.max}`}
                                    isSpecial
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
                </div>
            )}

            {selectionMode === 'generate' && generatedNumbers && !isLoading && (
                <div className="w-full max-w-md p-6 bg-gray-900 rounded-lg shadow-xl text-center space-y-4 animate-fade-in">
                    <h3 className="text-xl font-semibold text-white">
                        Tu combinación para {selectedGame.name}:
                    </h3>
                    {selectedGame.displayType === 'ticket' ? (
                        <TicketDisplay number={generatedNumbers.main[0]} />
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                            {generatedNumbers.main.map(n => <NumberBall key={n} number={n} />)}
                            {generatedNumbers.special?.map(n => <NumberBall key={`s-${n}`} number={n} isSpecial />)}
                        </div>
                    )}
                    {generatedNumbers.addOn && (
                        <div className="pt-2">
                             <h4 className="text-sm font-semibold text-white">{generatedNumbers.addOn.name}:</h4>
                             <p className="font-mono text-2xl text-brand-gold tracking-widest">{String(generatedNumbers.addOn.numbers[0]).padStart(7, '0')}</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 pt-2">
                        Estas son combinaciones aleatorias, ¡te deseamos mucha suerte!
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
                         <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-brand-gold text-black font-bold rounded-lg shadow-md hover:opacity-90 transition-opacity transform hover:scale-105">
                            🎉 ¡Juega Online!
                        </a>
                        <button onClick={handleSave} className="px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors">
                            Guardar Jugada
                        </button>
                    </div>
                </div>
            )}

            {selectionMode === 'manual' && (
                 <div className="w-full max-w-md p-6 bg-gray-900 rounded-lg shadow-xl text-center space-y-4 animate-fade-in">
                    <h3 className="text-xl font-semibold text-white">
                        Tu Selección Manual:
                    </h3>
                    {selectedGame.displayType === 'ticket' ? (
                        <div className="w-full bg-gray-800 border-2 border-dashed border-brand-gold p-4 rounded-lg shadow-lg text-center">
                           <p className="text-sm text-white font-semibold">Lotería Nacional</p>
                           <p className="font-mono text-5xl md:text-6xl text-white tracking-widest my-2">{manualTicket.padEnd(5, '_')}</p>
                       </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2 md:gap-4 min-h-[64px] items-center">
                            {Array.from(manualMain).sort((a: number, b: number) => a - b).map(n => <NumberBall key={n} number={n} />)}
                            {Array.from(manualSpecial).sort((a: number, b: number) => a - b).map(n => <NumberBall key={`s-${n}`} number={n} isSpecial />)}
                            {!isManualSelectionComplete && <p className="text-gray-400 w-full text-sm">Completa tu selección...</p>}
                        </div>
                    )}
                    {includeAddOn && selectedGame.addOn && (
                        <div className="pt-2">
                             <h4 className="text-sm font-semibold text-white">{selectedGame.addOn.name}:</h4>
                             <p className="font-mono text-2xl text-brand-gold tracking-widest">{manualAddOn ? String(manualAddOn[0]).padStart(7, '0') : 'Se generará al completar'}</p>
                        </div>
                    )}
                    <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
                        <a href={isManualSelectionComplete ? gameUrl : undefined} onClick={(e) => !isManualSelectionComplete && e.preventDefault()} target="_blank" rel="noopener noreferrer" className={`px-5 py-2.5 text-black font-bold rounded-lg shadow-md transition-all transform hover:scale-105 ${isManualSelectionComplete ? 'bg-brand-gold hover:opacity-90' : 'bg-gray-600 cursor-not-allowed'}`}>
                            🎉 ¡Juega Online!
                        </a>
                        <button onClick={handleSave} disabled={!isManualSelectionComplete} className="px-5 py-2.5 font-semibold rounded-lg shadow-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-500 bg-gray-700 text-white hover:bg-gray-600">
                            Guardar Jugada
                        </button>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default NumberGenerator;
