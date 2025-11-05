import React, { useState, useEffect } from 'react';
import { LotteryGame, CheckResult } from '../types';
import * as geminiService from '../services/geminiService';

interface TicketCheckerProps {
    games: LotteryGame[];
}

const TicketChecker: React.FC<TicketCheckerProps> = ({ games }) => {
    const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
    const [mainNumbers, setMainNumbers] = useState<(string | number)[]>([]);
    const [specialNumbers, setSpecialNumbers] = useState<(string | number)[]>([]);
    const [addOnNumber, setAddOnNumber] = useState<string>('');
    const [drawDate, setDrawDate] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CheckResult | null>(null);

    const selectedGame = games.find(g => g.id === selectedGameId);

    // Reset inputs when game changes
    useEffect(() => {
        if (selectedGame) {
            setMainNumbers(Array(selectedGame.numbersToPick).fill(''));
            setSpecialNumbers(Array(selectedGame.specialNumbers?.count || 0).fill(''));
            setAddOnNumber('');
            setResult(null);
            setError(null);
        }
    }, [selectedGameId, selectedGame]);

    const handleMainNumberChange = (index: number, value: string) => {
        const newNumbers = [...mainNumbers];
        newNumbers[index] = value;
        setMainNumbers(newNumbers);
    };

    const handleSpecialNumberChange = (index: number, value: string) => {
        const newNumbers = [...specialNumbers];
        newNumbers[index] = value;
        setSpecialNumbers(newNumbers);
    };

    const handleCheckTicket = async () => {
        if (!selectedGame) return;

        const parsedMain = mainNumbers.map(n => parseInt(String(n), 10)).filter(n => !isNaN(n));
        if (parsedMain.length !== selectedGame.numbersToPick) {
            setError(`Por favor, introduce ${selectedGame.numbersToPick} números principales.`);
            return;
        }

        const parsedSpecial = specialNumbers.map(n => parseInt(String(n), 10)).filter(n => !isNaN(n));
        if (selectedGame.specialNumbers && parsedSpecial.length !== selectedGame.specialNumbers.count) {
             setError(`Por favor, introduce ${selectedGame.specialNumbers.count} ${selectedGame.specialNumbers.name}.`);
            return;
        }
        
        const parsedAddOn = parseInt(addOnNumber, 10);
         if (selectedGame.addOn && isNaN(parsedAddOn)) {
             setError(`Por favor, introduce el número de ${selectedGame.addOn.name}.`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const checkData: { main: number[], special?: number[], addOn?: number } = { main: parsedMain };
            if (parsedSpecial.length > 0) checkData.special = parsedSpecial;
            if (!isNaN(parsedAddOn)) checkData.addOn = parsedAddOn;

            const apiResult = await geminiService.checkTicket(selectedGame, checkData, drawDate);
            setResult(apiResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderResult = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 border border-brand-gold/50 rounded-lg mt-6">
                    <svg className="animate-spin h-8 w-8 text-brand-gold mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-semibold text-brand-gold">Comprobando tu boleto...</p>
                </div>
            );
        }

        if (error) {
            return <p className="text-red-400 text-sm mt-4 text-center">{error}</p>;
        }
        
        if (!result) return null;

        return (
             <div className={`mt-6 p-4 rounded-lg animate-fade-in-up text-center border ${result.isWinner ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
                <h3 className="text-xl font-bold mb-2">{result.isWinner ? '🎉 ¡Enhorabuena, tienes un premio! 🎉' : 'Lo sentimos, tu boleto no tiene premio.'}</h3>
                <p className="text-lg mb-3">{result.message}</p>
                 {result.isWinner && <p className="text-2xl font-bold text-brand-gold mb-4">Premio: {result.prizeAmount}</p>}
                
                <div className="text-left text-sm space-y-2 mt-4 bg-black/30 p-3 rounded-md">
                    <p><span className="font-semibold text-gray-300">Sorteo del:</span> {result.drawDate || 'Último sorteo'}</p>
                    <p><span className="font-semibold text-gray-300">Combinación Ganadora:</span> {result.winningNumbers.main.join(', ')} {result.winningNumbers.special && result.winningNumbers.special.length > 0 ? ` | ${result.winningNumbers.special.join(', ')}` : ''}</p>
                    {result.matchedNumbers && (result.matchedNumbers.main.length > 0 || (result.matchedNumbers.special && result.matchedNumbers.special.length > 0)) && (
                         <p><span className="font-semibold text-gray-300">Tus Aciertos:</span> <span className="text-green-400 font-bold">{result.matchedNumbers.main.join(', ')}</span> {result.matchedNumbers.special && result.matchedNumbers.special.length > 0 ? ` | <span className="text-green-400 font-bold">${result.matchedNumbers.special.join(', ')}</span>` : ''}</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                 <select
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="w-full p-3 bg-black border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none"
                >
                    {games.map(game => (
                        <option key={game.id} value={game.id}>
                            {game.name}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    placeholder="Fecha del sorteo (opcional)"
                    className="w-full p-3 bg-black border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none text-gray-300"
                    aria-label="Seleccionar fecha del sorteo"
                />
            </div>

            {selectedGame && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Números Principales ({selectedGame.numbersToPick})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {mainNumbers.map((num, i) => (
                            <input key={i} type="number" value={num} onChange={(e) => handleMainNumberChange(i, e.target.value)} className="w-14 p-2 text-center bg-black border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none" />
                        ))}
                    </div>
                </div>
            )}

            {selectedGame?.specialNumbers && (
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {selectedGame.specialNumbers.name} ({selectedGame.specialNumbers.count})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {specialNumbers.map((num, i) => (
                            <input key={i} type="number" value={num} onChange={(e) => handleSpecialNumberChange(i, e.target.value)} className="w-14 p-2 text-center bg-brand-gold/20 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none" />
                        ))}
                    </div>
                </div>
            )}
            
            {selectedGame?.addOn && (
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {selectedGame.addOn.name}
                    </label>
                    <input type="number" value={addOnNumber} onChange={(e) => setAddOnNumber(e.target.value)} className="p-2 bg-black border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none" />
                </div>
            )}
            
            <div className="flex justify-end mt-4">
                 <button
                    onClick={handleCheckTicket}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-brand-gold text-black font-bold rounded-lg hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Comprobando...' : 'Comprobar Boleto'}
                </button>
            </div>
            
            {renderResult()}
        </div>
    );
};

export default TicketChecker;
