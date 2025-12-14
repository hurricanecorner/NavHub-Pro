import React, { useState, useEffect, useRef, ReactNode, ErrorInfo } from 'react';
import { Menu, Search, Settings, Edit, Lock, RefreshCw, CheckCircle2, AlertCircle, Languages, AlertTriangle, Loader2, Moon, Sun, Laptop, GripVertical, Plus, Hash, Image as ImageIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppData, LinkItem, CloudConfig, Language, Theme } from './types';
import { loadData, saveData, loadCloudConfig, saveCloudConfig, uploadToCloud, downloadFromCloud, loadLanguage, saveLanguage, loadTheme, saveTheme } from './services/storageUtils';
import { TRANSLATIONS } from './translations';
import Sidebar from './components/Sidebar';
import LinkCard from './components/LinkCard';
import AdminModal from './components/AdminModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

// Error Boundary Component Interface
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

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

  // Toasts & Dialogs
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });

  const mainContentRef = useRef<HTMLDivElement>(null);

  // Translation Helper
  const t = TRANSLATIONS[lang];

  // Initialize
  useEffect(() => {
    const loadedData = loadData();
    const loadedConfig = loadCloudConfig();
    const loadedLang = loadLanguage();
    const loadedTheme = loadTheme();
    
    if (!loadedData.siteConfig) {
      loadedData.siteConfig = { title: '', logoUrl: '', faviconUrl: '' };
    }

    setData(loadedData);
    setCloudConfig(loadedConfig);
    setLang(loadedLang);
    setTheme(loadedTheme);
    if (loadedData.categories.length > 0) {
      setActiveCategoryId(loadedData.categories[0].id);
    }
    setIsLoading(false);
  }, []);

  // Apply Site Settings (Title & Favicon)
  useEffect(() => {
    if (data.siteConfig) {
      document.title = data.siteConfig.title || TRANSLATIONS[lang].app.title;
      if (data.siteConfig.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = data.siteConfig.faviconUrl;
      }
    }
  }, [data.siteConfig, lang]);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-custom');
    
    // When theme is 'custom', we behave like 'dark' mode for text colors, but handle backgrounds separately
    if (theme === 'custom') {
        root.classList.add('dark', 'theme-custom');
    } else if (theme === 'system') {
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

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDangerous: boolean = false) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      isDangerous
    });
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
    showToast('success', t.app.configSaved);
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

  // Sync Logic
  const handleSyncUpload = async (configOverride?: CloudConfig) => {
    // Use the config passed from Modal if available, otherwise use state
    const configToUse = configOverride || cloudConfig;

    if (!configToUse.enabled) return showToast('error', t.app.enableSyncFirst);
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    const result = await uploadToCloud(data, configToUse);
    setIsSyncing(false);
    
    if (result.success) {
      setSyncStatus('synced');
      showToast('success', t.admin.cloud.uploadSuccess);
      // Update local state and storage if a new Gist ID was created
      if (configToUse.activeProvider === 'github' && result.newGistId && result.newGistId !== configToUse.gistId) {
        const newConfig = { ...configToUse, gistId: result.newGistId };
        setCloudConfig(newConfig);
        saveCloudConfig(newConfig);
      } else if (configOverride) {
        // If upload succeeded with override config, save it as main config to prevent confusion
        setCloudConfig(configToUse);
        saveCloudConfig(configToUse);
      }
    } else {
      setSyncStatus('error');
      showToast('error', result.message);
    }
  };

  const handleSyncDownload = async (configOverride?: CloudConfig) => {
     // Use the config passed from Modal if available, otherwise use state
     const configToUse = configOverride || cloudConfig;

     if (!configToUse.enabled) return showToast('error', t.app.enableSyncFirst);
     
     confirmAction(t.admin.cloud.download, t.admin.cloud.warning, async () => {
         setIsSyncing(true);
         setSyncStatus('syncing');
         const result = await downloadFromCloud(configToUse);
         setIsSyncing(false);
         if (result.success && result.data) {
           setData(result.data);
           saveData(result.data);
           setSyncStatus('synced');
           showToast('success', t.admin.cloud.downloadSuccess);
           setIsAdminModalOpen(false); 
           // If download succeeded with override config, save it
           if (configOverride) {
              setCloudConfig(configToUse);
              saveCloudConfig(configToUse);
           }
         } else {
           setSyncStatus('error');
           showToast('error', result.message);
         }
       }, true);
  };

  const handleDeleteLink = (id: string) => {
    confirmAction(t.admin.link.delete, t.app.deleteLinkConfirm, () => {
        const updatedLinks = data.links.filter(l => l.id !== id);
        handleUpdateData({ ...data, links: updatedLinks });
        showToast('success', t.app.linkDeleted);
      }, true);
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
      const [, destCatId, destSubIdRaw] = destination.droppableId.split('__');
      const destSubId = destSubIdRaw === 'GENERAL' ? '' : destSubIdRaw; // Map GENERAL to empty string

      const allLinks = [...data.links];
      
      // Filter links based on source container (handles empty/GENERAL subId correctly)
      const sourceLinks = allLinks.filter(l => 
        l.categoryId === sourceCatId && 
        (l.subCategoryId === sourceSubId || (sourceSubId === 'GENERAL' && !l.subCategoryId))
      );
      
      // Determine destination list (same list or different)
      const destLinks = source.droppableId === destination.droppableId 
        ? sourceLinks 
        : allLinks.filter(l => 
            l.categoryId === destCatId && 
            (l.subCategoryId === destSubId || (destSubId === '' && !l.subCategoryId))
          );

      const unaffectedLinks = allLinks.filter(l => {
        const isSource = l.categoryId === sourceCatId && (l.subCategoryId === sourceSubId || (sourceSubId === 'GENERAL' && !l.subCategoryId));
        const isDest = l.categoryId === destCatId && (l.subCategoryId === destSubId || (destSubId === '' && !l.subCategoryId));
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
      <div className={`flex h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors ${theme === 'custom' ? 'bg-cover bg-center bg-fixed' : ''}`} style={theme === 'custom' && data.siteConfig?.backgroundUrl ? { backgroundImage: `url(${data.siteConfig.backgroundUrl})` } : {}}>
        
        {/* Custom Theme Overlay */}
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
          
          <header className={`h-16 border-b flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 transition-colors ${theme === 'custom' ? 'bg-black/60 backdrop-blur-md border-white/10' : 'bg-white/80 backdrop-blur-md border-slate-200 dark:bg-slate-800/80 dark:border-slate-700'}`}>
            {/* Header Content */}
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-700"><Menu className="w-5 h-5" /></button>
              <div className="relative max-w-md w-full hidden sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder={t.app.searchPlaceholder} value={searchInputValue} onChange={(e) => setSearchInputValue(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-slate-100/50 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-700/50 dark:text-white dark:placeholder-slate-400" />{isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /></div>}</div>
            </div>
            <div className="flex items-center gap-2">
              {cloudConfig.enabled && syncStatus !== 'idle' && (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mr-2 transition-all border ${syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : ''} ${syncStatus === 'synced' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : ''} ${syncStatus === 'error' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : ''}`}>
                  {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}{syncStatus === 'synced' && <CheckCircle2 className="w-3.5 h-3.5" />}{syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}<span className="capitalize">{t.app.sync[syncStatus]}</span>
                </div>
              )}
              <div className="relative group z-50">
                 <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700">{theme === 'light' && <Sun className="w-5 h-5" />}{theme === 'dark' && <Moon className="w-5 h-5" />}{theme === 'system' && <Laptop className="w-5 h-5" />}{theme === 'custom' && <ImageIcon className="w-5 h-5" />}</button>
                 <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right w-36">
                    <div className="bg-white rounded-lg shadow-xl border border-slate-100 py-1 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                      <button onClick={() => handleThemeChange('light')} className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'light' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><Sun className="w-4 h-4" />{t.app.theme.light}</button>
                      <button onClick={() => handleThemeChange('dark')} className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'dark' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><Moon className="w-4 h-4" />{t.app.theme.dark}</button>
                      <button onClick={() => handleThemeChange('system')} className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'system' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><Laptop className="w-4 h-4" />{t.app.theme.system}</button>
                      <button onClick={() => handleThemeChange('custom')} className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${theme === 'custom' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><ImageIcon className="w-4 h-4" />{t.app.theme.custom}</button>
                    </div>
                 </div>
              </div>
              <button onClick={handleToggleLanguage} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700" title={t.app.toggleLang}><Languages className="w-5 h-5" /><span className="text-sm font-medium uppercase">{lang}</span></button>
              <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700'}`} title={t.app.toggleEdit}>{isEditMode ? <Edit className="w-5 h-5" /> : <Lock className="w-5 h-5" />}</button>
              <button onClick={() => setIsAdminModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-indigo-600 dark:hover:bg-indigo-700"><Settings className="w-4 h-4" /><span className="hidden sm:inline">{t.app.admin}</span></button>
            </div>
          </header>

          <div 
            ref={mainContentRef}
            className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12 pb-24 scroll-smooth"
          >
            {searchInputValue ? (
              // Search Results
              <div>
                 <div className="flex items-center gap-3 mb-6"><h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.app.searchResults}</h2>{isSearching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}</div>
                 {filteredLinks.length === 0 ? <p className="text-slate-500 dark:text-slate-400">{isSearching ? t.app.sync.syncing : t.app.noResults}</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{filteredLinks.map(link => <LinkCard key={link.id} item={link} isEditMode={isEditMode} onEdit={handleEditLink} onDelete={handleDeleteLink} t={t} />)}</div>}
              </div>
            ) : (
              data.categories.map(category => {
                // Filter General Links for this category
                const generalLinks = data.links.filter(l => l.categoryId === category.id && !l.subCategoryId);
                
                return (
                <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white drop-shadow-sm">{category.name}</h2>
                    <div className={`h-px flex-1 ${theme === 'custom' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  </div>

                  {/* General Links Droppable Area */}
                  {(generalLinks.length > 0 || isEditMode) && (
                     <div className={`pl-0 lg:pl-4 rounded-xl p-2 border transition-colors mb-8 ${theme === 'custom' ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-white/50 border-transparent hover:border-slate-100 dark:bg-slate-800/30 dark:hover:border-slate-700'}`}>
                       {/* Optional Label for General links in Edit Mode for clarity */}
                       {isEditMode && (
                         <div className="flex items-center gap-2 mb-2 px-1 opacity-60">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">General</span>
                         </div>
                       )}
                       <Droppable droppableId={`links__${category.id}__GENERAL`} type="LINK" direction="horizontal">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                               {generalLinks.map((link, linkIndex) => (
                                 <Draggable key={link.id} draggableId={link.id} index={linkIndex} isDragDisabled={!isEditMode}>
                                   {(provided, snapshot) => (
                                     <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }} className={snapshot.isDragging ? "opacity-90 scale-105 z-50" : ""}><LinkCard item={link} isEditMode={isEditMode} onEdit={handleEditLink} onDelete={handleDeleteLink} t={t} /></div>
                                   )}
                                 </Draggable>
                               ))}
                               {provided.placeholder}
                               {/* Add Link Shortcut for General Category */}
                               {isEditMode && (
                                  <button onClick={() => handleAddLinkShortcut(category.id, '')} className={`flex flex-col items-center justify-center gap-2 min-h-[120px] border-2 border-dashed rounded-xl transition-all group ${theme === 'custom' ? 'bg-black/20 border-white/20 hover:bg-white/10 hover:border-white/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 dark:bg-slate-800/30 dark:border-slate-700 dark:hover:border-indigo-500/50'}`}>
                                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" /></div><span className="text-xs font-medium text-slate-400 group-hover:text-indigo-600 dark:text-slate-500">{t.app.addLink}</span>
                                  </button>
                               )}
                            </div>
                          )}
                       </Droppable>
                     </div>
                  )}

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
                              <Draggable key={subCat.id} draggableId={subCat.id} index={index} isDragDisabled={!isEditMode}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} id={`subcat-${subCat.id}`} className={`pl-0 lg:pl-4 rounded-xl p-2 border transition-colors scroll-mt-24 ${theme === 'custom' ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-white/50 border-transparent hover:border-slate-100 dark:bg-slate-800/30 dark:hover:border-slate-700'}`}>
                                    <div className="flex items-center gap-2 mb-4 group">
                                      <div {...provided.dragHandleProps} className={`cursor-grab p-1 rounded hover:bg-slate-200 text-slate-400 dark:hover:bg-slate-700 dark:text-slate-500 ${isEditMode ? 'opacity-100' : 'opacity-0 hidden'}`}><GripVertical className="w-4 h-4" /></div>
                                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">{subCat.name}</h3>
                                    </div>

                                    <Droppable droppableId={`links__${category.id}__${subCat.id}`} type="LINK" direction="horizontal">
                                      {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[50px]">
                                          {subCatLinks.map((link, linkIndex) => (
                                            <Draggable key={link.id} draggableId={link.id} index={linkIndex} isDragDisabled={!isEditMode}>
                                              {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }} className={snapshot.isDragging ? "opacity-90 scale-105 z-50" : ""}><LinkCard item={link} isEditMode={isEditMode} onEdit={handleEditLink} onDelete={handleDeleteLink} t={t} /></div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                          {isEditMode && (
                                            <button onClick={() => handleAddLinkShortcut(category.id, subCat.id)} className={`flex flex-col items-center justify-center gap-2 min-h-[120px] border-2 border-dashed rounded-xl transition-all group ${theme === 'custom' ? 'bg-black/20 border-white/20 hover:bg-white/10 hover:border-white/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 dark:bg-slate-800/30 dark:border-slate-700 dark:hover:border-indigo-500/50'}`}>
                                              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" /></div><span className="text-xs font-medium text-slate-400 group-hover:text-indigo-600 dark:text-slate-500">{t.app.addLink}</span>
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
                          isEditMode && category.subCategories.length === 0 && generalLinks.length === 0 && (
                             <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 ${theme === 'custom' ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <p className="text-sm">{t.app.noSubCategories}</p>
                             </div>
                          )
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
                );
              })
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
            showToast={showToast}
            confirmAction={confirmAction}
          />
          
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          
          <ConfirmDialog 
            isOpen={confirmState.isOpen}
            title={confirmState.title}
            message={confirmState.message}
            onConfirm={confirmState.onConfirm}
            onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            isDangerous={confirmState.isDangerous}
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