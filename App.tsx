
import React, { useState, useEffect, useRef, ReactNode, ErrorInfo } from 'react';
import { Menu, Search, Settings, Edit, Lock, RefreshCw, CheckCircle2, AlertCircle, Languages, AlertTriangle, Loader2, Moon, Sun, Laptop, GripVertical, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppData, LinkItem, CloudConfig, Language, Theme } from './types';
import { loadData, saveData, loadCloudConfig, saveCloudConfig, uploadToCloud, downloadFromCloud, loadLanguage, saveLanguage, loadTheme, saveTheme } from './services/storageUtils';
import { TRANSLATIONS } from './translations';
import Sidebar from './components/Sidebar';
import LinkCard from './components/LinkCard';
import AdminModal from './components/AdminModal';

// Error Boundary Component Interface
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-4 dark:bg-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-red-900/20 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Something went wrong</h2>
            <p className="text-slate-500 mb-6 dark:text-slate-400">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<AppData>({ categories: [], links: [] });
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ 
    enabled: false, activeProvider: 'github', githubToken: '', gistId: '', notionToken: '', notionPageId: '' 
  });
  const [lang, setLang] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('system');
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  
  // Search State
  const [searchInputValue, setSearchInputValue] = useState(''); // Raw input
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // Debounced query for filtering
  const [isSearching, setIsSearching] = useState(false); // Loading indicator state
  
  // Admin State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
  const [initialLinkData, setInitialLinkData] = useState<{ categoryId: string; subCategoryId: string } | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Scroll to Top State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Translation Helper
  const t = TRANSLATIONS[lang];

  // Initialize
  useEffect(() => {
    const loadedData = loadData();
    const loadedConfig = loadCloudConfig();
    const loadedLang = loadLanguage();
    const loadedTheme = loadTheme();
    setData(loadedData);
    setCloudConfig(loadedConfig);
    setLang(loadedLang);
    setTheme(loadedTheme);
    if (loadedData.categories.length > 0) {
      setActiveCategoryId(loadedData.categories[0].id);
    }
    setIsLoading(false);
  }, []);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Search Debounce Effect
  useEffect(() => {
    if (!searchInputValue) {
      setActiveSearchQuery('');
      setIsSearching(false);
      return;
    }

    const loadingTimer = setTimeout(() => {
      setIsSearching(true);
    }, 200);

    const debounceTimer = setTimeout(() => {
      setActiveSearchQuery(searchInputValue);
      setIsSearching(false);
    }, 500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(debounceTimer);
      setIsSearching(false);
    };
  }, [searchInputValue]);

  const handleScroll = () => {
    if (mainContentRef.current) {
      const { scrollTop, scrollHeight } = mainContentRef.current;
      setShowScrollTop(scrollTop > scrollHeight / 2);
    }
  };

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUpdateData = (newData: AppData) => {
    setData(newData);
    saveData(newData);
    if (syncStatus === 'synced') {
      setSyncStatus('idle');
    }
  };

  const handleUpdateCloudConfig = (newConfig: CloudConfig) => {
    setCloudConfig(newConfig);
    saveCloudConfig(newConfig);
  };

  const handleToggleLanguage = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    saveLanguage(newLang);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleSyncUpload = async () => {
    if (!cloudConfig.enabled) {
      alert("Please enable cloud sync first.");
      return;
    }

    if (cloudConfig.activeProvider === 'github' && !cloudConfig.githubToken) {
      alert("Please configure GitHub Token.");
      return;
    }

    if (cloudConfig.activeProvider === 'notion' && (!cloudConfig.notionToken || !cloudConfig.notionPageId)) {
      alert("Please configure Notion Token and Page ID.");
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    
    const result = await uploadToCloud(data, cloudConfig);
    
    setIsSyncing(false);
    
    if (result.success) {
      setSyncStatus('synced');
      alert(t.admin.cloud.uploadSuccess);
      
      // Update config with new Gist ID if created (GitHub only)
      if (cloudConfig.activeProvider === 'github' && result.newGistId && result.newGistId !== cloudConfig.gistId) {
        const newConfig = { ...cloudConfig, gistId: result.newGistId };
        setCloudConfig(newConfig);
        saveCloudConfig(newConfig);
      }
      
      setTimeout(() => {
        setSyncStatus((prev) => prev === 'synced' ? 'idle' : prev);
      }, 5000);
    } else {
      setSyncStatus('error');
      alert(result.message);
    }
  };

  const handleSyncDownload = async () => {
     if (!cloudConfig.enabled) {
       alert("Please enable cloud sync first.");
       return;
     }

     if (cloudConfig.activeProvider === 'github' && (!cloudConfig.githubToken || !cloudConfig.gistId)) {
       alert("Please configure GitHub Token and Gist ID.");
       return;
     }

     if (cloudConfig.activeProvider === 'notion' && (!cloudConfig.notionToken || !cloudConfig.notionPageId)) {
       alert("Please configure Notion Token and Page ID.");
       return;
     }

     if (!window.confirm(t.admin.cloud.warning)) {
       return;
     }

     setIsSyncing(true);
     setSyncStatus('syncing');
     
     const result = await downloadFromCloud(cloudConfig);
     
     setIsSyncing(false);

     if (result.success && result.data) {
       setData(result.data);
       saveData(result.data);
       setSyncStatus('synced');
       alert(t.admin.cloud.downloadSuccess);
       setIsAdminModalOpen(false); 
     } else {
       setSyncStatus('error');
       alert(result.message);
     }
  };

  const handleDeleteLink = (id: string) => {
    if (window.confirm(t.app.deleteLinkConfirm)) {
      const updatedLinks = data.links.filter(l => l.id !== id);
      handleUpdateData({ ...data, links: updatedLinks });
    }
  };

  const handleEditLink = (item: LinkItem) => {
    setEditingItem(item);
    setIsAdminModalOpen(true);
  };

  const handleAddLinkShortcut = (categoryId: string, subCategoryId: string) => {
    setInitialLinkData({ categoryId, subCategoryId });
    setIsAdminModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAdminModalOpen(false);
    setEditingItem(null);
    setInitialLinkData(null);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'SIDEBAR_CATEGORY') {
      const newCategories = [...data.categories];
      const [movedCategory] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, movedCategory);
      handleUpdateData({ ...data, categories: newCategories });
      return;
    }

    if (type === 'SIDEBAR_SUBCAT') {
      const catId = source.droppableId.replace('sidebar-sub-', '');
      const catIndex = data.categories.findIndex(c => c.id === catId);
      if (catIndex === -1) return;

      const newCategories = [...data.categories];
      const newSubCategories = [...newCategories[catIndex].subCategories];
      const [movedSubCat] = newSubCategories.splice(source.index, 1);
      newSubCategories.splice(destination.index, 0, movedSubCat);

      newCategories[catIndex] = { ...newCategories[catIndex], subCategories: newSubCategories };
      handleUpdateData({ ...data, categories: newCategories });
      return;
    }

    if (type === 'SUBCAT') {
      const sourceCatId = source.droppableId.replace('cat-', '');
      const destCatId = destination.droppableId.replace('cat-', '');

      const sourceCatIndex = data.categories.findIndex(c => c.id === sourceCatId);
      const destCatIndex = data.categories.findIndex(c => c.id === destCatId);

      if (sourceCatIndex === -1 || destCatIndex === -1) return;

      const newCategories = [...data.categories];
      const sourceSubCats = [...newCategories[sourceCatIndex].subCategories];
      
      const [movedSubCat] = sourceSubCats.splice(source.index, 1);

      if (sourceCatId === destCatId) {
        sourceSubCats.splice(destination.index, 0, movedSubCat);
        newCategories[sourceCatIndex] = { ...newCategories[sourceCatIndex], subCategories: sourceSubCats };
        handleUpdateData({ ...data, categories: newCategories });
      } else {
        const destSubCats = [...newCategories[destCatIndex].subCategories];
        destSubCats.splice(destination.index, 0, movedSubCat);

        newCategories[sourceCatIndex] = { ...newCategories[sourceCatIndex], subCategories: sourceSubCats };
        newCategories[destCatIndex] = { ...newCategories[destCatIndex], subCategories: destSubCats };

        const updatedLinks = data.links.map(link => {
          if (link.categoryId === sourceCatId && link.subCategoryId === movedSubCat.id) {
            return { ...link, categoryId: destCatId };
          }
          return link;
        });

        handleUpdateData({ categories: newCategories, links: updatedLinks });
      }
      return;
    }

    if (type === 'LINK') {
      const [, sourceCatId, sourceSubId] = source.droppableId.split('__');
      const [, destCatId, destSubId] = destination.droppableId.split('__');

      const allLinks = [...data.links];
      const sourceLinks = allLinks.filter(l => l.categoryId === sourceCatId && l.subCategoryId === sourceSubId);
      const destLinks = source.droppableId === destination.droppableId 
        ? sourceLinks 
        : allLinks.filter(l => l.categoryId === destCatId && l.subCategoryId === destSubId);

      const unaffectedLinks = allLinks.filter(l => {
        const isSource = l.categoryId === sourceCatId && l.subCategoryId === sourceSubId;
        const isDest = l.categoryId === destCatId && l.subCategoryId === destSubId;
        return !isSource && !isDest;
      });

      const [movedLink] = sourceLinks.splice(source.index, 1);
      const updatedLink = { ...movedLink, categoryId: destCatId, subCategoryId: destSubId };

      destLinks.splice(destination.index, 0, updatedLink);

      let newLinks;
      if (source.droppableId === destination.droppableId) {
        newLinks = [...unaffectedLinks, ...sourceLinks];
      } else {
        newLinks = [...unaffectedLinks, ...sourceLinks, ...destLinks];
      }

      handleUpdateData({ ...data, links: newLinks });
    }
  };

  const filteredLinks = React.useMemo(() => {
    if (!activeSearchQuery) return [];
    
    const lowerQuery = activeSearchQuery.toLowerCase();
    
    return data.links
      .filter(link => 
        link.title.toLowerCase().includes(lowerQuery) || 
        link.description.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(lowerQuery);
        const bTitleMatch = b.title.toLowerCase().includes(lowerQuery);

        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        return 0;
      });
  }, [data.links, activeSearchQuery]);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors">
        
        <Sidebar 
          categories={data.categories}
          links={data.links}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          t={t}
          isEditMode={isEditMode}
        />

        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 dark:bg-slate-800/80 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t.app.searchPlaceholder}
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-100/50 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-700/50 dark:text-white dark:placeholder-slate-400"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              
              {cloudConfig.enabled && syncStatus !== 'idle' && (
                <div className={`
                  hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mr-2 transition-all border
                  ${syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : ''}
                  ${syncStatus === 'synced' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : ''}
                  ${syncStatus === 'error' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : ''}
                `}>
                  {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {syncStatus === 'synced' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span className="capitalize">{t.app.sync[syncStatus]}</span>
                </div>
              )}

              <div className="relative group z-50">
                 <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700">
                    {theme === 'light' && <Sun className="w-5 h-5" />}
                    {theme === 'dark' && <Moon className="w-5 h-5" />}
                    {theme === 'system' && <Laptop className="w-5 h-5" />}
                 </button>
                 
                 <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right w-36">
                    <div className="bg-white rounded-lg shadow-xl border border-slate-100 py-1 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                      <button 
                        onClick={() => handleThemeChange('light')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'light' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                      >
                        <Sun className="w-4 h-4" />
                        {t.app.theme.light}
                      </button>
                      <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'dark' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                      >
                        <Moon className="w-4 h-4" />
                        {t.app.theme.dark}
                      </button>
                      <button 
                        onClick={() => handleThemeChange('system')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'system' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                      >
                        <Laptop className="w-4 h-4" />
                        {t.app.theme.system}
                      </button>
                    </div>
                 </div>
              </div>

              <button
                onClick={handleToggleLanguage}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                title={t.app.toggleLang}
              >
                <Languages className="w-5 h-5" />
                <span className="text-sm font-medium uppercase">{lang}</span>
              </button>

              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700'}`}
                title={t.app.toggleEdit}
              >
                {isEditMode ? <Edit className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{t.app.admin}</span>
              </button>
            </div>
          </header>

          <div 
            ref={mainContentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12 pb-24 scroll-smooth"
          >
            
            {searchInputValue ? (
              <div>
                 <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.app.searchResults}</h2>
                    {isSearching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                 </div>
                 
                 {filteredLinks.length === 0 ? (
                   <p className="text-slate-500 dark:text-slate-400">
                     {isSearching ? t.app.sync.syncing : t.app.noResults}
                   </p>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {filteredLinks.map(link => (
                       <LinkCard 
                         key={link.id} 
                         item={link} 
                         isEditMode={isEditMode}
                         onEdit={handleEditLink}
                         onDelete={handleDeleteLink}
                         t={t}
                       />
                     ))}
                   </div>
                 )}
              </div>
            ) : (
              data.categories.map(category => (
                <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{category.name}</h2>
                    <div className="h-px bg-slate-200 flex-1 dark:bg-slate-700" />
                  </div>

                  <Droppable droppableId={`cat-${category.id}`} type="SUBCAT">
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className="space-y-8"
                      >
                        {category.subCategories.length > 0 ? (
                          category.subCategories.map((subCat, index) => {
                            const subCatLinks = data.links.filter(l => l.categoryId === category.id && l.subCategoryId === subCat.id);
                            if (subCatLinks.length === 0 && !isEditMode) return null;

                            return (
                              <Draggable 
                                key={subCat.id} 
                                draggableId={subCat.id} 
                                index={index}
                                isDragDisabled={!isEditMode}
                              >
                                {(provided) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    id={`subcat-${subCat.id}`}
                                    className="pl-0 lg:pl-4 bg-white/50 rounded-xl p-2 border border-transparent hover:border-slate-100 transition-colors scroll-mt-24 dark:bg-slate-800/30 dark:hover:border-slate-700"
                                  >
                                    <div className="flex items-center gap-2 mb-4 group">
                                      <div {...provided.dragHandleProps} className={`cursor-grab p-1 rounded hover:bg-slate-200 text-slate-400 dark:hover:bg-slate-700 dark:text-slate-500 ${isEditMode ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">{subCat.name}</h3>
                                    </div>

                                    <Droppable droppableId={`links__${category.id}__${subCat.id}`} type="LINK" direction="horizontal">
                                      {(provided) => (
                                        <div 
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[50px]"
                                        >
                                          {subCatLinks.map((link, linkIndex) => (
                                            <Draggable 
                                              key={link.id} 
                                              draggableId={link.id} 
                                              index={linkIndex}
                                              isDragDisabled={!isEditMode}
                                            >
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  style={{ ...provided.draggableProps.style }}
                                                  className={snapshot.isDragging ? "opacity-90 scale-105 z-50" : ""}
                                                >
                                                  <LinkCard 
                                                    item={link} 
                                                    isEditMode={isEditMode}
                                                    onEdit={handleEditLink}
                                                    onDelete={handleDeleteLink}
                                                    t={t}
                                                  />
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          
                                          {provided.placeholder}
                                          
                                          {/* ADD LINK BUTTON SHORTCUT */}
                                          {isEditMode && (
                                            <button
                                              onClick={() => handleAddLinkShortcut(category.id, subCat.id)}
                                              className="flex flex-col items-center justify-center gap-2 min-h-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group dark:bg-slate-800/30 dark:border-slate-700 dark:hover:border-indigo-500/50"
                                            >
                                              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform dark:bg-slate-800 dark:border-slate-600">
                                                <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500" />
                                              </div>
                                              <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-600 dark:text-slate-500">{t.app.addLink}</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </Droppable>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        ) : (
                          isEditMode && (
                             <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:border-slate-700">
                                <p className="text-sm">{t.app.noSubCategories}</p>
                             </div>
                          )
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              ))
            )}
          </div>

          <AdminModal 
            isOpen={isAdminModalOpen}
            onClose={handleCloseModal}
            data={data}
            onUpdateData={handleUpdateData}
            cloudConfig={cloudConfig}
            onUpdateCloudConfig={handleUpdateCloudConfig}
            onSyncUpload={handleSyncUpload}
            onSyncDownload={handleSyncDownload}
            isSyncing={isSyncing}
            editingItem={editingItem}
            initialValues={initialLinkData}
            t={t}
          />

        </main>
      </div>
    </DragDropContext>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};

export default App;
