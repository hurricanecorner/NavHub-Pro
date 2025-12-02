import React, { useState } from 'react';
import { LinkItem } from '../types';
import { ExternalLink, Edit2, Trash2, Globe } from 'lucide-react';

interface LinkCardProps {
  item: LinkItem;
  isEditMode: boolean;
  onEdit: (item: LinkItem) => void;
  onDelete: (id: string) => void;
  t: any;
}

const LinkCard: React.FC<LinkCardProps> = ({ item, isEditMode, onEdit, onDelete, t }) => {
  const [imgError, setImgError] = useState(false);

  // Fallback if no icon or error loading icon
  const IconFallback = () => (
    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0 dark:bg-indigo-900/50 dark:text-indigo-300">
      <Globe className="w-5 h-5" />
    </div>
  );

  return (
    <div className="group relative bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-4 flex gap-4 items-start dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500/30">
      
      {/* Tooltip for full description on hover */}
      {item.description && (
        <div className="absolute left-0 bottom-[calc(100%+10px)] w-full bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none dark:bg-slate-700 dark:text-slate-100">
          <p className="leading-relaxed break-words">{item.description}</p>
          {/* Tooltip Arrow */}
          <div className="absolute left-6 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-slate-700"></div>
        </div>
      )}

      {/* Icon */}
      {item.iconUrl && !imgError ? (
        <img 
          src={item.iconUrl} 
          alt={item.title} 
          className="w-10 h-10 rounded-full object-cover shrink-0 bg-slate-50 dark:bg-slate-700"
          onError={() => setImgError(true)}
        />
      ) : (
        <IconFallback />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 truncate pr-6 mb-1 text-sm dark:text-slate-200">{item.title}</h3>
        {/* Enforce 2-line limit */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed dark:text-slate-400">{item.description}</p>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.tags.map((tag, idx) => (
              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action / Link */}
      {isEditMode ? (
        <div className="absolute top-2 right-2 flex gap-1">
          <button 
            onClick={(e) => { e.preventDefault(); onEdit(item); }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); onDelete(item.id); }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors dark:hover:bg-red-900/30 dark:hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label={`${t.app.visit} ${item.title}`}
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
        </a>
      )}
    </div>
  );
};

export default LinkCard;