
import React from 'react';
import { Note } from '../types';
import { Plus, Trash2, Save, FileText } from 'lucide-react';

interface NotebookProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onUpdateNote: (id: string, key: keyof Note, value: string) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
}

const Notebook: React.FC<NotebookProps> = ({ 
  notes, 
  activeNoteId, 
  onSelectNote, 
  onAddNote, 
  onUpdateNote, 
  onDeleteNote 
}) => {
  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h3 className="font-bold text-slate-300 flex items-center gap-2">
            <FileText size={18} />
            Notebook
        </h3>
        <button 
            onClick={onAddNote}
            className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
            title="New Note"
        >
            <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-1/3 min-w-[100px] border-r border-slate-800 overflow-y-auto custom-scrollbar bg-slate-900/30">
            {notes.map(note => (
                <div 
                    key={note.id}
                    onClick={() => onSelectNote(note.id)}
                    className={`p-3 border-b border-slate-800/50 cursor-pointer group hover:bg-slate-800 transition-colors ${activeNoteId === note.id ? 'bg-slate-800 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}`}
                >
                    <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-medium truncate pr-2 ${activeNoteId === note.id ? 'text-white' : 'text-slate-400'}`}>
                            {note.title || 'Untitled'}
                        </h4>
                        <button 
                            onClick={(e) => onDeleteNote(note.id, e)}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1">
                        {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                </div>
            ))}
            {notes.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-600">
                    No notes yet. Click + to add one.
                </div>
            )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-slate-900">
            {activeNote ? (
                <>
                    <input 
                        type="text" 
                        value={activeNote.title}
                        onChange={(e) => onUpdateNote(activeNote.id, 'title', e.target.value)}
                        placeholder="Note Title"
                        className="w-full bg-transparent border-b border-slate-800 p-4 text-lg font-bold text-white focus:outline-none placeholder-slate-600"
                    />
                    <textarea 
                        value={activeNote.content}
                        onChange={(e) => onUpdateNote(activeNote.id, 'content', e.target.value)}
                        placeholder="Start typing..."
                        className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none text-slate-300 text-sm leading-relaxed font-mono custom-scrollbar"
                    />
                    <div className="p-2 text-[10px] text-slate-600 text-right border-t border-slate-800">
                        Auto-saved
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                    Select a note to edit
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Notebook;
