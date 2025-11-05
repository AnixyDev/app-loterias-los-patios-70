import React, { useState } from 'react';
import { LotteryGame, LotteryResult, PrizeTier } from '../types';

interface ResultsHistoryProps {
    games: LotteryGame[];
    history: LotteryResult[];
    isLoading: boolean;
    error: string | null;
    onFetchHistory: (game: LotteryGame, date?: string) => void;
}

const PrizeTiersTable: React.FC<{ tiers: PrizeTier[] }> = ({ tiers }) => {
    if (!tiers || tiers.length === 0) {
        return <p className="text-sm text-gray-400 mt-2">No hay desglose de premios disponible.</p>;
    }
    return (
        <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-900/70">
                    <tr>
                        <th className="px-4 py-2 font-semibold">Categoría</th>
                        <th className="px-4 py-2 font-semibold">Ganadores</th>
                        <th className="px-4 py-2 font-semibold text-right">Premio</th>
                    </tr>
                </thead>
                <tbody>
                    {tiers.map((tier, index) => (
                        <tr key={index} className="border-b border-gray-800">
                            <td className="px-4 py-2">{tier.category}</td>
                            <td className="px-4 py-2">{tier.winners}</td>
                            <td className="px-4 py-2 text-right font-mono">{tier.prize}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const ResultsHistory: React.FC<ResultsHistoryProps> = ({ games, history, isLoading, error, onFetchHistory }) => {
    const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchPerformed, setSearchPerformed] = useState(false);
    const selectedGame = games.find(g => g.id === selectedGameId);

    const handleFetchClick = () => {
        if (selectedGame) {
            setSearchPerformed(true);
            onFetchHistory(selectedGame, selectedDate);
        }
    };
    
    const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGameId(e.target.value);
        setSelectedDate(''); // Reset date on game change
        setSearchPerformed(false); // Reset search status
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                     <svg className="animate-spin h-8 w-8 text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }
        if (error) {
            return <div className="flex items-center justify-center h-full text-red-400 text-center">{error}</div>;
        }
        if (history.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                    <p>
                        {searchPerformed
                            ? "No se encontraron resultados para tu búsqueda."
                            : 'Selecciona un sorteo y pulsa "Buscar" para ver los últimos resultados.'}
                    </p>
                </div>
            );
        }
        return (
             <div className="space-y-4 h-full max-h-[500px] overflow-y-auto pr-2 -mr-2">
                {history.map((result, index) => (
                    <div key={index} className="bg-gray-900/70 p-4 rounded-lg border border-white/10 transition-transform duration-200 hover:scale-[1.02] hover:border-brand-gold/50">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-lg font-bold text-brand-gold">{result.date}</p>
                                <p className="text-sm text-gray-300">Bote: <span className="font-semibold">{result.jackpot}</span></p>
                            </div>
                            {result.nextJackpot && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Próximo Bote</p>
                                    <p className="font-semibold text-brand-gold">{result.nextJackpot}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            {result.mainNumbers.map((num, i) => (
                                <span key={`${num}-${i}`} className="flex items-center justify-center h-8 w-8 bg-white text-black rounded-full font-bold text-base">
                                    {num}
                                </span>
                            ))}
                             {result.specialNumbers && result.specialNumbers.map((num, i) => (
                                <span key={`s-${num}-${i}`} className="flex items-center justify-center h-8 w-8 bg-brand-gold text-black rounded-full font-bold text-base">
                                    {num}
                                </span>
                            ))}
                        </div>

                         {result.prizeLocation && (
                             <p className="text-sm text-gray-300 mb-3">
                                 <span className="font-semibold">🏆 1er Premio vendido en:</span> {result.prizeLocation}
                            </p>
                         )}

                        {result.prizeTiers && result.prizeTiers.length > 0 && (
                             <details className="text-sm">
                                <summary className="cursor-pointer text-gray-300 hover:text-white font-semibold">
                                    Ver escrutinio de premios
                                </summary>
                                <PrizeTiersTable tiers={result.prizeTiers} />
                            </details>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <select
                    value={selectedGameId}
                    onChange={handleGameChange}
                    className="w-full sm:flex-grow p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none"
                >
                    {games.map(game => (
                        <option key={game.id} value={game.id}>
                            {game.name}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto p-3 bg-gray-900 border border-brand-gold/50 rounded-lg focus:ring-2 focus:ring-brand-gold focus:outline-none text-gray-300"
                    aria-label="Seleccionar fecha"
                />
                <button
                    onClick={handleFetchClick}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-brand-gold text-black font-bold rounded-lg hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-brand-gold/20 hover:shadow-xl hover:shadow-brand-gold/40 transform hover:scale-105"
                >
                    Buscar
                </button>
            </div>
             <div className="flex-grow min-h-[400px] relative">
                {renderContent()}
            </div>
        </div>
    );
};

export default ResultsHistory;