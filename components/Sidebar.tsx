
import React, { useState } from 'react';
import { Category, LinkItem, SiteConfig, Theme } from '../types';
import { LayoutGrid, Hash, ChevronRight, Folder, GripVertical } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';

interface SidebarProps {
  categories: Category[];
  links: LinkItem[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  t: any;
  isEditMode: boolean;
  siteConfig?: SiteConfig;
  theme?: Theme;
}

const CategoryIcon = ({ icon, isActive, theme }: { icon?: string; isActive: boolean; theme?: Theme }) => {
  const [error, setError] = useState(false);
  const isCustom = theme === 'custom';

  if (icon && !error) {
    return (
      <img 
        src={icon} 
        alt="" 
        className="w-5 h-5 object-contain shrink-0"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Folder className={`w-5 h-5 shrink-0 ${
      isCustom 
        ? (isActive ? 'text-white' : 'text-slate-100')
        : (isActive ? 'text-brand-600 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500')
    }`} />
  );
};

const Sidebar: React.FC<SidebarProps> = ({ categories, links, activeCategoryId, onSelectCategory, isOpen, setIsOpen, t, isEditMode, siteConfig, theme }) => {
  const isCustom = theme === 'custom';
  const scrollToSection = (id: string) => {
    onSelectCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) setIsOpen(false);
  };
  const scrollToSubSection = (e: React.MouseEvent, catId: string, subId: string) => {
    e.stopPropagation();
    if (activeCategoryId !== catId) onSelectCategory(catId);
    const element = document.getElementById(`subcat-${subId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) setIsOpen(false);
  };
  const getCategoryCount = (catId: string) => links.filter(l => l.categoryId === catId).length;
  const getSubCategoryCount = (catId: string, subId: string) => links.filter(l => l.categoryId === catId && l.subCategoryId === subId).length;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-4/5 sm:w-64 shadow-2xl transition-transform duration-500 ease-in-out
        lg:translate-x-0 lg:static lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCustom 
          ? 'bg-black/60 backdrop-blur-xl border-r border-white/5 text-slate-100' 
          : 'bg-white dark:bg-zinc-800 dark:backdrop-blur-md border-r border-slate-200 dark:border-white/5'
        }
      `}>
        <div className={`h-16 flex items-center px-6 ${isCustom ? 'border-b border-white/5' : 'border-b border-slate-100 dark:border-white/5'}`}>
          <div className={`flex items-center gap-2 font-black text-xl overflow-hidden tracking-[0.05em] ${isCustom ? 'text-white' : 'text-brand-600 dark:text-zinc-100'}`}>
            {siteConfig?.logoUrl ? (
              <img src={siteConfig.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <LayoutGrid className="w-6 h-6 shrink-0" />
            )}
            <span className="truncate">{siteConfig?.title || t.app.title}</span>
          </div>
        </div>
        <div className="p-4 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
          <Droppable droppableId="sidebar-categories" type="SIDEBAR_CATEGORY">
            {(provided) => (
              <nav ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                {categories.map((category, index) => {
                  const isActive = activeCategoryId === category.id;
                  const catCount = getCategoryCount(category.id);
                  return (
                    <Draggable key={category.id} draggableId={`sidebar-cat-${category.id}`} index={index} isDragDisabled={!isEditMode}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="space-y-1">
                          <div className="flex items-center group/item w-full">
                            {isEditMode && (
                              <div {...provided.dragHandleProps} className="pl-1 pr-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}
                            <button
                              onClick={() => scrollToSection(category.id)}
                              className={`
                                flex-1 flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black tracking-[0.04em] transition-all group border
                                ${isCustom 
                                  ? (isActive ? 'bg-white/20 text-white shadow-sm border-white/10 backdrop-blur-sm' : 'text-slate-100 hover:bg-white/10 hover:text-white border-transparent')
                                  : (isActive ? 'bg-brand-50 text-brand-600 border-transparent dark:bg-zinc-700 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-100')
                                }
                              `}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <CategoryIcon icon={category.icon} isActive={isActive} theme={theme} />
                                <span className="truncate uppercase">{category.name}</span>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                                isCustom 
                                  ? (isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-200 group-hover:bg-white/10 group-hover:text-white')
                                  : (isActive ? 'bg-brand-100 text-brand-700 dark:bg-zinc-800 dark:text-zinc-400' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-500 dark:group-hover:bg-zinc-800')
                              }`}>
                                {catCount}
                              </span>
                            </button>
                          </div>
                          {isActive && category.subCategories.length > 0 && (
                            <Droppable droppableId={`sidebar-sub-${category.id}`} type="SIDEBAR_SUBCAT">
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="pl-11 pr-2 space-y-0.5 animate-fadeIn">
                                  {category.subCategories.map((subCat, subIndex) => {
                                    const subCount = getSubCategoryCount(category.id, subCat.id);
                                    return (
                                      <Draggable key={subCat.id} draggableId={`sidebar-sub-${subCat.id}`} index={subIndex} isDragDisabled={!isEditMode}>
                                        {(provided) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center">
                                             {isEditMode && (<div {...provided.dragHandleProps} className="pr-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"><GripVertical className="w-3 h-3" /></div>)}
                                              <button onClick={(e) => scrollToSubSection(e, category.id, subCat.id)} className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold tracking-wider transition-colors group/sub ${isCustom ? 'text-slate-200 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}>
                                                <div className="flex items-center gap-2 truncate">
                                                  <ChevronRight className={`w-3 h-3 ${isCustom ? 'text-slate-300 group-hover/sub:text-slate-100' : 'text-slate-300 group-hover/sub:text-zinc-400 dark:text-zinc-500 dark:group-hover/sub:text-zinc-300'}`} />
                                                  <span className="truncate uppercase">{subCat.name}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold ${isCustom ? 'text-slate-300 group-hover/sub:text-slate-100' : 'text-slate-400 group-hover/sub:text-slate-600 dark:group-hover/sub:text-zinc-500'}`}>{subCount}</span>
                                              </button>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </nav>
            )}
          </Droppable>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
