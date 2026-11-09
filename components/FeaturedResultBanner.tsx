import React from 'react';
import { FeaturedResult } from '../types';
import { GAME_IMAGES } from '../constants';
import { formatPremio as formatCurrency } from '../services/format';

interface FeaturedResultBannerProps {
    results: FeaturedResult[];
    isLoading: boolean;
    error: string | null;
    onRetry?: () => void;
}

const FeaturedResultBanner: React.FC<FeaturedResultBannerProps> = ({ results, isLoading, error, onRetry }) => {

    const SkeletonCard = () => (
        <div className="bg-black/50 border border-brand-gold/20 rounded-2xl p-4 animate-pulse flex-none w-64 sm:w-72 h-48 mr-4 sm:mr-6">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-10 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="flex space-x-2">
                <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
            </div>
        </div>
    );

    const ResultCard: React.FC<{ result: FeaturedResult }> = ({ result }) => {
        const imageUrl = GAME_IMAGES[result.gameId] || GAME_IMAGES['default'];

        return (
            <div className="relative bg-gradient-to-br from-black/70 to-black/40 border border-brand-gold/25 rounded-2xl p-4 overflow-hidden flex-none w-64 sm:w-72 h-48 mr-4 sm:mr-6 flex flex-col justify-between shadow-lg shadow-black/40 transition-all duration-300 hover:border-brand-gold/50 hover:shadow-brand-gold/10 hover:-translate-y-1 snap-start">
                <div
                    style={{ backgroundImage: `url(${imageUrl})` }}
                    aria-label={result.gameName}
                    role="img"
                    className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-10 z-0"
                />
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white">{result.gameName}</h3>
                    <p className="text-xs text-gray-300">{result.date}</p>
                </div>
                <div className="relative z-10">
                    <p className="text-3xl font-bold text-brand-gold leading-tight">{formatCurrency(result.jackpot)}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {result.mainNumbers && result.mainNumbers.map((num, i) => (
                            <span key={`main-${num}-${i}`} className="flex items-center justify-center h-6 w-6 text-xs bg-white text-black rounded-full font-bold shadow-md ring-1 ring-black/10">
                                {num}
                            </span>
                        ))}
                        {result.specialNumbers && (Array.isArray(result.specialNumbers) ? result.specialNumbers : [result.specialNumbers]).map((num, i) => (
                            <span key={`special-${num}-${i}`} className="flex items-center justify-center h-6 w-6 text-xs bg-gradient-to-br from-brand-gold to-yellow-600 text-black rounded-full font-bold shadow-md shadow-brand-gold/40">
                                {num}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 h-48 bg-black/50 border border-red-500/50 rounded-2xl p-4 text-red-400">
                    <p className="text-center">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="rounded-lg border border-brand-gold/60 px-4 py-1.5 text-sm font-semibold text-brand-gold hover:bg-brand-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            );
        }

        if (results.length === 0) {
            return (
                 <div className="flex items-center justify-center h-48 bg-black/50 border border-brand-gold/20 rounded-2xl p-4 text-gray-400">
                    <p>No hay resultados destacados disponibles en este momento.</p>
                </div>
            );
        }

        return (
            <div className="flex">
                {results.map(result => <ResultCard key={result.gameId} result={result} />)}
            </div>
        );
    };


    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-brand-gold">Resultados Destacados</h2>
            <div className="flex overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory">
                {renderContent()}
            </div>
        </div>
    );
};

export default FeaturedResultBanner;
