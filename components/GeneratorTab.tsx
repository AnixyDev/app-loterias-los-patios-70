import React, { useState, useEffect } from 'react';
import { LotteryGame, GeneratedNumbers, GenerationStrategy } from '../types';
import NumberGenerator from './NumberGenerator';
import SavedPlays from './SavedPlays';
import * as geminiService from '../services/geminiService';

interface GeneratorTabProps {
    games: LotteryGame[];
}

type Play = { game: LotteryGame } & GeneratedNumbers;

// Las jugadas se guardan en el navegador del dispositivo (localStorage): no hay
// cuenta ni servidor, así que son privadas de ese navegador y no se sincronizan
// entre dispositivos. Si se borran los datos de navegación, se pierden.
const STORAGE_KEY = 'jugadas-guardadas';
const MAX_JUGADAS = 50;

const cargarJugadas = (): Play[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        // Validación defensiva: solo jugadas con la forma esperada.
        return Array.isArray(data)
            ? data.filter((p) => p && p.game && Array.isArray(p.main)).slice(0, MAX_JUGADAS)
            : [];
    } catch {
        return [];
    }
};

const GeneratorTab: React.FC<GeneratorTabProps> = ({ games }) => {
    const [savedPlays, setSavedPlays] = useState<Play[]>(cargarJugadas);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastGeneratedPlay, setLastGeneratedPlay] = useState<Play | null>(null);

    // Persistir en el navegador cada vez que cambian las jugadas.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlays));
        } catch {
            /* modo incógnito o almacenamiento lleno: seguimos sin persistir */
        }
    }, [savedPlays]);

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
            setSavedPlays(prevPlays => [newPlay, ...prevPlays].slice(0, MAX_JUGADAS));
            setLastGeneratedPlay(newPlay);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsGenerating(false);
        }
    };

    const removePlay = (index: number) =>
        setSavedPlays(prev => prev.filter((_, i) => i !== index));

    const clearPlays = () => setSavedPlays([]);

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
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-brand-gold">Mis Jugadas Generadas</h3>
                    {savedPlays.length > 0 && (
                        <button
                            onClick={clearPlays}
                            className="rounded-lg border border-white/20 px-3 py-1 text-sm text-gray-300 hover:border-red-500/60 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                        >
                            Vaciar
                        </button>
                    )}
                </div>
                <SavedPlays plays={savedPlays} onRemove={removePlay} />
                {savedPlays.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                        Se guardan solo en este navegador y dispositivo.
                    </p>
                )}
            </div>
        </div>
    );
};

export default GeneratorTab;
