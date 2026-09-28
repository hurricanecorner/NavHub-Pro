import React, { useState, useMemo } from 'react';
import { Category, LinkItem, SiteConfig, Theme } from '../types';
import { 
  LayoutGrid, Hash, ChevronRight, ChevronDown, Folder, FolderPlus, GripVertical, 
  Tag, Tags, X, Flame, TrendingUp, Plus, PlusCircle, Edit2, Trash2, Check, Sliders
} from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { normalizeIconForDisplay } from '../services/highResIconService';
import { CategoryIconDisplay } from '../services/categoryIconService';
import { CategoryIconPickerModal } from './CategoryIconPickerModal';

interface SidebarProps {
  categories: Category[];
  links: LinkItem[];
  tagOrder?: string[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  activeTagFilter?: string;
  onSelectTagFilter?: (tag: string) => void;
  onClearTagFilter?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  t: any;
  isEditMode: boolean;
  siteConfig?: SiteConfig;
  theme?: Theme;
  onAddCategory?: (name: string, icon?: string) => void;
  onUpdateCategory?: (id: string, name: string, icon?: string) => void;
  onDeleteCategory?: (id: string) => void;
  onAddSubCategory?: (categoryId: string, name: string) => void;
  onUpdateSubCategory?: (categoryId: string, subId: string, name: string) => void;
  onDeleteSubCategory?: (categoryId: string, subId: string) => void;
}


const Sidebar: React.FC<SidebarProps> = ({ 
  categories, 
  links, 
  tagOrder,
  activeCategoryId, 
  onSelectCategory, 
  activeTagFilter,
  onSelectTagFilter,
  onClearTagFilter,
  isOpen, 
  setIsOpen, 
  t, 
  isEditMode, 
  siteConfig, 
  theme,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubCategory,
  onUpdateSubCategory,
  onDeleteSubCategory
}) => {
  const isCustom = theme === 'custom';
  const [isTagPoolCollapsed, setIsTagPoolCollapsed] = useState(false);

  // Quick edit states for sidebar in edit mode
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const [addingSubToCatId, setAddingSubToCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editSubCatName, setEditSubCatName] = useState('');

  // Icon picker state
  const [catIconPickerTarget, setCatIconPickerTarget] = useState<{
    id: string;
    name: string;
    icon?: string;
    subCategoryNames: string[];
  } | null>(null);

  const handleSaveNewCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleSaveEditCategory = (catId: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed) return;
    if (onUpdateCategory) {
      onUpdateCategory(catId, trimmed);
    }
    setEditingCatId(null);
  };

  const handleSaveNewSubCategory = (catId: string) => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    if (onAddSubCategory) {
      onAddSubCategory(catId, trimmed);
    }
    setNewSubName('');
    setAddingSubToCatId(null);
  };

  const handleSaveEditSubCategory = (catId: string, subId: string) => {
    const trimmed = editSubCatName.trim();
    if (!trimmed) return;
    if (onUpdateSubCategory) {
      onUpdateSubCategory(catId, subId, trimmed);
    }
    setEditingSubCatId(null);
  };

  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    links.forEach(l => {
      l.tags?.forEach(tag => {
        const clean = tag.trim();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    const list = Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
    
    if (tagOrder && tagOrder.length > 0) {
      const orderMap = new Map<string, number>();
      tagOrder.forEach((tName, i) => orderMap.set(tName, i));
      return list.sort((a, b) => {
        const hasA = orderMap.has(a.tag);
        const hasB = orderMap.has(b.tag);
        if (hasA && hasB) {
          return orderMap.get(a.tag)! - orderMap.get(b.tag)!;
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return b.count - a.count || a.tag.localeCompare(b.tag);
      });
    }

    return list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [links, tagOrder]);

  const frequentCount = useMemo(() => {
    const urlSet = new Set<string>();
    links.forEach(l => {
      const key = (l.url || '').toLowerCase().trim().replace(/\/+$/, '') || l.id;
      urlSet.add(key);
    });
    return Math.min(urlSet.size, 100);
  }, [links]);

  const scrollToSection = (id: string) => {
    if (onClearTagFilter) onClearTagFilter();
    onSelectCategory(id);
    const element = document.getElementById(
      id === 'frequent' 
        ? 'category-frequent' 
        : id === 'trends' 
          ? 'weekly-trends-section' 
          : id === 'tags'
            ? 'tag-pool-section'
            : `category-${id}`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) setIsOpen(false);
  };
  const scrollToSubSection = (e: React.MouseEvent, catId: string, subId: string) => {
    e.stopPropagation();
    if (onClearTagFilter) onClearTagFilter();
    if (activeCategoryId !== catId) onSelectCategory(catId);
    const element = document.getElementById(`subcat-${subId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.innerWidth < 1024) setIsOpen(false);
  };
  const getCategoryCount = (catId: string) => links.filter(l => l.categoryId === catId).length;
  const getSubCategoryCount = (catId: string, subId: string) => links.filter(l => l.categoryId === catId && l.subCategoryId === subId).length;

  const getLogoShapeClass = (shape?: string) => {
    switch(shape) {
      case 'circle': return 'rounded-full';
      case 'rounded': return 'rounded-[38%]'; // Xiaomi superellipse style
      case 'square': return 'rounded-none';
      default: return 'rounded-none';
    }
  };

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
          <div className={`flex items-center gap-3 font-black text-xl overflow-hidden tracking-[0.05em] ${isCustom ? 'text-white' : 'text-brand-600 dark:text-zinc-100'}`}>
            {siteConfig?.logoUrl ? (
              <div 
                className={`w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden shadow-sm bg-white dark:bg-zinc-700 ${getLogoShapeClass(siteConfig.logoShape)}`}
              >
                <img 
                  src={normalizeIconForDisplay(siteConfig.logoUrl)} 
                  alt="Logo" 
                  className="w-full h-full object-contain select-none transform-gpu scale-100" 
                />
              </div>
            ) : (
              <LayoutGrid className="w-6 h-6 shrink-0" />
            )}
            <span className="truncate">{siteConfig?.title || t.app.title}</span>
          </div>
        </div>
        <div className="p-4 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
          {/* Permanent "常用" (Frequent) Main Category - Anchored at the top */}
          <div className="mb-2">
            <button
              onClick={() => scrollToSection('frequent')}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black tracking-[0.04em] transition-all group border
                ${isCustom 
                  ? (activeCategoryId === 'frequent' ? 'bg-white/20 text-white shadow-sm border-white/10 backdrop-blur-sm' : 'text-slate-100 hover:bg-white/10 hover:text-white border-transparent')
                  : (activeCategoryId === 'frequent' ? 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50' : 'text-slate-700 hover:bg-amber-50/60 hover:text-amber-600 border-transparent dark:text-zinc-300 dark:hover:bg-zinc-700/50 dark:hover:text-amber-400')
                }
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                  <Flame className="w-4 h-4 fill-amber-500/20" />
                </div>
                <span className="truncate uppercase font-black">{t.app.frequent || '常用'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                  isCustom 
                    ? (activeCategoryId === 'frequent' ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-200 group-hover:bg-white/10 group-hover:text-white')
                    : (activeCategoryId === 'frequent' ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200' : 'bg-amber-100/70 text-amber-700 group-hover:bg-amber-200/80 dark:bg-zinc-900 dark:text-amber-400')
                }`}>
                  {frequentCount}
                </span>
              </div>
            </button>
          </div>

          {/* Quick Add Main Category button at top of categories list in Edit Mode */}
          {isEditMode && (
            <div className="mb-2">
              {isAddingCategory ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border-2 border-brand-500 shadow-md animate-in fade-in zoom-in-95 duration-150 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <FolderPlus className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      {t.admin?.category?.new || '新建主分类'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveNewCategory();
                        else if (e.key === 'Escape') setIsAddingCategory(false);
                      }}
                      autoFocus
                      placeholder="分类名称 (如：常用工具)..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-black outline-none focus:border-brand-500 dark:text-white shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCategory}
                      disabled={!newCatName.trim()}
                      className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-black shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>创建</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(true);
                    setNewCatName('');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 border-dashed border-brand-300/80 dark:border-brand-700/60 bg-brand-50/50 hover:bg-brand-100/60 dark:bg-brand-950/30 dark:hover:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-black transition-all shadow-2xs hover:scale-[1.01] active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ {t.admin?.category?.new || '新增主分类'}</span>
                </button>
              )}
            </div>
          )}

          <Droppable droppableId="sidebar-categories" type="SIDEBAR_CATEGORY">
            {(provided) => (
              <nav ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                {categories.map((category, index) => {
                  const isActive = activeCategoryId === category.id;
                  const catCount = getCategoryCount(category.id);
                  const isExpanded = isActive || (isEditMode && expandedCatIds.has(category.id));
                  const isEditingThisCat = editingCatId === category.id;

                  return (
                    <Draggable key={category.id} draggableId={`sidebar-cat-${category.id}`} index={index} isDragDisabled={!isEditMode}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="space-y-1">
                          <div className="flex items-center group/item w-full">
                            {isEditMode && (
                              <div {...provided.dragHandleProps} className="pl-1 pr-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}

                            {isEditingThisCat ? (
                              <div className="flex-1 flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-700/80 border-2 border-brand-500 shadow-sm animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => setCatIconPickerTarget({
                                    id: category.id,
                                    name: editCatName || category.name,
                                    icon: category.icon,
                                    subCategoryNames: category.subCategories.map(s => s.name)
                                  })}
                                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 hover:scale-105 transition-transform shrink-0 border border-slate-200 dark:border-white/10"
                                  title="点击更换图标"
                                >
                                  <CategoryIconDisplay category={{ name: editCatName || category.name, icon: category.icon }} className="w-4 h-4" />
                                </button>
                                <input
                                  type="text"
                                  value={editCatName}
                                  onChange={e => setEditCatName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveEditCategory(category.id);
                                    else if (e.key === 'Escape') setEditingCatId(null);
                                  }}
                                  autoFocus
                                  placeholder="主分类名称..."
                                  className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-zinc-800 text-xs font-black rounded-lg border border-slate-200 dark:border-white/10 outline-none text-slate-800 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(category.id)}
                                  className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shrink-0 shadow-2xs"
                                  title="保存"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCatId(null)}
                                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-500 dark:text-zinc-300 shrink-0"
                                  title="取消"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => scrollToSection(category.id)}
                                className={`
                                  flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-black tracking-[0.04em] transition-all group border
                                  ${isCustom 
                                    ? (isActive ? 'bg-white/20 text-white shadow-sm border-white/10 backdrop-blur-sm' : 'text-slate-100 hover:bg-white/10 hover:text-white border-transparent')
                                    : (isActive ? 'bg-brand-50 text-brand-600 border-transparent dark:bg-zinc-700 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-100')
                                  }
                                `}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                                  <div
                                    onClick={(e) => {
                                      if (isEditMode) {
                                        e.stopPropagation();
                                        setCatIconPickerTarget({
                                          id: category.id,
                                          name: category.name,
                                          icon: category.icon,
                                          subCategoryNames: category.subCategories.map(s => s.name)
                                        });
                                      }
                                    }}
                                    className={isEditMode ? "hover:scale-110 transition-transform cursor-pointer relative group/icon shrink-0" : "shrink-0"}
                                    title={isEditMode ? "点击更换图标" : undefined}
                                  >
                                    <CategoryIconDisplay category={category} isActive={isActive} theme={theme} className="w-5 h-5 shrink-0" />
                                    {isEditMode && (
                                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity">
                                        <Sliders className="w-1.5 h-1.5 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <span className="truncate uppercase">{category.name}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {isEditMode ? (
                                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                      {/* Quick add subcategory */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedCatIds(prev => new Set([...prev, category.id]));
                                          setAddingSubToCatId(category.id);
                                          setNewSubName('');
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-600 transition-colors"
                                        title={t.admin?.category?.newSub || "新增子分类"}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Rename category */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCatId(category.id);
                                          setEditCatName(category.name);
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-600 transition-colors"
                                        title={t.admin?.category?.edit || "重命名主分类"}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Delete category */}
                                      <button
                                        type="button"
                                        onClick={() => onDeleteCategory && onDeleteCategory(category.id)}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                        title="删除主分类"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Expand/collapse chevron */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedCatIds(prev => {
                                            const next = new Set(prev);
                                            if (next.has(category.id)) next.delete(category.id);
                                            else next.add(category.id);
                                            return next;
                                          });
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                                        title={isExpanded ? "收起子分类" : "展开子分类"}
                                      >
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                                      isCustom 
                                        ? (isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-200 group-hover:bg-white/10 group-hover:text-white')
                                        : (isActive ? 'bg-brand-100 text-brand-700 dark:bg-zinc-800 dark:text-zinc-400' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-500 dark:group-hover:bg-zinc-800')
                                    }`}>
                                      {catCount}
                                    </span>
                                  )}
                                </div>
                              </button>
                            )}
                          </div>

                          {(isExpanded && (category.subCategories.length > 0 || isEditMode)) && (
                            <Droppable droppableId={`sidebar-sub-${category.id}`} type="SIDEBAR_SUBCAT">
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef} 
                                  {...provided.droppableProps} 
                                  className={`pl-8 pr-2 space-y-1 animate-fadeIn ${category.subCategories.length === 0 && !snapshot.isDraggingOver && !isEditMode ? 'hidden' : ''}`}
                                  style={{minHeight: isEditMode || snapshot.isDraggingOver ? '10px' : '0'}}
                                >
                                  {category.subCategories.map((subCat, subIndex) => {
                                    const subCount = getSubCategoryCount(category.id, subCat.id);
                                    const isEditingThisSub = editingSubCatId === subCat.id;

                                    return (
                                      <Draggable key={subCat.id} draggableId={`sidebar-sub-${subCat.id}`} index={subIndex} isDragDisabled={!isEditMode}>
                                        {(provided) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center group/subRow w-full">
                                            {isEditMode && (
                                              <div {...provided.dragHandleProps} className="pr-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0">
                                                <GripVertical className="w-3 h-3" />
                                              </div>
                                            )}

                                            {isEditingThisSub ? (
                                              <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-700/80 border border-brand-500 shadow-xs animate-in fade-in duration-150">
                                                <input
                                                  type="text"
                                                  value={editSubCatName}
                                                  onChange={e => setEditSubCatName(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEditSubCategory(category.id, subCat.id);
                                                    else if (e.key === 'Escape') setEditingSubCatId(null);
                                                  }}
                                                  autoFocus
                                                  placeholder="子分类名称..."
                                                  className="flex-1 min-w-0 px-2 py-0.5 bg-white dark:bg-zinc-800 text-xs font-bold rounded border border-slate-200 dark:border-white/10 outline-none text-slate-800 dark:text-white"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveEditSubCategory(category.id, subCat.id)}
                                                  className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                                                  title="保存"
                                                >
                                                  <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingSubCatId(null)}
                                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-500 dark:text-zinc-300 shrink-0"
                                                  title="取消"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ) : (
                                              <button 
                                                onClick={(e) => scrollToSubSection(e, category.id, subCat.id)} 
                                                className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors group/sub ${isCustom ? 'text-slate-200 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}
                                              >
                                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                                  <ChevronRight className={`w-3 h-3 shrink-0 ${isCustom ? 'text-slate-300 group-hover/sub:text-slate-100' : 'text-slate-300 group-hover/sub:text-zinc-400 dark:text-zinc-500 dark:group-hover/sub:text-zinc-300'}`} />
                                                  <span className="truncate uppercase">{subCat.name}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                  {isEditMode ? (
                                                    <div className="flex items-center gap-0.5 opacity-80 group-hover/subRow:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setEditingSubCatId(subCat.id);
                                                          setEditSubCatName(subCat.name);
                                                        }}
                                                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-600 transition-colors"
                                                        title="重命名子分类"
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => onDeleteSubCategory && onDeleteSubCategory(category.id, subCat.id)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                                        title="删除子分类"
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className={`text-[10px] font-bold ${isCustom ? 'text-slate-300 group-hover/sub:text-slate-100' : 'text-slate-400 group-hover/sub:text-slate-600 dark:group-hover/sub:text-zinc-500'}`}>{subCount}</span>
                                                  )}
                                                </div>
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}

                                  {/* Quick Add Subcategory Inline in Edit Mode */}
                                  {isEditMode && (
                                    addingSubToCatId === category.id ? (
                                      <div className="flex items-center gap-1 pl-2 pr-1 py-1.5 animate-in fade-in duration-150">
                                        <input
                                          type="text"
                                          value={newSubName}
                                          onChange={e => setNewSubName(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveNewSubCategory(category.id);
                                            else if (e.key === 'Escape') setAddingSubToCatId(null);
                                          }}
                                          autoFocus
                                          placeholder="输入子分类名称..."
                                          className="flex-1 min-w-0 px-2.5 py-1 bg-white dark:bg-zinc-700/90 text-xs font-bold rounded-lg border border-brand-400 dark:border-brand-500 outline-none text-slate-800 dark:text-white shadow-2xs"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveNewSubCategory(category.id)}
                                          disabled={!newSubName.trim()}
                                          className="p-1 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-bold shrink-0 shadow-2xs cursor-pointer"
                                          title="确定新增"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAddingSubToCatId(null)}
                                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-400 dark:text-zinc-400 shrink-0"
                                          title="取消"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="pl-2 pr-1 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddingSubToCatId(category.id);
                                            setNewSubName('');
                                          }}
                                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-brand-400 dark:hover:border-brand-500 text-slate-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-xs font-bold transition-all cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>{t.admin?.category?.newSub || '新增子分类'}</span>
                                        </button>
                                      </div>
                                    )
                                  )}
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

          {/* Tag Pool Section */}
          {tagStats.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-3 px-2">
                <button
                  onClick={() => setIsTagPoolCollapsed(!isTagPoolCollapsed)}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
                >
                  <Tags className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                  <span>{t.app.tagPool || '标签池'}</span>
                  {isEditMode && (
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 lowercase px-1.5 py-0.2 rounded-md bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800">
                      {t.app.dragToReorderTags || '拖拽排序'}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isCustom 
                      ? 'bg-white/10 text-slate-200' 
                      : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {tagStats.length}
                  </span>
                  {activeTagFilter && onClearTagFilter && (
                    <button
                      onClick={onClearTagFilter}
                      className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 px-1 py-0.5"
                      title={t.app.clearTagFilter || '清除筛选'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {!isTagPoolCollapsed && (
                <Droppable droppableId="sidebar-tag-pool" type="TAG" direction="horizontal">
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-wrap gap-1.5 px-1 animate-in fade-in duration-200 rounded-xl transition-colors ${
                        snapshot.isDraggingOver 
                          ? 'bg-brand-500/10 ring-2 ring-brand-500/30 p-1' 
                          : ''
                      }`}
                    >
                      {tagStats.map(({ tag, count }, tagIndex) => {
                        const isSelected = activeTagFilter === tag;
                        return (
                          <Draggable 
                            key={`sidebar-tag-${tag}`} 
                            draggableId={`sidebar-tag-${tag}`} 
                            index={tagIndex} 
                            isDragDisabled={!isEditMode}
                          >
                            {(provided, snap) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`inline-flex ${snap.isDragging ? 'z-[999] opacity-90 scale-105 shadow-lg' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      if (onClearTagFilter) onClearTagFilter();
                                    } else if (onSelectTagFilter) {
                                      onSelectTagFilter(tag);
                                      if (window.innerWidth < 1024) setIsOpen(false);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                                    isEditMode 
                                      ? 'cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-brand-400' 
                                      : ''
                                  } ${
                                    isSelected
                                      ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                                      : isCustom
                                      ? 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white border border-white/5'
                                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-700/60 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white border border-transparent'
                                  }`}
                                >
                                  {isEditMode && (
                                    <GripVertical className="w-2.5 h-2.5 opacity-50 -ml-1 shrink-0" />
                                  )}
                                  <span className="truncate">#{tag}</span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-black/5 dark:bg-white/10 text-slate-400 dark:text-zinc-400'
                                  }`}>
                                    {count}
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

          {/* Quick Jump: Weekly Trends - Placed below the Tag Pool */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={() => scrollToSection('trends')}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-black tracking-[0.04em] transition-all group border
                ${isCustom 
                  ? (activeCategoryId === 'trends' ? 'bg-white/20 text-white shadow-sm border-white/10 backdrop-blur-sm' : 'text-slate-100 hover:bg-white/10 hover:text-white border-transparent')
                  : (activeCategoryId === 'trends' ? 'bg-brand-50 text-brand-600 border-brand-200/60 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-700/50' : 'text-slate-700 hover:bg-brand-50/60 hover:text-brand-600 border-transparent dark:text-zinc-300 dark:hover:bg-zinc-700/50 dark:hover:text-brand-400')
                }
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-1 rounded-lg bg-brand-500/10 text-brand-500 shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="truncate uppercase font-black">{t.app?.weeklyTrendsTitle || '趋势'}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                isCustom 
                  ? 'bg-white/10 text-white' 
                  : (activeCategoryId === 'trends' ? 'bg-brand-200 text-brand-900 dark:bg-brand-900/60 dark:text-brand-200' : 'bg-brand-100/70 text-brand-700 dark:bg-zinc-900 dark:text-brand-400')
              }`}>
                7D
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Category Icon Picker Modal for Sidebar */}
      {catIconPickerTarget && (
        <CategoryIconPickerModal
          isOpen={true}
          onClose={() => setCatIconPickerTarget(null)}
          categoryName={catIconPickerTarget.name}
          subCategoryNames={catIconPickerTarget.subCategoryNames}
          currentIcon={catIconPickerTarget.icon}
          onApplyIcon={(newIcon) => {
            if (onUpdateCategory && catIconPickerTarget.id) {
              onUpdateCategory(catIconPickerTarget.id, catIconPickerTarget.name, newIcon);
            }
            setCatIconPickerTarget(null);
          }}
        />
      )}
    </>
  );
};
export default Sidebar;