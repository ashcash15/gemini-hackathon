
import React, { useState, useRef } from 'react';
import { GlossaryTerm } from '../types';
import { RefreshCw, ArrowLeft, ArrowRight, BookOpen, MoveHorizontal, Sparkles, Loader2 } from 'lucide-react';

interface FlashcardsProps {
  terms: GlossaryTerm[];
  onGenerate?: () => Promise<void>;
}

const Flashcards: React.FC<FlashcardsProps> = ({ terms, onGenerate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Swipe State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
      if (!onGenerate) return;
      setIsGenerating(true);
      await onGenerate();
      setIsGenerating(false);
  };

  if (!terms || terms.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500 p-8 text-center">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p className="mb-6">No flashcards available for this topic yet.</p>
            {onGenerate && (
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGenerating ? 'Generating...' : 'Generate Flashcards'}
                </button>
            )}
        </div>
    );
  }

  const currentTerm = terms[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setDragX(0);
    setTimeout(() => setCurrentIndex((currentIndex + 1) % terms.length), 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setDragX(0);
    setTimeout(() => setCurrentIndex((currentIndex - 1 + terms.length) % terms.length), 200);
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(prev => prev + e.movementX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    // @ts-ignore
    e.target.releasePointerCapture(e.pointerId);

    if (dragX > 100) {
        handlePrev(); // Swipe Right -> Prev
    } else if (dragX < -100) {
        handleNext(); // Swipe Left -> Next
    } else {
        setDragX(0); // Snap back
    }
  };

  const cardRotation = dragX * 0.05;
  const cardOpacity = 1 - Math.min(Math.abs(dragX) / 300, 0.5);

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex justify-between items-center shrink-0">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 text-sm">
            <RefreshCw size={16} />
            Flashcards
        </h3>
        <div className="flex items-center gap-2">
            {onGenerate && (
                <button onClick={handleGenerate} disabled={isGenerating} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400" title="Regenerate">
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                </button>
            )}
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                {currentIndex + 1} / {terms.length}
            </span>
        </div>
      </div>
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Main Card */}
        <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
            <div 
                ref={containerRef}
                className="w-full max-w-sm aspect-[3/4] md:aspect-video relative perspective-1000 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ 
                    transform: `translateX(${dragX}px) rotate(${cardRotation}deg)`,
                    opacity: cardOpacity,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s'
                }}
            >
                <div 
                    className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
                    onClick={() => { if(Math.abs(dragX) < 5) setIsFlipped(!isFlipped); }}
                >
                    {/* FRONT */}
                    <div className="absolute inset-0 backface-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden">
                        <div className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 shrink-0">Term</div>
                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 break-words w-full max-h-full overflow-y-auto custom-scrollbar px-2">{currentTerm.term}</h3>
                        </div>
                        <p className="absolute bottom-6 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 shrink-0">
                            <MoveHorizontal size={12}/> Drag to move • Tap to flip
                        </p>
                    </div>
                    {/* BACK */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden">
                        <div className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 shrink-0">Definition</div>
                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                             <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium break-words w-full max-h-full overflow-y-auto custom-scrollbar px-2">{currentTerm.definition}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
                <button 
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
                    className="p-3 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white shadow-sm transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }} 
                    className="p-3 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white shadow-sm transition-all"
                >
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>

        {/* List View */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">All Terms</h4>
            <div className="space-y-2">
                {terms.map((t, i) => (
                    <div 
                        key={i} 
                        onClick={() => { setCurrentIndex(i); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${i === currentIndex ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                    >
                        <div className="font-semibold text-sm text-neutral-900 dark:text-white">{t.term}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{t.definition}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
