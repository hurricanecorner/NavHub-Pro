import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Menu, Search, Plus, Settings, Edit, Lock, LogOut, GripVertical, RefreshCw, CheckCircle2, AlertCircle, Languages, AlertTriangle, Loader2, Moon, Sun, Monitor, Laptop, ArrowUp, Globe } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GoogleGenAI } from "@google/genai";
import { AppData, LinkItem, NotionConfig, Language, Theme } from './types';
import { loadData, saveData, loadNotionConfig, saveNotionConfig, syncToNotion, loadLanguage, saveLanguage, loadTheme, saveTheme } from './services/storageUtils';
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
  public state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
  const [notionConfig, setNotionConfig] = useState<NotionConfig>({ apiKey: '', databaseId: '', enabled: false });
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
  
  // AI Search State
  const [aiSummary, setAiSummary] = useState('');
  const [groundingLinks, setGroundingLinks] = useState<{title: string, url: string}[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // Admin State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
  
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
    const loadedConfig = loadNotionConfig();
    const loadedLang = loadLanguage();
    const loadedTheme = loadTheme();
    setData(loadedData);
    setNotionConfig(loadedConfig);
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
    // If input is cleared, reset immediately
    if (!searchInputValue) {
      setActiveSearchQuery('');
      setIsSearching(false);
      return;
    }

    // Set loading indicator only if search takes longer than 200ms (simulated or real delay)
    const loadingTimer = setTimeout(() => {
      setIsSearching(true);
    }, 200);

    // Debounce the actual filtering (simulating network/processing delay)
    const debounceTimer = setTimeout(() => {
      setActiveSearchQuery(searchInputValue);
      setIsSearching(false);
    }, 500); // 500ms debounce ensures the 200ms loading threshold is crossed for demonstration

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(debounceTimer);
      // We don't reset isSearching to false here immediately to prevent flicker
      // It will settle when the next effect runs or timers complete
      setIsSearching(false);
    };
  }, [searchInputValue]);

  // AI Search Effect
  useEffect(() => {
    if (!activeSearchQuery) {
      setAiSummary('');
      setGroundingLinks([]);
      return;
    }

    const searchAI = async () => {
      // Don't search AI if query is very short
      if (activeSearchQuery.length < 2) return;

      setIsAiSearching(true);
      setAiSummary('');
      setGroundingLinks([]);

      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
           console.warn("API_KEY is missing. Skipping AI search."); 
           setIsAiSearching(false);
           return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide a helpful, concise summary and a list of relevant resources for the query: "${activeSearchQuery}".`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const text = response.text;
        if (text) setAiSummary(text);

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
           const links = chunks
             .map((c: any) => c.web)
             .filter((w: any) => w && w.uri && w.title)
             .map((w: any) => ({ title: w.title, url: w.uri }));
            
           // Deduplicate based on URL
           const unique = Array.from(new Map(links.map((item: any) => [item.url, item])).values());
           setGroundingLinks(unique as any);
        }

      } catch (error) {
        console.error("AI Search Failed", error);
      } finally {
        setIsAiSearching(false);
      }
    };
    
    // Add a delay to avoid hitting API while typing fast
    const timer = setTimeout(searchAI, 800);
    return () => clearTimeout(timer);

  }, [activeSearchQuery]);

  // Handle scroll to show/hide "Go to Top" button
  const handleScroll = () => {
    if (mainContentRef.current) {
      const { scrollTop, scrollHeight } = mainContentRef.current;
      // Show button if scrolled more than halfway through the content area
      setShowScrollTop(scrollTop > scrollHeight / 2);
    }
  };

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Update localStorage when data changes
  const handleUpdateData = (newData: AppData) => {
    setData(newData);
    saveData(newData);
    // If data changes, we are no longer strictly synced
    if (syncStatus === 'synced') {
      setSyncStatus('idle');
    }
  };

  const handleUpdateNotionConfig = (newConfig: NotionConfig) => {
    setNotionConfig(newConfig);
    saveNotionConfig(newConfig);
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

  const handleSyncNotion = async () => {
    if (!notionConfig.enabled) {
      alert("Notion integration is not enabled.");
      return;
    }

    // Close modal to show the visual indicator in header
    setIsAdminModalOpen(false);
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    const result = await syncToNotion(data, notionConfig);
    
    setIsSyncing(false);
    
    if (result.success) {
      setSyncStatus('synced');
      // Clear success status after 5 seconds to keep UI clean
      setTimeout(() => {
        setSyncStatus((prev) => prev === 'synced' ? 'idle' : prev);
      }, 5000);
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

  const handleCloseModal = () => {
    setIsAdminModalOpen(false);
    setEditingItem(null);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Handle Sub-Category Reordering
    if (type === 'SUBCAT') {
      const sourceCatId = source.droppableId.replace('cat-', '');
      const destCatId = destination.droppableId.replace('cat-', '');

      const sourceCatIndex = data.categories.findIndex(c => c.id === sourceCatId);
      const destCatIndex = data.categories.findIndex(c => c.id === destCatId);

      if (sourceCatIndex === -1 || destCatIndex === -1) return;

      const newCategories = [...data.categories];
      const sourceSubCats = [...newCategories[sourceCatIndex].subCategories];
      
      // Remove from source
      const [movedSubCat] = sourceSubCats.splice(source.index, 1);

      if (sourceCatId === destCatId) {
        // Same list reorder
        sourceSubCats.splice(destination.index, 0, movedSubCat);
        newCategories[sourceCatIndex] = { ...newCategories[sourceCatIndex], subCategories: sourceSubCats };
        handleUpdateData({ ...data, categories: newCategories });
      } else {
        // Move to different category
        const destSubCats = [...newCategories[destCatIndex].subCategories];
        destSubCats.splice(destination.index, 0, movedSubCat);

        newCategories[sourceCatIndex] = { ...newCategories[sourceCatIndex], subCategories: sourceSubCats };
        newCategories[destCatIndex] = { ...newCategories[destCatIndex], subCategories: destSubCats };

        // Update all links belonging to this sub-category
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

    // Handle Link Reordering
    if (type === 'LINK') {
      // Parse IDs from droppableId: 'links__CATID__SUBCATID'
      const [, sourceCatId, sourceSubId] = source.droppableId.split('__');
      const [, destCatId, destSubId] = destination.droppableId.split('__');

      const allLinks = [...data.links];

      // Get links for source and destination lists (filtered view)
      const sourceLinks = allLinks.filter(l => l.categoryId === sourceCatId && l.subCategoryId === sourceSubId);
      const destLinks = source.droppableId === destination.droppableId 
        ? sourceLinks 
        : allLinks.filter(l => l.categoryId === destCatId && l.subCategoryId === destSubId);

      // Get links that are NOT involved in this operation (to preserve them)
      const unaffectedLinks = allLinks.filter(l => {
        const isSource = l.categoryId === sourceCatId && l.subCategoryId === sourceSubId;
        const isDest = l.categoryId === destCatId && l.subCategoryId === destSubId;
        return !isSource && !isDest;
      });

      // Move the item
      const [movedLink] = sourceLinks.splice(source.index, 1);
      
      // Update link metadata
      const updatedLink = { ...movedLink, categoryId: destCatId, subCategoryId: destSubId };

      destLinks.splice(destination.index, 0, updatedLink);

      // Reconstruct the master list
      let newLinks;
      if (source.droppableId === destination.droppableId) {
        // destLinks is reference to sourceLinks, so it contains the updates
        newLinks = [...unaffectedLinks, ...sourceLinks];
      } else {
        newLinks = [...unaffectedLinks, ...sourceLinks, ...destLinks];
      }

      handleUpdateData({ ...data, links: newLinks });
    }
  };

  // Filter and Sort links based on debounced query
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

        // Priority 1: Matches in Title come before matches only in Description
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;

        // Priority 2: If both match title or neither match title (both match desc), 
        // maintain roughly original order (or equal weight)
        return 0;
      });
  }, [data.links, activeSearchQuery]);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Sidebar */}
        <Sidebar 
          categories={data.categories}
          links={data.links}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          t={t}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          
          {/* Header */}
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
              
              {/* Sync Status Indicator */}
              {notionConfig.enabled && syncStatus !== 'idle' && (
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

              {/* Theme Switcher (Hover Dropdown) */}
              <div className="relative group z-50">
                 <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700">
                    {theme === 'light' && <Sun className="w-5 h-5" />}
                    {theme === 'dark' && <Moon className="w-5 h-5" />}
                    {theme === 'system' && <Monitor className="w-5 h-5" />}
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

              {/* Language Switcher */}
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

          {/* Content Scroll Area */}
          <div 
            ref={mainContentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12 pb-24 scroll-smooth"
          >
            
            {searchInputValue ? (
              // Search Results View
              <div>
                 <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.app.searchResults}</h2>
                    {isSearching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                 </div>
                 
                 {filteredLinks.length === 0 && !isAiSearching ? (
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

                 {/* AI Results Section */}
                 {(isAiSearching || aiSummary || groundingLinks.length > 0) && (
                  <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        AI Smart Search
                      </h2>
                      {isAiSearching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    </div>

                    {isAiSearching && !aiSummary ? (
                       <div className="animate-pulse space-y-3">
                         <div className="h-4 bg-slate-200 rounded w-3/4 dark:bg-slate-700"></div>
                         <div className="h-4 bg-slate-200 rounded w-1/2 dark:bg-slate-700"></div>
                       </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Summary */}
                        {aiSummary && (
                          <div className="prose prose-slate max-w-none text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap">
                             {aiSummary}
                          </div>
                        )}

                        {/* Links */}
                        {groundingLinks.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groundingLinks.map((link, idx) => (
                              <a 
                                key={idx} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500/50"
                              >
                                <div className="flex items-start gap-3">
                                   <div className="bg-blue-50 text-blue-500 p-2 rounded-full shrink-0 dark:bg-blue-900/20 dark:text-blue-300">
                                      <Globe className="w-4 h-4" />
                                   </div>
                                   <div className="min-w-0">
                                     <h4 className="font-medium text-slate-800 text-sm truncate dark:text-slate-200">{link.title}</h4>
                                     <p className="text-xs text-slate-500 truncate mt-0.5 dark:text-slate-400">{link.url}</p>
                                   </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                 )}
              </div>
            ) : (
              // Categorized View
              data.categories.map(category => (
                <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{category.name}</h2>
                    <div className="h-px bg-slate-200 flex-1 dark:bg-slate-700" />
                  </div>

                  {/* Sub-Category List (Sortable) */}
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

                                    {/* Links Grid (Sortable) */}
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

                                          {/* Add Button (Only in Edit Mode) */}
                                          {isEditMode && (
                                            <button 
                                              onClick={() => {
                                                setEditingItem(null);
                                                setIsAdminModalOpen(true);
                                              }}
                                              className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all min-h-[100px] dark:border-slate-700 dark:text-slate-500 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20"
                                            >
                                              <Plus className="w-6 h-6 mb-2" />
                                              <span className="text-sm font-medium">{t.app.addLink}</span>
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
                          <p className="text-slate-400 italic dark:text-slate-500">{t.app.noSubCategories}</p>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              ))
            )}
            
            <div className="h-12" /> {/* Bottom spacer */}
          </div>

          {/* Scroll To Top Button */}
          <button
            onClick={scrollToTop}
            className={`fixed bottom-8 right-8 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 z-30 ${
              showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            }`}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </main>

        <AdminModal 
          isOpen={isAdminModalOpen}
          onClose={handleCloseModal}
          data={data}
          onUpdateData={handleUpdateData}
          notionConfig={notionConfig}
          onUpdateNotionConfig={handleUpdateNotionConfig}
          onSyncNotion={handleSyncNotion}
          isSyncing={isSyncing}
          editingItem={editingItem}
          t={t}
        />
      </div>
    </DragDropContext>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
);

export default App;