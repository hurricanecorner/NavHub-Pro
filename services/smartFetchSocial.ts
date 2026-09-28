/**
 * Smart Fetch - Social Media High-Definition Icon Extraction Service
 * 当标准 Favicon 缺失、模糊或对主流互联网服务无效时，
 * 智能从 YouTube、Twitter/X、GitHub、Telegram 等官方社交门户主页提取 800×800 / 400×400 官方原画级超清头像
 */

export interface SmartSocialIconCandidate {
  platform: 'youtube' | 'twitter' | 'github' | 'telegram' | 'bilibili' | 'googleplay' | 'chromestore' | 'facebook' | 'instagram' | 'discord' | 'other';
  title: string;
  handle?: string;
  iconUrl: string;
  source: string;
  badge: string;
  sizeLabel: string;
  score: number;
  isSmartFetch: boolean;
  profileUrl?: string;
}

export interface ExtractedSocialProfiles {
  twitterHandles: string[];
  youtubeQueries: string[];
  githubUsers: string[];
  telegramChannels: string[];
}

// 常见主流知名服务官方社交账号精选知识库 (针对标准 Favicon 易失效或低清的服务)
export const KNOWN_POPULAR_SERVICE_HANDLES: Record<
  string,
  { brand: string; twitter?: string; youtube?: string; github?: string; telegram?: string }
> = {
  'play.google.com': { brand: 'Google Play', youtube: 'Google Play', twitter: 'GooglePlay' },
  'google.com': { brand: 'Google', youtube: 'Google', twitter: 'Google' },
  'openai.com': { brand: 'OpenAI', youtube: 'OpenAI', twitter: 'OpenAI', github: 'openai' },
  'chatgpt.com': { brand: 'ChatGPT', youtube: 'OpenAI', twitter: 'OpenAI', github: 'openai' },
  'figma.com': { brand: 'Figma', youtube: 'Figma', twitter: 'figma' },
  'notion.so': { brand: 'Notion', youtube: 'Notion', twitter: 'NotionHQ' },
  'notion.com': { brand: 'Notion', youtube: 'Notion', twitter: 'NotionHQ' },
  'discord.com': { brand: 'Discord', youtube: 'Discord', twitter: 'discord' },
  'spotify.com': { brand: 'Spotify', youtube: 'Spotify', twitter: 'Spotify' },
  'steampowered.com': { brand: 'Steam', youtube: 'Steam', twitter: 'Steam' },
  'store.steampowered.com': { brand: 'Steam', youtube: 'Steam', twitter: 'Steam' },
  'anthropic.com': { brand: 'Anthropic', youtube: 'Anthropic', twitter: 'AnthropicAI' },
  'claude.ai': { brand: 'Claude', youtube: 'Anthropic', twitter: 'AnthropicAI' },
  'telegram.org': { brand: 'Telegram', youtube: 'Telegram', twitter: 'telegram', telegram: 'telegram' },
  't.me': { brand: 'Telegram', youtube: 'Telegram', twitter: 'telegram' },
  'docker.com': { brand: 'Docker', youtube: 'Docker', twitter: 'Docker', github: 'docker' },
  'stripe.com': { brand: 'Stripe', youtube: 'Stripe', twitter: 'stripe', github: 'stripe' },
  'supabase.com': { brand: 'Supabase', youtube: 'Supabase', twitter: 'supabase', github: 'supabase' },
  'vercel.com': { brand: 'Vercel', youtube: 'Vercel', twitter: 'vercel', github: 'vercel' },
  'reddit.com': { brand: 'Reddit', youtube: 'Reddit', twitter: 'Reddit' },
  'netflix.com': { brand: 'Netflix', youtube: 'Netflix', twitter: 'netflix' },
  'twitch.tv': { brand: 'Twitch', youtube: 'Twitch', twitter: 'Twitch' },
  'github.com': { brand: 'GitHub', youtube: 'GitHub', twitter: 'github', github: 'github' },
  'bilibili.com': { brand: '哔哩哔哩', youtube: '哔哩哔哩弹幕网', twitter: 'bilibili_en' },
  'youtube.com': { brand: 'YouTube', youtube: 'YouTube', twitter: 'YouTube' },
  'x.com': { brand: 'X', twitter: 'X', youtube: 'X' },
  'twitter.com': { brand: 'X (Twitter)', twitter: 'X', youtube: 'X' },
  'tailwindcss.com': { brand: 'Tailwind CSS', youtube: 'Tailwind Labs', twitter: 'tailwindcss', github: 'tailwindlabs' },
  'linear.app': { brand: 'Linear', youtube: 'Linear', twitter: 'linear' },
  'raycast.com': { brand: 'Raycast', youtube: 'Raycast', twitter: 'raycastapp', github: 'raycast' },
  'arc.net': { brand: 'Arc Browser', youtube: 'The Browser Company', twitter: 'arcinternet' },
  'sublimehq.com': { brand: 'Sublime Text', twitter: 'sublimehq' },
  'jetbrains.com': { brand: 'JetBrains', youtube: 'JetBrains', twitter: 'jetbrains', github: 'JetBrains' },
  'midjourney.com': { brand: 'Midjourney', twitter: 'midjourney' },
  'huggingface.co': { brand: 'Hugging Face', youtube: 'Hugging Face', twitter: 'huggingface', github: 'huggingface' },
  'slack.com': { brand: 'Slack', youtube: 'Slack', twitter: 'SlackHQ' },
  'zoom.us': { brand: 'Zoom', youtube: 'Zoom', twitter: 'Zoom' },
  'canva.com': { brand: 'Canva', youtube: 'Canva', twitter: 'canva' },
  'gitlab.com': { brand: 'GitLab', youtube: 'GitLab', twitter: 'gitlab', github: 'gitlabhq' },
  'cloudflare.com': { brand: 'Cloudflare', youtube: 'Cloudflare', twitter: 'Cloudflare', github: 'cloudflare' },
};

// 过滤非账号的 Twitter 保留词
const TWITTER_RESERVED = new Set([
  'home', 'explore', 'search', 'notifications', 'messages', 'i', 'intent', 'share',
  'login', 'signup', 'help', 'about', 'privacy', 'tos', 'terms', 'rules', 'settings',
  'hashtag', 'status', 'account', 'download', 'widgets', 'en', 'zh', 'blog', 'support',
  'personalization', 'jobs', 'careers', 'developer', 'verified', 'premium', 'monetization',
  'safety', 'security', 'resources', 'press', 'brand', 'accessibility'
]);

// 过滤非账号的 GitHub 保留词
const GITHUB_RESERVED = new Set([
  'features', 'pricing', 'explore', 'topics', 'security', 'about', 'blog', 'settings',
  'login', 'signup', 'orgs', 'site', 'contact', 'enterprise', 'trending', 'collections',
  'events', 'community', 'marketplace', 'nonprofit', 'customer-stories', 'readme'
]);

/**
 * 从页面 HTML 中智能挖掘官方社交媒体主页链接
 */
export function extractSocialProfilesFromHtml(html: string): ExtractedSocialProfiles {
  const result: ExtractedSocialProfiles = {
    twitterHandles: [],
    youtubeQueries: [],
    githubUsers: [],
    telegramChannels: [],
  };

  if (!html || typeof html !== 'string') return result;

  // 1. Twitter / X meta tags: <meta name="twitter:site" content="@handle">
  const metaSiteMatches = html.matchAll(/<meta\s+[^>]*?(?:name|property)\s*=\s*["'](?:twitter:site|twitter:creator)["'][^>]*?content\s*=\s*["']@?([a-zA-Z0-9_]{1,30})["']/gi);
  for (const m of metaSiteMatches) {
    const handle = (m[1] || '').trim();
    if (handle && !TWITTER_RESERVED.has(handle.toLowerCase())) {
      result.twitterHandles.push(handle);
    }
  }

  // 2. Twitter / X anchor links: href="https://twitter.com/handle" or "https://x.com/handle"
  const twitterLinkMatches = html.matchAll(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,30})(?:["'/?#\s]|$)/gi);
  for (const m of twitterLinkMatches) {
    const handle = (m[1] || '').trim();
    if (handle && !TWITTER_RESERVED.has(handle.toLowerCase())) {
      result.twitterHandles.push(handle);
    }
  }

  // 3. YouTube channel links: youtube.com/@handle or youtube.com/user/name or youtube.com/channel/id
  const ytHandleMatches = html.matchAll(/https?:\/\/(?:www\.)?youtube\.com\/@([a-zA-Z0-9_\-\.]{2,50})(?:["'/?#\s]|$)/gi);
  for (const m of ytHandleMatches) {
    const handle = (m[1] || '').trim();
    if (handle) {
      result.youtubeQueries.push(`@${handle}`);
    }
  }

  const ytUserMatches = html.matchAll(/https?:\/\/(?:www\.)?youtube\.com\/(?:c|user)\/([a-zA-Z0-9_\-]{2,50})(?:["'/?#\s]|$)/gi);
  for (const m of ytUserMatches) {
    const name = (m[1] || '').trim();
    if (name) {
      result.youtubeQueries.push(name);
    }
  }

  // 4. GitHub profile/org links: github.com/owner
  const ghMatches = html.matchAll(/https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_\-]{2,40})(?:["'/?#\s]|$)/gi);
  for (const m of ghMatches) {
    const user = (m[1] || '').trim();
    if (user && !GITHUB_RESERVED.has(user.toLowerCase())) {
      result.githubUsers.push(user);
    }
  }

  // 5. Telegram channel links: t.me/channel
  const tgMatches = html.matchAll(/https?:\/\/(?:www\.)?t\.me\/([a-zA-Z0-9_]{4,32})(?:["'/?#\s]|$)/gi);
  for (const m of tgMatches) {
    const ch = (m[1] || '').trim();
    if (ch && !['joinchat', 'share', 'addstickers', 'iv', 's'].includes(ch.toLowerCase())) {
      result.telegramChannels.push(ch);
    }
  }

  // Deduplicate
  result.twitterHandles = Array.from(new Set(result.twitterHandles));
  result.youtubeQueries = Array.from(new Set(result.youtubeQueries));
  result.githubUsers = Array.from(new Set(result.githubUsers));
  result.telegramChannels = Array.from(new Set(result.telegramChannels));

  return result;
}

/**
 * 快速检查某个图片 URL 是否真实可用 (支持 200 与直接图片类型)
 */
export async function verifyImageUrl(url: string, timeoutMs = 2200): Promise<boolean> {
  if (!url) return false;
  // Google / YouTube / Gstatic / GitHub CDN 是高可用的，直接返回通过
  if (
    url.includes('ggpht.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('avatars.githubusercontent.com') ||
    url.includes('gstatic.com') ||
    url.startsWith('data:')
  ) {
    return true;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    return ct.includes('image') || res.status === 200;
  } catch {
    return false;
  }
}

export type SocialPlatformType = 'twitter' | 'youtube' | 'github' | 'telegram' | 'googleplay' | 'chromestore' | 'facebook' | 'instagram' | 'discord' | null;

/**
 * 从输入 URL 中直接提取社交媒体与各官方平台及账号/包名信息
 */
export function extractSocialFromUrl(rawUrl: string): { 
  platform: SocialPlatformType; 
  handle?: string; 
  query?: string;
  extraId?: string;
} {
  if (!rawUrl) return { platform: null };
  const clean = rawUrl.trim();

  // Google Play (e.g. play.google.com/store/apps/details?id=com.google.android.youtube)
  if (clean.includes('play.google.com')) {
    const pkgMatch = clean.match(/[?&]id=([a-zA-Z0-9_\.]+)/i);
    if (pkgMatch && pkgMatch[1]) {
      return { platform: 'googleplay', handle: pkgMatch[1], extraId: pkgMatch[1] };
    }
    return { platform: 'googleplay' };
  }

  // Chrome Web Store (e.g. chromewebstore.google.com/detail/slug/extid)
  if (clean.includes('chromewebstore.google.com')) {
    const extMatch = clean.match(/detail\/[^\/]+\/([a-z]{32})/i) || clean.match(/\/([a-z]{32})/i);
    if (extMatch && extMatch[1]) {
      return { platform: 'chromestore', handle: extMatch[1], extraId: extMatch[1] };
    }
    return { platform: 'chromestore' };
  }

  // Facebook (e.g. facebook.com/pagename or fb.me/pagename)
  if (clean.includes('facebook.com') || clean.includes('fb.me')) {
    const fbMatch = clean.match(/(?:facebook\.com|fb\.me)\/([a-zA-Z0-9_\.]{3,50})(?:[/?#]|$)/i);
    if (fbMatch && fbMatch[1] && !['groups', 'events', 'watch', 'marketplace', 'gaming', 'pages'].includes(fbMatch[1].toLowerCase())) {
      return { platform: 'facebook', handle: fbMatch[1] };
    }
    return { platform: 'facebook' };
  }

  // Instagram (e.g. instagram.com/username or threads.net/@username)
  if (clean.includes('instagram.com') || clean.includes('threads.net')) {
    const igMatch = clean.match(/(?:instagram\.com|threads\.net)\/@?([a-zA-Z0-9_\.]{2,30})(?:[/?#]|$)/i);
    if (igMatch && igMatch[1] && !['explore', 'reels', 'direct', 'stories'].includes(igMatch[1].toLowerCase())) {
      return { platform: 'instagram', handle: igMatch[1] };
    }
    return { platform: 'instagram' };
  }

  // Discord (e.g. discord.gg/code or discord.com/invite/code)
  if (clean.includes('discord.gg') || clean.includes('discord.com/invite')) {
    const dcMatch = clean.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_\-]+)/i);
    if (dcMatch && dcMatch[1]) {
      return { platform: 'discord', handle: dcMatch[1], extraId: dcMatch[1] };
    }
    return { platform: 'discord' };
  }

  // Twitter / X
  const twMatch = clean.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,30})(?:[/?#]|$)/i);
  if (twMatch && twMatch[1] && !TWITTER_RESERVED.has(twMatch[1].toLowerCase())) {
    return { platform: 'twitter', handle: twMatch[1] };
  }

  // YouTube
  const ytHandleMatch = clean.match(/youtube\.com\/@([a-zA-Z0-9_\-\.]{2,50})(?:[/?#]|$)/i);
  if (ytHandleMatch && ytHandleMatch[1]) {
    return { platform: 'youtube', handle: ytHandleMatch[1], query: `@${ytHandleMatch[1]}` };
  }
  const ytUserMatch = clean.match(/youtube\.com\/(?:c|user|channel)\/([a-zA-Z0-9_\-]{2,50})(?:[/?#]|$)/i);
  if (ytUserMatch && ytUserMatch[1]) {
    return { platform: 'youtube', handle: ytUserMatch[1], query: ytUserMatch[1] };
  }

  // GitHub
  const ghMatch = clean.match(/github\.com\/([a-zA-Z0-9_\-]{2,40})(?:[/?#]|$)/i);
  if (ghMatch && ghMatch[1] && !GITHUB_RESERVED.has(ghMatch[1].toLowerCase())) {
    return { platform: 'github', handle: ghMatch[1] };
  }

  // Telegram
  const tgMatch = clean.match(/t\.me\/([a-zA-Z0-9_]{4,32})(?:[/?#]|$)/i);
  if (tgMatch && tgMatch[1] && !['joinchat', 'share', 'addstickers', 'iv', 's'].includes(tgMatch[1].toLowerCase())) {
    return { platform: 'telegram', handle: tgMatch[1] };
  }

  return { platform: null };
}
export function buildTwitterAvatarUrl(screenName: string): string {
  const clean = screenName.replace(/^@/, '').trim();
  // unavatar.io/x/{screenName} 具备极高稳定性，直接 302 重定向到 Twitter 原生 400x400 / original 级别头像
  return `https://unavatar.io/x/${clean}?fallback=false`;
}

/**
 * 从 GitHub 组织或用户提取 400×400 高清头像
 */
export function buildGitHubAvatarUrl(username: string): string {
  const clean = username.replace(/^@/, '').trim();
  return `https://avatars.githubusercontent.com/${clean}?s=400`;
}

/**
 * 从 Telegram 频道或群组提取头像
 */
export function buildTelegramAvatarUrl(channel: string): string {
  const clean = channel.replace(/^@/, '').trim();
  return `https://t.me/i/userpic/320/${clean}.jpg`;
}
