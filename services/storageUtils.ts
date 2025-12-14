
import { AppData, CloudConfig, Language, Theme } from '../types';
import { DEFAULT_DATA } from '../constants';

const STORAGE_KEY = 'navhub_data_v1';
const CLOUD_CONFIG_KEY = 'navhub_cloud_config';
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

// --- GitHub Gist Sync Logic ---

const GIST_FILENAME = 'navhub-data.json';
const GITHUB_API_BASE = 'https://api.github.com';
// GitHub truncates at 1MB (bytes). 
// To be safe with UTF-8 characters (which can be 3-4 bytes), we limit chunk size to ~300k chars.
const MAX_CHUNK_SIZE = 300000; 

const uploadToGitHub = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  if (!config.githubToken) {
    return { success: false, message: 'Missing GitHub Token' };
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const files: Record<string, { content: string | null }> = {};

  // Check if chunking is needed
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
    // We attempt to delete potential old chunk files to keep Gist clean, 
    // but without fetching first we don't know if they exist. 
    // Gist ignores "filename": null if file doesn't exist, so we can try blindly deleting a few common ones if we wanted,
    // but it's safer to just leave them. The download logic prioritizes the manifest.
  }

  const payload = {
    description: "NavHub Pro Backup Data",
    public: false,
    files: files
  };

  try {
    let url = `${GITHUB_API_BASE}/gists`;
    let method = 'POST';

    // If we have an existing Gist ID, we update it (PATCH). Otherwise create new (POST).
    if (config.gistId) {
      url = `${GITHUB_API_BASE}/gists/${config.gistId}`;
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
      if (response.status === 404 && config.gistId) {
        return { success: false, message: 'Gist ID not found. Try clearing the ID to create a new one.' };
      }
      if (response.status === 401) {
        return { success: false, message: 'Invalid GitHub Token.' };
      }
      throw new Error(`GitHub API Error: ${response.statusText}`);
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
  if (!config.githubToken || !config.gistId) {
    return { success: false, message: 'Missing Token or Gist ID' };
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/gists/${config.gistId}`, {
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
    }

    // If it is a manifest, reconstruct from parts
    if (isManifest) {
       let fullStr = '';
       for (let i = 1; i <= manifest.total; i++) {
          const partKey = `navhub-data.part${i}`;
          const partFile = files[partKey];
          if (!partFile) {
             throw new Error(`Missing chunk file: ${partKey}`);
          }
          if (partFile.truncated) {
             throw new Error(`Chunk ${partKey} is too large (truncated). Upload failed.`);
          }
          fullStr += partFile.content;
       }
       finalData = JSON.parse(fullStr);
    } 
    // Fallback: If not manifest and is truncated, try raw_url (Legacy Path)
    else if (mainFile.truncated) {
       try {
          const rawResponse = await fetch(mainFile.raw_url, {
             headers: { 'Authorization': `token ${config.githubToken}` }
          });
          if (rawResponse.ok) {
             const rawText = await rawResponse.text();
             finalData = JSON.parse(rawText);
          } else {
             throw new Error("CORS/Network Error on Raw URL");
          }
       } catch (e) {
          throw new Error("Cannot download large file due to browser CORS limits. Please re-upload data from the source device to fix this.");
       }
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

// --- Notion Sync Logic ---

const DEFAULT_NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Helper to get configured API URL or default
const getNotionApiBase = (config: CloudConfig) => {
  let url = config.notionApiUrl?.trim() || DEFAULT_NOTION_API_BASE;
  // Remove trailing slash
  return url.replace(/\/+$/, '');
};

// Notion rich text limit is 2000 chars. We must chunk large JSON.
const chunkText = (text: string, size: number = 2000) => {
  const numChunks = Math.ceil(text.length / size);
  const chunks = [];
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks.push(text.substr(o, size));
  }
  return chunks;
};

const uploadToNotion = async (data: AppData, config: CloudConfig): Promise<SyncResult> => {
  if (!config.notionToken || !config.notionPageId) {
    return { success: false, message: 'Missing Notion Token or Page ID' };
  }

  const apiBase = getNotionApiBase(config);
  const jsonString = JSON.stringify(data, null, 2);
  const chunks = chunkText(jsonString);
  const richTextObjects = chunks.map(chunk => ({
    type: "text",
    text: { content: chunk }
  }));

  try {
    // 1. Get page children to find an existing Code block
    const listUrl = `${apiBase}/blocks/${config.notionPageId}/children`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.notionToken}`,
        'Notion-Version': NOTION_VERSION,
      }
    });

    if (!listRes.ok) {
      if (listRes.status === 0 || listRes.status === 401 || listRes.status === 403) {
         throw new Error(`Notion Access Error: ${listRes.statusText}. If you are in a browser, you MUST use a Proxy URL.`);
      }
      throw new Error(`Notion Access Error: ${listRes.statusText}`);
    }
    
    const listData = await listRes.json();
    const existingCodeBlock = listData.results.find((b: any) => b.type === 'code');

    if (existingCodeBlock) {
      // Update existing block
      const updateRes = await fetch(`${apiBase}/blocks/${existingCodeBlock.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${config.notionToken}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: {
            rich_text: richTextObjects,
            language: "json"
          }
        })
      });
      if (!updateRes.ok) throw new Error(`Notion Update Error: ${updateRes.statusText}`);
    } else {
      // Append new block
      const appendRes = await fetch(`${apiBase}/blocks/${config.notionPageId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${config.notionToken}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          children: [{
            object: "block",
            type: "code",
            code: {
              rich_text: richTextObjects,
              language: "json"
            }
          }]
        })
      });
      if (!appendRes.ok) throw new Error(`Notion Append Error: ${appendRes.statusText}`);
    }

    return { 
      success: true, 
      message: 'Data uploaded successfully to Notion.',
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("Notion Upload Error:", error);
    return { success: false, message: error.message || 'Notion sync failed. Check CORS/Proxy settings.' };
  }
};

const downloadFromNotion = async (config: CloudConfig): Promise<SyncResult> => {
  if (!config.notionToken || !config.notionPageId) {
    return { success: false, message: 'Missing Notion Token or Page ID' };
  }
  
  const apiBase = getNotionApiBase(config);

  try {
    const listUrl = `${apiBase}/blocks/${config.notionPageId}/children`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.notionToken}`,
        'Notion-Version': NOTION_VERSION,
      }
    });

    if (!listRes.ok) throw new Error('Failed to access Notion Page. Check CORS/Proxy settings.');
    
    const listData = await listRes.json();
    const codeBlock = listData.results.find((b: any) => b.type === 'code');

    if (!codeBlock) {
      throw new Error('No Code block found on the Notion page.');
    }

    // Join all rich text parts
    const fullJson = codeBlock.code.rich_text.map((t: any) => t.plain_text).join('');
    const parsedData = JSON.parse(fullJson);

    // Basic validation
    if (!Array.isArray(parsedData.categories) || !Array.isArray(parsedData.links)) {
      throw new Error('Invalid data format in Notion.');
    }

    return {
      success: true,
      message: 'Data downloaded successfully from Notion.',
      data: parsedData,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("Notion Download Error:", error);
    return { success: false, message: error.message || 'Notion download failed.' };
  }
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

    const fileUrl = getWebDAVUrl(config.webdavUrl);
    const authHeader = 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`);

    try {
        const response = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data, null, 2)
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
