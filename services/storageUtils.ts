

import { AppData, CloudConfig, Language, Theme, LinkItem, Category, SubCategory } from '../types';
import { DEFAULT_DATA } from '../constants';
import { recordDailyClick } from './weeklyTrendsService';

const STORAGE_KEY = 'navhub_data_v1';
const CLOUD_CONFIG_KEY = 'navhub_cloud_config';
const LANG_KEY = 'navhub_lang';
const THEME_KEY = 'navhub_theme';
const CLICK_STATS_KEY = 'navhub_click_stats_v1';

export interface ClickStatRecord {
  clickCount: number;
  lastClickedAt: number;
}

export const normalizeUrlKey = (url: string = ''): string => {
  try {
    const u = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
};

export const loadClickStats = (): Record<string, ClickStatRecord> => {
  try {
    const stored = localStorage.getItem(CLICK_STATS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveClickStats = (stats: Record<string, ClickStatRecord>) => {
  try {
    localStorage.setItem(CLICK_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Failed to save click stats", e);
  }
};

export const recordClickStat = (url: string, linkId?: string): ClickStatRecord => {
  const stats = loadClickStats();
  const key = normalizeUrlKey(url);
  const existing = (key ? stats[key] : undefined) || (linkId ? stats[linkId] : undefined) || { clickCount: 0, lastClickedAt: 0 };
  const updated: ClickStatRecord = {
    clickCount: (existing.clickCount || 0) + 1,
    lastClickedAt: Date.now()
  };
  if (key) stats[key] = updated;
  if (linkId) stats[linkId] = updated;
  saveClickStats(stats);
  try {
    recordDailyClick(url, linkId, 1);
  } catch (err) {
    console.warn("Failed to record daily trend click", err);
  }
  return updated;
};

export const mergeClickStatsIntoLinks = (links: LinkItem[]): LinkItem[] => {
  const stats = loadClickStats();
  let hasNewStats = false;
  const merged = links.map(link => {
    const key = normalizeUrlKey(link.url);
    const stat = (key ? stats[key] : undefined) || (link.id ? stats[link.id] : undefined);
    
    const linkClicks = link.clickCount || 0;
    const linkTime = link.lastClickedAt || 0;
    const storeClicks = stat?.clickCount || 0;
    const storeTime = stat?.lastClickedAt || 0;
    
    const finalClicks = Math.max(linkClicks, storeClicks);
    const finalTime = Math.max(linkTime, storeTime);
    
    if (finalClicks > storeClicks || finalTime > storeTime) {
      if (key) stats[key] = { clickCount: finalClicks, lastClickedAt: finalTime };
      if (link.id) stats[link.id] = { clickCount: finalClicks, lastClickedAt: finalTime };
      hasNewStats = true;
    }
    
    return {
      ...link,
      clickCount: finalClicks,
      lastClickedAt: finalTime
    };
  });
  
  if (hasNewStats) {
    saveClickStats(stats);
  }
  return merged;
};

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: AppData = stored ? JSON.parse(stored) : DEFAULT_DATA;
    if (parsed && Array.isArray(parsed.links)) {
      parsed.links = mergeClickStatsIntoLinks(parsed.links);
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load data", e);
    return DEFAULT_DATA;
  }
};

/**
 * 针对某一分类/子分类内的一组链接按照常用置顶优先、访问频次 (clickCount) 降序排序
 */
export const sortCategoryLinksByFrequency = (linkList: LinkItem[]): LinkItem[] => {
  return [...linkList].sort((a, b) => {
    // 1. 置顶链接永远保持在前排
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
    // 2. 非置顶链接根据 clickCount 累计点击频次降序
    const clicksA = a.clickCount || 0;
    const clicksB = b.clickCount || 0;
    if (clicksB !== clicksA) return clicksB - clicksA;
    // 3. 频次相同时按最近点击时间排序
    const timeA = a.lastClickedAt || 0;
    const timeB = b.lastClickedAt || 0;
    if (timeB !== timeA) return timeB - timeA;
    // 4. 最后按标题字母顺序排序
    return (a.title || '').localeCompare(b.title || '');
  });
};

/**
 * 遍历并重新排列所有分类和子分类下的所有链接，实现全局按频次排布
 */
export const reorderAllLinksByFrequency = (
  links: LinkItem[],
  categories: Category[]
): LinkItem[] => {
  const newLinks: LinkItem[] = [];
  const handledIds = new Set<string>();

  categories.forEach(cat => {
    const hasSubCats = (cat.subCategories || []).length > 0;
    // 分类直属常规链接
    const general = links.filter(l => l.categoryId === cat.id && (!l.subCategoryId || !hasSubCats));
    const sortedGeneral = sortCategoryLinksByFrequency(general);
    sortedGeneral.forEach(l => {
      newLinks.push(l);
      handledIds.add(l.id);
    });

    // 子分类下的链接
    (cat.subCategories || []).forEach(sub => {
      const subLinks = links.filter(l => l.categoryId === cat.id && l.subCategoryId === sub.id && !handledIds.has(l.id));
      const sortedSub = sortCategoryLinksByFrequency(subLinks);
      sortedSub.forEach(l => {
        newLinks.push(l);
        handledIds.add(l.id);
      });
    });
  });

  // 处理可能存在分类变动的孤立链接
  const remaining = links.filter(l => !handledIds.has(l.id));
  if (remaining.length > 0) {
    newLinks.push(...sortCategoryLinksByFrequency(remaining));
  }

  return newLinks;
};

/**
 * 检查并执行每日一次的自动频次重排
 */
export const checkAndApplyDailyAutoSort = (appData: AppData): { data: AppData; didSort: boolean } => {
  if (!appData.siteConfig?.autoSortByFrequency) {
    return { data: appData, didSort: false };
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (appData.siteConfig.lastAutoSortedDate === todayStr) {
    return { data: appData, didSort: false };
  }

  const reorderedLinks = reorderAllLinksByFrequency(appData.links, appData.categories);
  const updatedData: AppData = {
    ...appData,
    links: reorderedLinks,
    siteConfig: {
      ...appData.siteConfig,
      lastAutoSortedDate: todayStr
    }
  };

  saveData(updatedData);
  return { data: updatedData, didSort: true };
};

export const saveData = (data: AppData) => {
  if (data && Array.isArray(data.links)) {
    const stats = loadClickStats();
    let hasNew = false;
    data.links.forEach(l => {
      if (l.clickCount && l.clickCount > 0) {
        const key = normalizeUrlKey(l.url);
        const existing = (key ? stats[key] : undefined)?.clickCount || 0;
        if (l.clickCount >= existing) {
          const entry = { clickCount: l.clickCount, lastClickedAt: l.lastClickedAt || Date.now() };
          if (key) stats[key] = entry;
          if (l.id) stats[l.id] = entry;
          hasNew = true;
        }
      }
    });
    if (hasNew) saveClickStats(stats);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err: any) {
    console.warn("[Storage] localStorage quota warning or exceeded:", err);
    // 应对浏览器 5MB 配额上限：若因超大位图 Data URL 导致超限，进行智能瘦身压缩，保全用户全部链接、分类、配置与极简矢量字标
    try {
      const streamlinedLinks = (data.links || []).map(link => {
        // SVG 字标仅 ~1KB 无需精简，主要针对超大位图 (PNG/JPEG > 40KB) 进行瘦身
        if (link.iconUrl && link.iconUrl.startsWith('data:image/') && !link.iconUrl.includes('svg') && link.iconUrl.length > 40000) {
          // 若有外链原始地址或可推导网址，保留轻量标记
          return {
            ...link,
            iconUrl: link.iconUrl.substring(0, 30000), // 截断防溃
          };
        }
        return link;
      });

      const fallbackData: AppData = {
        ...data,
        links: streamlinedLinks,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackData));
    } catch (finalErr) {
      console.error("[Storage] Critical: Failed to save navigation data to localStorage", finalErr);
    }
  }
};

export const loadCloudConfig = (): CloudConfig => {
  try {
    const stored = localStorage.getItem(CLOUD_CONFIG_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return {
      enabled: parsed?.enabled || false,
      activeProvider: parsed?.activeProvider || 'github',
      githubToken: parsed?.githubToken || '',
      gistId: parsed?.gistId || '',
      notionToken: parsed?.notionToken || '',
      notionPageId: parsed?.notionPageId || '',
      notionApiUrl: parsed?.notionApiUrl || '',
      webdavUrl: parsed?.webdavUrl || '',
      webdavUsername: parsed?.webdavUsername || '',
      webdavPassword: parsed?.webdavPassword || '',
      lastSync: parsed?.lastSync
    };
  } catch {
    return { 
      enabled: false, 
      activeProvider: 'github', 
      githubToken: '', 
      gistId: '',
      notionToken: '',
      notionPageId: '',
      notionApiUrl: '',
      webdavUrl: '',
      webdavUsername: '',
      webdavPassword: ''
    };
  }
};

export const saveCloudConfig = (config: CloudConfig) => {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
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
  return (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'custom') ? (stored as Theme) : 'system';
};

export const saveTheme = (theme: Theme) => {
  localStorage.setItem(THEME_KEY, theme);
};

// --- Sync Logic Interface ---

interface SyncResult {
  success: boolean;
  message: string;
  data?: AppData;
  newGistId?: string;
  timestamp?: number;
}

// --- Helper: Prepare Data for Upload (Strip Background) ---
const prepareDataForUpload = (data: AppData): AppData => {
    // Create a deep copy to avoid mutating the original object in the UI
    const cleanData = JSON.parse(JSON.stringify(data));
    
    // Strip background image to reduce size dramatically
    if (cleanData.siteConfig) {
        cleanData.siteConfig.backgroundUrl = ''; 
    }
    
    return cleanData;
};

// --- GitHub Gist Sync Logic ---

const GIST_FILENAME = 'navhub-data.json';
const GITHUB_API_BASE = 'https://api.github.com';
// Safety margin. 100,000 chars is ~100KB. GitHub supports up to 1MB easily.
// Increasing this reduces the chance of chunking logic triggering unnecessarily.
const MAX_CHUNK_SIZE = 100000; 

const uploadToGitHub = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  if (!config.githubToken) {
    return { success: false, message: 'Missing GitHub Token' };
  }

  // 1. Prepare lightweight data (No Background)
  const dataToUpload = prepareDataForUpload(data);

  // Robustly determine if we are updating or creating
  const safeGistId = config.gistId?.trim() || '';
  const isUpdate = safeGistId.length > 0;

  const jsonStr = JSON.stringify(dataToUpload, null, 2);
  
  // Use 'any' type to allow assigning null directly to the file key for deletion
  // GitHub API requires key: null to delete, NOT key: {content: null}
  const files: Record<string, any> = {};

  // Construct new file content
  if (jsonStr.length > MAX_CHUNK_SIZE) {
    const totalChunks = Math.ceil(jsonStr.length / MAX_CHUNK_SIZE);
    
    // 1. Create Manifest File
    files[GIST_FILENAME] = {
      content: JSON.stringify({
        split: true,
        total: totalChunks,
        timestamp: Date.now(),
        size: jsonStr.length
      })
    };

    // 2. Create Chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = start + MAX_CHUNK_SIZE;
      const chunkContent = jsonStr.substring(start, end);
      files[`navhub-data.part${i + 1}`] = { content: chunkContent };
    }
  } else {
    // Normal Upload
    files[GIST_FILENAME] = { content: jsonStr };
  }

  // --- SMART CLEANUP (UPDATE MODE ONLY) ---
  // If updating, we MUST check what files currently exist in the Gist.
  // We should ONLY delete files (set to null) if they actually exist on GitHub.
  // Setting null for non-existent files triggers "422 Validation Failed".
  if (isUpdate) {
      try {
          const checkRes = await fetch(`${GITHUB_API_BASE}/gists/${safeGistId}`, {
              headers: {
                  'Authorization': `token ${config.githubToken}`,
                  'Accept': 'application/vnd.github.v3+json',
              }
          });
          
          if (checkRes.ok) {
              const currentGist = await checkRes.json();
              const existingFiles = Object.keys(currentGist.files || {});
              
              // Find any 'navhub-data.partX' files that are NOT in our new upload list
              // and mark them for deletion.
              existingFiles.forEach(filename => {
                  if (filename.startsWith('navhub-data.part') && !files[filename]) {
                      files[filename] = null;
                  }
              });
          }
      } catch (e) {
          console.warn("Could not fetch existing Gist for cleanup check, proceeding with overwrite only.", e);
      }
  }

  // Safety check: Ensure we are sending at least one file
  if (Object.keys(files).length === 0) {
      return { success: false, message: 'Error: No data generated to upload.' };
  }

  let payload: any = {
    description: "NavHub Pro Backup Data",
    files: files
  };

  if (!isUpdate) {
      // Only include 'public' when creating new
      payload.public = false; 
  }

  try {
    let url = `${GITHUB_API_BASE}/gists`;
    let method = 'POST';

    // Strictly use the same flag to determine method
    if (isUpdate) {
      url = `${GITHUB_API_BASE}/gists/${safeGistId}`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${config.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 404 && isUpdate) {
        return { success: false, message: 'Gist ID not found. Try clearing the ID to create a new one.' };
      }
      if (response.status === 401) {
        return { success: false, message: 'Invalid GitHub Token.' };
      }
      
      // Attempt to get more detailed error message
      let errorMsg = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody.message) errorMsg = errBody.message;
        // Check for field validation errors
        if (errBody.errors && Array.isArray(errBody.errors)) {
             errorMsg += ` (${errBody.errors[0].field}: ${errBody.errors[0].code})`;
        }
      } catch (e) {
        // ignore json parse error
      }
      
      throw new Error(`GitHub API Error (${response.status}): ${errorMsg}`);
    }

    const resJson = await response.json();
    return { 
      success: true, 
      message: 'Data uploaded successfully to GitHub.',
      newGistId: resJson.id,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("GitHub Upload Error:", error);
    return { success: false, message: error.message || 'Network error occurred.' };
  }
};

const downloadFromGitHub = async (config: CloudConfig): Promise<SyncResult> => {
  const safeGistId = config.gistId?.trim() || '';

  if (!config.githubToken || !safeGistId) {
    return { success: false, message: 'Missing Token or Gist ID' };
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/gists/${safeGistId}`, {
      headers: {
        'Authorization': `token ${config.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Gist. Check ID and Token.');
    }

    const json = await response.json();
    const files = json.files;
    const mainFile = files[GIST_FILENAME];

    if (!mainFile) {
      throw new Error('NavHub data file not found in this Gist.');
    }

    let content = mainFile.content;
    let finalData: AppData | null = null;

    // Logic to handle "Legacy Truncated" files (failed raw_url fetch) 
    // vs "New Chunked" files.
    
    // Attempt to parse main file to check if it's a manifest
    let isManifest = false;
    let manifest: any = {};
    
    if (content && !mainFile.truncated) {
       try {
         const parsed = JSON.parse(content);
         if (parsed.split === true && parsed.total > 0) {
            isManifest = true;
            manifest = parsed;
         } else {
            finalData = parsed;
         }
       } catch (e) {
         // Parse error, maybe just partial string? unlikely if not truncated
       }
    } else if (mainFile.truncated) {
        // Main file is truncated.
        // We try raw_url fetch as a last resort.
        try {
           const rawRes = await fetch(mainFile.raw_url, { headers: { 'Authorization': `token ${config.githubToken}` } });
           if (rawRes.ok) {
              const rawText = await rawRes.text();
              const parsed = JSON.parse(rawText);
              if (parsed.split === true && parsed.total > 0) {
                  isManifest = true;
                  manifest = parsed;
              } else {
                  finalData = parsed;
              }
           } else {
              throw new Error("CORS blocked raw fetch.");
           }
        } catch (e) {
           throw new Error("The main data file is too large (truncated). Please create a NEW Gist on Client A to fix this.");
        }
    }

    // If it is a manifest, reconstruct from parts
    if (isManifest) {
       let fullStr = '';
       for (let i = 1; i <= manifest.total; i++) {
          const partKey = `navhub-data.part${i}`;
          const partFile = files[partKey];
          if (!partFile) {
             throw new Error(`Missing chunk file: ${partKey}. The Gist might be corrupted.`);
          }
          
          let partContent = partFile.content;

          if (partFile.truncated) {
             // If a PART is truncated, it means Client A uploaded a chunk > 1MB.
             // This happens if Client A was running old code or cached logic.
             throw new Error(`Chunk ${partKey} is too large. Please Clear Gist ID and Re-Upload from Client A.`);
          }
          
          fullStr += partContent;
       }
       finalData = JSON.parse(fullStr);
    } 

    if (!finalData) {
       throw new Error("Failed to process Gist data.");
    }
    
    // Basic validation
    if (!Array.isArray(finalData.categories) || !Array.isArray(finalData.links)) {
      throw new Error('Invalid data format in Gist.');
    }

    return { 
      success: true, 
      message: 'Data downloaded successfully from GitHub.',
      data: finalData,
      timestamp: Date.parse(json.updated_at)
    };

  } catch (error: any) {
    console.error("GitHub Download Error:", error);
    return { success: false, message: error.message || 'Download failed.' };
  }
};

// --- Notion Database Table Sync Logic ---

const DEFAULT_NOTION_API_BASE = '/api/notion';
const NOTION_VERSION = '2022-06-28';

// Helper to get configured API URL or default
const getNotionApiBase = (config: CloudConfig) => {
  let url = config.notionApiUrl?.trim();
  if (!url || url.includes('cors-proxy.org') || url.includes('corsproxy.io')) {
    return '/api/notion';
  }
  return url.replace(/\/+$/, '');
};

// Helper to extract detailed error from Notion response
const parseNotionError = async (res: Response, fallbackPrefix: string) => {
  try {
    const errData = await res.json();
    if (errData?.message) {
      return `${fallbackPrefix}: ${errData.message}`;
    }
  } catch (_) {}
  return `${fallbackPrefix} (HTTP ${res.status}: ${res.statusText || 'Error'})`;
};

// Helper to sanitize URL for Notion URL property
const sanitizeNotionUrl = (url?: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
    return 'https://' + trimmed;
  }
  return null;
};

// Helper to clean Notion tag/select strings (Notion does not allow commas)
const cleanNotionSelectName = (name: string): string => {
  return name.replace(/,/g, '').trim().slice(0, 100);
};

// Resolve or create a Notion Database from a Page ID or Database ID
interface ResolvedDatabase {
  databaseId: string;
  titlePropName: string;
  isExisting: boolean;
}

const resolveNotionDatabase = async (
  apiBase: string,
  token: string,
  rawId: string
): Promise<ResolvedDatabase> => {
  const cleanId = rawId.trim().replace(/-/g, '');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };

  // 1. Try to check if rawId is directly a Database ID
  try {
    const dbRes = await fetch(`${apiBase}/databases/${cleanId}`, {
      method: 'GET',
      headers
    });
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData && dbData.object === 'database') {
        const titleProp = Object.keys(dbData.properties || {}).find(
          k => dbData.properties[k].type === 'title'
        ) || '标题';
        
        // Ensure standard columns exist on this database
        await ensureDatabaseColumns(apiBase, token, cleanId, dbData.properties || {});
        
        return {
          databaseId: cleanId,
          titlePropName: titleProp,
          isExisting: true
        };
      }
    }
  } catch (_) {}

  // 2. If not a database, check if it's a Page and find any existing child database
  const pageRes = await fetch(`${apiBase}/blocks/${cleanId}/children?page_size=100`, {
    method: 'GET',
    headers
  });

  if (!pageRes.ok) {
    const errorMsg = await parseNotionError(pageRes, '无法访问 Notion 页面/数据库 (请确认已在页面右上角添加集成连接)');
    throw new Error(errorMsg);
  }

  const pageData = await pageRes.json();
  const existingChildDb = pageData.results?.find((b: any) => b.type === 'child_database');

  if (existingChildDb) {
    const childDbId = existingChildDb.id.replace(/-/g, '');
    const childDbRes = await fetch(`${apiBase}/databases/${childDbId}`, {
      method: 'GET',
      headers
    });
    let titleProp = '标题';
    if (childDbRes.ok) {
      const childDbData = await childDbRes.json();
      titleProp = Object.keys(childDbData.properties || {}).find(
        k => childDbData.properties[k].type === 'title'
      ) || '标题';
      await ensureDatabaseColumns(apiBase, token, childDbId, childDbData.properties || {});
    }
    return {
      databaseId: childDbId,
      titlePropName: titleProp,
      isExisting: true
    };
  }

  // 3. If no child database exists on the page, create a new Database under this page
  const createDbRes = await fetch(`${apiBase}/databases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: {
        type: 'page_id',
        page_id: cleanId
      },
      icon: {
        type: 'emoji',
        emoji: '🔖'
      },
      title: [
        {
          type: 'text',
          text: { content: 'NavHub 导航书签库' }
        }
      ],
      properties: {
        '标题': { title: {} },
        '链接地址': { url: {} },
        '主分类': { select: {} },
        '子分类': { select: {} },
        '图标': { rich_text: {} },
        '标签': { multi_select: {} },
        '描述': { rich_text: {} },
        '书签ID': { rich_text: {} },
        '点击次数': { number: {} },
        '最后访问': { number: {} }
      }
    })
  });

  if (!createDbRes.ok) {
    const createErr = await parseNotionError(createDbRes, '在 Notion 页面中创建数据库表格失败');
    throw new Error(createErr);
  }

  const newDbData = await createDbRes.json();
  return {
    databaseId: newDbData.id.replace(/-/g, ''),
    titlePropName: '标题',
    isExisting: false
  };
};

// Helper to add missing columns to an existing Notion database
const ensureDatabaseColumns = async (
  apiBase: string,
  token: string,
  databaseId: string,
  currentProperties: Record<string, any>
) => {
  const missingProps: Record<string, any> = {};
  if (!currentProperties['链接地址'] && !currentProperties['URL'] && !currentProperties['url']) {
    missingProps['链接地址'] = { url: {} };
  }
  if (!currentProperties['主分类'] && !currentProperties['Category']) {
    missingProps['主分类'] = { select: {} };
  }
  if (!currentProperties['子分类'] && !currentProperties['Subcategory']) {
    missingProps['子分类'] = { select: {} };
  }
  if (!currentProperties['图标'] && !currentProperties['Icon']) {
    missingProps['图标'] = { rich_text: {} };
  }
  if (!currentProperties['标签'] && !currentProperties['Tags']) {
    missingProps['标签'] = { multi_select: {} };
  }
  if (!currentProperties['描述'] && !currentProperties['Description']) {
    missingProps['描述'] = { rich_text: {} };
  }
  if (!currentProperties['书签ID'] && !currentProperties['ID']) {
    missingProps['书签ID'] = { rich_text: {} };
  }
  if (!currentProperties['点击次数'] && !currentProperties['Clicks'] && !currentProperties['clickCount']) {
    missingProps['点击次数'] = { number: {} };
  }
  if (!currentProperties['最后访问'] && !currentProperties['LastClicked'] && !currentProperties['lastClickedAt']) {
    missingProps['最后访问'] = { number: {} };
  }

  if (Object.keys(missingProps).length > 0) {
    try {
      await fetch(`${apiBase}/databases/${databaseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties: missingProps })
      });
    } catch (_) {}
  }
};

// Query all pages from a Notion database (handles pagination)
const queryAllNotionDatabasePages = async (
  apiBase: string,
  token: string,
  databaseId: string
): Promise<any[]> => {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };

  let allPages: any[] = [];
  let startCursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, any> = { page_size: 100 };
    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const res = await fetch(`${apiBase}/databases/${databaseId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await parseNotionError(res, '查询 Notion 数据库表格数据失败');
      throw new Error(err);
    }

    const data = await res.json();
    if (Array.isArray(data.results)) {
      allPages = allPages.concat(data.results);
    }
    hasMore = data.has_more === true;
    startCursor = data.next_cursor || undefined;
  }

  return allPages;
};

// Upload all navigation links into Notion Database Table
const uploadToNotion = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  if (!config.notionToken || !config.notionPageId) {
    return { success: false, message: '请填写 Notion 集成令牌 (Token) 和 页面/数据库 ID (Page ID)' };
  }

  const apiBase = getNotionApiBase(config);
  const token = config.notionToken.trim();

  try {
    // 1. Resolve or create target database
    const { databaseId, titlePropName } = await resolveNotionDatabase(apiBase, token, config.notionPageId);

    // 2. Query all existing rows in database
    const existingRows = await queryAllNotionDatabasePages(apiBase, token, databaseId);

    // Build lookup maps for fast matching
    const rowByBookmarkId = new Map<string, any>();
    const rowByUrl = new Map<string, any>();
    const rowByTitle = new Map<string, any>();

    for (const row of existingRows) {
      if (row.archived) continue;
      const props = row.properties || {};
      
      // Bookmark ID
      const bookmarkId = props['书签ID']?.rich_text?.[0]?.plain_text || props['ID']?.rich_text?.[0]?.plain_text;
      if (bookmarkId) rowByBookmarkId.set(bookmarkId, row);

      // URL
      const url = props['链接地址']?.url || props['URL']?.url || props['url']?.url;
      if (url) rowByUrl.set(url.toLowerCase().trim(), row);

      // Title
      const title = props[titlePropName]?.title?.[0]?.plain_text || props['Name']?.title?.[0]?.plain_text;
      if (title) rowByTitle.set(title.toLowerCase().trim(), row);
    }

    // 3. Build category lookup maps
    const categoryMap = new Map<string, Category>();
    data.categories.forEach(c => categoryMap.set(c.id, c));

    // 4. Upsert all links into database
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    };

    const syncedPageIds = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;

    // Process in batches of 4 to prevent Notion rate limits
    const batchSize = 4;
    for (let i = 0; i < data.links.length; i += batchSize) {
      const batch = data.links.slice(i, i + batchSize);
      await Promise.all(batch.map(async (link) => {
        const cat = categoryMap.get(link.categoryId);
        const categoryName = cat?.name || '默认分类';
        const subCat = cat?.subCategories?.find((s: SubCategory) => s.id === link.subCategoryId);
        const subCategoryName = subCat?.name || '';

        // Build properties
        const properties: Record<string, any> = {
          [titlePropName]: {
            title: [{ type: 'text', text: { content: (link.title || '未命名').slice(0, 2000) } }]
          },
          '链接地址': {
            url: sanitizeNotionUrl(link.url)
          },
          '主分类': {
            select: { name: cleanNotionSelectName(categoryName) || '默认分类' }
          },
          '描述': {
            rich_text: link.description ? [{ type: 'text', text: { content: link.description.slice(0, 2000) } }] : []
          },
          '标签': {
            multi_select: (link.tags || [])
              .map(t => cleanNotionSelectName(t))
              .filter(Boolean)
              .map(name => ({ name }))
          },
          '图标': {
            rich_text: link.iconUrl ? [{ type: 'text', text: { content: link.iconUrl.slice(0, 2000) } }] : []
          },
          '书签ID': {
            rich_text: [{ type: 'text', text: { content: link.id } }]
          },
          '点击次数': {
            number: link.clickCount || 0
          },
          '最后访问': {
            number: link.lastClickedAt || 0
          }
        };

        if (subCategoryName) {
          properties['子分类'] = {
            select: { name: cleanNotionSelectName(subCategoryName) }
          };
        } else {
          properties['子分类'] = { select: null };
        }

        // Match existing row
        let matchRow = rowByBookmarkId.get(link.id);
        if (!matchRow && link.url) {
          matchRow = rowByUrl.get(link.url.toLowerCase().trim());
        }
        if (!matchRow && link.title) {
          matchRow = rowByTitle.get(link.title.toLowerCase().trim());
        }

        if (matchRow) {
          // Update existing page
          syncedPageIds.add(matchRow.id);
          const updateRes = await fetch(`${apiBase}/pages/${matchRow.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties })
          });
          if (updateRes.ok) updatedCount++;
        } else {
          // Create new page in database
          const createRes = await fetch(`${apiBase}/pages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              parent: { database_id: databaseId },
              properties
            })
          });
          if (createRes.ok) {
            const newRow = await createRes.json();
            syncedPageIds.add(newRow.id);
            createdCount++;
          }
        }
      }));
    }

    return {
      success: true,
      message: `已成功同步至 Notion 数据库表格！(新增 ${createdCount} 条，更新 ${updatedCount} 条，共 ${data.links.length} 个书签)`,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("Notion Database Sync Error:", error);
    return { success: false, message: error.message || 'Notion 数据库同步失败，请检查配置。' };
  }
};

// Download and restore all links from Notion Database Table
const downloadFromNotion = async (config: CloudConfig): Promise<SyncResult> => {
  if (!config.notionToken || !config.notionPageId) {
    return { success: false, message: '请填写 Notion 集成令牌 (Token) 和 页面/数据库 ID (Page ID)' };
  }
  
  const apiBase = getNotionApiBase(config);
  const token = config.notionToken.trim();

  try {
    const { databaseId, titlePropName } = await resolveNotionDatabase(apiBase, token, config.notionPageId);
    const pages = await queryAllNotionDatabasePages(apiBase, token, databaseId);

    if (!pages || pages.length === 0) {
      throw new Error('Notion 数据库表格中暂无书签数据。');
    }

    const categoriesMap = new Map<string, Category>();
    const links: LinkItem[] = [];

    for (const page of pages) {
      if (page.archived) continue;
      const props = page.properties || {};

      // Extract fields
      const title = props[titlePropName]?.title?.[0]?.plain_text || 
                    props['Name']?.title?.[0]?.plain_text || 
                    props['标题']?.title?.[0]?.plain_text || 
                    '未命名';
                    
      const url = props['链接地址']?.url || 
                  props['URL']?.url || 
                  props['url']?.url || 
                  props['网址']?.url || 
                  '';
                  
      const categoryName = props['主分类']?.select?.name || 
                           props['Category']?.select?.name || 
                           props['分类']?.select?.name || 
                           '默认分类';
                           
      const subCategoryName = props['子分类']?.select?.name || 
                              props['Subcategory']?.select?.name || 
                              '';
                              
      const description = props['描述']?.rich_text?.[0]?.plain_text || 
                          props['Description']?.rich_text?.[0]?.plain_text || 
                          '';
                          
      const iconUrl = props['图标']?.rich_text?.[0]?.plain_text || 
                      props['Icon']?.rich_text?.[0]?.plain_text || 
                      props['Icon']?.url || 
                      '';
                      
      const tags = (props['标签']?.multi_select || props['Tags']?.multi_select || [])
        .map((t: any) => t.name)
        .filter(Boolean);

      const bookmarkId = props['书签ID']?.rich_text?.[0]?.plain_text || 
                         props['ID']?.rich_text?.[0]?.plain_text || 
                         `link_${page.id.replace(/-/g, '').slice(0, 8)}`;

      const clickCount = typeof props['点击次数']?.number === 'number' 
        ? props['点击次数'].number 
        : (typeof props['Clicks']?.number === 'number' ? props['Clicks'].number : undefined);
        
      const lastClickedAt = typeof props['最后访问']?.number === 'number' 
        ? props['最后访问'].number 
        : (typeof props['LastClicked']?.number === 'number' ? props['LastClicked'].number : undefined);

      // Category management
      let category = Array.from(categoriesMap.values()).find(c => c.name === categoryName);
      if (!category) {
        const catId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        category = {
          id: catId,
          name: categoryName,
          subCategories: []
        };
        categoriesMap.set(catId, category);
      }

      // Subcategory management
      let subCategoryId = '';
      if (subCategoryName) {
        let sub = category.subCategories.find((s: SubCategory) => s.name === subCategoryName);
        if (!sub) {
          sub = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: subCategoryName
          };
          category.subCategories.push(sub);
        }
        subCategoryId = sub.id;
      }

      links.push({
        id: bookmarkId,
        title,
        url: url || 'https://example.com',
        description,
        iconUrl: iconUrl || undefined,
        categoryId: category.id,
        subCategoryId,
        tags,
        clickCount,
        lastClickedAt
      });
    }

    const mergedLinks = mergeClickStatsIntoLinks(links);

    const parsedData: AppData = {
      categories: Array.from(categoriesMap.values()),
      links: mergedLinks
    };

    return {
      success: true,
      message: `已成功从 Notion 数据库恢复 ${links.length} 个书签和 ${parsedData.categories.length} 个分类！`,
      data: parsedData,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("Notion Database Download Error:", error);
    return { success: false, message: error.message || '从 Notion 数据库下载失败。' };
  }
};

// Publish directly to Notion Database
export const publishToNotion = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  return uploadToNotion(data, config);
};


// --- WebDAV Sync Logic (Nutstore / Jianguoyun) ---
const WEBDAV_FILENAME = 'navhub-data.json';

const getWebDAVUrl = (baseUrl: string) => {
    let url = baseUrl.trim();
    // Remove trailing slash
    url = url.replace(/\/+$/, '');
    return `${url}/${WEBDAV_FILENAME}`;
};

const uploadToWebDAV = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
        return { success: false, message: 'Missing WebDAV credentials.' };
    }

    // 1. Prepare lightweight data
    const dataToUpload = prepareDataForUpload(data);

    const fileUrl = getWebDAVUrl(config.webdavUrl);
    const authHeader = 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`);

    try {
        const response = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToUpload, null, 2)
        });

        if (!response.ok) {
            if (response.status === 0) {
                 throw new Error("Connection failed. Likely a CORS issue. Please use a proxy.");
            }
            throw new Error(`WebDAV Error: ${response.status} ${response.statusText}`);
        }

        return {
            success: true,
            message: 'Data uploaded successfully to WebDAV.',
            timestamp: Date.now()
        };

    } catch (error: any) {
        console.error("WebDAV Upload Error:", error);
        return { success: false, message: error.message || 'WebDAV sync failed.' };
    }
};

const downloadFromWebDAV = async (config: CloudConfig): Promise<SyncResult> => {
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
        return { success: false, message: 'Missing WebDAV credentials.' };
    }

    const fileUrl = getWebDAVUrl(config.webdavUrl);
    const authHeader = 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`);

    try {
        const response = await fetch(fileUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });

        if (!response.ok) {
            if (response.status === 0) {
                 throw new Error("Connection failed. Likely a CORS issue. Please use a proxy.");
            }
            throw new Error(`WebDAV Error: ${response.status} ${response.statusText}`);
        }

        const parsedData = await response.json();

        // Basic validation
        if (!Array.isArray(parsedData.categories) || !Array.isArray(parsedData.links)) {
            throw new Error('Invalid data format in WebDAV file.');
        }

        return {
            success: true,
            message: 'Data downloaded successfully from WebDAV.',
            data: parsedData,
            timestamp: Date.now()
        };

    } catch (error: any) {
        console.error("WebDAV Download Error:", error);
        return { success: false, message: error.message || 'WebDAV download failed.' };
    }
};


// --- Main Exported Functions ---

export const uploadToCloud = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  // Defensive: explicitly check strings to avoid unexpected fallthrough
  if (config.activeProvider === 'notion') {
    return uploadToNotion(data, config);
  }
  if (config.activeProvider === 'webdav') {
    return uploadToWebDAV(data, config);
  }
  // Default to GitHub for 'github' or invalid/empty types
  return uploadToGitHub(data, config);
};

export const downloadFromCloud = async (config: CloudConfig): Promise<SyncResult> => {
  if (config.activeProvider === 'notion') {
    return downloadFromNotion(config);
  }
  if (config.activeProvider === 'webdav') {
    return downloadFromWebDAV(config);
  }
  return downloadFromGitHub(config);
};
