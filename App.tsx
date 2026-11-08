import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ResultsHistory from './components/ResultsHistory';
import TicketChecker from './components/TicketChecker';
import GeneratorTab from './components/GeneratorTab';
import FeaturedResultBanner from './components/FeaturedResultBanner';
import WeeklyResultsTicker from './components/WeeklyResultsTicker';
import { LOTTERY_GAMES } from './constants';
import { fetchFeaturedOficial, fetchTickerOficial, fetchResultsOficial } from './services/loteriaOficial';
import { 
    LotteryGame, 
    LotteryResult,
    FeaturedResult,
    WeeklyTickerResult
} from './types';

type ActiveTab = 'history' | 'checker' | 'generator';

// Main application component
const App: React.FC = () => {
    // State for tabs
    const [activeTab, setActiveTab] = useState<ActiveTab>('history');

    // State for History
    const [historyResults, setHistoryResults] = useState<LotteryResult[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // State for Banners
    const [featuredResults, setFeaturedResults] = useState<FeaturedResult[]>([]);
    const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
    const [featuredError, setFeaturedError] = useState<string | null>(null);

    const [weeklyTickerResults, setWeeklyTickerResults] = useState<WeeklyTickerResult[]>([]);
    const [isTickerLoading, setIsTickerLoading] = useState(true);
    const [tickerError, setTickerError] = useState<string | null>(null);

    // Initial data fetching for banners
    const fetchInitialData = useCallback(async () => {
        setIsFeaturedLoading(true);
        setIsTickerLoading(true);
        setFeaturedError(null);
        setTickerError(null);
        try {
            // Use Promise.allSettled to avoid one failing request from blocking the other
            const [featured, ticker] = await Promise.allSettled([
                fetchFeaturedOficial(),
                fetchTickerOficial()
            ]);

            if (featured.status === 'fulfilled') {
                setFeaturedResults(featured.value);
            } else {
                console.error("Featured results error:", featured.reason);
                setFeaturedError("No se pudieron cargar los destacados.");
            }

            if (ticker.status === 'fulfilled') {
                setWeeklyTickerResults(ticker.value);
            } else {
                console.error("Ticker results error:", ticker.reason);
                setTickerError("No se pudieron cargar los resultados semanales.");
            }
        } catch (error) {
            const errorMessage = "Error inesperado al cargar datos.";
            setFeaturedError(errorMessage);
            setTickerError(errorMessage);
        } finally {
            setIsFeaturedLoading(false);
            setIsTickerLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const handleFetchHistory = async (game: LotteryGame, date?: string) => {
        setIsHistoryLoading(true);
        setHistoryError(null);
        setHistoryResults([]);
        try {
            const results = await fetchResultsOficial(game, date);
            setHistoryResults(results);
        } catch (error) {
            setHistoryError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    return (
        <div className="bg-brand-black text-white min-h-screen font-sans">
            <Header />
            <main className="container mx-auto p-2 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
                
                <FeaturedResultBanner results={featuredResults} isLoading={isFeaturedLoading} error={featuredError} />
                
                <WeeklyResultsTicker results={weeklyTickerResults} isLoading={isTickerLoading} error={tickerError} />

                <div className="grid grid-cols-1 gap-8 items-start">
                    
                    {/* Main Tools Section */}
                    <div className="flex flex-col gap-8">
                        <div className="bg-black/50 border border-brand-gold/20 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300 hover:border-brand-gold/30 hover:shadow-brand-gold/10">
                            <div className="mb-4 border-b border-brand-gold/30">
                                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                    <TabButton title="Historial" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                                    <TabButton title="Comprobador" isActive={activeTab === 'checker'} onClick={() => setActiveTab('checker')} />
                                    <TabButton title="Generador" isActive={activeTab === 'generator'} onClick={() => setActiveTab('generator')} />
                                </nav>
                            </div>
                            
                            <div>
                                {activeTab === 'history' && (
                                     <ResultsHistory
                                        games={LOTTERY_GAMES}
                                        history={historyResults}
                                        isLoading={isHistoryLoading}
                                        error={historyError}
                                        onFetchHistory={handleFetchHistory}
                                    />
                                )}
                                {activeTab === 'checker' && (
                                     <TicketChecker games={LOTTERY_GAMES} />
                                )}
                                 {activeTab === 'generator' && (
                                     <GeneratorTab games={LOTTERY_GAMES} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
};

const TabButton: React.FC<{ title: string, isActive: boolean, onClick: () => void }> = ({ title, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`${
            isActive
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base sm:text-lg transition-colors duration-200 focus:outline-none`}
    >
        {title}
    </button>
);

export default App;