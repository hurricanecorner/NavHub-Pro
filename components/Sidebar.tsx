
import React, { useState } from 'react';
import { Category, LinkItem, SiteConfig } from '../types';
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
}

const CategoryIcon = ({ icon, isActive }: { icon?: string; isActive: boolean }) => {
  const [error, setError] = useState(false);

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
    <Folder className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
  );
};

const Sidebar: React.FC<SidebarProps> = ({ categories, links, activeCategoryId, onSelectCategory, isOpen, setIsOpen, t, isEditMode, siteConfig }) => {
  
  const scrollToSection = (id: string) => {
    onSelectCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) {
        setIsOpen(false);
    }
  };

  const scrollToSubSection = (e: React.MouseEvent, catId: string, subId: string) => {
    e.stopPropagation();
    // Ensure parent category is active (though it likely is if this is visible)
    if (activeCategoryId !== catId) {
      onSelectCategory(catId);
    }
    
    const element = document.getElementById(`subcat-${subId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) {
        setIsOpen(false);
    }
  };

  const getCategoryCount = (catId: string) => links.filter(l => l.categoryId === catId).length;
  const getSubCategoryCount = (catId: string, subId: string) => links.filter(l => l.categoryId === catId && l.subCategoryId === subId).length;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out
        bg-white lg:translate-x-0 lg:static 
        dark:bg-slate-900/80 dark:backdrop-blur-md dark:border-slate-800/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl dark:text-indigo-400 overflow-hidden">
            {siteConfig?.logoUrl ? (
              <img src={siteConfig.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <LayoutGrid className="w-6 h-6 shrink-0" />
            )}
            <span className="truncate">{siteConfig?.title || t.app.title}</span>
          </div>
        </div>

        <div className="p-4 h-[calc(100vh-4rem)] overflow-y-auto">
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
                                flex-1 flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors group
                                ${isActive 
                                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' 
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'}
                              `}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <CategoryIcon icon={category.icon} isActive={isActive} />
                                <span className="truncate">{category.name}</span>
                              </div>
                              
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700'
                              }`}>
                                {catCount}
                              </span>
                            </button>
                          </div>

                          {/* Sub Categories */}
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
                                             {isEditMode && (
                                                <div {...provided.dragHandleProps} className="pr-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                                  <GripVertical className="w-3 h-3" />
                                                </div>
                                              )}
                                              <button
                                                onClick={(e) => scrollToSubSection(e, category.id, subCat.id)}
                                                className="flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors group/sub dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50"
                                              >
                                                <div className="flex items-center gap-2 truncate">
                                                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover/sub:text-slate-400 dark:text-slate-600 dark:group-hover/sub:text-slate-500" />
                                                  <span className="truncate">{subCat.name}</span>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 group-hover/sub:text-slate-600 dark:group-hover/sub:text-slate-400">
                                                  {subCount}
                                                </span>
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
