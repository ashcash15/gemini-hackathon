
import React, { useState, useMemo } from 'react';
import { UserContext, GlossaryTerm } from '../types';
import { defineTerm } from '../services/geminiService';
import { Search, Book, Loader2, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DictionaryProps {
  userContext: UserContext;
  glossary?: GlossaryTerm[];
}

const Dictionary: React.FC<DictionaryProps> = ({ userContext, glossary = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDefinition, setActiveDefinition] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter existing glossary terms
  const filteredTerms = useMemo(() => {
    if (!searchTerm) return glossary.sort((a, b) => a.term.localeCompare(b.term));
    return glossary
      .filter(g => g.term.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [glossary, searchTerm]);

  // Handle external AI search if term not found in glossary
  const handleAiSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setActiveDefinition(null);
    setActiveTerm(searchTerm);
    setError(null);

    try {
      const result = await defineTerm(searchTerm, userContext);
      setActiveDefinition(result);
    } catch (e) {
      setError("Could not find definition.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
      setSearchTerm('');
      setActiveDefinition(null);
      setActiveTerm(null);
      setError(null);
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
         <h3 className="font-bold text-slate-300 flex items-center gap-2 mb-3">
            <Book size={18} />
            Quick Reference
        </h3>
        <div className="relative flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    placeholder="Filter terms..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                {searchTerm && (
                    <button 
                        onClick={clearSearch} 
                        className="absolute right-2 top-2 text-slate-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* State 1: Showing AI Search Result */}
        {loading ? (
             <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                <Loader2 size={24} className="animate-spin text-brand-500" />
                <span className="text-xs">Consulting knowledge base...</span>
            </div>
        ) : activeDefinition ? (
             <div className="animate-fadeIn">
                <button onClick={() => { setActiveDefinition(null); setActiveTerm(null); }} className="text-xs text-brand-400 mb-2 hover:underline flex items-center gap-1">
                    <X size={12} /> Clear AI Result
                </button>
                <div className="bg-slate-800/80 rounded-xl p-4 border border-brand-500/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Sparkles size={40} />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2 capitalize">{activeTerm}</h4>
                    <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm">
                         <ReactMarkdown>{activeDefinition}</ReactMarkdown>
                    </div>
                </div>
            </div>
        ) : (
            // State 2: Showing Glossary List
            <div className="space-y-3">
                {filteredTerms.length > 0 ? (
                    filteredTerms.map((item, idx) => (
                        <div key={idx} className="bg-slate-800/40 hover:bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 transition-colors group">
                            <h4 className="text-base font-bold text-brand-300 mb-1 group-hover:text-brand-200">{item.term}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{item.definition}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <p className="text-slate-500 text-sm mb-4">No matching terms in quick reference.</p>
                        <button 
                            onClick={handleAiSearch}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-brand-400 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <Sparkles size={14} />
                            Ask AI to define "{searchTerm}"
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
