import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatAssistantProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isBotTyping: boolean;
}

// Helper component to render simple markdown (bold and newlines)
const SimpleMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);

    const renderedParts = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        // Handle newlines within normal text parts
        return part.split('\n').map((line, lineIndex, arr) => (
            <React.Fragment key={`${index}-${lineIndex}`}>
                {line}
                {lineIndex < arr.length - 1 && <br />}
            </React.Fragment>
        ));
    });

    return <>{renderedParts}</>;
});

const QuickActionButton: React.FC<{ text: string, onClick: () => void }> = ({ text, onClick }) => (
    <button 
        onClick={onClick}
        className="px-3 py-1.5 text-sm bg-gray-800/70 border border-brand-gold/50 rounded-full text-brand-gold hover:bg-gray-800 hover:text-white transition-all duration-200"
    >
        {text}
    </button>
);


const ChatAssistant: React.FC<ChatAssistantProps> = ({ messages, onSendMessage, isBotTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isBotTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isBotTyping) {
            onSendMessage(input.trim());
            setInput('');
        }
    };
    
    const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
        const isUser = message.sender === 'user';
        return (
            <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md ${
                    isUser
                        ? 'bg-brand-gold text-black rounded-br-none'
                        : 'bg-gray-800 text-white rounded-bl-none shadow-black/20'
                }`}>
                    <div className="text-sm"><SimpleMarkdown text={message.text} /></div>
                </div>
            </div>
        );
    };

    const isInitialMessage = messages.length === 1 && messages[0].id === 'initial-message';

    return (
        <div className="flex flex-col h-full flex-grow min-h-0">
            <div className="flex-grow space-y-4 pr-2 -mr-2 overflow-y-auto">
                {messages.map((msg) => (
                    <div key={msg.id}>
                        <MessageBubble message={msg} />
                        {isInitialMessage && msg.sender === 'bot' && (
                             <div className="flex flex-wrap gap-2 mt-3 animate-fade-in-up">
                                <QuickActionButton text="Últimos resultados de Euromillones" onClick={() => onSendMessage('Dame los últimos resultados de Euromillones')} />
                                <QuickActionButton text="Generar números para La Primitiva" onClick={() => onSendMessage('Quiero generar números para La Primitiva')} />
                            </div>
                        )}
                    </div>
                ))}
                {isBotTyping && (
                    <div className="flex justify-start animate-fade-in-up">
                        <div className="px-4 py-3 rounded-2xl bg-gray-800 rounded-bl-none shadow-md">
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 bg-brand-gold rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-brand-gold rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-brand-gold rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 pt-4 border-t border-brand-gold/50 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta aquí..."
                        className="flex-grow p-3 border border-brand-gold/50 rounded-full focus:ring-2 focus:ring-brand-gold focus:outline-none bg-black text-white"
                        disabled={isBotTyping}
                    />
                    <button
                        type="submit"
                        // Fix: Corrected typo from isBotyping to isBotTyping.
                        disabled={isBotTyping || !input.trim()}
                        className="bg-brand-gold text-black p-3 rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatAssistant;