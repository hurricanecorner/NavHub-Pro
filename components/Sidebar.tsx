import React, { useState } from 'react';
import { Category, LinkItem } from '../types';
import { LayoutGrid, Hash, ChevronRight, Folder } from 'lucide-react';

interface SidebarProps {
  categories: Category[];
  links: LinkItem[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  t: any;
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

const Sidebar: React.FC<SidebarProps> = ({ categories, links, activeCategoryId, onSelectCategory, isOpen, setIsOpen, t }) => {
  
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
        fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static dark:bg-slate-900 dark:border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl dark:text-indigo-400">
            <LayoutGrid className="w-6 h-6" />
            <span>{t.app.title}</span>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {categories.map((category) => {
            const isActive = activeCategoryId === category.id;
            const catCount = getCategoryCount(category.id);

            return (
              <div key={category.id} className="space-y-1">
                <button
                  onClick={() => scrollToSection(category.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors group
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
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

                {/* Sub Categories */}
                {isActive && category.subCategories.length > 0 && (
                  <div className="pl-11 pr-2 space-y-0.5 animate-fadeIn">
                    {category.subCategories.map(subCat => {
                      const subCount = getSubCategoryCount(category.id, subCat.id);
                      return (
                        <button
                          key={subCat.id}
                          onClick={(e) => scrollToSubSection(e, category.id, subCat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors group/sub dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover/sub:text-slate-400 dark:text-slate-600 dark:group-hover/sub:text-slate-500" />
                            <span className="truncate">{subCat.name}</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 group-hover/sub:text-slate-600 dark:group-hover/sub:text-slate-400">
                            {subCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;