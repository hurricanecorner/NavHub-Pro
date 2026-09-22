import express from 'express';
import path from 'path';
import dns from 'dns';
import { GoogleGenAI } from '@google/genai';
import { detectAppStoreDevices, parseAppStoreUrl, AppStoreDeviceId } from './appStoreConstants';
import {
  detectCountrySync,
  CCTLD_COUNTRY_MAP,
  FAMOUS_DOMAIN_COUNTRY_MAP,
  containsChinese,
  hasChineseICPOrGovRecord
} from './countryDetector';
import {
  formatCountZh,
  formatBytesZh,
  formatAppStoreStatsZh,
  formatGitHubStatsZh,
  detectStatsSync,
  DOMAIN_STATS_MAP
} from './domainStats';
import {
  sanitizeDescriptionText,
  sanitizeTitleText,
  matchMajorServiceRule
} from './descriptionCleaner';
import {
  generateLetterIcon,
  parseManifestIcons,
  isLowQualityFavicon
} from './services/highResIconService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Probe remote web app manifest for high-resolution icons (like 512x512 or 192x192)
  async function probeRemoteManifest(baseUrl: string, htmlContent?: string) {
    try {
      let manifestUrl = '';
      if (htmlContent) {
        const match = htmlContent.match(/<link\s+[^>]*?rel\s*=\s*["']manifest["'][^>]*?href\s*=\s*["']([^"']+)["']/i) ||
                      htmlContent.match(/<link\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?rel\s*=\s*["']manifest["']/i);
        if (match && match[1]) {
          try {
            manifestUrl = new URL(match[1], baseUrl).href;
          } catch {}
        }
      }

      const potentialUrls = manifestUrl
        ? [manifestUrl]
        : [
            new URL('/manifest.json', baseUrl).href,
            new URL('/site.webmanifest', baseUrl).href,
            new URL('/manifest.webmanifest', baseUrl).href,
          ];

      for (const testUrl of potentialUrls) {
        try {
          const res = await fetch(testUrl, {
            signal: AbortSignal.timeout(2200),
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('json') || contentType.includes('manifest') || contentType.includes('text') || contentType.includes('octet-stream')) {
              const data = await res.json();
              const icons = parseManifestIcons(data, testUrl);
              if (icons && icons.length > 0) {
                return icons;
              }
            }
          }
        } catch {}
      }
    } catch {}
    return [];
  }

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Proxy image to avoid browser CORS/tainted canvas issues
  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    } catch (e: any) {
      console.error('Image proxy error:', e?.message || e);
      return res.status(500).send('Error proxying image');
    }
  });

  // API: Notion Proxy to completely bypass browser CORS limitations
  app.use('/api/notion', async (req, res) => {
    try {
      let subPath = req.url || '';
      if (!subPath.startsWith('/')) {
        subPath = '/' + subPath;
      }
      if (!subPath.startsWith('/v1')) {
        subPath = '/v1' + subPath;
      }
      const targetUrl = `https://api.notion.com${subPath}`;

      const headers: Record<string, string> = {
        'Notion-Version': (req.headers['notion-version'] as string) || '2022-06-28',
      };
      if (req.headers['authorization']) {
        headers['Authorization'] = req.headers['authorization'] as string;
      }
      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const notionRes = await fetch(targetUrl, fetchOptions);
      const contentType = notionRes.headers.get('content-type') || 'application/json';
      res.status(notionRes.status);
      res.setHeader('Content-Type', contentType);
      
      const data = await notionRes.text();
      return res.send(data);
    } catch (error: any) {
      console.error('Notion Proxy Error:', error);
      return res.status(500).json({ error: error?.message || 'Notion proxy failed' });
    }
  });

  // Helper: Lookup or Search Apple App Store for high-res icons (1024x1024 & 512x512)
  async function lookupOrSearchAppStore(termOrUrl: string, defaultCountry = 'cn', device: AppStoreDeviceId = 'all') {
    const trimmed = (termOrUrl || '').trim();
    if (!trimmed) return [];

    const parsedUrl = parseAppStoreUrl(trimmed);
    const targetCountry = (parsedUrl.country || defaultCountry || 'cn').toLowerCase();
    const id = parsedUrl.id;
    const slugName = parsedUrl.slug;

    let searchUrls: string[] = [];

    if (id) {
      searchUrls.push(`https://itunes.apple.com/lookup?id=${id}&country=${targetCountry}`);
      if (targetCountry !== 'us') {
        searchUrls.push(`https://itunes.apple.com/lookup?id=${id}&country=us`);
      }
      if (slugName) {
        const entity = device === 'mac' ? 'macSoftware' : device === 'ipad' ? 'iPadSoftware' : 'software';
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(slugName)}&country=${targetCountry}&entity=${entity}&limit=6`);
      }
    } else {
      // Query based on device
      if (device === 'mac') {
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=macSoftware&limit=10`);
        if (targetCountry !== 'us') {
          searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=us&entity=macSoftware&limit=8`);
        }
      } else if (device === 'ipad') {
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=iPadSoftware&limit=10`);
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=software&limit=8`);
      } else if (device === 'watch') {
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=software&limit=12`);
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed + ' watch')}&country=${targetCountry}&entity=software&limit=8`);
      } else if (device === 'vision') {
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=software&limit=12`);
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed + ' vision')}&country=${targetCountry}&entity=software&limit=8`);
      } else if (device === 'all') {
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=software&limit=10`);
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=macSoftware&limit=6`);
      } else {
        // Default: iPhone
        searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=${targetCountry}&entity=software&limit=10`);
        if (targetCountry !== 'us') {
          searchUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&country=us&entity=software&limit=8`);
        }
      }
    }

    const allItems: any[] = [];
    const seenIds = new Set<string | number>();

    for (const u of searchUrls) {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(u, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });
        clearTimeout(to);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            for (const r of data.results) {
              if (seenIds.has(r.trackId)) continue;
              seenIds.add(r.trackId);

              const raw512 = (r.artworkUrl512 || r.artworkUrl100 || '') as string;
              // Generate 1024x1024 and 512x512 ultra-crisp PNG URLs from Apple CDN
              const icon1024 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/1024x1024bb.').replace(/\.jpg$/, '.png') : '';
              const icon512 = raw512 ? raw512.replace(/\/[0-9]+x[0-9]+bb\./, '/512x512bb.').replace(/\.jpg$/, '.png') : '';
              const rawClean = (r.trackName || '').split(/[-|_—–·]/)[0].trim();
              const cleanName = rawClean || r.trackName || '';

              const detectedDevices = detectAppStoreDevices(r, device);

              allItems.push({
                trackId: r.trackId,
                trackName: r.trackName as string,
                cleanName,
                artistName: r.artistName as string,
                icon1024: icon1024 || raw512,
                icon512: icon512 || raw512,
                iconRaw: raw512,
                devices: detectedDevices,
                primaryDevice: detectedDevices[0] || (r.kind === 'mac-software' ? 'Mac' : 'iPhone'),
                genres: (r.genres || []) as string[],
                description: r.description ? (r.description.split('\n')[0].trim().slice(0, 160) as string) : '',
                appStoreUrl: r.trackViewUrl as string,
                country: targetCountry,
                formattedPrice: r.formattedPrice || (r.price === 0 ? '免费' : undefined),
                version: r.version,
                averageUserRating: r.averageUserRating,
                userRatingCount: r.userRatingCount,
                fileSizeBytes: r.fileSizeBytes,
                sellerName: r.sellerName,
                primaryGenreName: r.primaryGenreName,
              });
            }
            if (allItems.length >= 10) break;
          }
        }
      } catch {
        // try next fallback URL
      }
    }

    if (device && device !== 'all') {
      const targetLabel = device === 'mac' ? 'Mac' : device === 'ipad' ? 'iPad' : device === 'watch' ? 'Watch' : device === 'vision' ? 'Vision' : 'iPhone';
      allItems.sort((a, b) => {
        const aHas = a.devices.includes(targetLabel) ? 1 : 0;
        const bHas = b.devices.includes(targetLabel) ? 1 : 0;
        return bHas - aHas;
      });
    }

    return allItems;
  }

  // Enhanced Country/Region detection with AI, heuristics, CDN anti-misattribution and guaranteed fallback
  async function detectCountryOrRegion(
    rawUrl: string,
    htmlSnippet?: string,
    hints?: { title?: string; description?: string; aiCountry?: string }
  ): Promise<string> {
    try {
      // 1. AI semantic inference validation (if Gemini identified a country)
      if (hints?.aiCountry && typeof hints.aiCountry === 'string') {
        const cleanAi = hints.aiCountry.trim();
        if (cleanAi.length >= 2 && cleanAi.length <= 8) {
          return cleanAi;
        }
      }

      let hostname = '';
      try {
        hostname = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname.toLowerCase();
      } catch {
        hostname = rawUrl.toLowerCase().split('/')[0];
      }
      const cleanHost = hostname.replace(/^www\./, '');

      // 2. High-precision rule detection from countryDetector
      const syncResult = detectCountrySync(rawUrl, {
        html: htmlSnippet,
        title: hints?.title,
        description: hints?.description,
      });

      const isKnownDomain = Object.keys(FAMOUS_DOMAIN_COUNTRY_MAP).some(d => cleanHost === d || cleanHost.endsWith('.' + d));
      const hasIcp = htmlSnippet ? hasChineseICPOrGovRecord(htmlSnippet) : false;
      const isApple = rawUrl.includes('apple.com');
      const isCcTld = Object.keys(CCTLD_COUNTRY_MAP).some(tld => cleanHost.endsWith('.' + tld));

      // If matched a deterministic signature, return immediately
      if (isKnownDomain || hasIcp || isApple || isCcTld) {
        return syncResult;
      }

      // 3. DNS + IP Geo-location with CDN anti-misattribution safeguard
      try {
        const { address } = await dns.promises.lookup(hostname);
        const geoRes = await fetch(`http://ip-api.com/json/${address}?lang=zh-CN`, {
          signal: AbortSignal.timeout(2000),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === 'success' && geoData.country) {
            let ipCountry = geoData.country;
            if (geoData.countryCode === 'HK') ipCountry = '中国香港';
            else if (geoData.countryCode === 'TW') ipCountry = '中国台湾';
            else if (geoData.countryCode === 'MO') ipCountry = '中国澳门';

            // CDN Anti-Misattribution: If IP points to US but site content is in Chinese,
            // it is a Cloudflare/Vercel/Fastly/AWS CDN node serving a Chinese website!
            const textCheck = `${hints?.title || ''} ${hints?.description || ''} ${htmlSnippet?.slice(0, 3000) || ''}`;
            if (ipCountry === '美国' && containsChinese(textCheck)) {
              return '中国';
            }
            return ipCountry;
          }
        }
      } catch {}

      // 4. Return the comprehensive synchronous inference
      if (syncResult) {
        return syncResult;
      }
    } catch {}

    // 5. Guaranteed Fallback: "无论有无把握都要自动生成地区标签"
    const textBlob = `${hints?.title || ''} ${hints?.description || ''} ${rawUrl}`;
    return containsChinese(textBlob) ? '中国' : '美国';
  }

  // API: Dedicated App Store Search Endpoint
  app.post('/api/search-app-store', async (req, res) => {
    const query = (req.body?.query || '').trim();
    const country = (req.body?.country || 'cn').trim().toLowerCase();
    const device = (req.body?.device || 'all') as AppStoreDeviceId;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    try {
      const results = await lookupOrSearchAppStore(query, country, device);
      return res.json({ success: true, results });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to search App Store' });
    }
  });

  // API: Fetch website metadata & icons
  app.post('/api/fetch-meta', async (req, res) => {
    let rawUrl = (req.body?.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const domainParts = hostname.replace(/^www\./, '').split('.');
      const mainDomainName = domainParts[0] || hostname;
      const cleanRootDomain = domainParts.slice(-2).join('.');
      const defaultName = mainDomainName.charAt(0).toUpperCase() + mainDomainName.slice(1);

      // Direct Handler: If the user inputs an App Store link (e.g. apps.apple.com/cn/app/...)
      if (hostname.includes('apple.com') && (rawUrl.includes('/app/') || rawUrl.includes('/id') || rawUrl.includes('apps.apple.com'))) {
        const appResults = await lookupOrSearchAppStore(rawUrl);
        if (appResults && appResults.length > 0) {
          const app = appResults[0];
          const detectedCountry = await detectCountryOrRegion(rawUrl, undefined, {
            title: app.cleanName,
            description: app.description
          });
          const statsDesc = formatAppStoreStatsZh(app);
          const titles = [
            { source: 'App Store 精简名称', title: app.cleanName },
            { source: 'App Store 完整标题', title: app.trackName },
          ];
          const descriptions = [
            ...(statsDesc ? [{ source: '智能统计描述', description: statsDesc }] : []),
            { source: 'App Store 官方简介', description: app.description || `${app.cleanName} 官方应用` },
            { source: '功能定位描述', description: `${app.cleanName} 苹果 App Store 官方正版应用下载与详情` },
          ];
          const icons = [
            { source: 'App Store 1024px', iconUrl: app.icon1024 },
            { source: 'App Store 512px', iconUrl: app.icon512 },
          ].filter(i => i.iconUrl);
          const otherTags = Array.from(new Set([...(app.genres || []), 'App Store', 'iOS', '苹果应用'])).filter(t => t !== detectedCountry);
          const tags = [detectedCountry, ...otherTags];
          return res.json({
            success: true,
            title: app.cleanName,
            description: statsDesc || app.description || `${app.cleanName} 官方应用`,
            statsDescription: statsDesc,
            iconUrl: app.icon1024 || app.icon512,
            country: detectedCountry,
            tags,
            candidates: {
              titles,
              descriptions,
              icons,
            },
          });
        }
      }

      // Predefined knowledge for common sites for instantaneous response & high accuracy
      const SITE_PRESETS: Record<string, { title: string; desc: string[]; icon?: string; tags: string[] }> = {
        'google.com': {
          title: 'Google 谷歌',
          desc: [
            '全球领先的搜索引擎，提供精准高效的网页、图片、地图与资讯检索',
            'Google 官方搜索引擎与综合互联网产品入口',
            '探索世界信息，提供快速准确的智能搜索体验'
          ],
          tags: ['搜索', '工具', 'Google', '全球门户']
        },
        'google.cn': {
          title: 'Google 谷歌',
          desc: [
            '全球领先的搜索引擎，提供精准高效的网页、图片、地图与资讯检索',
            'Google 官方搜索引擎与综合互联网产品入口'
          ],
          tags: ['搜索', '工具', 'Google']
        },
        'baidu.com': {
          title: '百度一下',
          desc: [
            '全球最大的中文搜索引擎、致力于让网民更便捷地获取信息',
            '百度中文搜索，拥有庞大的中文网页索引与AI技术'
          ],
          tags: ['搜索', '中文门户', '常用']
        },
        'bing.com': {
          title: '微软 Bing',
          desc: [
            '微软旗下必应搜索引擎，搭载 AI 智能搜索与每日高清壁纸',
            '全球知名的智能搜索引擎，提供多语言精准检索'
          ],
          tags: ['搜索', '微软', 'AI搜索']
        },
        'github.com': {
          title: 'GitHub',
          desc: [
            '全球最大的代码托管与开源协作平台，汇聚全球顶尖开发者与开源项目',
            '面向开发者的代码版本管理、代码审查与开源社区'
          ],
          tags: ['开发', '开源', '代码托管', '程序员']
        },
        'bilibili.com': {
          title: '哔哩哔哩 (B站)',
          desc: [
            '国内知名的年轻人文化社区与视频弹幕网站，涵盖动画、游戏、科技与学习',
            '中国年轻一代标志性弹幕视频网站，海量优质UP主原创内容'
          ],
          tags: ['视频', '动漫', '弹幕', '社区']
        },
        'youtube.com': {
          title: 'YouTube',
          desc: [
            '全球最大的视频分享平台与创作者社区，探索海量原创视频与音乐',
            '全球视频分享平台，观看并分享来自世界各地的精彩视频'
          ],
          tags: ['视频', '影音', '创作者', '国际']
        },
        'notion.so': {
          title: 'Notion',
          desc: [
            '一站式工作空间，集笔记、文档、知识库、项目管理与AI助手于一体',
            '全能型笔记与团队协作生产力工具'
          ],
          tags: ['笔记', '生产力', '知识库', '项目管理']
        },
        'figma.com': {
          title: 'Figma',
          desc: [
            '新一代基于浏览器的协作式 UI/UX 设计与原型制作工具',
            '协同设计利器，支持多人实时协作界面设计与系统规范'
          ],
          tags: ['设计', 'UI/UX', '原型', '协作']
        },
        'chatgpt.com': {
          title: 'ChatGPT',
          desc: [
            'OpenAI 开发的通用人工智能助手，提供问答、代码编写与创意构思',
            '领先的对话式 AI 模型，助力高效工作与知识探索'
          ],
          tags: ['AI', '人工智能', 'OpenAI', '生产力']
        },
        'openai.com': {
          title: 'OpenAI',
          desc: [
            '探索安全通用人工智能的研发机构，ChatGPT 与 GPT 系列模型创造者',
            '前沿 AI 研究与商业化 API 平台'
          ],
          tags: ['AI', '大模型', 'OpenAI', '前沿科技']
        },
        'zhihu.com': {
          title: '知乎',
          desc: [
            '中文互联网高质量的问答社区与创作者聚集地',
            '有问题，就会有答案。汇聚各领域专业创作者的问答平台'
          ],
          tags: ['问答', '知识', '社区', '讨论']
        },
        'juejin.cn': {
          title: '稀土掘金',
          desc: [
            '面向开发者的技术内容分享与成长社区，汇聚前沿技术干货与掘金小册',
            '帮助开发者成长的技术交流平台'
          ],
          tags: ['前端', '后端', '开发者', '技术社区']
        },
        'v2ex.com': {
          title: 'V2EX',
          desc: [
            '创意工作者与程序员讨论分享的社区，关注科技、编程、设计与生活',
            '程序员与数字游民聚集的极客交流社区'
          ],
          tags: ['极客', '程序员', '社区', '讨论']
        },
        'sogou.com': {
          title: '搜狗搜索',
          desc: [
            '搜狗搜索是全球第三代互动式搜索引擎，独家支持微信公众号与知乎搜索，提供专业、精准、便捷的搜索服务',
            '搜狗官方搜索引擎，支持网页、微信文章、知乎、图片与学术搜索'
          ],
          tags: ['搜索', '中文门户', '微信搜索', '常用']
        },
        'www.sogou.com': {
          title: '搜狗搜索',
          desc: [
            '搜狗搜索是全球第三代互动式搜索引擎，独家支持微信公众号与知乎搜索，提供专业、精准、便捷的搜索服务',
            '搜狗官方搜索引擎，支持网页、微信文章、知乎、图片与学术搜索'
          ],
          tags: ['搜索', '中文门户', '微信搜索', '常用']
        },
        'fanyi.sogou.com': {
          title: '搜狗翻译',
          desc: [
            '搜狗翻译依托自研神经网络机器翻译技术，支持多语种文本、文档、网页与语音互译'
          ],
          tags: ['翻译', '语言工具', '搜狗']
        },
        'pinyin.sogou.com': {
          title: '搜狗输入法',
          desc: [
            '国内老牌中文输入法，词库超大，支持多端云同步与智能语音录入'
          ],
          tags: ['输入法', '汉字录入', '工具']
        }
      };

      const majorRule = matchMajorServiceRule(hostname, parsedUrl.pathname);
      const matchedPreset = SITE_PRESETS[hostname] || SITE_PRESETS[cleanRootDomain] || (majorRule ? {
        title: majorRule.defaultTitle,
        desc: [majorRule.officialDesc],
        tags: majorRule.tags
      } : undefined);

      let scrapedTitle = '';
      let ogTitle = '';
      let metaDescription = '';
      let ogDescription = '';
      let scrapedFavicon = '';
      let appleTouchIcon = '';
      let manifestHref = '';
      let ogImage = '';
      let pageTextSnippet = '';
      let rawHtml = '';

      // Run fetching tasks in parallel with short, aggressive timeouts for blazing speed
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);

      const htmlPromise = fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      })
        .then(async res => {
          if (res.ok) {
            const html = await res.text();
            rawHtml = html;
            // Title parsing
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch) {
              scrapedTitle = titleMatch[1].replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
            }

            // Meta tags parsing
            const metaMatches = html.matchAll(/<meta\s+([^>]*?)>/gi);
            for (const m of metaMatches) {
              const metaTag = m[1];
              const nameMatch = metaTag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i);
              const contentMatch = metaTag.match(/content\s*=\s*["']([^"']*)["']/i);
              if (nameMatch && contentMatch) {
                const name = nameMatch[1].toLowerCase();
                const content = contentMatch[1].trim();
                if (name === 'description' && !metaDescription) metaDescription = content;
                if (name === 'og:description' && !ogDescription) ogDescription = content;
                if (name === 'twitter:description' && !metaDescription) metaDescription = content;
                if (name === 'og:title' && !ogTitle) ogTitle = content;
                if (name === 'twitter:title' && !ogTitle) ogTitle = content;
                if (name === 'og:image' && !ogImage) ogImage = content;
              }
            }

            // Link tags parsing for icons
            const linkMatches = html.matchAll(/<link\s+([^>]*?)>/gi);
            for (const m of linkMatches) {
              const linkTag = m[1];
              const relMatch = linkTag.match(/rel\s*=\s*["']([^"']+)["']/i);
              const hrefMatch = linkTag.match(/href\s*=\s*["']([^"']+)["']/i);
              if (relMatch && hrefMatch) {
                const rel = relMatch[1].toLowerCase();
                const href = hrefMatch[1].trim();
                if (rel.includes('apple-touch-icon') && !appleTouchIcon) {
                  appleTouchIcon = href;
                } else if ((rel.includes('icon') || rel.includes('shortcut icon')) && !scrapedFavicon) {
                  scrapedFavicon = href;
                } else if (rel.includes('manifest') && !manifestHref) {
                  manifestHref = href;
                }
              }
            }

            // Body snippet
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
              pageTextSnippet = bodyMatch[1]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 400);
            }
          }
        })
        .catch(() => {});

      // Optional: Apple App Store query for apps (parallel with timeout)
      const itunesTask = async () => {
        if (hostname.includes('github.com') || hostname.includes('gitlab.com')) return null;
        const queries = [
          matchedPreset?.title,
          defaultName,
          mainDomainName,
        ].filter(Boolean) as string[];

        for (const q of queries) {
          try {
            const results = await lookupOrSearchAppStore(q, 'cn');
            if (results && results.length > 0) {
              return results[0];
            }
          } catch {
            // continue
          }
        }
        return null;
      };

      // Optional: GitHub repository stats in parallel
      const githubTask = async () => {
        const ghMatch = rawUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
        if (!ghMatch) return null;
        try {
          const owner = ghMatch[1];
          const repo = ghMatch[2].replace(/\.git$/, '');
          if (['features', 'topics', 'trending', 'collections', 'events', 'pricing', 'about', 'login', 'signup', 'explore', 'marketplace'].includes(owner.toLowerCase())) return null;
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), 2500);
          const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'NavHub-Bot' },
          });
          clearTimeout(to);
          if (ghRes.ok) {
            const data = await ghRes.json();
            return {
              owner: data.owner?.login || owner,
              repo: data.name || repo,
              stars: data.stargazers_count,
              forks: data.forks_count,
              language: data.language,
              license: data.license?.name,
            };
          }
        } catch {
          // GitHub fetch failed or rate limited
        }
        return null;
      };

      // Optional: Gemini AI request in parallel (2.5s timeout)
      const geminiTask = async () => {
        if (!process.env.GEMINI_API_KEY) return null;
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const prompt = `You are a concise metadata expert for a web navigation catalog.
Analyze this site info and generate accurate Chinese metadata for a navigation card:
URL: ${rawUrl}
Hostname: ${hostname}
Scraped Title: ${scrapedTitle || defaultName}

Return ONLY valid JSON matching this schema:
{
  "title": "Clean, concise brand or website name (e.g. 'Google', '哔哩哔哩', 'GitHub', 'Notion')",
  "description": "Crisp 1-sentence description (under 28 Chinese characters) explaining what this website or tool does",
  "statsDescription": "A highly accurate, metric-rich statistical description in Chinese (智能统计描述). Include verifiable figures, user scale, ratings, open-source stars, traffic ranking, content size, or industry status. Default in Chinese. Example: '全球月活超 2.5 亿 · 覆盖 180+ 国家 · 全球顶尖 AI 对话平台' or '托管开源仓库超 4 亿 · 注册开发者超 1 亿 · 全球最大的代码协作平台'.",
  "tags": ["tag1", "tag2", "tag3"],
  "country": "The primary country or region where this company, tool, or website originates (e.g. '中国', '美国', '日本', '英国', '德国', '法国', '韩国', '瑞典', '阿联酋', '新加坡', '加拿大', '澳大利亚', '中国香港', '中国台湾'). Must be in Chinese."
}`;

          const aiResponse = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' },
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 2500))
          ]);

          if (aiResponse?.text) {
            return JSON.parse(aiResponse.text) as {
              title?: string;
              description?: string;
              statsDescription?: string;
              tags?: string[];
              country?: string;
            };
          }
        } catch (e) {
          // AI timeout or error is fine
        }
        return null;
      };

      // Wait for parallel tasks
      const manifestTask = async () => {
        try {
          const base = `https://${hostname}`;
          const icons = await probeRemoteManifest(base, rawHtml);
          return icons;
        } catch {
          return [];
        }
      };

      const [, itunesData, geminiData, githubData, manifestData] = await Promise.all([
        htmlPromise,
        itunesTask(),
        geminiTask(),
        githubTask(),
        manifestTask(),
      ]);
      const appleMeta = itunesData;
      const aiResult = geminiData;
      clearTimeout(timeout);

      // Resolve relative icon URLs to absolute URLs
      const resolveUrl = (relativeUrl: string) => {
        if (!relativeUrl) return '';
        try {
          return new URL(relativeUrl, rawUrl).href;
        } catch {
          return relativeUrl;
        }
      };

      scrapedFavicon = resolveUrl(scrapedFavicon);
      appleTouchIcon = resolveUrl(appleTouchIcon);
      ogImage = resolveUrl(ogImage);

      // Standard Favicon and CDN URLs (Upgraded to 256px Ultra HD)
      const googleFavicon256 = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=256`;
      const googleFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;
      const duckduckgoFavicon = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
      const directFavicon = `${parsedUrl.protocol}//${hostname}/favicon.ico`;
      const directSvgFavicon = `${parsedUrl.protocol}//${hostname}/favicon.svg`;

      // Build Title Candidates
      const titleCandidates: Array<{ source: string; title: string }> = [];
      const cleanTitleStr = (t: string) => sanitizeTitleText(t);

      if (matchedPreset) {
        titleCandidates.push({ source: '官方精选', title: matchedPreset.title });
      }
      if (appleMeta?.cleanName) {
        titleCandidates.push({ source: 'App Store 规范名称', title: appleMeta.cleanName });
      }
      if (aiResult?.title) {
        titleCandidates.push({ source: 'AI 智能提炼', title: sanitizeTitleText(aiResult.title) });
      }
      const primaryScrapedTitle = cleanTitleStr(ogTitle || scrapedTitle || '');
      if (primaryScrapedTitle) {
        titleCandidates.push({ source: '网页标题', title: primaryScrapedTitle });
      }
      if (ogTitle && ogTitle !== primaryScrapedTitle) {
        const cleanOgT = sanitizeTitleText(ogTitle);
        if (cleanOgT) titleCandidates.push({ source: 'OpenGraph 标题', title: cleanOgT });
      }
      if (appleMeta?.trackName && appleMeta.trackName !== appleMeta.cleanName) {
        titleCandidates.push({ source: 'App Store 完整标题', title: appleMeta.trackName });
      }
      titleCandidates.push({ source: '域名名称', title: defaultName });

      // Detect Country or Region early for stats detection & tag assignment
      const candidatePrimaryTitle = primaryScrapedTitle || scrapedTitle || defaultName;
      const candidatePrimaryDesc = ogDescription || metaDescription || '';
      const detectedCountry = await detectCountryOrRegion(rawUrl, rawHtml, {
        title: candidatePrimaryTitle,
        description: candidatePrimaryDesc,
        aiCountry: aiResult?.country,
      });

      // Compute High-Precision Smart Statistical Description in Chinese
      let smartStatsDescription: string | null = null;

      // 1. If GitHub repo metadata is present (e.g. github.com/:owner/:repo)
      if (githubData) {
        smartStatsDescription = formatGitHubStatsZh(githubData);
      }

      // 2. If App Store metadata with user rating/count is present
      if (!smartStatsDescription && appleMeta && (appleMeta.averageUserRating || appleMeta.userRatingCount)) {
        smartStatsDescription = formatAppStoreStatsZh(appleMeta);
      }

      // 3. If AI returned a statsDescription
      if (!smartStatsDescription && aiResult?.statsDescription) {
        smartStatsDescription = sanitizeDescriptionText(aiResult.statsDescription);
      }

      // 4. High-Precision Domain, Sub-Application & Niche Intelligent Synthesis
      if (!smartStatsDescription) {
        const hasIcpChina = Boolean(rawHtml && /(?:ICP证|ICP备|网安备|公网安备)\s*[0-9A-Za-z\u4e00-\u9fa5]+/i.test(rawHtml));
        smartStatsDescription = detectStatsSync(rawUrl, {
          title: candidatePrimaryTitle,
          description: candidatePrimaryDesc,
          country: detectedCountry,
          hasIcp: hasIcpChina,
        });
      }

      // Clean official site descriptions thoroughly
      const cleanOgDesc = sanitizeDescriptionText(ogDescription);
      const cleanMetaDesc = sanitizeDescriptionText(metaDescription);
      const primaryScrapedDesc = cleanOgDesc || cleanMetaDesc;

      // Build Multiple Diverse Description Candidates
      // Priority 1: Official site native metadata (og:description or meta description)
      // As explicitly requested: 优先使用其自身的官方站点元数据（如 meta description 或 og:description）
      const descriptionCandidates: Array<{ source: string; description: string }> = [];

      if (primaryScrapedDesc) {
        descriptionCandidates.push({
          source: cleanOgDesc ? '官方站点原生描述 (OpenGraph)' : '官方站点原生描述 (Meta)',
          description: primaryScrapedDesc,
        });
        if (cleanMetaDesc && cleanMetaDesc !== cleanOgDesc) {
          descriptionCandidates.push({
            source: '网页 Meta 描述',
            description: cleanMetaDesc,
          });
        }
      }

      // Priority 2: Authoritative presets or major tech service rules
      if (matchedPreset && matchedPreset.desc) {
        matchedPreset.desc.forEach((d, idx) => {
          const cd = sanitizeDescriptionText(d);
          if (cd) {
            descriptionCandidates.push({
              source: idx === 0 ? '官方精炼定位' : '功能定位描述',
              description: cd,
            });
          }
        });
      }

      // Priority 3: AI-summarized description (clean, factual)
      if (aiResult?.description) {
        const cleanAiDesc = sanitizeDescriptionText(aiResult.description);
        if (cleanAiDesc) {
          descriptionCandidates.push({ source: 'AI 智能摘要', description: cleanAiDesc });
        }
      }

      // Priority 4: App Store official description (if app)
      if (appleMeta?.description) {
        const cleanAppleDesc = sanitizeDescriptionText(appleMeta.description);
        if (cleanAppleDesc) {
          descriptionCandidates.push({ source: 'App Store 官方简介', description: cleanAppleDesc });
        }
      }

      // Priority 5: Smart statistical description
      if (smartStatsDescription) {
        const cleanStats = sanitizeDescriptionText(smartStatsDescription);
        if (cleanStats) {
          descriptionCandidates.push({ source: '智能统计描述', description: cleanStats });
        }
      }

      // Fallback: If site had completely empty metadata, provide an honest factual domain label (no generic fluff)
      if (descriptionCandidates.length === 0) {
        descriptionCandidates.push({
          source: '官方站点访问',
          description: `${defaultName} 官方网站 · 域名 ${hostname}`,
        });
      }

      // Build Icon Candidates - prioritize high-res, beautifully regulated App Store icons
      const iconCandidates: Array<{ source: string; iconUrl: string }> = [];
      if (appleMeta?.icon1024) {
        iconCandidates.push({ source: 'App Store 1024px', iconUrl: appleMeta.icon1024 });
      }
      if (appleMeta?.icon512 && appleMeta.icon512 !== appleMeta.icon1024) {
        iconCandidates.push({ source: 'App Store 512px', iconUrl: appleMeta.icon512 });
      }
      if (manifestData && manifestData.length > 0) {
        for (const mi of manifestData.slice(0, 2)) {
          iconCandidates.push({ source: `Web App Manifest (${mi.sizeLabel})`, iconUrl: mi.url });
        }
      }
      iconCandidates.push({ source: 'Google Social 256px 超清', iconUrl: googleFavicon256 });
      if (appleTouchIcon) {
        iconCandidates.push({ source: 'Apple Touch 原图', iconUrl: appleTouchIcon });
      }
      if (scrapedFavicon) {
        iconCandidates.push({ source: '网站 Favicon', iconUrl: scrapedFavicon });
      }
      iconCandidates.push({ source: 'Google HD (256px)', iconUrl: googleFavicon });
      iconCandidates.push({ source: '矢量 SVG 图标', iconUrl: directSvgFavicon });
      iconCandidates.push({ source: 'DuckDuckGo', iconUrl: duckduckgoFavicon });
      if (ogImage) {
        iconCandidates.push({ source: '封面大图', iconUrl: ogImage });
      }
      iconCandidates.push({ source: '根目录 /favicon.ico', iconUrl: directFavicon });

      // Clean generated letter icon as guaranteed high-res fallback
      const letterIconCandidate = generateLetterIcon(primaryScrapedTitle || defaultName || hostname);
      iconCandidates.push({ source: '生成极简字标 (Clean Letter)', iconUrl: letterIconCandidate });

      // Deduplicate candidates
      const uniqueTitles = Array.from(
        new Map(titleCandidates.filter(t => t.title?.trim()).map(item => [item.title.trim(), item])).values()
      );
      const uniqueDescriptions = Array.from(
        new Map(descriptionCandidates.filter(d => d.description?.trim()).map(item => [item.description.trim(), item])).values()
      );
      const uniqueIcons = Array.from(
        new Map(iconCandidates.filter(i => i.iconUrl?.trim()).map(item => [item.iconUrl.trim(), item])).values()
      );

      // Tags: Ensure detected country/region is at the FIRST index
      const otherTags = Array.from(
        new Set([
          ...(matchedPreset?.tags || []),
          ...(appleMeta?.genres || []),
          ...(aiResult?.tags || []),
          defaultName,
        ])
      ).filter(t => t && t !== detectedCountry);

      const suggestedTags = [detectedCountry, ...otherTags];

      const finalTitle = uniqueTitles[0]?.title || defaultName;
      const finalDescription = uniqueDescriptions[0]?.description || '';
      const finalIcon = uniqueIcons[0]?.iconUrl || googleFavicon;

      return res.json({
        success: true,
        title: finalTitle,
        description: finalDescription,
        statsDescription: smartStatsDescription,
        iconUrl: finalIcon,
        country: detectedCountry,
        tags: suggestedTags,
        candidates: {
          titles: uniqueTitles,
          descriptions: uniqueDescriptions,
          icons: uniqueIcons,
        },
      });
    } catch (error: any) {
      console.error('fetch-meta error:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch metadata',
      });
    }
  });

  // API: Safe Image Proxy for CORS-free Canvas Super-Resolution & Compression
  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const imageRes = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      if (!imageRes.ok) {
        return res.status(imageRes.status).send('Failed to fetch remote image');
      }

      const contentType = imageRes.headers.get('content-type') || 'image/png';
      const arrayBuffer = await imageRes.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      return res.status(500).send(err?.message || 'Proxy error');
    }
  });

  // API: High-Definition Multi-Source Icon Probe Endpoint
  app.post('/api/probe-hd-icons', async (req, res) => {
    const rawUrl = (req.body?.url || '').trim();
    const siteTitle = (req.body?.title || '').trim();
    const currentIcon = (req.body?.currentIcon || '').trim();
    const targetSource = rawUrl || currentIcon;
    if (!targetSource) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    try {
      let hostname = '';
      const domainMatch = targetSource.match(/[?&]domain=([^&#]+)/i);
      if (domainMatch && domainMatch[1]) {
        hostname = domainMatch[1].toLowerCase().replace(/^www\./, '');
      } else {
        const parsedUrl = new URL(targetSource.startsWith('http') ? targetSource : `https://${targetSource}`);
        hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
      }

      const domainParts = hostname.split('.');
      const rootDomain = domainParts.slice(-2).join('.');
      const brandName = siteTitle || domainParts[0] || hostname;

      const candidates: Array<{
        source: string;
        url: string;
        badge: string;
        sizeLabel: string;
        isVector?: boolean;
        score: number;
      }> = [];

      // 1. Google Social V2 256px
      const google256 = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=256`;
      candidates.push({
        source: 'Google Social HD V2',
        url: google256,
        badge: '256×256 官方超清',
        sizeLabel: '256×256',
        score: 95,
      });

      // 2. Google S2 256px
      const googleS2 = `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;
      candidates.push({
        source: 'Google S2 HD',
        url: googleS2,
        badge: '256×256 高清',
        sizeLabel: '256×256',
        score: 90,
      });

      // 3. Apple Touch Icon probe
      const appleTouch = `https://${hostname}/apple-touch-icon.png`;
      candidates.push({
        source: 'Apple Touch 原生大图',
        url: appleTouch,
        badge: '180×180 原生',
        sizeLabel: '180×180',
        score: 88,
      });

      // 3.5. Web App Manifest high-res icons probe
      try {
        const manifestIcons = await probeRemoteManifest(`https://${hostname}`);
        for (const mi of manifestIcons) {
          candidates.push({
            source: `Web App Manifest (${mi.sizeLabel})`,
            url: mi.url,
            badge: `${mi.sizeLabel} PWA`,
            sizeLabel: mi.sizeLabel,
            score: mi.size >= 512 ? 97 : (mi.size >= 192 ? 93 : 86),
          });
        }
      } catch {}

      // 4. Vector SVG Favicon probe
      const svgFavicon = `https://${hostname}/favicon.svg`;
      candidates.push({
        source: '矢量 SVG 徽标',
        url: svgFavicon,
        badge: '无损矢量 SVG',
        sizeLabel: '矢量无损',
        isVector: true,
        score: 98,
      });

      // 5. Unavatar High-Res
      const unavatar = `https://unavatar.io/${hostname}?fallback=false`;
      candidates.push({
        source: 'Unavatar 品牌高保真',
        url: unavatar,
        badge: '高保真 Logo',
        sizeLabel: '128~256px',
        score: 82,
      });

      // 6. Optional: Search App Store for official 512px / 1024px artwork
      if (brandName && brandName.length >= 2 && !brandName.includes('.')) {
        try {
          const appResults = await lookupOrSearchAppStore(brandName, 'cn', 'all');
          if (appResults && appResults.length > 0) {
            const bestApp = appResults[0];
            if (bestApp.icon512) {
              candidates.push({
                source: `App Store 官方原画 (${bestApp.cleanName})`,
                url: bestApp.icon512,
                badge: '512×512 官方原画',
                sizeLabel: '512×512',
                score: 99,
              });
            }
          }
        } catch {}
      }

      // 7. Root domain Google 256px fallback
      if (rootDomain && rootDomain !== hostname) {
        const rootGoogle256 = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${rootDomain}&size=256`;
        candidates.push({
          source: '根域名 256px 超清',
          url: rootGoogle256,
          badge: '256×256 根域',
          sizeLabel: '256×256',
          score: 80,
        });
      }

      // 8. Clean Letter-based Icon candidate
      const letterIcon = generateLetterIcon(brandName || siteTitle || hostname);
      candidates.push({
        source: '生成极简字标 (Clean Letter Fallback)',
        url: letterIcon,
        badge: '256×256 矢量',
        sizeLabel: '256×256',
        isVector: true,
        score: 83,
      });

      // Quick validation of candidates (filter out 404s for relative/direct probes)
      const validatedCandidates = await Promise.all(
        candidates.map(async (c) => {
          // Data URLs & CDNs like Google / Unavatar are immediately valid
          if (c.url.startsWith('data:') || c.url.includes('gstatic.com') || c.url.includes('google.com') || c.url.includes('mzstatic.com') || c.url.includes('unavatar.io')) {
            return c;
          }
          // For direct domain probes (apple-touch-icon, favicon.svg, manifest icons), check if exists
          try {
            const headRes = await fetch(c.url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(1800),
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (headRes.ok && (headRes.headers.get('content-type')?.includes('image') || headRes.status === 200)) {
              return c;
            }
          } catch {}
          return null;
        })
      );

      const finalCandidates = validatedCandidates.filter(Boolean) as typeof candidates;
      return res.json({
        success: true,
        candidates: finalCandidates.sort((a, b) => b.score - a.score),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to probe icons' });
    }
  });

  // API: Fetch High-Resolution Icon with fallback to clean letter-based icon
  app.post('/api/fetch-high-res-icon', async (req, res) => {
    let rawUrl = (req.body?.url || '').trim().replace(/^['"]+|['"]+$/g, '');
    const siteTitle = (req.body?.title || '').trim();
    let currentFavicon = (req.body?.currentFavicon || '').trim().replace(/^['"]+|['"]+$/g, '');
    const forceRefresh = !!req.body?.forceRefresh;

    // 清洗末尾误粘的引号或单斜杠
    rawUrl = rawUrl.replace(/['/\\]+$/, '');
    currentFavicon = currentFavicon.replace(/['/\\]+$/, '');

    if (!rawUrl && !currentFavicon) {
      const fallback = generateLetterIcon(siteTitle || 'Web');
      return res.json({
        success: true,
        iconUrl: fallback,
        source: '生成极简字标 (Clean Letter Fallback)',
        isHighRes: true,
        isLetterFallback: true,
        sizeLabel: '256×256 矢量',
      });
    }

    try {
      let hostname = '';
      const domainMatch = (rawUrl || currentFavicon).match(/[?&]domain=([^&#]+)/i);
      if (domainMatch && domainMatch[1]) {
        hostname = domainMatch[1].toLowerCase().replace(/^www\./, '');
      } else {
        const inputToParse = rawUrl || currentFavicon;
        try {
          const parsed = new URL(inputToParse.startsWith('http') ? inputToParse : `https://${inputToParse}`);
          hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
        } catch {
          hostname = '';
        }
      }

      const domainParts = hostname.split('.');
      const brandName = siteTitle || (domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0]) || hostname || 'Web';
      const baseUrl = hostname ? `https://${hostname}` : '';

      // Check if current favicon is already verified high-quality
      const isCurrentLowRes = isLowQualityFavicon(currentFavicon);

      // Fetch page HTML quickly for precise tag inspection
      let pageHtml = '';
      try {
        const pageRes = await fetch(baseUrl, {
          signal: AbortSignal.timeout(2800),
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        });
        if (pageRes.ok) {
          pageHtml = await pageRes.text();
        }
      } catch {}

      // 1. First attempt: Probe Web App Manifest for high-res icons (512x512, 192x192, 256x256, SVG)
      const manifestIcons = await probeRemoteManifest(baseUrl, pageHtml);
      const highResManifestIcon = manifestIcons.find(icon => icon.size >= 128);
      if (highResManifestIcon) {
        try {
          const checkRes = await fetch(highResManifestIcon.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(2000),
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (checkRes.ok && (checkRes.headers.get('content-type')?.includes('image') || checkRes.status === 200)) {
            return res.json({
              success: true,
              iconUrl: highResManifestIcon.url,
              source: `Web App Manifest 超清图标 (${highResManifestIcon.sizeLabel})`,
              sizeLabel: highResManifestIcon.sizeLabel,
              isHighRes: true,
              isLetterFallback: false,
            });
          }
        } catch {}
      }

      // 2. Second attempt: Apple Touch Icon probe
      let appleTouchUrl = '';
      if (pageHtml) {
        const appleMatch = pageHtml.match(/<link\s+[^>]*?rel\s*=\s*["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*?href\s*=\s*["']([^"']+)["']/i) ||
                           pageHtml.match(/<link\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?rel\s*=\s*["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i);
        if (appleMatch && appleMatch[1]) {
          try {
            appleTouchUrl = new URL(appleMatch[1], baseUrl).href;
          } catch {}
        }
      }

      const appleCandidates = [
        appleTouchUrl,
        `https://${hostname}/apple-touch-icon.png`,
        `https://${hostname}/apple-touch-icon-precomposed.png`,
      ].filter(Boolean);

      for (const touchUrl of appleCandidates) {
        try {
          const testRes = await fetch(touchUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(2000),
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (testRes.ok && (testRes.headers.get('content-type')?.includes('image') || testRes.status === 200)) {
            return res.json({
              success: true,
              iconUrl: touchUrl,
              source: 'Apple Touch 原生大图 (180×180)',
              sizeLabel: '180×180',
              isHighRes: true,
              isLetterFallback: false,
            });
          }
        } catch {}
      }

      // 3. Third attempt: Vector SVG Favicon probe
      const svgFaviconUrl = `https://${hostname}/favicon.svg`;
      try {
        const svgRes = await fetch(svgFaviconUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(1800),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (svgRes.ok && (svgRes.headers.get('content-type')?.includes('svg') || svgRes.status === 200)) {
          return res.json({
            success: true,
            iconUrl: svgFaviconUrl,
            source: '矢量 SVG 徽标',
            sizeLabel: '矢量无损',
            isHighRes: true,
            isLetterFallback: false,
          });
        }
      } catch {}

      // 4. Fourth attempt: Official App Store 512px icon if matched
      if (brandName && brandName.length >= 2 && !brandName.includes('.')) {
        try {
          const appResults = await lookupOrSearchAppStore(brandName, 'cn', 'all');
          if (appResults && appResults.length > 0 && appResults[0].icon512) {
            return res.json({
              success: true,
              iconUrl: appResults[0].icon512,
              source: `App Store 官方原画 (${appResults[0].cleanName})`,
              sizeLabel: '512×512',
              isHighRes: true,
              isLetterFallback: false,
            });
          }
        } catch {}
      }

      // 5. Fifth attempt: Google Social 256px ultra-HD
      const google256 = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=256`;
      try {
        const gRes = await fetch(google256, {
          signal: AbortSignal.timeout(2200),
        });
        if (gRes.ok) {
          const buf = await gRes.arrayBuffer();
          if (buf.byteLength > 1200) {
            return res.json({
              success: true,
              iconUrl: google256,
              source: 'Google Social HD V2 (256px)',
              sizeLabel: '256×256',
              isHighRes: true,
              isLetterFallback: false,
            });
          }
        }
      } catch {}

      // If currentFavicon was provided, not low res, and NOT a forceRefresh request, we can retain it
      if (!forceRefresh && currentFavicon && !isCurrentLowRes) {
        return res.json({
          success: true,
          iconUrl: currentFavicon,
          source: '当前可用图标',
          sizeLabel: '当前尺寸',
          isHighRes: true,
          isLetterFallback: false,
        });
      }

      // 6. Final fallback: Clean generated letter-based icon
      const letterFallback = generateLetterIcon(brandName || siteTitle || hostname);
      return res.json({
        success: true,
        iconUrl: letterFallback,
        source: '生成极简字标 (Clean Letter Fallback)',
        isHighRes: true,
        isLetterFallback: true,
        sizeLabel: '256×256 矢量',
      });
    } catch {
      const letterFallback = generateLetterIcon(siteTitle || rawUrl || 'Web');
      return res.json({
        success: true,
        iconUrl: letterFallback,
        source: '生成极简字标 (Clean Letter Fallback)',
        isHighRes: true,
        isLetterFallback: true,
        sizeLabel: '256×256 矢量',
      });
    }
  });

  // URL Health Check in-memory cache (TTL: 3 minutes)
  interface UrlHealthResult {
    url: string;
    online: boolean;
    status: number | null;
    responseTimeMs: number;
    checkedAt: number;
    error?: string;
  }
  const urlHealthCache = new Map<string, UrlHealthResult>();
  const ONLINE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for verified online sites
  const OFFLINE_CACHE_TTL = 2 * 60 * 60 * 1000;   // 2 hours for offline to prevent sticky false positives while avoiding spam

  async function checkSingleUrl(targetUrl: string, force = false): Promise<UrlHealthResult> {
    const trimmed = (targetUrl || '').trim();
    if (!trimmed) {
      return {
        url: targetUrl,
        online: false,
        status: null,
        responseTimeMs: 0,
        checkedAt: Date.now(),
        error: 'Empty URL',
      };
    }

    const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const cacheKey = fullUrl.toLowerCase();

    if (!force) {
      const cached = urlHealthCache.get(cacheKey);
      if (cached) {
        const ttl = cached.online ? ONLINE_CACHE_TTL : OFFLINE_CACHE_TTL;
        if (Date.now() - cached.checkedAt < ttl) {
          return cached;
        }
      }
    }

    const startTime = Date.now();
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
    };

    try {
      new URL(fullUrl);
    } catch {
      const result: UrlHealthResult = {
        url: targetUrl,
        online: false,
        status: null,
        responseTimeMs: 0,
        checkedAt: Date.now(),
        error: 'Invalid URL',
      };
      urlHealthCache.set(cacheKey, result);
      return result;
    }

    let response: Response | null = null;
    let lastError: any = null;

    // Stage 1: Try HEAD request first with 4.5s timeout
    try {
      const headRes = await fetch(fullUrl, {
        method: 'HEAD',
        headers: browserHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(4500),
      });
      // If HEAD returns 2xx or 3xx, it is guaranteed online!
      if (headRes.status >= 200 && headRes.status < 400) {
        response = headRes;
      }
    } catch (e) {
      lastError = e;
    }

    // Stage 2: If HEAD was rejected or timed out, attempt a full GET request (7s timeout)
    if (!response) {
      try {
        const getRes = await fetch(fullUrl, {
          method: 'GET',
          headers: browserHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(7000),
        });
        response = getRes;
        try {
          await getRes.body?.cancel();
        } catch {}
      } catch (getErr: any) {
        lastError = getErr;
        // If HTTPS failed due to SSL handshake or connection refused, attempt HTTP fallback
        if (fullUrl.startsWith('https://')) {
          try {
            const httpUrl = fullUrl.replace(/^https:\/\//i, 'http://');
            const httpRes = await fetch(httpUrl, {
              method: 'GET',
              headers: browserHeaders,
              redirect: 'follow',
              signal: AbortSignal.timeout(5000),
            });
            response = httpRes;
            try {
              await httpRes.body?.cancel();
            } catch {}
          } catch (httpErr) {
            lastError = httpErr;
          }
        }
      }
    }

    // Stage 3: Double-Check Retry & Alternate Host fallback
    // If connection was refused or timed out, do NOT immediately mark offline.
    // Retry once with alternative host (e.g. www <-> non-www, or retry GET after brief pause)
    if (!response) {
      await new Promise(r => setTimeout(r, 600)); // small breather for network socket / DNS
      const candidateUrls: string[] = [];
      try {
        const parsed = new URL(fullUrl);
        if (parsed.hostname.startsWith('www.')) {
          // try non-www (e.g. https://www.updream.cn -> https://updream.cn)
          candidateUrls.push(fullUrl.replace('://www.', '://'));
        } else {
          // try www (e.g. https://updream.cn -> https://www.updream.cn)
          candidateUrls.push(`${parsed.protocol}//www.${parsed.host}${parsed.pathname}${parsed.search}`);
        }
        // Also original URL with HTTP fallback if HTTPS
        if (fullUrl.startsWith('https://')) {
          candidateUrls.push(fullUrl.replace(/^https:\/\//i, 'http://'));
        }
      } catch {}

      for (const retryUrl of candidateUrls) {
        try {
          const retryRes = await fetch(retryUrl, {
            method: 'GET',
            headers: browserHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(6000),
          });
          if (retryRes && (retryRes.status < 400 || [401, 403, 405, 412, 416, 429].includes(retryRes.status))) {
            response = retryRes;
            try { await retryRes.body?.cancel(); } catch {}
            break;
          }
        } catch (retryErr) {
          lastError = retryErr;
        }
      }
    }

    const duration = Math.max(1, Date.now() - startTime);

    if (!response) {
      const errMsg = lastError?.name === 'TimeoutError' || lastError?.message?.includes('timeout')
        ? '请求超时 (Timeout)'
        : '无法建立连接 (Unreachable)';
      const result: UrlHealthResult = {
        url: targetUrl,
        online: false,
        status: null,
        responseTimeMs: duration,
        checkedAt: Date.now(),
        error: errMsg,
      };
      urlHealthCache.set(cacheKey, result);
      return result;
    }

    // Status evaluation:
    // 2xx, 3xx: Active & accessible -> Online
    // 401, 403, 405, 412, 416, 429: Server is definitively alive and actively rejecting/challenging -> Online
    // 404, 410: Resource dead -> Offline
    // 5xx: Server Internal Error -> Offline
    const isOnline = response.status < 400 || [401, 403, 405, 412, 416, 429].includes(response.status);
    const result: UrlHealthResult = {
      url: targetUrl,
      online: isOnline,
      status: response.status,
      responseTimeMs: duration,
      checkedAt: Date.now(),
      error: isOnline ? undefined : (response.status === 404 ? '链接不存在 (404)' : `服务异常 (${response.status})`),
    };

    urlHealthCache.set(cacheKey, result);
    return result;
  }

  // API: Single URL health check
  app.get('/api/check-url', async (req, res) => {
    const url = req.query.url as string;
    const force = req.query.force === 'true';
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    const result = await checkSingleUrl(url, force);
    return res.json(result);
  });

  // API: Batch URL health check
  app.post('/api/check-urls', async (req, res) => {
    const urls: string[] = req.body?.urls || [];
    const force = Boolean(req.body?.force);
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.json({ results: {} });
    }

    // Limit to max 120 URLs per batch
    const targetUrls = urls.slice(0, 120);
    const results: Record<string, UrlHealthResult> = {};

    // Parallel concurrency pool of 5 to prevent outbound socket congestion
    const concurrency = 5;
    for (let i = 0; i < targetUrls.length; i += concurrency) {
      const chunk = targetUrls.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(u => checkSingleUrl(u, force)));
      chunkResults.forEach(r => {
        results[r.url] = r;
      });
    }

    return res.json({ results });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
