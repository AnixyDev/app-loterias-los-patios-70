import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ResultsHistory from './components/ResultsHistory';
import TicketChecker from './components/TicketChecker';
import FeaturedResultBanner from './components/FeaturedResultBanner';
import WeeklyResultsTicker from './components/WeeklyResultsTicker';
import { LOTTERY_GAMES } from './constants';
import { fetchFeaturedOficial, fetchTickerOficial, fetchResultsOficial, esJuegoOficial } from './services/loteriaOficial';

// Juegos con historial de resultados oficiales (los de combinación).
const JUEGOS_CON_RESULTADOS = LOTTERY_GAMES.filter((g) => esJuegoOficial(g.id));
import { 
    LotteryGame, 
    LotteryResult,
    FeaturedResult,
    WeeklyTickerResult
} from './types';

type ActiveTab = 'history' | 'checker';

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
        <div className="relative bg-brand-black text-white min-h-screen font-sans overflow-x-hidden">
            {/* Resplandor dorado sutil de fondo (profundidad) */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(234,179,8,0.10),transparent_70%)]" />
            <Header />
            <main className="relative container mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">

                <FeaturedResultBanner results={featuredResults} isLoading={isFeaturedLoading} error={featuredError} onRetry={fetchInitialData} />
                
                <WeeklyResultsTicker results={weeklyTickerResults} isLoading={isTickerLoading} error={tickerError} onRetry={fetchInitialData} />

                <div className="grid grid-cols-1 gap-8 items-start">
                    
                    {/* Main Tools Section */}
                    <div className="flex flex-col gap-8">
                        <div className="bg-black/50 border border-brand-gold/20 rounded-3xl shadow-2xl shadow-black/30 backdrop-blur-sm p-5 sm:p-7 transition-all duration-300 hover:border-brand-gold/30 hover:shadow-brand-gold/10">
                            <div className="mb-6 flex justify-center sm:justify-start">
                                <nav className="inline-flex w-full sm:w-auto gap-1 rounded-full border border-brand-gold/20 bg-black/40 p-1" role="tablist" aria-label="Secciones">
                                    <TabButton title="Historial" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                                    <TabButton title="Comprobador" isActive={activeTab === 'checker'} onClick={() => setActiveTab('checker')} />
                                </nav>
                            </div>
                            
                            <div>
                                {activeTab === 'history' && (
                                     <ResultsHistory
                                        games={JUEGOS_CON_RESULTADOS}
                                        history={historyResults}
                                        isLoading={isHistoryLoading}
                                        error={historyError}
                                        onFetchHistory={handleFetchHistory}
                                    />
                                )}
                                {activeTab === 'checker' && (
                                     <TicketChecker games={LOTTERY_GAMES} />
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
        role="tab"
        aria-selected={isActive}
        className={`${
            isActive
                ? 'bg-brand-gold text-black shadow-sm shadow-brand-gold/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
        } flex-1 sm:flex-none whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-sm sm:text-base font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold`}
    >
        {title}
    </button>
);

export default App;