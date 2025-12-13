
import React, { useState, useMemo } from 'react';
import { UserContext, GlossaryTerm } from '../types';
import { defineTerm } from '../services/geminiService';
import { Search, Book, Loader2, X } from 'lucide-react';
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

  const filteredTerms = useMemo(() => {
    if (!searchTerm) return glossary.sort((a, b) => a.term.localeCompare(b.term));
    return glossary.filter(g => g.term.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term));
  }, [glossary, searchTerm]);

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true); setActiveDefinition(null); setActiveTerm(searchTerm);
    try { const result = await defineTerm(searchTerm, userContext); setActiveDefinition(result); } catch (e) { } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
         <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 text-sm mb-2"><Book size={16} /> Reference</h3>
         <div className="relative">
             <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()} placeholder="Search terms..." className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:border-blue-400 dark:text-white transition-colors placeholder-neutral-400" />
             <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
             {searchTerm && <button onClick={() => {setSearchTerm(''); setActiveDefinition(null);}} className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"><X size={14} /></button>}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
             <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
        ) : activeDefinition ? (
             <div>
                <button onClick={() => { setActiveDefinition(null); setActiveTerm(null); }} className="text-xs text-blue-600 dark:text-blue-400 mb-2 hover:underline">Clear Result</button>
                <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <h4 className="font-bold text-neutral-900 dark:text-white mb-2 capitalize">{activeTerm}</h4>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300 prose prose-sm dark:prose-invert"><ReactMarkdown>{activeDefinition}</ReactMarkdown></div>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                {filteredTerms.length > 0 ? (
                    filteredTerms.map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
                            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm mb-1">{item.term}</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.definition}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <button onClick={handleAiSearch} className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800">Ask AI: "{searchTerm}"</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
