
import React from 'react';
import { Note } from '../types';
import { Plus, Trash2, FileText } from 'lucide-react';

interface NotebookProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onUpdateNote: (id: string, key: keyof Note, value: string) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
}

const Notebook: React.FC<NotebookProps> = ({ notes, activeNoteId, onSelectNote, onAddNote, onUpdateNote, onDeleteNote }) => {
  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 text-sm">
            <FileText size={16} /> Notebook
        </h3>
        <button onClick={onAddNote} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md transition-colors"><Plus size={16} /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-1/3 min-w-[120px] border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-900/50">
            {notes.map(note => (
                <div key={note.id} onClick={() => onSelectNote(note.id)}
                    className={`p-3 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer group transition-colors ${activeNoteId === note.id ? 'bg-white dark:bg-neutral-900 border-l-2 border-l-blue-500 shadow-sm' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 border-l-2 border-l-transparent'}`}>
                    <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-medium truncate pr-2 ${activeNoteId === note.id ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{note.title || 'Untitled'}</h4>
                        <button onClick={(e) => onDeleteNote(note.id, e)} className="text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{new Date(note.updatedAt).toLocaleDateString()}</p>
                </div>
            ))}
            {notes.length === 0 && <div className="p-4 text-center text-xs text-neutral-400">Empty notebook.</div>}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950">
            {activeNote ? (
                <>
                    <input type="text" value={activeNote.title} onChange={(e) => onUpdateNote(activeNote.id, 'title', e.target.value)} placeholder="Title" className="w-full bg-transparent border-b border-neutral-100 dark:border-neutral-800 p-4 text-xl font-bold text-neutral-900 dark:text-white focus:outline-none placeholder-neutral-300 dark:placeholder-neutral-600" />
                    <textarea value={activeNote.content} onChange={(e) => onUpdateNote(activeNote.id, 'content', e.target.value)} placeholder="Write your notes here..." className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed" />
                    <div className="p-2 text-[10px] text-neutral-400 text-right border-t border-neutral-100 dark:border-neutral-800">Autosaved</div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">Select a note</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Notebook;
