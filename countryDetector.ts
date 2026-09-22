// Comprehensive country and region detection module

export const CCTLD_COUNTRY_MAP: Record<string, string> = {
  cn: '中国', hk: '中国香港', tw: '中国台湾', mo: '中国澳门', jp: '日本', kr: '韩国',
  uk: '英国', de: '德国', fr: '法国', ru: '俄罗斯', ca: '加拿大', au: '澳大利亚',
  sg: '新加坡', in: '印度', it: '意大利', es: '西班牙', nl: '荷兰', ch: '瑞士',
  se: '瑞典', no: '挪威', fi: '芬兰', dk: '丹麦', be: '比利时', at: '奥地利',
  pl: '波兰', br: '巴西', mx: '墨西哥', vn: '越南', th: '泰国', my: '马来西亚',
  id: '印度尼西亚', ph: '菲律宾', nz: '新西兰', ie: '爱尔兰', za: '南非', ae: '阿联酋',
  tr: '土耳其', ua: '乌克兰', us: '美国', gov: '美国', mil: '美国', eu: '欧洲',
};

export const SECOND_LEVEL_TLD_MAP: Record<string, string> = {
  'com.cn': '中国', 'net.cn': '中国', 'org.cn': '中国', 'gov.cn': '中国', 'edu.cn': '中国',
  'com.hk': '中国香港', 'org.hk': '中国香港', 'edu.hk': '中国香港',
  'com.tw': '中国台湾', 'org.tw': '中国台湾', 'idv.tw': '中国台湾', 'edu.tw': '中国台湾',
  'com.mo': '中国澳门',
  'co.jp': '日本', 'ne.jp': '日本', 'ac.jp': '日本', 'go.jp': '日本',
  'co.kr': '韩国', 'ne.kr': '韩国', 're.kr': '韩国',
  'co.uk': '英国', 'org.uk': '英国', 'gov.uk': '英国', 'ac.uk': '英国',
  'com.au': '澳大利亚', 'net.au': '澳大利亚', 'org.au': '澳大利亚',
  'com.sg': '新加坡', 'edu.sg': '新加坡',
  'co.in': '印度', 'net.in': '印度',
  'com.br': '巴西',
  'co.th': '泰国',
  'com.my': '马来西亚',
  'co.id': '印度尼西亚',
  'co.nz': '新西兰',
};

export const FAMOUS_DOMAIN_COUNTRY_MAP: Record<string, string> = {
  // 中国 - 搜索、门户、资讯与社区
  'baidu.com': '中国', 'qq.com': '中国', 'bilibili.com': '中国', 'zhihu.com': '中国',
  'taobao.com': '中国', 'jd.com': '中国', 'tmall.com': '中国', 'pinduoduo.com': '中国',
  'weibo.com': '中国', 'douyin.com': '中国', 'kuaishou.com': '中国', 'xiaohongshu.com': '中国',
  '163.com': '中国', 'sina.com': '中国', 'sina.com.cn': '中国', 'sohu.com': '中国',
  'alipay.com': '中国', 'aliyun.com': '中国', 'tencent.com': '中国', 'v2ex.com': '中国',
  'linux.do': '中国', 'nodeseek.com': '中国', 'hostloc.com': '中国', 'csdn.net': '中国',
  'gitee.com': '中国', 'douban.com': '中国', 'youku.com': '中国', 'iqiyi.com': '中国',
  'feishu.cn': '中国', 'larksuite.com': '中国', 'dingtalk.com': '中国', 'wps.cn': '中国',
  'kingsoft.com': '中国', 'mi.com': '中国', 'xiaomi.com': '中国', 'huawei.com': '中国',
  'oppo.com': '中国', 'vivo.com': '中国', 'honor.com': '中国', 'dji.com': '中国',
  'meituan.com': '中国', 'dianping.com': '中国', 'ele.me': '中国', 'ximalaya.com': '中国',
  'netease.com': '中国', 'ctrip.com': '中国', 'qunar.com': '中国', 'fliggy.com': '中国',
  'gamersky.com': '中国', '3dmgame.com': '中国', 'chiphell.com': '中国', 'smzdm.com': '中国',
  'hupu.com': '中国', 'juejin.cn': '中国', 'sspai.com': '中国', 'ithome.com': '中国',
  'coolapk.com': '中国', '36kr.com': '中国', 'huxiu.com': '中国', 'tap.cn': '中国',
  'taptap.cn': '中国', 'taptap.io': '中国', 'oschina.net': '中国', 'segmentfault.com': '中国',
  'yuque.com': '中国', 'processon.com': '中国', 'modao.cc': '中国', 'lanhuapp.com': '中国',
  'mastergo.com': '中国', 'pixso.cn': '中国', 'huaban.com': '中国', 'zcool.com.cn': '中国',
  'ui.cn': '中国', 'quark.cn': '中国', '115.com': '中国', 'tieba.baidu.com': '中国',
  'mihoyo.com': '中国', 'hoyoverse.com': '中国', 'genshinimpact.com': '中国',
  'dewu.com': '中国', 'poizon.com': '中国', 'alipan.com': '中国', '123pan.com': '中国',
  'lanzou.com': '中国', 'lanzoui.com': '中国', 'nga.cn': '中国',

  // 中国 - AI与新兴大模型产品
  'deepseek.com': '中国', 'moonshot.cn': '中国', 'kimi.ai': '中国', 'zhipuai.cn': '中国',
  'chatglm.cn': '中国', 'minimax.io': '中国', 'minimaxi.com': '中国', 'stepfun.com': '中国',
  'baichuan-ai.com': '中国', '01.ai': '中国', 'sensetime.com': '中国', 'iflytek.com': '中国',
  'sparkdesk.cn': '中国', 'lobehub.com': '中国', 'coze.cn': '中国', 'siliconflow.cn': '中国',
  'modelscope.cn': '中国', 'lingyiwanwu.com': '中国', 'yiyan.baidu.com': '中国',

  // 中国台湾
  'dcard.tw': '中国台湾', 'ptt.cc': '中国台湾', 'gamer.com.tw': '中国台湾', 'momo.com.tw': '中国台湾',
  'pchome.com.tw': '中国台湾', 'pixnet.net': '中国台湾', 'tsmc.com': '中国台湾', 'asus.com': '中国台湾',
  'acer.com': '中国台湾', 'gigabyte.com': '中国台湾', 'msi.com': '中国台湾',

  // 中国香港
  'hktvmall.com': '中国香港', 'scmp.com': '中国香港', 'openrice.com': '中国香港',
  'lalamove.com': '中国香港', 'klook.com': '中国香港', 'hkej.com': '中国香港',

  // 美国 - 互联网巨头与主流软件
  'google.com': '美国', 'youtube.com': '美国', 'github.com': '美国', 'apple.com': '美国',
  'microsoft.com': '美国', 'twitter.com': '美国', 'x.com': '美国', 'openai.com': '美国',
  'chatgpt.com': '美国', 'claude.ai': '美国', 'anthropic.com': '美国', 'facebook.com': '美国',
  'instagram.com': '美国', 'amazon.com': '美国', 'reddit.com': '美国', 'wikipedia.org': '美国',
  'netflix.com': '美国', 'figma.com': '美国', 'notion.so': '美国', 'discord.com': '美国',
  'discord.gg': '美国', 'linkedin.com': '美国', 'twitch.tv': '美国', 'pinterest.com': '美国',
  'dropbox.com': '美国', 'slack.com': '美国', 'zoom.us': '美国', 'medium.com': '美国',
  'quora.com': '美国', 'stackoverflow.com': '美国', 'gitlab.com': '美国', 'docker.com': '美国',
  'npmjs.com': '美国', 'cloudflare.com': '美国', 'stripe.com': '美国', 'paypal.com': '美国',
  'ebay.com': '美国', 'huggingface.co': '美国', 'midjourney.com': '美国', 'runwayml.com': '美国',
  'cursor.com': '美国', 'cursor.sh': '美国', 'vercel.com': '美国', 'linear.app': '美国',
  'adobe.com': '美国', 'intel.com': '美国', 'amd.com': '美国', 'nvidia.com': '美国',
  'uber.com': '美国', 'airbnb.com': '美国', 'producthunt.com': '美国', 'dribbble.com': '美国',
  'behance.net': '美国', 'artstation.com': '美国', 'unsplash.com': '美国',
  'steamcommunity.com': '美国', 'steampowered.com': '美国', 'epicgames.com': '美国',
  'threads.net': '美国', 'bluesky.social': '美国', 'bsky.app': '美国', 'supabase.com': '美国',
  'replit.com': '美国', 'postman.com': '美国', 'salesforce.com': '美国', 'oracle.com': '美国',
  'blizzard.com': '美国', 'riotgames.com': '美国', 'ea.com': '美国',

  // 日本
  'pixiv.net': '日本', 'dlsite.com': '日本', 'dmm.com': '日本', 'fanza.com': '日本',
  'rakuten.com': '日本', 'rakuten.co.jp': '日本', 'line.me': '日本', 'mercari.com': '日本',
  'sony.com': '日本', 'sony.co.jp': '日本', 'nintendo.com': '日本', 'nintendo.co.jp': '日本',
  'animate.co.jp': '日本', 'bilibili.tv': '日本', 'nicovideo.jp': '日本', 'fanbox.cc': '日本',
  'booth.pm': '日本', 'skeb.jp': '日本', 'yahoo.co.jp': '日本', 'note.com': '日本',
  'qiita.com': '日本', 'zenn.dev': '日本', 'capcom.com': '日本', 'square-enix.com': '日本',
  'sega.jp': '日本', 'konami.com': '日本', 'bandainamco.co.jp': '日本',

  // 韩国
  'naver.com': '韩国', 'daum.net': '韩国', 'kakao.com': '韩国', 'coupang.com': '韩国',
  'samsung.com': '韩国', 'lg.com': '韩国', 'nexon.com': '韩国', 'netmarble.com': '韩国',
  'krafton.com': '韩国', 'weverse.io': '韩国',

  // 欧洲各国
  'deepl.com': '德国', 'sap.com': '德国', 'siemens.com': '德国', 'bmw.com': '德国',
  'mistral.ai': '法国', 'dailymotion.com': '法国', 'ubisoft.com': '法国',
  'spotify.com': '瑞典', 'ikea.com': '瑞典', 'klarna.com': '瑞典',
  'proton.me': '瑞士', 'protonmail.com': '瑞士', 'logitech.com': '瑞士',
  'bbc.com': '英国', 'theguardian.com': '英国', 'reuters.com': '英国', 'arm.com': '英国',

  // 其他地区
  'telegram.org': '阿联酋',
  'canva.com': '澳大利亚', 'atlassian.com': '澳大利亚',
  'shopify.com': '加拿大',
  'shopee.com': '新加坡', 'grab.com': '新加坡', 'lazada.com': '新加坡',
  'yandex.com': '俄罗斯', 'vk.com': '俄罗斯',
};

// Heuristic: check if string contains Chinese characters
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

// Count Chinese characters in text
export function countChineseCharacters(str: string): number {
  const matches = str.match(/[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
}

// Check Japanese kana
export function containsJapanese(str: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff]/.test(str);
}

// Check Korean Hangul
export function containsKorean(str: string): boolean {
  return /[\uac00-\ud7af]/.test(str);
}

// Check Russian Cyrillic
export function containsCyrillic(str: string): boolean {
  return /[\u0400-\u04ff]/.test(str);
}

// Check if HTML snippet contains official Chinese ICP or Ministry filing number
export function hasChineseICPOrGovRecord(html: string): boolean {
  if (!html) return false;
  const icpRegex = /(?:[京津冀晋蒙辽吉黑沪苏浙皖闽赣鲁豫鄂湘粤桂琼渝川贵云陕甘青宁新]ICP备\d+号)/i;
  const policeRegex = /公网安备\s*\d+号/;
  const certRegex = /(?:增值电信业务经营许可证|电信与信息服务业务经营许可证|网络文化经营许可证|ICP证)/;
  return icpRegex.test(html) || policeRegex.test(html) || certRegex.test(html);
}

// Extract locale or lang from HTML
export function detectLocaleFromHtml(html: string): string | null {
  if (!html) return null;

  // 1. Check OpenGraph locale
  const ogLocaleMatch = html.match(/property=["']og:locale["'][^>]*content=["']([a-zA-Z_-]+)["']/i) ||
                        html.match(/content=["']([a-zA-Z_-]+)["'][^>]*property=["']og:locale["']/i);
  if (ogLocaleMatch) {
    const loc = ogLocaleMatch[1].toLowerCase().replace('-', '_');
    if (loc.startsWith('zh_cn') || loc.startsWith('zh_hans')) return '中国';
    if (loc.startsWith('zh_tw') || loc.startsWith('zh_hant')) return '中国台湾';
    if (loc.startsWith('zh_hk')) return '中国香港';
    if (loc.startsWith('ja')) return '日本';
    if (loc.startsWith('ko')) return '韩国';
    if (loc.startsWith('en_gb')) return '英国';
    if (loc.startsWith('de')) return '德国';
    if (loc.startsWith('fr')) return '法国';
    if (loc.startsWith('ru')) return '俄罗斯';
    if (loc.startsWith('es')) return '西班牙';
    if (loc.startsWith('it')) return '意大利';
    if (loc.startsWith('pt_br')) return '巴西';
  }

  // 2. Check <html lang="...">
  const langMatch = html.match(/<html[^>]*\slang=["']([a-zA-Z_-]+)["']/i);
  if (langMatch) {
    const lang = langMatch[1].toLowerCase();
    if (lang === 'zh-cn' || lang === 'zh-hans' || lang === 'zh') return '中国';
    if (lang === 'zh-tw' || lang === 'zh-hant') return '中国台湾';
    if (lang === 'zh-hk') return '中国香港';
    if (lang.startsWith('ja')) return '日本';
    if (lang.startsWith('ko')) return '韩国';
    if (lang.startsWith('ru')) return '俄罗斯';
    if (lang.startsWith('de')) return '德国';
    if (lang.startsWith('fr')) return '法国';
  }

  return null;
}

// Pure client & server synchronous country detection logic
export function detectCountrySync(
  targetUrl: string,
  hints?: {
    title?: string;
    description?: string;
    html?: string;
  }
): string {
  try {
    const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
      ? targetUrl
      : `https://${targetUrl}`;

    // 1. App Store URL parameter or country path
    const appleMatch = normalizedUrl.match(/(?:apps|itunes)\.apple\.com\/([a-z]{2})\//i) ||
                       normalizedUrl.match(/[?&]country=([a-z]{2})/i);
    if (appleMatch && CCTLD_COUNTRY_MAP[appleMatch[1].toLowerCase()]) {
      return CCTLD_COUNTRY_MAP[appleMatch[1].toLowerCase()];
    }

    let hostname = '';
    try {
      hostname = new URL(normalizedUrl).hostname.toLowerCase();
    } catch {
      hostname = targetUrl.toLowerCase().split('/')[0];
    }
    const cleanHost = hostname.replace(/^www\./, '');

    // 2. Famous domain direct lookup (including subdomain matching)
    for (const [dom, country] of Object.entries(FAMOUS_DOMAIN_COUNTRY_MAP)) {
      if (cleanHost === dom || cleanHost.endsWith('.' + dom)) {
        return country;
      }
    }

    // 3. Second-level TLDs (e.g. .com.cn, .co.jp)
    const parts = cleanHost.split('.');
    if (parts.length >= 3) {
      const secondTld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      if (SECOND_LEVEL_TLD_MAP[secondTld]) {
        return SECOND_LEVEL_TLD_MAP[secondTld];
      }
    }

    // 4. First-level country code TLD (e.g. .cn, .jp, .de)
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1];
      if (CCTLD_COUNTRY_MAP[tld]) {
        return CCTLD_COUNTRY_MAP[tld];
      }
    }

    // 5. HTML content ICP and locale inspection
    if (hints?.html) {
      if (hasChineseICPOrGovRecord(hints.html)) {
        return '中国';
      }
      const localeCountry = detectLocaleFromHtml(hints.html);
      if (localeCountry) {
        return localeCountry;
      }
    }

    // 6. Text character linguistics (Title + Description)
    const textBlob = `${hints?.title || ''} ${hints?.description || ''}`;
    if (containsJapanese(textBlob)) {
      return '日本';
    }
    if (containsKorean(textBlob)) {
      return '韩国';
    }
    if (containsCyrillic(textBlob)) {
      return '俄罗斯';
    }
    if (countChineseCharacters(textBlob) >= 2) {
      return '中国';
    }

    // 7. Check if domain name has pinyin / Chinese brand hints
    if (/(?:pinyin|weixin|wechat|tencent|alibaba|taobao|alipay|baidu|huawei|xiaomi|douyin|bilibili|zhihu)/i.test(cleanHost)) {
      return '中国';
    }
  } catch {}

  // 8. Guaranteed Fallback: "无论有无把握都要自动生成地区标签"
  // If title/hints contains Chinese characters, return '中国'
  const fallbackText = `${hints?.title || ''} ${hints?.description || ''} ${targetUrl}`;
  if (containsChinese(fallbackText)) {
    return '中国';
  }

  // Western default origin for tools / websites
  return '美国';
}
