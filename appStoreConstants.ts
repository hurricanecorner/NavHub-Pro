export type AppStoreDeviceId = 'iphone' | 'ipad' | 'mac' | 'vision' | 'watch' | 'all';

export interface AppStoreDeviceOption {
  id: AppStoreDeviceId;
  label: string;
  zoneName: string;
  iconName: 'Smartphone' | 'Tablet' | 'Laptop' | 'Glasses' | 'Watch' | 'Globe';
  description: string;
  entity: string;
}

export const APP_STORE_DEVICES: AppStoreDeviceOption[] = [
  { id: 'all', label: '全部设备', zoneName: 'App Store 全生态专区', iconName: 'Globe', description: '全生态 Apple 设备智能聚合检索', entity: 'all' },
  { id: 'iphone', label: 'iPhone', zoneName: 'App Store iPhone 专区', iconName: 'Smartphone', description: '适用于 iPhone 设备的官方应用与图标', entity: 'software' },
  { id: 'ipad', label: 'iPad', zoneName: 'App Store iPad 专区', iconName: 'Tablet', description: '适用于 iPad 大屏与平板生态优化应用', entity: 'iPadSoftware' },
  { id: 'mac', label: 'Mac', zoneName: 'App Store Mac 专区', iconName: 'Laptop', description: '适用于 macOS 桌面系统的 Mac App Store 软件', entity: 'macSoftware' },
  { id: 'vision', label: 'Vision', zoneName: 'App Store Vision 专区', iconName: 'Glasses', description: '适用于 Apple Vision Pro 空间计算与 visionOS 应用', entity: 'software' },
  { id: 'watch', label: 'Watch', zoneName: 'App Store Watch 专区', iconName: 'Watch', description: '适用于 Apple Watch / watchOS 智能手表表盘与应用', entity: 'software' },
];

export interface AppStoreCountryOption {
  code: string;
  name: string;
  nativeName?: string;
  flag: string;
  region: string;
  isPopular?: boolean;
}

export const APP_STORE_COUNTRIES: AppStoreCountryOption[] = [
  { code: 'cn', name: '中国大陆', flag: '🇨🇳', region: '亚洲', isPopular: true },
  { code: 'us', name: '美国', nativeName: 'United States', flag: '🇺🇸', region: '美洲', isPopular: true },
  { code: 'hk', name: '中国香港', flag: '🇭🇰', region: '亚洲', isPopular: true },
  { code: 'tw', name: '中国台湾', flag: '🇹🇼', region: '亚洲', isPopular: true },
  { code: 'jp', name: '日本', nativeName: '日本', flag: '🇯🇵', region: '亚洲', isPopular: true },
  { code: 'kr', name: '韩国', nativeName: '대한민국', flag: '🇰🇷', region: '亚洲', isPopular: true },
  { code: 'gb', name: '英国', nativeName: 'United Kingdom', flag: '🇬🇧', region: '欧洲', isPopular: true },
  { code: 'de', name: '德国', nativeName: 'Deutschland', flag: '🇩🇪', region: '欧洲', isPopular: true },
  { code: 'fr', name: '法国', nativeName: 'France', flag: '🇫🇷', region: '欧洲', isPopular: true },
  { code: 'ca', name: '加拿大', nativeName: 'Canada', flag: '🇨🇦', region: '美洲', isPopular: true },
  { code: 'au', name: '澳大利亚', nativeName: 'Australia', flag: '🇦🇺', region: '大洋洲', isPopular: true },
  { code: 'sg', name: '新加坡', flag: '🇸🇬', region: '亚洲', isPopular: true },
  { code: 'mo', name: '中国澳门', flag: '🇲🇴', region: '亚洲' },
  { code: 'in', name: '印度', nativeName: 'India', flag: '🇮🇳', region: '亚洲' },
  { code: 'ru', name: '俄罗斯', nativeName: 'Россия', flag: '🇷🇺', region: '欧洲' },
  { code: 'br', name: '巴西', nativeName: 'Brasil', flag: '🇧🇷', region: '美洲' },
  { code: 'it', name: '意大利', nativeName: 'Italia', flag: '🇮🇹', region: '欧洲' },
  { code: 'es', name: '西班牙', nativeName: 'España', flag: '🇪🇸', region: '欧洲' },
  { code: 'nl', name: '荷兰', nativeName: 'Nederland', flag: '🇳🇱', region: '欧洲' },
  { code: 'se', name: '瑞典', nativeName: 'Sverige', flag: '🇸🇪', region: '欧洲' },
  { code: 'ch', name: '瑞士', nativeName: 'Schweiz', flag: '🇨🇭', region: '欧洲' },
  { code: 'ae', name: '阿联酋', nativeName: 'الإمارات', flag: '🇦🇪', region: '中东' },
  { code: 'my', name: '马来西亚', flag: '🇲🇾', region: '亚洲' },
  { code: 'th', name: '泰国', nativeName: 'ไทย', flag: '🇹🇭', region: '亚洲' },
  { code: 'vn', name: '越南', nativeName: 'Việt Nam', flag: '🇻🇳', region: '亚洲' },
  { code: 'ph', name: '菲律宾', flag: '🇵🇭', region: '亚洲' },
  { code: 'id', name: '印度尼西亚', flag: '🇮🇩', region: '亚洲' },
  { code: 'tr', name: '土耳其', nativeName: 'Türkiye', flag: '🇹🇷', region: '欧洲' },
  { code: 'sa', name: '沙特阿拉伯', nativeName: 'السعودية', flag: '🇸🇦', region: '中东' },
  { code: 'mx', name: '墨西哥', nativeName: 'México', flag: '🇲🇽', region: '美洲' },
  { code: 'no', name: '挪威', nativeName: 'Norge', flag: '🇳🇴', region: '欧洲' },
  { code: 'dk', name: '丹麦', nativeName: 'Danmark', flag: '🇩🇰', region: '欧洲' },
  { code: 'fi', name: '芬兰', nativeName: 'Suomi', flag: '🇫🇮', region: '欧洲' },
  { code: 'nz', name: '新西兰', nativeName: 'New Zealand', flag: '🇳🇿', region: '大洋洲' },
];

export interface AppStoreAppResult {
  trackId: number | string;
  trackName: string;
  cleanName: string;
  artistName?: string;
  icon1024: string;
  icon512: string;
  iconRaw?: string;
  devices: string[];
  primaryDevice?: string;
  genres?: string[];
  description?: string;
  appStoreUrl?: string;
  country?: string;
  formattedPrice?: string;
  version?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  fileSizeBytes?: string;
  sellerName?: string;
  primaryGenreName?: string;
}

export function detectAppStoreDevices(r: any, targetDevice?: string): string[] {
  const devices: string[] = [];
  const supported = (r.supportedDevices || []).map((s: string) => String(s).toLowerCase());
  const isMacKind = r.kind === 'mac-software';
  const hasMacDevice = isMacKind || supported.some((s: string) => s.includes('mac'));
  
  if (hasMacDevice || targetDevice === 'mac') {
    devices.push('Mac');
  }
  if (!isMacKind && (supported.some((s: string) => s.includes('iphone')) || r.kind === 'software' || targetDevice === 'iphone')) {
    devices.push('iPhone');
  }
  if (supported.some((s: string) => s.includes('ipad')) || (r.ipadScreenshotUrls && r.ipadScreenshotUrls.length > 0) || targetDevice === 'ipad') {
    devices.push('iPad');
  }
  if (supported.some((s: string) => s.includes('watch')) || targetDevice === 'watch') {
    devices.push('Watch');
  }
  const desc = (r.description || '').toLowerCase();
  const title = (r.trackName || '').toLowerCase();
  if (
    supported.some((s: string) => s.includes('vision')) || 
    desc.includes('visionos') || 
    desc.includes('apple vision') || 
    desc.includes('spatial experience') || 
    desc.includes('vision pro') ||
    title.includes('vision pro') ||
    targetDevice === 'vision'
  ) {
    devices.push('Vision');
  }
  return Array.from(new Set(devices));
}

export function parseAppStoreUrl(url: string): { id?: string; country?: string; slug?: string } {
  if (!url) return {};
  const countryMatch = url.match(/(?:apps|itunes)\.apple\.com\/([a-z]{2})\//i) || url.match(/[?&]country=([a-z]{2})/i);
  const idMatch = url.match(/\/id(\d+)/i) || url.match(/[?&]id=(\d+)/i) || url.match(/\bid(\d{7,12})\b/i);
  const slugMatch = url.match(/\/app\/([^/]+)\/id/i);
  let slug = '';
  if (slugMatch && slugMatch[1]) {
    try {
      slug = decodeURIComponent(slugMatch[1]).replace(/[-_]/g, ' ').trim();
    } catch {
      slug = slugMatch[1].replace(/[-_]/g, ' ').trim();
    }
  }
  return {
    id: idMatch ? idMatch[1] : undefined,
    country: countryMatch ? countryMatch[1].toLowerCase() : undefined,
    slug: slug || undefined,
  };
}
