
import React, { useState, useEffect, useMemo } from 'react';
import { UserContext, LearningGraph, LearningNode, NodeStatus, LectureContent, Session, Note } from './types';
import { generateLearningPath, generateLectureContent, generateModuleImage, refineLearningPath, expandLearningGraph, generateCourseSummary } from './services/geminiService';
import ForceGraph from './components/ForceGraph';
import LectureView from './components/LectureModal';
import Notebook from './components/Notebook';
import Dictionary from './components/Dictionary';
import { Sparkles, ArrowRight, BrainCircuit, AlertTriangle, Loader2, Map, List, Lock, CheckCircle, PlayCircle, Edit2, RefreshCw, Book, Briefcase, GraduationCap, ChevronRight, X, FileText, Plus, LayoutGrid, Clock, Trash2, Highlighter } from 'lucide-react';

// --- Typewriter Component for Welcome Animation ---
const Typewriter = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text.charAt(index));
        setIndex(prev => prev + 1);
      }, 50); // Typing speed
      return () => clearTimeout(timer);
    } else {
      if (onComplete) setTimeout(onComplete, 800); // Pause before finishing
    }
  }, [index, text, onComplete]);

  return (
    <span className="font-mono text-brand-400">
      {displayText}
      <span className="animate-pulse ml-1 text-brand-500">_</span>
    </span>
  );
};

// --- Animated Background Component ---
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[120px] animate-float opacity-70"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow opacity-60"></div>
    <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
  </div>
);

// --- Toast Component ---
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div className="fixed bottom-8 right-8 z-50 animate-slideUp">
        <div className="bg-slate-800 border border-brand-500/50 text-white px-6 py-4 rounded-xl shadow-2xl shadow-brand-500/10 flex items-center gap-4 max-w-md">
            <div className="p-2 bg-brand-500/20 rounded-full">
                <Sparkles size={20} className="text-brand-400" />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-brand-300 mb-1">Update</h4>
                <p className="text-sm text-slate-300">{message}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  // Global App State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Ephemeral State for Onboarding/Creation
  const [globalStep, setGlobalStep] = useState<'welcome' | 'onboarding' | 'session_active'>('welcome');
  const [tempContext, setTempContext] = useState<UserContext>({ existingKnowledge: '', learningGoal: '' });
  
  // UI State
  const [viewMode, setViewMode] = useState<'graph' | 'module'>('graph');
  const [sidebarTab, setSidebarTab] = useState<'graph' | 'modules' | 'notebook' | 'dictionary'>('graph');
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  
  // Processing State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  
  // Active Module State (Ephemeral)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lectureContent, setLectureContent] = useState<LectureContent | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  
  // Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const savedSessions = localStorage.getItem('cognimap-sessions');
    if (savedSessions) {
        try {
            const parsed = JSON.parse(savedSessions);
            setSessions(parsed);
            if (parsed.length > 0) {
                 setGlobalStep('onboarding');
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }

    const savedNotes = localStorage.getItem('cognimap-notes');
    if (savedNotes) {
        try {
            const parsed = JSON.parse(savedNotes);
            setNotes(parsed);
            if (parsed.length > 0) setActiveNoteId(parsed[0].id);
        } catch (e) { console.error("Failed to load notes", e); }
    } else {
        const initialNote: Note = {
            id: 'welcome',
            title: 'Welcome to your Notebook',
            content: 'This is where you can jot down thoughts, ideas, and key learnings.\n\n- [ ] It supports basic text\n- [ ] It saves automatically',
            updatedAt: Date.now()
        };
        setNotes([initialNote]);
        setActiveNoteId('welcome');
    }
  }, []);

  // Save changes
  useEffect(() => {
      localStorage.setItem('cognimap-sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
      localStorage.setItem('cognimap-notes', JSON.stringify(notes));
  }, [notes]);

  // Derived Active Session
  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId), 
  [sessions, activeSessionId]);

  // Derived Graph Data Helpers
  const completedNodeIdsSet = useMemo(() => 
    new Set(activeSession?.completedNodeIds || []), 
  [activeSession]);

  const progress = activeSession && activeSession.graphData 
    ? Math.round((activeSession.completedNodeIds.length / activeSession.graphData.nodes.length) * 100) 
    : 0;

  // --- Note Management ---
  const handleAddNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, key: keyof Note, value: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        return { ...n, [key]: value, updatedAt: Date.now() };
      }
      return n;
    }));
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    if (activeNoteId === id) {
      setActiveNoteId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  // --- Session Management ---

  const handleStartJourney = async () => {
    if (!tempContext.existingKnowledge || !tempContext.learningGoal) return;
    
    setLoading(true);
    setError(null);
    try {
      const graph = await generateLearningPath(tempContext);
      
      const newSession: Session = {
          id: Date.now().toString(),
          lastAccessed: Date.now(),
          context: { ...tempContext },
          graphData: graph,
          completedNodeIds: [],
          step: 'review'
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setGlobalStep('session_active');
    } catch (err) {
      setError("Failed to generate your learning path. Please try slightly different inputs.");
    } finally {
      setLoading(false);
    }
  };

  const updateActiveSession = (updater: (s: Session) => Session) => {
      if (!activeSessionId) return;
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...updater(s), lastAccessed: Date.now() } : s));
  };

  const handleSwitchSession = (id: string) => {
      setActiveSessionId(id);
      setGlobalStep('session_active');
      setViewMode('graph');
      setShowSessionMenu(false);
  };

  const handleNewSession = () => {
      setActiveSessionId(null);
      setGlobalStep('onboarding');
      setTempContext({ existingKnowledge: '', learningGoal: '' });
      setShowSessionMenu(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
          setActiveSessionId(null);
          setGlobalStep('onboarding');
      }
  };

  // --- Logic for Review/Refinement ---

  const handleRefinePlan = async () => {
    if (!activeSession?.graphData || !reviewFeedback.trim()) return;
    setIsRefining(true);
    try {
        const newGraph = await refineLearningPath(activeSession.graphData, activeSession.context, reviewFeedback);
        updateActiveSession(s => ({ ...s, graphData: newGraph }));
        setReviewFeedback("");
    } catch (err) {
        setError("Failed to refine the plan. Please try again.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleApprovePlan = () => {
      if (!activeSession?.graphData) return;
      
      const initializedNodes = activeSession.graphData.nodes.map(node => ({
        ...node,
        status: node.dependencies.length === 0 ? NodeStatus.AVAILABLE : NodeStatus.LOCKED
      }));
      
      updateActiveSession(s => ({
          ...s,
          step: 'main',
          graphData: { ...s.graphData!, nodes: initializedNodes }
      }));
  };

  // --- Logic for Modules ---

  const handleSummarizeCourse = async () => {
      if (!activeSession?.graphData) return;
      setToastMessage("Generating detailed course summary...");
      try {
          const summary = await generateCourseSummary(activeSession.graphData, activeSession.context);
          const newNote: Note = {
              id: Date.now().toString(),
              title: `Summary: ${activeSession.context.learningGoal}`,
              content: summary,
              updatedAt: Date.now()
          };
          setNotes([newNote, ...notes]);
          setActiveNoteId(newNote.id);
          setSidebarTab('notebook');
          setToastMessage("Summary added to Notebook");
          setTimeout(() => setToastMessage(null), 3000);
      } catch (e) {
          setToastMessage("Failed to generate summary");
      }
  };

  const handleNodeClick = async (node: LearningNode) => {
    if (node.status === NodeStatus.LOCKED) return;
    
    setSelectedNodeId(node.id);
    setViewMode('module'); 
    setLoadingContent(true);
    setLectureContent(null);

    try {
      const completedNodes = activeSession?.graphData?.nodes.filter(n => completedNodeIdsSet.has(n.id)) || [];
      
      const contentPromise = generateLectureContent(node, activeSession!.context, completedNodes);
      const imagePromise = generateModuleImage(node.title, node.description);

      const [content, imageUrl] = await Promise.all([contentPromise, imagePromise]);
      
      setLectureContent({
          ...content,
          imageUrl: imageUrl || undefined
      });
    } catch (err) {
      console.error(err);
      setViewMode('graph'); 
    } finally {
      setLoadingContent(false);
    }
  };

  const handleModuleComplete = async () => {
    if (!selectedNodeId || !activeSession?.graphData) return;
    
    // Optimistic Update
    const newCompletedList = [...activeSession.completedNodeIds, selectedNodeId];
    const newCompletedSet = new Set(newCompletedList);

    let updatedNodes = activeSession.graphData.nodes.map(node => {
        if (newCompletedSet.has(node.id)) return { ...node, status: NodeStatus.COMPLETED };
        const allDepsMet = node.dependencies.every(depId => newCompletedSet.has(depId));
        if (allDepsMet && !newCompletedSet.has(node.id)) return { ...node, status: NodeStatus.AVAILABLE };
        return { ...node }; 
    });

    // Save progress immediately
    updateActiveSession(s => ({
        ...s,
        completedNodeIds: newCompletedList,
        graphData: { ...s.graphData!, nodes: updatedNodes }
    }));

    // Check expansion
    const hasOutgoing = activeSession.graphData.links.some(link => 
        (typeof link.source === 'object' ? link.source.id : link.source) === selectedNodeId
    );
    
    if (!hasOutgoing) {
        const completedNode = activeSession.graphData.nodes.find(n => n.id === selectedNodeId);
        if (completedNode) {
            setToastMessage("Analyzing progress and generating advanced topics...");
            try {
                const existingTitles = activeSession.graphData.nodes.map(n => n.title);
                const newTopics = await expandLearningGraph(completedNode, activeSession.context, existingTitles);
                
                if (newTopics.length > 0) {
                    const newNodesData = newTopics.map((topic, i) => {
                        const newId = `${selectedNodeId}-adv-${Date.now()}-${i}`;
                        return {
                            id: newId,
                            title: topic.title,
                            description: topic.description,
                            dependencies: [selectedNodeId],
                            status: NodeStatus.AVAILABLE 
                        };
                    });

                    const newLinks = newNodesData.map(n => ({ source: selectedNodeId, target: n.id }));
                    
                    // Second Update for Expansion
                    updateActiveSession(s => ({
                        ...s,
                        graphData: {
                            ...s.graphData!,
                            nodes: [...updatedNodes, ...newNodesData],
                            links: [...s.graphData!.links, ...newLinks]
                        }
                    }));
                    
                    setToastMessage(`Unlocked ${newTopics.length} new advanced modules!`);
                    setTimeout(() => setToastMessage(null), 5000);
                } else {
                     setToastMessage(null);
                }
            } catch (e) {
                console.error("Expansion failed", e);
                setToastMessage(null);
            }
        }
    }
  };

  // --- Rendering ---

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-sans selection:bg-brand-500/30 overflow-hidden flex flex-col">
      <AnimatedBackground />

      {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* --- WELCOME --- */}
      {globalStep === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
          <div className="text-3xl md:text-5xl font-bold mb-6 text-center">
            <Typewriter 
              text="Welcome to CogniMap AI" 
              onComplete={() => setGlobalStep('onboarding')} 
            />
          </div>
          <p className="text-slate-500 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            Initializing adaptive learning engine...
          </p>
        </div>
      )}

      {/* --- ONBOARDING / DASHBOARD --- */}
      {globalStep === 'onboarding' && (
        <div className="container mx-auto px-4 h-screen flex flex-col justify-center items-center relative z-10 animate-fadeIn">
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-start h-[80vh]">
            
            {/* New Session Creator */}
            <div className="flex-1 w-full bg-dark-surface/50 backdrop-blur-xl border border-dark-border/50 p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col justify-center h-full">
                <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-4 bg-brand-500/10 rounded-2xl mb-6 shadow-lg shadow-brand-500/10 animate-float">
                    <BrainCircuit className="w-12 h-12 text-brand-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                    Start New Journey
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Build a custom bridge from what you <span className="text-brand-300 font-medium">know</span> to what you <span className="text-indigo-300 font-medium">want to learn</span>.
                </p>
                </div>

                <div className="space-y-6">
                <div className="group">
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1 uppercase tracking-wider text-xs">Your Expertise</label>
                    <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="e.g. Financial Markets, React Development, Gardening..."
                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-brand-500 focus:bg-slate-900 focus:ring-1 focus:ring-brand-500/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 outline-none transition-all duration-300 text-lg"
                        value={tempContext.existingKnowledge}
                        onChange={(e) => setTempContext({ ...tempContext, existingKnowledge: e.target.value })}
                    />
                    </div>
                </div>

                <div className="group">
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1 uppercase tracking-wider text-xs">Target Goal</label>
                    <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="e.g. Neuroscience, Rust, Permaculture..."
                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-brand-500 focus:bg-slate-900 focus:ring-1 focus:ring-brand-500/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 outline-none transition-all duration-300 text-lg"
                        value={tempContext.learningGoal}
                        onChange={(e) => setTempContext({ ...tempContext, learningGoal: e.target.value })}
                    />
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 animate-slideUp">
                        <AlertTriangle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    onClick={handleStartJourney}
                    disabled={!tempContext.existingKnowledge || !tempContext.learningGoal || loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
                    loading 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-1'
                    }`}
                >
                    {loading ? <><Loader2 className="animate-spin" /><span>Generating Neural Path...</span></> : <><Sparkles className="animate-pulse" /><span>Generate Curriculum</span><ChevronRight /></>}
                </button>
                </div>
            </div>

            {/* Saved Sessions List */}
            {sessions.length > 0 && (
                <div className="w-full md:w-1/3 bg-slate-900/30 backdrop-blur border border-slate-800 p-6 rounded-3xl h-full flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <LayoutGrid size={20} className="text-brand-400" />
                        Resume Learning
                    </h2>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {sessions.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => handleSwitchSession(s.id)}
                                className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-500/30 rounded-xl cursor-pointer transition-all group relative"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-200 text-sm group-hover:text-brand-300 truncate pr-6">{s.context.learningGoal}</h3>
                                    <button 
                                        onClick={(e) => handleDeleteSession(e, s.id)}
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-2"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                    <Briefcase size={10} />
                                    via {s.context.existingKnowledge}
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(s.lastAccessed).toLocaleDateString()}
                                    </div>
                                    <div className="px-2 py-0.5 bg-slate-900 rounded-md border border-slate-700">
                                        {s.completedNodeIds.length} / {s.graphData?.nodes.length || '?'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* --- ACTIVE SESSION --- */}
      {globalStep === 'session_active' && activeSession && (
          <>
          {activeSession.step === 'review' && activeSession.graphData && (
            <div className="container mx-auto px-4 h-screen flex flex-col justify-center items-center animate-fadeIn z-10">
             <div className="max-w-5xl w-full h-[85vh] flex flex-col bg-dark-surface/80 backdrop-blur-md border border-dark-border rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-border flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Curriculum Review</h2>
                        <p className="text-slate-400 text-sm">Review your personalized learning path.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-brand-500/10 rounded-full border border-brand-500/20 text-brand-300 text-xs font-mono font-bold flex items-center gap-2">
                            <List size={14} />
                            {activeSession.graphData.nodes.length} Modules Generated
                        </div>
                        <button onClick={() => setGlobalStep('onboarding')} className="text-slate-500 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 custom-scrollbar">
                    {/* List of Modules */}
                    <div className="flex-1 space-y-3">
                        {activeSession.graphData.nodes.map((node, i) => (
                            <div key={node.id} className="p-5 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 transition-colors flex gap-5 group">
                                <div className="w-10 h-10 rounded-full bg-slate-700/50 group-hover:bg-brand-500/20 group-hover:text-brand-300 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0 transition-colors">
                                    {i + 1}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{node.title}</h4>
                                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{node.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Feedback / Action Panel */}
                    <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                        <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl">
                             <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <Edit2 size={16} className="text-brand-400" />
                                Refine Plan
                             </h3>
                             <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                                Not quite right? Tell the AI what to change (e.g., "Make it more advanced," "Skip the basics," "Focus on X").
                             </p>
                             <textarea 
                                value={reviewFeedback}
                                onChange={(e) => setReviewFeedback(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white mb-3 h-32 focus:border-brand-500 outline-none resize-none transition-colors"
                                placeholder="E.g. I already know the basics, start with advanced topics..."
                             />
                             <button 
                                onClick={handleRefinePlan}
                                disabled={isRefining || !reviewFeedback.trim()}
                                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Update Plan
                             </button>
                        </div>

                        <div className="mt-auto">
                            <button 
                                onClick={handleApprovePlan}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
                            >
                                Start Learning
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
             </div>
            </div>
          )}

          {activeSession.step === 'main' && activeSession.graphData && (
             <div className="flex h-screen overflow-hidden animate-fadeIn z-10">
            
            {/* SIDEBAR */}
            <aside className="w-[320px] md:w-[380px] bg-dark-surface/95 backdrop-blur border-r border-dark-border flex flex-col shrink-0 z-20">
                <div className="p-5 border-b border-dark-border flex justify-between items-center relative">
                    <button onClick={() => setShowSessionMenu(!showSessionMenu)} className="font-bold text-brand-400 text-xl flex items-center gap-2 tracking-tight hover:opacity-80">
                        <BrainCircuit size={26} />
                        CogniMap
                        <ChevronRight size={16} className={`transition-transform ${showSessionMenu ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {/* Session Dropdown Menu */}
                    {showSessionMenu && (
                        <div className="absolute top-full left-0 w-full bg-slate-800 border-b border-slate-700 shadow-2xl z-50 p-2 flex flex-col gap-1 animate-slideUp">
                            <button 
                                onClick={handleNewSession}
                                className="flex items-center gap-2 p-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-colors"
                            >
                                <Plus size={16} />
                                Start New Journey
                            </button>
                            <div className="h-px bg-slate-700 my-1"></div>
                            <span className="text-[10px] uppercase text-slate-500 font-bold px-2 py-1">Saved Journeys</span>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {sessions.map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => handleSwitchSession(s.id)}
                                        className={`w-full text-left p-2 rounded-lg text-sm flex justify-between items-center ${activeSessionId === s.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                    >
                                        <span className="truncate">{s.context.learningGoal}</span>
                                        {activeSessionId === s.id && <div className="w-2 h-2 bg-brand-500 rounded-full"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Navigation Tabs */}
                <div className="flex p-2 gap-1 border-b border-dark-border bg-slate-900/50">
                    <button 
                        onClick={() => { setSidebarTab('graph'); setViewMode('graph'); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${sidebarTab === 'graph' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <Map size={18} />
                        Map
                    </button>
                    <button 
                        onClick={() => setSidebarTab('modules')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${sidebarTab === 'modules' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <List size={18} />
                        Modules
                    </button>
                    <button 
                        onClick={() => setSidebarTab('notebook')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${sidebarTab === 'notebook' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <FileText size={18} />
                        Notes
                    </button>
                    <button 
                        onClick={() => setSidebarTab('dictionary')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${sidebarTab === 'dictionary' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <Book size={18} />
                        Dict
                    </button>
                </div>

                {/* Sidebar Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {sidebarTab === 'graph' && (
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3">
                            <div className="p-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Learning Path Stats</h3>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/50 mb-6 shadow-lg">
                                    <div className="text-4xl font-bold text-white mb-1">{progress}%</div>
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Completion Rate</div>
                                    <div className="w-full h-2 bg-slate-700/50 rounded-full mt-4 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm text-slate-400 font-medium">
                                        <span>Total Modules</span>
                                        <span className="text-white bg-slate-800 px-2 py-0.5 rounded text-xs">{activeSession.graphData.nodes.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-400 font-medium">
                                        <span>Completed</span>
                                        <span className="text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded text-xs">{activeSession.completedNodeIds.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-400 font-medium">
                                        <span>Locked</span>
                                        <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded text-xs">{activeSession.graphData.nodes.filter(n => n.status === NodeStatus.LOCKED).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {sidebarTab === 'modules' && (
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3 space-y-1">
                             <div className="mb-4">
                                <button 
                                    onClick={handleSummarizeCourse}
                                    className="w-full py-3 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/30 hover:border-brand-500/50 text-brand-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Highlighter size={16} />
                                    Summarize Curriculum
                                </button>
                             </div>
                             {activeSession.graphData.nodes.map((node, i) => (
                                <button
                                    key={node.id}
                                    onClick={() => handleNodeClick(node)}
                                    disabled={node.status === NodeStatus.LOCKED}
                                    className={`w-full text-left p-4 rounded-xl flex items-start gap-3 transition-all ${
                                        node.id === selectedNodeId && viewMode === 'module'
                                            ? 'bg-brand-900/20 border border-brand-500/30 shadow-sm' 
                                            : node.status === NodeStatus.LOCKED
                                                ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                                                : 'hover:bg-slate-800 border border-transparent hover:border-slate-700'
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {node.status === NodeStatus.COMPLETED ? <CheckCircle size={18} className="text-emerald-500" /> :
                                         node.status === NodeStatus.LOCKED ? <Lock size={18} className="text-slate-600" /> :
                                         <PlayCircle size={18} className="text-brand-400" />}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold ${node.id === selectedNodeId ? 'text-brand-300' : 'text-slate-200'}`}>
                                            {i + 1}. {node.title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{node.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {sidebarTab === 'notebook' && (
                        <div className="absolute inset-0">
                            <Notebook 
                                notes={notes}
                                activeNoteId={activeNoteId}
                                onSelectNote={setActiveNoteId}
                                onAddNote={handleAddNote}
                                onUpdateNote={handleUpdateNote}
                                onDeleteNote={handleDeleteNote}
                            />
                        </div>
                    )}

                    {sidebarTab === 'dictionary' && (
                        <div className="absolute inset-0">
                            <Dictionary userContext={activeSession.context} glossary={activeSession.graphData.glossary} />
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-dark-border text-[10px] text-slate-600 uppercase tracking-widest text-center">
                    Powered by Gemini 2.5 Flash
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 bg-dark-bg/90 relative overflow-hidden flex flex-col">
                {viewMode === 'graph' && (
                    <div className="flex-1 relative">
                        <ForceGraph data={activeSession.graphData} onNodeClick={handleNodeClick} />
                    </div>
                )}

                {viewMode === 'module' && (
                    loadingContent ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="w-20 h-20 relative mb-8">
                                <div className="absolute inset-0 bg-brand-500 rounded-full animate-ping opacity-20"></div>
                                <div className="relative z-10 bg-dark-surface rounded-full p-6 border border-dark-border shadow-2xl flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3">Creating Module</h2>
                            <p className="text-slate-400 text-center max-w-md text-lg">
                                Gemini is analyzing <span className="text-brand-300">"{activeSession.graphData.nodes.find(n => n.id === selectedNodeId)?.title}"</span> and generating a custom textbook chapter with illustrations based on your background in <span className="text-indigo-300">{activeSession.context.existingKnowledge}</span>.
                            </p>
                        </div>
                    ) : lectureContent ? (
                        <LectureView 
                            content={lectureContent}
                            userContext={activeSession.context}
                            onComplete={handleModuleComplete}
                            onBackToMap={() => setViewMode('graph')}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                             <Map className="w-16 h-16 mb-4 opacity-20" />
                             <p>Select a module from the sidebar or graph to begin.</p>
                        </div>
                    )
                )}
            </main>
            </div>
          )}
          </>
      )}
    </div>
  );
};

export default App;
