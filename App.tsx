import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import NumberGenerator from './components/NumberGenerator';
import ChatAssistant from './components/ChatAssistant';
import { ChatMessage, GeneratedNumbers, LotteryGame } from './types';
import { getChatResponse } from './services/geminiService';
import SavedPlays from './components/SavedPlays';

type Tab = 'generator' | 'chat' | 'saved';

export interface SavedPlay {
    game: LotteryGame;
    numbers: GeneratedNumbers;
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('generator');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            sender: 'bot',
            text: '¡Hola! Soy El Patios 70 Bot. ¿Cómo puedo ayudarte hoy? Puedes pedirme que genere números o preguntarme cualquier duda que tengas.'
        }
    ]);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);

    const handleSendMessage = useCallback(async (text: string) => {
        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
        setMessages(prev => [...prev, userMessage]);
        setIsBotTyping(true);

        const botResponseText = await getChatResponse(text);
        
        const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'bot', text: botResponseText };
        setMessages(prev => [...prev, botMessage]);
        setIsBotTyping(false);
    }, []);

    const handleSavePlay = useCallback((game: LotteryGame, numbers: GeneratedNumbers) => {
        setSavedPlays(prev => [...prev, { game, numbers }]);
        setActiveTab('saved');
    }, []);

    const TabButton = ({ tabId, label }: { tabId: Tab, label: string }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                activeTab === tabId
                    ? 'bg-brand-gold text-black shadow-md'
                    : 'bg-transparent text-gray-300 hover:bg-brand-gold hover:text-black'
            }`}
        >
            {label}
            {tabId === 'saved' && savedPlays.length > 0 && (
                <span className="ml-2 bg-brand-gold text-brand-black text-xs font-bold px-2 py-1 rounded-full">{savedPlays.length}</span>
            )}
        </button>
    );

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-2 md:p-4">
            <Header />
            <main className="flex-grow flex flex-col bg-brand-black shadow-2xl rounded-lg overflow-hidden border border-brand-gold/50">
                <div className="flex border-b border-brand-gold/50 px-2 md:px-4 pt-2">
                    <TabButton tabId="generator" label="Generador" />
                    <TabButton tabId="chat" label="Asistente" />
                    <TabButton tabId="saved" label="Jugadas Guardadas" />
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {activeTab === 'generator' && <NumberGenerator onSavePlay={handleSavePlay} />}
                    {activeTab === 'chat' && <ChatAssistant messages={messages} onSendMessage={handleSendMessage} isBotTyping={isBotTyping} />}
                    {activeTab === 'saved' && <SavedPlays savedPlays={savedPlays} />}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default App;