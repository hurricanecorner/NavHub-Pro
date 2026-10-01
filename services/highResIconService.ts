/**
 * High-Resolution Icon Discovery & Letter-Based Fallback Service
 * 高清图标探测、Web App Manifest 图标解析与优雅首字母徽标生成服务
 */

import { extractCleanHostname, isLikelyLowResIcon } from '../utils/iconEnhancer';

export interface LetterIconOptions {
  size?: number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  background?: string;
  backgroundTo?: string;
  textColor?: string;
  gradient?: boolean;
  transparent?: boolean;
  customLetters?: string;
  fontScale?: number;
  verticalOffset?: number; // 垂直偏移量校准 (-30 ~ +30 px，负数向上抬升)
  opticalCenter?: boolean;
}

export interface ManifestIconCandidate {
  url: string;
  size: number;
  sizeLabel: string;
  type?: string;
  purpose?: string;
}

export interface HighResIconResult {
  iconUrl: string;
  source: string;
  isHighRes: boolean;
  isLetterFallback: boolean;
  isSmartFetch?: boolean;
  sizeLabel?: string;
  candidates?: Array<{ source: string; url: string; sizeLabel: string }>;
}

// 12 组严选现代化高级渐变色板，确保根据域名/标题哈希稳定分配且对比度出众
export const MODERN_GRADIENT_PALETTES = [
  { from: '#4f46e5', to: '#7c3aed', text: '#ffffff', name: 'Indigo Violet' },
  { from: '#0284c7', to: '#2563eb', text: '#ffffff', name: 'Sky Blue' },
  { from: '#059669', to: '#10b981', text: '#ffffff', name: 'Emerald Mint' },
  { from: '#d97706', to: '#f59e0b', text: '#ffffff', name: 'Warm Amber' },
  { from: '#e11d48', to: '#f43f5e', text: '#ffffff', name: 'Rose Red' },
  { from: '#9333ea', to: '#c026d3', text: '#ffffff', name: 'Purple Fuchsia' },
  { from: '#0d9488', to: '#06b6d4', text: '#ffffff', name: 'Teal Cyan' },
  { from: '#ea580c', to: '#fb923c', text: '#ffffff', name: 'Solar Orange' },
  { from: '#334155', to: '#0f172a', text: '#ffffff', name: 'Slate Onyx' },
  { from: '#475569', to: '#1e293b', text: '#ffffff', name: 'Deep Steel' },
  { from: '#0891b2', to: '#0284c7', text: '#ffffff', name: 'Ocean Cyan' },
  { from: '#701a75', to: '#4a044e', text: '#ffffff', name: 'Velvet Plum' },
];

/**
 * 计算字符串的哈希数值
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 从网站标题或域名中智能提取 1~2 个最能代表品牌的字母或字符
 */
export function extractBrandInitials(titleOrDomain: string): string {
  if (!titleOrDomain || !titleOrDomain.trim()) return 'W';

  let text = titleOrDomain.trim();

  // 1. 如果是 URL，提取纯净主机名
  if (text.includes('://') || text.includes('.')) {
    const { hostname } = extractCleanHostname(text);
    const domainName = hostname.split('.')[0] || hostname;
    if (text.includes('://')) {
      text = domainName;
    }
  }

  // 2. 去除多余的常用后缀与前缀（如 .com, Inc., Ltd., App, 官网, 首页）
  text = text
    .replace(/\.(com|cn|org|net|io|co|dev|ai|app|xyz)$/i, '')
    .replace(/(?:官方网站|官网|首页|导航|在线|平台)$/, '')
    .trim();

  if (!text) return 'W';

  // 3. 中文字符识别：如果首字符是中文字符，提取前 1 或 2 个中文字符
  const cjkMatch = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/);
  if (cjkMatch && cjkMatch.index === 0) {
    return text.slice(0, 1);
  }

  // 4. 数字开头（如 1000logos, 12306, 360, 1password）
  const numMatch = text.match(/^\d+/);
  if (numMatch) {
    return numMatch[0].slice(0, 2);
  }

  // 5. 驼峰命名或带分隔符（如 GitHub -> GH, AppStore -> AS, stack-overflow -> SO）
  const words = text.split(/[\s_\-.]+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0][0];
    const second = words[1][0];
    if (first && second && /[a-zA-Z]/.test(first) && /[a-zA-Z]/.test(second)) {
      return (first + second).toUpperCase();
    }
  }

  // 检查单个词内部的驼峰大写（如 YouTube -> YT, GitHub -> GH, DevOps -> DO）
  const camelMatches = text.match(/[A-Z]/g);
  if (camelMatches && camelMatches.length >= 2 && text.length >= 4) {
    return (camelMatches[0] + camelMatches[1]).toUpperCase();
  }

  // 6. 默认提取首字母（大写）
  const cleanFirst = text.charAt(0).toUpperCase();
  return cleanFirst || 'W';
}

/**
 * 生成超清、现代极简的 SVG 首字母图标 Data URI
 * 支持矢量无损缩放、精致微妙渐变与微光内阴影
 * 经过物理与光学居中修正，解决传统字体基线向下偏移问题
 */
export function generateLetterIcon(
  titleOrDomain: string,
  options: LetterIconOptions = {}
): string {
  const letters = (options.customLetters || extractBrandInitials(titleOrDomain)).trim();
  const hash = hashString(titleOrDomain.toLowerCase().trim() || 'brand');
  const palette = MODERN_GRADIENT_PALETTES[hash % MODERN_GRADIENT_PALETTES.length];

  const size = options.size || 256;
  const fromColor = options.background || palette.from;
  const toColor = options.backgroundTo || options.background || palette.to;
  const isTransparent = Boolean(options.transparent || options.background === 'transparent');
  const textColor = options.textColor || (isTransparent ? '#4f46e5' : palette.text);
  const fontScale = options.fontScale || 1.0;

  // 根据字数与语言自适应大幅放大字体尺寸（紧贴主流 App 图标设计规范，填充率由 ~38% 跃升至 ~65%）
  const isCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(letters);
  let baseFontSize = 175; // 单字母/数字：由 140 提升至 175，更显大气饱满
  if (letters.length >= 3) {
    baseFontSize = isCjk ? 92 : 98;
  } else if (letters.length === 2) {
    baseFontSize = isCjk ? 116 : 128;
  } else if (isCjk) {
    baseFontSize = 154; // 单个中文字符
  }

  const finalFontSize = Math.round(baseFontSize * fontScale);

  // 光学绝对正中心校准：
  // 在 SVG dominant-baseline="central" 规范中，浏览器计算 baseline 会计入字体的 descender（下行区）。
  // 对于无下行区的大写字母 (D, A, B, M) 或数字，会导致视觉中心向下沉底偏移约 15~18px。
  // 通过光学基线补偿，在 256×256 画布中直接将文字 Group 向上平移，实现真正的数学与视觉双重正中！
  const defaultOpticalShift = isCjk ? -6 : -16;
  const manualShift = options.verticalOffset || 0;
  const totalYShift = defaultOpticalShift + manualShift;

  // 形状半径：默认使用 0 (全画幅铺满 256×256)，由外层 UI 容器 (rounded-full / rounded-[38%] / rounded-none) 统一切割裁切。
  // 彻底杜绝因 SVG 内置圆角与外部圆形容器碰撞导致的八边形切角伪影。
  let rx = 0;
  if (options.rounded === 'full') rx = 128;
  else if (options.rounded === 'lg') rx = 64;
  else if (options.rounded === 'sm') rx = 24;
  else if (options.rounded === 'none') rx = 0;

  const gradientId = `bg-grad-${hash}`;
  const glowId = `glow-${hash}`;

  const rxAttr = rx > 0 ? `rx="${rx}"` : '';
  const innerRxAttr = rx > 0 ? `rx="${Math.max(0, rx - 1)}"` : '';

  const svg = isTransparent ? `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">
  <!-- Letter Text: 绝对正中心对齐，透明无底色 -->
  <g transform="translate(0, ${totalYShift})">
    <text 
      x="128" 
      y="128" 
      dominant-baseline="central" 
      text-anchor="middle" 
      fill="${textColor}" 
      font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" 
      font-size="${finalFontSize}" 
      font-weight="800" 
      letter-spacing="${letters.length > 1 ? '-0.04em' : '0'}"
    >${letters}</text>
  </g>
</svg>
`.trim() : `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${fromColor}" />
      <stop offset="100%" stop-color="${toColor}" />
    </linearGradient>
    <radialGradient id="${glowId}" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background Base -->
  <rect width="256" height="256" ${rxAttr} fill="url(#${gradientId})" />
  
  <!-- Subtle Top Light Reflection -->
  <rect width="256" height="256" ${rxAttr} fill="url(#${glowId})" />
  
  <!-- Subtle Inner Border -->
  <rect x="1" y="1" width="254" height="254" ${innerRxAttr} fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.2" />

  <!-- Letter Text: 绝对正中心对齐，通过 transform 向上光学补偿彻底消除下沉偏移 -->
  <g transform="translate(0, ${totalYShift})">
    <text 
      x="128" 
      y="128" 
      dominant-baseline="central" 
      text-anchor="middle" 
      fill="${textColor}" 
      font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" 
      font-size="${finalFontSize}" 
      font-weight="800" 
      letter-spacing="${letters.length > 1 ? '-0.04em' : '0'}"
      style="text-shadow: 0 4px 12px rgba(0,0,0,0.18);"
    >${letters}</text>
  </g>
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * 规范化图标显示，解决历史生成的 SVG 中写死的 rx 导致的八边形切角或边角冲突问题，
 * 并深度自愈历史备份导入中可能出现的双层嵌套 data:image/svg+xml 异常
 */
export function normalizeIconForDisplay(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/svg+xml')) {
    try {
      // 1. 处理 Base64 编码的 SVG
      if (trimmed.includes(';base64,')) {
        const parts = trimmed.split(';base64,');
        if (typeof atob === 'function') {
          let decoded = atob(parts[1]);
          // 深度解包历史或导入中可能双层嵌套的 data:image/svg+xml 字符串
          while (decoded.startsWith('data:image/svg+xml')) {
            const commaIdx = decoded.indexOf(',');
            if (commaIdx !== -1) {
              const meta = decoded.substring(0, commaIdx);
              const payload = decoded.substring(commaIdx + 1);
              if (meta.includes(';base64')) {
                try { decoded = atob(payload); } catch { break; }
              } else {
                try { decoded = decodeURIComponent(payload); } catch { decoded = payload; break; }
              }
            } else {
              break;
            }
          }
          if (/\b(?:rx|ry)=["']\d+["']/.test(decoded)) {
            decoded = decoded
              .replace(/\brx=["']\d+["']/g, 'rx="0"')
              .replace(/\bry=["']\d+["']/g, 'ry="0"');
          }
          // 升级历史版本中偏小的单字符字号 (如历史 140 升级至 175，保持与当前生成的字标视觉一致饱满)
          if (/>\s*[A-Za-z0-9]\s*<\/text>/.test(decoded) && /\bfont-size=["'](?:140|130|120|110|100|90)["']/.test(decoded)) {
            decoded = decoded.replace(/\bfont-size=["'](?:140|130|120|110|100|90)["']/, 'font-size="175"');
          }
          return `data:image/svg+xml;utf8,${encodeURIComponent(decoded)}`;
        }
        return trimmed;
      }

      // 2. 处理 UTF-8 / URL 编码的 SVG
      const raw = trimmed.replace(/^data:image\/svg\+xml(?:;utf8)?,/, '');
      let decoded: string;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        decoded = raw;
      }
      while (decoded.startsWith('data:image/svg+xml')) {
        const commaIdx = decoded.indexOf(',');
        if (commaIdx !== -1) {
          const meta = decoded.substring(0, commaIdx);
          const payload = decoded.substring(commaIdx + 1);
          if (meta.includes(';base64')) {
            try { decoded = atob(payload); } catch { break; }
          } else {
            try { decoded = decodeURIComponent(payload); } catch { decoded = payload; break; }
          }
        } else {
          break;
        }
      }
      // 清除写死的 rx/ry 属性，使其全画幅铺满，完美响应外层 CSS 容器边框而不产生边缘切割
      if (/\b(?:rx|ry)=["']\d+["']/.test(decoded) || /(?:rx|ry)%3D%22\d+%22/.test(decoded)) {
        decoded = decoded
          .replace(/\brx=["']\d+["']/g, 'rx="0"')
          .replace(/\bry=["']\d+["']/g, 'ry="0"')
          .replace(/rx%3D%22\d+%22/g, 'rx%3D%220%22')
          .replace(/ry%3D%22\d+%22/g, 'ry%3D%220%22');
      }
      // 升级历史版本中偏小的单字符字号 (如历史 140 升级至 175，保持与当前生成的字标视觉一致饱满)
      if (/>\s*[A-Za-z0-9]\s*<\/text>/.test(decoded) && /\bfont-size=["'](?:140|130|120|110|100|90)["']/.test(decoded)) {
        decoded = decoded.replace(/\bfont-size=["'](?:140|130|120|110|100|90)["']/, 'font-size="175"');
      }
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(decoded);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * 判断图标是否属于低质/模糊图标
 */
export function isLowQualityFavicon(iconUrl?: string): boolean {
  if (!iconUrl) return true;
  return isLikelyLowResIcon(iconUrl);
}

/**
 * 尝试通过后端获取高分辨率图标（Apple Touch Icon / Web App Manifest 512px / 192px / SVG）
 * 若未探测到任何高清原图，自动退回到优雅的高对比度首字母徽标 (Letter-based Icon)
 */
export async function fetchHighResolutionIcon(params: {
  url: string;
  title?: string;
  currentFavicon?: string;
  timeoutMs?: number;
  forceRefresh?: boolean;
}): Promise<HighResIconResult> {
  const { url, title = '', currentFavicon = '', timeoutMs = 4500, forceRefresh = false } = params;
  const cleanUrl = url.trim();

  // 若传入的当前图标已经是非常明确的 256px / 512px / SVG 或 App Store 级别，且未要求强制刷新，则直接沿用
  if (!forceRefresh && currentFavicon && !isLowQualityFavicon(currentFavicon)) {
    return {
      iconUrl: currentFavicon,
      source: '当前已有高清图标',
      isHighRes: true,
      isLetterFallback: false,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('/api/fetch-high-res-icon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        title,
        currentFavicon: forceRefresh ? '' : currentFavicon,
        forceRefresh,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.iconUrl) {
        return {
          iconUrl: data.iconUrl,
          source: data.source || '超清网络源',
          isHighRes: data.isHighRes ?? true,
          isLetterFallback: !!data.isLetterFallback,
          isSmartFetch: !!data.isSmartFetch || (typeof data.source === 'string' && data.source.includes('Smart Fetch')),
          sizeLabel: data.sizeLabel,
          candidates: data.candidates || [],
        };
      }
    }
  } catch {
    // 后端探测超时或异常，继续走安全首字母徽标降级
  }

  // 后端未找到或失败，触发 Fallback：生成高分辨率极简字标
  const letterIcon = generateLetterIcon(title || cleanUrl);
  return {
    iconUrl: letterIcon,
    source: '生成极简字标 (Clean Letter Fallback)',
    isHighRes: true,
    isLetterFallback: true,
    sizeLabel: '256×256 矢量',
  };
}

/**
 * 解析 Web App Manifest 中的图标并按尺寸从大到小排序
 */
export function parseManifestIcons(
  manifestJson: any,
  manifestBaseUrl: string
): ManifestIconCandidate[] {
  if (!manifestJson || !Array.isArray(manifestJson.icons)) {
    return [];
  }

  const results: ManifestIconCandidate[] = [];

  for (const item of manifestJson.icons) {
    if (!item || !item.src) continue;
    let iconUrl = item.src;
    try {
      iconUrl = new URL(item.src, manifestBaseUrl).href;
    } catch {
      // keep relative or original if parse fails
    }

    // 解析尺寸，如 "192x192", "512x512", "48x48 96x96"
    let maxDim = 0;
    const sizesStr = (item.sizes || '').toString().toLowerCase();
    const sizeMatches = sizesStr.match(/(\d+)x(\d+)/g);

    if (sizeMatches && sizeMatches.length > 0) {
      for (const sm of sizeMatches) {
        const parts = sm.split('x');
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        const larger = Math.max(w || 0, h || 0);
        if (larger > maxDim) maxDim = larger;
      }
    } else if (item.type === 'image/svg+xml' || iconUrl.endsWith('.svg')) {
      maxDim = 1024; // 矢量 SVG 赋予最高分辨率权重
    }

    if (!maxDim) {
      maxDim = 128;
    }

    results.push({
      url: iconUrl,
      size: maxDim,
      sizeLabel: maxDim === 1024 && (item.type === 'image/svg+xml' || iconUrl.endsWith('.svg')) ? '矢量 SVG' : `${maxDim}×${maxDim}`,
      type: item.type,
      purpose: item.purpose,
    });
  }

  return results.sort((a, b) => b.size - a.size);
}
