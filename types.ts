
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

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  iconUrl?: string; // URL or Base64
  categoryId: string;
  subCategoryId: string;
  tags?: string[];
}

export interface SiteConfig {
  title: string;
  logoUrl: string;
  faviconUrl: string;
  backgroundUrl?: string;
}

export interface AppData {
  categories: Category[];
  links: LinkItem[];
  siteConfig?: SiteConfig;
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
