
import React, { Component, useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { Menu, Search, Settings, Edit, Lock, Languages, AlertTriangle, Moon, Sun, Laptop, Image as ImageIcon, ChevronDown, PlusCircle, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppData, LinkItem, CloudConfig, Language, Theme, Category } from './types';
import { loadData, saveData, loadCloudConfig, saveCloudConfig, uploadToCloud, downloadFromCloud, loadLanguage, saveLanguage, loadTheme, saveTheme } from './services/storageUtils';
import { TRANSLATIONS } from './translations';
import Sidebar from './components/Sidebar';
import LinkCard from './components/LinkCard';
import AdminModal from './components/AdminModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("NavHub Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">系统初始化异常</h2>
            <button onClick={() => window.location.reload()} className="bg-indigo-600 px-6 py-2 rounded-lg">刷新重试</button>
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

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const loadedData = loadData();
    setData(loadedData); 
    setCloudConfig(loadCloudConfig()); 
    setLang(loadLanguage()); 
    setTheme(loadTheme());
    if (loadedData.categories.length > 0) setActiveCategoryId(loadedData.categories[0].id);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    else if (theme === 'custom') root.classList.add('dark');
    else root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    if (!searchInputValue) { setActiveSearchQuery(''); return; }
    const timer = setTimeout(() => setActiveSearchQuery(searchInputValue), 500);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  const handleUpdateData = (newData: AppData) => { setData(newData); saveData(newData); };
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

  const startQuickAdd = (categoryId: string, subCategoryId: string = '') => {
    setInitialLinkData({ categoryId, subCategoryId });
    setIsAdminModalOpen(true);
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
    } else if (type === 'SIDEBAR_SUBCAT') {
      const parentCatId = source.droppableId.replace('sidebar-sub-', '');
      const newCats = data.categories.map(cat => {
        if (cat.id === parentCatId) {
          const newSubs = [...cat.subCategories];
          const [moved] = newSubs.splice(source.index, 1);
          newSubs.splice(destination.index, 0, moved);
          return { ...cat, subCategories: newSubs };
        }
        return cat;
      });
      handleUpdateData({ ...data, categories: newCats });
    } else if (type === 'LINK') {
      const sourceParts = source.droppableId.split('__');
      const destParts = destination.droppableId.split('__');
      
      const sourceCatId = sourceParts[1];
      const sourceSubId = sourceParts[2] === 'GENERAL' ? '' : sourceParts[2];
      const destCatId = destParts[1];
      const destSubId = destParts[2] === 'GENERAL' ? '' : destParts[2];

      const linkToMove = data.links.filter(l => l.categoryId === sourceCatId && l.subCategoryId === sourceSubId)[source.index];
      if (!linkToMove) return;

      const otherLinks = data.links.filter(l => l.id !== linkToMove.id);
      const updatedLink = { ...linkToMove, categoryId: destCatId, subCategoryId: destSubId };
      
      const destItems = otherLinks.filter(l => l.categoryId === destCatId && l.subCategoryId === destSubId);
      const targetIndexInGlobal = otherLinks.indexOf(destItems[destination.index]) === -1 
        ? otherLinks.length 
        : otherLinks.indexOf(destItems[destination.index]);

      const newLinks = [...otherLinks];
      newLinks.splice(targetIndexInGlobal, 0, updatedLink);
      
      handleUpdateData({ ...data, links: newLinks });
    }
  };

  const renderQuickAddCard = (categoryId: string, subCategoryId: string = '') => (
    <button
      onClick={() => startQuickAdd(categoryId, subCategoryId)}
      className="group relative rounded-xl border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition-all hover:bg-slate-50 hover:border-indigo-300 dark:border-slate-700 dark:hover:bg-slate-800/50"
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-500 dark:bg-slate-800">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">添加链接</span>
    </button>
  );

  if (isLoading) return null;

  const filteredLinks = activeSearchQuery 
    ? data.links.filter(l => l.title.toLowerCase().includes(activeSearchQuery.toLowerCase()))
    : data.links;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 transition-colors ${theme === 'custom' ? 'bg-cover bg-center bg-fixed' : ''}`} style={theme === 'custom' && data.siteConfig?.backgroundUrl ? { backgroundImage: `url(${data.siteConfig.backgroundUrl})` } : {}}>
        {theme === 'custom' && <div className="absolute inset-0 bg-black/40 pointer-events-none fixed z-0" />}
        <Sidebar 
          categories={data.categories} 
          links={data.links} 
          activeCategoryId={activeCategoryId} 
          onSelectCategory={setActiveCategoryId} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          t={t} 
          isEditMode={isEditMode} 
          siteConfig={data.siteConfig} 
          theme={theme} 
        />
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
          <header className={`h-16 flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5`}>
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 dark:text-slate-300"><Menu className="w-5 h-5" /></button>
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t.app.searchPlaceholder} 
                  value={searchInputValue} 
                  onChange={(e) => setSearchInputValue(e.target.value)} 
                  className="w-full pl-10 pr-10 py-2 bg-slate-100/50 rounded-full text-sm outline-none dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-500" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">{theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'system' ? <Laptop className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}</button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-32 z-50">
                  <div className="bg-white rounded-lg shadow-xl border p-1 dark:bg-slate-800 dark:border-slate-700">
                    {(['light', 'dark', 'system', 'custom'] as const).map(m => (
                      <button key={m} onClick={() => { setTheme(m as Theme); saveTheme(m as Theme); }} className="w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-700 capitalize dark:text-slate-200">
                        {t.app.theme[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => { const nl = lang === 'en' ? 'zh' : 'en'; setLang(nl); saveLanguage(nl); }} className="p-2 text-slate-400 flex items-center gap-1 uppercase text-sm font-bold hover:text-indigo-500 transition-colors"><Languages className="w-5 h-5" /> {lang}</button>
              
              {/* 这里是修正后的图标逻辑 */}
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`p-2 rounded-lg transition-all duration-300 ${isEditMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title={isEditMode ? "锁定并保存" : "进入编辑模式"}
              >
                {/* 
                   逻辑说明：
                   - 如果 isEditMode 为 true（正在编辑）：显示 Lock 图标，意为“点击加锁保存”。
                   - 如果 isEditMode 为 false（未在编辑）：显示 Edit 图标，意为“点击开始编辑”。
                */}
                {isEditMode ? <Lock className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
              </button>

              <button onClick={() => setIsAdminModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 dark:bg-indigo-600 hover:scale-105 transition-transform shadow-lg"><Settings className="w-4 h-4" /> 后台管理</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12">
            {activeSearchQuery ? (
              <section>
                <h2 className="text-xl font-bold mb-6 dark:text-white">搜索结果</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredLinks.length > 0 ? filteredLinks.map(link => (<LinkCard key={link.id} item={link} isEditMode={false} onEdit={() => {}} onDelete={() => {}} t={t} />)) : <p className="text-slate-500 dark:text-slate-400">未找到相关链接</p>}
                </div>
              </section>
            ) : data.categories.map(category => {
              const isCollapsed = collapsedCategories.has(category.id);
              const hasSubCats = category.subCategories.length > 0;
              const generalLinks = data.links.filter(l => l.categoryId === category.id && (!l.subCategoryId || !hasSubCats));

              return (
                <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                  <div 
                    className="flex items-center gap-4 mb-6 group/title cursor-pointer select-none"
                    onDoubleClick={() => toggleCollapse(category.id)}
                  >
                    <ChevronDown className={`w-8 h-8 text-slate-800 transition-transform duration-300 dark:text-white ${isCollapsed ? '-rotate-90' : ''}`} />
                    <h2 className="text-2xl font-bold text-slate-800 drop-shadow-sm dark:text-white">
                      {category.name}
                      {isCollapsed && <span className="text-xs font-normal text-slate-400 ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity">双击展开</span>}
                    </h2>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                      {(!hasSubCats || generalLinks.length > 0 || isEditMode) && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase"># GENERAL</span>
                          </div>
                          <Droppable droppableId={`links__${category.id}__GENERAL`} type="LINK" direction="horizontal">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[50px]">
                                {generalLinks.map((link, index) => (
                                  <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                    {(provided) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <LinkCard item={link} isEditMode={isEditMode} onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} onDelete={(id) => confirmAction("删除", "确定删除该链接？", () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} t={t} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {isEditMode && renderQuickAddCard(category.id)}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}

                      {hasSubCats && category.subCategories.map(sub => (
                        <div key={sub.id} id={`subcat-${sub.id}`} className="mb-8 last:mb-0">
                          <div className="flex items-center gap-2 mb-4 group/sub">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase truncate max-w-[200px]"># {sub.name}</span>
                          </div>
                          <Droppable droppableId={`links__${category.id}__${sub.id}`} type="LINK" direction="horizontal">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[50px]">
                                {data.links.filter(l => l.categoryId === category.id && l.subCategoryId === sub.id).map((link, index) => (
                                  <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                    {(provided) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <LinkCard item={link} isEditMode={isEditMode} onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} onDelete={(id) => confirmAction("删除", "确定删除该链接？", () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} t={t} />
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

          <AdminModal 
            isOpen={isAdminModalOpen} 
            onClose={() => { setIsAdminModalOpen(false); setEditingItem(null); setInitialLinkData(null); }} 
            data={data} 
            onUpdateData={handleUpdateData} 
            cloudConfig={cloudConfig} 
            onUpdateCloudConfig={(c) => { setCloudConfig(c); saveCloudConfig(c); }} 
            onSyncUpload={async (c) => { setIsSyncing(true); const res = await uploadToCloud(data, c || cloudConfig); setIsSyncing(false); showToast(res.success ? 'success' : 'error', res.message); }} 
            onSyncDownload={async (c) => { const res = await downloadFromCloud(c || cloudConfig); if(res.success && res.data) { handleUpdateData(res.data); showToast('success', "下载成功"); } }} 
            isSyncing={isSyncing} 
            editingItem={editingItem} 
            initialValues={initialLinkData} 
            t={t} 
            showToast={showToast} 
            confirmAction={confirmAction} 
          />
          
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({...p, isOpen: false}))} isDangerous={confirmState.isDangerous} />
        </main>
      </div>
    </DragDropContext>
  );
};

const App: React.FC = () => (<ErrorBoundary><Dashboard /></ErrorBoundary>);
export default App;
