import React, { useState, useEffect, useRef } from 'react';
import { 
  Apple, 
  Search, 
  Loader2, 
  ChevronDown, 
  Check, 
  Globe, 
  Smartphone, 
  Tablet, 
  Laptop, 
  Glasses, 
  Watch, 
  Sparkles,
  ExternalLink,
  Layers,
  X,
  Youtube,
  Play,
  Chrome,
  Tv
} from 'lucide-react';
import { 
  APP_STORE_DEVICES, 
  APP_STORE_COUNTRIES, 
  AppStoreDeviceId, 
  AppStoreDeviceOption, 
  AppStoreCountryOption, 
  AppStoreAppResult,
  YouTubeChannelResult,
  detectAppStoreDevices,
  parseAppStoreUrl,
  cleanPortalSearchTerm,
  PortalPlatformId,
  PORTAL_PLATFORM_TABS
} from '../appStoreConstants';
import { PortalIconItem } from '../services/portalMultiPlatformService';

interface AppStoreSearchPanelProps {
  initialQuery?: string;
  defaultDevice?: AppStoreDeviceId;
  defaultCountry?: string;
  defaultSource?: PortalPlatformId;
  onApplyApp: (app: AppStoreAppResult, preferredSize?: '1024' | '512') => void;
  onFillInfo?: (app: AppStoreAppResult) => void;
  compact?: boolean;
  className?: string;
}

export const AppStoreSearchPanel: React.FC<AppStoreSearchPanelProps> = ({
  initialQuery = '',
  defaultDevice = 'all',
  defaultCountry = 'cn',
  defaultSource,
  onApplyApp,
  onFillInfo,
  compact = false,
  className = '',
}) => {
  // Infer initial source tab from query if not explicitly provided
  const inferInitialTab = (q: string): PortalPlatformId => {
    if (defaultSource) return defaultSource;
    const lower = q.toLowerCase();
    if (lower.includes('bilibili.com')) return 'bilibili';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
    if (lower.includes('xiaohongshu.com') || lower.includes('xhslink.com')) return 'xiaohongshu';
    if (lower.includes('play.google.com')) return 'googleplay';
    if (lower.includes('chromewebstore.google.com')) return 'chromestore';
    if (lower.includes('facebook.com') || lower.includes('fb.me')) return 'facebook';
    if (lower.includes('instagram.com') || lower.includes('threads.net')) return 'instagram';
    if (lower.includes('discord.com') || lower.includes('discord.gg')) return 'discord';
    if (lower.includes('youtube.com') || lower.includes('@')) return 'youtube';
    if (lower.includes('apple.com') || lower.includes('apps.apple.com')) return 'appstore';
    return 'all';
  };

  const [sourceTab, setSourceTab] = useState<PortalPlatformId>(inferInitialTab(initialQuery));
  const [query, setQuery] = useState(initialQuery);
  const [device, setDevice] = useState<AppStoreDeviceId>(defaultDevice);
  const [country, setCountry] = useState<string>(defaultCountry);

  // Platform specific results
  const [results, setResults] = useState<AppStoreAppResult[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeChannelResult[]>([]);
  const [bilibiliResults, setBilibiliResults] = useState<PortalIconItem[]>([]);
  const [twitterResults, setTwitterResults] = useState<PortalIconItem[]>([]);
  const [xiaohongshuResults, setXiaohongshuResults] = useState<PortalIconItem[]>([]);
  const [googlePlayResults, setGooglePlayResults] = useState<PortalIconItem[]>([]);
  const [chromeStoreResults, setChromeStoreResults] = useState<PortalIconItem[]>([]);
  const [facebookResults, setFacebookResults] = useState<PortalIconItem[]>([]);
  const [instagramResults, setInstagramResults] = useState<PortalIconItem[]>([]);
  const [discordResults, setDiscordResults] = useState<PortalIconItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dropdown states
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');

  const deviceMenuRef = useRef<HTMLDivElement>(null);
  const countryMenuRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Enable mouse wheel horizontal scrolling when mouse hovers over the platform tabs bar
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if the tabs bar has horizontal overflow
      if (el.scrollWidth > el.clientWidth) {
        // If scrolling primarily vertically (common with standard mouse wheel up/down)
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          // Scroll horizontally by deltaY
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target as Node)) {
        setIsDeviceMenuOpen(false);
      }
      if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
        setIsCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      setSourceTab(inferInitialTab(initialQuery));
    }
  }, [initialQuery]);

  const currentDeviceObj = APP_STORE_DEVICES.find(d => d.id === device) || APP_STORE_DEVICES[0];
  const currentCountryObj = APP_STORE_COUNTRIES.find(c => c.code.toLowerCase() === country.toLowerCase()) || APP_STORE_COUNTRIES[0];
  const activeTabObj = PORTAL_PLATFORM_TABS.find(t => t.id === sourceTab) || PORTAL_PLATFORM_TABS[0];

  const handleSearch = async (
    queryOverride?: string,
    deviceOverride?: AppStoreDeviceId,
    countryOverride?: string,
    sourceOverride?: PortalPlatformId
  ) => {
    const q = (queryOverride !== undefined ? queryOverride : query).trim();
    if (!q) return;

    const currentTab = sourceOverride || sourceTab;
    const targetDevice = deviceOverride || device;
    let targetCountry = (countryOverride || country || 'cn').toLowerCase();

    // Auto-detect App Store URL country & ID if pasted
    const parsed = parseAppStoreUrl(q);
    if (parsed.country && parsed.country !== targetCountry) {
      targetCountry = parsed.country;
      setCountry(parsed.country);
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cleanTerm = cleanPortalSearchTerm(q) || q;

      const portalRes = await fetch('/api/search-portal-icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanTerm, country: targetCountry, device: targetDevice, type: currentTab }),
      });

      if (portalRes.ok) {
        const json = await portalRes.json();
        if (json.success) {
          const yt = Array.isArray(json.youtube) ? json.youtube : [];
          const app = Array.isArray(json.appStore) ? json.appStore : [];
          const gp = Array.isArray(json.googlePlay) ? json.googlePlay : [];
          const cs = Array.isArray(json.chromeStore) ? json.chromeStore : [];
          const bili = Array.isArray(json.bilibili) ? json.bilibili : [];
          const tw = Array.isArray(json.twitter) ? json.twitter : [];
          const xhs = Array.isArray(json.xiaohongshu) ? json.xiaohongshu : [];
          const fb = Array.isArray(json.facebook) ? json.facebook : [];
          const ig = Array.isArray(json.instagram) ? json.instagram : [];
          const dc = Array.isArray(json.discord) ? json.discord : [];

          setYoutubeResults(yt);
          setResults(app);
          setGooglePlayResults(gp);
          setChromeStoreResults(cs);
          setBilibiliResults(bili);
          setTwitterResults(tw);
          setXiaohongshuResults(xhs);
          setFacebookResults(fb);
          setInstagramResults(ig);
          setDiscordResults(dc);

          const totalFound = yt.length + app.length + gp.length + cs.length + bili.length + tw.length + xhs.length + fb.length + ig.length + dc.length;
          if (totalFound === 0) {
            setErrorMessage(`未找到与「${cleanTerm}」相关的官方图标或头像`);
          }
        } else {
          setErrorMessage(json.error || '检索失败');
        }
      } else {
        setErrorMessage('服务器响应异常，请稍后重试');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '搜索请求失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDevice = (d: AppStoreDeviceId) => {
    setDevice(d);
    setIsDeviceMenuOpen(false);
    if (query.trim()) {
      handleSearch(query, d, country);
    }
  };

  const handleSelectCountry = (c: string) => {
    setCountry(c);
    setIsCountryMenuOpen(false);
    setCountryFilter('');
    if (query.trim()) {
      handleSearch(query, device, c);
    }
  };

  const handleApplyYouTube = (channel: YouTubeChannelResult) => {
    const appLike: AppStoreAppResult = {
      trackId: channel.channelId,
      trackName: channel.title,
      cleanName: channel.title,
      artistName: channel.handle || 'YouTube 官方',
      icon1024: channel.icon800,
      icon512: channel.icon400 || channel.icon800,
      iconRaw: channel.iconRaw,
      devices: ['YouTube'],
      primaryDevice: 'YouTube',
      description: channel.description || `${channel.title} YouTube 官方认证频道`,
      appStoreUrl: channel.channelUrl,
      primaryGenreName: '官方门户',
    };
    onApplyApp(appLike, '1024');
  };

  const handleFillYouTubeInfo = (channel: YouTubeChannelResult) => {
    if (onFillInfo) {
      const appLike: AppStoreAppResult = {
        trackId: channel.channelId,
        trackName: channel.title,
        cleanName: channel.title,
        artistName: channel.handle || 'YouTube 官方',
        icon1024: channel.icon800,
        icon512: channel.icon400 || channel.icon800,
        iconRaw: channel.iconRaw,
        devices: ['YouTube'],
        primaryDevice: 'YouTube',
        description: channel.description || `${channel.title} YouTube 官方认证频道`,
        appStoreUrl: channel.channelUrl,
        primaryGenreName: '官方门户',
      };
      onFillInfo(appLike);
    }
  };

  // Convert any PortalIconItem to AppStoreAppResult format for compatibility
  const handleApplyPortalItem = (item: PortalIconItem, preferredSize: '1024' | '512' = '512') => {
    const appLike: AppStoreAppResult = {
      trackId: item.id,
      trackName: item.title,
      cleanName: item.title,
      artistName: item.subtitle || item.badge,
      icon1024: item.icon1024 || item.icon512 || item.iconUrl,
      icon512: item.icon512 || item.iconUrl,
      iconRaw: item.iconUrl,
      devices: [item.platform.toUpperCase()],
      primaryDevice: item.badge,
      description: item.description || `${item.title} 官方图标与详情`,
      appStoreUrl: item.profileUrl,
      primaryGenreName: item.badge,
    };
    onApplyApp(appLike, preferredSize);
  };

  const handleFillPortalItemInfo = (item: PortalIconItem) => {
    if (onFillInfo) {
      const appLike: AppStoreAppResult = {
        trackId: item.id,
        trackName: item.title,
        cleanName: item.title,
        artistName: item.subtitle || item.badge,
        icon1024: item.icon1024 || item.icon512 || item.iconUrl,
        icon512: item.icon512 || item.iconUrl,
        iconRaw: item.iconUrl,
        devices: [item.platform.toUpperCase()],
        primaryDevice: item.badge,
        description: item.description || `${item.title} 官方图标与详情`,
        appStoreUrl: item.profileUrl,
        primaryGenreName: item.badge,
      };
      onFillInfo(appLike);
    }
  };

  const filteredCountries = APP_STORE_COUNTRIES.filter(c => {
    if (!countryFilter.trim()) return true;
    const f = countryFilter.toLowerCase();
    return c.name.toLowerCase().includes(f) || c.code.toLowerCase().includes(f) || (c.nativeName && c.nativeName.toLowerCase().includes(f));
  });

  const popularCountries = APP_STORE_COUNTRIES.filter(c => c.isPopular);

  // Helper to render portal items
  const renderPortalItemGrid = (
    items: PortalIconItem[],
    sectionTitle: string,
    platformIcon: React.ReactNode,
    badgeBg: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
            {platformIcon}
            {sectionTitle} ({items.length} 项)：
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
            官方高清原画
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {items.map(item => (
            <div
              key={`${item.platform}-${item.id}`}
              className="p-3 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100/80 dark:hover:bg-zinc-700/60 border border-slate-200/80 dark:border-white/5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
                  <img
                    src={item.iconUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl pointer-events-none" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {item.title}
                    </span>
                  </div>
                  {item.subtitle && (
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                      {item.subtitle}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white ${badgeBg}`}>
                      {item.badge}
                    </span>
                    {item.sizeLabel && (
                      <span className="text-[9px] px-1 py-0.2 bg-slate-200/70 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded font-mono">
                        {item.sizeLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => handleApplyPortalItem(item, '512')}
                  className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="选用官方超清图标"
                >
                  <Sparkles className="w-3 h-3" />
                  选用超清图标
                </button>

                <div className="flex items-center gap-2">
                  {onFillInfo && (
                    <button
                      type="button"
                      onClick={() => handleFillPortalItemInfo(item)}
                      className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                    >
                      填入信息
                    </button>
                  )}
                  {item.profileUrl && (
                    <a
                      href={item.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      title="在新窗口查看源链接"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyResults =
    results.length > 0 ||
    googlePlayResults.length > 0 ||
    chromeStoreResults.length > 0 ||
    youtubeResults.length > 0 ||
    bilibiliResults.length > 0 ||
    twitterResults.length > 0;

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 ${className}`}>
      {/* Top Source Tabs: Multi-Platform Portal Selectors */}
      <div className="space-y-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
        <div 
          ref={tabsContainerRef}
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-800/90 rounded-xl overflow-x-auto max-w-full custom-scrollbar overscroll-x-contain"
        >
          {PORTAL_PLATFORM_TABS.map(tab => {
            const isSelected = sourceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  setSourceTab(tab.id);
                  (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                  if (query.trim()) handleSearch(query, device, country, tab.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? `${tab.badgeBg} text-white shadow-xs`
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.id === 'all' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                {tab.id === 'appstore' && <Apple className="w-3.5 h-3.5" />}
                {tab.id === 'googleplay' && <Play className="w-3.5 h-3.5" />}
                {tab.id === 'chromestore' && <Chrome className="w-3.5 h-3.5" />}
                {tab.id === 'youtube' && <Youtube className="w-3.5 h-3.5" />}
                {tab.id === 'bilibili' && <Tv className="w-3.5 h-3.5" />}
                {tab.id === 'twitter' && (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'}`}>
                  {tab.resolutionBadge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 px-1">
          <span className="flex items-center gap-1 font-medium">
            {activeTabObj.tip}
          </span>
        </div>
      </div>

      {/* Secondary Sub-Bar: Device & Country Storefront (Only in App Store mode) */}
      {sourceTab === 'appstore' && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            {/* Device Zone Dropdown Trigger */}
            <div className="relative" ref={deviceMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsDeviceMenuOpen(!isDeviceMenuOpen);
                  setIsCountryMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all shadow-sm group cursor-pointer"
              >
                <Apple className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentDeviceObj.zoneName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDeviceMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Device Dropdown Menu */}
              {isDeviceMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 border-b border-zinc-800/80 mb-1 flex items-center justify-between">
                    <span>切换设备专区检索</span>
                    <span className="text-zinc-400">全生态 & 5 大终端</span>
                  </div>
                  <div className="space-y-0.5">
                    {APP_STORE_DEVICES.map((d, idx) => {
                      const isSelected = d.id === device;
                      return (
                        <React.Fragment key={d.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectDevice(d.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                              isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {d.id === 'iphone' && <Smartphone className="w-3.5 h-3.5" />}
                              {d.id === 'ipad' && <Tablet className="w-3.5 h-3.5" />}
                              {d.id === 'mac' && <Laptop className="w-3.5 h-3.5" />}
                              {d.id === 'vision' && <Glasses className="w-3.5 h-3.5" />}
                              {d.id === 'watch' && <Watch className="w-3.5 h-3.5" />}
                              {d.id === 'all' && <Globe className="w-3.5 h-3.5" />}
                              <span>{d.zoneName}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                          {idx === 0 && <div className="h-px bg-zinc-800 my-1" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Country / Region Storefront Trigger */}
            <div className="relative" ref={countryMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCountryMenuOpen(!isCountryMenuOpen);
                  setIsDeviceMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200/80 dark:border-white/5 cursor-pointer"
              >
                <span>{currentCountryObj.flag}</span>
                <span>{currentCountryObj.name}商城</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Country Selection Dropdown */}
              {isCountryMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-1.5 pb-2 border-b border-zinc-800">
                    <input
                      type="text"
                      value={countryFilter}
                      onChange={e => setCountryFilter(e.target.value)}
                      placeholder="搜索国家或地区..."
                      className="w-full px-3 py-1.5 bg-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 outline-none border border-zinc-700/60 focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar pr-1">
                    {!countryFilter.trim() && (
                      <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        热门分发市场
                      </div>
                    )}
                    {(!countryFilter.trim() ? popularCountries : filteredCountries).map(c => {
                      const isSelected = c.code.toLowerCase() === country.toLowerCase();
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelectCountry(c.code)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                            isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="text-[10px] text-zinc-400 uppercase">({c.code})</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={activeTabObj.placeholder}
            className="w-full pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-brand-500 dark:text-white transition-all shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setYoutubeResults([]);
                setGooglePlayResults([]);
                setChromeStoreResults([]);
                setBilibiliResults([]);
                setTwitterResults([]);
                setXiaohongshuResults([]);
                setFacebookResults([]);
                setInstagramResults([]);
                setDiscordResults([]);
                setErrorMessage(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isLoading || !query.trim()}
          className={`px-4 py-2 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer ${activeTabObj.badgeBg} hover:opacity-90`}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>检索匹配</span>
        </button>
      </div>

      {/* Error / Empty Notification */}
      {errorMessage && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          {sourceTab === 'appstore' && (
            <button
              type="button"
              onClick={() => handleSearch(query, 'all', country === 'us' ? 'cn' : 'us')}
              className="text-[11px] font-bold underline hover:no-underline ml-2 shrink-0 cursor-pointer"
            >
              尝试美区检索
            </button>
          )}
        </div>
      )}

      {/* Search Results Display */}
      {hasAnyResults && (
        <div className="space-y-4 pt-1">
          {/* 1. App Store Results Section */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Apple className="w-3.5 h-3.5" />
                  App Store 苹果应用 ({results.length} 款官方 App)：
                </span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">Apple CDN 原始超清</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {results.map(app => (
                  <div
                    key={app.trackId}
                    className="p-3 bg-slate-50 dark:bg-zinc-800/80 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/80 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700/60 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <img 
                          src={app.icon512 || app.icon1024} 
                          alt={app.cleanName} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl pointer-events-none" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {app.cleanName}
                          </span>
                          {app.formattedPrice && (
                            <span className="text-[9px] px-1 py-0.2 bg-slate-200/70 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded font-medium shrink-0">
                              {app.formattedPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate mt-0.5">
                          {app.artistName || app.trackName}
                        </div>

                        {/* Supported Devices Badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {app.devices.map(dev => (
                            <span 
                              key={dev} 
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                dev === 'Mac'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : dev === 'iPad'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : dev === 'Vision'
                                  ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300'
                                  : dev === 'Watch'
                                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              {dev === 'Mac' && <Laptop className="w-2.5 h-2.5" />}
                              {dev === 'iPad' && <Tablet className="w-2.5 h-2.5" />}
                              {dev === 'iPhone' && <Smartphone className="w-2.5 h-2.5" />}
                              {dev === 'Vision' && <Glasses className="w-2.5 h-2.5" />}
                              {dev === 'Watch' && <Watch className="w-2.5 h-2.5" />}
                              {dev}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onApplyApp(app, '1024')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                          title="选用 1024×1024 原始母版大图标"
                        >
                          <Sparkles className="w-3 h-3" />
                          选用 1024px
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyApp(app, '512')}
                          className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          title="选用 512×512 高清图标"
                        >
                          512px
                        </button>
                      </div>

                      {onFillInfo && (
                        <button
                          type="button"
                          onClick={() => onFillInfo(app)}
                          className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          同步名称与简介
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Google Play Results */}
          {renderPortalItemGrid(googlePlayResults, 'Google Play 安卓应用', <Play className="w-3.5 h-3.5 text-emerald-600" />, 'bg-emerald-600')}

          {/* 3. Chrome Web Store Results */}
          {renderPortalItemGrid(chromeStoreResults, 'Chrome 应用商店扩展', <Chrome className="w-3.5 h-3.5 text-amber-600" />, 'bg-amber-600')}

          {/* 4. YouTube Channel Avatars Section */}
          {youtubeResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <Youtube className="w-3.5 h-3.5" />
                  YouTube 官方门户头像 ({youtubeResults.length} 个相关频道)：
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold">
                  800×800 官方原画
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {youtubeResults.map(channel => (
                  <div
                    key={channel.channelId}
                    className="p-3 bg-slate-50 dark:bg-zinc-800/80 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-slate-200/80 dark:border-white/5 hover:border-red-300 dark:hover:border-red-700/60 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <img
                          src={channel.icon800}
                          alt={channel.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 ring-1 ring-black/5 rounded-2xl pointer-events-none" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400">
                            {channel.title}
                          </span>
                          {channel.isVerified && (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-400 dark:bg-zinc-600 text-white text-[8px] font-black shrink-0" title="官方认证频道">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                          {channel.handle || `@${channel.title}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 dark:text-zinc-400">
                          {channel.subscribers && <span>{channel.subscribers}</span>}
                          {channel.videoCount && <span>· {channel.videoCount}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => handleApplyYouTube(channel)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="选用 800×800 YouTube 官方高清头像"
                      >
                        <Sparkles className="w-3 h-3" />
                        选用 800px 超清头像
                      </button>

                      <div className="flex items-center gap-2">
                        {onFillInfo && (
                          <button
                            type="button"
                            onClick={() => handleFillYouTubeInfo(channel)}
                            className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          >
                            填入信息
                          </button>
                        )}
                        {channel.channelUrl && (
                          <a
                            href={channel.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="在新窗口查看 YouTube 频道"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Bilibili Results Section */}
          {renderPortalItemGrid(bilibiliResults, 'Bilibili 官方主站与 UP 主头像', <Tv className="w-3.5 h-3.5 text-[#00AEEC]" />, 'bg-[#00AEEC]')}

          {/* 6. X (Twitter) Results Section */}
          {renderPortalItemGrid(twitterResults, 'X (Twitter) 官方与用户头像', (
            <svg className="w-3.5 h-3.5 fill-current text-zinc-900 dark:text-zinc-100" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ), 'bg-zinc-900 text-white dark:bg-black')}
        </div>
      )}
    </div>
  );
};
