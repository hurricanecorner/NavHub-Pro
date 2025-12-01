import { AppData, LinkItem, NotionConfig, Language, Theme } from '../types';
import { DEFAULT_DATA } from '../constants';

const STORAGE_KEY = 'navhub_data_v1';
const NOTION_CONFIG_KEY = 'navhub_notion_config';
const LANG_KEY = 'navhub_lang';
const THEME_KEY = 'navhub_theme';

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_DATA;
  } catch (e) {
    console.error("Failed to load data", e);
    return DEFAULT_DATA;
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadNotionConfig = (): NotionConfig => {
  try {
    const stored = localStorage.getItem(NOTION_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { apiKey: '', databaseId: '', enabled: false };
  } catch {
    return { apiKey: '', databaseId: '', enabled: false };
  }
};

export const saveNotionConfig = (config: NotionConfig) => {
  localStorage.setItem(NOTION_CONFIG_KEY, JSON.stringify(config));
};

export const loadLanguage = (): Language => {
  const stored = localStorage.getItem(LANG_KEY);
  return (stored === 'en' || stored === 'zh') ? stored : 'zh';
};

export const saveLanguage = (lang: Language) => {
  localStorage.setItem(LANG_KEY, lang);
};

export const loadTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY);
  return (stored === 'light' || stored === 'dark' || stored === 'system') ? (stored as Theme) : 'system';
};

export const saveTheme = (theme: Theme) => {
  localStorage.setItem(THEME_KEY, theme);
};

// This function simulates the structure needed to send to Notion.
// Note: Direct Notion API calls from browser are blocked by CORS.
// In a real production app, this would hit a proxy server.
export const syncToNotion = async (data: AppData, config: NotionConfig): Promise<{ success: boolean; message: string }> => {
  if (!config.enabled || !config.apiKey || !config.databaseId) {
    return { success: false, message: 'Notion is not configured.' };
  }

  console.log("Attempting to sync to Notion Database:", config.databaseId);
  console.log("With Payload items:", data.links.length);

  try {
    // For this frontend-only demo, we simulate a delay and return success
    // to show the UI state changes, but we log the warning.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { 
      success: true, 
      message: 'Sync logic executed! (Note: Real Notion sync requires a backend proxy due to CORS)' 
    };

  } catch (error) {
    return { success: false, message: 'Network error or CORS block.' };
  }
};