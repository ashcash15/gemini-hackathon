
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, UserContext, LearningGraph } from '../types';
import { askGlobalTutor } from '../services/geminiService';
import { Send, Sparkles, X, MessageCircle } from 'lucide-react';

interface GlobalChatProps {
    userContext: UserContext;
    graphData: LearningGraph;
    isOpen: boolean;
    onClose: () => void;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ userContext, graphData, isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: `Hello! I'm your Course Guide. I can help you navigate the curriculum for **${userContext.learningGoal}**. What's on your mind?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        try {
            const responseText = await askGlobalTutor(input, { userContext, graphData, chatHistory: messages });
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 flex flex-col animate-fadeIn transition-colors">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center">
                <h3 className="text-neutral-900 dark:text-neutral-100 font-semibold flex items-center gap-2 text-sm">
                    <Sparkles size={16} className="text-purple-500" />
                    Course Guide
                </h3>
                <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
                            m.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-tr-none' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200 dark:border-neutral-700'
                        }`}>
                             <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {loading && <div className="text-xs text-neutral-400 pl-2">Thinking...</div>}
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about the course..."
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full pl-4 pr-10 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 hover:bg-purple-700 rounded-full text-white disabled:opacity-50 transition-colors"><Send size={14} /></button>
                </div>
            </div>
        </div>
    );
};

export default GlobalChat;
