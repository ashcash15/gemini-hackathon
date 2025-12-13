
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LectureContent, ChatMessage, UserContext, CodeSnippet } from '../types';
import { askTutor, generatePodcastScript } from '../services/geminiService';
import ConceptMap from './ConceptMap';
import { 
    X, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, 
    MessageCircle, Send, Loader2, Sparkles, Map, ChevronLeft,
    Play, RotateCcw, Headphones, StopCircle, FileText, Pencil, Save, RefreshCcw
} from 'lucide-react';

interface LectureViewProps {
  content: LectureContent;
  userContext: UserContext;
  onComplete: () => void;
  onBackToMap: () => void;
  onRefine: (instruction: string) => Promise<void>;
  onSaveSummary: (content: LectureContent) => Promise<void>;
  onFail?: () => Promise<void>;
}

const ChatInterface = ({ 
    userContext, 
    lectureContent 
}: { 
    userContext: UserContext, 
    lectureContent: LectureContent 
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: `Hi! I'm your AI tutor for **${lectureContent.title}**. Ask me anything about this module!` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        try {
            const responseText = await askTutor(input, { lectureContext: lectureContent, userContext: userContext, chatHistory: messages });
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                <h3 className="text-neutral-900 dark:text-neutral-200 font-semibold flex items-center gap-2 text-sm">
                    <Sparkles size={16} className="text-blue-500" />
                    AI Tutor
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                            m.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200 dark:border-neutral-700'
                        }`}>
                             <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {loading && <div className="text-xs text-neutral-400 pl-2">Tutor is typing...</div>}
            </div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full pl-4 pr-10 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-1.5 top-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white disabled:opacity-50 transition-colors"><Send size={14} /></button>
                </div>
            </div>
        </div>
    );
};

const PodcastPlayer = ({ content, userContext }: { content: LectureContent, userContext: UserContext }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [script, setScript] = useState<string | null>(null);

    const handlePlay = async () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }
        setIsLoading(true);
        try {
            let textToRead = script;
            if (!textToRead) {
                textToRead = await generatePodcastScript(content, userContext);
                setScript(textToRead);
            }
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.rate = 1.0;
            utterance.onend = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    return (
        <button onClick={handlePlay} disabled={isLoading} className={`p-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors border ${isPlaying ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : isPlaying ? <StopCircle size={16} /> : <Headphones size={16} />}
            <span className="hidden md:inline">{isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}</span>
        </button>
    );
};

const StepAnalogy = ({ content }: { content: LectureContent }) => (
  <div className="max-w-3xl mx-auto py-12 px-6 animate-fadeIn">
    {content.imageUrl && (
        <div className="mb-10 w-full rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-800">
            <img src={content.imageUrl} alt={content.title} className="w-full h-auto object-cover max-h-[300px]" />
        </div>
    )}
    <div className="text-center">
        <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4">Core Concept</h3>
        <p className="text-2xl md:text-3xl text-neutral-800 dark:text-neutral-100 font-serif leading-relaxed">"{content.analogy}"</p>
    </div>
  </div>
);

const StepCode = ({ snippet }: { snippet: CodeSnippet }) => {
    const [output, setOutput] = useState<string | null>(null);
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 animate-fadeIn">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">Interactive Code</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-neutral-900 rounded-xl overflow-hidden text-sm font-mono text-neutral-200 p-4 border border-neutral-800">
                    <pre className="whitespace-pre-wrap">{snippet.code}</pre>
                </div>
                <div className="flex flex-col gap-4">
                     <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm">
                        <p className="text-neutral-600 dark:text-neutral-300 text-sm">{snippet.description}</p>
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 font-mono text-sm h-40 text-neutral-800 dark:text-neutral-200">
                         {output ? output : <span className="text-neutral-400 dark:text-neutral-600">Run code to see output...</span>}
                    </div>
                    <button onClick={() => setOutput(snippet.output)} className="self-end px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"><Play size={14} /> Run Code</button>
                </div>
            </div>
        </div>
    );
};

const StepSection = ({ section }: { section: { title: string, content: string } }) => (
  <div className="max-w-2xl mx-auto py-12 px-6 animate-fadeIn">
    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8 tracking-tight">{section.title}</h2>
    <div className="prose prose-neutral dark:prose-invert prose-lg">
      <ReactMarkdown>{section.content}</ReactMarkdown>
    </div>
  </div>
);

const StepQuiz = ({ quiz, onCompleteModule, onFail }: { quiz: LectureContent['quiz'], onCompleteModule: () => void, onFail?: () => void }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [mistakes, setMistakes] = useState(0);

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setIsCorrect(null);
    setMistakes(0);
  }, [currentQ]);

  const handleCheck = (idx: number) => {
      setSelected(idx);
      const correct = idx === quiz[currentQ].correctIndex;
      setIsCorrect(correct);
      
      if (!correct) {
          setMistakes(prev => prev + 1);
      }
  };

  const showFailOption = mistakes >= 2 && onFail;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 flex flex-col items-center animate-fadeIn">
         <div className="mb-8 text-center">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Question {currentQ + 1} of {quiz.length}</span>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mt-2">{quiz[currentQ].question}</h2>
         </div>
         <div className="w-full space-y-3 mb-8">
            {quiz[currentQ].options.map((opt, idx) => (
                <button key={idx} onClick={() => handleCheck(idx)} disabled={selected !== null && isCorrect === true}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selected === idx 
                            ? (isCorrect ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300')
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300'
                    }`}>
                    <div className="flex justify-between items-center">
                        <span>{opt}</span>
                        {selected === idx && (isCorrect ? <CheckCircle size={20}/> : <AlertCircle size={20}/>)}
                    </div>
                </button>
            ))}
         </div>
         
         {showFailOption && (
             <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-center">
                 <p className="text-sm text-orange-800 dark:text-orange-200 mb-3 font-medium">Struggling with this concept?</p>
                 <button 
                    onClick={() => onFail && onFail()}
                    className="px-4 py-2 bg-white dark:bg-neutral-800 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/40 transition-colors flex items-center justify-center gap-2 mx-auto"
                 >
                    <RefreshCcw size={14} /> Simplify & Restart Module
                 </button>
             </div>
         )}

         {selected !== null && isCorrect && (
             <button onClick={() => { if(currentQ < quiz.length - 1) { setCurrentQ(c=>c+1); } else { onCompleteModule(); } }} className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors">
                 {currentQ < quiz.length - 1 ? 'Next Question' : 'Complete Module'}
             </button>
         )}
         
         {selected !== null && !isCorrect && !showFailOption && (
             <div className="text-neutral-500 dark:text-neutral-400 text-sm">Try again!</div>
         )}
    </div>
  );
};

const EditModuleModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (instruction: string) => void }) => {
    const [instruction, setInstruction] = useState("");
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Refine Module Content</h3>
                    <button onClick={onClose}><X size={20} className="text-neutral-400 hover:text-neutral-600" /></button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                        Want to change how this module is taught? Add your instructions below (e.g., "Make it simpler", "Add more examples", "Focus on technical details").
                    </p>
                    <textarea 
                        value={instruction} 
                        onChange={e => setInstruction(e.target.value)}
                        className="w-full h-32 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="Enter your instructions here..."
                    />
                </div>
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">Cancel</button>
                    <button onClick={() => onSubmit(instruction)} disabled={!instruction.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Regenerate</button>
                </div>
            </div>
        </div>
    );
};

const LectureView: React.FC<LectureViewProps> = ({ content, userContext, onComplete, onBackToMap, onRefine, onSaveSummary, onFail }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Reset steps if content changes (e.g. restart)
  useEffect(() => {
      setCurrentStep(0);
  }, [content.moduleId, content.sections.length]);

  const steps = useMemo(() => {
    const list = [{ type: 'analogy' }];
    if (content.conceptMappings && content.conceptMappings.length > 0) {
        list.push({ type: 'map' });
    }
    list.push(...content.sections.map((s, i) => ({ type: 'section', data: s })));
    if (content.codeSnippet) list.push({ type: 'code' });
    list.push({ type: 'quiz' });
    return list;
  }, [content]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleSummarize = async () => {
      setIsSummarizing(true);
      await onSaveSummary(content);
      setIsSummarizing(false);
  };

  const handleRefineSubmit = async (instruction: string) => {
      setShowEdit(false);
      await onRefine(instruction);
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-neutral-900 animate-fadeIn overflow-hidden transition-colors relative">
      {showEdit && <EditModuleModal onClose={() => setShowEdit(false)} onSubmit={handleRefineSubmit} />}
      
      <div className="flex flex-col h-full flex-1 min-w-0">
        <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center px-6 bg-white dark:bg-neutral-900 shrink-0">
             <button onClick={onBackToMap} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 text-sm font-medium"><ChevronLeft size={16}/> Back</button>
             <div className="flex items-center gap-2">
                 <div className="hidden md:flex flex-col items-end mr-2">
                     <span className="text-xs font-bold text-neutral-900 dark:text-white max-w-[150px] truncate">{content.title}</span>
                     <span className="text-[10px] text-neutral-500">Module Context</span>
                 </div>
                 
                 <button 
                    onClick={() => setShowEdit(true)}
                    className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Edit / Refine Module"
                 >
                    <Pencil size={18} />
                 </button>

                 <button 
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Summarize to Notebook"
                 >
                    {isSummarizing ? <Loader2 size={18} className="animate-spin text-blue-500"/> : <FileText size={18} />}
                 </button>

                 <PodcastPlayer content={content} userContext={userContext} />
                 
                 <button onClick={() => setShowChat(!showChat)} className={`p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${showChat ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : ''}`}><MessageCircle size={18}/></button>
             </div>
        </div>
        <div className="h-0.5 bg-neutral-100 dark:bg-neutral-800 w-full shrink-0"><div className="h-full bg-neutral-900 dark:bg-white transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        
        <div className="flex-1 overflow-y-auto bg-neutral-50/30 dark:bg-neutral-950/30 custom-scrollbar relative">
             {steps[currentStep].type === 'analogy' && <StepAnalogy content={content} />}
             
             {steps[currentStep].type === 'map' && (
                 <div className="max-w-4xl mx-auto py-12 px-6">
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6 text-center">Mental Model Mapping</h2>
                    <ConceptMap mappings={content.conceptMappings} userBackground={userContext.existingKnowledge} newTopic={content.title} />
                 </div>
             )}

             {steps[currentStep].type === 'code' && content.codeSnippet && <StepCode snippet={content.codeSnippet} />}
             {steps[currentStep].type === 'section' && <StepSection section={(steps[currentStep] as any).data} />}
             {steps[currentStep].type === 'quiz' && <StepQuiz quiz={content.quiz} onCompleteModule={onComplete} onFail={onFail} />}
        </div>

        {/* Footer with Page Numbers */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex justify-between items-center shrink-0">
            {steps[currentStep].type !== 'quiz' ? (
                <>
                    <button onClick={() => setCurrentStep(c => Math.max(0, c - 1))} disabled={currentStep === 0} className="px-4 py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 font-medium text-sm flex items-center gap-2"><ArrowLeft size={16}/> Previous</button>
                    
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                        Page {currentStep + 1} of {steps.length}
                    </span>
                    
                    <button onClick={() => setCurrentStep(c => Math.min(steps.length - 1, c + 1))} className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2">Next <ArrowRight size={16}/></button>
                </>
            ) : (
                <div className="w-full text-center text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    Final Assessment
                </div>
            )}
        </div>
      </div>
      <div className={`border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${showChat ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
           <ChatInterface userContext={userContext} lectureContent={content} />
      </div>
    </div>
  );
};

export default LectureView;
