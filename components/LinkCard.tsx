
import React, { useState } from 'react';
import { LinkItem } from '../types';
import { ExternalLink, Edit2, Trash2, Globe } from 'lucide-react';

interface LinkCardProps {
  item: LinkItem;
  isEditMode: boolean;
  isDragging?: boolean;
  onEdit: (item: LinkItem) => void;
  onDelete: (id: string) => void;
  t: any;
}

const LinkCard: React.FC<LinkCardProps> = ({ item, isEditMode, isDragging, onEdit, onDelete, t }) => {
  const [imgError, setImgError] = useState(false);
  const IconFallback = () => (
    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center shrink-0 border border-brand-100 dark:border-transparent dark:bg-brand-900/40 dark:text-brand-400 transition-colors">
      <Globe className="w-6 h-6" />
    </div>
  );
  const cardClasses = `group relative rounded-[1.5rem] border shadow-sm p-5 flex gap-5 items-center 
    bg-white border-slate-100/60
    dark:bg-zinc-700/30 dark:backdrop-blur-md dark:border-white/5 dark:shadow-none
    ${isDragging ? 'opacity-90 shadow-2xl scale-105 !transition-none' : 'transition-all duration-500'}
    ${isEditMode && !isDragging ? 'cursor-default' : 'hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 hover:border-brand-500/20 dark:hover:bg-zinc-700/60'}`;

  return (
    <div className={cardClasses}>
      {item.description && !isEditMode && !isDragging && (
        <div className="absolute left-0 bottom-[calc(100%+12px)] w-full bg-slate-900/90 backdrop-blur-xl text-white text-[11px] p-4 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-500 z-50 pointer-events-none border border-white/10">
          <p className="leading-relaxed font-medium text-slate-100">{item.description}</p>
          <div className="absolute left-8 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/90"></div>
        </div>
      )}
      <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-100 bg-white dark:border-white/5 dark:bg-zinc-800 flex items-center justify-center shadow-inner transition-transform ${isDragging ? '!transition-none' : 'group-hover:scale-110 duration-500'}`}>
        {item.iconUrl && !imgError ? (
          <img src={item.iconUrl} alt={item.title} className={`w-full h-full object-cover scale-[1.1] transition-transform ${isDragging ? '!transition-none' : 'duration-700 group-hover:scale-[1.2]'}`} onError={() => setImgError(true)} />
        ) : ( <IconFallback /> )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-black text-slate-800 truncate pr-6 mb-1 text-sm dark:text-zinc-100 leading-tight tracking-wider transition-colors ${isDragging ? '!transition-none' : 'group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>{item.title}</h3>
        <p className="text-[11px] font-medium text-slate-500 truncate leading-relaxed dark:text-zinc-400 tracking-normal">{item.description || 'No description available'}</p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {item.tags.map((tag, idx) => (
              <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100 dark:bg-white/5 dark:text-zinc-200 dark:border-white/5 transition-all ${isDragging ? '!transition-none' : 'duration-500 group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {isEditMode && !isDragging ? (
        <div className="absolute top-3 right-3 flex gap-1.5 z-20 animate-in fade-in zoom-in duration-300">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all active:scale-90 shadow-sm"><Edit2 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90 shadow-sm"><Trash2 className="w-4 h-4" /></button>
        </div>
      ) : !isEditMode && !isDragging && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Visit ${item.title}`}>
          <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-500">
            <ExternalLink className="w-4 h-4 text-brand-500" />
          </div>
        </a>
      )}
    </div>
  );
};
export default LinkCard;
