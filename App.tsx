// ... (previous imports)
import React, { Component, useState, useEffect, ReactNode, ErrorInfo, useRef, useMemo } from 'react';
import { Menu, Search, Settings, Edit, Lock, Languages, AlertTriangle, Moon, Sun, Laptop, Image as ImageIcon, ChevronDown, PlusCircle, Plus, LayoutGrid, Check, Tags, Tag, X, GripVertical, Flame, Pin, Activity, RefreshCw, ShieldCheck, RotateCcw, Clock, Eye, Trash2, Sliders, FolderPlus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppData, LinkItem, CloudConfig, Language, Theme, Category, LinkHealth, HealthCheckCycle, SiteConfig } from './types';
import { loadData, saveData, loadCloudConfig, saveCloudConfig, uploadToCloud, downloadFromCloud, loadLanguage, saveLanguage, loadTheme, saveTheme, recordClickStat, mergeClickStatsIntoLinks, checkAndApplyDailyAutoSort, reorderAllLinksByFrequency } from './services/storageUtils';
import { normalizeHealthUrl, loadHealthCache, saveHealthCache, checkBatchUrlsApi, checkSingleUrlApi, toggleTrustUrl, isUrlTrusted, clearHealthCache, loadTrustedUrls, saveTrustedUrls, getHealthCheckCycle, setHealthCheckCycle, getLastHealthCheckTime, setLastHealthCheckTime, isHealthCheckDue, getCycleDurationMs } from './linkHealthService';
import { TRANSLATIONS } from './translations';
import Sidebar from './components/Sidebar';
import LinkCard from './components/LinkCard';
import AdminModal from './components/AdminModal';
import { HdIconEnhanceModal } from './components/HdIconEnhanceModal';
import { CategoryIconPickerModal } from './components/CategoryIconPickerModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import WeeklyTrendsSection from './components/WeeklyTrendsSection';
import { CategoryIconDisplay } from './services/categoryIconService';

// ... (COLOR_COLLECTIONS and COLOR_PALETTES consts remain same - collapsed for brevity)
export const COLOR_COLLECTIONS: Record<string, Record<string, Record<number, string>>> = {
  macaron: {
    indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#1e1b4b', 950: '#171717' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
    cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
    violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
    lemon: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
    mint: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
    peach: { 50: '#fff5f1', 100: '#ffede5', 200: '#ffd6c4', 300: '#ffb394', 400: '#ff8357', 500: '#ff5c26', 600: '#f23a00', 700: '#c93000', 800: '#a12700', 900: '#862000', 950: '#491100' },
    grape: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
    banana: { 50: '#fffef0', 100: '#fffcd1', 200: '#fff9a3', 300: '#fff36b', 400: '#ffeb3b', 500: '#fdd835', 600: '#fbc02d', 700: '#f9a825', 800: '#f57f17', 900: '#e65100', 950: '#bf360c' },
    fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' }
  },
  morandi: {
    slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
    m_sage: { 50: '#f4f7f4', 100: '#e8ece8', 200: '#d1d9d1', 300: '#abb9ab', 400: '#8fa18f', 500: '#738773', 600: '#5c6d5c', 700: '#4c594c', 800: '#3f493f', 900: '#353e35', 950: '#1d221d' },
    m_dust: { 50: '#f6f7f9', 100: '#edeff3', 200: '#d6dae3', 300: '#b2bccd', 400: '#8b9ab4', 500: '#6f81a1', 600: '#586785', 700: '#48546d', 800: '#3f475a', 900: '#373e4d', 950: '#262a34' },
    m_clay: { 50: '#f8f6f4', 100: '#f1ede9', 200: '#e3dad2', 300: '#cebcaf', 400: '#b49988', 500: '#a28371', 600: '#957261', 700: '#7c5f51', 800: '#654f44', 900: '#53423a', 950: '#2c231f' },
    m_mist: { 50: '#f6f7f8', 100: '#edeff0', 200: '#d9dde1', 300: '#bac2c9', 400: '#99a6b1', 500: '#7d8e9d', 600: '#657381', 700: '#535e69', 800: '#475058', 900: '#3e464c', 950: '#212529' },
    m_moss: { 50: '#f7f8f6', 100: '#edf0ec', 200: '#dae1d9', 300: '#bacab8', 400: '#97af94', 500: '#7b9578', 600: '#61785f', 700: '#50634e', 800: '#425141', 900: '#394538', 950: '#1e251e' },
    m_plum: { 50: '#f8f6f7', 100: '#f1edef', 200: '#e3dae0', 300: '#cebcce', 400: '#b499b4', 500: '#9e819e', 600: '#8c708c', 700: '#755d75', 800: '#614d61', 900: '#514151', 950: '#2c222c' },
    m_sky: { 50: '#f5f8fa', 100: '#ecf1f5', 200: '#d5e0eb', 300: '#b0c7db', 400: '#86a8c7', 500: '#698db0', 600: '#537292', 700: '#455e78', 800: '#3c4f64', 900: '#354557', 950: '#1d2526' },
    m_teal: { 50: '#f5f8f8', 100: '#ecf1f2', 200: '#d5e0e1', 300: '#b0c7c9', 400: '#86a8ac', 500: '#698d91', 600: '#537276', 700: '#455e61', 800: '#3c4f51', 900: '#354547', 950: '#1d2526' },
    m_stone: { 50: '#f7f7f7', 100: '#efefef', 200: '#dfdfdf', 300: '#c5c5c5', 400: '#a7a7a7', 500: '#8c8c8c', 600: '#717171', 700: '#5d5d5d', 800: '#4d4d4d', 900: '#444444', 950: '#262626' },
    m_sand: { 50: '#f9f8f6', 100: '#f3f1ed', 200: '#e7e3da', 300: '#d5ccba', 400: '#bcad93', 500: '#a69477', 600: '#978468', 700: '#7e6e56', 800: '#665947', 900: '#544a3b', 950: '#2d2720' },
    m_rose: { 50: '#f9f6f6', 100: '#f3eded', 200: '#e7dada', 300: '#d5bcbc', 400: '#bc9999', 500: '#a68181', 600: '#977272', 700: '#7e5d5d', 800: '#664d4d', 900: '#544141', 950: '#2d2222' }
  },
  traditional: {
    amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
    zhusha: { 50: '#fff1f0', 100: '#ffdfde', 200: '#ffc5c2', 300: '#ff9e99', 400: '#ff6961', 500: '#ff3d33', 600: '#f52218', 700: '#cf130a', 800: '#a80b00', 900: '#820800', 950: '#4d0400' },
    dailan: { 50: '#f0f5f9', 100: '#dfeaf2', 200: '#c5d9e8', 300: '#9dbcd6', 400: '#6c99bd', 500: '#4177a3', 600: '#315e85', 700: '#274b6b', 800: '#1f3c54', 900: '#182f42', 950: '#0d1a24' },
    bishan: { 50: '#f0fdf6', 100: '#defceb', 200: '#bff7d6', 300: '#8ef2b5', 400: '#56e38b', 500: '#2dcc6b', 600: '#1ba854', 700: '#168545', 800: '#126b38', 900: '#0e572e', 950: '#08331b' },
    cuise: { 50: '#f2fdfb', 100: '#e5fbf7', 200: '#cbf7ee', 300: '#a0f0e1', 400: '#69e3cf', 500: '#34ccb8', 600: '#2aa898', 700: '#22857a', 800: '#1b6b62', 900: '#165750', 950: '#0c2e2a' },
    feise: { 50: '#fff5f6', 100: '#ffecef', 200: '#ffdee3', 300: '#ffc2cc', 400: '#ff94a8', 500: '#f76a87', 600: '#e34265', 700: '#be2b4d', 800: '#9f2341', 900: '#881d38', 950: '#4c0c1e' },
    dailv: { 50: '#f2f8f6', 100: '#e5f2ee', 200: '#c9e5dd', 300: '#9fd1c4', 400: '#6db8a7', 500: '#4a9c8b', 600: '#3a7d70', 700: '#2e6359', 800: '#254f48', 900: '#1e403a', 950: '#10221f' },
    ouhe: { 50: '#faf7fa', 100: '#f5f0f5', 200: '#ebdfea', 300: '#dbbed9', 400: '#c292bd', 500: '#a86da3', 600: '#8c5688', 700: '#72456e', 800: '#5c3758', 900: '#4d2e4a', 950: '#2b1a29' },
    ehhuang: { 50: '#fffef0', 100: '#fffcd1', 200: '#fff9a3', 300: '#fff36b', 400: '#ffeb3b', 500: '#fdd835', 600: '#fbc02d', 700: '#f9a825', 800: '#f57f17', 900: '#e65100', 950: '#bf360c' },
    tanse: { 50: '#fbf8f5', 100: '#f7f1eb', 200: '#efe3d6', 300: '#e2ccb8', 400: '#d0ab8e', 500: '#bd8d68', 600: '#a37452', 700: '#855d43', 800: '#6b4b36', 900: '#5a3f2d', 950: '#322319' },
    mohei: { 50: '#f5f5f5', 100: '#ebebeb', 200: '#d4d4d4', 300: '#a3a3a3', 400: '#737373', 500: '#525252', 600: '#404040', 700: '#262626', 800: '#171717', 900: '#0a0a0a', 950: '#020202' },
    hulv: { 50: '#f0fafa', 100: '#def5f5', 200: '#bdebeb', 300: '#8cdbdb', 400: '#5bc0c0', 500: '#34a3a3', 600: '#2a8585', 700: '#226b6b', 800: '#1b5757', 900: '#164747', 950: '#0c2626' }
  }
};

export const COLOR_PALETTES: Record<string, Record<number, string>> = Object.values(COLOR_COLLECTIONS).reduce((acc, curr) => ({ ...acc, ...curr }), {});

export const applyThemeColor = (colorName: string) => {
  const palette = COLOR_PALETTES[colorName] || COLOR_COLLECTIONS.macaron.indigo;
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
  const [activeTagFilter, setActiveTagFilter] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
  const [initialLinkData, setInitialLinkData] = useState<{ categoryId: string; subCategoryId: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous: boolean; }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });
  const [pageReady, setPageReady] = useState(false);
  const [hdEnhanceLink, setHdEnhanceLink] = useState<LinkItem | null>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Link Health State
  const [healthMap, setHealthMap] = useState<Record<string, LinkHealth>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isHealthMenuOpen, setIsHealthMenuOpen] = useState(false);
  const [filterOfflineOnly, setFilterOfflineOnly] = useState(false);
  const [currentHealthCycle, setCurrentHealthCycle] = useState<HealthCheckCycle>(() => getHealthCheckCycle());
  const [lastHealthCheckTime, setLastHealthCheckTimeState] = useState<number>(() => getLastHealthCheckTime());
  const healthMenuRef = useRef<HTMLDivElement>(null);

  // Quick View Mode State
  const [isQuickView, setIsQuickView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('navhub_quick_view_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Quick edit states in main interface for categories and subcategories
  const [editingCatIdInMain, setEditingCatIdInMain] = useState<string | null>(null);
  const [editCatNameInMain, setEditCatNameInMain] = useState('');
  const [addingSubInMainCatId, setAddingSubInMainCatId] = useState<string | null>(null);
  const [newSubNameInMain, setNewSubNameInMain] = useState('');
  const [editingSubCatIdInMain, setEditingSubCatIdInMain] = useState<string | null>(null);
  const [editSubCatNameInMain, setEditSubCatNameInMain] = useState('');
  const [isAddingMainCatInMain, setIsAddingMainCatInMain] = useState(false);
  const [newMainCatNameInMain, setNewMainCatNameInMain] = useState('');
  const [mainCatIconPickerTarget, setMainCatIconPickerTarget] = useState<{
    id: string;
    name: string;
    icon?: string;
    subCategoryNames: string[];
  } | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    let loadedData = loadData();
    const { data: autoSortedData, didSort } = checkAndApplyDailyAutoSort(loadedData);
    if (didSort) {
      loadedData = autoSortedData;
    }
    setData(loadedData); 
    setCloudConfig(loadCloudConfig()); 
    setLang(loadLanguage()); 
    setTheme(loadTheme());
    const cachedHealth = loadHealthCache();
    if (Object.keys(cachedHealth).length > 0) {
      setHealthMap(cachedHealth);
    }
    if (loadedData.siteConfig?.healthCheckCycle) {
      setCurrentHealthCycle(loadedData.siteConfig.healthCheckCycle);
      setHealthCheckCycle(loadedData.siteConfig.healthCheckCycle);
    }
    if (loadedData.siteConfig?.themeColor) applyThemeColor(loadedData.siteConfig.themeColor);
    if (loadedData.categories.length > 0) setActiveCategoryId(loadedData.categories[0].id);
    setIsLoading(false);
    const timer = setTimeout(() => {
      setPageReady(true);
      window.dispatchEvent(new CustomEvent('navhub-ready'));
      if (didSort) {
        setToasts(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'info',
            message: t.app?.autoSortNotice || '已按访问频次完成每日网址排序（置顶网址保持在前排）'
          }
        ]);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    else if (theme === 'custom') root.classList.add('dark');
    else root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
      if (healthMenuRef.current && !healthMenuRef.current.contains(event.target as Node)) {
        setIsHealthMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatLastCheckedText = (timestamp: number): string => {
    if (!timestamp) return '尚未全量检测';
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return '刚刚完成检测';
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 60) return `${mins} 分钟前检测`;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) return `${hours} 小时前检测`;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} 天前检测`;
  };

  const handleUpdateHealthCycle = (cycle: HealthCheckCycle) => {
    setCurrentHealthCycle(cycle);
    setHealthCheckCycle(cycle);
    const baseConfig: SiteConfig = data.siteConfig || {
      title: t.app?.title || 'NavHub Pro',
      logoUrl: '',
      faviconUrl: '',
    };
    handleUpdateData({
      ...data,
      siteConfig: {
        ...baseConfig,
        healthCheckCycle: cycle,
      }
    });
    const cycleNames: Record<HealthCheckCycle, string> = {
      '12h': '每 12 小时',
      '24h': '每天一次 (24小时)',
      '3d': '每 3 天',
      '7d': '每周一次 (7天)',
      'manual': '仅手动检测'
    };
    showToast('success', `检测周期已设为: ${cycleNames[cycle]}`);
  };

  // Background Link Health Checking Runner
  const runHealthCheck = async (force = false) => {
    if (isCheckingHealth || !data.links || data.links.length === 0) return;
    const activeCycle = data.siteConfig?.healthCheckCycle || currentHealthCycle;

    // In manual mode, only run when explicitly forced by user
    if (activeCycle === 'manual' && !force) {
      return;
    }

    const allUrls = Array.from(new Set(data.links.map(l => normalizeHealthUrl(l.url)).filter(Boolean)));
    const now = Date.now();
    const cycleMs = getCycleDurationMs(activeCycle);
    
    // Check URLs that are:
    // 1. Force requested (user clicked recheck)
    // 2. Never checked before (!healthMap[u])
    // 3. Or older than the current cycleMs
    const toCheck = allUrls.filter(u => force || !healthMap[u] || (now - (healthMap[u]?.checkedAt || 0) > cycleMs));

    if (toCheck.length === 0) {
      setIsCheckingHealth(false);
      return;
    }

    setIsCheckingHealth(true);

    setHealthMap(prev => {
      const next = { ...prev };
      toCheck.forEach(u => {
        next[u] = {
          online: prev[u]?.online ?? true,
          responseTimeMs: prev[u]?.responseTimeMs ?? 0,
          status: prev[u]?.status ?? null,
          checkedAt: prev[u]?.checkedAt ?? now,
          isChecking: true,
        };
      });
      return next;
    });

    const chunkSize = 12;
    let currentMap = { ...healthMap };
    for (let i = 0; i < toCheck.length; i += chunkSize) {
      const chunk = toCheck.slice(i, i + chunkSize);
      try {
        const results = await checkBatchUrlsApi(chunk, force);
        currentMap = { ...currentMap, ...results };
        setHealthMap(prev => ({ ...prev, ...results }));
        saveHealthCache(currentMap);
      } catch (err) {
        console.error('Batch health check error:', err);
      }
    }
    setLastHealthCheckTime(now);
    setLastHealthCheckTimeState(now);
    setIsCheckingHealth(false);
  };

  const handleRecheckSingleUrl = async (rawUrl: string) => {
    const norm = normalizeHealthUrl(rawUrl);
    if (!norm) return;
    setHealthMap(prev => ({
      ...prev,
      [norm]: {
        online: prev[norm]?.online ?? true,
        responseTimeMs: prev[norm]?.responseTimeMs ?? 0,
        status: prev[norm]?.status ?? null,
        checkedAt: Date.now(),
        isChecking: true,
      },
    }));
    try {
      const res = await checkSingleUrlApi(norm, true);
      setHealthMap(prev => {
        const next = { ...prev, [norm]: res };
        saveHealthCache(next);
        return next;
      });
      if (res.online) {
        showToast('success', `${norm.replace(/^https?:\/\//i, '')} · 在线响应正常 (${res.responseTimeMs ? `${res.responseTimeMs}ms` : '正常'})`);
      } else {
        showToast('error', `${norm.replace(/^https?:\/\//i, '')} · 暂无响应 (${res.error || `HTTP ${res.status}`})`);
      }
    } catch {
      showToast('error', '检测请求失败，请稍后重试');
    }
  };

  // Background auto-trigger on initial load: only runs if health check is due according to cycle!
  useEffect(() => {
    if (pageReady && data.links && data.links.length > 0) {
      const activeCycle = data.siteConfig?.healthCheckCycle || currentHealthCycle;
      if (activeCycle === 'manual') return; // Do not auto-detect if manual mode

      // Check if full cycle is due
      if (!isHealthCheckDue(activeCycle)) {
        // If not due, check if there are any newly added links without any cache record
        const allUrls = Array.from(new Set(data.links.map(l => normalizeHealthUrl(l.url)).filter(Boolean)));
        const missing = allUrls.filter(u => !healthMap[u]);
        if (missing.length === 0) {
          // Everything is already cached within cycle, skip network detection!
          return;
        }
      }

      const timer = setTimeout(() => {
        runHealthCheck(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [pageReady, data.links?.length, currentHealthCycle]);

  const handleToggleTrustUrl = (rawUrl: string) => {
    const norm = normalizeHealthUrl(rawUrl);
    if (!norm) return;
    const nowTrusted = toggleTrustUrl(norm);
    if (nowTrusted) {
      setHealthMap(prev => {
        const next = {
          ...prev,
          [norm]: {
            online: true,
            status: 200,
            responseTimeMs: 10,
            checkedAt: Date.now(),
            isTrusted: true,
          }
        };
        saveHealthCache(next);
        return next;
      });
      showToast('success', `已将 ${norm.replace(/^https?:\/\//i, '')} 加入受信任白名单，始终判定正常`);
    } else {
      setHealthMap(prev => {
        const next = { ...prev };
        delete next[norm];
        saveHealthCache(next);
        return next;
      });
      showToast('info', `已取消对 ${norm.replace(/^https?:\/\//i, '')} 的信任`);
      handleRecheckSingleUrl(norm);
    }
  };

  const handleTrustAllOffline = () => {
    if (offlineLinks.length === 0) return;
    const trusted = loadTrustedUrls();
    const newTrusted = [...trusted];
    const nextMap = { ...healthMap };
    offlineLinks.forEach(l => {
      const norm = normalizeHealthUrl(l.url);
      if (norm && !newTrusted.includes(norm)) {
        newTrusted.push(norm);
        nextMap[norm] = {
          online: true,
          status: 200,
          responseTimeMs: 10,
          checkedAt: Date.now(),
          isTrusted: true,
        };
      }
    });
    saveTrustedUrls(newTrusted);
    setHealthMap(nextMap);
    saveHealthCache(nextMap);
    showToast('success', `已将 ${offlineLinks.length} 个离线链接加入信任白名单`);
  };

  const handleClearHealthCacheAndRescan = () => {
    clearHealthCache();
    setHealthMap({});
    runHealthCheck(true);
    showToast('info', '已清空本地检测缓存并启动全量探测');
  };

  const healthStats = useMemo(() => {
    let total = 0;
    let online = 0;
    let offline = 0;
    const seen = new Set<string>();
    (data.links || []).forEach(l => {
      const u = normalizeHealthUrl(l.url);
      if (!u || seen.has(u)) return;
      seen.add(u);
      total++;
      const h = healthMap[u];
      const isTrusted = l.isTrusted || h?.isTrusted || isUrlTrusted(l.url);
      if (isTrusted) {
        online++;
        return;
      }
      if (h && !h.isChecking) {
        if (h.online) online++;
        else offline++;
      }
    });
    return { total, online, offline };
  }, [data.links, healthMap]);

  const offlineLinks = useMemo(() => {
    return (data.links || []).filter(l => {
      const u = normalizeHealthUrl(l.url);
      const h = healthMap[u];
      const isTrusted = l.isTrusted || h?.isTrusted || isUrlTrusted(l.url);
      if (isTrusted) return false;
      return h && !h.online && !h.isChecking;
    });
  }, [data.links, healthMap]);

  const handleUpdateData = (newData: AppData) => { 
    const mergedLinks = mergeClickStatsIntoLinks(newData.links || []);
    const finalizedData: AppData = { ...newData, links: mergedLinks };
    setData(finalizedData); 
    saveData(finalizedData);
    if (finalizedData.siteConfig?.themeColor) applyThemeColor(finalizedData.siteConfig.themeColor);
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
    } else if (type === 'SIDEBAR_SUBCAT') {
      const sourceCatId = source.droppableId.replace('sidebar-sub-', '');
      const destCatId = destination.droppableId.replace('sidebar-sub-', '');

      const newCategories = data.categories.map(cat => ({
        ...cat,
        subCategories: [...cat.subCategories]
      }));

      const sourceCat = newCategories.find(c => c.id === sourceCatId);
      const destCat = newCategories.find(c => c.id === destCatId);

      if (!sourceCat || !destCat) return;

      const [movedSub] = sourceCat.subCategories.splice(source.index, 1);
      destCat.subCategories.splice(destination.index, 0, movedSub);

      let newLinks = data.links;
      // If moved to a different category, update all links in this subcategory
      if (sourceCatId !== destCatId) {
        newLinks = data.links.map(l => {
          if (l.categoryId === sourceCatId && l.subCategoryId === movedSub.id) {
            return { ...l, categoryId: destCatId };
          }
          return l;
        });
      }

      handleUpdateData({ ...data, categories: newCategories, links: newLinks });
    } else if (type === 'LINK') {
      const sourceParts = source.droppableId.split('__');
      const destParts = destination.droppableId.split('__');
      const sourceCatId = sourceParts[1];
      const sourceSubCatId = sourceParts[2] === 'GENERAL' ? '' : sourceParts[2];
      const destCatId = destParts[1];
      const destSubCatId = destParts[2] === 'GENERAL' ? '' : destParts[2];
      const sourceLinksInGroup = data.links.filter(l => l.categoryId === sourceCatId && (l.subCategoryId || '') === sourceSubCatId);
      const movedItem = sourceLinksInGroup[source.index];
      if (!movedItem) return;
      const remainingLinks = data.links.filter(l => l.id !== movedItem.id);
      const destLinksInGroup = remainingLinks.filter(l => l.categoryId === destCatId && (l.subCategoryId || '') === destSubCatId);
      let globalInsertIndex: number;
      if (destLinksInGroup.length > 0 && destination.index < destLinksInGroup.length) {
        const targetNeighbor = destLinksInGroup[destination.index];
        globalInsertIndex = remainingLinks.findIndex(l => l.id === targetNeighbor.id);
      } else if (destLinksInGroup.length > 0) {
        const lastNeighbor = destLinksInGroup[destLinksInGroup.length - 1];
        globalInsertIndex = remainingLinks.findIndex(l => l.id === lastNeighbor.id) + 1;
      } else {
        globalInsertIndex = remainingLinks.length;
      }
      const updatedItem = { ...movedItem, categoryId: destCatId, subCategoryId: destSubCatId };
      const newLinks = [...remainingLinks];
      newLinks.splice(globalInsertIndex, 0, updatedItem);
      handleUpdateData({ ...data, links: newLinks });
    } else if (type === 'TAG') {
      const map = new Map<string, number>();
      data.links.forEach(l => {
        l.tags?.forEach(tag => {
          const clean = tag.trim();
          if (clean) map.set(clean, (map.get(clean) || 0) + 1);
        });
      });
      const list = Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
      
      let currentOrderedTags: string[];
      if (data.tagOrder && data.tagOrder.length > 0) {
        const orderMap = new Map<string, number>();
        data.tagOrder.forEach((tName, i) => orderMap.set(tName, i));
        const sorted = [...list].sort((a, b) => {
          const hasA = orderMap.has(a.tag);
          const hasB = orderMap.has(b.tag);
          if (hasA && hasB) return orderMap.get(a.tag)! - orderMap.get(b.tag)!;
          if (hasA) return -1;
          if (hasB) return 1;
          return b.count - a.count || a.tag.localeCompare(b.tag);
        });
        currentOrderedTags = sorted.map(s => s.tag);
      } else {
        const sorted = [...list].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
        currentOrderedTags = sorted.map(s => s.tag);
      }

      const newTagOrder = [...currentOrderedTags];
      const [movedTag] = newTagOrder.splice(source.index, 1);
      if (movedTag) {
        newTagOrder.splice(destination.index, 0, movedTag);
        handleUpdateData({ ...data, tagOrder: newTagOrder });
      }
    }
  };

  const renderQuickAddCard = (categoryId: string, subCategoryId: string = '') => (
    <button 
      onClick={() => { setInitialLinkData({ categoryId, subCategoryId }); setIsAdminModalOpen(true); }} 
      className={`group relative rounded-[1.25rem] lg:rounded-[1.5rem] border-2 border-dashed border-slate-200 p-3.5 lg:p-4 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-zinc-50 hover:border-brand-300 dark:border-zinc-700 dark:hover:bg-zinc-800/50 cursor-pointer ${
        isQuickView ? 'min-h-[195px]' : 'h-[96px] lg:h-[104px]'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center transition-colors group-hover:bg-brand-50 group-hover:text-brand-500 dark:bg-zinc-800"><Plus className="w-5 h-5" /></div>
      <span className="text-[11px] font-black text-slate-400 group-hover:text-brand-500 transition-colors tracking-wider">{t.app.quickAdd}</span>
    </button>
  );

  const normalizeUrlKey = (url: string = ''): string => {
    try {
      const u = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
      return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
    } catch {
      return url.trim().toLowerCase().replace(/\/+$/, '');
    }
  };

  const frequentLinks = useMemo(() => {
    const urlMap = new Map<string, LinkItem>();
    data.links.forEach(link => {
      const norm = normalizeUrlKey(link.url) || link.id;
      const existing = urlMap.get(norm);
      if (!existing) {
        urlMap.set(norm, { 
          ...link, 
          clickCount: link.clickCount || 0, 
          lastClickedAt: link.lastClickedAt || 0,
          isPinned: Boolean(link.isPinned),
          pinnedAt: link.pinnedAt || (link.isPinned ? 1 : 0)
        });
      } else {
        const isPinned = Boolean(existing.isPinned || link.isPinned);
        const pinnedAt = Math.max(existing.pinnedAt || 0, link.pinnedAt || 0);
        const totalClicks = (existing.clickCount || 0) + (link.clickCount || 0);
        const latestTime = Math.max(existing.lastClickedAt || 0, link.lastClickedAt || 0);
        urlMap.set(norm, {
          ...existing,
          isPinned,
          pinnedAt,
          clickCount: totalClicks,
          lastClickedAt: latestTime
        });
      }
    });

    return Array.from(urlMap.values())
      .sort((a, b) => {
        const isPinnedA = Boolean(a.isPinned);
        const isPinnedB = Boolean(b.isPinned);
        if (isPinnedA !== isPinnedB) {
          return isPinnedA ? -1 : 1;
        }
        if (isPinnedA && isPinnedB) {
          const pinTimeA = a.pinnedAt || 0;
          const pinTimeB = b.pinnedAt || 0;
          if (pinTimeB !== pinTimeA) return pinTimeB - pinTimeA;
        }
        const clicksA = a.clickCount || 0;
        const clicksB = b.clickCount || 0;
        if (clicksB !== clicksA) return clicksB - clicksA;
        const timeA = a.lastClickedAt || 0;
        const timeB = b.lastClickedAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 100);
  }, [data.links]);

  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    data.links.forEach(l => {
      l.tags?.forEach(tag => {
        const clean = tag.trim();
        if (clean) map.set(clean, (map.get(clean) || 0) + 1);
      });
    });
    const list = Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
    if (data.tagOrder && data.tagOrder.length > 0) {
      const orderMap = new Map<string, number>();
      data.tagOrder.forEach((tName, i) => orderMap.set(tName, i));
      return list.sort((a, b) => {
        const hasA = orderMap.has(a.tag);
        const hasB = orderMap.has(b.tag);
        if (hasA && hasB) return orderMap.get(a.tag)! - orderMap.get(b.tag)!;
        if (hasA) return -1;
        if (hasB) return 1;
        return b.count - a.count || a.tag.localeCompare(b.tag);
      });
    }
    return list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [data.links, data.tagOrder]);

  const handleClickLink = (clickedLink: LinkItem) => {
    const updatedStat = recordClickStat(clickedLink.url, clickedLink.id);
    const normKey = normalizeUrlKey(clickedLink.url);
    const updatedLinks = data.links.map(l => {
      if ((normKey && normalizeUrlKey(l.url) === normKey) || l.id === clickedLink.id) {
        return {
          ...l,
          clickCount: updatedStat.clickCount,
          lastClickedAt: updatedStat.lastClickedAt
        };
      }
      return l;
    });
    handleUpdateData({ ...data, links: updatedLinks });
  };

  const handleTogglePinLink = (clickedLink: LinkItem) => {
    const nextPinned = !clickedLink.isPinned;
    const now = Date.now();
    const normKey = normalizeUrlKey(clickedLink.url);
    const updatedLinks = data.links.map(l => {
      if (l.id === clickedLink.id || (normKey && normalizeUrlKey(l.url) === normKey)) {
        return {
          ...l,
          isPinned: nextPinned,
          pinnedAt: nextPinned ? now : undefined
        };
      }
      return l;
    });
    handleUpdateData({ ...data, links: updatedLinks });
    showToast(
      'success',
      nextPinned
        ? (t.app?.pinnedSuccess ? t.app.pinnedSuccess.replace('{title}', clickedLink.title) : `已将“${clickedLink.title}”固定到常用前排 📌`)
        : (t.app?.unpinnedSuccess ? t.app.unpinnedSuccess.replace('{title}', clickedLink.title) : `已取消“${clickedLink.title}”常用置顶`)
    );
  };

  const sortLinksByFrequency = (linkList: LinkItem[]): LinkItem[] => {
    return [...linkList].sort((a, b) => {
      const isPinnedA = Boolean(a.isPinned);
      const isPinnedB = Boolean(b.isPinned);
      if (isPinnedA !== isPinnedB) {
        return isPinnedA ? -1 : 1;
      }
      if (isPinnedA && isPinnedB) {
        const pinTimeA = a.pinnedAt || 0;
        const pinTimeB = b.pinnedAt || 0;
        if (pinTimeB !== pinTimeA) return pinTimeB - pinTimeA;
      }
      const clicksA = a.clickCount || 0;
      const clicksB = b.clickCount || 0;
      if (clicksB !== clicksA) return clicksB - clicksA;
      const timeA = a.lastClickedAt || 0;
      const timeB = b.lastClickedAt || 0;
      if (timeB !== timeA) return timeB - timeA;
      return 0;
    });
  };

  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    if (collapsedCategories.has(catId)) {
      const next = new Set(collapsedCategories);
      next.delete(catId);
      setCollapsedCategories(next);
    }
  };

  const handleAddCategory = (name: string, icon: string = '') => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', lang === 'zh' ? '分类名称不能为空' : 'Category name cannot be empty');
      return;
    }
    const newCat: Category = {
      id: `c-${Date.now()}`,
      name: trimmed,
      icon: icon || '',
      subCategories: []
    };
    handleUpdateData({
      ...data,
      categories: [...data.categories, newCat]
    });
    setActiveCategoryId(newCat.id);
    setTimeout(() => {
      const el = document.getElementById(`category-${newCat.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    showToast('success', lang === 'zh' ? `主分类「${trimmed}」已创建` : `Category "${trimmed}" created`);
  };

  const handleUpdateCategory = (id: string, name: string, icon?: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', lang === 'zh' ? '分类名称不能为空' : 'Category name cannot be empty');
      return;
    }
    const updatedCategories = data.categories.map(c => {
      if (c.id === id) {
        return {
          ...c,
          name: trimmed,
          ...(icon !== undefined ? { icon } : {})
        };
      }
      return c;
    });
    handleUpdateData({ ...data, categories: updatedCategories });
    showToast('success', lang === 'zh' ? `主分类「${trimmed}」已更新` : `Category "${trimmed}" updated`);
  };

  const handleDeleteCategory = (id: string) => {
    const target = data.categories.find(c => c.id === id);
    if (!target) return;
    const linkCount = data.links.filter(l => l.categoryId === id).length;
    confirmAction(
      t.admin.category.title || (lang === 'zh' ? '删除分类' : 'Delete Category'),
      linkCount > 0 
        ? (lang === 'zh' ? `确定删除主分类「${target.name}」吗？分类下的 ${linkCount} 个链接和所有子分类将一并移除。` : `Delete category "${target.name}"? ${linkCount} links and all subcategories will be removed.`)
        : (lang === 'zh' ? `确定删除主分类「${target.name}」吗？` : `Delete category "${target.name}"?`),
      () => {
        const updatedCategories = data.categories.filter(c => c.id !== id);
        const updatedLinks = data.links.filter(l => l.categoryId !== id);
        handleUpdateData({
          ...data,
          categories: updatedCategories,
          links: updatedLinks
        });
        if (activeCategoryId === id) {
          setActiveCategoryId(updatedCategories[0]?.id || 'frequent');
        }
        showToast('success', lang === 'zh' ? `主分类「${target.name}」已删除` : `Category "${target.name}" removed`);
      },
      true
    );
  };

  const handleAddSubCategory = (categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', lang === 'zh' ? '子分类名称不能为空' : 'Subcategory name cannot be empty');
      return;
    }
    const cat = data.categories.find(c => c.id === categoryId);
    if (!cat) return;
    const newSubId = `sc-${Date.now()}`;
    const updatedCategories = data.categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: [...c.subCategories, { id: newSubId, name: trimmed }]
        };
      }
      return c;
    });
    handleUpdateData({ ...data, categories: updatedCategories });
    showToast('success', lang === 'zh' ? `子分类「${trimmed}」已创建` : `Subcategory "${trimmed}" created`);
  };

  const handleUpdateSubCategory = (categoryId: string, subId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', lang === 'zh' ? '子分类名称不能为空' : 'Subcategory name cannot be empty');
      return;
    }
    const updatedCategories = data.categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.map(s => s.id === subId ? { ...s, name: trimmed } : s)
        };
      }
      return c;
    });
    handleUpdateData({ ...data, categories: updatedCategories });
    showToast('success', lang === 'zh' ? `子分类「${trimmed}」已更新` : `Subcategory "${trimmed}" updated`);
  };

  const handleDeleteSubCategory = (categoryId: string, subId: string) => {
    const cat = data.categories.find(c => c.id === categoryId);
    const sub = cat?.subCategories.find(s => s.id === subId);
    if (!cat || !sub) return;
    const linkCount = data.links.filter(l => l.categoryId === categoryId && l.subCategoryId === subId).length;
    confirmAction(
      t.admin.category.editSub || (lang === 'zh' ? '删除子分类' : 'Delete Subcategory'),
      linkCount > 0 
        ? (lang === 'zh' ? `确定删除子分类「${sub.name}」吗？分类下的 ${linkCount} 个链接将移至通用分类。` : `Delete subcategory "${sub.name}"? ${linkCount} links will be moved to general.`)
        : (lang === 'zh' ? `确定删除子分类「${sub.name}」吗？` : `Delete subcategory "${sub.name}"?`),
      () => {
        const updatedCategories = data.categories.map(c => {
          if (c.id === categoryId) {
            return {
              ...c,
              subCategories: c.subCategories.filter(s => s.id !== subId)
            };
          }
          return c;
        });
        const updatedLinks = data.links.map(l => {
          if (l.categoryId === categoryId && l.subCategoryId === subId) {
            return { ...l, subCategoryId: '' };
          }
          return l;
        });
        handleUpdateData({
          ...data,
          categories: updatedCategories,
          links: updatedLinks
        });
        showToast('success', lang === 'zh' ? `子分类「${sub.name}」已删除` : `Subcategory "${sub.name}" removed`);
      },
      true
    );
  };

  const columns = data.siteConfig?.linkColumns || 4;
  const filteredLinks = activeSearchQuery ? data.links.filter(l => l.title.toLowerCase().includes(activeSearchQuery.toLowerCase())) : data.links;

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    data.links.forEach(l => {
      l.tags?.forEach(tag => {
        const clean = tag.trim();
        if (clean) map.set(clean, (map.get(clean) || 0) + 1);
      });
    });
    const list = Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
    
    if (data.tagOrder && data.tagOrder.length > 0) {
      const orderMap = new Map<string, number>();
      data.tagOrder.forEach((tName, i) => orderMap.set(tName, i));
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
  }, [data.links, data.tagOrder]);

  const tagFilteredLinks = useMemo(() => {
    if (!activeTagFilter) return [];
    return data.links.filter(l => l.tags && l.tags.includes(activeTagFilter));
  }, [data.links, activeTagFilter]);

  const themeIcon = theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'system' ? <Laptop className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />;

  if (isLoading) return null;

  const gridStyle = {
    display: 'grid', 
    gap: isQuickView ? '1.25rem' : '1.25rem',
    gridTemplateColumns: window.innerWidth < 640 
      ? '1fr' 
      : isQuickView 
        ? `repeat(${Math.max(1, Math.min(columns, 3))}, minmax(0, 1fr))` 
        : `repeat(${columns}, minmax(0, 1fr))`
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex h-screen bg-slate-50 text-slate-800 dark:bg-zinc-800 transition-colors ${theme === 'custom' ? 'bg-cover bg-center bg-fixed' : ''}`} style={theme === 'custom' && data.siteConfig?.backgroundUrl ? { backgroundImage: `url(${data.siteConfig.backgroundUrl})` } : {}}>
        {theme === 'custom' && <div className="absolute inset-0 bg-black/40 pointer-events-none fixed z-0" />}
        <div className={pageReady ? 'animate-fade-in' : 'opacity-0'}>
          <Sidebar 
            categories={data.categories} 
            links={data.links} 
            tagOrder={data.tagOrder}
            activeCategoryId={activeCategoryId} 
            onSelectCategory={handleSelectCategory} 
            activeTagFilter={activeTagFilter}
            onSelectTagFilter={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }}
            onClearTagFilter={() => setActiveTagFilter('')}
            isOpen={isSidebarOpen} 
            setIsOpen={setIsSidebarOpen} 
            t={t} 
            isEditMode={isEditMode} 
            siteConfig={data.siteConfig} 
            theme={theme} 
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSubCategory={handleAddSubCategory}
            onUpdateSubCategory={handleUpdateSubCategory}
            onDeleteSubCategory={handleDeleteSubCategory}
          />
        </div>
        <main className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-opacity duration-700 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 animate-slide-up">
            <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 dark:text-zinc-100 transition-transform active:scale-90"><Menu className="w-5 h-5" /></button>
              <div className="relative flex-1 lg:max-w-md group min-w-0 flex items-center">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder={t.app.searchPlaceholder} 
                    value={searchInputValue} 
                    onChange={(e) => setSearchInputValue(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setActiveTagFilter('');
                        setActiveSearchQuery(searchInputValue);
                      }
                    }} 
                    className={`w-full pl-9 pr-4 py-2 bg-slate-100/50 rounded-full text-xs lg:text-sm font-black outline-none border border-transparent focus:border-brand-500/30 focus:bg-white dark:bg-zinc-700/50 dark:text-white dark:placeholder:text-zinc-400 transition-all tracking-wider ${activeTagFilter ? 'ring-1 ring-brand-500/30' : ''}`} 
                  />
                </div>
                {activeTagFilter && (
                  <button
                    onClick={() => setActiveTagFilter('')}
                    className="shrink-0 ml-2 px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-700/50 text-xs font-black flex items-center gap-1 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors"
                    title={t.app.clearTagFilter || '清除标签筛选'}
                  >
                    <span>#{activeTagFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 lg:gap-3 ml-2 relative">
              
              {/* Background Link Health Monitor */}
              <div className="relative" ref={healthMenuRef}>
                <button 
                  type="button" 
                  onClick={() => setIsHealthMenuOpen(!isHealthMenuOpen)}
                  className={`p-2 lg:px-3 lg:py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 ${
                    healthStats.offline > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
                      : isCheckingHealth
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-white/80 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-white/10 hover:border-brand-500/40'
                  }`}
                  title={t.app?.healthCheckTitle || '后台链接响应检测'}
                >
                  <Activity className={`w-4 h-4 lg:w-3.5 lg:h-3.5 shrink-0 ${isCheckingHealth ? 'animate-spin text-amber-500' : healthStats.offline > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
                  <span className="hidden sm:inline">
                    {isCheckingHealth ? (t.app?.detecting || '检测中...') : healthStats.offline > 0 ? (t.app?.offlineCountBadge?.replace('{count}', healthStats.offline.toString()) || `${healthStats.offline} 个离线`) : (t.app?.allOnline || '响应正常')}
                  </span>
                  {healthStats.offline > 0 && (
                    <span className="sm:hidden w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                {isHealthMenuOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 w-80 bg-white dark:bg-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-slate-100 dark:border-white/10 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-700/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">{t.app?.healthCheckTitle || '后台链接响应监视'}</h4>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-400">
                            {isCheckingHealth ? (t.app?.detecting || '正在后台检测...') : `已监控 ${healthStats.total} 个资源链接`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setIsHealthMenuOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t.app?.online || '在线'}
                        </span>
                        <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-0.5">{healthStats.online}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        healthStats.offline > 0 
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' 
                          : 'bg-slate-50 dark:bg-zinc-700/40 border-slate-100 dark:border-zinc-700/50'
                      }`}>
                        <span className={`text-[10px] font-black flex items-center gap-1 ${
                          healthStats.offline > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-zinc-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${healthStats.offline > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                          {t.app?.offline || '离线'}
                        </span>
                        <p className={`text-lg font-black mt-0.5 ${healthStats.offline > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-zinc-300'}`}>
                          {healthStats.offline}
                        </p>
                      </div>
                    </div>

                    {/* Cycle Selector & Timing Section */}
                    <div className="p-3 my-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-700/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-brand-500" />
                          检测周期
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium">
                          {formatLastCheckedText(lastHealthCheckTime)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: '12h', label: '12小时' },
                          { id: '24h', label: '每天一次' },
                          { id: '3d', label: '每3天' },
                          { id: 'manual', label: '仅手动' },
                        ].map(c => {
                          const isCurrent = (currentHealthCycle || '24h') === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleUpdateHealthCycle(c.id as HealthCheckCycle)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                                isCurrent
                                  ? 'bg-brand-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-600 border border-slate-200/60 dark:border-white/5'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight">
                        {currentHealthCycle === 'manual'
                          ? '已设为手动检测，进入页面不会自动发起网络请求。'
                          : '周期内直接复用本地缓存结果，打开导航页不重复检测。'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {healthStats.offline > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterOfflineOnly(prev => !prev);
                              setIsHealthMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              filterOfflineOnly 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{filterOfflineOnly ? (t.app?.showAllLinks || '查看全部链接') : (t.app?.filterOfflineOnly || '仅看离线链接')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleTrustAllOffline();
                              setIsHealthMenuOpen(false);
                            }}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center gap-1.5 transition-colors border border-teal-200/60 dark:border-teal-800/40"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>一键信任全部离线网址</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={isCheckingHealth}
                        onClick={() => {
                          runHealthCheck(true);
                          showToast('info', '已启动后台全量重测...');
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                        <span>{t.app?.recheckLinks || '重新检测全部'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isCheckingHealth}
                        onClick={() => {
                          handleClearHealthCacheAndRescan();
                          setIsHealthMenuOpen(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>清空缓存并深度探测</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative" ref={themeMenuRef}>
                <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-100 transition-all active:scale-95">
                  {themeIcon}
                </button>
                {isThemeMenuOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 w-44 bg-white dark:bg-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-white/5 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    {(['light', 'dark', 'system', 'custom'] as const).map(option => (
                      <button 
                        key={option} 
                        onClick={() => { setTheme(option); saveTheme(option); setIsThemeMenuOpen(false); }} 
                        className={`w-[calc(100%-12px)] mx-1.5 px-3 py-2 flex items-center justify-between rounded-xl text-xs font-black transition-all ${
                          theme === option 
                            ? 'bg-slate-50 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100' 
                            : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {option === 'light' ? <Sun className="w-3.5 h-3.5" /> : option === 'dark' ? <Moon className="w-3.5 h-3.5" /> : option === 'system' ? <Laptop className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <span className="truncate">{t.app.theme[option]}</span>
                        </div>
                        {theme === option && <Check className="w-3 h-3 text-brand-600 dark:text-brand-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => { const nl = lang === 'en' ? 'zh' : 'en'; setLang(nl); saveLanguage(nl); }} className="p-2 text-slate-400 flex items-center gap-1 uppercase text-xs font-black hover:text-brand-500 transition-colors tracking-widest sm:flex hidden"><Languages className="w-4 h-4 lg:w-5 lg:h-5" /> {lang}</button>
              
              {/* Quick View Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isQuickView;
                  setIsQuickView(next);
                  try {
                    localStorage.setItem('navhub_quick_view_mode', next ? 'true' : 'false');
                  } catch {}
                  showToast('info', next ? (t.app?.quickViewActive || '已开启速览模式') : (t.app?.quickViewClosed || '已关闭速览模式'));
                }}
                className={`p-2 lg:px-2.5 lg:py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer ${
                  isQuickView
                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                    : 'bg-white/80 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-white/10 hover:border-brand-500/40 hover:text-brand-600 dark:hover:text-brand-400'
                }`}
                title={isQuickView ? (t.app?.quickViewActive || '速览模式 (已开启) · 点击切回紧凑视图') : (t.app?.quickViewToggle || '开启速览模式 · 展开卡片直接预览详情')}
              >
                <Eye className={`w-4 h-4 lg:w-4 lg:h-4 shrink-0 ${isQuickView ? 'text-white' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span className="hidden md:inline">
                  {t.app?.quickView || '速览'}
                </span>
                {isQuickView && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 hidden md:inline-block" />
                )}
              </button>

              <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg transition-all duration-300 ${isEditMode ? 'bg-brand-600 text-white shadow-lg ring-4 ring-brand-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-100'}`} title={isEditMode ? "Lock" : "Edit"}>{isEditMode ? <Lock className="w-4 h-4 lg:w-5 lg:h-5" /> : <Edit className="w-4 h-4 lg:w-5 lg:h-5" />}</button>
              <button onClick={() => setIsAdminModalOpen(true)} className="bg-slate-900 text-white px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-black flex items-center gap-2 dark:bg-brand-600 active:scale-95 transition-all tracking-wider shadow-md"><Settings className="w-4 h-4" /> <span className="hidden xs:inline">{t.app.admin}</span></button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-10 lg:space-y-12 custom-scrollbar">
            {activeSearchQuery ? (
              <section className={isEditMode ? '' : 'animate-slide-up'}>
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl lg:text-2xl font-black dark:text-white flex items-center gap-3"><LayoutGrid className="text-brand-500" />{t.app.searchResults}: {activeSearchQuery}</h2>
                   <button onClick={() => {setActiveSearchQuery(''); setSearchInputValue('');}} className="text-xs font-bold text-brand-600 hover:underline">Clear Search</button>
                </div>
                <div style={gridStyle}>
                  {filteredLinks.map((link) => (
                    <LinkCard 
                      key={link.id} 
                      item={link} 
                      healthStatus={healthMap[normalizeHealthUrl(link.url)]}
                      isEditMode={false} 
                      onEdit={() => {}} 
                      onDelete={() => {}} 
                      onTogglePin={handleTogglePinLink}
                      onClickLink={handleClickLink}
                      onSelectTag={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }} 
                      onRecheckHealth={handleRecheckSingleUrl}
                      onToggleTrust={handleToggleTrustUrl}
                      activeTag={activeTagFilter} 
                      t={t} 
                      shape={data.siteConfig?.logoShape} 
                      theme={theme} 
                      isQuickView={isQuickView}
                    />
                  ))}
                </div>
              </section>
            ) : activeTagFilter ? (
              <section className={isEditMode ? '' : 'animate-slide-up'}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-500/10 rounded-2xl text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Tags className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                          #{activeTagFilter}
                        </h2>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                          {tagFilteredLinks.length}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 dark:text-zinc-400 mt-1">
                        {t.app.tagPool || '标签池'} · {tagFilteredLinks.length} {lang === 'zh' ? '个资源' : 'links'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTagFilter('')} 
                    className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-200 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t.app.clearTagFilter || '返回全部'}</span>
                  </button>
                </div>

                {/* Tag Pool Quick Navigation Strip */}
                {allTags.length > 1 && (
                  <Droppable droppableId="main-tag-strip" type="TAG" direction="horizontal">
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`mb-8 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md border border-slate-100 dark:border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar transition-colors ${
                          snapshot.isDraggingOver ? 'bg-brand-500/10 ring-2 ring-brand-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 shrink-0 px-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                            {t.app.allTags || '全部标签'}:
                          </span>
                          {isEditMode && (
                            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 lowercase px-1.5 py-0.2 rounded-md bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800">
                              {t.app.dragToReorderTags || '拖拽排序'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {allTags.map(({ tag, count }, tagIndex) => {
                            const isCurrent = activeTagFilter === tag;
                            return (
                              <Draggable
                                key={`maintag-${tag}`}
                                draggableId={`maintag-${tag}`}
                                index={tagIndex}
                                isDragDisabled={!isEditMode}
                              >
                                {(provided, snap) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`inline-flex shrink-0 ${snap.isDragging ? 'z-[999] opacity-90 scale-105 shadow-lg' : ''}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setActiveTagFilter(isCurrent ? '' : tag)}
                                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        isEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-brand-400' : ''
                                      } ${
                                        isCurrent
                                          ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                                          : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 dark:bg-zinc-700/60 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white'
                                      }`}
                                    >
                                      {isEditMode && (
                                        <GripVertical className="w-3 h-3 opacity-50 -ml-1 shrink-0" />
                                      )}
                                      <span>#{tag}</span>
                                      <span className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                                        isCurrent ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-400 dark:text-zinc-400'
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
                      </div>
                    )}
                  </Droppable>
                )}

                {tagFilteredLinks.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 dark:text-zinc-500 font-bold text-sm">
                    {t.app.noLinksInTag || '该标签下暂无网址。'}
                  </div>
                ) : (
                  <div style={gridStyle}>
                    {tagFilteredLinks.map((link) => (
                      <LinkCard 
                        key={link.id} 
                        item={link} 
                        healthStatus={healthMap[normalizeHealthUrl(link.url)]}
                        isEditMode={isEditMode} 
                        onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} 
                        onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} 
                        onTogglePin={handleTogglePinLink}
                        onClickLink={handleClickLink} 
                        onSelectTag={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }} 
                        onRecheckHealth={handleRecheckSingleUrl}
                        onToggleTrust={handleToggleTrustUrl}
                        activeTag={activeTagFilter} 
                        t={t} 
                        shape={data.siteConfig?.logoShape} 
                        theme={theme} 
                        isQuickView={isQuickView}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : filterOfflineOnly ? (
              <section className={isEditMode ? '' : 'animate-slide-up'}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                          {t.app?.offlineLinksTitle || '无法响应的离线链接'}
                        </h2>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                          {offlineLinks.length}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 dark:text-zinc-400 mt-1">
                        {t.app?.offlineLinksDesc || '后台检测连接超时或返回错误，您可以在此集中修改或删除失效书签'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => runHealthCheck(true)} 
                      disabled={isCheckingHealth}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-200 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                      <span>{t.app?.recheckLinks || '重新检测'}</span>
                    </button>
                    <button 
                      onClick={() => setFilterOfflineOnly(false)} 
                      className="px-4 py-2 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.app?.showAllLinks || '查看全部链接'}</span>
                    </button>
                  </div>
                </div>

                {offlineLinks.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border-2 border-dashed border-emerald-200/50 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/20">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300 mb-1">
                      {t.app?.allOnlineNotice || '目前暂无离线链接'}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      所有经后台检测的网址均在线响应正常。
                    </p>
                  </div>
                ) : (
                  <div style={gridStyle}>
                    {offlineLinks.map((link) => (
                      <LinkCard 
                        key={`offline-${link.id}`} 
                        item={link} 
                        healthStatus={healthMap[normalizeHealthUrl(link.url)]}
                        isEditMode={isEditMode} 
                        onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} 
                        onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} 
                        onTogglePin={handleTogglePinLink}
                        onClickLink={handleClickLink} 
                        onSelectTag={(tag) => { setFilterOfflineOnly(false); setActiveTagFilter(tag); }} 
                        onRecheckHealth={handleRecheckSingleUrl}
                        onToggleTrust={handleToggleTrustUrl}
                        onEnhanceIcon={setHdEnhanceLink}
                        activeTag={activeTagFilter} 
                        t={t} 
                        shape={data.siteConfig?.logoShape} 
                        theme={theme} 
                        isQuickView={isQuickView}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Permanent "常用" (Frequent) Main Category - Always on top */}
                {(() => {
                  const isFrequentCollapsed = collapsedCategories.has('frequent');
                  return (
                    <section id="category-frequent" className="scroll-mt-24 animate-slide-up mb-12">
                      <div 
                        className="flex items-center gap-3.5 mb-6 lg:mb-8 group/title cursor-pointer select-none" 
                        onClick={() => toggleCollapse('frequent')}
                      >
                        <button 
                          type="button"
                          className={`relative w-9 h-9 lg:w-10 lg:h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-all duration-300 cursor-pointer active:scale-95 group-hover/title:scale-105 ${
                            isFrequentCollapsed
                              ? 'bg-slate-100 hover:bg-slate-200/90 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-300/80 dark:border-zinc-700'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border-amber-200/60 hover:border-amber-300 dark:border-amber-700/40'
                          }`}
                          onClick={(e) => { e.stopPropagation(); toggleCollapse('frequent'); }}
                          title={isFrequentCollapsed ? '点击展开常用' : '点击折叠常用'}
                          aria-label={isFrequentCollapsed ? '展开常用' : '折叠常用'}
                        >
                          <Flame className={`w-5 h-5 lg:w-6 lg:h-6 transition-all duration-300 ${
                            isFrequentCollapsed 
                              ? 'opacity-50 scale-90 rotate-[-15deg] text-slate-400 dark:text-zinc-500 fill-transparent' 
                              : 'text-amber-500 fill-amber-500/30'
                          }`} />
                          <div 
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border flex items-center justify-center shadow-2xs transition-all duration-300 ${
                              isFrequentCollapsed
                                ? '-rotate-90 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 scale-100'
                                : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-400 opacity-0 group-hover/title:opacity-100 scale-90 group-hover/title:scale-100'
                            }`}
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl lg:text-3xl font-black text-slate-800 drop-shadow-sm dark:text-white uppercase tracking-tight lg:tracking-[0.05em] group-hover/title:text-amber-600 dark:group-hover/title:text-amber-400 transition-colors">
                              {t.app.frequent || '常用'}
                            </h2>
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                              Top {frequentLinks.length}
                            </span>
                            {isFrequentCollapsed && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60 animate-in fade-in duration-200">
                                已折叠 · 点击展开
                              </span>
                            )}
                            {!isFrequentCollapsed && frequentLinks.filter(l => l.isPinned).length > 0 && (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center gap-1 shadow-2xs border border-amber-400">
                                <Pin className="w-2.5 h-2.5 fill-current rotate-12" />
                                <span>
                                  {t.app?.pinnedCount 
                                    ? t.app.pinnedCount.replace('{count}', frequentLinks.filter(l => l.isPinned).length.toString()) 
                                    : `${frequentLinks.filter(l => l.isPinned).length} 个已置顶`}
                                </span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                            {t.app.frequentDesc || '动态统计打开频次最高的前 100 个链接 · 点击自动升序置顶'}
                          </p>
                        </div>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-amber-200/60 to-transparent dark:from-amber-700/30 ml-4 opacity-40"></div>
                      </div>

                      {!isFrequentCollapsed && (
                        frequentLinks.length === 0 ? (
                          <div className="p-8 lg:p-12 text-center rounded-2xl border-2 border-dashed border-amber-200/50 dark:border-zinc-700/60 bg-amber-50/20 dark:bg-zinc-800/20">
                            <Flame className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                            <p className="text-xs lg:text-sm font-bold text-slate-500 dark:text-zinc-400">
                              {t.app.frequentEmpty || '暂无点击记录，点击任意书签后将自动汇聚于此 (最多展示 Top 100)'}
                            </p>
                          </div>
                        ) : (
                          <div style={gridStyle}>
                            {frequentLinks.map((link, idx) => (
                              <LinkCard 
                                key={`frequent-${link.id}`} 
                                item={link} 
                                rank={idx + 1}
                                showStats={true}
                                healthStatus={healthMap[normalizeHealthUrl(link.url)]}
                                isEditMode={isEditMode} 
                                onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} 
                                onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} 
                                onTogglePin={handleTogglePinLink}
                                onClickLink={handleClickLink} 
                                onSelectTag={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }} 
                                onRecheckHealth={handleRecheckSingleUrl}
                                onToggleTrust={handleToggleTrustUrl}
                                onEnhanceIcon={setHdEnhanceLink}
                                activeTag={activeTagFilter} 
                                t={t} 
                                shape={data.siteConfig?.logoShape} 
                                theme={theme} 
                                isQuickView={isQuickView}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </section>
                  );
                })()}

                {data.categories.map((category, catIdx) => {
                  const isCollapsed = collapsedCategories.has(category.id);
                  const hasSubCats = category.subCategories.length > 0;
                  const rawGeneralLinks = data.links.filter(l => l.categoryId === category.id && (!l.subCategoryId || !hasSubCats));
                  const generalLinks = isEditMode
                    ? rawGeneralLinks
                    : (data.siteConfig?.autoSortByFrequency ? sortLinksByFrequency(rawGeneralLinks) : rawGeneralLinks);
                  const totalCategoryLinks = data.links.filter(l => l.categoryId === category.id).length;

                  return (
                    <section key={category.id} id={`category-${category.id}`} className={`scroll-mt-24 mb-12 ${isEditMode ? '' : 'animate-slide-up'}`} style={{ animationDelay: `${catIdx * 100}ms` }}>
                      <div 
                        className="flex items-center gap-3.5 mb-6 lg:mb-8 group/title cursor-pointer select-none" 
                        onClick={() => toggleCollapse(category.id)}
                      >
                        <button
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleCollapse(category.id); 
                          }}
                          className={`relative w-9 h-9 lg:w-10 lg:h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-all duration-300 cursor-pointer active:scale-95 group-hover/title:scale-105 ${
                            isCollapsed
                              ? 'bg-slate-100 hover:bg-slate-200/90 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-300/80 dark:border-zinc-700'
                              : 'bg-brand-50 hover:bg-brand-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border-brand-200/60 hover:border-brand-300 dark:border-white/10 dark:hover:border-white/20'
                          }`}
                          title={isCollapsed ? `点击展开「${category.name}」` : `点击折叠「${category.name}」`}
                          aria-label={isCollapsed ? `展开 ${category.name}` : `折叠 ${category.name}`}
                        >
                          <CategoryIconDisplay 
                            category={category} 
                            className={`w-5 h-5 lg:w-6 lg:h-6 transition-transform duration-300 ${
                              isCollapsed ? 'opacity-50 scale-90 text-slate-400 dark:text-zinc-500' : 'text-brand-600 dark:text-brand-400'
                            }`} 
                          />
                          {/* 微型折叠/展开指示器角标 */}
                          <div 
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border flex items-center justify-center shadow-2xs transition-all duration-300 ${
                              isCollapsed
                                ? '-rotate-90 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 scale-100'
                                : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-400 opacity-0 group-hover/title:opacity-100 scale-90 group-hover/title:scale-100'
                            }`}
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <div className="flex items-center gap-3">
                          {editingCatIdInMain === category.id ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editCatNameInMain}
                                onChange={e => setEditCatNameInMain(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleUpdateCategory(category.id, editCatNameInMain);
                                    setEditingCatIdInMain(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingCatIdInMain(null);
                                  }
                                }}
                                autoFocus
                                className="px-3 py-1 text-lg font-black rounded-xl border-2 border-brand-500 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white outline-none shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateCategory(category.id, editCatNameInMain);
                                  setEditingCatIdInMain(null);
                                }}
                                className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                                title="保存"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatIdInMain(null)}
                                className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h2 className="text-2xl lg:text-3xl font-black text-slate-800 drop-shadow-sm dark:text-white uppercase tracking-tight lg:tracking-[0.05em] group-hover/title:text-brand-600 dark:group-hover/title:text-brand-400 transition-colors">
                              {category.name}
                            </h2>
                          )}
                          {isCollapsed && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60 animate-in fade-in duration-200">
                              已折叠 · {totalCategoryLinks} 个链接 (点击展开)
                            </span>
                          )}

                          {isEditMode && !editingCatIdInMain && (
                            <div className="flex items-center gap-1.5 ml-2" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatIdInMain(category.id);
                                  setEditCatNameInMain(category.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800 transition-colors"
                                title={t.admin?.category?.edit || "重命名主分类"}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMainCatIconPickerTarget({
                                  id: category.id,
                                  name: category.name,
                                  icon: category.icon,
                                  subCategoryNames: category.subCategories.map(s => s.name)
                                })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-zinc-800 transition-colors"
                                title="更换分类图标"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingSubInMainCatId(category.id);
                                  setNewSubNameInMain('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-400 flex items-center gap-1 transition-colors border border-brand-200/60 dark:border-brand-800/40"
                                title={t.admin?.category?.newSub || "在此分类下新增子分类"}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t.admin?.category?.newSub || '新增子分类'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors"
                                title="删除主分类"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-700/50 ml-2 opacity-40"></div>
                      </div>
                      {!isCollapsed && (
                        <div className="space-y-10 lg:space-y-12">
                          {/* Inline Subcategory Add Input in Main Area */}
                          {isEditMode && addingSubInMainCatId === category.id && (
                            <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/20 border-2 border-dashed border-brand-300 dark:border-brand-700/60 flex items-center gap-3 animate-in fade-in duration-200">
                              <span className="text-xs font-black text-brand-700 dark:text-brand-300 shrink-0">
                                新增子分类：
                              </span>
                              <input
                                type="text"
                                value={newSubNameInMain}
                                onChange={e => setNewSubNameInMain(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleAddSubCategory(category.id, newSubNameInMain);
                                    setAddingSubInMainCatId(null);
                                    setNewSubNameInMain('');
                                  } else if (e.key === 'Escape') {
                                    setAddingSubInMainCatId(null);
                                  }
                                }}
                                autoFocus
                                placeholder="输入新子分类名称 (如：热门影视)..."
                                className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-zinc-800 text-xs font-bold rounded-xl border border-brand-300 dark:border-brand-700 outline-none text-slate-800 dark:text-white shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddSubCategory(category.id, newSubNameInMain);
                                  setAddingSubInMainCatId(null);
                                  setNewSubNameInMain('');
                                }}
                                disabled={!newSubNameInMain.trim()}
                                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>创建</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingSubInMainCatId(null)}
                                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {(!hasSubCats || generalLinks.length > 0 || isEditMode) && (
                            <Droppable droppableId={`links__${category.id}__GENERAL`} type="LINK" direction="horizontal">
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} style={gridStyle} className="min-h-[50px]">
                                  {generalLinks.map((link, index) => (
                                    <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`h-full ${snapshot.isDragging ? "z-[999]" : "hover:z-10"}`}>
                                          <LinkCard 
                                            item={link} 
                                            healthStatus={healthMap[normalizeHealthUrl(link.url)]} 
                                            isEditMode={isEditMode} 
                                            isDragging={snapshot.isDragging} 
                                            onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} 
                                            onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} 
                                            onTogglePin={handleTogglePinLink} 
                                            onClickLink={handleClickLink} 
                                            onSelectTag={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }} 
                                            onRecheckHealth={handleRecheckSingleUrl} 
                                            onToggleTrust={handleToggleTrustUrl}
                                            activeTag={activeTagFilter} 
                                            t={t} 
                                            shape={data.siteConfig?.logoShape} 
                                            theme={theme} 
                                            isQuickView={isQuickView}
                                          />
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
                          {hasSubCats && category.subCategories.map((sub) => {
                            const rawSubLinks = data.links.filter(l => l.categoryId === category.id && l.subCategoryId === sub.id);
                            const subLinks = isEditMode
                              ? rawSubLinks
                              : (data.siteConfig?.autoSortByFrequency ? sortLinksByFrequency(rawSubLinks) : rawSubLinks);
                            const isEditingThisSubInMain = editingSubCatIdInMain === sub.id;

                            return (
                              <div key={sub.id} id={`subcat-${sub.id}`} className="animate-fade-in">
                                <div className="flex items-center gap-3 mb-5 lg:mb-6 group/sub">
                                  {isEditingThisSubInMain ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editSubCatNameInMain}
                                        onChange={e => setEditSubCatNameInMain(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            handleUpdateSubCategory(category.id, sub.id, editSubCatNameInMain);
                                            setEditingSubCatIdInMain(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingSubCatIdInMain(null);
                                          }
                                        }}
                                        autoFocus
                                        className="px-2.5 py-1 text-xs font-black rounded-lg border-2 border-brand-500 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white outline-none shadow-xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateSubCategory(category.id, sub.id, editSubCatNameInMain);
                                          setEditingSubCatIdInMain(null);
                                        }}
                                        className="p-1 rounded-lg bg-emerald-500 text-white"
                                        title="保存"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubCatIdInMain(null)}
                                        className="p-1 rounded-lg bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200"
                                        title="取消"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs lg:text-sm font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.12em]"># {sub.name}</span>
                                      {isEditMode && (
                                        <div className="flex items-center gap-1 opacity-70 group-hover/sub:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingSubCatIdInMain(sub.id);
                                              setEditSubCatNameInMain(sub.name);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                            title={t.admin?.category?.editSub || "重命名子分类"}
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSubCategory(category.id, sub.id)}
                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="删除子分类"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <Droppable droppableId={`links__${category.id}__${sub.id}`} type="LINK" direction="horizontal">
                                  {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} style={gridStyle} className="min-h-[50px]">
                                      {subLinks.map((link, index) => (
                                        <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={!isEditMode}>
                                          {(provided, snapshot) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`h-full ${snapshot.isDragging ? "z-[999]" : "hover:z-10"}`}>
                                              <LinkCard 
                                                item={link} 
                                                healthStatus={healthMap[normalizeHealthUrl(link.url)]} 
                                                isEditMode={isEditMode} 
                                                isDragging={snapshot.isDragging} 
                                                onEdit={(item) => { setEditingItem(item); setIsAdminModalOpen(true); }} 
                                                onDelete={(id) => confirmAction(t.admin.tags.deleteTitle, t.app.deleteLinkConfirm, () => handleUpdateData({...data, links: data.links.filter(l => l.id !== id)}))} 
                                                onTogglePin={handleTogglePinLink} 
                                                onClickLink={handleClickLink} 
                                                onSelectTag={(tag) => { setActiveSearchQuery(''); setActiveTagFilter(tag); }} 
                                                onRecheckHealth={handleRecheckSingleUrl} 
                                                onToggleTrust={handleToggleTrustUrl}
                                                onEnhanceIcon={setHdEnhanceLink}
                                                activeTag={activeTagFilter} 
                                                t={t} 
                                                shape={data.siteConfig?.logoShape} 
                                                theme={theme} 
                                                isQuickView={isQuickView}
                                              />
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
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}

                {/* Quick Add Main Category Section in Main Area in Edit Mode */}
                {isEditMode && (
                  <div className="mb-12">
                    {isAddingMainCatInMain ? (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-brand-500 shadow-lg space-y-4 max-w-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                            <FolderPlus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            {t.admin?.category?.new || '新建主分类'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingMainCatInMain(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newMainCatNameInMain}
                          onChange={e => setNewMainCatNameInMain(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleAddCategory(newMainCatNameInMain);
                              setNewMainCatNameInMain('');
                              setIsAddingMainCatInMain(false);
                            } else if (e.key === 'Escape') {
                              setIsAddingMainCatInMain(false);
                            }
                          }}
                          autoFocus
                          placeholder="输入主分类名称 (例如：影音娱乐、设计资源)..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-700/80 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-brand-500 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingMainCatInMain(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddCategory(newMainCatNameInMain);
                              setNewMainCatNameInMain('');
                              setIsAddingMainCatInMain(false);
                            }}
                            disabled={!newMainCatNameInMain.trim()}
                            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-black shadow-md transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>创建分类</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMainCatInMain(true);
                          setNewMainCatNameInMain('');
                        }}
                        className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-brand-400 dark:hover:border-brand-500 bg-white/50 dark:bg-zinc-800/40 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 text-slate-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-2xs group cursor-pointer"
                      >
                        <PlusCircle className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        <span>+ {t.admin?.category?.new || '新建主分类'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Main Content Tag Pool Section */}
                {tagStats.length > 0 && (
                  <section id="tag-pool-section" className="scroll-mt-24 mb-12 animate-slide-up">
                    <div className="flex items-center gap-4 mb-6 lg:mb-8 group/title select-none">
                      <div className="p-1.5 lg:p-2 bg-brand-500/10 rounded-xl dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                        <Tags className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 drop-shadow-sm dark:text-white uppercase tracking-tight lg:tracking-[0.05em]">
                            {t.app.tagPool || '标签池'}
                          </h2>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40">
                            {tagStats.length} Tags
                          </span>
                          {activeTagFilter && (
                            <button
                              onClick={() => setActiveTagFilter('')}
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3 h-3" />
                              <span>{t.app.clearTagFilter || '清除筛选'}</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                          {t.app?.tagPoolDesc || '聚合全站标签，点击可快速筛选对应维度的书签与网址'}
                        </p>
                      </div>
                      <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-700/50 ml-4 opacity-40"></div>
                    </div>

                    <div className="p-5 lg:p-6 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5 shadow-2xs">
                      <div className="flex flex-wrap gap-2">
                        {tagStats.map(({ tag, count }) => {
                          const isSelected = activeTagFilter === tag;
                          return (
                            <button
                              key={`main-tag-pill-${tag}`}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setActiveTagFilter('');
                                } else {
                                  setActiveSearchQuery('');
                                  setActiveTagFilter(tag);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-500/30 scale-105'
                                  : 'bg-slate-100/90 text-slate-700 hover:bg-brand-50 hover:text-brand-600 dark:bg-zinc-700/60 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-brand-400'
                              }`}
                            >
                              <span>#{tag}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* Weekly Trends Section with 7-day Click Graph - Placed Below Tag Pool */}
                <WeeklyTrendsSection 
                  links={data.links} 
                  lang={lang} 
                  theme={theme} 
                  onLinkClick={handleClickLink} 
                />
              </>
            )}
          </div>
        </main>
        {/* MODALS OUTSIDE MAIN TO PREVENT Z-INDEX BUGS */}
        <AdminModal 
          isOpen={isAdminModalOpen} 
          onClose={() => { setIsAdminModalOpen(false); setEditingItem(null); setInitialLinkData(null); }} 
          data={data} 
          onUpdateData={handleUpdateData} 
          cloudConfig={cloudConfig} 
          onUpdateCloudConfig={(c) => { setCloudConfig(c); saveCloudConfig(c); }} 
          onSyncUpload={async (c) => { setIsSyncing(true); const res = await uploadToCloud(data, c || cloudConfig); setIsSyncing(false); showToast(res.success ? 'success' : 'error', res.message); }} 
          onSyncDownload={async (c) => { const res = await downloadFromCloud(c || cloudConfig); if(res.success && res.data) { handleUpdateData(res.data); showToast('success', t.app.success); } }} 
          isSyncing={isSyncing} 
          editingItem={editingItem} 
          initialValues={initialLinkData} 
          t={t} 
          showToast={showToast} 
          confirmAction={confirmAction} 
          theme={theme} 
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({...p, isOpen: false}))} isDangerous={confirmState.isDangerous} />
        
        {hdEnhanceLink && (
          <HdIconEnhanceModal
            isOpen={true}
            onClose={() => setHdEnhanceLink(null)}
            url={hdEnhanceLink.url}
            title={hdEnhanceLink.title}
            currentIcon={hdEnhanceLink.iconUrl}
            onApplyIcon={(newIconUrl: string) => {
              const updatedLinks = data.links.map(l => l.id === hdEnhanceLink.id ? { ...l, iconUrl: newIconUrl } : l);
              const newData = { ...data, links: updatedLinks };
              handleUpdateData(newData);
              showToast('success', `已将「${hdEnhanceLink.title}」的图标成功升级为高清版本！`);
              setHdEnhanceLink(null);
            }}
          />
        )}

        {/* Category Icon Picker Modal in Main Interface */}
        {mainCatIconPickerTarget && (
          <CategoryIconPickerModal
            isOpen={true}
            onClose={() => setMainCatIconPickerTarget(null)}
            categoryName={mainCatIconPickerTarget.name}
            subCategoryNames={mainCatIconPickerTarget.subCategoryNames}
            currentIcon={mainCatIconPickerTarget.icon}
            onApplyIcon={(newIcon) => {
              if (mainCatIconPickerTarget.id) {
                handleUpdateCategory(mainCatIconPickerTarget.id, mainCatIconPickerTarget.name, newIcon);
              }
              setMainCatIconPickerTarget(null);
            }}
          />
        )}
      </div>
    </DragDropContext>
  );
};

const App: React.FC = () => (<ErrorBoundary><Dashboard /></ErrorBoundary>);
export default App;