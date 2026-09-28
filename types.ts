
export type Language = 'en' | 'zh';

export type Theme = 'light' | 'dark' | 'system' | 'custom';

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // URL or Base64 image
  subCategories: SubCategory[];
}

export interface LinkHealth {
  online: boolean;
  status?: number | null;
  responseTimeMs?: number;
  checkedAt: number;
  isChecking?: boolean;
  error?: string;
  isTrusted?: boolean;
  isClientVerified?: boolean;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  iconUrl?: string; // URL or Base64
  iconBgColor?: string; // 自定义图标底色
  categoryId: string;
  subCategoryId: string;
  tags?: string[];
  clickCount?: number; // 打开点击统计
  lastClickedAt?: number; // 最近一次打开时间戳
  isPinned?: boolean; // 是否置顶/固定到常用前排
  pinnedAt?: number; // 置顶时间戳
  isTrusted?: boolean; // 信任此链接，跳过存活检测 / 避免误报
  smartStats?: string; // 用户可自定义/覆盖展开卡片时的智能统计描述 (留空则使用智能自动识别)
}

export type LogoShape = 'circle' | 'rounded' | 'square';

export type HealthCheckCycle = '12h' | '24h' | '3d' | '7d' | 'manual';

export interface SiteConfig {
  title: string;
  logoUrl: string;
  faviconUrl: string;
  backgroundUrl?: string;
  linkColumns?: number; // 桌面端显示的栏数
  themeColor?: string; // 主题色方案名称
  logoShape?: LogoShape;
  logoBackgroundColor?: string;
  healthCheckCycle?: HealthCheckCycle; // 链接存活检测周期 (默认24h/每天一次)
  autoSortByFrequency?: boolean; // 全局按频次自动重排（每天一次，置顶保持在前）
  lastAutoSortedDate?: string; // 记录最近一次自动排序的日期 (YYYY-MM-DD)
}

export interface AppData {
  categories: Category[];
  links: LinkItem[];
  siteConfig?: SiteConfig;
  tagOrder?: string[];
}

export interface CloudConfig {
  enabled: boolean;
  activeProvider: 'github' | 'notion' | 'webdav';
  githubToken: string;
  gistId: string;
  notionToken: string;
  notionPageId: string;
  notionApiUrl?: string; // Custom API URL (Proxy)
  // WebDAV Config
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  lastSync?: number;
}