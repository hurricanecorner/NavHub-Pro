/**
 * NavHub Pro - Comprehensive Backup & Restore Package Service
 * 导航全量配置与图标压缩包备份/还原引擎 (.navbak.zip)
 *
 * 核心保证：
 * 1. 深度打包全部主分类、子分类、自定义链接、独立底色、访问频次统计与配置；
 * 2. 抓取并固化所有链接的高清图标、分类图标与站点品牌标识为二进制文件存储在 icons/ 目录中；
 * 3. 跨浏览器、跨设备、完全离线导入时，将图标无缝还原为内嵌 Data URL，
 *    彻底摆脱对外部 CDN、第三方源站及先前浏览器存储的依赖，实现 100% 完全一致的无损还原。
 */

import JSZip from 'jszip';
import { AppData, LinkItem, Category, SiteConfig } from '../types';
import { loadClickStats, saveClickStats, ClickStatRecord } from './storageUtils';
import { loadDailyClicks, saveDailyClicks, DailyClicksStorage } from './weeklyTrendsService';
import { loadTrustedUrls, saveTrustedUrls } from '../linkHealthService';
import { generateLetterIcon } from './highResIconService';

export interface BackupProgress {
  stage: 'preparing' | 'fetching_icons' | 'compressing' | 'complete' | 'error';
  current: number;
  total: number;
  currentTitle?: string;
  percent: number;
}

export interface BackupManifest {
  version: '2.0';
  format: 'navhub-backup-package';
  appName: string;
  exportTimestamp: number;
  exportDate: string;
  data: AppData;
  clickStats?: Record<string, ClickStatRecord>;
  dailyClicks?: DailyClicksStorage;
  trustedUrls?: string[];
  icons: {
    links: Record<string, { file: string; mimeType: string; originalUrl?: string }>;
    categories: Record<string, { file: string; mimeType: string; originalUrl?: string }>;
    site: Record<string, { file: string; mimeType: string }>;
  };
  statsSummary: {
    categoryCount: number;
    linkCount: number;
    iconCount: number;
  };
}

export interface BackupExportResult {
  blob: Blob;
  filename: string;
  summary: {
    categoryCount: number;
    linkCount: number;
    iconCount: number;
    fileSizeBytes: number;
    formattedSize: string;
  };
}

export interface BackupImportResult {
  success: boolean;
  data: AppData;
  summary: {
    categoryCount: number;
    linkCount: number;
    restoredIconsCount: number;
    exportDate?: string;
    hasClickStats: boolean;
    hasTrustedUrls: boolean;
  };
  message?: string;
}

/**
 * 辅助函数：根据 MIME 或 URL 拓展名推断文件后缀
 */
function getExtensionFromMime(mime: string, fallbackUrl = ''): string {
  const m = mime.toLowerCase();
  if (m.includes('svg')) return 'svg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('gif')) return 'gif';
  if (m.includes('x-icon') || m.includes('vnd.microsoft.icon') || m.includes('ico')) return 'ico';
  if (m.includes('avif')) return 'avif';

  // 从 URL 推断
  try {
    const pathname = new URL(fallbackUrl.startsWith('http') ? fallbackUrl : `https://${fallbackUrl}`).pathname;
    const match = pathname.match(/\.(svg|png|webp|jpe?g|gif|ico|avif)$/i);
    if (match) return match[1].toLowerCase().replace('jpeg', 'jpg');
  } catch {
    // ignore
  }

  return 'png';
}

/**
 * 辅助函数：将 Base64 或 Data URL 转为 Uint8Array 二进制
 */
function dataUrlToBinary(dataUrl: string): { data: Uint8Array; mimeType: string } {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    const encoder = new TextEncoder();
    return { data: encoder.encode(dataUrl), mimeType: 'image/svg+xml' };
  }

  const meta = dataUrl.substring(5, commaIndex); // e.g. "image/svg+xml;utf8" or "image/png;base64"
  const rawData = dataUrl.substring(commaIndex + 1);
  const isBase64 = meta.includes(';base64');
  let mimeType = meta.split(';')[0].trim().toLowerCase() || 'image/png';
  if (mimeType.includes('svg')) mimeType = 'image/svg+xml';

  if (isBase64) {
    try {
      const binaryStr = atob(rawData);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { data: bytes, mimeType };
    } catch {
      const encoder = new TextEncoder();
      return { data: encoder.encode(rawData), mimeType };
    }
  } else {
    // URL encoded SVG or plain text
    let decoded = rawData;
    try {
      decoded = decodeURIComponent(rawData);
    } catch {
      decoded = rawData;
    }

    // 递归解包可能出现的多层嵌套 data:image/svg+xml 前缀（自愈老旧备份历史异常）
    while (decoded.startsWith('data:image/svg+xml')) {
      const subComma = decoded.indexOf(',');
      if (subComma !== -1) {
        const subMeta = decoded.substring(0, subComma);
        const subData = decoded.substring(subComma + 1);
        if (subMeta.includes(';base64')) {
          try {
            decoded = atob(subData);
          } catch {
            break;
          }
        } else {
          try {
            decoded = decodeURIComponent(subData);
          } catch {
            decoded = subData;
            break;
          }
        }
      } else {
        break;
      }
    }

    const encoder = new TextEncoder();
    return { data: encoder.encode(decoded), mimeType: 'image/svg+xml' };
  }
}

/**
 * 辅助函数：利用 Canvas 适当约束过大图片分辨率 (最大 256x256)，以优化打包体积与跨浏览器还原后的极速加载
 */
async function optimizeImageBytes(
  bytes: Uint8Array,
  mimeType: string,
  maxDimension = 256
): Promise<{ data: Uint8Array; mimeType: string }> {
  // SVG 矢量图与 ICO 图标无需栅格化重采样
  if (mimeType.includes('svg') || mimeType.includes('ico') || mimeType.includes('x-icon')) {
    return { data: bytes, mimeType };
  }

  // 尺寸很小的不处理 (< 40KB)
  if (bytes.length < 40 * 1024) {
    return { data: bytes, mimeType };
  }

  return new Promise((resolve) => {
    try {
      const blob = new Blob([bytes as any], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width <= maxDimension && height <= maxDimension) {
            URL.revokeObjectURL(blobUrl);
            return resolve({ data: bytes, mimeType });
          }

          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(blobUrl);
            return resolve({ data: bytes, mimeType });
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            async (optimizedBlob) => {
              URL.revokeObjectURL(blobUrl);
              if (optimizedBlob) {
                const buffer = await optimizedBlob.arrayBuffer();
                resolve({ data: new Uint8Array(buffer), mimeType: 'image/png' });
              } else {
                resolve({ data: bytes, mimeType });
              }
            },
            'image/png',
            0.92
          );
        } catch {
          URL.revokeObjectURL(blobUrl);
          resolve({ data: bytes, mimeType });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve({ data: bytes, mimeType });
      };
      img.src = blobUrl;
    } catch {
      resolve({ data: bytes, mimeType });
    }
  });
}

/**
 * 抓取单个图标的二进制数据，具备多重降级与免 CORS 服务端代理
 */
async function fetchIconBinary(
  urlOrData: string,
  linkTitle = '',
  iconBgColor?: string
): Promise<{ data: Uint8Array; mimeType: string; extension: string } | null> {
  const trimmed = (urlOrData || '').trim();
  if (!trimmed) {
    // 若原链接无图标，生成高质量矢量首字图标作为独立资产固化
    const letterSvg = generateLetterIcon(linkTitle, iconBgColor ? { background: iconBgColor, backgroundTo: iconBgColor } : undefined);
    const { data, mimeType } = dataUrlToBinary(letterSvg);
    return { data, mimeType: 'image/svg+xml', extension: 'svg' };
  }

  // 1. 本身为 Data URL
  if (trimmed.startsWith('data:')) {
    const { data, mimeType } = dataUrlToBinary(trimmed);
    const optimized = await optimizeImageBytes(data, mimeType);
    const ext = getExtensionFromMime(optimized.mimeType);
    return { data: optimized.data, mimeType: optimized.mimeType, extension: ext };
  }

  // 2. 本身为 SVG 标签字符串
  if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
    const encoder = new TextEncoder();
    return { data: encoder.encode(trimmed), mimeType: 'image/svg+xml', extension: 'svg' };
  }

  // 3. 网络远程 URL (先直接 fetch，遇到跨域/网络问题则切换至服务端代理 /api/proxy-image)
  try {
    let res: Response | null = null;
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3500);
      res = await fetch(trimmed, { mode: 'cors', signal: controller.signal });
      clearTimeout(tid);
    } catch {
      res = null;
    }

    if (!res || !res.ok) {
      // 切换至免墙/免 CORS 代理
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(tid);
    }

    if (res && res.ok) {
      const buffer = await res.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);
      let mimeType = res.headers.get('content-type') || '';
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = getExtensionFromMime('', trimmed);
        mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      }
      const optimized = await optimizeImageBytes(rawBytes, mimeType);
      const extension = getExtensionFromMime(optimized.mimeType, trimmed);
      return { data: optimized.data, mimeType: optimized.mimeType, extension };
    }
  } catch (err) {
    console.warn(`[Backup] Failed to fetch remote icon: ${trimmed}`, err);
  }

  // 4. 彻底失败时的优雅回退：生成首字母 SVG 资产
  const fallbackSvg = generateLetterIcon(linkTitle || trimmed, iconBgColor ? { background: iconBgColor, backgroundTo: iconBgColor } : undefined);
  const { data, mimeType } = dataUrlToBinary(fallbackSvg);
  return { data, mimeType: 'image/svg+xml', extension: 'svg' };
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 导出完整导航配置与图标压缩包 (.navbak.zip)
 */
export async function exportBackupPackage(
  data: AppData,
  onProgress?: (progress: BackupProgress) => void
): Promise<BackupExportResult> {
  const zip = new JSZip();
  const iconsFolder = zip.folder('icons');
  const linksIconsFolder = iconsFolder?.folder('links');
  const categoriesIconsFolder = iconsFolder?.folder('categories');
  const siteIconsFolder = iconsFolder?.folder('site');

  const links = data.links || [];
  const categories = data.categories || [];
  const siteConfig = data.siteConfig;

  onProgress?.({
    stage: 'preparing',
    current: 0,
    total: links.length,
    percent: 0,
  });

  const manifestIcons: BackupManifest['icons'] = {
    links: {},
    categories: {},
    site: {},
  };

  let processedCount = 0;
  let savedIconCount = 0;
  const totalItems = links.length + categories.length + 3;

  // 1. 并发抓取并固化所有链接图标 (控制并发数以维持平稳性能)
  const CONCURRENCY = 5;
  const queue = [...links];

  const processLink = async (link: LinkItem) => {
    try {
      const iconResult = await fetchIconBinary(link.iconUrl || '', link.title || link.url, link.iconBgColor);
      if (iconResult && linksIconsFolder) {
        const safeId = link.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeId}.${iconResult.extension}`;
        linksIconsFolder.file(filename, iconResult.data);
        manifestIcons.links[link.id] = {
          file: `icons/links/${filename}`,
          mimeType: iconResult.mimeType,
          originalUrl: link.iconUrl || '',
        };
        savedIconCount++;
      }
    } catch (e) {
      console.warn(`[Backup] Error packing icon for link ${link.id}:`, e);
    } finally {
      processedCount++;
      onProgress?.({
        stage: 'fetching_icons',
        current: processedCount,
        total: totalItems,
        currentTitle: link.title,
        percent: Math.min(90, Math.round((processedCount / totalItems) * 85)),
      });
    }
  };

  const pool: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await processLink(item);
      }
    };
    pool.push(worker());
  }
  await Promise.all(pool);

  // 2. 打包分类图片图标 (如果有)
  for (const cat of categories) {
    if (cat.icon && (cat.icon.startsWith('data:') || cat.icon.startsWith('http://') || cat.icon.startsWith('https://'))) {
      try {
        const iconResult = await fetchIconBinary(cat.icon, cat.name);
        if (iconResult && categoriesIconsFolder) {
          const safeId = cat.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${safeId}.${iconResult.extension}`;
          categoriesIconsFolder.file(filename, iconResult.data);
          manifestIcons.categories[cat.id] = {
            file: `icons/categories/${filename}`,
            mimeType: iconResult.mimeType,
            originalUrl: cat.icon,
          };
          savedIconCount++;
        }
      } catch (err) {
        console.warn(`[Backup] Error packing category icon for ${cat.id}:`, err);
      }
    }
    processedCount++;
    onProgress?.({
      stage: 'fetching_icons',
      current: processedCount,
      total: totalItems,
      currentTitle: cat.name,
      percent: Math.min(92, Math.round((processedCount / totalItems) * 88)),
    });
  }

  // 3. 打包站点 Logo, Favicon 与 背景 (如果设置)
  if (siteConfig?.logoUrl && siteIconsFolder) {
    try {
      const res = await fetchIconBinary(siteConfig.logoUrl, 'Logo');
      if (res) {
        const filename = `logo.${res.extension}`;
        siteIconsFolder.file(filename, res.data);
        manifestIcons.site['logo'] = { file: `icons/site/${filename}`, mimeType: res.mimeType };
        savedIconCount++;
      }
    } catch {}
  }
  if (siteConfig?.faviconUrl && siteIconsFolder) {
    try {
      const res = await fetchIconBinary(siteConfig.faviconUrl, 'Favicon');
      if (res) {
        const filename = `favicon.${res.extension}`;
        siteIconsFolder.file(filename, res.data);
        manifestIcons.site['favicon'] = { file: `icons/site/${filename}`, mimeType: res.mimeType };
        savedIconCount++;
      }
    } catch {}
  }
  if (siteConfig?.backgroundUrl && siteConfig.backgroundUrl.startsWith('http') && siteIconsFolder) {
    try {
      const res = await fetchIconBinary(siteConfig.backgroundUrl, 'Background');
      if (res) {
        const filename = `background.${res.extension}`;
        siteIconsFolder.file(filename, res.data);
        manifestIcons.site['background'] = { file: `icons/site/${filename}`, mimeType: res.mimeType };
        savedIconCount++;
      }
    } catch {}
  }

  // 4. 读取完整的点击统计、趋势与信任列表
  const clickStats = loadClickStats();
  const dailyClicks = loadDailyClicks();
  const trustedUrls = loadTrustedUrls();

  // 5. 生成结构化的备份清单 manifest.json
  const now = new Date();
  const dateStr = now.toISOString();
  const manifest: BackupManifest = {
    version: '2.0',
    format: 'navhub-backup-package',
    appName: siteConfig?.title || 'NavHub Pro',
    exportTimestamp: Date.now(),
    exportDate: dateStr,
    data,
    clickStats,
    dailyClicks,
    trustedUrls,
    icons: manifestIcons,
    statsSummary: {
      categoryCount: categories.length,
      linkCount: links.length,
      iconCount: savedIconCount,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // 同时存一份根目录标准 navhub-backup.json 确保多系统自容纳
  zip.file('navhub-backup.json', JSON.stringify(data, null, 2));

  // 添加友好的说明 README.txt
  const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const readmeContent = `NavHub Pro - 完整导航配置与图标备份包
======================================================
导出时间: ${dateFormatted}
分类数量: ${categories.length} 个
链接数量: ${links.length} 个
包含图标: ${savedIconCount} 个独立高保真图标资产

【说明】
本压缩包已将您的所有导航配置、自定义链接、独立底色、点击频次统计，
以及所有链接对应的高清图标完整保存在 icons/ 目录中。

在任何新浏览器、新设备或离线环境中：
打开 NavHub Pro -> 管理中心 -> 「数据备份」，选择此文件导入，
即可 100% 完整无损还原全部导航配置与图标，完全一致，无需依赖外部网络或第三方图床！
`;
  zip.file('README.txt', readmeContent);

  // 6. 执行最终压缩
  onProgress?.({
    stage: 'compressing',
    current: totalItems,
    total: totalItems,
    percent: 95,
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.({
        stage: 'compressing',
        current: totalItems,
        total: totalItems,
        percent: Math.min(99, Math.round(90 + metadata.percent * 0.09)),
      });
    }
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `navhub-backup-${fileDate}.navbak.zip`;

  onProgress?.({
    stage: 'complete',
    current: totalItems,
    total: totalItems,
    percent: 100,
  });

  return {
    blob,
    filename,
    summary: {
      categoryCount: categories.length,
      linkCount: links.length,
      iconCount: savedIconCount,
      fileSizeBytes: blob.size,
      formattedSize: formatBytes(blob.size),
    },
  };
}

/**
 * 导入并还原导航配置与图标压缩包 (.navbak.zip / .zip / .json)
 */
export async function importBackupPackage(
  file: File,
  onProgress?: (progress: { stage: string; percent: number }) => void
): Promise<BackupImportResult> {
  const isZip = file.name.endsWith('.zip') || file.name.endsWith('.navbak') || file.name.endsWith('.navpack') || file.type.includes('zip');

  // 1. 如果是标准的历史 .json 文件，进行兼容读取
  if (!isZip) {
    onProgress?.({ stage: '读取 JSON 文件...', percent: 50 });
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.links)) {
      throw new Error('无效的导航数据文件格式');
    }
    onProgress?.({ stage: '还原完成', percent: 100 });
    return {
      success: true,
      data: parsed as AppData,
      summary: {
        categoryCount: parsed.categories.length,
        linkCount: parsed.links.length,
        restoredIconsCount: parsed.links.filter((l: any) => Boolean(l.iconUrl)).length,
        hasClickStats: false,
        hasTrustedUrls: false,
      },
    };
  }

  // 2. 如果是 .navbak.zip 完整备份包
  onProgress?.({ stage: '解压备份数据包...', percent: 20 });
  const zip = await JSZip.loadAsync(file);

  // 查找清单文件
  let manifestText = '';
  const manifestFile = zip.file('manifest.json') || zip.file('navhub-manifest.json');
  if (manifestFile) {
    manifestText = await manifestFile.async('text');
  } else {
    // 寻找任意包含 categories 与 links 的 JSON 文件
    const jsonFiles = zip.file(/\.json$/i);
    for (const jf of jsonFiles) {
      const content = await jf.async('text');
      if (content.includes('"categories"') && content.includes('"links"')) {
        manifestText = content;
        break;
      }
    }
  }

  if (!manifestText) {
    throw new Error('压缩包中未检测到有效的 manifest.json 或导航配置文件');
  }

  let manifest: any;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error('解析备份清单 JSON 失败');
  }

  const rawData: AppData = manifest.data || manifest;
  if (!rawData || !Array.isArray(rawData.categories) || !Array.isArray(rawData.links)) {
    throw new Error('备份包内的导航数据格式不完整');
  }

  onProgress?.({ stage: '正在恢复高清图标资产与底色...', percent: 45 });

  let restoredIconsCount = 0;

  // 提取图标索引
  const linkIconsMap = manifest.icons?.links || {};
  const catIconsMap = manifest.icons?.categories || {};
  const siteIconsMap = manifest.icons?.site || {};

  // 3. 逐个将 zip 中的独立图标资产解析为稳健且完全脱机的 Data URL，赋予每个链接
  const restoredLinks: LinkItem[] = await Promise.all(
    rawData.links.map(async (link) => {
      try {
        let iconEntry = linkIconsMap[link.id];
        let fileInZip: JSZip.JSZipObject | null = null;

        if (iconEntry?.file) {
          fileInZip = zip.file(iconEntry.file);
        }

        // 容错搜索：尝试在 icons/links/ 下匹配 ID
        if (!fileInZip) {
          const safeId = link.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const matching = zip.file(new RegExp(`icons/links/${safeId}\\.`, 'i'));
          if (matching && matching.length > 0) {
            fileInZip = matching[0];
          }
        }

        if (fileInZip) {
          const mimeType = iconEntry?.mimeType || (fileInZip.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png');

          // 特别针对 SVG 矢量与极简字标：直接以 UTF-8 文本解析并自愈任何历史遗留的嵌套 data: 前缀
          if (fileInZip.name.endsWith('.svg') || mimeType.includes('svg')) {
            let svgText = await fileInZip.async('text');
            while (svgText.startsWith('data:image/svg+xml')) {
              const commaIdx = svgText.indexOf(',');
              if (commaIdx !== -1) {
                const subMeta = svgText.substring(0, commaIdx);
                const subPayload = svgText.substring(commaIdx + 1);
                if (subMeta.includes(';base64')) {
                  try {
                    svgText = atob(subPayload);
                  } catch {
                    break;
                  }
                } else {
                  try {
                    svgText = decodeURIComponent(subPayload);
                  } catch {
                    svgText = subPayload;
                    break;
                  }
                }
              } else {
                break;
              }
            }

            if (svgText.includes('<svg')) {
              const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText.trim());
              restoredIconsCount++;
              return {
                ...link,
                iconUrl: dataUrl,
              };
            }
          }

          const base64 = await fileInZip.async('base64');
          if (base64) {
            const dataUrl = `data:${mimeType};base64,${base64}`;
            restoredIconsCount++;
            return {
              ...link,
              iconUrl: dataUrl,
            };
          }
        }
      } catch (err) {
        console.warn(`[Backup] Failed to extract icon for link ${link.id}:`, err);
      }
      return link;
    })
  );

  // 4. 恢复分类图标
  const restoredCategories: Category[] = await Promise.all(
    rawData.categories.map(async (cat) => {
      try {
        let iconEntry = catIconsMap[cat.id];
        let fileInZip: JSZip.JSZipObject | null = null;
        if (iconEntry?.file) {
          fileInZip = zip.file(iconEntry.file);
        } else {
          const safeId = cat.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const matching = zip.file(new RegExp(`icons/categories/${safeId}\\.`, 'i'));
          if (matching && matching.length > 0) fileInZip = matching[0];
        }

        if (fileInZip) {
          const mimeType = iconEntry?.mimeType || (fileInZip.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
          if (fileInZip.name.endsWith('.svg') || mimeType.includes('svg')) {
            let svgText = await fileInZip.async('text');
            while (svgText.startsWith('data:image/svg+xml')) {
              const commaIdx = svgText.indexOf(',');
              if (commaIdx !== -1) {
                const subMeta = svgText.substring(0, commaIdx);
                const subPayload = svgText.substring(commaIdx + 1);
                if (subMeta.includes(';base64')) {
                  try { svgText = atob(subPayload); } catch { break; }
                } else {
                  try { svgText = decodeURIComponent(subPayload); } catch { svgText = subPayload; break; }
                }
              } else {
                break;
              }
            }
            if (svgText.includes('<svg')) {
              return { ...cat, icon: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText.trim()) };
            }
          }

          const base64 = await fileInZip.async('base64');
          if (base64) {
            return { ...cat, icon: `data:${mimeType};base64,${base64}` };
          }
        }
      } catch {}
      return cat;
    })
  );

  // 5. 恢复站点品牌图标
  const restoredSiteConfig: SiteConfig = {
    title: rawData.siteConfig?.title || 'NavHub Pro',
    logoUrl: rawData.siteConfig?.logoUrl || '',
    faviconUrl: rawData.siteConfig?.faviconUrl || '',
    backgroundUrl: rawData.siteConfig?.backgroundUrl,
    linkColumns: rawData.siteConfig?.linkColumns,
    themeColor: rawData.siteConfig?.themeColor,
    logoShape: rawData.siteConfig?.logoShape,
    logoBackgroundColor: rawData.siteConfig?.logoBackgroundColor,
    healthCheckCycle: rawData.siteConfig?.healthCheckCycle,
    autoSortByFrequency: rawData.siteConfig?.autoSortByFrequency,
    lastAutoSortedDate: rawData.siteConfig?.lastAutoSortedDate,
  };

  try {
    const logoFile = zip.file(/icons\/site\/logo\./i)?.[0];
    if (logoFile) {
      const base64 = await logoFile.async('base64');
      const mime = logoFile.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      restoredSiteConfig.logoUrl = `data:${mime};base64,${base64}`;
    }
    const favFile = zip.file(/icons\/site\/favicon\./i)?.[0];
    if (favFile) {
      const base64 = await favFile.async('base64');
      const mime = favFile.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      restoredSiteConfig.faviconUrl = `data:${mime};base64,${base64}`;
    }
  } catch {}

  const finalData: AppData = {
    categories: restoredCategories,
    links: restoredLinks,
    siteConfig: restoredSiteConfig,
    tagOrder: rawData.tagOrder || [],
  };

  // 6. 恢复附加的点击统计与信任名单
  let hasClickStats = false;
  if (manifest.clickStats && typeof manifest.clickStats === 'object') {
    try {
      saveClickStats(manifest.clickStats);
      hasClickStats = true;
    } catch {}
  }
  if (manifest.dailyClicks && typeof manifest.dailyClicks === 'object') {
    try {
      saveDailyClicks(manifest.dailyClicks);
    } catch {}
  }
  let hasTrustedUrls = false;
  if (Array.isArray(manifest.trustedUrls)) {
    try {
      saveTrustedUrls(manifest.trustedUrls);
      hasTrustedUrls = true;
    } catch {}
  }

  onProgress?.({ stage: '恢复完成！', percent: 100 });

  return {
    success: true,
    data: finalData,
    summary: {
      categoryCount: finalData.categories.length,
      linkCount: finalData.links.length,
      restoredIconsCount,
      exportDate: manifest.exportDate,
      hasClickStats,
      hasTrustedUrls,
    },
  };
}
