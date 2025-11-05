import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatAssistant from './components/ChatAssistant';
import ResultsHistory from './components/ResultsHistory';
import TicketChecker from './components/TicketChecker';
import FeaturedResultBanner from './components/FeaturedResultBanner';
import WeeklyResultsTicker from './components/WeeklyResultsTicker';
import { LOTTERY_GAMES, INITIAL_CHAT_MESSAGE } from './constants';
import * as geminiService from './services/geminiService';
import { 
    LotteryGame, 
    ChatMessage,
    LotteryResult,
    FeaturedResult,
    WeeklyTickerResult
} from './types';

type ActiveTab = 'history' | 'checker';

// Main application component
const App: React.FC = () => {
    // State for tabs
    const [activeTab, setActiveTab] = useState<ActiveTab>('history');

    // State for Chat
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
    const [isBotTyping, setIsBotTyping] = useState(false);

    // State for History
    const [historyResults, setHistoryResults] = useState<LotteryResult[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // State for Ticket Checker
    const [isCheckingTicket, setIsCheckingTicket] = useState(false);

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
                geminiService.fetchFeaturedResults(),
                geminiService.fetchWeeklyTickerResults()
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
    
    // Handlers for component interactions
    const handleSendMessage = async (text: string) => {
        const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
        setChatMessages(prev => [...prev, newUserMessage]);
        setIsBotTyping(true);

        const history = chatMessages.map(msg => ({
            role: msg.sender === 'user' ? ('user' as const) : ('model' as const),
            parts: [{ text: msg.text }]
        }));

        try {
            const botResponseText = await geminiService.getChatResponse(history, text);
            const newBotMessage: ChatMessage = { id: Date.now().toString() + 'b', sender: 'bot', text: botResponseText };
            setChatMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
             const errorMessage: ChatMessage = { id: Date.now().toString() + 'e', sender: 'bot', text: 'Lo siento, estoy teniendo problemas para conectar. Inténtalo de nuevo más tarde.' };
             setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotTyping(false);
        }
    };

    const handleFetchHistory = async (game: LotteryGame, date?: string) => {
        setIsHistoryLoading(true);
        setHistoryError(null);
        setHistoryResults([]);
        try {
            const results = await geminiService.fetchLatestResults(game, date);
            setHistoryResults(results);
        } catch (error) {
            setHistoryError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleCheckTicket = async (game: LotteryGame, mainNumbers: string[], specialNumbers: string[]) => {
        setIsCheckingTicket(true);
        const userQuery = `Quiero comprobar mi jugada para ${game.name}. Números: ${mainNumbers.join(', ')}${specialNumbers.length > 0 ? `, ${game.specialNumbers?.name}: ${specialNumbers.join(', ')}` : ''}.`;
        const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userQuery };
        setChatMessages(prev => [...prev, newUserMessage]);
        setIsBotTyping(true);

        try {
            const resultText = await geminiService.checkTicket(game, mainNumbers, specialNumbers);
            const newBotMessage: ChatMessage = { id: Date.now().toString() + 'b', sender: 'bot', text: resultText };
            setChatMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { id: Date.now().toString() + 'e', sender: 'bot', text: `Lo siento, no pude comprobar tu jugada de ${game.name}. Inténtalo de nuevo.` };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotTyping(false);
            setIsCheckingTicket(false);
        }
    };

    return (
        <div className="bg-brand-black text-white min-h-screen font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                
                <FeaturedResultBanner results={featuredResults} isLoading={isFeaturedLoading} error={featuredError} />
                
                <div className="lg:hidden">
                  <WeeklyResultsTicker results={weeklyTickerResults} isLoading={isTickerLoading} error={tickerError} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    
                    {/* Left Column: Tools with Tabs */}
                    <div className="lg:col-span-3 flex flex-col gap-8">
                        <div className="hidden lg:block">
                            <WeeklyResultsTicker results={weeklyTickerResults} isLoading={isTickerLoading} error={tickerError} />
                        </div>
                        <div className="bg-gray-900/50 border border-brand-gold/20 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300 hover:border-brand-gold/30 hover:shadow-brand-gold/10">
                            <div className="mb-4 border-b border-brand-gold/30">
                                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                    <TabButton title="Historial de Sorteos" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                                    <TabButton title="Comprobador" isActive={activeTab === 'checker'} onClick={() => setActiveTab('checker')} />
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
                                     <TicketChecker
                                        games={LOTTERY_GAMES}
                                        onCheckTicket={handleCheckTicket}
                                        isChecking={isCheckingTicket}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Chat Assistant */}
                    <div className="lg:col-span-2 min-h-[60vh] lg:min-h-0 lg:h-full">
                         <div className="sticky top-8 bg-gray-900/50 border border-brand-gold/20 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300 hover:border-brand-gold/30 hover:shadow-brand-gold/10 h-full max-h-[85vh] flex flex-col">
                           <h2 className="text-2xl font-bold mb-4 text-brand-gold shrink-0">Asistente Virtual</h2>
                           <ChatAssistant
                                messages={chatMessages}
                                onSendMessage={handleSendMessage}
                                isBotTyping={isBotTyping}
                           />
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
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors duration-200 focus:outline-none`}
    >
        {title}
    </button>
);

export default App;