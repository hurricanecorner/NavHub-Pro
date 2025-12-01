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
}

export interface AppData {
  categories: Category[];
  links: LinkItem[];
}

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  enabled: boolean;
}