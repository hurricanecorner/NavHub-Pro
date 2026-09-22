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
  X
} from 'lucide-react';
import { 
  APP_STORE_DEVICES, 
  APP_STORE_COUNTRIES, 
  AppStoreDeviceId, 
  AppStoreDeviceOption, 
  AppStoreCountryOption, 
  AppStoreAppResult,
  detectAppStoreDevices,
  parseAppStoreUrl
} from '../appStoreConstants';

interface AppStoreSearchPanelProps {
  initialQuery?: string;
  defaultDevice?: AppStoreDeviceId;
  defaultCountry?: string;
  onApplyApp: (app: AppStoreAppResult, preferredSize?: '1024' | '512') => void;
  onFillInfo?: (app: AppStoreAppResult) => void;
  compact?: boolean;
  className?: string;
}

export const AppStoreSearchPanel: React.FC<AppStoreSearchPanelProps> = ({
  initialQuery = '',
  defaultDevice = 'all',
  defaultCountry = 'cn',
  onApplyApp,
  onFillInfo,
  compact = false,
  className = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [device, setDevice] = useState<AppStoreDeviceId>(defaultDevice);
  const [country, setCountry] = useState<string>(defaultCountry);
  const [results, setResults] = useState<AppStoreAppResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dropdown states
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');

  const deviceMenuRef = useRef<HTMLDivElement>(null);
  const countryMenuRef = useRef<HTMLDivElement>(null);

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
    }
  }, [initialQuery]);

  const currentDeviceObj = APP_STORE_DEVICES.find(d => d.id === device) || APP_STORE_DEVICES[0];
  const currentCountryObj = APP_STORE_COUNTRIES.find(c => c.code.toLowerCase() === country.toLowerCase()) || APP_STORE_COUNTRIES[0];

  const renderDeviceIcon = (id: AppStoreDeviceId, className = 'w-4 h-4') => {
    switch (id) {
      case 'iphone':
        return <Smartphone className={className} />;
      case 'ipad':
        return <Tablet className={className} />;
      case 'mac':
        return <Laptop className={className} />;
      case 'vision':
        return <Glasses className={className} />;
      case 'watch':
        return <Watch className={className} />;
      case 'all':
      default:
        return <Globe className={className} />;
    }
  };

  const handleSearch = async (queryOverride?: string, deviceOverride?: AppStoreDeviceId, countryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : query).trim();
    if (!q) return;

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
      let fetchedResults: AppStoreAppResult[] = [];

      // 1. Try backend search endpoint
      try {
        const res = await fetch('/api/search-app-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, country: targetCountry, device: targetDevice }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.results)) {
            fetchedResults = json.results;
          }
        }
      } catch (backendErr) {
        console.warn('Backend search failed, fallback to client iTunes API...', backendErr);
      }

      // 2. Client-side fallback if backend returned empty
      if (!fetchedResults || fetchedResults.length === 0) {
        const entity = targetDevice === 'mac' ? 'macSoftware' : targetDevice === 'ipad' ? 'iPadSoftware' : 'software';
        const searchUrl = parsed.id 
          ? `https://itunes.apple.com/lookup?id=${parsed.id}&country=${targetCountry}`
          : `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=${targetCountry}&entity=${entity}&limit=10`;

        const clientRes = await fetch(searchUrl);
        if (clientRes.ok) {
          const json = await clientRes.json();
          if (json.results && Array.isArray(json.results)) {
            fetchedResults = json.results.map((r: any) => {
              const raw512 = (r.artworkUrl512 || r.artworkUrl100 || '') as string;
              const icon1024 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/1024x1024bb.').replace(/\.jpg$/, '.png') : '';
              const icon512 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/512x512bb.').replace(/\.jpg$/, '.png') : '';
              const rawClean = (r.trackName || '').split(/[-|_—–·]/)[0].trim() || r.trackName;
              const devs = detectAppStoreDevices(r, targetDevice);
              return {
                trackId: r.trackId,
                trackName: r.trackName,
                cleanName: rawClean,
                artistName: r.artistName,
                icon1024: icon1024 || raw512,
                icon512: icon512 || raw512,
                iconRaw: raw512,
                devices: devs,
                primaryDevice: devs[0] || (r.kind === 'mac-software' ? 'Mac' : 'iPhone'),
                genres: r.genres || [],
                description: r.description ? r.description.split('\n')[0].trim().slice(0, 160) : '',
                appStoreUrl: r.trackViewUrl,
                country: targetCountry,
                formattedPrice: r.formattedPrice || (r.price === 0 ? '免费' : undefined),
                version: r.version,
              };
            });
          }
        }
      }

      setResults(fetchedResults);
      if (fetchedResults.length === 0) {
        setErrorMessage(`在 [${targetCountry.toUpperCase()}区] 未检索到【${targetDevice.toUpperCase()}】相关应用，建议切换国家或专区试试`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络连接超时，请重试');
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

  const filteredCountries = APP_STORE_COUNTRIES.filter(c => {
    if (!countryFilter.trim()) return true;
    const f = countryFilter.toLowerCase();
    return c.name.toLowerCase().includes(f) || c.code.toLowerCase().includes(f) || (c.nativeName && c.nativeName.toLowerCase().includes(f));
  });

  const popularCountries = APP_STORE_COUNTRIES.filter(c => c.isPopular);

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 ${className}`}>
      {/* Top Header Bar: Device Zone Selector (Matching Image 2) & Country Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          {/* Device Zone Dropdown Trigger (Styled precisely like Image 2) */}
          <div className="relative" ref={deviceMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsDeviceMenuOpen(!isDeviceMenuOpen);
                setIsCountryMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all shadow-sm group"
            >
              <Apple className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentDeviceObj.zoneName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDeviceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Device Dropdown Menu (Exact 1:1 match with Image 2 dropdown) */}
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
                          className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors group ${
                            isSelected 
                              ? 'bg-blue-600 text-white font-bold' 
                              : 'text-zinc-200 hover:bg-zinc-800/90 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-blue-400 transition-colors'}>
                              {renderDeviceIcon(d.id, 'w-4 h-4')}
                            </span>
                            <span>{d.label}</span>
                          </div>
                          <Search className={`w-3.5 h-3.5 transition-opacity ${isSelected ? 'opacity-100 text-white' : 'opacity-40 group-hover:opacity-100 text-zinc-400'}`} />
                        </button>
                        {d.id === 'all' && idx === 0 && (
                          <div className="my-1 border-b border-zinc-800/80" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Country Storefront Dropdown Trigger */}
          <div className="relative" ref={countryMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsCountryMenuOpen(!isCountryMenuOpen);
                setIsDeviceMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold transition-all"
            >
              <span className="text-base leading-none">{currentCountryObj.flag}</span>
              <span>{currentCountryObj.name} ({currentCountryObj.code.toUpperCase()})</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isCountryMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Country Dropdown Menu */}
            {isCountryMenuOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    选择 App Store 分区
                  </span>
                  <span className="text-[10px] text-slate-400">共 {APP_STORE_COUNTRIES.length} 个国家/地区</span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={countryFilter}
                    onChange={e => setCountryFilter(e.target.value)}
                    placeholder="输入国家名或代码 (如 us, jp)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                  />
                  {countryFilter && (
                    <button onClick={() => setCountryFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
                  {filteredCountries.map(c => {
                    const isSelected = c.code.toLowerCase() === country.toLowerCase();
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c.code)}
                        className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                          isSelected 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold' 
                            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span>{c.name}</span>
                          {c.nativeName && c.nativeName !== c.name && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">({c.nativeName})</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase">
                          {c.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Popular Country Chips */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {popularCountries.slice(0, 5).map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelectCountry(c.code)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 transition-all flex items-center gap-1 ${
                c.code.toLowerCase() === country.toLowerCase()
                  ? 'bg-blue-500 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name.replace('中国', '')}</span>
            </button>
          ))}
        </div>
      </div>

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
            placeholder={`在 ${currentCountryObj.name}区 检索 ${currentDeviceObj.label} 应用名称或粘贴 apps.apple.com 链接...`}
            className="w-full pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-blue-500 dark:text-white transition-all shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setErrorMessage(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isLoading || !query.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>检索匹配</span>
        </button>
      </div>

      {/* Error / Empty Notification */}
      {errorMessage && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => handleSearch(query, 'all', country === 'us' ? 'cn' : 'us')}
            className="text-[11px] font-bold underline hover:no-underline ml-2 shrink-0"
          >
            尝试美区全设备检索
          </button>
        </div>
      )}

      {/* Search Results Display */}
      {results.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            <span>找到 {results.length} 款官方 App（支持直接选用 1024×1024 规范图标）：</span>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">Apple CDN 原始超清</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {results.map(app => (
              <div
                key={app.trackId}
                className="p-3 bg-slate-50 dark:bg-zinc-800/80 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/80 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700/60 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
              >
                {/* Header with Icon, Name, Artist */}
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

                {/* Bottom Actions: Apply 1024px / 512px or Fill Info */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onApplyApp(app, '1024')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
                      title="选用 1024×1024 原始母版大图标"
                    >
                      <Sparkles className="w-3 h-3" />
                      选用 1024px
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyApp(app, '512')}
                      className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 rounded-lg text-[10px] font-semibold transition-all"
                      title="选用 512×512 高清图标"
                    >
                      512px
                    </button>
                  </div>

                  {onFillInfo && (
                    <button
                      type="button"
                      onClick={() => onFillInfo(app)}
                      className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
    </div>
  );
};
