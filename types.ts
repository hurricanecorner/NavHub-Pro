
export type Language = 'en' | 'zh';

export type Theme = 'light' | 'dark' | 'system';

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

export interface AppData {
  categories: Category[];
  links: LinkItem[];
}

export interface CloudConfig {
  enabled: boolean;
  activeProvider: 'github' | 'notion';
  githubToken: string;
  gistId: string;
  notionToken: string;
  notionPageId: string;
  notionApiUrl?: string; // Custom API URL (Proxy)
  lastSync?: number;
}
