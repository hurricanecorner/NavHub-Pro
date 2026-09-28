/**
 * Portal Multi-Platform Icon & Avatar Search Service
 * 针对各主流平台（Google Play、Chrome Web Store、Facebook、Instagram、Discord、YouTube、App Store）
 * 提供官方超清图标及头像检索与元数据抓取适配
 */

export type PortalPlatformId =
  | 'all'
  | 'youtube'
  | 'appstore'
  | 'googleplay'
  | 'chromestore'
  | 'facebook'
  | 'instagram'
  | 'discord';

export interface PortalIconItem {
  id: string;
  platform: 'youtube' | 'appstore' | 'googleplay' | 'chromestore' | 'facebook' | 'instagram' | 'discord';
  title: string;
  subtitle?: string;
  badge: string;
  icon1024?: string;
  icon512?: string;
  iconUrl: string;
  profileUrl?: string;
  description?: string;
  sizeLabel?: string;
  extraMeta?: Record<string, any>;
}

const COMMON_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

/**
 * 1. Google Play 官方应用与 512×512 HD 原画图标检索
 */
export async function searchGooglePlay(query: string, limit = 6): Promise<PortalIconItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  const results: PortalIconItem[] = [];
  const seenIds = new Set<string>();

  try {
    // Check if query is directly a Google Play URL or package name
    const pkgMatch = clean.match(/id=([a-zA-Z0-9_\.]+)/i) || (clean.includes('.') && clean.match(/^[a-zA-Z][a-zA-Z0-9_\.]+\.[a-zA-Z0-9_]+$/) ? [null, clean] : null);
    
    if (pkgMatch && pkgMatch[1]) {
      const pkgId = pkgMatch[1];
      try {
        const detailRes = await fetch(`https://play.google.com/store/apps/details?id=${encodeURIComponent(pkgId)}&hl=zh&gl=US`, {
          headers: { 'User-Agent': COMMON_USER_AGENT, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
          signal: AbortSignal.timeout(3500)
        });
        if (detailRes.ok) {
          const html = await detailRes.text();
          const ogTitle = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i)?.[1]?.replace(/\s*-\s*Google Play.*$/i, '').trim();
          const ogImage = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
          const ogDesc = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i)?.[1];
          
          if (ogImage) {
            const hdIcon = ogImage.replace(/=s\d+[^"'\s]*/, '=s512');
            results.push({
              id: pkgId,
              platform: 'googleplay',
              title: ogTitle || pkgId,
              subtitle: pkgId,
              badge: '512×512 Google Play',
              icon512: hdIcon,
              iconUrl: hdIcon,
              profileUrl: `https://play.google.com/store/apps/details?id=${pkgId}`,
              description: ogDesc || `${ogTitle || pkgId} Google Play 官方安卓应用`,
              sizeLabel: '512×512'
            });
            return results;
          }
        }
      } catch {}
    }

    // General Search on Google Play
    const searchRes = await fetch(`https://play.google.com/store/search?q=${encodeURIComponent(clean)}&c=apps&hl=zh&gl=US`, {
      headers: { 'User-Agent': COMMON_USER_AGENT, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
      signal: AbortSignal.timeout(4000)
    });

    if (searchRes.ok) {
      const html = await searchRes.text();
      const pkgMatches = Array.from(html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9_\.]+)/g));
      const packageIds: string[] = [];
      
      for (const m of pkgMatches) {
        const id = m[1];
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          packageIds.push(id);
          if (packageIds.length >= limit) break;
        }
      }

      // Fetch detail metadata in parallel for top candidates
      const detailPromises = packageIds.map(async (pkgId) => {
        try {
          const dRes = await fetch(`https://play.google.com/store/apps/details?id=${encodeURIComponent(pkgId)}&hl=zh&gl=US`, {
            headers: { 'User-Agent': COMMON_USER_AGENT, 'Accept-Language': 'zh-CN,zh;q=0.9' },
            signal: AbortSignal.timeout(3000)
          });
          if (!dRes.ok) return null;
          const dHtml = await dRes.text();
          const title = dHtml.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i)?.[1]?.replace(/\s*-\s*Google Play.*$/i, '').trim();
          const image = dHtml.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
          const desc = dHtml.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i)?.[1];
          
          if (!image) return null;
          const hdIcon = image.replace(/=s\d+[^"'\s]*/, '=s512');
          return {
            id: pkgId,
            platform: 'googleplay' as const,
            title: title || pkgId,
            subtitle: pkgId,
            badge: '512×512 Google Play',
            icon512: hdIcon,
            iconUrl: hdIcon,
            profileUrl: `https://play.google.com/store/apps/details?id=${pkgId}`,
            description: desc || `${title || pkgId} 官方安卓版应用`,
            sizeLabel: '512×512'
          };
        } catch {
          return null;
        }
      });

      const parsedItems = await Promise.all(detailPromises);
      for (const item of parsedItems) {
        if (item) results.push(item);
      }
    }
  } catch (e: any) {
    console.error('searchGooglePlay error:', e?.message);
  }

  return results;
}

/**
 * 2. Chrome Web Store 谷歌应用商店扩展/插件 256×256 原图检索
 */
export async function searchChromeWebStore(query: string, limit = 6): Promise<PortalIconItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  const results: PortalIconItem[] = [];
  const seenIds = new Set<string>();

  try {
    // If URL contains extension ID
    const directIdMatch = clean.match(/detail\/[^/]+\/([a-z]{32})/i) || clean.match(/\b([a-z]{32})\b/i);
    if (directIdMatch && directIdMatch[1]) {
      const extId = directIdMatch[1];
      try {
        const detailRes = await fetch(`https://chromewebstore.google.com/detail/${extId}?hl=zh-CN`, {
          headers: { 'User-Agent': COMMON_USER_AGENT },
          signal: AbortSignal.timeout(3500)
        });
        if (detailRes.ok) {
          const html = await detailRes.text();
          const title = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i)?.[1]?.replace(/\s*-\s*Chrome\s*应用商店.*$/i, '').trim();
          const image = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
          const desc = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i)?.[1];
          if (image) {
            const hdIcon = image.replace(/=s\d+[^"'\s]*/, '=s256-rj-sc0x00ffffff');
            results.push({
              id: extId,
              platform: 'chromestore',
              title: title || extId,
              subtitle: 'Chrome 扩展插件',
              badge: '256×256 Chrome Store',
              icon512: hdIcon,
              iconUrl: hdIcon,
              profileUrl: `https://chromewebstore.google.com/detail/${extId}`,
              description: desc || `${title || extId} Chrome 官方扩展`,
              sizeLabel: '256×256'
            });
            return results;
          }
        }
      } catch {}
    }

    // Chrome Web Store search query
    const searchRes = await fetch(`https://chromewebstore.google.com/search/${encodeURIComponent(clean)}?hl=zh-CN`, {
      headers: { 'User-Agent': COMMON_USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });

    if (searchRes.ok) {
      const html = await searchRes.text();
      const extMatches = Array.from(html.matchAll(/\/detail\/([^\/]+)\/([a-z]{32})/g));
      const extList: Array<{ slug: string; id: string }> = [];

      for (const m of extMatches) {
        const id = m[2];
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          extList.push({ slug: m[1], id });
          if (extList.length >= limit) break;
        }
      }

      // Fetch detail metadata in parallel
      const detailTasks = extList.map(async ({ slug, id }) => {
        try {
          const dRes = await fetch(`https://chromewebstore.google.com/detail/${slug}/${id}?hl=zh-CN`, {
            headers: { 'User-Agent': COMMON_USER_AGENT },
            signal: AbortSignal.timeout(3000)
          });
          if (!dRes.ok) return null;
          const dHtml = await dRes.text();
          const title = dHtml.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i)?.[1]?.replace(/\s*-\s*Chrome\s*应用商店.*$/i, '').trim();
          const image = dHtml.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
          const desc = dHtml.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i)?.[1];
          if (!image) return null;
          const hdIcon = image.replace(/=s\d+[^"'\s]*/, '=s256-rj-sc0x00ffffff');
          return {
            id,
            platform: 'chromestore' as const,
            title: title || slug,
            subtitle: 'Chrome 官方扩展',
            badge: '256×256 Chrome Store',
            icon512: hdIcon,
            iconUrl: hdIcon,
            profileUrl: `https://chromewebstore.google.com/detail/${slug}/${id}`,
            description: desc || `${title || slug} Chrome 应用商店官方扩展插件`,
            sizeLabel: '256×256'
          };
        } catch {
          return null;
        }
      });

      const parsedItems = await Promise.all(detailTasks);
      for (const item of parsedItems) {
        if (item) results.push(item);
      }
    }
  } catch (e: any) {
    console.error('searchChromeWebStore error:', e?.message);
  }

  return results;
}

/**
 * 3. Facebook 官方品牌公共主页 / 账号 500×500 高清头像检索
 */
export async function searchFacebook(query: string): Promise<PortalIconItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  // Extract possible username/handle candidates
  const handles: string[] = [];
  const urlMatch = clean.match(/(?:facebook\.com|fb\.me)\/([a-zA-Z0-9_\.]{3,50})/i);
  if (urlMatch && urlMatch[1]) {
    handles.push(urlMatch[1]);
  } else {
    // Generate clean handles
    const compact = clean.replace(/[@\s\-_\.]/g, '');
    const normal = clean.replace(/[@\s]/g, '');
    if (compact) handles.push(compact);
    if (normal && normal !== compact) handles.push(normal);
    if (clean.includes(' ')) {
      handles.push(clean.replace(/\s+/g, '.'));
    }
  }

  const results: PortalIconItem[] = [];

  for (const handle of handles.slice(0, 3)) {
    try {
      // Query Graph API picture endpoint with manual redirect inspection
      const graphRes = await fetch(`https://graph.facebook.com/${encodeURIComponent(handle)}/picture?type=large&width=500&height=500`, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(3000)
      });

      const directLocation = graphRes.headers.get('location');
      if (graphRes.status === 302 && directLocation) {
        results.push({
          id: handle,
          platform: 'facebook',
          title: `${clean} (Facebook 官方主页)`,
          subtitle: `@${handle}`,
          badge: '500×500 Facebook',
          icon512: directLocation,
          iconUrl: directLocation,
          profileUrl: `https://www.facebook.com/${handle}`,
          description: `${clean} Facebook 官方公共主页 / 品牌账号`,
          sizeLabel: '500×500'
        });
        break;
      }
    } catch {}
  }

  return results;
}

/**
 * 4. Instagram 官方主页与品牌原画头像检索
 */
export async function searchInstagram(query: string): Promise<PortalIconItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  const handles: string[] = [];
  const urlMatch = clean.match(/(?:instagram\.com|threads\.net)\/@?([a-zA-Z0-9_\.]{2,30})/i);
  if (urlMatch && urlMatch[1]) {
    handles.push(urlMatch[1]);
  } else {
    const compact = clean.replace(/[@\s\-_\.]/g, '').toLowerCase();
    const normal = clean.replace(/[@\s]/g, '').toLowerCase();
    if (compact) handles.push(compact);
    if (normal && normal !== compact) handles.push(normal);
  }

  const results: PortalIconItem[] = [];

  for (const handle of handles.slice(0, 3)) {
    try {
      // Threads uses Meta's official Instagram CDN for account avatars without login requirement
      const threadsRes = await fetch(`https://www.threads.net/@${encodeURIComponent(handle)}`, {
        headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
        signal: AbortSignal.timeout(4500)
      });
      if (threadsRes.ok) {
        const html = await threadsRes.text();
        const rawOgImage = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
        const ogTitle = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i)?.[1]?.replace(/&[^;]+;/g, ' ').trim();
        
        if (rawOgImage && rawOgImage.includes('cdninstagram.com') && !rawOgImage.includes('rsrc.php')) {
          const ogImage = rawOgImage.replace(/&amp;/g, '&');
          results.push({
            id: handle,
            platform: 'instagram',
            title: ogTitle || `${clean} (@${handle})`,
            subtitle: `@${handle}`,
            badge: '官方 Instagram 原画',
            icon512: ogImage,
            iconUrl: ogImage,
            profileUrl: `https://www.instagram.com/${handle}`,
            description: `${clean} Instagram 官方主页`,
            sizeLabel: '高清原图'
          });
          break;
        }
      }
    } catch {}
  }

  return results;
}

/**
 * 5. Discord 官方社区服务器与应用 512×512 图标检索
 */
export async function searchDiscord(query: string): Promise<PortalIconItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  const codes: string[] = [];
  const inviteMatch = clean.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_\-]+)/i);
  if (inviteMatch && inviteMatch[1]) {
    codes.push(inviteMatch[1]);
  } else {
    const code = clean.replace(/[@\s]/g, '').toLowerCase();
    if (code) codes.push(code);
    if (code.includes('.')) {
      codes.push(code.split('.')[0]);
    }
  }

  const results: PortalIconItem[] = [];

  for (const code of codes.slice(0, 3)) {
    try {
      const inviteRes = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, {
        headers: { 'User-Agent': COMMON_USER_AGENT },
        signal: AbortSignal.timeout(3000)
      });

      if (inviteRes.ok) {
        const data = await inviteRes.json();
        const guild = data.guild;
        if (guild && guild.icon) {
          const isGif = guild.icon.startsWith('a_');
          const ext = isGif ? 'gif' : 'png';
          const iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=512`;
          const memberCount = data.approximate_member_count ? `${data.approximate_member_count.toLocaleString()} 位成员` : 'Discord 认证社区';
          results.push({
            id: guild.id,
            platform: 'discord',
            title: guild.name,
            subtitle: memberCount,
            badge: '512×512 Discord',
            icon512: iconUrl,
            iconUrl,
            profileUrl: `https://discord.gg/${code}`,
            description: guild.description || `${guild.name} Discord 官方社区服务器`,
            sizeLabel: '512×512',
            extraMeta: { members: data.approximate_member_count }
          });
          break;
        }
      }
    } catch {}
  }

  return results;
}
