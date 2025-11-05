import React, { useState, useEffect } from 'react';
import { LotteryGame } from '../types';

interface TicketCheckerProps {
    games: LotteryGame[];
    onCheckTicket: (game: LotteryGame, mainNumbers: string[], specialNumbers: string[]) => void;
    isChecking: boolean;
}

const TicketChecker: React.FC<TicketCheckerProps> = ({ games, onCheckTicket, isChecking }) => {
    const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
    const [mainNumbers, setMainNumbers] = useState<string[]>([]);
    const [specialNumbers, setSpecialNumbers] = useState<string[]>([]);
    const [errors, setErrors] = useState<string | null>(null);

    const selectedGame = games.find(g => g.id === selectedGameId);

    useEffect(() => {
        if (selectedGame) {
            setMainNumbers(Array(selectedGame.numbersToPick).fill(''));
            setSpecialNumbers(Array(selectedGame.specialNumbers?.count || 0).fill(''));
            setErrors(null);
        }
    }, [selectedGameId, selectedGame]);

    const handleMainNumberChange = (index: number, value: string) => {
        const newNumbers = [...mainNumbers];
        if (selectedGame && value.length <= String(selectedGame.maxNumber).length && /^\d*$/.test(value)) {
            newNumbers[index] = value;
            setMainNumbers(newNumbers);
        }
    };

    const handleSpecialNumberChange = (index: number, value: string) => {
        const newNumbers = [...specialNumbers];
        if (selectedGame?.specialNumbers && value.length <= String(selectedGame.specialNumbers.max).length && /^\d*$/.test(value)) {
            newNumbers[index] = value;
            setSpecialNumbers(newNumbers);
        }
    };

    const validateAndSubmit = () => {
        if (!selectedGame) return;

        const allMainFilled = mainNumbers.every(n => n.trim() !== '');
        const allSpecialFilled = specialNumbers.every(n => n.trim() !== '');

        if (!allMainFilled || !allSpecialFilled) {
            setErrors('Por favor, rellena todos los números de tu jugada.');
            return;
        }

        const mainNumbersInt = mainNumbers.map(n => parseInt(n, 10));
        const specialNumbersInt = specialNumbers.map(n => parseInt(n, 10));

        if (mainNumbersInt.some(n => isNaN(n) || n < 1 || n > selectedGame.maxNumber) ||
            (selectedGame.specialNumbers && specialNumbersInt.some(n => isNaN(n) || n < 1 || n > selectedGame.specialNumbers!.max))) {
            setErrors(`Por favor, introduce números válidos para ${selectedGame.name}.`);
            return;
        }

        setErrors(null);
        onCheckTicket(selectedGame, mainNumbers, specialNumbers);
    };

    const numberInputClass = "w-14 h-14 text-center bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none text-lg font-bold";

    return (
        <div className="flex flex-col h-full">
            <div className="space-y-6">
                <div>
                    <label htmlFor="game-select-checker" className="block text-sm font-medium text-gray-300 mb-2">
                        Sorteo
                    </label>
                    <select
                        id="game-select-checker"
                        value={selectedGameId}
                        onChange={(e) => setSelectedGameId(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none"
                    >
                        {games.map(game => (
                            <option key={game.id} value={game.id}>{game.name}</option>
                        ))}
                    </select>
                </div>

                {selectedGame && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {selectedGame.id === 'nacional' ? 'Número' : 'Números Principales'}
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {mainNumbers.map((num, index) => (
                                    <input
                                        key={`main-${index}`}
                                        type="tel" // Use tel for better mobile numeric keyboard
                                        value={num}
                                        onChange={(e) => handleMainNumberChange(index, e.target.value)}
                                        className={numberInputClass}
                                    />
                                ))}
                            </div>
                        </div>

                        {selectedGame.specialNumbers && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {selectedGame.specialNumbers.name}
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {specialNumbers.map((num, index) => (
                                        <input
                                            key={`special-${index}`}
                                            type="tel"
                                            value={num}
                                            onChange={(e) => handleSpecialNumberChange(index, e.target.value)}
                                            className={`${numberInputClass} border-brand-gold`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {errors && <p className="text-red-400 text-sm mt-4">{errors}</p>}

                <div className="pt-4">
                    <button
                        onClick={validateAndSubmit}
                        disabled={isChecking}
                        className="w-full px-8 py-3 bg-brand-gold text-black font-bold rounded-lg hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-brand-gold/20 hover:shadow-xl hover:shadow-brand-gold/40 transform hover:scale-105 flex items-center justify-center"
                    >
                        {isChecking ? (
                            <>
                               <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Comprobando...
                            </>
                        ) : 'Comprobar Jugada'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketChecker;