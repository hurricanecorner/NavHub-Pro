import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, PlusCircle, Upload, Edit2, Trash2, Folder, ListPlus, Download, Cloud, Settings, Wand2, Loader2, Image as ImageIcon, Globe, Tag, ExternalLink, ChevronDown, CheckCircle2, Cpu, Hash, Search, Save, Check, MousePointer2, Apple, Chrome, Play, LayoutGrid, Palette, Send, Sparkles, Wand, Info, GripVertical, ChevronLeft, ChevronRight, Pin, BarChart3, ShieldCheck, Clock, Activity, Layers, Sliders } from 'lucide-react';
import { AppData, Category, LinkItem, CloudConfig, SiteConfig, SubCategory, Theme, LogoShape, HealthCheckCycle } from '../types';
import { ToastType } from './Toast';
import { COLOR_COLLECTIONS, COLOR_PALETTES } from '../App';
import { publishToNotion, uploadToCloud, downloadFromCloud } from '../services/storageUtils';
import { DraggableTagList } from './DraggableTagList';
import { AppStoreSearchPanel } from './AppStoreSearchPanel';
import { AppStoreAppResult } from '../appStoreConstants';
import { detectCountrySync } from '../countryDetector';
import { detectStatsSync, auditSemanticConflict } from '../domainStats';
import { sanitizeDescriptionText, sanitizeTitleText, matchMajorServiceRule } from '../descriptionCleaner';
import { HdIconEnhanceModal } from './HdIconEnhanceModal';
import { LetterIconCustomizerModal } from './LetterIconCustomizerModal';
import { isLikelyLowResIcon, extractCleanHostname, enhanceIconByAlgorithm } from '../utils/iconEnhancer';
import { fetchHighResolutionIcon, generateLetterIcon, normalizeIconForDisplay } from '../services/highResIconService';
import { CategoryIconPickerModal } from './CategoryIconPickerModal';
import { CategoryIconDisplay, resolveCategoryIcon } from '../services/categoryIconService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  cloudConfig: CloudConfig;
  onUpdateCloudConfig: (config: CloudConfig) => void;
  onSyncUpload: (config?: CloudConfig) => void;
  onSyncDownload: (config?: CloudConfig) => void;
  isSyncing: boolean;
  editingItem: LinkItem | null;
  initialValues?: { categoryId: string; subCategoryId: string } | null;
  t: any;
  showToast: (type: ToastType, message: string) => void;
  confirmAction: (title: string, message: string, onConfirm: () => void, isDangerous?: boolean) => void;
  theme: Theme;
}

type Tab = 'link' | 'category' | 'tags' | 'cloud' | 'data' | 'settings';
type LinkMode = 'single' | 'bulk' | 'icons' | 'hdEnhance';

interface MetaCandidateTitle {
  source: string;
  title: string;
}

interface MetaCandidateDesc {
  source: string;
  description: string;
}

interface MetaCandidateIcon {
  source: string;
  iconUrl: string;
}

interface MetaCandidates {
  titles: MetaCandidateTitle[];
  descriptions: MetaCandidateDesc[];
  icons: MetaCandidateIcon[];
  tags?: string[];
  country?: string;
  statsDescription?: string;
}

const detectClientCountry = (targetUrl: string, title?: string, desc?: string): string => {
  return detectCountrySync(targetUrl, { title, description: desc });
};

const compressImage = async (input: string, maxWidth: number = 128, quality = 0.8): Promise<string> => {
  let src = input;
  if (!input) return '';
  if (input.startsWith('http')) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(input)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        src = URL.createObjectURL(blob);
      } else {
        return input;
      }
    } catch (e) {
      return input;
    }
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
        else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (src.startsWith('blob:')) URL.revokeObjectURL(src);
          return resolve(input);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/webp', quality);
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        resolve(compressed);
      } catch {
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        resolve(input);
      }
    };
    img.onerror = () => {
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      resolve(input);
    };
  });
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const extractDomain = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let target = rawUrl.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }
  try {
    const parsed = new URL(target);
    return parsed.hostname;
  } catch {
    return target.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];
  }
};

export const getGoogleFaviconUrl = (rawUrl: string, size = 256): string => {
  const domain = extractDomain(rawUrl);
  if (!domain) return '';
  if (size >= 256) {
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(domain)}&size=256`;
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
};

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, onClose, data, onUpdateData, cloudConfig, onUpdateCloudConfig, onSyncUpload, onSyncDownload, isSyncing, editingItem, initialValues, t, showToast, confirmAction, theme
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({ title: '', url: '', description: '', smartStats: '', categoryId: '', subCategoryId: '', iconUrl: '', iconBgColor: '', tags: [], isPinned: false, isTrusted: false });
  const [autoFaviconEnabled, setAutoFaviconEnabled] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [expandAllTags, setExpandAllTags] = useState(false);
  
  // HD Icon Enhancement State
  const [hdModalTarget, setHdModalTarget] = useState<{ url: string; title: string; currentIcon: string; targetLinkId?: string; initialTab?: 'probe' | 'algorithm' } | null>(null);
  const [isLetterCustomizerOpen, setIsLetterCustomizerOpen] = useState(false);
  const [hdFilter, setHdFilter] = useState<'all' | 'lowres'>('all');
  const [hdSearchQuery, setHdSearchQuery] = useState('');
  const [isBatchUpgrading, setIsBatchUpgrading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isFetchingHighRes, setIsFetchingHighRes] = useState(false);
  const [isEnhancingByAlgo, setIsEnhancingByAlgo] = useState(false);
  
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [isMetaPickerOpen, setIsMetaPickerOpen] = useState(false);
  const [fetchedCandidates, setFetchedCandidates] = useState<MetaCandidates | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<{
    title: string;
    icon: string;
    description: string;
    tags: string[];
  }>({ title: '', icon: '', description: '', tags: [] });

  const baseTagsBeforeMetaRef = useRef<string[]>([]);
  const metaBackupFormRef = useRef<Partial<LinkItem> | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState(''); 
  const [linkBulkIcons, setLinkBulkIcons] = useState<{id: string; preview: string; assignedId: string | null}[]>([]);
  const [selectedBulkIconId, setSelectedBulkIconId] = useState<string | null>(null);
  
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ id: null, name: '', icon: '' });
  const [catIconPickerTarget, setCatIconPickerTarget] = useState<{
    id: string | null;
    name: string;
    icon: string;
    subCategoryNames?: string[];
    isStandalone?: boolean;
  } | null>(null);
  const [subCatEditingId, setSubCatEditingId] = useState<string | null>(null);
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({ parentId: '', id: null, name: '' });
  
  const [siteForm, setSiteForm] = useState<SiteConfig>({ title: '', logoUrl: '', faviconUrl: '', backgroundUrl: '', linkColumns: 4, themeColor: 'indigo', logoShape: 'square', logoBackgroundColor: '' });
  const [localCloud, setLocalCloud] = useState<CloudConfig>(cloudConfig);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [renamingTag, setRenamingTag] = useState<{ old: string; new: string } | null>(null);

  // App Store Match & Search State
  const [appStoreQuery, setAppStoreQuery] = useState('');
  const [isSearchingAppStore, setIsSearchingAppStore] = useState(false);
  const [appStoreResults, setAppStoreResults] = useState<Array<{
    trackId: number;
    cleanName: string;
    trackName: string;
    icon1024: string;
    icon512: string;
    description: string;
  }>>([]);
  const [showAppStoreSearchBox, setShowAppStoreSearchBox] = useState(false);

  // 配色体系选择
  const [paletteCollection, setPaletteCollection] = useState<keyof typeof COLOR_COLLECTIONS>('macaron');

  const globalTags = useMemo(() => {
    const counts: Record<string, number> = {};
    if (data.tagOrder) {
      data.tagOrder.forEach(t => { if (t) counts[t] = counts[t] || 0; });
    }
    data.links.forEach(l => { (l.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }); });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [data.links, data.tagOrder]);

  // 计算当前所选子分类（或主分类通用范围）下已有链接的标签统计，用于推荐标签置顶最前置
  const currentSubCategoryTagsInfo = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!linkForm.categoryId) return { tagCounts: counts, tagNames: new Set<string>(), subCategoryName: '' };

    const cat = data.categories.find(c => c.id === linkForm.categoryId);
    const subCat = cat?.subCategories.find(s => s.id === linkForm.subCategoryId);
    const subCategoryName = subCat ? subCat.name : (cat ? `${cat.name} · 通用` : '');

    const scopedLinks = data.links.filter(l => {
      // 排除当前正在编辑的自身链接
      if (linkForm.id && l.id === linkForm.id) return false;
      if (l.categoryId !== linkForm.categoryId) return false;
      if (linkForm.subCategoryId) {
        return l.subCategoryId === linkForm.subCategoryId;
      }
      return !l.subCategoryId;
    });

    scopedLinks.forEach(l => {
      (l.tags || []).forEach(t => {
        const clean = (t || '').trim().replace(/^#+/, '');
        if (clean) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    });

    return {
      tagCounts: counts,
      tagNames: new Set(Object.keys(counts)),
      subCategoryName
    };
  }, [data.links, data.categories, linkForm.categoryId, linkForm.subCategoryId, linkForm.id]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) { setLinkForm({ ...editingItem, tags: editingItem.tags || [], isPinned: Boolean(editingItem.isPinned), isTrusted: Boolean(editingItem.isTrusted), smartStats: editingItem.smartStats || '' }); setLinkMode('single'); }
      else if (initialValues) { setLinkForm({ title: '', url: '', description: '', smartStats: '', iconUrl: '', iconBgColor: '', tags: [], isPinned: false, isTrusted: false, categoryId: initialValues.categoryId, subCategoryId: initialValues.subCategoryId }); setLinkMode('single'); }
      else { setLinkForm({ title: '', url: '', description: '', smartStats: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', iconBgColor: '', tags: [], isPinned: false, isTrusted: false }); }
      setLocalCloud(cloudConfig);
      
      const savedThemeColor = data.siteConfig?.themeColor || 'indigo';
      setSiteForm({ 
        title: data.siteConfig?.title || t.app.title, 
        logoUrl: data.siteConfig?.logoUrl || '', 
        faviconUrl: data.siteConfig?.faviconUrl || '', 
        backgroundUrl: data.siteConfig?.backgroundUrl || '',
        linkColumns: data.siteConfig?.linkColumns || 4,
        themeColor: savedThemeColor,
        logoShape: data.siteConfig?.logoShape || 'square',
        logoBackgroundColor: data.siteConfig?.logoBackgroundColor || '',
        healthCheckCycle: data.siteConfig?.healthCheckCycle || '24h'
      });
      
      // 自动识别当前所属配色体系
      if (Object.keys(COLOR_COLLECTIONS.morandi).includes(savedThemeColor)) setPaletteCollection('morandi');
      else if (Object.keys(COLOR_COLLECTIONS.traditional).includes(savedThemeColor)) setPaletteCollection('traditional');
      else setPaletteCollection('macaron');
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig, t]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, compress: boolean, callback: (res: string) => void) => {
    const file = e.target.files?.[0]; if (!file) return;
    const originalSize = file.size;

    const reader = new FileReader();
    reader.onload = async (ev) => { 
      const res = ev.target?.result as string; 
      if (res) {
        const finalRes = compress ? await compressImage(res) : await compressImage(res, 1920, 0.7);
        
        // Calculate compressed size from Base64 string length
        // Size in bytes ≈ (length * 3) / 4 - padding
        const base64Str = finalRes.split(',')[1] || '';
        const padding = (base64Str.match(/=+$/) || [])[0]?.length || 0;
        const compressedSize = (base64Str.length * 3 / 4) - padding;

        showToast('success', t.admin.link.imageCompressed.replace('{from}', formatBytes(originalSize)).replace('{to}', formatBytes(compressedSize)));
        
        callback(finalRes); 
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearchAppStore = async (queryOverride?: string) => {
    const q = (queryOverride || appStoreQuery || linkForm.title || linkForm.url || '').trim();
    if (!q) {
      showToast('info', '请输入应用名称或粘贴 App Store 链接');
      return;
    }
    setIsSearchingAppStore(true);
    try {
      let results: any[] = [];
      try {
        const res = await fetch('/api/search-app-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.results) {
            results = json.results;
          }
        }
      } catch (err) {
        console.warn('Backend app store search failed, trying client iTunes API fallback...', err);
      }

      // Direct iTunes API fallback in browser (Apple iTunes Search API supports CORS natively)
      if (!results || results.length === 0) {
        const idMatch = q.match(/\/id(\d+)/i) || q.match(/[?&]id=(\d+)/i) || q.match(/\bid(\d{7,12})\b/i);
        const itunesUrl = idMatch 
          ? `https://itunes.apple.com/lookup?id=${idMatch[1]}&country=cn` 
          : `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=cn&entity=software&limit=6`;
        const res = await fetch(itunesUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.results && json.results.length > 0) {
            results = json.results.map((r: any) => {
              const raw512 = (r.artworkUrl512 || r.artworkUrl100 || '') as string;
              const icon1024 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/1024x1024bb.').replace(/\.jpg$/, '.png') : '';
              const icon512 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/512x512bb.').replace(/\.jpg$/, '.png') : '';
              const cleanName = (r.trackName || '').split(/[-|_—–·]/)[0].trim() || r.trackName;
              return {
                trackId: r.trackId,
                trackName: r.trackName,
                cleanName,
                icon1024: icon1024 || raw512,
                icon512: icon512 || raw512,
                description: r.description ? r.description.split('\n')[0].trim().slice(0, 160) : '',
              };
            });
          }
        }
      }

      if (results && results.length > 0) {
        setAppStoreResults(results);
        showToast('success', `成功找到 ${results.length} 款 App Store 官方超清图标`);
      } else {
        showToast('info', '未找到对应的 App Store 应用，请尝试精简应用名称或直接粘贴链接');
      }
    } catch (e: any) {
      showToast('error', 'App Store 查询失败，请检查网络');
    } finally {
      setIsSearchingAppStore(false);
    }
  };

  const handleApplyAppStoreApp = (app: AppStoreAppResult, preferredSize: '1024' | '512' = '1024') => {
    const selectedIcon = preferredSize === '1024' ? (app.icon1024 || app.icon512) : (app.icon512 || app.icon1024);
    setLinkForm(prev => ({
      ...prev,
      iconUrl: selectedIcon,
      title: prev.title ? prev.title : app.cleanName,
      description: prev.description ? prev.description : (app.description || `${app.cleanName} 官方应用`),
    }));

    if (isMetaPickerOpen && fetchedCandidates) {
      const devTag = app.primaryDevice ? `[${app.primaryDevice}] ` : '';
      const newIcons = [
        { source: `App Store ${devTag}1024px 超清`, iconUrl: app.icon1024 },
        { source: `App Store ${devTag}512px 高清`, iconUrl: app.icon512 },
        ...fetchedCandidates.icons.filter(i => i.iconUrl !== app.icon1024 && i.iconUrl !== app.icon512),
      ];
      setFetchedCandidates(prev => prev ? { ...prev, icons: newIcons } : null);
      setSelectedCandidates(prev => ({ ...prev, icon: selectedIcon }));
    }

    showToast('success', `已选用「${app.cleanName}」App Store ${preferredSize}px 超清图标！`);
  };

  const handleFillAppStoreInfo = (app: AppStoreAppResult) => {
    setLinkForm(prev => ({
      ...prev,
      title: app.cleanName || prev.title,
      description: app.description || `${app.cleanName} 官方应用`,
      iconUrl: app.icon1024 || app.icon512 || prev.iconUrl,
    }));
    showToast('success', `已同步「${app.cleanName}」的标题与官方简介`);
  };

  const handleFetchMetadata = async () => {
    const rawUrl = linkForm.url?.trim(); if (!rawUrl) return;
    let targetUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
    
    // Backup existing form state & tags prior to fetching
    baseTagsBeforeMetaRef.current = [...(linkForm.tags || [])];
    metaBackupFormRef.current = { ...linkForm };

    setLinkForm(prev => ({ ...prev, url: targetUrl }));
    setIsFetchingMeta(true);
    
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/fetch-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn('Backend meta fetch failed, trying client fallbacks...', err);
      }

      // If backend failed or wasn't available, build client fallback (including App Store client query and major service rules)
      if (!data || !data.success) {
        let hostname = '';
        let pathname = '/';
        try {
          const parsed = new URL(targetUrl);
          hostname = parsed.hostname;
          pathname = parsed.pathname;
        } catch {
          hostname = targetUrl.replace(/https?:\/\//, '').split('/')[0];
        }
        const cleanDomain = hostname.replace(/^www\./, '').split('.')[0] || 'Website';
        const fallbackTitle = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
        const googleFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
        const duckduckgoFavicon = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;

        // Check Major Service Rules (e.g. Sogou Search, Baidu, Tencent, etc.)
        const majorRule = matchMajorServiceRule(hostname, pathname);

        // Direct client-side iTunes check
        let itunesIcon: string | null = null;
        let itunesTitle: string | null = null;
        let itunesDesc: string | null = null;
        try {
          const isAppStoreUrl = hostname.includes('apple.com') && (targetUrl.includes('/app/') || targetUrl.includes('/id'));
          const idMatch = targetUrl.match(/\/id(\d+)/i) || targetUrl.match(/[?&]id=(\d+)/i);
          const itunesEndpoint = isAppStoreUrl && idMatch
            ? `https://itunes.apple.com/lookup?id=${idMatch[1]}&country=cn`
            : `https://itunes.apple.com/search?term=${encodeURIComponent(cleanDomain)}&country=cn&entity=software&limit=1`;
          const iRes = await fetch(itunesEndpoint);
          if (iRes.ok) {
            const iData = await iRes.json();
            if (iData.results && iData.results[0]) {
              const r = iData.results[0];
              const raw512 = r.artworkUrl512 || r.artworkUrl100 || '';
              itunesIcon = raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/1024x1024bb.').replace(/\.jpg$/, '.png');
              itunesTitle = (r.trackName || '').split(/[-|_—–·]/)[0].trim() || r.trackName;
              itunesDesc = sanitizeDescriptionText(r.description || '');
            }
          }
        } catch {}

        const iconsList = [];
        if (itunesIcon) {
          iconsList.push({ source: 'App Store 官方超清原图 (1024×1024)', iconUrl: itunesIcon });
        }
        iconsList.push({ source: 'Google 高清 Favicon', iconUrl: googleFavicon });
        iconsList.push({ source: 'DuckDuckGo 图标', iconUrl: duckduckgoFavicon });

        const baseTitle = majorRule?.defaultTitle || itunesTitle || fallbackTitle;
        const clientCountry = detectClientCountry(targetUrl, baseTitle);
        const fallbackTags = Array.from(new Set([
          clientCountry,
          ...(majorRule?.tags || []),
          cleanDomain
        ])).filter(Boolean);

        const clientStats = sanitizeDescriptionText(
          majorRule?.smartStats ||
          detectStatsSync(targetUrl, {
            title: baseTitle,
            description: majorRule?.officialDesc || itunesDesc || '',
            tags: fallbackTags,
            country: clientCountry
          })
        );

        const chosenDesc = sanitizeDescriptionText(majorRule?.officialDesc) || clientStats || `${baseTitle} 官方网站`;

        const descCandidates: Array<{ source: string; description: string }> = [];
        if (majorRule?.officialDesc) {
          descCandidates.push({ source: '官方精炼描述', description: sanitizeDescriptionText(majorRule.officialDesc) });
        }
        if (itunesDesc) {
          descCandidates.push({ source: 'App Store 官方简介', description: itunesDesc });
        }
        if (clientStats) {
          descCandidates.push({ source: '智能统计描述', description: clientStats });
        }
        descCandidates.push({ source: '官方站点访问', description: `${baseTitle} 官方网站 · 域名 ${hostname}` });

        data = {
          success: true,
          title: baseTitle,
          description: chosenDesc,
          statsDescription: clientStats,
          iconUrl: itunesIcon || googleFavicon,
          country: clientCountry,
          tags: fallbackTags,
          candidates: {
            titles: [
              ...(majorRule?.defaultTitle ? [{ source: '官方精选名称', title: majorRule.defaultTitle }] : []),
              ...(itunesTitle ? [{ source: 'App Store 规范名称', title: itunesTitle }] : []),
              { source: '域名名称', title: fallbackTitle },
              { source: '完整域名', title: hostname }
            ],
            descriptions: descCandidates,
            icons: iconsList
          }
        };
      }

      if (data && data.success) {
        const defaultTitle = data.title || data.candidates?.titles?.[0]?.title || '';
        const defaultDesc = data.description || data.candidates?.descriptions?.[0]?.description || '';
        const defaultIcon = data.iconUrl || data.candidates?.icons?.[0]?.iconUrl || '';

        // Unconditionally generate country tag (prioritizing backend, falling back to comprehensive client heuristics)
        const detectedCountry: string = data.country || detectClientCountry(targetUrl, defaultTitle, defaultDesc) || '中国';

        const titles = data.candidates?.titles?.length ? data.candidates.titles : [{ source: '网页标题', title: defaultTitle }];
        const descriptions = data.candidates?.descriptions?.length ? data.candidates.descriptions : [{ source: '网页描述', description: defaultDesc }];
        const icons = data.candidates?.icons?.length ? data.candidates.icons : [{ source: '网站图标', iconUrl: defaultIcon }];

        // Ensure country tag is strictly placed at index 0 of candidate tags
        const rawTags: string[] = (data.tags || []).filter((t: any) => typeof t === 'string' && t && t !== detectedCountry);
        // 将同子分类已有链接的标签置顶推荐（按子分类内频次降序）
        const subCatTagsList = Object.entries(currentSubCategoryTagsInfo.tagCounts)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([name]) => name)
          .filter(t => t !== detectedCountry);
        const candidateTags: string[] = [detectedCountry, ...subCatTagsList, ...rawTags];
        const uniqueCandidateTags: string[] = Array.from(new Set<string>(candidateTags));

        const smartStats = data.statsDescription || descriptions.find((d: any) => d.source === '智能统计描述' || d.source?.includes('统计'))?.description;

        setFetchedCandidates({
          titles,
          descriptions,
          icons,
          tags: uniqueCandidateTags,
          country: detectedCountry,
          statsDescription: smartStats,
        });

        setSelectedCandidates({
          title: defaultTitle,
          description: defaultDesc,
          icon: defaultIcon,
          tags: uniqueCandidateTags
        });

        // Retain original manual tags that were NOT part of the new candidates
        const preservedBaseTags = (baseTagsBeforeMetaRef.current || []).filter(t => !uniqueCandidateTags.includes(t));
        const initialMerged = [detectedCountry, ...preservedBaseTags, ...uniqueCandidateTags.filter(t => t !== detectedCountry)];
        const uniqueInitialTags: string[] = Array.from(new Set<string>(initialMerged));

        setLinkForm(prev => ({
          ...prev,
          title: defaultTitle || prev.title,
          description: defaultDesc || prev.description,
          iconUrl: defaultIcon || prev.iconUrl,
          tags: uniqueInitialTags
        }));

        setIsMetaPickerOpen(true);
        showToast('success', detectedCountry 
          ? `元数据获取成功！已识别所属地区为「${detectedCountry}」并置于首个标签`
          : (t.admin.link.meta.success || '元数据获取成功！')
        );
      } else {
        showToast('error', t.admin.link.meta.error);
      }
    } catch (e: any) {
      console.error('Fetch metadata error:', e);
      showToast('error', t.admin.link.meta.error);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleToggleCandidateTag = (tag: string) => {
    const isSelected = selectedCandidates.tags.includes(tag);
    const nextSelectedTags = isSelected
      ? selectedCandidates.tags.filter(t => t !== tag)
      : [...selectedCandidates.tags, tag];

    setSelectedCandidates(prev => ({
      ...prev,
      tags: nextSelectedTags
    }));

    // Real-time synchronization to linkForm.tags so unselected candidate tags are immediately removed
    setLinkForm(prev => {
      const allCandidates = fetchedCandidates?.tags || [];
      const detectedCountry = fetchedCandidates?.country;

      // Preserve any manual tags the user already had that were NOT among candidates
      const preservedBase = (baseTagsBeforeMetaRef.current || []).filter(t => !allCandidates.includes(t));

      let updatedTags = [...nextSelectedTags, ...preservedBase];
      if (detectedCountry && nextSelectedTags.includes(detectedCountry)) {
        updatedTags = [detectedCountry, ...updatedTags.filter(t => t !== detectedCountry)];
      }

      return {
        ...prev,
        tags: Array.from(new Set<string>(updatedTags))
      };
    });
  };

  const handleAbandonMeta = () => {
    if (metaBackupFormRef.current) {
      setLinkForm(metaBackupFormRef.current);
    }
    setIsMetaPickerOpen(false);
  };

  const applyMetaSelection = () => {
    setLinkForm(prev => {
      const selected = selectedCandidates.tags;
      const allCandidates = fetchedCandidates?.tags || [];
      const detectedCountry = fetchedCandidates?.country;
      
      // Preserve any manual tags the user had before fetching that were NOT among candidates
      const preservedBase = (baseTagsBeforeMetaRef.current || []).filter(t => !allCandidates.includes(t));
      
      let finalTags = [...selected, ...preservedBase];
      if (detectedCountry && selected.includes(detectedCountry)) {
        finalTags = [detectedCountry, ...finalTags.filter(t => t !== detectedCountry)];
      }

      return {
        ...prev,
        title: selectedCandidates.title || prev.title,
        iconUrl: selectedCandidates.icon || prev.iconUrl,
        description: selectedCandidates.description || prev.description,
        tags: Array.from(new Set<string>(finalTags))
      };
    });
    setIsMetaPickerOpen(false);
    showToast('success', t.admin.link.meta.success || '已应用选择的元数据！');
  };

  const handleFillSmartStatsDescription = () => {
    const candidateStats = fetchedCandidates?.statsDescription
      || fetchedCandidates?.descriptions?.find(d => d.source === '智能统计描述' || d.source.includes('统计'))?.description;

    if (candidateStats) {
      setLinkForm(prev => ({ ...prev, description: candidateStats, smartStats: candidateStats }));
      showToast('success', t.admin.link.meta.statsApplied || '已填入权威智能统计描述！');
      return;
    }

    if (linkForm.url) {
      const stats = detectStatsSync(linkForm.url, {
        title: linkForm.title,
        description: linkForm.description,
        tags: linkForm.tags,
      });
      if (stats) {
        setLinkForm(prev => ({ ...prev, description: stats, smartStats: stats }));
        showToast('success', t.admin.link.meta.statsApplied || '已填入权威智能统计描述！');
        return;
      }
    }

    showToast('error', '请先输入有效的网址或点击上方魔法棒');
  };

  const normalizeUrlKey = (url: string = ''): string => {
    try {
      const u = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
      return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
    } catch {
      return url.trim().toLowerCase().replace(/\/+$/, '');
    }
  };

  const existingSameUrlItem = useMemo(() => {
    if (!linkForm.url?.trim()) return null;
    const norm = normalizeUrlKey(linkForm.url);
    if (!norm) return null;
    return data.links.find(l => normalizeUrlKey(l.url) === norm && l.id !== linkForm.id) || null;
  }, [linkForm.url, linkForm.id, data.links]);

  const handleAutoFetchFavicon = (urlOverride?: string) => {
    const url = (urlOverride || linkForm.url || '').trim();
    if (!url) {
      showToast('info', t.admin?.link?.autoFaviconPrompt || '请先输入有效的链接网址 (URL)');
      return;
    }
    const domain = extractDomain(url);
    if (!domain || !domain.includes('.')) {
      showToast('error', '无法从当前网址识别出有效域名，请检查网址格式');
      return;
    }
    const faviconUrl = getGoogleFaviconUrl(url, 128);
    setLinkForm(prev => ({
      ...prev,
      iconUrl: faviconUrl
    }));

    if (isMetaPickerOpen && fetchedCandidates) {
      const newIcons = [
        { source: `Google 高清 Favicon (${domain})`, iconUrl: faviconUrl },
        ...fetchedCandidates.icons.filter(i => i.iconUrl !== faviconUrl)
      ];
      setFetchedCandidates(prev => prev ? { ...prev, icons: newIcons } : null);
      setSelectedCandidates(prev => ({ ...prev, icon: faviconUrl }));
    }

    const successMsg = (t.admin?.link?.autoFaviconSuccess || '已通过 Google 成功获取「{domain}」的 Favicon 图标！').replace('{domain}', domain);
    showToast('success', successMsg);
  };

  const handleBatchUpgradeHdIcons = async () => {
    const targetLinks = data.links.filter(l => isLikelyLowResIcon(l.iconUrl) || !l.iconUrl);
    if (targetLinks.length === 0) {
      showToast('info', t.admin?.link?.hdEnhance?.allHdNotice || '全站链接图标均已达到超高清标准！');
      return;
    }

    setIsBatchUpgrading(true);
    setBatchProgress({ current: 0, total: targetLinks.length });

    const updatedLinks = [...data.links];
    let upgradedCount = 0;

    for (let i = 0; i < targetLinks.length; i++) {
      const link = targetLinks[i];
      try {
        const res = await fetchHighResolutionIcon({
          url: link.url,
          title: link.title,
          currentFavicon: link.iconUrl,
          timeoutMs: 2500,
        });

        const idx = updatedLinks.findIndex(l => l.id === link.id);
        if (idx !== -1 && res.iconUrl) {
          updatedLinks[idx] = {
            ...updatedLinks[idx],
            iconUrl: res.iconUrl,
          };
          upgradedCount++;
        }
      } catch {
        const cleanHost = extractCleanHostname(link.url);
        const idx = updatedLinks.findIndex(l => l.id === link.id);
        if (idx !== -1) {
          const fallback = cleanHost
            ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanHost}&size=256`
            : generateLetterIcon(link.title || link.url);
          updatedLinks[idx] = {
            ...updatedLinks[idx],
            iconUrl: fallback,
          };
          upgradedCount++;
        }
      }
      setBatchProgress({ current: i + 1, total: targetLinks.length });
    }

    const newData = { ...data, links: updatedLinks };
    onUpdateData(newData);
    setIsBatchUpgrading(false);
    setBatchProgress(null);
    showToast('success', (t.admin?.link?.hdEnhance?.batchSuccess || '成功将 {count} 个图标升级为超清版本！').replace('{count}', upgradedCount.toString()));
  };

  const handleQuickUpgradeSingleLink = async (linkId: string, url: string) => {
    const link = data.links.find(l => l.id === linkId);
    showToast('info', '正在深度探测超清图标 (Manifest / Apple Touch)...');
    try {
      const res = await fetchHighResolutionIcon({
        url,
        title: link?.title,
        currentFavicon: link?.iconUrl,
        timeoutMs: 3500,
      });

      if (res.iconUrl) {
        const updatedLinks = data.links.map(l => l.id === linkId ? { ...l, iconUrl: res.iconUrl } : l);
        onUpdateData({ ...data, links: updatedLinks });
        showToast('success', res.isLetterFallback ? '已自动配置极简字标徽标！' : `成功升级为超清图标 (${res.source})！`);
        return;
      }
    } catch {}

    const cleanHost = extractCleanHostname(url);
    const fallback = cleanHost
      ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanHost}&size=256`
      : generateLetterIcon(link?.title || url);
    const updatedLinks = data.links.map(l => l.id === linkId ? { ...l, iconUrl: fallback } : l);
    onUpdateData({ ...data, links: updatedLinks });
    showToast('success', '已将该链接图标升级为超清图标！');
  };

  const handleQuickAlgorithmEnhance = async () => {
    let targetUrl = (linkForm.url || '').trim().replace(/^['"]+|['"]+$/g, '');
    let currentIcon = (linkForm.iconUrl || '').trim().replace(/^['"]+|['"]+$/g, '');

    // 智能推导网址
    if (!targetUrl && currentIcon) {
      const domainMatch = currentIcon.match(/[?&]domain=([^&#]+)/i);
      if (domainMatch && domainMatch[1]) {
        targetUrl = `https://${domainMatch[1]}`;
      } else if (currentIcon.startsWith('http')) {
        try {
          const p = new URL(currentIcon);
          targetUrl = `${p.protocol}//${p.hostname}`;
        } catch {
          targetUrl = currentIcon;
        }
      }
    }

    if (!targetUrl && !currentIcon && !linkForm.title) {
      showToast('error', '请先输入网址、图标地址或名称，再进行算法高清化');
      return;
    }

    setIsEnhancingByAlgo(true);
    showToast('info', '正在进行算法超分辨率重构 (4× 超采样 + USM 锐化)...');

    try {
      // 1. 若当前已有图标
      if (currentIcon) {
        // 如果已经是高质量矢量 SVG Data URI，已达最高无损锐度
        if (currentIcon.startsWith('data:image/svg+xml')) {
          showToast('info', '当前图标已是无损矢量格式，边缘已达极致清晰度！');
          setIsEnhancingByAlgo(false);
          return;
        }

        try {
          // 尝试对当前位图执行阶梯超采样 + 卷积边缘锐化
          const enhanced = await enhanceIconByAlgorithm(currentIcon, {
            intensity: 0.65,
            targetSize: 256,
            boostContrast: true,
          });

          if (enhanced && enhanced.dataUrl) {
            setLinkForm(prev => ({ ...prev, iconUrl: enhanced.dataUrl }));
            showToast('success', `算法高清重构成功！(${enhanced.qualityGain || '4× 超采样 + 锐化'})`);
            setIsEnhancingByAlgo(false);
            return;
          }
        } catch {
          // 当前图标加载失败（如网络 400/404 或损坏），继续尝试网络探测与修复
        }
      }

      // 2. 如果原图加载失败或原图为空，先探测官方高清源或降级字标，再做增强
      const probeRes = await fetchHighResolutionIcon({
        url: targetUrl || currentIcon,
        title: linkForm.title,
        forceRefresh: true,
      });

      if (probeRes.iconUrl) {
        if (probeRes.isLetterFallback) {
          setLinkForm(prev => ({ ...prev, iconUrl: probeRes.iconUrl }));
          showToast('success', '原图标无效，已自动生成优雅极简字标！');
        } else {
          try {
            const enhanced = await enhanceIconByAlgorithm(probeRes.iconUrl, {
              intensity: 0.65,
              targetSize: 256,
              boostContrast: true,
            });
            setLinkForm(prev => ({ ...prev, iconUrl: enhanced.dataUrl }));
            showToast('success', '已获取高清原图并完成算法超采样锐化！');
          } catch {
            setLinkForm(prev => ({ ...prev, iconUrl: probeRes.iconUrl }));
            showToast('success', `成功升级为高清图标（来源：${probeRes.source}）！`);
          }
        }
      } else {
        const letter = generateLetterIcon(linkForm.title || targetUrl || 'Web');
        setLinkForm(prev => ({ ...prev, iconUrl: letter }));
        showToast('success', '已自动生成算法极简字标！');
      }
    } catch {
      const letter = generateLetterIcon(linkForm.title || targetUrl || 'Web');
      setLinkForm(prev => ({ ...prev, iconUrl: letter }));
      showToast('success', '已自动生成算法极简字标！');
    } finally {
      setIsEnhancingByAlgo(false);
    }
  };

  const handleFetchHighResIcon = async () => {
    let targetUrl = (linkForm.url || '').trim().replace(/^['"]+|['"]+$/g, '');
    let currentIcon = (linkForm.iconUrl || '').trim().replace(/^['"]+|['"]+$/g, '');

    // 智能推导网址
    if (!targetUrl && currentIcon) {
      const domainMatch = currentIcon.match(/[?&]domain=([^&#]+)/i);
      if (domainMatch && domainMatch[1]) {
        targetUrl = `https://${domainMatch[1]}`;
      } else if (currentIcon.startsWith('http')) {
        try {
          const p = new URL(currentIcon);
          targetUrl = `${p.protocol}//${p.hostname}`;
        } catch {
          targetUrl = currentIcon;
        }
      }
    }

    if (!targetUrl && !currentIcon && !linkForm.title) {
      showToast('error', '请先输入网址、图标地址或站点名称');
      return;
    }

    setIsFetchingHighRes(true);
    showToast('info', '正在深度探测 Web App Manifest 与 Apple Touch 超清图标...');
    try {
      const result = await fetchHighResolutionIcon({
        url: targetUrl || currentIcon,
        title: linkForm.title,
        currentFavicon: currentIcon,
        forceRefresh: true, // 强制重新探测，不直接回传旧图
      });

      if (result.iconUrl) {
        setLinkForm(prev => ({ ...prev, iconUrl: result.iconUrl }));
        if (result.isLetterFallback) {
          showToast('success', '未探测到高分辨率位图，已自动生成专属极简字标！');
        } else {
          showToast('success', `成功获取超清图标（来源：${result.source}）！`);
        }
      }
    } catch {
      const letterIcon = generateLetterIcon(linkForm.title || targetUrl || 'Web');
      setLinkForm(prev => ({ ...prev, iconUrl: letterIcon }));
      showToast('success', '已生成极简字标图标！');
    } finally {
      setIsFetchingHighRes(false);
    }
  };

  const handleGenerateLetterIcon = () => {
    const titleOrUrl = (linkForm.title || linkForm.url || 'Web').trim().replace(/^['"]+|['"]+$/g, '');
    const letterIcon = generateLetterIcon(titleOrUrl);
    setLinkForm(prev => ({ ...prev, iconUrl: letterIcon }));
    showToast('success', '已生成专属极简字标徽标！');
  };

  const handleUrlChange = (newUrl: string) => {
    const updatedForm = { ...linkForm, url: newUrl };
    if (!linkForm.id && newUrl.trim()) {
      const norm = normalizeUrlKey(newUrl);
      const match = data.links.find(l => normalizeUrlKey(l.url) === norm);
      if (match) {
        updatedForm.title = match.title;
        updatedForm.description = match.description;
        updatedForm.iconUrl = match.iconUrl;
        updatedForm.iconBgColor = match.iconBgColor;
        updatedForm.tags = match.tags;
      } else if (autoFaviconEnabled) {
        const domain = extractDomain(newUrl);
        const isPrevGoogleFavicon = (linkForm.iconUrl || '').includes('google.com/s2/favicons');
        const hasCustomBase64 = (linkForm.iconUrl || '').startsWith('data:');
        if (domain && domain.includes('.') && (!linkForm.iconUrl || isPrevGoogleFavicon) && !hasCustomBase64) {
          updatedForm.iconUrl = getGoogleFaviconUrl(newUrl, 128);
        }
      }
    } else if (autoFaviconEnabled && newUrl.trim()) {
      const isPrevGoogleFavicon = (linkForm.iconUrl || '').includes('google.com/s2/favicons');
      const hasCustomBase64 = (linkForm.iconUrl || '').startsWith('data:');
      if ((!linkForm.iconUrl || isPrevGoogleFavicon) && !hasCustomBase64) {
        const domain = extractDomain(newUrl);
        if (domain && domain.includes('.')) {
          updatedForm.iconUrl = getGoogleFaviconUrl(newUrl, 128);
        }
      }
    }
    setLinkForm(updatedForm);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = typeof tagToAdd === 'string' ? tagToAdd : tagInput;
    if (!raw) return;
    const incomingTags = raw
      .split(/[,，\s]+/)
      .map(t => t.trim().replace(/^#+/, ''))
      .filter(Boolean);
    if (incomingTags.length === 0) return;

    setLinkForm(prev => {
      const currentTags = prev.tags || [];
      const newTags = [...currentTags];
      incomingTags.forEach(t => {
        if (!newTags.includes(t)) {
          newTags.push(t);
        }
      });
      return { ...prev, tags: newTags };
    });
    if (tagToAdd === undefined) {
      setTagInput('');
    }
  };

  const handleSaveLink = () => {
    if (!linkForm.title?.trim() || !linkForm.url?.trim()) { showToast('error', 'Required fields empty'); return; }
    const newItem: LinkItem = {
      id: linkForm.id || `l-${Date.now()}`,
      title: linkForm.title.trim(),
      url: linkForm.url.trim(),
      description: linkForm.description?.trim() || '',
      smartStats: linkForm.smartStats !== undefined && linkForm.smartStats !== null && linkForm.smartStats.trim() !== ''
        ? auditSemanticConflict(linkForm.smartStats.trim(), {
            title: linkForm.title.trim(),
            description: linkForm.description?.trim() || '',
            tags: linkForm.tags || []
          })
        : (linkForm.smartStats === '' ? '' : undefined),
      iconUrl: linkForm.iconUrl || '',
      iconBgColor: linkForm.iconBgColor || '',
      categoryId: linkForm.categoryId || data.categories[0]?.id || '',
      subCategoryId: linkForm.subCategoryId || '',
      tags: linkForm.tags || [],
      clickCount: linkForm.clickCount,
      lastClickedAt: linkForm.lastClickedAt,
      isPinned: Boolean(linkForm.isPinned),
      pinnedAt: linkForm.isPinned ? (linkForm.pinnedAt || Date.now()) : undefined,
      isTrusted: Boolean(linkForm.isTrusted)
    };
    
    const normKey = normalizeUrlKey(newItem.url);
    const newLinks = data.links.map(l => {
      if (linkForm.id && l.id === linkForm.id) {
        return newItem;
      }
      if (normKey && normalizeUrlKey(l.url) === normKey && l.id !== newItem.id) {
        return {
          ...l,
          title: newItem.title,
          description: newItem.description,
          smartStats: newItem.smartStats,
          iconUrl: newItem.iconUrl,
          iconBgColor: newItem.iconBgColor,
          tags: newItem.tags,
          isPinned: newItem.isPinned ?? l.isPinned,
          pinnedAt: newItem.pinnedAt ?? l.pinnedAt,
          isTrusted: newItem.isTrusted ?? l.isTrusted,
          clickCount: Math.max(l.clickCount || 0, newItem.clickCount || 0),
          lastClickedAt: Math.max(l.lastClickedAt || 0, newItem.lastClickedAt || 0)
        };
      }
      return l;
    });
    if (!linkForm.id) {
      newLinks.push(newItem);
    }
    onUpdateData({ ...data, links: newLinks });
    showToast('success', t.app.saved);
    if (!linkForm.id) { setLinkForm({ title: '', url: '', description: '', smartStats: '', categoryId: linkForm.categoryId, subCategoryId: linkForm.subCategoryId, iconUrl: '', iconBgColor: '', tags: [], isPinned: false }); setTagInput(''); }
    else onClose();
  };

  // Helper to determine the preview class for the large logo preview
  const getPreviewShapeClass = (shape?: LogoShape) => {
    switch(shape) {
      case 'circle': return 'rounded-full';
      case 'rounded': return 'rounded-[38%]'; // Xiaomi superellipse style
      case 'square': return 'rounded-none'; // Default Square
      default: return 'rounded-none'; // Default Square
    }
  };

  // Helper for small shape schematic icons
  const getShapeIconClass = (shape: LogoShape) => {
    switch(shape) {
      case 'circle': return 'rounded-full';
      case 'rounded': return 'rounded-[38%]'; // Xiaomi superellipse style
      case 'square': return 'rounded-none'; 
      default: return 'rounded-none';
    }
  };

  // 防御性配色获取，确保预览不会因 undefined[shade] 崩溃
  const currentThemePalette = COLOR_PALETTES[siteForm.themeColor || 'indigo'] || COLOR_PALETTES['indigo'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 overflow-hidden pointer-events-auto">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-zinc-800 w-full h-full lg:max-w-[1250px] lg:h-[92vh] lg:rounded-[2.5rem] flex flex-col lg:flex-row overflow-hidden border border-slate-200 dark:border-white/5 relative z-[110] animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-[280px] bg-slate-50 dark:bg-zinc-900/50 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0">
          <div className="p-6 lg:p-10 flex items-center gap-4">
            <div className="p-2 lg:p-3 bg-brand-600 rounded-xl shadow-lg shadow-brand-100"><LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6 text-white" /></div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight leading-none">{t.admin.title}</h2>
          </div>
          <div className="flex-1 flex lg:flex-col overflow-x-auto lg:overflow-y-auto px-4 lg:px-4 space-x-2 lg:space-x-0 lg:space-y-1 pb-4 lg:pb-0">
            {(Object.keys(t.admin.tabs) as Tab[]).map((tabId) => {
              const iconsMap: Record<Tab, React.ReactNode> = {
                link: <PlusCircle className="w-5 h-5" />, category: <Folder className="w-5 h-5" />, tags: <Hash className="w-5 h-5" />,
                cloud: <Cloud className="w-5 h-5" />, data: <Download className="w-5 h-5" />, settings: <Settings className="w-5 h-5" />,
              };
              return (
                <button key={tabId} onClick={() => setActiveTab(tabId)} className={`flex items-center gap-3 px-5 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm font-bold rounded-xl transition-all shrink-0 whitespace-nowrap ${activeTab === tabId ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50'}`}>
                  {iconsMap[tabId]} <span>{t.admin.tabs[tabId]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-800">
          <div className="h-16 lg:h-20 flex items-center justify-between px-6 lg:px-12 shrink-0 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-800 relative z-50">
            <h3 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">{t.admin.tabs[activeTab]}</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="p-3 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-2xl transition-all active:scale-90 relative z-[200]"
              title="Close"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 pt-6 lg:pt-8 custom-scrollbar">
            {activeTab === 'link' && (
              <div className="max-w-4xl space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-zinc-900/50 rounded-2xl w-full lg:w-fit border border-slate-200">
                  {(['single', 'bulk', 'icons', 'hdEnhance'] as const).map(m => (
                    <button key={m} onClick={() => setLinkMode(m)} className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${linkMode === m ? 'bg-white dark:bg-zinc-100 text-brand-600 shadow-lg' : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-800'}`}>{t.admin.link.modes[m]}</button>
                  ))}
                </div>

                {linkMode === 'single' && (
                  <div className="space-y-8 lg:space-y-10 max-w-3xl">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.url} <span className="text-red-500">*</span></label>
                      <div className="flex gap-3">
                        <input type="text" value={linkForm.url} onChange={e => handleUrlChange(e.target.value)} className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 transition-colors font-bold text-base dark:text-white" placeholder="https://example.com" />
                        <button 
                          type="button" 
                          onClick={() => handleAutoFetchFavicon()} 
                          title="使用 Google Favicon API 根据输入的 URL 自动获取高清图标" 
                          className="px-4 lg:px-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl transition-all shrink-0 flex items-center justify-center gap-1.5 text-xs font-black shadow-sm active:scale-95"
                        >
                          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">Favicon</span>
                        </button>
                        <button onClick={handleFetchMetadata} disabled={isFetchingMeta} title="智能分析抓取多源元数据" className="w-14 lg:w-20 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-colors shrink-0 flex items-center justify-center disabled:bg-brand-400 shadow-lg">{isFetchingMeta ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" /> : <Wand2 className="w-5 h-5 lg:w-6 lg:h-6" />}</button>
                      </div>
                      {existingSameUrlItem && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
                          <Info className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>
                            {t.app.duplicateDetected || '检测到其他分类中已存在同网址链接，已自动同步载入全部内容'} (已存在于「{data.categories.find(c => c.id === existingSameUrlItem.categoryId)?.name || '其他'}」分类)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.title} <span className="text-red-500">*</span></label>
                      <input type="text" value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} className="w-full px-6 py-4 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base focus:border-brand-500 dark:text-white" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-6 py-4 bg-slate-50/50 dark:bg-zinc-700/50 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base appearance-none cursor-pointer focus:border-brand-500 dark:text-white">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-6 py-4 bg-slate-50/50 dark:bg-zinc-700/50 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base appearance-none cursor-pointer focus:border-brand-500 dark:text-white"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.icon}</label>
                      <div className="flex items-center gap-6 p-6 bg-slate-50/30 dark:bg-zinc-900/10 border border-slate-100 dark:border-white/5 rounded-[2rem]">
                        <div 
                          className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-inner overflow-hidden"
                          style={linkForm.iconBgColor ? { backgroundColor: linkForm.iconBgColor } : {}}
                        >
                          {linkForm.iconUrl ? <img src={normalizeIconForDisplay(linkForm.iconUrl)} className="w-full h-full object-contain select-none" /> : <Globe className="w-10 h-10 text-slate-200" />}
                        </div>
                        <div className="flex-1 space-y-4">
                          {/* Icon URL Input */}
                          <div className="space-y-2">
                             <input type="text" value={linkForm.iconUrl} onChange={e => setLinkForm({ ...linkForm, iconUrl: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-brand-500 dark:text-white shadow-sm" placeholder="https://..." />
                             <div className="flex flex-wrap items-center gap-2">
                               <button
                                  type="button"
                                  onClick={() => handleAutoFetchFavicon()}
                                  className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer shadow-sm active:scale-95 transition-all group"
                                  title="使用 Google 的 Favicon API (https://www.google.com/s2/favicons?domain=...) 自动根据输入的 URL 补全或更新链接图标"
                               >
                                  <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-500 group-hover:rotate-45 transition-transform" />
                                  {t.admin.link.autoFavicon || '自动获取 Favicon'}
                               </button>
                               <label className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer shadow-sm active:scale-95 transition-all">
                                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                                  {t.admin.link.uploadOrPaste} <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setLinkForm({ ...linkForm, iconUrl: res }))} />
                               </label>
                               <button
                                  type="button"
                                  onClick={() => {
                                    setShowAppStoreSearchBox(prev => !prev);
                                    if (!showAppStoreSearchBox && !appStoreQuery) {
                                      setAppStoreQuery(linkForm.title || linkForm.url || '');
                                    }
                                  }}
                                  className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all border ${
                                    showAppStoreSearchBox 
                                      ? 'bg-blue-600 text-white border-blue-600' 
                                      : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700'
                                  }`}
                               >
                                  <Apple className="w-3.5 h-3.5 mr-1.5 text-blue-500 dark:text-blue-400" />
                                  App Store 匹配
                               </button>
                               <div className="inline-flex items-stretch rounded-xl shadow-sm">
                                 <button
                                    type="button"
                                    onClick={handleQuickAlgorithmEnhance}
                                    disabled={isEnhancingByAlgo}
                                    className="inline-flex items-center justify-center px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-brand-600 text-white rounded-l-xl text-xs font-black shadow-sm active:scale-95 transition-all hover:opacity-95 cursor-pointer disabled:opacity-50"
                                    title="一键算法高清化：自动执行 4× 阶梯超采样与卷积边缘锐化，并将结果实时应用到表单"
                                 >
                                    {isEnhancingByAlgo ? (
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-amber-300" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300 animate-pulse" />
                                    )}
                                    {isEnhancingByAlgo ? '重构中...' : (t.admin.link?.hdEnhance?.quickEnhance || '算法高清化')}
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => {
                                      let targetUrl = (linkForm.url || '').trim().replace(/^['"]+|['"]+$/g, '');
                                      const iconUrl = (linkForm.iconUrl || '').trim().replace(/^['"]+|['"]+$/g, '');

                                      if (!targetUrl && iconUrl) {
                                        const domainMatch = iconUrl.match(/[?&]domain=([^&#]+)/i);
                                        if (domainMatch && domainMatch[1]) {
                                          targetUrl = `https://${domainMatch[1]}`;
                                        } else if (iconUrl.startsWith('http')) {
                                          try {
                                            const p = new URL(iconUrl);
                                            targetUrl = `${p.protocol}//${p.hostname}`;
                                          } catch {
                                            targetUrl = iconUrl;
                                          }
                                        }
                                      }

                                      setHdModalTarget({
                                        url: targetUrl || iconUrl,
                                        title: linkForm.title || '',
                                        currentIcon: iconUrl,
                                        targetLinkId: linkForm.id,
                                        initialTab: 'algorithm',
                                      });
                                    }}
                                    className="inline-flex items-center justify-center px-2 py-2 bg-indigo-700 hover:bg-indigo-800 text-indigo-100 rounded-r-xl text-xs font-bold border-l border-indigo-500/30 transition-colors cursor-pointer"
                                    title="打开高清工作室手动微调锐化卷积与对比度参数"
                                 >
                                    <Sliders className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                               <button
                                  type="button"
                                  onClick={handleFetchHighResIcon}
                                  disabled={isFetchingHighRes}
                                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer disabled:opacity-50"
                                  title="深度探测 Web App Manifest 与 Apple Touch 超清原画图标，若无则自动生成高保真字标"
                               >
                                  {isFetchingHighRes ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Layers className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                  超清原图/字标
                               </button>
                               <div className="inline-flex rounded-xl shadow-sm">
                                 <button
                                    type="button"
                                    onClick={handleGenerateLetterIcon}
                                    className="inline-flex items-center justify-center px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 rounded-l-xl text-xs font-black active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
                                    title="根据网站名称快速生成正中高质感字标 SVG"
                                 >
                                    <Palette className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                                    极简字标
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setIsLetterCustomizerOpen(true)}
                                    className="inline-flex items-center justify-center px-2 py-2 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-y border-r border-slate-200 dark:border-white/10 rounded-r-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                                    title="定制字标字母、自由调整背景底色与字号"
                                 >
                                    <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                 </button>
                               </div>
                             </div>
                             <div className="flex items-center justify-between pt-1">
                               <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">
                                 <input
                                   type="checkbox"
                                   checked={autoFaviconEnabled}
                                   onChange={e => setAutoFaviconEnabled(e.target.checked)}
                                   className="w-3.5 h-3.5 text-brand-600 rounded border-slate-300 dark:border-zinc-600 focus:ring-brand-500"
                                 />
                                 <span>{t.admin.link.autoFaviconToggle || '输入网址时自动补全 Favicon (Google API)'}</span>
                               </label>
                             </div>
                          </div>

                          {/* App Store Match & Search Panel */}
                          {showAppStoreSearchBox && (
                            <AppStoreSearchPanel
                              initialQuery={appStoreQuery || linkForm.title || linkForm.url}
                              onApplyApp={(app, size) => {
                                handleApplyAppStoreApp(app, size);
                                setShowAppStoreSearchBox(false);
                              }}
                              onFillInfo={handleFillAppStoreInfo}
                            />
                          )}
                          
                          {/* NEW: Link Icon BG Color Picker */}
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                             <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                                <input 
                                   type="color" 
                                   value={
                                     // Ensure valid hex for color input, otherwise fallback to white to avoid warnings
                                     /^#[0-9A-F]{6}$/i.test(linkForm.iconBgColor || '') 
                                       ? linkForm.iconBgColor 
                                       : '#ffffff'
                                   } 
                                   onChange={e => setLinkForm({...linkForm, iconBgColor: e.target.value})}
                                   className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 cursor-pointer border-0"
                                />
                             </div>
                             <div className="flex-1 relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">#</span>
                                 <input 
                                    type="text" 
                                    value={linkForm.iconBgColor?.replace(/^#/, '') || ''}
                                    onChange={e => {
                                        const clean = e.target.value.replace(/#/g, '');
                                        setLinkForm({...linkForm, iconBgColor: clean ? `#${clean}` : ''});
                                    }}
                                    placeholder="FFFFFF"
                                    className="w-full pl-7 pr-4 py-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-mono font-bold dark:text-white uppercase"
                                 />
                             </div>
                             <button 
                                onClick={() => setLinkForm({...linkForm, iconBgColor: ''})}
                                className="p-2 bg-slate-100 dark:bg-zinc-700 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                title="Clear Color"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.tags}</label>
                          {linkForm.tags && linkForm.tags.length > 1 && (
                            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-800/40 select-none">
                              按住可拖拽调整顺序
                            </span>
                          )}
                        </div>
                        {linkForm.tags && linkForm.tags.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                            已选 {linkForm.tags.length} 个
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <DraggableTagList
                          tags={linkForm.tags || []}
                          onReorder={(newTags) => setLinkForm(prev => ({ ...prev, tags: newTags }))}
                          onRemove={(tagToRemove) => setLinkForm(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tagToRemove) }))}
                          emptyText="暂无标签，在下方输入或选用已有标签添加（添加后可直接按住拖拽或点击箭头调整顺序）"
                        />

                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={tagInput} 
                            onChange={e => setTagInput(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleAddTag()} 
                            className="flex-1 px-6 py-4 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-brand-500 dark:text-white shadow-sm font-bold text-sm" 
                            placeholder={t.admin.link.tagsPlaceholder} 
                          />
                          <button 
                            type="button"
                            onClick={() => handleAddTag()} 
                            className="px-8 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-xs hover:bg-slate-50 dark:hover:bg-zinc-600 active:scale-95 transition-all text-slate-800 dark:text-white shrink-0"
                          >
                            添加
                          </button>
                        </div>

                        {(() => {
                          const selectedSet = new Set(linkForm.tags || []);
                          const { tagCounts: subCounts, subCategoryName } = currentSubCategoryTagsInfo;

                          // 1. 同子分类下链接已有标签置顶前置，并按其在子分类中的频次从高到低排序
                          const subCategoryTags: Array<{
                            name: string;
                            count: number;
                            subCount: number;
                            isSubCategoryTag: boolean;
                          }> = [];
                          const handledNames = new Set<string>();

                          const sortedSubEntries = Object.entries(subCounts)
                            .filter(([name]) => !selectedSet.has(name))
                            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

                          for (const [name, subCount] of sortedSubEntries) {
                            const globalItem = globalTags.find(gt => gt.name === name);
                            subCategoryTags.push({
                              name,
                              count: globalItem ? globalItem.count : subCount,
                              subCount,
                              isSubCategoryTag: true
                            });
                            handledNames.add(name);
                          }

                          // 2. 其它全站已有标签保持在后方（按全站热度排序）
                          const otherTags: Array<{
                            name: string;
                            count: number;
                            subCount: number;
                            isSubCategoryTag: boolean;
                          }> = [];

                          for (const gt of globalTags) {
                            if (!selectedSet.has(gt.name) && !handledNames.has(gt.name)) {
                              otherTags.push({
                                name: gt.name,
                                count: gt.count,
                                subCount: 0,
                                isSubCategoryTag: false
                              });
                            }
                          }

                          // 相同子分类下链接已有标签 100% 绝对置顶在前！
                          const availableTags = [...subCategoryTags, ...otherTags];
                          const subCategoryAvailableCount = subCategoryTags.length;

                          const filterText = tagInput.trim().toLowerCase().replace(/^#+/, '');
                          const isSearching = filterText.length > 0;
                          const matchingTags = isSearching 
                            ? availableTags.filter(gt => gt.name.toLowerCase().includes(filterText))
                            : availableTags;
                          const displayTags = isSearching 
                            ? matchingTags 
                            : (expandAllTags ? availableTags : availableTags.slice(0, 16));

                          if (availableTags.length === 0 && !isSearching) return null;

                          return (
                            <div className="space-y-2 pt-1 px-1">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 select-none">
                                  <Tag className="w-3.5 h-3.5 text-brand-500" />
                                  {isSearching ? (
                                    <span>
                                      匹配已有标签 <span className="text-brand-600 dark:text-brand-400 font-black">({matchingTags.length})</span>:
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 flex-wrap">
                                      <span>推荐选用已有标签</span>
                                      {subCategoryAvailableCount > 0 && subCategoryName && (
                                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full border border-brand-200/80 dark:border-brand-800/60 flex items-center gap-1">
                                          <Sparkles className="w-2.5 h-2.5" />
                                          已置顶「{subCategoryName}」标签 ({subCategoryAvailableCount})
                                        </span>
                                      )}
                                      <span className="text-slate-400 dark:text-zinc-500 font-semibold">(共 {availableTags.length} 个):</span>
                                    </span>
                                  )}
                                </span>

                                <div className="flex items-center gap-2">
                                  {!isSearching && subCategoryAvailableCount > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const toAdd = subCategoryTags.map(t => t.name);
                                        setLinkForm(prev => ({
                                          ...prev,
                                          tags: Array.from(new Set([...(prev.tags || []), ...toAdd]))
                                        }));
                                      }}
                                      className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/60 px-2 py-0.5 rounded-md border border-brand-200/80 dark:border-brand-800/60 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                      title="一键添加当前子分类下的所有推荐已有标签"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      一键添加同分类标签 (+{subCategoryAvailableCount})
                                    </button>
                                  )}

                                  {!isSearching && availableTags.length > 16 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandAllTags(prev => !prev)}
                                      className="text-[11px] font-black text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 cursor-pointer select-none ml-1"
                                    >
                                      {expandAllTags ? '收起 ▴' : `展开全部 (${availableTags.length}) ▾`}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {displayTags.length > 0 ? (
                                <div className={`flex items-center gap-1.5 flex-wrap ${expandAllTags && !isSearching ? 'max-h-52 overflow-y-auto p-1.5 custom-scrollbar bg-slate-50/70 dark:bg-zinc-800/40 rounded-xl border border-slate-200/50 dark:border-white/5' : ''}`}>
                                  {displayTags.map(gt => (
                                    <button
                                      key={gt.name}
                                      type="button"
                                      onClick={() => {
                                        handleAddTag(gt.name);
                                        if (isSearching) setTagInput('');
                                      }}
                                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 ${
                                        gt.isSubCategoryTag
                                          ? 'bg-brand-50/90 text-brand-700 border-brand-300 hover:bg-brand-100 hover:border-brand-400 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-700/80 dark:hover:bg-brand-900/60 ring-1 ring-brand-500/20'
                                          : 'bg-white dark:bg-zinc-700/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 hover:text-brand-600 dark:hover:bg-zinc-600 dark:hover:text-brand-300 border-slate-200/60 dark:border-white/10 hover:border-brand-300'
                                      }`}
                                      title={gt.isSubCategoryTag ? `同子分类「${subCategoryName}」已有标签（在此分类已用 ${gt.subCount} 次）` : `全站已有标签（使用 ${gt.count} 次）`}
                                    >
                                      {gt.isSubCategoryTag && <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />}
                                      <span>+ {gt.name}</span>
                                      {gt.isSubCategoryTag ? (
                                        <span className="text-[9px] px-1 py-0.2 rounded font-black bg-brand-200/80 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                                          同分类
                                        </span>
                                      ) : gt.count > 0 ? (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-600/60 text-slate-400 dark:text-zinc-400 font-mono">
                                          {gt.count}
                                        </span>
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              ) : isSearching ? (
                                <div className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 py-1 flex items-center gap-1.5 flex-wrap">
                                  <span>已有标签库中无匹配项，点击右侧【添加】或回车即可新建：</span>
                                  <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/50 px-1.5 py-0.5 rounded-md">
                                    #{tagInput.trim()}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.description}</label>
                        <button
                          type="button"
                          onClick={handleFillSmartStatsDescription}
                          title="一键填入该链接的权威智能统计描述（包含精准用户规模、评分、版本或行业指标）"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800/40 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 select-none"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>{t.admin?.link?.meta?.applyStatsDesc || '一键智能统计描述'}</span>
                        </button>
                      </div>
                      <textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={3} className="w-full px-6 py-4 bg-slate-50/50 dark:bg-zinc-700/50 border border-slate-200 dark:border-white/5 rounded-2xl outline-none resize-none font-bold text-base dark:text-white" />
                    </div>

                    {/* 智能统计描述 (展开视图定制与消歧) */}
                    <div className="space-y-2 p-3.5 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-200/50 dark:border-purple-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 ml-1">
                          <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-widest">
                            {t.admin.link.smartStats || '智能统计描述 (展开视图)'}
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!linkForm.url) {
                                showToast('error', t.admin.link.autoFaviconPrompt || '请先输入有效的链接网址');
                                return;
                              }
                              const detected = detectStatsSync(linkForm.url, {
                                title: linkForm.title,
                                description: linkForm.description,
                                tags: linkForm.tags,
                              });
                              setLinkForm(prev => ({ ...prev, smartStats: detected }));
                              showToast('success', '已精准识别生成智能统计描述！');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800/40 rounded-lg transition-all cursor-pointer select-none"
                            title="根据当前网址与标题，使用多业务消歧与语义审计引擎自动生成"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{t.admin.link.smartStatsAutoDetect || '自动识别'}</span>
                          </button>
                          {linkForm.smartStats && (
                            <button
                              type="button"
                              onClick={() => setLinkForm(prev => ({ ...prev, smartStats: '' }))}
                              className="px-2 py-0.5 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer select-none"
                              title="清空此统计描述"
                            >
                              {t.admin.link.smartStatsClear || '清空'}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 px-1 leading-relaxed">
                        {t.admin.link.smartStatsDesc || '在卡片展开视图中展示的权威行业地位、用户规模或指标数据。留空则采用智能引擎自动识别。'}
                      </p>
                      <input
                        type="text"
                        value={linkForm.smartStats || ''}
                        onChange={e => setLinkForm({ ...linkForm, smartStats: e.target.value })}
                        placeholder={t.admin.link.smartStatsPlaceholder || '留空则自动识别生成，亦可手动输入权威指标或微调...'}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-medium text-xs dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs focus:border-purple-500 transition-colors"
                      />
                    </div>

                    {/* 置顶到常用前排开关 */}
                    <div className="p-4 lg:p-5 bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-4 select-none">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl transition-all ${linkForm.isPinned ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                          <Pin className={`w-4 h-4 ${linkForm.isPinned ? 'fill-current rotate-12' : ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm lg:text-base text-slate-800 dark:text-zinc-100">
                              {t.admin?.link?.isPinned || '置顶到首页常用前排'}
                            </span>
                            {linkForm.isPinned && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                                {t.admin?.link?.pinnedTag || '已置顶'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {t.admin?.link?.isPinnedDesc || '开启后该链接将常驻在首页“常用”分类最前列，无需依赖打开频次'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkForm(prev => ({ ...prev, isPinned: !prev.isPinned }))}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          linkForm.isPinned ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            linkForm.isPinned ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 信任此网址 / 避免误报开关 */}
                    <div className="p-4 lg:p-5 bg-teal-50/70 dark:bg-teal-950/20 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between gap-4 select-none">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl transition-all ${linkForm.isTrusted ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-100/80 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm lg:text-base text-slate-800 dark:text-zinc-100">
                              {t.admin?.link?.isTrusted || '受信任网址 (跳过离线检测)'}
                            </span>
                            {linkForm.isTrusted && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs">
                                始终正常
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {t.admin?.link?.isTrustedDesc || '开启后该网址将加入信任白名单，始终判定为在线响应，避免网络波动或反爬策略产生误报'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkForm(prev => ({ ...prev, isTrusted: !prev.isTrusted }))}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          linkForm.isTrusted ? 'bg-teal-600' : 'bg-slate-200 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            linkForm.isTrusted ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <button onClick={handleSaveLink} className="w-full py-5 lg:py-6 bg-brand-600 text-white rounded-[2rem] font-black text-lg lg:text-xl hover:opacity-90 shadow-xl shadow-brand-100 active:scale-95 transition-all">{t.admin.link.save}</button>
                  </div>
                )}

                {linkMode === 'bulk' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none font-bold text-lg dark:bg-zinc-700 dark:text-white">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none font-bold text-lg dark:text-white"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.bulk.defaultTitle}</label>
                      <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} className="w-full px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none font-bold text-lg dark:text-white" placeholder={t.admin.link.bulk.defaultTitlePlaceholder} />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.link.bulk.label}</label>
                      <textarea rows={10} value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} className="w-full px-6 py-5 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none resize-none font-mono text-sm dark:bg-zinc-700 dark:text-white" placeholder={t.admin.link.bulk.placeholder} />
                    </div>
                    <button onClick={() => {
                        const lines = bulkUrls.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        const newLinks: LinkItem[] = lines.map((url, i) => {
                          const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
                          const favicon = getGoogleFaviconUrl(cleanUrl, 128);
                          return {
                            id: `lbulk-${Date.now()}-${i}`,
                            title: bulkDefaultTitle || url.replace(/^https?:\/\//, '').split('/')[0],
                            url: cleanUrl,
                            description: '',
                            iconUrl: favicon,
                            categoryId: linkForm.categoryId!,
                            subCategoryId: linkForm.subCategoryId || '',
                            tags: []
                          };
                        });
                        onUpdateData({ ...data, links: [...data.links, ...newLinks] });
                        showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length.toString()));
                        setBulkUrls(''); setBulkDefaultTitle(''); onClose();
                    }} className="w-full py-5 lg:py-6 bg-brand-600 text-white rounded-[2rem] font-black text-lg hover:opacity-90 shadow-xl active:scale-95 transition-all tracking-widest">立即导入全部链接</button>
                  </div>
                )}

                {linkMode === 'icons' && (
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 lg:h-[600px] animate-in fade-in duration-300">
                    <div className="w-full lg:w-1/3 flex flex-col gap-6">
                      <div className="flex gap-2">
                        <label className="flex-1 h-32 cursor-pointer border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-700 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors group">
                          <Upload className="w-8 h-8 mb-1 text-slate-300 dark:text-zinc-500" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{t.admin.link.icons.upload}</span>
                          <input type="file" multiple className="hidden" accept="image/*" onChange={e => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(f => {
                              const r = new FileReader();
                              r.onload = async (ev) => { const res = ev.target?.result as string; if (res) { const comp = await compressImage(res); setLinkBulkIcons(p => [...p, { id: `bi-${Date.now()}-${Math.random()}`, preview: comp, assignedId: null }]); } };
                              r.readAsDataURL(f as Blob);
                            });
                          }} />
                        </label>
                      </div>
                      <div className="h-40 lg:h-[300px] bg-slate-50 dark:bg-zinc-700 border border-slate-200 rounded-3xl p-4 overflow-y-auto grid grid-cols-4 lg:grid-cols-3 gap-3 custom-scrollbar shadow-inner">
                        {linkBulkIcons.map(icon => (
                          <button key={icon.id} onClick={() => setSelectedBulkIconId(icon.id)} className={`aspect-square border-2 rounded-xl p-1.5 transition-colors ${selectedBulkIconId === icon.id ? 'border-brand-600 bg-brand-50' : 'border-transparent bg-white dark:bg-zinc-600 hover:border-slate-300 shadow-sm'}`}><img src={icon.preview} className="w-full h-full object-contain" /></button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-zinc-800 h-[400px] lg:h-full shadow-sm">
                      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-zinc-700/50">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-400 tracking-widest">{t.admin.link.icons.hint}</h5>
                        <button onClick={() => { 
                            const updatedLinks = data.links.map(l => { const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id); return assigned ? { ...l, iconUrl: assigned.preview } : l; });
                            onUpdateData({ ...data, links: updatedLinks }); showToast('success', t.app.success); setLinkBulkIcons([]); setSelectedBulkIconId(null); 
                        }} className="px-5 lg:px-8 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black hover:bg-brand-700 active:scale-95 transition-all shadow-md">{t.admin.link.icons.apply}</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 lg:p-6 grid grid-cols-2 lg:grid-cols-2 gap-3 custom-scrollbar">
                        {data.links.map(l => {
                          const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id);
                          return (
                            <button key={l.id} onClick={() => selectedBulkIconId && setLinkBulkIcons(p => p.map(bi => bi.id === selectedBulkIconId ? { ...bi, assignedId: l.id } : (bi.assignedId === l.id ? { ...bi, assignedId: null } : bi)))} className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-700/30 border-2 rounded-2xl text-left transition-all ${assigned ? 'border-brand-600 bg-brand-50' : 'border-transparent hover:border-slate-200'} active:scale-95`}>
                              <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 bg-white dark:bg-zinc-700">{(assigned || l.iconUrl) ? <img src={assigned ? assigned.preview : l.iconUrl} className="w-full h-full object-contain" /> : <Globe className="w-5 h-5 text-slate-200" />}</div>
                              <div className="min-w-0 font-black truncate text-[11px] text-slate-700 dark:text-zinc-300 tracking-tight">{l.title}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {linkMode === 'hdEnhance' && (
                  <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
                    {/* Header & Quick Batch Upgrade Card */}
                    <div className="p-6 lg:p-8 rounded-[2rem] bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-brand-50/80 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-zinc-800/80 border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 translate-x-6 -translate-y-6 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                              <Sparkles className="w-5 h-5" />
                            </span>
                            <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                              {t.admin.link?.hdEnhance?.tabTitle || '图标高清化与算法修复'}
                            </h3>
                          </div>
                          <p className="text-xs lg:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                            {t.admin.link?.hdEnhance?.batchUpgradeDesc || '自动检测全站低清/模糊图标（如 16/32px 旧版 Favicon），一键自动升级为 256px 官方原图、Apple Touch 180px 或矢量 SVG！亦可针对任意链接开启独立锐化工作室。'}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                          <button
                            type="button"
                            disabled={isBatchUpgrading}
                            onClick={handleBatchUpgradeHdIcons}
                            className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all ${
                              isBatchUpgrading 
                                ? 'bg-indigo-400 cursor-not-allowed opacity-80'
                                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-brand-600 hover:opacity-95 shadow-indigo-500/25 active:scale-95'
                            }`}
                          >
                            {isBatchUpgrading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{batchProgress ? `升级中 (${batchProgress.current}/${batchProgress.total})...` : (t.admin.link?.hdEnhance?.upgrading || '正在批量高清升级中...')}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                <span>{t.admin.link?.hdEnhance?.startBatchUpgrade || '一键全站批量高清修复'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Stats Badges */}
                      <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-indigo-100 dark:border-indigo-900/40">
                        {(() => {
                          const total = data.links.length;
                          const lowRes = data.links.filter(l => isLikelyLowResIcon(l.iconUrl) || !l.iconUrl).length;
                          const hd = total - lowRes;
                          return (
                            <>
                              <div className="p-3 bg-white/80 dark:bg-zinc-800/80 rounded-xl border border-indigo-100/80 dark:border-white/5 flex flex-col items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">{t.admin.link?.hdEnhance?.statsTotal || '全站链接'}</span>
                                <span className="text-lg font-black text-slate-800 dark:text-zinc-100">{total}</span>
                              </div>
                              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/30 flex flex-col items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{t.admin.link?.hdEnhance?.statsLowRes || '低清待修复'}</span>
                                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{lowRes}</span>
                              </div>
                              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30 flex flex-col items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{t.admin.link?.hdEnhance?.statsHd || '已达标高清'}</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{hd}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setHdFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            hdFilter === 'all' 
                              ? 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-zinc-100 shadow-xs' 
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                          }`}
                        >
                          全部链接 ({data.links.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setHdFilter('lowres')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            hdFilter === 'lowres' 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                          }`}
                        >
                          ⚠️ 仅显示低清待修复 ({data.links.filter(l => isLikelyLowResIcon(l.iconUrl) || !l.iconUrl).length})
                        </button>
                      </div>

                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={hdSearchQuery}
                          onChange={e => setHdSearchQuery(e.target.value)}
                          placeholder="按标题或网址搜索..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50/80 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Links Grid */}
                    {(() => {
                      const filtered = data.links.filter(l => {
                        if (hdFilter === 'lowres' && !isLikelyLowResIcon(l.iconUrl) && !!l.iconUrl) return false;
                        if (hdSearchQuery.trim()) {
                          const q = hdSearchQuery.toLowerCase();
                          return l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q);
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/20">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                            <h4 className="font-bold text-sm text-slate-700 dark:text-zinc-300">
                              {hdFilter === 'lowres' ? '太棒了！当前筛选下没有需要修复的低清图标' : '未匹配到符合条件的链接'}
                            </h4>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {filtered.map(link => {
                            const isLowRes = isLikelyLowResIcon(link.iconUrl) || !link.iconUrl;
                            const domain = extractCleanHostname(link.url).hostname;
                            return (
                              <div
                                key={link.id}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                                  isLowRes 
                                    ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-800/40' 
                                    : 'bg-white dark:bg-zinc-800/70 border-slate-200/80 dark:border-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div 
                                    className="w-12 h-12 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
                                    style={link.iconBgColor ? { backgroundColor: link.iconBgColor } : {}}
                                  >
                                    {link.iconUrl ? (
                                      <img 
                                        src={link.iconUrl} 
                                        alt={link.title} 
                                        className="w-full h-full object-contain p-1" 
                                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <Globe className="w-6 h-6 text-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">{link.title}</h4>
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                        isLowRes 
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' 
                                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      }`}>
                                        {isLowRes ? '低清待升级' : '超清 256px'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate">{domain || link.url}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isLowRes && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickUpgradeSingleLink(link.id, link.url)}
                                      className="px-2.5 py-1.5 text-[11px] font-black rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/60 transition-colors cursor-pointer"
                                      title="一键升级为 256px Google Social 高清图标"
                                    >
                                      升至 256px
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHdModalTarget({
                                        url: link.url,
                                        title: link.title,
                                        currentIcon: link.iconUrl || '',
                                        targetLinkId: link.id,
                                      });
                                    }}
                                    className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-95 shadow-2xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                    title="打开锐化工作室进行深度画质提升"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                    <span>高清重构</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'category' && (
              <div className="max-w-4xl space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                <div className="flex justify-end">
                  <button onClick={() => { setCatForm({ id: null, name: '', icon: '' }); setCatEditingId('new'); }} className="px-8 py-4 bg-brand-600 text-white rounded-[1.5rem] font-bold text-sm flex items-center gap-3 hover:opacity-90 shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /> {t.admin.category.new}</button>
                </div>
                <div className="space-y-6">
                  {data.categories.map(cat => {
                    const resolved = resolveCategoryIcon(cat);
                    return (
                      <div key={cat.id} className="bg-white dark:bg-zinc-700/40 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-zinc-700/50 flex-wrap gap-3">
                          <div className="flex items-center gap-3.5">
                            <button
                              type="button"
                              onClick={() => setCatIconPickerTarget({
                                id: cat.id,
                                name: cat.name,
                                icon: cat.icon || '',
                                subCategoryNames: cat.subCategories.map(s => s.name),
                                isStandalone: true
                              })}
                              className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:border-brand-500 hover:scale-105 transition-all shadow-xs group/catbtn cursor-pointer"
                              title="点击更换或自定义此分类图标"
                            >
                              <CategoryIconDisplay category={cat} className="w-5 h-5 text-brand-600 dark:text-brand-400 group-hover/catbtn:scale-110 transition-transform" />
                            </button>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-slate-800 dark:text-zinc-100">{cat.name}</span>
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/40">
                                  #{resolved.code}
                                </span>
                                {resolved.isAutoAssigned ? (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                                    智能分配
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">
                                    {resolved.type === 'custom' ? '自定义图片' : '自选图标'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 dark:text-zinc-400">
                                {cat.subCategories.length} 个子分类 · {data.links.filter(l => l.categoryId === cat.id).length} 个书签
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => setCatIconPickerTarget({
                                id: cat.id,
                                name: cat.name,
                                icon: cat.icon || '',
                                subCategoryNames: cat.subCategories.map(s => s.name),
                                isStandalone: true
                              })}
                              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 hover:border-brand-500 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-200 flex items-center gap-1.5 transition-all shadow-2xs hover:text-brand-600 cursor-pointer"
                              title="更换或自定义图标"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>设置图标</span>
                            </button>
                            <button onClick={() => { setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' }); setCatEditingId(cat.id); }} className="p-2 text-brand-600 hover:bg-white dark:hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => confirmAction(t.admin.category.edit, t.admin.category.deleteConfirm, () => onUpdateData({ ...data, categories: data.categories.filter(c => c.id !== cat.id) }), true)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cat.subCategories.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-white/5 group shadow-sm hover:border-brand-200 transition-colors">
                              <span className="font-bold text-sm text-slate-600 dark:text-zinc-200 truncate">{sub.name}</span>
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSubCatForm({ parentId: cat.id, id: sub.id, name: sub.name }); setSubCatEditingId(sub.id); }} className="p-1 hover:text-brand-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => confirmAction(t.admin.tags.deleteTitle, t.admin.category.deleteSubConfirm, () => onUpdateData({ ...data, categories: data.categories.map(c => c.id === cat.id ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sub.id) } : c) }), true)} className="p-1 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => { setSubCatForm({ parentId: cat.id, id: null, name: '' }); setSubCatEditingId('new'); }} className="flex items-center justify-center px-5 py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors uppercase gap-2"><Plus className="w-4 h-4" />{t.admin.category.newSub}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="max-w-4xl space-y-10 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-2xl lg:text-3xl text-slate-800 dark:text-zinc-100 tracking-tight">{t.admin.tags.globalTitle}</h4>
                    <p className="text-sm text-slate-400 dark:text-zinc-400 font-medium">{t.admin.tags.globalDesc}</p>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className="w-full pl-11 pr-6 py-3 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold text-sm dark:text-white shadow-sm" placeholder={t.admin.tags.searchPlaceholder} />
                  </div>
                </div>
                <div className="bg-slate-50/50 dark:bg-zinc-700/20 border border-slate-200 dark:border-white/5 rounded-3xl p-6 lg:p-8 min-h-[500px]">
                  {globalTags.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                       {globalTags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tag => (
                          <div key={tag.name} className="p-4 lg:p-6 bg-white dark:bg-zinc-700/60 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg"><Hash className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
                                <div className="flex flex-col">
                                   <span className="font-bold text-base text-slate-700 dark:text-zinc-100">{tag.name}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tag.count} {t.admin.tags.count.split(' ')[1]}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setRenamingTag({ old: tag.name, new: tag.name })} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-600 text-brand-600 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => confirmAction(t.admin.tags.deleteTitle, t.admin.tags.deleteMessage.replace('{tag}', tag.name), () => onUpdateData({ ...data, links: data.links.map(l => ({ ...l, tags: l.tags?.filter(t => t !== tag.name) })) }), true)} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-600 text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="flex flex-col h-[400px] items-center justify-center text-slate-300 dark:text-zinc-600 font-bold text-xl italic gap-4">
                      <Hash className="w-16 h-16 opacity-20" />
                      {t.admin.tags.empty}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cloud' && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in pt-4 pb-12">
                {/* Provider Selection */}
                <div className="grid grid-cols-3 gap-4">
                  {(['github', 'notion', 'webdav'] as const).map(p => (
                    <button 
                      key={p} 
                      onClick={() => setLocalCloud({ ...localCloud, activeProvider: p })} 
                      className={`py-5 text-sm font-black uppercase tracking-[0.15em] rounded-xl border-2 transition-all active:scale-95 ${
                        localCloud.activeProvider === p 
                          ? 'bg-white dark:bg-zinc-800 text-brand-600 border-brand-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none' 
                          : 'border-transparent bg-slate-50 dark:bg-zinc-700 text-slate-400 dark:text-zinc-500 hover:text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-8 pt-4">
                    {localCloud.activeProvider === 'github' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.github.token}</label>
                                <input type="password" value={localCloud.githubToken} onChange={e => setLocalCloud({ ...localCloud, githubToken: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="••••••••••••••••••••••••••••••••" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.github.gistId}</label>
                                <input type="text" value={localCloud.gistId} onChange={e => setLocalCloud({ ...localCloud, gistId: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="01dafe233bfc3ae5c3efcb93a322c7cf" />
                            </div>
                        </div>
                    )}
                    {localCloud.activeProvider === 'notion' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-brand-50/50 dark:bg-brand-900/10 p-5 rounded-2xl border border-brand-100 dark:border-brand-500/20 flex gap-4 items-start mb-2">
                                <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-brand-700 dark:text-brand-300 leading-relaxed">
                                   {t.admin.cloud.notion.help}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.notion.token}</label>
                                <input type="password" value={localCloud.notionToken} onChange={e => setLocalCloud({ ...localCloud, notionToken: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="secret_••••••••••••••••••••••••••••••••" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.notion.pageId}</label>
                                <input type="text" value={localCloud.notionPageId} onChange={e => setLocalCloud({ ...localCloud, notionPageId: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.notion.proxy}</label>
                                <input type="text" value={localCloud.notionApiUrl || ''} onChange={e => setLocalCloud({ ...localCloud, notionApiUrl: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500" placeholder="/api/notion (已内置原生代理，留空即可)" />
                            </div>
                            <div className="w-full p-5 border-2 border-dashed border-brand-200 dark:border-brand-800/60 bg-brand-50/40 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-3">
                               <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                               <div className="space-y-1">
                                 <p className="font-black text-xs text-brand-800 dark:text-brand-200">
                                   💡 提示：点击下方「{t.admin.cloud.upload}」将自动在 Notion 页面中创建或更新数据库表格
                                 </p>
                                 <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                   系统将自动校验数据库结构，若页面下无数据库则自动新建；若已存在则直接更新。同网址在数据库中仅占一行，主分类与子分类自动以多选标签形式完整同步。
                                 </p>
                               </div>
                            </div>
                        </div>
                    )}
                    {localCloud.activeProvider === 'webdav' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                             <div className="bg-brand-50/50 dark:bg-brand-900/10 p-5 rounded-2xl border border-brand-100 dark:border-brand-500/20 flex gap-4 items-start mb-2">
                                <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-brand-700 dark:text-brand-300 leading-relaxed">
                                   {t.admin.cloud.webdav.help}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.webdav.url}</label>
                                <input type="text" value={localCloud.webdavUrl} onChange={e => setLocalCloud({ ...localCloud, webdavUrl: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="https://dav.jianguoyun.com/dav/" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.webdav.user}</label>
                                    <input type="text" value={localCloud.webdavUsername} onChange={e => setLocalCloud({ ...localCloud, webdavUsername: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="Email" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.cloud.webdav.pass}</label>
                                    <input type="password" value={localCloud.webdavPassword} onChange={e => setLocalCloud({ ...localCloud, webdavPassword: e.target.value })} className="w-full px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder="App Password" />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-5 pt-6">
                        <button onClick={() => { onUpdateCloudConfig(localCloud); showToast('success', t.app.configSaved); }} className="w-full py-5 bg-brand-600 text-white rounded-[2rem] font-black tracking-[0.2em] hover:opacity-90 transition-all uppercase text-sm shadow-xl shadow-brand-100 active:scale-95">保存当前配置</button>
                        <div className="flex gap-4">
                            <button onClick={() => onSyncUpload(localCloud)} disabled={isSyncing} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:opacity-90 disabled:bg-slate-400 transition-all uppercase text-xs shadow-lg active:scale-95"><Upload className="w-5 h-5" /> {t.admin.cloud.upload}</button>
                            <button onClick={() => onSyncDownload(localCloud)} disabled={isSyncing} className="flex-1 py-5 bg-slate-100 dark:bg-zinc-700 border border-slate-200 text-slate-800 dark:text-zinc-100 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all uppercase text-xs active:scale-95"><Download className="w-5 h-5" /> {t.admin.cloud.download}</button>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 animate-in fade-in duration-300">
                <div className="p-8 lg:p-10 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-[2rem] text-center flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-6"><Download className="w-8 h-8 text-brand-600" /></div>
                  <h4 className="font-bold text-xl mb-3 dark:text-zinc-100">{t.admin.data.exportTitle}</h4>
                  <p className="text-xs text-slate-400 mb-8 font-medium">{t.admin.data.exportDesc}</p>
                  <button onClick={() => {
                      const dataStr = JSON.stringify(data, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'navhub-backup.json'; a.click();
                      URL.revokeObjectURL(url); showToast('success', 'Backup downloaded');
                  }} className="w-full py-4 bg-brand-600 text-white rounded-[1.5rem] font-bold text-base hover:opacity-90 transition-all shadow-lg active:scale-95">{t.admin.data.exportBtn}</button>
                </div>
                <div className="p-8 lg:p-10 border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-700/50 rounded-[2rem] text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-6"><Upload className="w-8 h-8 text-brand-600" /></div>
                  <h4 className="font-bold text-xl mb-3 dark:text-zinc-100">{t.admin.data.importTitle}</h4>
                  <p className="text-xs text-slate-400 mb-8 font-medium">{t.admin.data.importDesc}</p>
                  <label className="w-full py-4 bg-white dark:bg-zinc-700 border border-slate-200 text-slate-800 dark:text-zinc-200 rounded-[1.5rem] font-bold cursor-pointer text-base hover:bg-slate-100 transition-colors flex items-center justify-center shadow-sm active:scale-95">
                    {t.admin.data.importBtn}
                    <input type="file" className="hidden" accept=".json" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const imported = JSON.parse(ev.target?.result as string);
                                if (imported.categories && imported.links) {
                                    confirmAction(t.admin.data.importTitle, t.admin.data.confirm, () => { onUpdateData(imported); showToast('success', t.admin.data.success); });
                                } else { throw new Error(); }
                            } catch { showToast('error', t.admin.data.error); }
                        };
                        reader.readAsText(file);
                    }} />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl space-y-12 animate-in fade-in duration-300 pb-12">
                <div className="space-y-4">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.settings.siteName}</label>
                  <input type="text" value={siteForm.title} onChange={e => setSiteForm({ ...siteForm, title: e.target.value })} className="w-full px-8 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl text-xl font-black tracking-tight outline-none focus:border-brand-500 transition-all dark:text-white shadow-sm" placeholder={t.app.title} />
                </div>
                
                {/* Logo Customization Section - Split Layout */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.settings.logoStyle.title}</label>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card 1: Logo Upload */}
                    <div className="p-8 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm flex flex-col justify-center space-y-6">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">{t.admin.settings.logo}</label>
                       <div className="flex flex-col items-center gap-6">
                          {/* Live Preview Container using dynamic shape class */}
                          <div className={`w-24 h-24 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-white/10 flex items-center justify-center ${siteForm.logoUrl ? 'p-0' : 'p-2'} shadow-sm overflow-hidden transition-all duration-300 ${getPreviewShapeClass(siteForm.logoShape)}`}>
                             {siteForm.logoUrl ? (
                               <img 
                                 src={normalizeIconForDisplay(siteForm.logoUrl)} 
                                 className="w-full h-full object-contain select-none transform-gpu scale-100" 
                               />
                             ) : (
                               <LayoutGrid className="w-10 h-10 text-slate-200" />
                             )}
                          </div>
                          <div className="w-full flex gap-3">
                             <input type="text" value={siteForm.logoUrl} onChange={e => setSiteForm({ ...siteForm, logoUrl: e.target.value })} className="flex-1 px-5 py-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold dark:text-white shadow-sm outline-none focus:border-brand-500" placeholder="https://..." />
                             <label className="p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-brand-600 rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-90 transition-all">
                                <Upload className="w-5 h-5" />
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, false, (res) => setSiteForm({ ...siteForm, logoUrl: res }))} />
                             </label>
                          </div>
                       </div>
                    </div>

                    {/* Card 2: Logo Style (Shape Only - Schematic Outside) */}
                    <div className="p-8 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm flex flex-col justify-center space-y-8">
                        {/* Shape Selector */}
                        <div className="space-y-6">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">{t.admin.settings.logoStyle.shape}</label>
                           <div className="flex justify-center gap-6">
                              {(['square', 'rounded', 'circle'] as LogoShape[]).map(shape => (
                                 <div 
                                    key={shape} 
                                    className="flex flex-col items-center gap-3 cursor-pointer group"
                                    onClick={() => setSiteForm({...siteForm, logoShape: shape})}
                                 >
                                    {/* Schematic Diagram - Outside */}
                                    <div className={`w-12 h-12 border-2 border-dashed transition-colors ${
                                       siteForm.logoShape === shape ? 'border-brand-500 opacity-100' : 'border-slate-300 opacity-50 group-hover:border-slate-400 dark:border-white/20'
                                    } ${getShapeIconClass(shape)}`} />
                                    
                                    {/* Selection Box */}
                                    <div className={`px-6 py-3 border-2 rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                                       siteForm.logoShape === shape 
                                          ? 'border-brand-500 bg-brand-50 text-brand-600' 
                                          : 'border-slate-200 bg-white dark:bg-zinc-800 dark:border-white/10 text-slate-500 hover:border-brand-200'
                                    }`}>
                                       {siteForm.logoShape === shape && <CheckCircle2 className="w-4 h-4" />}
                                       <span className="text-xs font-bold">{t.admin.settings.logoStyle.shapes[shape]}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Palette className="w-4 h-4" /> {t.admin.settings.themeColorTitle}</label>
                  <div className="p-8 lg:p-10 bg-slate-50/30 dark:bg-zinc-700/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] space-y-12 shadow-inner">
                    
                    {/* 配色体系分段器 */}
                    <div className="flex gap-1 p-1 bg-slate-200/50 dark:bg-zinc-800 rounded-xl max-w-md mx-auto">
                      {(['macaron', 'morandi', 'traditional'] as const).map(coll => (
                        <button 
                          key={coll}
                          onClick={() => setPaletteCollection(coll)}
                          className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                            paletteCollection === coll 
                              ? 'bg-white dark:bg-zinc-700 text-brand-600 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {t.admin.settings.themeCollections[coll]}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                      {Object.keys(COLOR_COLLECTIONS[paletteCollection]).map(paletteName => {
                        const palette = COLOR_COLLECTIONS[paletteCollection][paletteName];
                        const isSelected = siteForm.themeColor === paletteName;
                        return (
                          <button 
                            key={paletteName} 
                            onClick={() => setSiteForm({ ...siteForm, themeColor: paletteName })} 
                            className={`group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${isSelected ? 'border-brand-500 scale-110 shadow-xl z-10' : 'border-white dark:border-zinc-700 hover:border-brand-200'}`}
                          >
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                               <div style={{ backgroundColor: palette[400] }}></div>
                               <div style={{ backgroundColor: palette[600] }}></div>
                               <div style={{ backgroundColor: palette[800] }}></div>
                               <div style={{ backgroundColor: palette[500] }}></div>
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Check className="w-8 h-8 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col items-center gap-6">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.admin.settings.themeShadesTitle}</span>
                       <div className="flex w-full max-w-lg h-12 lg:h-14 rounded-2xl overflow-hidden shadow-inner border border-slate-100 dark:border-white/5">
                          {[100, 200, 400, 600, 950].map(shade => (
                             <div 
                               key={shade} 
                               className="flex-1 transition-colors duration-500" 
                               style={{ backgroundColor: currentThemePalette?.[shade] || '#ccc' }}
                             />
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.settings.linkColumns}</label>
                  <div className="flex items-center gap-6 p-6 lg:p-8 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm">
                    <div className="flex-1 flex items-center relative h-12">
                        <div className="absolute inset-y-0 my-auto h-3 w-full bg-slate-200 dark:bg-zinc-700 rounded-full" />
                        <div 
                           className="absolute left-0 inset-y-0 my-auto h-3 bg-brand-600 rounded-full pointer-events-none transition-all duration-300 shadow-sm" 
                           style={{ width: `${((siteForm.linkColumns || 4) - 1) / 9 * 100}%` }} 
                        />
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="1" 
                            value={siteForm.linkColumns || 4} 
                            onChange={e => setSiteForm({ ...siteForm, linkColumns: parseInt(e.target.value) })} 
                            className="relative w-full h-10 bg-transparent appearance-none cursor-pointer z-10 
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                            [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-brand-600
                            [&::-webkit-slider-thumb]:shadow-lg active:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform" 
                        />
                    </div>
                    <div className="px-6 py-4 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-white/10 font-black text-slate-800 dark:text-zinc-100 min-w-[100px] lg:min-w-[120px] text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                      <span className="text-xl lg:text-3xl">{siteForm.linkColumns}</span> 
                      <span className="text-sm ml-1 text-slate-400 tracking-normal">{t.admin.settings.columnsUnit}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-500" />
                      {t.admin.settings.healthCycleTitle || "链接存活探测周期"}
                    </label>
                  </div>
                  <div className="p-6 lg:p-8 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {t.admin.settings.healthCycleDesc || "控制打开导航站时自动探测链接可用性的间隔周期。在设定周期内直接复用本地缓存结果，避免每次进入页面或刷新时重复发起网络探测。"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {([
                        { id: '12h', label: t.admin.settings.healthCycles?.['12h'] || '每 12 小时' },
                        { id: '24h', label: t.admin.settings.healthCycles?.['24h'] || '每天一次 (24小时 · 推荐)' },
                        { id: '3d', label: t.admin.settings.healthCycles?.['3d'] || '每 3 天一次' },
                        { id: '7d', label: t.admin.settings.healthCycles?.['7d'] || '每周一次 (7天)' },
                        { id: 'manual', label: t.admin.settings.healthCycles?.['manual'] || '仅手动检测' },
                      ] as { id: HealthCheckCycle; label: string }[]).map(item => {
                        const isSelected = (siteForm.healthCheckCycle || '24h') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSiteForm({ ...siteForm, healthCheckCycle: item.id })}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20 text-brand-700 dark:text-brand-300 shadow-sm'
                                : 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />}
                            </div>
                            <span className="text-xs font-bold leading-snug">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {[
                    { key: 'faviconUrl', label: t.admin.settings.favicon, icon: Globe },
                    { key: 'backgroundUrl', label: t.admin.settings.background, icon: LayoutGrid },
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                      <div className="flex gap-4">
                        <input type="text" value={(siteForm as any)[field.key] || ''} onChange={e => setSiteForm({ ...siteForm, [field.key]: e.target.value })} className="flex-1 px-6 py-5 bg-slate-50/50 dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold dark:text-white shadow-sm" placeholder={t.admin.settings.placeholderUrl} />
                        <label className="w-16 h-16 bg-white dark:bg-zinc-700 border border-slate-200 text-slate-400 hover:text-brand-600 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-90 transition-all">
                           <Upload className="w-7 h-7" />
                           <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, false, (res) => setSiteForm({ ...siteForm, [field.key]: res }))} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => { onUpdateData({ ...data, siteConfig: siteForm }); showToast('success', t.admin.settings.success); }} className="w-full py-6 bg-brand-600 text-white rounded-[2rem] font-black text-lg hover:opacity-90 shadow-xl shadow-brand-100 uppercase tracking-[0.2em] active:scale-95 transition-all">
                  {t.admin.settings.save}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Multi-Source Metadata Picker Dialog */}
      {isMetaPickerOpen && fetchedCandidates && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 lg:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" onClick={handleAbandonMeta} />
          <div className="bg-white dark:bg-zinc-800 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col relative z-[180] border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-md shadow-brand-200 dark:shadow-none">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-lg lg:text-xl text-slate-800 dark:text-zinc-100 tracking-tight">
                    {t.admin.link.meta.pickerTitle}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                    {t.admin.link.meta.pickerDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAbandonMeta}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 lg:p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              {/* Real-time Preview Card */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200/80 dark:border-white/5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  实时预览 (Real-time Preview)
                </div>
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                  <div
                    className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-zinc-700/50 border border-slate-100 dark:border-white/5 flex items-center justify-center shrink-0 overflow-hidden"
                    style={linkForm.iconBgColor ? { backgroundColor: linkForm.iconBgColor } : {}}
                  >
                    {selectedCandidates.icon ? (
                      <img
                        src={selectedCandidates.icon}
                        alt="icon"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">
                      {selectedCandidates.title || linkForm.url || '网址标题'}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-zinc-400 line-clamp-2 mt-0.5">
                      {selectedCandidates.description || '暂无描述信息'}
                    </div>
                    {selectedCandidates.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedCandidates.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-700 text-[10px] font-bold text-slate-600 dark:text-zinc-300 rounded-md"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Title Strategy */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-brand-600" />
                    {t.admin.link.meta.titleStrategy}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-400">
                    点击选择或在下方直接微调
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {fetchedCandidates.titles.map((item, idx) => {
                    const isSelected = selectedCandidates.title === item.title;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCandidates(prev => ({ ...prev, title: item.title }))}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20'
                            : 'bg-slate-50/50 dark:bg-zinc-700/40 border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">
                            {item.source}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <span className="text-xs font-bold truncate mt-1">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Direct Title Edit */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={selectedCandidates.title}
                    onChange={(e) => setSelectedCandidates(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入或修改标题..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* 2. Icon Strategy */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                    {t.admin.link.meta.iconStrategy}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-normal">
                    支持 App Store 1024×1024 规整高清大图与原生 Favicon
                  </span>
                </div>

                {/* App Store Device & Region Search in Meta Picker */}
                <AppStoreSearchPanel
                  initialQuery={appStoreQuery || fetchedCandidates.titles[0]?.title || linkForm.title || linkForm.url}
                  onApplyApp={handleApplyAppStoreApp}
                  onFillInfo={handleFillAppStoreInfo}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(() => {
                    const seen = new Set<string>();
                    const filteredIcons = fetchedCandidates.icons.filter(item => {
                      if (!item.iconUrl) return false;
                      // Filter out redundant raw duplicate icon
                      if (item.source.includes('原图') || item.source === 'App Store' || item.source === 'App Store 原生图标') {
                        return false;
                      }
                      const is1024 = item.source.includes('1024') || item.iconUrl.includes('1024x1024');
                      const is512 = item.source.includes('512') || item.iconUrl.includes('512x512');
                      
                      // Normalize key to avoid duplicate resolutions or identical icons
                      const normBase = item.iconUrl.split('?')[0].replace(/\.(jpg|jpeg|png|webp)$/i, '');
                      const dedupeKey = item.iconUrl.includes('mzstatic.com')
                        ? `apple-${normBase.replace(/\/[0-9]+x[0-9]+bb/, '')}-${is1024 ? '1024' : is512 ? '512' : 'other'}`
                        : item.iconUrl.trim().toLowerCase();

                      if (seen.has(dedupeKey)) return false;
                      seen.add(dedupeKey);
                      return true;
                    });

                    return filteredIcons.map((item, idx) => {
                    const isSelected = selectedCandidates.icon === item.iconUrl;
                    const isAppStore = item.source.includes('App Store') || item.source.includes('Apple');
                    const is1024 = item.source.includes('1024') || item.iconUrl.includes('1024x1024');
                    const is512 = item.source.includes('512') || item.iconUrl.includes('512x512');

                    // Concise, readable label formatted for small card width
                    const formatIconLabel = (src: string) => {
                      if (src.includes('1024')) return '1024px 超清';
                      if (src.includes('512')) return '512px 高清';
                      if (src.includes('Apple Touch')) return 'Apple Touch';
                      if (src.includes('Favicon') || src.includes('网站')) return '网站 Favicon';
                      if (src.includes('Google')) return 'Google HD';
                      if (src.includes('DuckDuckGo')) return 'DuckDuckGo';
                      if (src.includes('封面') || src.includes('OpenGraph')) return '封面图';
                      if (src.includes('App Store')) return 'App Store';
                      return src;
                    };

                    const displayLabel = formatIconLabel(item.source);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCandidates(prev => ({ ...prev, icon: item.iconUrl }))}
                        title={`${item.source}\n点击选用`}
                        className={`w-full min-w-0 p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-zinc-700/40 border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {is1024 ? (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-600 text-white shadow-xs pointer-events-none">
                            1024px
                          </span>
                        ) : is512 ? (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black bg-sky-500 text-white shadow-xs pointer-events-none">
                            512px
                          </span>
                        ) : null}
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0">
                          <img
                            src={item.iconUrl}
                            alt={item.source}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="w-full min-w-0 px-0.5 flex items-center justify-center gap-1">
                          {isAppStore && <Apple className="w-2.5 h-2.5 text-blue-500 shrink-0" />}
                          <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 truncate max-w-full block">
                            {displayLabel}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
                </div>
              </div>

              {/* 3. Description Strategy */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-brand-600" />
                    {t.admin.link.meta.descStrategy}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-400">
                    可选择下方候选描述或直接编辑
                  </span>
                </div>
                <div className="space-y-2">
                  {fetchedCandidates.descriptions.map((item, idx) => {
                    const isSelected = selectedCandidates.description === item.description;
                    const isStats = item.source === '智能统计描述' || item.source.includes('统计');
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCandidates(prev => ({ ...prev, description: item.description }))}
                        className={`w-full p-3.5 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                          isSelected
                            ? isStats
                              ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/25 shadow-sm'
                              : 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-sm'
                            : isStats
                            ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-800/40 text-slate-700 dark:text-zinc-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                            : 'bg-slate-50/50 dark:bg-zinc-700/40 border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                            isStats ? 'text-purple-600 dark:text-purple-400' : 'text-brand-600 dark:text-brand-400'
                          }`}>
                            {isStats && <BarChart3 className="w-3.5 h-3.5 shrink-0" />}
                            <span>{item.source}</span>
                            {isStats && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-md font-bold">
                                权威精准数据
                              </span>
                            )}
                          </span>
                          {isSelected && <Check className={`w-3.5 h-3.5 shrink-0 ${isStats ? 'text-purple-600' : 'text-brand-600'}`} />}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description || '（无描述）'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Direct Description Edit */}
                <div className="mt-2">
                  <textarea
                    rows={2}
                    value={selectedCandidates.description}
                    onChange={(e) => setSelectedCandidates(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="输入或修改简介描述..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* 4. Suggested Tags */}
              {fetchedCandidates.tags && fetchedCandidates.tags.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-brand-600" />
                      {t.admin.link.tags}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {fetchedCandidates.country && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                          <Globe className="w-3 h-3" />
                          已识别所属地区：{fetchedCandidates.country}（排在首位）
                        </span>
                      )}
                      {currentSubCategoryTagsInfo.subCategoryName && Object.keys(currentSubCategoryTagsInfo.tagCounts).length > 0 && (
                        <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800/40">
                          <Sparkles className="w-3 h-3" />
                          优先推荐同分类已有标签
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fetchedCandidates.tags.map((tag) => {
                      const isSelected = selectedCandidates.tags.includes(tag);
                      const isCountryTag = tag === fetchedCandidates.country;
                      const isSubCategoryTag = currentSubCategoryTagsInfo.tagNames.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleCandidateTag(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? isCountryTag
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-brand-600 text-white border-brand-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-white/5 hover:bg-slate-200'
                          }`}
                        >
                          {isCountryTag ? <Globe className="w-3 h-3 shrink-0" /> : isSubCategoryTag ? <Sparkles className="w-3 h-3 shrink-0 text-amber-300" /> : '#'}
                          <span>{tag}</span>
                          {isCountryTag ? (
                            <span className="text-[9px] opacity-85 font-medium">（地区）</span>
                          ) : isSubCategoryTag ? (
                            <span className="text-[9px] opacity-85 font-medium">（同分类）</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-white/5 flex gap-4 shrink-0 bg-slate-50/50 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={handleAbandonMeta}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
              >
                {t.admin.link.meta.abandon}
              </button>
              <button
                type="button"
                onClick={applyMetaSelection}
                className="flex-1 py-3.5 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 shadow-lg shadow-brand-100 dark:shadow-none transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" /> {t.admin.link.meta.apply}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popovers for categories remain functional */}
      {(catEditingId || subCatEditingId) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => { setCatEditingId(null); setSubCatEditingId(null); }} />
          <div className="bg-white dark:bg-zinc-800 rounded-[2.5rem] p-8 lg:p-10 w-full max-w-md relative z-[160] border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200 shadow-2xl">
            <h4 className="font-black text-2xl mb-6 text-slate-800 dark:text-zinc-100">{catEditingId ? (catEditingId === 'new' ? t.admin.category.new : t.admin.category.edit) : (subCatEditingId === 'new' ? t.admin.category.newSub : t.admin.category.editSub)}</h4>
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  {catEditingId ? '分类名称' : '子分类名称'}
                </label>
                <input
                  type="text"
                  placeholder={t.admin.category.name}
                  value={catEditingId ? catForm.name : subCatForm.name}
                  onChange={e => catEditingId ? setCatForm({ ...catForm, name: e.target.value }) : setSubCatForm({ ...subCatForm, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-lg dark:text-white focus:border-brand-500 shadow-xs"
                  autoFocus
                />
              </div>

              {/* 主分类专属：图标配置面板 */}
              {catEditingId && (() => {
                const resolved = resolveCategoryIcon({ name: catForm.name, icon: catForm.icon });
                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-700/40 border border-slate-200/80 dark:border-white/10 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      分类导航图标 (智能分配与自定)
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                          <CategoryIconDisplay category={{ name: catForm.name, icon: catForm.icon }} className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">{resolved.name}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200/60">
                              #{resolved.code}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-400">
                            {resolved.isAutoAssigned ? '系统智能分配（随名称动态推荐）' : (resolved.type === 'custom' ? '自定义上传图片' : '已从图标库选用')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCatIconPickerTarget({
                          id: catForm.id,
                          name: catForm.name,
                          icon: catForm.icon,
                          isStandalone: false
                        })}
                        className="px-3.5 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 hover:border-brand-500 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
                      >
                        更换图标
                      </button>
                    </div>

                    {catForm.icon && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setCatForm(prev => ({ ...prev, icon: '' }))}
                          className="text-[11px] text-slate-400 hover:text-brand-600 underline cursor-pointer"
                        >
                          恢复系统智能分配
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button onClick={() => { 
                if (catEditingId) { 
                  const newCats = catForm.id 
                    ? data.categories.map(c => c.id === catForm.id ? { ...c, name: catForm.name, icon: catForm.icon } : c) 
                    : [...data.categories, { id: `c-${Date.now()}`, name: catForm.name, icon: catForm.icon, subCategories: [] }]; 
                  onUpdateData({ ...data, categories: newCats }); 
                  setCatEditingId(null); 
                } else { 
                  const newCats = data.categories.map(c => c.id === subCatForm.parentId ? { ...c, subCategories: subCatForm.id ? c.subCategories.map(s => s.id === subCatForm.id ? { ...s, name: subCatForm.name } : s) : [...c.subCategories, { id: `sc-${Date.now()}`, name: subCatForm.name }] } : c); 
                  onUpdateData({ ...data, categories: newCats }); 
                  setSubCatEditingId(null); 
                }
                showToast('success', t.app.saved);
              }} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-base hover:opacity-90 shadow-lg active:scale-95 transition-all cursor-pointer">{t.admin.category.saveDone}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Icon Picker Modal */}
      {catIconPickerTarget && (
        <CategoryIconPickerModal
          isOpen={true}
          onClose={() => setCatIconPickerTarget(null)}
          categoryName={catIconPickerTarget.name}
          subCategoryNames={catIconPickerTarget.subCategoryNames}
          currentIcon={catIconPickerTarget.icon}
          onApplyIcon={(newIcon) => {
            if (catIconPickerTarget.isStandalone && catIconPickerTarget.id) {
              const updatedCats = data.categories.map(c => c.id === catIconPickerTarget.id ? { ...c, icon: newIcon } : c);
              onUpdateData({ ...data, categories: updatedCats });
              showToast('success', '分类图标已成功保存！');
            } else {
              setCatForm(prev => ({ ...prev, icon: newIcon }));
              showToast('success', '已为当前分类选用新图标！');
            }
            setCatIconPickerTarget(null);
          }}
        />
      )}

      {/* HD Icon Studio Modal */}
      {hdModalTarget && (
        <HdIconEnhanceModal
          isOpen={true}
          onClose={() => setHdModalTarget(null)}
          url={hdModalTarget.url}
          title={hdModalTarget.title}
          currentIcon={hdModalTarget.currentIcon}
          initialTab={hdModalTarget.initialTab}
          onApplyIcon={(newIconUrl: string) => {
            // 始终同步回当前表单输入框
            setLinkForm(prev => ({ ...prev, iconUrl: newIconUrl }));

            if (hdModalTarget.targetLinkId) {
              const updatedLinks = data.links.map(l => l.id === hdModalTarget.targetLinkId ? { ...l, iconUrl: newIconUrl } : l);
              onUpdateData({ ...data, links: updatedLinks });
              showToast('success', `已成功将「${hdModalTarget.title || '图标'}」升级为此高清图标！`);
            } else {
              showToast('success', '已将高清图标填入表单！');
            }
            setHdModalTarget(null);
          }}
        />
      )}

      {/* Minimalist Letter Icon Customizer Modal */}
      {isLetterCustomizerOpen && (
        <LetterIconCustomizerModal
          isOpen={true}
          onClose={() => setIsLetterCustomizerOpen(false)}
          initialTitle={linkForm.title || ''}
          initialUrl={linkForm.url || ''}
          initialBgColor={linkForm.iconBgColor || ''}
          onApply={(newIconDataUrl, bgColor) => {
            setLinkForm(prev => ({
              ...prev,
              iconUrl: newIconDataUrl,
              iconBgColor: bgColor || prev.iconBgColor,
            }));
            showToast('success', '已应用定制极简字母图标与底色！');
          }}
        />
      )}
    </div>
  );
};

export default AdminModal;