
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LectureContent, ChatMessage, UserContext, CodeSnippet } from '../types';
import { askTutor } from '../services/geminiService';
import ConceptMap from './ConceptMap';
import { 
    X, CheckCircle, AlertCircle, Brain, BookOpen, ArrowRight, ArrowLeft, 
    Target, Trophy, HelpCircle, MessageCircle, Send, Loader2, Sparkles, Map, ChevronLeft,
    Terminal, Play, RotateCcw, Code
} from 'lucide-react';

interface LectureViewProps {
  content: LectureContent;
  userContext: UserContext;
  onComplete: () => void;
  onBackToMap: () => void;
}

// --- SUB-COMPONENTS ---

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
            const responseText = await askTutor(input, {
                lectureContext: lectureContent,
                userContext: userContext,
                chatHistory: messages
            });
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't reach the server." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
            <div className="p-4 border-b border-slate-800 bg-slate-900">
                <h3 className="text-brand-400 font-bold flex items-center gap-2">
                    <Sparkles size={18} />
                    AI Tutor
                </h3>
                <p className="text-xs text-slate-500 mt-1">Powered by Gemini 3 Pro</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                            m.role === 'user' 
                                ? 'bg-brand-600 text-white rounded-tr-none' 
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                        }`}>
                             <ReactMarkdown 
                                components={{
                                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-1 pl-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-1 pl-1" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-brand-300" {...props} />,
                                    code: ({node, ...props}) => <code className="bg-slate-900/50 px-1 rounded text-xs font-mono text-brand-200" {...props} />,
                                    a: ({node, ...props}) => <a className="underline decoration-white/30 hover:decoration-white" {...props} />
                                }}
                            >
                                {m.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 rounded-2xl p-3 rounded-tl-none border border-slate-700 flex items-center gap-2">
                             <Loader2 size={14} className="animate-spin text-brand-400" />
                             <span className="text-xs text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-full pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-brand-600 hover:bg-brand-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const StepAnalogy = ({ content, userBackground }: { content: LectureContent, userBackground: string }) => (
  <div className="flex flex-col items-center justify-center min-h-full p-8 md:p-12 animate-fadeIn w-full">
    {content.imageUrl && (
        <div className="mb-8 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent opacity-60"></div>
            <img src={content.imageUrl} alt={content.title} className="w-full h-auto object-cover max-h-[300px]" />
            <div className="absolute bottom-4 left-4 text-left">
                <div className="text-xs text-brand-300 font-mono uppercase tracking-widest mb-1">AI Generated Visual</div>
                <div className="text-sm text-slate-300 opacity-80">Visualizing {content.title}</div>
            </div>
        </div>
    )}
    
    <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
            <h3 className="text-brand-400 font-mono text-sm font-bold uppercase tracking-widest mb-4">Concept Bridge</h3>
            <p className="text-2xl md:text-3xl text-white font-light leading-relaxed italic">
            "{content.analogy}"
            </p>
        </div>

        {content.conceptMappings && content.conceptMappings.length > 0 && (
             <div className="mt-8 animate-slideUp">
                <div className="mb-4 flex items-center gap-2 justify-center">
                    <div className="h-px bg-slate-700 w-12"></div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Neural Concept Map</span>
                    <div className="h-px bg-slate-700 w-12"></div>
                </div>
                <ConceptMap 
                    mappings={content.conceptMappings} 
                    userBackground={userBackground} 
                    newTopic={content.title} 
                />
            </div>
        )}
    </div>
  </div>
);

const StepCode = ({ snippet }: { snippet: CodeSnippet }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);

    const handleRun = () => {
        setIsRunning(true);
        setOutput(null);
        setTimeout(() => {
            setIsRunning(false);
            setOutput(snippet.output);
        }, 1500); // Simulate processing time
    };

    const handleReset = () => {
        setOutput(null);
    };

    return (
        <div className="min-h-full flex flex-col p-8 md:p-12 animate-fadeIn max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                <div className="p-3 bg-pink-500/10 rounded-xl">
                    <Code className="text-pink-400" size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Interactive Code Lab</h2>
                    <p className="text-slate-400 mt-1">See it in action</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Code Editor Side */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
                    <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                        <span className="text-xs font-mono text-slate-400 uppercase">{snippet.language}</span>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                        </div>
                    </div>
                    <div className="p-4 font-mono text-sm text-blue-100 overflow-auto flex-1 leading-relaxed whitespace-pre selection:bg-brand-500/30">
                        {snippet.code}
                    </div>
                </div>

                {/* Output/Console Side */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <h4 className="font-bold text-white mb-2">How it works</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{snippet.description}</p>
                    </div>

                    <div className="flex-1 bg-black/80 border border-slate-800 rounded-xl overflow-hidden shadow-inner flex flex-col relative font-mono text-sm">
                        <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                            <Terminal size={14} className="text-slate-500" />
                            <span className="text-xs text-slate-500">Console</span>
                        </div>
                        
                        <div className="p-4 text-green-400 flex-1 overflow-auto">
                            {!output && !isRunning && (
                                <div className="text-slate-600 opacity-50 flex items-center gap-2">
                                    <ChevronLeft size={14} /> Waiting for execution...
                                </div>
                            )}
                            {isRunning && (
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <Loader2 size={16} className="animate-spin" />
                                    Compiling and running...
                                </div>
                            )}
                            {output && (
                                <div className="animate-fadeIn whitespace-pre-wrap">
                                    <span className="text-slate-500 select-none">$ </span>
                                    {output}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex justify-end">
                            {output ? (
                                <button 
                                    onClick={handleReset}
                                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs flex items-center gap-2 transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Reset
                                </button>
                            ) : (
                                <button 
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    <Play size={16} fill="currentColor" />
                                    Run Code
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StepSection = ({ section, imageUrl }: { section: { title: string, content: string }, imageUrl?: string }) => (
  <div className="min-h-full flex flex-col p-8 md:p-12 animate-fadeIn max-w-4xl mx-auto w-full">
    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
        <div className="p-3 bg-indigo-500/10 rounded-xl">
            <BookOpen className="text-indigo-400" size={28} />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{section.title}</h2>
    </div>
    <div className="prose prose-invert prose-lg max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-brand-400 prose-a:text-brand-400 prose-code:text-brand-200 prose-code:bg-brand-900/20 prose-code:px-1 prose-code:rounded">
      <ReactMarkdown>{section.content}</ReactMarkdown>
    </div>
  </div>
);

const StepScenario = ({ scenario }: { scenario: LectureContent['practiceScenario'] }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  return (
    <div className="min-h-full flex flex-col p-8 md:p-12 animate-fadeIn max-w-4xl mx-auto w-full">
       <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-amber-500/10 rounded-xl">
              <Target className="text-amber-400" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Interactive Scenario</h2>
            <p className="text-slate-400">Apply what you've learned in a familiar context</p>
          </div>
      </div>
      
      <div className="mb-10 p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4">{scenario.title}</h3>
        <p className="text-slate-300 leading-relaxed text-lg">{scenario.description}</p>
      </div>

      <div className="grid gap-4">
        {scenario.options.map((opt, idx) => (
            <div key={idx} className="relative group">
                 <button
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-300 ${
                        selectedOption === idx 
                        ? (opt.isCorrect 
                            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                            : 'bg-red-950/30 border-red-500/50')
                        : 'bg-slate-800/50 border-slate-700 hover:border-brand-500/50 hover:bg-slate-800'
                    }`}
                 >
                    <div className="flex justify-between items-start gap-4">
                        <span className={`font-medium text-lg ${selectedOption === idx ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{opt.label}</span>
                        {selectedOption === idx && (
                            opt.isCorrect 
                            ? <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={24} />
                            : <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                        )}
                    </div>
                    
                    {selectedOption === idx && (
                        <div className={`mt-4 text-base pt-4 border-t ${opt.isCorrect ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'} animate-fadeIn`}>
                            {opt.feedback}
                        </div>
                    )}
                 </button>
            </div>
        ))}
      </div>
    </div>
  );
};

const StepQuiz = ({ quiz, onCompleteModule }: { quiz: LectureContent['quiz'], onCompleteModule: () => void }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.length).fill(-1));
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (optionIdx: number) => {
    if (answers[currentQ] !== -1) return; 
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQ < quiz.length - 1) {
        setCurrentQ(prev => prev + 1);
        setShowExplanation(false);
    } else {
        // Completion logic
        const score = answers.reduce((acc, ans, idx) => acc + (ans === quiz[idx].correctIndex ? 1 : 0), 0);
        if (score === quiz.length) {
            onCompleteModule();
        } else {
           // Retry logic: clear answers
           setAnswers(new Array(quiz.length).fill(-1));
           setCurrentQ(0);
           setShowExplanation(false);
        }
    }
  };

  const isCorrect = answers[currentQ] === quiz[currentQ].correctIndex;
  const isAnswered = answers[currentQ] !== -1;
  const isFinished = isAnswered && currentQ === quiz.length - 1;

  return (
    <div className="min-h-full flex flex-col p-8 md:p-12 animate-fadeIn max-w-3xl mx-auto w-full justify-center">
         <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <Trophy className="text-emerald-400" size={28} />
                </div>
                <h2 className="text-3xl font-bold text-white">Final Check</h2>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-sm">
                {currentQ + 1} / {quiz.length}
            </span>
         </div>

         <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 mb-8 shadow-lg">
             <p className="text-xl text-white font-medium leading-relaxed">{quiz[currentQ].question}</p>
         </div>

         <div className="space-y-4 mb-8">
            {quiz[currentQ].options.map((opt, idx) => {
                let stateClass = "border-slate-700 hover:bg-slate-750 hover:border-slate-500";
                if (isAnswered) {
                    if (idx === quiz[currentQ].correctIndex) stateClass = "border-emerald-500 bg-emerald-950/30 text-emerald-200";
                    else if (idx === answers[currentQ]) stateClass = "border-red-500 bg-red-950/30 text-red-200";
                    else stateClass = "border-slate-800 opacity-40";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isAnswered}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all text-lg ${stateClass} text-slate-300`}
                    >
                        <div className="flex justify-between items-center">
                            <span>{opt}</span>
                            {isAnswered && idx === quiz[currentQ].correctIndex && <CheckCircle size={24} className="text-emerald-500" />}
                            {isAnswered && idx === answers[currentQ] && idx !== quiz[currentQ].correctIndex && <AlertCircle size={24} className="text-red-500" />}
                        </div>
                    </button>
                )
            })}
         </div>

         {showExplanation && (
             <div className={`p-6 rounded-xl mb-8 ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                 <p className={`text-base ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                    <span className="font-bold block mb-1">{isCorrect ? 'Correct!' : 'Not quite.'}</span> 
                    {quiz[currentQ].explanation}
                 </p>
             </div>
         )}

         <div className="flex justify-end pt-4">
             {isAnswered && (
                 <button 
                    onClick={isFinished && isCorrect ? onCompleteModule : nextQuestion}
                    className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg transition-all hover:-translate-y-1 ${isCorrect ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                 >
                    {isFinished && isCorrect ? (
                        <>
                            <span>Complete Module</span>
                            <CheckCircle size={24} />
                        </>
                    ) : isCorrect ? (
                        <>
                            <span>Next Question</span>
                            <ArrowRight size={24} />
                        </>
                    ) : (
                         <>
                            <span>Try Again</span>
                            <HelpCircle size={24} />
                        </>
                    )}
                 </button>
             )}
         </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const LectureView: React.FC<LectureViewProps> = ({ content, userContext, onComplete, onBackToMap }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showChat, setShowChat] = useState(false);

  const steps = useMemo(() => {
    const list = [
        { type: 'analogy' },
        ...content.sections.map((s, i) => ({ type: 'section', data: s, index: i })),
    ];

    if (content.codeSnippet) {
        list.push({ type: 'code' });
    }

    list.push(
        { type: 'scenario' },
        { type: 'quiz' }
    );
    return list;
  }, [content]);

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(c => c + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  return (
    <div className="flex h-full w-full bg-dark-bg animate-fadeIn overflow-hidden">
      {/* Content Area */}
      <div className={`flex flex-col h-full transition-all duration-300 ease-in-out flex-1 min-w-0`}>
        
        {/* Header */}
        <div className="h-16 border-b border-dark-border bg-dark-surface/80 backdrop-blur flex justify-between items-center px-4 md:px-6 z-20 shrink-0">
          <div className="flex items-center gap-4 overflow-hidden flex-1">
             <button
                onClick={onBackToMap}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-slate-800"
             >
                <ChevronLeft size={16} />
                <Map size={16} />
                <span className="hidden sm:inline">Map</span>
             </button>
             <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
             <div className="flex flex-col overflow-hidden min-w-0">
                 <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider truncate">{content.title}</h2>
                 <p className="text-xs text-slate-500 truncate hidden sm:block">Intelligent Module</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
             <button 
                onClick={() => setShowChat(!showChat)}
                className={`p-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border ${
                    showChat 
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/50' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
             >
                <MessageCircle size={18} />
                <span className="hidden md:inline">{showChat ? 'Hide Tutor' : 'Ask AI Tutor'}</span>
             </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full shrink-0">
            <div className="h-full bg-brand-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: `${progress}%` }} />
        </div>

        {/* Main Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-dark-bg to-[#0f1218] relative custom-scrollbar">
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                {steps[currentStep].type === 'analogy' && <StepAnalogy content={content} userBackground={userContext.existingKnowledge} />}
                {steps[currentStep].type === 'code' && content.codeSnippet && <StepCode snippet={content.codeSnippet} />}
                {steps[currentStep].type === 'section' && <StepSection section={(steps[currentStep] as any).data} imageUrl={content.imageUrl} />}
                {steps[currentStep].type === 'scenario' && <StepScenario scenario={content.practiceScenario} />}
                {steps[currentStep].type === 'quiz' && <StepQuiz quiz={content.quiz} onCompleteModule={onComplete} />}
            </div>
        </div>

        {/* Footer Navigation */}
        {steps[currentStep].type !== 'quiz' && (
            <div className="p-6 border-t border-dark-border bg-dark-surface z-20 flex justify-between items-center shrink-0">
                <button 
                    onClick={handlePrev} 
                    disabled={currentStep === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentStep === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                {/* Step Indicators */}
                <div className="hidden md:flex gap-3">
                    {steps.map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-brand-500 scale-125' : i < currentStep ? 'bg-brand-900' : 'bg-slate-800'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-all hover:translate-x-1"
                >
                    Next
                    <ArrowRight size={20} />
                </button>
            </div>
        )}
      </div>

      {/* RIGHT: AI Tutor Panel (Drawer) */}
      <div className={`border-l border-slate-800 bg-slate-900 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${showChat ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
           <ChatInterface userContext={userContext} lectureContent={content} />
      </div>
      
    </div>
  );
};

export default LectureView;
