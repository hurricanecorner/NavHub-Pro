
import React, { Component, useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { Menu, Search, Settings, Edit, Lock, Languages, AlertTriangle, Moon, Sun, Laptop, Image as ImageIcon, ChevronDown, PlusCircle, Plus, LayoutGrid } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppData, LinkItem, CloudConfig, Language, Theme, Category } from './types';
import { loadData, saveData, loadCloudConfig, saveCloudConfig, uploadToCloud, downloadFromCloud, loadLanguage, saveLanguage, loadTheme, saveTheme } from './services/storageUtils';
import { TRANSLATIONS } from './translations';
import Sidebar from './components/Sidebar';
import LinkCard from './components/LinkCard';
import AdminModal from './components/AdminModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

// 定义预设色板
export const COLOR_PALETTES: Record<string, Record<number, string>> = {
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#1e1b4b', 950: '#171717' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
};

export const applyThemeColor = (colorName: string) => {
  const palette = COLOR_PALETTES[colorName] || COLOR_PALETTES.indigo;
  const root = document.documentElement;
  Object.entries(palette).forEach(([shade, hex]) => {
    root.style.setProperty(`--brand-${shade}`, hex);
  });
};

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(_: Error): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("NavHub Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-800 text-white p-6">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">System Initialization Error</h2>
            <button onClick={() => window.location.reload()} className="bg-brand-600 px-6 py-2 rounded-lg">Retry</button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<AppData>({ categories: [], links: [] });
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ enabled: false, activeProvider: 'github', githubToken: '', gistId: '', notionToken: '', notionPageId: '' });
  const [lang, setLang] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
  const [initialLinkData, setInitialLinkData] = useState<{ categoryId: string; subCategoryId: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous: boolean; }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });
  const [pageReady, setPageReady] = useState(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const loadedData = loadData();
    setData(loadedData); 
    setCloudConfig(loadCloudConfig()); 
    setLang(loadLanguage()); 
    setTheme(loadTheme());
    if (loadedData.siteConfig?.themeColor) applyThemeColor(loadedData.siteConfig.themeColor);
    if (loadedData.categories.length > 0) setActiveCategoryId(loadedData.categories[0].id);
    setIsLoading(false);
    const timer = setTimeout(() => setPageReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    else if (theme === 'custom') root.classList.add('dark');
    else root.classList.add(theme);
  }, [theme]);

  const handleUpdateData = (newData: AppData) => { 
    setData(newData); saveData(newData);
    if (newData.siteConfig?.themeColor) applyThemeColor(newData.siteConfig.themeColor);
  };
  
  const showToast = (type: ToastType, message: string) => { const id = Date.now().toString(); setToasts(p => [...p, { id, type, message }]); };
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id));
  
  const confirmAction = (title: string, message: string, onConfirm: () => void, isDangerous = false) => { 
    setConfirmState({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmState(p => ({ ...p, isOpen: false })); }, isDangerous }); 
  };

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedCategories(next);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'SIDEBAR_CATEGORY') {
      const newCats = [...data.categories];
      const [moved] = newCats.splice(source.index, 1);
      newCats.splice(destination.index, 0, moved);
      handleUpdateData({ ...data, categories: newCats });
    } else if (type === 'LINK') {
      const sourceParts = source.droppableId.split('__');
      const destParts = destination.droppableId.split('__');
      
      const sourceCatId = sourceParts[1];
      const sourceSubCatId = sourceParts[2] === 'GENERAL' ? '' : sourceParts[2];
      const destCatId = destParts[1];
      const destSubCatId = destParts[2] === 'GENERAL' ? '' : destParts[2];

      // 1. 获取源容器中的链接列表并找到正在移动的项
      const sourceLinksInGroup = data.links.filter(l => l.categoryId === sourceCatId && (l.subCategoryId || '') === sourceSubCatId);
      const movedItem = sourceLinksInGroup[source.index];
      if (!movedItem) return;

      // 2. 从全局链接列表中移除该项
      const remainingLinks = data.links.filter(l => l.id !== movedItem.id);
      
      // 3. 确定目标容器及其在全局列表中的位置
      const destLinksInGroup = remainingLinks.filter(l => l.categoryId === destCatId && (l.subCategoryId || '') === destSubCatId);
      
      let globalInsertIndex: number;
      if (destLinksInGroup.length > 0 && destination.index < destLinksInGroup.length) {
        // 插入到目标位置的现有链接之前
        const targetNeighbor = destLinksInGroup[destination.index];
        globalInsertIndex = remainingLinks.findIndex(l => l.id === targetNeighbor.id);
      } else if (destLinksInGroup.length > 0) {
        // 插入到该组最后一个链接之后
        const lastNeighbor = destLinksInGroup[destLinksInGroup.length - 1];
        globalInsertIndex = remainingLinks.findIndex(l => l.id === lastNeighbor.id) + 1;
      } else {
        // 目标容器为空，直接追加到末尾（或者可以改进为寻找分类边界）
        globalInsertIndex = remainingLinks.length;
      }

      // 4. 更新链接的分类信息并执行插入
      const updatedItem = { ...movedItem, categoryId: destCatId, subCategoryId: destSubCatId };
      const newLinks = [...remainingLinks];
      newLinks.splice(globalInsertIndex, 0, updatedItem);
      
      handleUpdateData({ ...data, links: newLinks });
    }
  };

  const renderQuickAddCard = (categoryId: string, subCategoryId: string = '') => (
    <button onClick={() => { setInitialLinkData({ categoryId, subCategoryId }); setIsAdminModalOpen(true); }} className="group relative rounded-xl border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition-all hover:bg-zinc-50 hover:border-brand-300 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center transition-colors group-hover:bg-brand-50 group-hover:text-brand-500 dark:bg-zinc-800"><Plus className="w-6 h-6" /></div>
      <span className="text-xs font-black text-slate-400 group-hover:text-brand-500 transition-colors tracking-wider">{t.app.quickAdd}</span>
    </button>
  );

  if (isLoading) return null;
  const filteredLinks = activeSearchQuery ? data.links.filter(l => l.title.toLowerCase().includes(activeSearchQuery.toLowerCase())) : data.links;
  const gridColumns = data.siteConfig?.linkColumns || 4;
  const gridStyle = {
    display: 'grid', gap: '1.5rem',
    gridTemplateColumns: window.innerWidth < 640 ? 'repeat(1, minmax(0, 1fr))' : 
                         window.innerWidth < 1024 ? 'repeat(2, minmax(0, 1fr))' : `repeat(${gridColumns}, minmax(0, 1fr))`
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex h-screen bg-slate-50 text-slate-800 dark:bg-zinc-800 transition-colors ${theme === 'custom' ? 'bg-cover bg-center bg-fixed' : ''}`} style={theme === 'custom' && data.siteConfig?.backgroundUrl ? { backgroundImage: `url(${data.siteConfig.backgroundUrl})` } : {}}>
        {theme === 'custom' && <div className="absolute inset-0 bg-black/40 pointer-events-none fixed z-0" />}
        <div className={pageReady ? 'animate-fade-in' : 'opacity-0'}>
          <Sidebar categories={data.categories} links={data.links} activeCategoryId={activeCategoryId} onSelectCategory={setActiveCategoryId} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} t={t} isEditMode={isEditMode} siteConfig={data.siteConfig} theme={theme} />
        </div>
        <main className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-opacity duration-700 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 animate-slide-up">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 dark:text-zinc-100 transition-transform active:scale-90"><Menu className="w-5 h-5" /></button>
              <div className="relative max-w-md w-full hidden sm:block group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input type="text" placeholder={t.app.searchPlaceholder} value={searchInputValue} onChange={(e) => setSearchInputValue(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-slate-100/50 rounded-full text-sm font-black outline-none border border-transparent focus:border-brand-500/30 focus:bg-white dark:bg-zinc-700/50 dark:text-white dark:placeholder:text-zinc-400 transition-all tracking-wider" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-zinc-700 transition-all">{theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'system' ? <Laptop className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}</button>
                <div className="absolute right-0 top-full pt-2 opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:visible group-hover:scale-100 transition-all w-32 z-50 origin-top-right">
                  <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-1.5 dark:bg-zinc-800/90 dark:border-zinc-700">
                    {(['light', 'dark', 'system', 'custom'] as const).map(m => (
                      <button key={m} onClick={() => { setTheme(m as Theme); saveTheme(m as Theme); }} className={`w-full text-left px-3 py-2 text-xs font-black rounded-xl transition-all capitalize ${theme === m ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-700'}`}>{t.app.theme[m]}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => { const nl = lang === 'en' ? 'zh' : 'en'; setLang(nl); saveLanguage(nl); }} className="p-2 text-slate-400 flex items-center gap-1 uppercase text-sm font-black hover:text-brand-500 transition-colors tracking-widest"><Languages className="w-5 h-5" /> {lang}</button>
              <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg transition-all duration-300 ${isEditMode ? 'bg-brand-600 text-white shadow-lg ring-4 ring-brand-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-100'}`} title={isEditMode ? "Lock" : "Edit"}>{isEditMode ? <Lock className="w-5 h-5 animate-in zoom-in-50 duration-300" /> : <Edit className="w-5 h-5 animate-in zoom-in-50 duration-300" />}</button>
              <button onClick={() => setIsAdminModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 dark:bg-brand-600 hover:shadow-[0_8px_20px_-4px_rgba(var(--brand-600-rgb),0.5)] active:scale-95 transition-all tracking-wider"><Settings className="w-4 h-4" /> {t.app.admin}</button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12 custom-scrollbar">
            {activeSearchQuery ? (
              <section className={isEditMode ? '' : 'animate-slide-up'}>
                <h2 className="text-2xl font-black mb-8 dark:text-white flex items-center gap-3"><LayoutGrid className="text-brand-500" />{t.app.searchResults}</h2>
                <div style={gridStyle}>{filteredLinks.map((link, i) => <LinkCard key={link.id} item={link} isEditMode={false} onEdit={() => {}} onDelete={() => {}} t={t} />)}</div>
              </section>
            ) : data.categories.map((category, catIdx) => {
              const isCollapsed = collapsedCategories.has(category.id);
              const hasSubCats = category.subCategories.length > 0;
              const generalLinks = data.links.filter(l => l.categoryId === category.id && (!l.subCategoryId || !hasSubCats));
              return (
                <section key={category.id} id={`category-${category.id}`} className={`scroll-mt-24 ${isEditMode ? '' : 'animate-slide-up'}`} style={{ animationDelay: `${catIdx * 100}ms` }}>
                  <div className="flex items-center gap-4 mb-8 group/title cursor-pointer select-none" onDoubleClick={() => toggleCollapse(category.id)}>
                    <div className="p-2 bg-brand-500/5 rounded-xl dark:bg-brand-500/10 transition-colors group-hover/title:bg-brand-500/10"><ChevronDown className={`w-6 h-6 text-slate-800 transition-transform duration-500 dark:text-white ${isCollapsed ? '-rotate-90' : ''}`} /></div>
                    <h2 className="text-3xl font-black text-slate-800 drop-shadow-sm dark:text-white uppercase tracking-[0.05em]">{category.name}</h2>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-700/50 ml-4 opacity-40"></div>
                  </div>
                  {!isCollapsed && (
                    <div className="space-y-12">
                      {(!hasSubCats || generalLinks.length > 0 || isEditMode) && (
                        <Droppable droppableId={`links__${category.id}__GENERAL`} type="LINK" direction="horizontal">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} style={gridStyle} className="min-h-[50px]">
                              {generalLinks.map((link, index) => (
                                <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                  {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? "z-[999]" : "hover:z-10"}>
                                      <LinkCard item={link} isEditMode={isEditMode} isDragging={snapshot.isDragging} onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} t={t} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {isEditMode && renderQuickAddCard(category.id)}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      )}
                      {hasSubCats && category.subCategories.map((sub) => (
                        <div key={sub.id} id={`subcat-${sub.id}`} className="animate-fade-in">
                          <div className="flex items-center gap-3 mb-6 group/sub"><span className="text-sm font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.12em]"># {sub.name}</span></div>
                          <Droppable droppableId={`links__${category.id}__${sub.id}`} type="LINK" direction="horizontal">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} style={gridStyle} className="min-h-[50px]">
                                {data.links.filter(l => l.categoryId === category.id && l.subCategoryId === sub.id).map((link, index) => (
                                  <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                    {(provided, snapshot) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? "z-[999]" : "hover:z-10"}>
                                        <LinkCard item={link} isEditMode={isEditMode} isDragging={snapshot.isDragging} onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} t={t} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {isEditMode && renderQuickAddCard(category.id, sub.id)}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <AdminModal isOpen={isAdminModalOpen} onClose={() => { setIsAdminModalOpen(false); setEditingItem(null); setInitialLinkData(null); }} data={data} onUpdateData={handleUpdateData} cloudConfig={cloudConfig} onUpdateCloudConfig={(c) => { setCloudConfig(c); saveCloudConfig(c); }} onSyncUpload={async (c) => { setIsSyncing(true); const res = await uploadToCloud(data, c || cloudConfig); setIsSyncing(false); showToast(res.success ? 'success' : 'error', res.message); }} onSyncDownload={async (c) => { const res = await downloadFromCloud(c || cloudConfig); if(res.success && res.data) { handleUpdateData(res.data); showToast('success', t.app.success); } }} isSyncing={isSyncing} editingItem={editingItem} initialValues={initialLinkData} t={t} showToast={showToast} confirmAction={confirmAction} theme={theme} />
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({...p, isOpen: false}))} isDangerous={confirmState.isDangerous} />
        </main>
      </div>
    </DragDropContext>
  );
};

const App: React.FC = () => (<ErrorBoundary><Dashboard /></ErrorBoundary>);
export default App;
