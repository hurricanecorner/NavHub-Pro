
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
    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center shrink-0 border border-brand-100 dark:border-transparent dark:bg-brand-900/40 dark:text-brand-400 transition-colors">
      <Globe className="w-5 h-5 lg:w-6 lg:h-6" />
    </div>
  );
  
  const cardClasses = `group relative rounded-[1.25rem] lg:rounded-[1.5rem] border shadow-sm p-4 lg:p-5 flex gap-4 lg:gap-5 items-center 
    bg-white border-slate-100/60
    dark:bg-zinc-700/30 dark:backdrop-blur-md dark:border-white/5 dark:shadow-none
    ${isDragging ? 'opacity-90 shadow-2xl scale-105 !transition-none' : 'transition-all duration-500'}
    ${isEditMode && !isDragging ? 'cursor-default' : 'hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 hover:border-brand-500/20 dark:hover:bg-zinc-700/60'}`;

  return (
    <div className={cardClasses}>
      {/* 悬停描述气泡 - 使用内联样式确保 var(--brand-xxx) 正常生效且不丢失颜色 */}
      {item.description && !isEditMode && !isDragging && (
        <div 
          className="absolute left-0 bottom-[calc(100%+12px)] w-full text-white text-[10px] lg:text-[11px] p-3 lg:p-4 rounded-2xl shadow-2xl opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:translate-y-0 translate-y-2 transition-all duration-500 z-50 pointer-events-none border border-white/10 backdrop-blur-md"
          style={{ backgroundColor: 'var(--brand-700)' }}
        >
          <p className="leading-relaxed font-black text-white">{item.description}</p>
          <div 
            className="absolute left-8 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]"
            style={{ borderTopColor: 'var(--brand-700)' }}
          ></div>
        </div>
      )}
      
      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden shrink-0 border border-slate-100 bg-white dark:border-white/5 dark:bg-zinc-800 flex items-center justify-center shadow-inner transition-transform ${isDragging ? '!transition-none' : 'group-hover:scale-110 duration-500'}`}>
        {item.iconUrl && !imgError ? (
          <img src={item.iconUrl} alt={item.title} className={`w-full h-full object-cover scale-[1.1] transition-transform ${isDragging ? '!transition-none' : 'duration-700 group-hover:scale-[1.2]'}`} onError={() => setImgError(true)} />
        ) : ( <IconFallback /> )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className={`font-black text-slate-800 truncate pr-6 mb-0.5 text-xs lg:text-sm dark:text-zinc-100 leading-tight tracking-wider transition-colors ${isDragging ? '!transition-none' : 'group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>{item.title}</h3>
        <p className="text-[10px] lg:text-[11px] font-medium text-slate-500 truncate leading-relaxed dark:text-zinc-400 tracking-normal">{item.description || 'No description'}</p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.map((tag, idx) => (
              <span key={idx} className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100 dark:bg-white/5 dark:text-zinc-200 dark:border-white/5 transition-all ${isDragging ? '!transition-none' : 'duration-500 group-hover:bg-brand-50 group-hover:text-brand-500'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {isEditMode && !isDragging ? (
        <div className="absolute top-2 right-2 flex gap-1 z-20 animate-in fade-in zoom-in duration-300">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-90"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ) : !isEditMode && !isDragging && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Visit ${item.title}`}>
          <div className="absolute top-4 right-4 opacity-0 lg:group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-500">
            <ExternalLink className="w-3.5 h-3.5 text-brand-500" />
          </div>
        </a>
      )}
    </div>
  );
};

export default LinkCard;
