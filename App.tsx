
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserContext, LearningGraph, LearningNode, NodeStatus, LectureContent, Session, Note, Badge } from './types';
import { generateLearningPath, generateLectureContent, generateModuleImage, generateSubGraph, generateModuleSummary, generateCourseSummary, generateGlossary } from './services/geminiService';
import ForceGraph from './components/ForceGraph';
import LectureView from './components/LectureModal';
import Notebook from './components/Notebook';
import Dictionary from './components/Dictionary';
import Flashcards from './components/Flashcards';
import GlobalChat from './components/GlobalChat';
import { BrainCircuit, Loader2, Map, List, Lock, CheckCircle, PlayCircle, RefreshCw, Briefcase, X, FileText, Plus, Award, User, Layers, CornerUpLeft, Moon, Sun, ChevronRight, MessageCircle } from 'lucide-react';

// --- Profile Modal ---
const UserProfileModal = ({ session, onClose }: { session: Session | undefined, onClose: () => void }) => {
    if (!session) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden relative border border-neutral-200 dark:border-neutral-700 transition-colors">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                    <X size={20} />
                </button>
                
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                             <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">User Profile</h2>
                             <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <Briefcase size={12} /> {session.context.existingKnowledge}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 text-center">
                            <div className="text-2xl font-semibold text-neutral-900 dark:text-white mb-1">{session.completedNodeIds.length}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">Modules</div>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 text-center">
                            <div className="text-2xl font-semibold text-neutral-900 dark:text-white mb-1">{session.earnedBadges.length}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">Badges</div>
                        </div>
                         <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 text-center">
                            <div className="text-2xl font-semibold text-neutral-900 dark:text-white mb-1">{session.context.isDeepStudy ? 'Deep' : 'Fast'}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">Mode</div>
                        </div>
                    </div>

                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Earned Badges</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {session.earnedBadges.length === 0 && <span className="text-neutral-400 text-sm">No badges yet.</span>}
                        {session.earnedBadges.map(b => (
                            <div key={b.id} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 px-3 py-1.5 rounded-lg text-yellow-800 dark:text-yellow-200">
                                <Award size={14} />
                                <span className="font-medium text-xs">{b.label}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                         <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Detailed Context</h3>
                         <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700">
                             "{session.context.detailedBackground || 'No detailed bio provided.'}"
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const [globalStep, setGlobalStep] = useState<'welcome' | 'onboarding' | 'session_active'>('welcome');
  const [tempContext, setTempContext] = useState<UserContext>({ 
      existingKnowledge: '', 
      learningGoal: '', 
      detailedBackground: '', 
      isDeepStudy: false 
  });
  
  const [viewMode, setViewMode] = useState<'graph' | 'module'>('graph');
  const [sidebarTab, setSidebarTab] = useState<'graph' | 'modules' | 'notebook' | 'dictionary' | 'flashcards'>('graph');
  const [showProfile, setShowProfile] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  
  // Theme & Layout
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [summarizingCourse, setSummarizingCourse] = useState(false);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lectureContent, setLectureContent] = useState<LectureContent | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'achievement' } | null>(null);

  // Initialize
  useEffect(() => {
    const savedSessions = localStorage.getItem('cognimap-sessions');
    if (savedSessions) {
        try { setSessions(JSON.parse(savedSessions)); if (JSON.parse(savedSessions).length > 0) setGlobalStep('onboarding'); } catch (e) {}
    }
    const savedNotes = localStorage.getItem('cognimap-notes');
    if (savedNotes) {
        try { setNotes(JSON.parse(savedNotes)); if (JSON.parse(savedNotes).length > 0) setActiveNoteId(JSON.parse(savedNotes)[0].id); } catch (e) {}
    } else {
        const initialNote = { id: 'welcome', title: 'Welcome', content: 'Your global notebook.', updatedAt: Date.now() };
        setNotes([initialNote]); setActiveNoteId('welcome');
    }
    const savedTheme = localStorage.getItem('cognimap-theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  useEffect(() => { localStorage.setItem('cognimap-sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('cognimap-notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { 
      localStorage.setItem('cognimap-theme', isDarkMode ? 'dark' : 'light'); 
  }, [isDarkMode]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  
  const currentGraphData = useMemo(() => {
      if (!activeSession) return null;
      if (activeSession.currentSubGraphId) {
          const parentNode = activeSession.graphData?.nodes.find(n => n.id === activeSession.currentSubGraphId);
          return parentNode?.subGraph || activeSession.graphData;
      }
      return activeSession.graphData;
  }, [activeSession]);

  const progress = currentGraphData 
    ? Math.round((activeSession?.completedNodeIds.filter(id => currentGraphData.nodes.some(n => n.id === id)).length || 0) / currentGraphData.nodes.length * 100) 
    : 0;

  // Sidebar Resize Logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      setSidebarWidth(Math.max(250, Math.min(e.clientX, 800)));
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Actions
  const handleStartJourney = async () => {
    if (!tempContext.existingKnowledge || !tempContext.learningGoal) return;
    setLoading(true); setError(null);
    try {
      const graph = await generateLearningPath(tempContext);
      const newSession: Session = {
          id: Date.now().toString(),
          lastAccessed: Date.now(),
          context: { ...tempContext },
          graphData: graph,
          completedNodeIds: [],
          earnedBadges: [],
          step: 'review',
          currentSubGraphId: null
      };
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
      setGlobalStep('session_active');
    } catch (err) { setError("Failed to generate path."); } finally { setLoading(false); }
  };

  const updateActiveSession = (updater: (s: Session) => Session) => {
      if (!activeSessionId) return;
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...updater(s), lastAccessed: Date.now() } : s));
  };

  // --- Helpers for Notebook ---
  const handleAddNote = (title: string, content: string) => {
      const newNote: Note = {
          id: Date.now().toString(),
          title,
          content,
          updatedAt: Date.now()
      };
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      setToast({ message: "Note added to notebook", type: 'info' });
  };
  
  const handleUpdateNote = (id: string, key: keyof Note, value: string) => {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, [key]: value, updatedAt: Date.now() } : n));
  };
  
  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleRefineModule = async (instruction: string) => {
      if (!selectedNodeId || !activeSession || !currentGraphData) return;
      setLoadingContent(true);
      try {
          // Find current node
          const node = currentGraphData.nodes.find(n => n.id === selectedNodeId);
          if (node) {
              const completed = currentGraphData.nodes.filter(n => activeSession?.completedNodeIds.includes(n.id));
              // Pass instruction to service
              const content = await generateLectureContent(node, activeSession.context, completed, instruction);
              // Image generation not needed again unless specifically requested, but let's skip to save time/tokens for now or just reuse old one if we had it. 
              // Simpler to just re-use the lecture view with new content.
              setLectureContent(prev => ({ ...content, imageUrl: prev?.imageUrl })); 
              setToast({ message: "Module content refined", type: 'info' });
          }
      } catch (e) {
          setToast({ message: "Failed to refine module", type: 'info' });
      } finally {
          setLoadingContent(false);
      }
  };

  const handleModuleFail = async () => {
    if (!selectedNodeId || !activeSession || !currentGraphData) return;
    setLoadingContent(true);
    try {
        const node = currentGraphData.nodes.find(n => n.id === selectedNodeId);
        if (node) {
            const completed = currentGraphData.nodes.filter(n => activeSession?.completedNodeIds.includes(n.id));
            // Call generate with remedial flag = true
            const content = await generateLectureContent(node, activeSession.context, completed, undefined, true);
            setLectureContent(prev => ({ ...content, imageUrl: prev?.imageUrl }));
            setToast({ message: "Content simplified for easier learning", type: 'info' });
        }
    } catch (e) {
        setToast({ message: "Failed to simplify content", type: 'info' });
    } finally {
        setLoadingContent(false);
    }
  };

  const handleSaveSummary = async (content: LectureContent) => {
      const summary = await generateModuleSummary(content);
      handleAddNote(`Summary: ${content.title}`, summary);
  };

  const handleCourseSummary = async () => {
    if (!currentGraphData || !activeSession) return;
    setSummarizingCourse(true);
    try {
        const summary = await generateCourseSummary(currentGraphData, activeSession.context);
        handleAddNote(`Full Course Guide: ${activeSession.context.learningGoal}`, summary);
        setToast({ message: "Course summary added to notebook", type: 'info' });
    } catch (e) {
        setToast({ message: "Failed to generate summary", type: 'info' });
    } finally {
        setSummarizingCourse(false);
    }
  };

  const handleGenerateGlossary = async () => {
      if (!activeSession || !currentGraphData) return;
      const terms = await generateGlossary(activeSession.context.learningGoal, activeSession.context);
      
      if (activeSession.currentSubGraphId) {
          const updatedNodes = activeSession.graphData!.nodes.map(n => {
              if (n.id === activeSession.currentSubGraphId && n.subGraph) {
                   return { ...n, subGraph: { ...n.subGraph, glossary: terms } };
              }
              return n;
          });
          updateActiveSession(s => ({ ...s, graphData: { ...s.graphData!, nodes: updatedNodes } }));
      } else {
          updateActiveSession(s => ({
              ...s,
              graphData: { ...s.graphData!, glossary: terms }
          }));
      }
      setToast({ message: "Flashcards generated", type: 'info' });
  };

  const handleNodeClick = async (node: LearningNode) => {
    if (node.status === NodeStatus.LOCKED) return;

    if (activeSession?.context.isDeepStudy && !activeSession.currentSubGraphId) {
        if (node.subGraph) {
             updateActiveSession(s => ({ ...s, currentSubGraphId: node.id }));
             setSelectedNodeId(null);
             return;
        } else {
             setLoadingContent(true);
             try {
                 const subGraph = await generateSubGraph(node, activeSession.context);
                 subGraph.nodes = subGraph.nodes.map((n, i) => ({ 
                     ...n, 
                     id: `${node.id}-sub-${n.id}`, 
                     status: i === 0 ? NodeStatus.AVAILABLE : NodeStatus.LOCKED 
                }));
                 subGraph.links = subGraph.links.map(l => ({
                     source: `${node.id}-sub-${l.source}`,
                     target: `${node.id}-sub-${l.target}`
                 }));

                 const updatedNodes = activeSession.graphData!.nodes.map(n => n.id === node.id ? { ...n, subGraph } : n);
                 updateActiveSession(s => ({
                     ...s,
                     graphData: { ...s.graphData!, nodes: updatedNodes },
                     currentSubGraphId: node.id
                 }));
             } catch(e) {
                 setToast({ message: "Failed to load detailed topics.", type: 'info' });
             } finally {
                 setLoadingContent(false);
             }
             return;
        }
    }

    setSelectedNodeId(node.id);
    setViewMode('module'); 
    setLoadingContent(true);
    setLectureContent(null);
    try {
      const completed = currentGraphData?.nodes.filter(n => activeSession?.completedNodeIds.includes(n.id)) || [];
      const contentPromise = generateLectureContent(node, activeSession!.context, completed);
      const imagePromise = generateModuleImage(node.title, node.description);
      const [content, imageUrl] = await Promise.all([contentPromise, imagePromise]);
      setLectureContent({ ...content, imageUrl: imageUrl || undefined });
    } catch (err) { setViewMode('graph'); } finally { setLoadingContent(false); }
  };

  const handleModuleComplete = async () => {
      if (!selectedNodeId || !activeSession || !currentGraphData) return;
      
      const newCompletedList = [...activeSession.completedNodeIds, selectedNodeId];
      const newCompletedSet = new Set(newCompletedList);
      let nextNodeToOpen: LearningNode | null = null;

      const updatedNodes = currentGraphData.nodes.map(node => {
          if (newCompletedSet.has(node.id)) return { ...node, status: NodeStatus.COMPLETED };
          const deps = node.dependencies; 
           const parents = currentGraphData.links.filter(l => (typeof l.target === 'object' ? l.target.id : l.target) === node.id).map(l => typeof l.source === 'object' ? l.source.id : l.source);
           const parentsMet = parents.every(p => newCompletedSet.has(p));
           
          if (parentsMet && !newCompletedSet.has(node.id)) {
              // This node is newly available or already available
              if (node.status === NodeStatus.LOCKED && !nextNodeToOpen) {
                  nextNodeToOpen = node;
              }
              return { ...node, status: NodeStatus.AVAILABLE };
          }
          return { ...node };
      });

      // If no newly unlocked node, look for next available one
      if (!nextNodeToOpen) {
          nextNodeToOpen = updatedNodes.find(n => n.status === NodeStatus.AVAILABLE && !newCompletedSet.has(n.id)) || null;
      }

      if (activeSession.currentSubGraphId) {
          const parentNodes = activeSession.graphData!.nodes.map(n => {
              if (n.id === activeSession.currentSubGraphId) {
                   return { ...n, subGraph: { ...n.subGraph!, nodes: updatedNodes } };
              }
              return n;
          });
          
          const allSubComplete = updatedNodes.every(n => n.status === NodeStatus.COMPLETED);
          if (allSubComplete) {
              newCompletedList.push(activeSession.currentSubGraphId);
              setToast({ message: "Milestone Completed!", type: 'achievement' });
          }

          updateActiveSession(s => ({
              ...s,
              completedNodeIds: newCompletedList,
              graphData: { ...s.graphData!, nodes: parentNodes }
          }));

      } else {
          updateActiveSession(s => ({
              ...s,
              completedNodeIds: newCompletedList,
              graphData: { ...s.graphData!, nodes: updatedNodes }
          }));
      }

      if (newCompletedList.length === 1) setToast({ message: "Badge Unlocked: First Step", type: 'achievement' });

      // Auto Advance Logic
      if (nextNodeToOpen) {
          setToast({ message: `Module Complete! Next: ${nextNodeToOpen.title}`, type: 'info' });
          // Short delay for user to register completion
          setTimeout(() => {
              if (nextNodeToOpen) handleNodeClick(nextNodeToOpen);
          }, 1200);
      } else {
          // No next node, go back to map
          setViewMode('graph');
      }
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen flex flex-col`}>
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col transition-colors duration-300">
      {toast && (
          <div className="fixed bottom-8 right-8 z-[100] animate-slideUp bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
              {toast.type === 'achievement' ? <Award className="text-yellow-500" size={20} /> : <CheckCircle className="text-brand-500" size={20} />}
              <span className="font-medium">{toast.message}</span>
          </div>
      )}
      {showProfile && <UserProfileModal session={activeSession} onClose={() => setShowProfile(false)} />}
      
      {/* Global Chat Component */}
      {activeSession && currentGraphData && (
          <GlobalChat 
            userContext={activeSession.context} 
            graphData={currentGraphData} 
            isOpen={showGlobalChat} 
            onClose={() => setShowGlobalChat(false)} 
          />
      )}

      {/* Theme Toggle Button (Global) */}
      <div className="fixed top-4 right-4 z-[60] flex gap-2">
         {activeSession && (
             <button 
                onClick={() => setShowGlobalChat(!showGlobalChat)}
                className={`p-2.5 rounded-full border shadow-sm hover:shadow-md transition-all ${showGlobalChat ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                title="Open Course Chat"
             >
                <MessageCircle size={20} />
             </button>
         )}
         <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all"
            title="Toggle Dark Mode"
         >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>

      {/* WELCOME */}
      {globalStep === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 bg-white dark:bg-neutral-950 transition-colors">
          <div className="max-w-2xl text-center">
              <div className="inline-flex items-center justify-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl mb-6">
                <BrainCircuit className="w-8 h-8 text-neutral-900 dark:text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold mb-6 text-neutral-900 dark:text-white tracking-tight">
                 CogniMap
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Adaptive learning pathways tailored to your expertise. Simple, clear, and effective.
              </p>
              <button onClick={() => setGlobalStep('onboarding')} className="px-8 py-3 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium transition-all shadow-sm">
                Start Learning
              </button>
          </div>
        </div>
      )}

      {/* ONBOARDING */}
      {globalStep === 'onboarding' && (
        <div className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center py-12">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-2xl shadow-sm w-full max-w-xl transition-colors">
             <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">Create Learning Path</h1>
             <p className="text-neutral-500 dark:text-neutral-400 mb-8">Tell us what you know and what you want to learn.</p>
             
             <div className="space-y-5">
                <div>
                    <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500 font-semibold mb-2 block">Current Expertise</label>
                    <input type="text" placeholder="e.g. Graphic Designer" className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-0 outline-none transition-colors"
                        value={tempContext.existingKnowledge} onChange={e => setTempContext({...tempContext, existingKnowledge: e.target.value})} />
                </div>
                 <div>
                    <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500 font-semibold mb-2 block">Learning Goal</label>
                    <input type="text" placeholder="e.g. UX Research" className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-0 outline-none transition-colors"
                        value={tempContext.learningGoal} onChange={e => setTempContext({...tempContext, learningGoal: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500 font-semibold mb-2 block">Detailed Background</label>
                    <textarea placeholder="Provide more context..." className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-0 outline-none transition-colors h-24 resize-none"
                        value={tempContext.detailedBackground} onChange={e => setTempContext({...tempContext, detailedBackground: e.target.value})} />
                </div>

                <div className="flex items-center gap-4 py-2">
                    <button 
                        onClick={() => setTempContext(c => ({...c, isDeepStudy: !c.isDeepStudy}))}
                        className={`w-10 h-5 rounded-full transition-colors relative ${tempContext.isDeepStudy ? 'bg-neutral-800 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-neutral-900 rounded-full transition-transform ${tempContext.isDeepStudy ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">Deep Study Mode</span>
                </div>

                <button onClick={handleStartJourney} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg font-medium text-white transition-all flex justify-center gap-2 items-center mt-2 shadow-sm">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Generate Path</span>}
                </button>
             </div>
             
             {sessions.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                     <div className="text-xs text-neutral-400 uppercase tracking-widest mb-4 font-medium">Recent Sessions</div>
                     <div className="flex flex-col gap-2">
                         {sessions.map(s => (
                             <button key={s.id} onClick={() => { setActiveSessionId(s.id); setGlobalStep('session_active'); }} className="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-100 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 transition-colors flex justify-between">
                                 <span className="font-medium">{s.context.learningGoal}</span>
                                 <span className="text-neutral-400 text-xs">{new Date(s.lastAccessed).toLocaleDateString()}</span>
                             </button>
                         ))}
                     </div>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* MAIN APP VIEW */}
      {globalStep === 'session_active' && activeSession && currentGraphData && (
          activeSession.step === 'review' ? (
              // REVIEW SCREEN
             <div className="container mx-auto px-4 h-screen flex flex-col justify-center items-center animate-fadeIn">
                 <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 max-w-4xl w-full h-[80vh] flex flex-col shadow-sm transition-colors">
                     <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Review Curriculum</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Check the generated topics before starting.</p>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-6">
                         {currentGraphData.nodes.map((n, i) => (
                             <div key={n.id} className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 flex gap-4">
                                 <span className="text-neutral-300 dark:text-neutral-600 font-mono font-bold">{(i+1).toString().padStart(2, '0')}</span>
                                 <div><h4 className="font-medium text-neutral-900 dark:text-white">{n.title}</h4><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{n.description}</p></div>
                             </div>
                         ))}
                     </div>
                     <div className="flex gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                         <textarea value={reviewFeedback} onChange={e => setReviewFeedback(e.target.value)} placeholder="Provide feedback to refine..." className="flex-1 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 outline-none resize-none text-sm transition-colors" />
                         <div className="flex flex-col gap-2 shrink-0">
                             <button onClick={() => { /* refine logic */}} className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Refine</button>
                             <button onClick={() => { updateActiveSession(s => ({...s, step: 'main', graphData: {...s.graphData!, nodes: s.graphData!.nodes.map((n, i) => ({...n, status: i===0? NodeStatus.AVAILABLE: NodeStatus.LOCKED}))}})) }} className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm">Start Learning</button>
                         </div>
                     </div>
                 </div>
             </div>
          ) : (
             <div className="flex flex-1 relative animate-fadeIn bg-neutral-50 dark:bg-neutral-950 transition-colors">
                 {/* SIDEBAR */}
                <aside 
                    style={{ width: sidebarWidth }}
                    className="sticky top-0 h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col z-20 transition-colors"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <div className="font-semibold text-neutral-900 dark:text-white text-lg flex items-center gap-2">
                            <BrainCircuit className="text-neutral-900 dark:text-white" size={20} /> CogniMap
                        </div>
                         <button onClick={() => setShowProfile(true)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><User size={18}/></button>
                    </div>
                    {/* Navigation */}
                    <div className="flex p-2 gap-1 border-b border-neutral-100 dark:border-neutral-800">
                        {['graph', 'modules', 'flashcards', 'notebook'].map(tab => (
                            <button key={tab} onClick={() => {setSidebarTab(tab as any); if(tab==='graph') setViewMode('graph');}} 
                                className={`flex-1 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors ${sidebarTab === tab ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}>
                                {tab === 'graph' ? <Map className="mx-auto mb-1" size={16}/> : tab === 'modules' ? <List className="mx-auto mb-1" size={16}/> : tab === 'flashcards' ? <RefreshCw className="mx-auto mb-1" size={16}/> : <FileText className="mx-auto mb-1" size={16}/>}
                                {tab}
                            </button>
                        ))}
                    </div>
                    
                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {sidebarTab === 'graph' && (
                            <div className="p-6">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase mb-4 tracking-wider">Progress</h3>
                                <div className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">{progress}%</div>
                                <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-6"><div className="h-full bg-blue-600" style={{width: `${progress}%`}}></div></div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500 dark:text-neutral-400">Completed</span>
                                        <span className="font-medium text-neutral-900 dark:text-white">{activeSession.completedNodeIds.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500 dark:text-neutral-400">Remaining</span>
                                        <span className="font-medium text-neutral-900 dark:text-white">{activeSession.graphData!.nodes.length - activeSession.completedNodeIds.length}</span>
                                    </div>
                                </div>

                                {activeSession.context.isDeepStudy && (
                                    <div className="mt-8 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-lg">
                                        <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-medium text-sm mb-1"><Layers size={14}/> Deep Study</div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Select milestones to explore sub-topics.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {sidebarTab === 'modules' && (
                             <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                                    {activeSession.currentSubGraphId && (
                                        <button onClick={() => updateActiveSession(s => ({...s, currentSubGraphId: null}))} className="w-full p-3 mb-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 flex items-center gap-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white shadow-sm transition-colors">
                                            <CornerUpLeft size={16} /> Back to Roadmap
                                        </button>
                                    )}
                                    {currentGraphData.nodes.map((node, i) => (
                                        <button key={node.id} onClick={() => handleNodeClick(node)} disabled={node.status === NodeStatus.LOCKED}
                                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${node.id === selectedNodeId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-transparent'} ${node.status === NodeStatus.LOCKED ? 'opacity-40' : ''}`}>
                                            <div className="shrink-0 text-neutral-400 dark:text-neutral-500">{node.status === NodeStatus.COMPLETED ? <CheckCircle size={16} className="text-green-600 dark:text-green-400"/> : node.status === NodeStatus.LOCKED ? <Lock size={16}/> : <PlayCircle size={16} className={node.id === selectedNodeId ? 'text-blue-600 dark:text-blue-400' : ''}/>}</div>
                                            <div className="text-sm font-medium truncate">{node.title}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                                    <button 
                                        onClick={handleCourseSummary} 
                                        disabled={summarizingCourse}
                                        className="w-full py-2.5 px-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {summarizingCourse ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                        {summarizingCourse ? 'Summarizing...' : 'Summarize Course'}
                                    </button>
                                </div>
                             </div>
                        )}
                        {sidebarTab === 'flashcards' && <div className="absolute inset-0"><Flashcards terms={currentGraphData.glossary} onGenerate={handleGenerateGlossary} /></div>}
                        {sidebarTab === 'dictionary' && <div className="absolute inset-0"><Dictionary userContext={activeSession.context} glossary={currentGraphData.glossary} /></div>}
                        {sidebarTab === 'notebook' && <div className="absolute inset-0"><Notebook notes={notes} activeNoteId={activeNoteId} onSelectNote={setActiveNoteId} onAddNote={() => handleAddNote('New Note', '')} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} /></div>}
                    </div>

                    {/* Resizer Handle */}
                    <div 
                        onMouseDown={startResizing}
                        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-30"
                    ></div>
                </aside>

                {/* MAIN AREA */}
                <main className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-neutral-950 transition-colors">
                    {/* Breadcrumbs */}
                    {activeSession.context.isDeepStudy && activeSession.currentSubGraphId && (
                        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors">
                            <span className="text-neutral-400 text-xs font-bold uppercase tracking-wide">Roadmap</span>
                            <ChevronRight size={12} className="text-neutral-400" />
                            <span className="text-neutral-800 dark:text-neutral-200 text-xs font-bold uppercase truncate max-w-[200px]">{activeSession.graphData?.nodes.find(n => n.id === activeSession.currentSubGraphId)?.title}</span>
                        </div>
                    )}

                    {viewMode === 'graph' && (
                        <div className="flex-1 p-4 flex flex-col">
                            {loadingContent && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl flex flex-col items-center border border-neutral-100 dark:border-neutral-800">
                                        <Loader2 className="w-8 h-8 text-neutral-900 dark:text-white animate-spin mb-3" />
                                        <div className="text-neutral-900 dark:text-white font-medium">Loading Content...</div>
                                    </div>
                                </div>
                            )}
                            <div className="h-[85vh] min-h-[600px] w-full">
                                <ForceGraph data={currentGraphData} onNodeClick={handleNodeClick} isDarkMode={isDarkMode} />
                            </div>
                        </div>
                    )}

                    {viewMode === 'module' && (
                        loadingContent ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
                                <div className="w-16 h-16 rounded-full border-4 border-neutral-200 dark:border-neutral-800 border-t-neutral-800 dark:border-t-white animate-spin mb-6"></div>
                                <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Synthesizing Module</h2>
                                <p className="text-neutral-500 dark:text-neutral-400 mt-2">Tailoring content...</p>
                            </div>
                        ) : lectureContent ? (
                            <div className="flex-1 flex flex-col h-screen">
                                <LectureView content={lectureContent} userContext={activeSession.context} onComplete={handleModuleComplete} onBackToMap={() => setViewMode('graph')} onRefine={handleRefineModule} onSaveSummary={handleSaveSummary} onFail={handleModuleFail} />
                            </div>
                        ) : null
                    )}
                </main>
             </div>
          )
      )}
    </div>
    </div>
  );
};

export default App;
