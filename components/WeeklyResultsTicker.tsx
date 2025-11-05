import React from 'react';
import { WeeklyTickerResult } from '../types';

interface WeeklyResultsTickerProps {
    results: WeeklyTickerResult[];
    isLoading: boolean;
    error: string | null;
}

const WeeklyResultsTicker: React.FC<WeeklyResultsTickerProps> = ({ results, isLoading, error }) => {

    const SkeletonLoader = () => (
        <div className="flex items-center space-x-8 animate-pulse">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                </div>
            ))}
        </div>
    );

    const ErrorDisplay = () => (
        <div className="flex items-center justify-center h-full text-red-400">
            <p>{error}</p>
        </div>
    );

    const TickerContent = () => (
        <div className="flex animate-scroll">
            {[...results, ...results].map((result, index) => (
                <div key={index} className="flex items-center space-x-4 mx-6 shrink-0">
                    <span className="font-bold text-brand-gold">{result.gameName}</span>
                    <span className="text-gray-300 font-mono text-sm">{result.numbers}</span>
                    <span className="text-xs text-gray-500">({result.date})</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-black/50 border-y border-brand-gold/30 py-3 group overflow-hidden whitespace-nowrap">
            {isLoading && <SkeletonLoader />}
            {error && !isLoading && <ErrorDisplay />}
            {results.length > 0 && !isLoading && <TickerContent />}
        </div>
    );
};

export default WeeklyResultsTicker;
