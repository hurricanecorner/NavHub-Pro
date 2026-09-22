// Description Sanitization, Anti-Fluff & Major Tech Service Rules Engine

// HTML entity decoder for common web scraping characters
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x22;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

// Check if description is generic, empty marketing fluff ("泛泛而谈" / "垃圾话术")
export function isFluffDescription(text: string): boolean {
  if (!text || text.trim().length < 4) return true;
  const t = text.trim();

  // Banned generic fluff phrases that add no factual value
  const bannedFluffPatterns = [
    /独立在线站点/i,
    /访问轻快顺畅/i,
    /专注细分领域实用服务/i,
    /官方网站与综合服务入口/i,
    /常用功能与页面/i,
    /快速直达.*常用功能/i,
    /点击进入.*官网/i,
    /欢迎访问.*官方网站/i,
    /欢迎光临.*官网/i,
    /致力于打造.*平台/i,
    /为您提供全方位的/i,
    /请在此输入/i,
    /页面载入中/i,
    /Just another WordPress site/i,
    /Welcome to (my|our|the) (website|site|homepage)/i,
    /All rights reserved/i,
    /Copyright ©/i,
    /Under Construction/i,
  ];

  for (const pattern of bannedFluffPatterns) {
    if (pattern.test(t)) {
      // If the entire text is essentially just the fluff pattern, mark as fluff
      const stripped = t.replace(pattern, '').replace(/[-|_—–·,\s，。]/g, '');
      if (stripped.length < 8) {
        return true;
      }
    }
  }

  // Generic single-word placeholders or 404s
  const genericPlaceholders = [
    '首页', '网站首页', '欢迎光临', '导航', 'default', 'home', 'index', 'untitled',
    '404 not found', '403 forbidden', 'page not found', 'access denied'
  ];
  if (genericPlaceholders.includes(t.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Clean and sanitize description text:
 * 1. Unescapes HTML entities.
 * 2. Filters out surrounding and rogue quotation marks (“ ” " ' 「 」 『 』).
 * 3. Strips invalid, dangling, or truncated ellipses (... , … , 更多>> , 详情...).
 * 4. Filters out generic boilerplate fluff ("独立在线站点", "访问轻快顺畅" 等).
 */
export function sanitizeDescriptionText(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== 'string') return '';
  
  let text = decodeHtmlEntities(rawText).trim();
  if (!text) return '';

  // 1. Remove standard newline and excessive internal whitespace
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 2. Remove matching outer quotation marks
  // e.g. "Description", 'Description', “Description”, 「Description」
  text = text
    .replace(/^["'“‘「『《]+/, '')
    .replace(/["'”’」』》]+$/, '')
    .trim();

  // Remove stray escaped quotes or literal double-quotes inside
  text = text.replace(/\\"/g, '"').replace(/\\'/g, "'");

  // 3. Strip invalid, trailing or dangling ellipses & continuation artifacts
  // Matches: trailing ..., …, ...... , 更多>> , 查看更多 , 详情... , >> , —— , --
  text = text.replace(/(?:[\s\-_—·~～.。…]+)*(?:\.{2,}|…+|····+|\.{3,}|更多>>|查看更多|更多详情|更多内容|更多|>>|->|详情)[.。·…\-—_~～>\s]*$/i, '');

  // Collapse multiple dots within text into a single comma or pause
  text = text.replace(/\.{2,}/g, '。').replace(/…+/g, '。');
  // Remove redundant consecutive periods
  text = text.replace(/。{2,}/g, '。');

  // 4. Clean trailing incomplete punctuation (e.g. dangling commas, dashes, colons)
  text = text.replace(/[，,、：:\-—–·\s]+$/, '').trim();

  // 5. Strip generic suffix boilerplate if attached at the end
  text = text
    .replace(/(?:[，,。]\s*)?(?:欢迎访问|点击进入|欢迎光临)(?:官网|官方网站|主页)?(?:[！!。.\s]*)$/i, '')
    .replace(/(?:[，,。]\s*)?快速直达常用功能与页面(?:[！!。.\s]*)$/i, '')
    .trim();

  // 6. Check against generic fluff
  if (isFluffDescription(text)) {
    return '';
  }

  // 7. Ensure minimum length of substantive content
  if (text.length < 5) {
    return '';
  }

  return text;
}

// Clean title string
export function sanitizeTitleText(rawTitle: string | null | undefined, fallback = ''): string {
  if (!rawTitle || typeof rawTitle !== 'string') return fallback;
  let t = decodeHtmlEntities(rawTitle).trim();
  if (!t) return fallback;

  // Remove common SEO tail suffixes like " - 官方网站", " | 官网", " - Powered by Discuz!"
  t = t
    .replace(/[-|_—–·]([^-|_—–·]+)$/, (m, p1) => {
      const seg = p1.trim().toLowerCase();
      if (
        seg.includes('官网') ||
        seg.includes('官方网站') ||
        seg.includes('首页') ||
        seg.includes('powered by') ||
        (seg.length > 0 && seg.length <= 12)
      ) {
        return '';
      }
      return m;
    })
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“‘「『《]+/, '')
    .replace(/["'”’」』》]+$/, '')
    .trim();

  return t || fallback;
}

// Predefined authoritative metadata for major tech giants & famous services
export interface MajorServiceRule {
  domainMatch: (host: string, path: string) => boolean;
  defaultTitle: string;
  officialDesc: string;
  smartStats: string;
  tags: string[];
}

export const MAJOR_TECH_RULES: MajorServiceRule[] = [
  // --- 搜狗 (Sogou) 专精规则 ---
  {
    domainMatch: (host, path) =>
      (host === 'sogou.com' || host === 'www.sogou.com' || host === 'm.sogou.com') &&
      !path.startsWith('/fanyi') &&
      !path.startsWith('/pinyin'),
    defaultTitle: '搜狗搜索',
    officialDesc:
      '搜狗搜索是全球第三代互动式搜索引擎，支持微信公众号和文章搜索、知乎搜索、英文搜索及翻译等，通过自主研发的人工智能算法为用户提供专业、精准、便捷的搜索服务',
    smartStats:
      '搜狗搜索 · 国内知名综合搜索引擎 · 独家收录微信公众号文章与知乎深度内容生态 · 支持智能跨网聚合搜索',
    tags: ['搜索', '中文门户', '微信搜索', '常用'],
  },
  {
    domainMatch: (host, path) => host === 'fanyi.sogou.com' || path.startsWith('/fanyi'),
    defaultTitle: '搜狗翻译',
    officialDesc:
      '搜狗翻译依托自研神经网络机器翻译技术，支持多语种文本、文档、图片与语音即时互译，提供精准流畅的跨语种交流',
    smartStats:
      '搜狗翻译 · 支持文本、文档与语音多语种即时互译 · 深度融合神经网络机器翻译',
    tags: ['翻译', '语言工具', '搜狗'],
  },
  {
    domainMatch: (host, path) =>
      host === 'pinyin.sogou.com' || host === 'shurufa.sogou.com' || path.startsWith('/pinyin'),
    defaultTitle: '搜狗输入法',
    officialDesc:
      '搜狗输入法是国民级中文拼音输入法，拥有超大精准词库、智能联想、多端云同步与语音实时转写',
    smartStats:
      '搜狗拼音输入法 · 国民级中文拼音输入法 · 累计装机用户超 6 亿 · 词库精准丰富且支持多端云同步',
    tags: ['输入法', '汉字录入', '工具'],
  },

  // --- 百度 (Baidu) 专精规则 ---
  {
    domainMatch: (host, path) =>
      (host === 'baidu.com' || host === 'www.baidu.com') && !host.startsWith('pan.') && !host.startsWith('fanyi.'),
    defaultTitle: '百度搜索',
    officialDesc:
      '全球领先的中文搜索引擎与综合信息服务平台，依托文心大模型提供全场景智能 AI 搜索体验',
    smartStats:
      '百度搜索 · 国内搜索市场份额超 60% · 日均响应数十亿次检索 · 依托文心大模型提供全场景智能 AI 搜索',
    tags: ['搜索', '中文门户', '常用'],
  },
  {
    domainMatch: (host) => host === 'pan.baidu.com' || host.startsWith('pan.baidu.'),
    defaultTitle: '百度网盘',
    officialDesc:
      '百度网盘提供安全可靠的个人云存储服务，支持海量文件云端极速备份、跨终端文件同步与高清在线播放',
    smartStats:
      '百度网盘 · 国内用户规模最大的云存储平台 · 注册用户超 8 亿 · 支持极速跨端备份与文件共享',
    tags: ['网盘', '云存储', '工具'],
  },
  {
    domainMatch: (host, path) => host === 'fanyi.baidu.com' || path.startsWith('/fanyi'),
    defaultTitle: '百度翻译',
    officialDesc:
      '百度翻译支持全球 200 多个语种即时互译，提供海量词汇权威释义、整篇文档翻译与多场景语音翻译',
    smartStats:
      '百度翻译 · 支持 200+ 语种即时互译 · 日均响应数十亿次跨语种调用 · 专注中文深度语境与垂直领域翻译',
    tags: ['翻译', '语言工具'],
  },
  {
    domainMatch: (host) => host === 'tieba.baidu.com',
    defaultTitle: '百度贴吧',
    officialDesc:
      '百度贴吧是以兴趣为核心的中文网络社区，汇聚数百万主题吧与数亿年轻人的真实交流讨论',
    smartStats:
      '百度贴吧 · 累计主题贴数超数十亿 · 涵盖数百万兴趣吧 · 中文网络青年亚文化与兴趣讨论发源地',
    tags: ['社区', '讨论', '社交'],
  },
  {
    domainMatch: (host) => host === 'wenku.baidu.com',
    defaultTitle: '百度文库',
    officialDesc:
      '百度文库拥有超 12 亿份专业文档与教学课件，提供智能 AI 研读、文档提炼与一键生成 PPT 等高效办公功能',
    smartStats:
      '百度文库 · 累计沉淀超 12 亿份专业文档与课件范本 · 深度融合 AI 一键研读与智能 PPT 生成',
    tags: ['办公', '文档', '知识库'],
  },

  // --- 腾讯 (Tencent) 专精规则 ---
  {
    domainMatch: (host) => host === 'qq.com' || host === 'www.qq.com',
    defaultTitle: '腾讯网',
    officialDesc:
      '腾讯网是腾讯旗下综合资讯门户，实时提供时政、财经、科技、体育与娱乐等多领域权威要闻与深度分析',
    smartStats:
      '腾讯网 · 腾讯旗下全方位综合资讯门户与新闻内容中心 · 实时聚合海量高质量要闻',
    tags: ['门户', '资讯', '新闻'],
  },
  {
    domainMatch: (host) => host === 'mail.qq.com',
    defaultTitle: 'QQ 邮箱',
    officialDesc:
      'QQ 邮箱提供安全、稳定、快速的电子邮件服务，具备超大附件传输、多重垃圾邮件拦截与微信即时提醒',
    smartStats:
      'QQ 邮箱 · 中国国民级电子邮箱平台 · 拥有数亿活跃用户 · 提供超大附件传输与即时投递提醒',
    tags: ['邮箱', '通讯', '办公'],
  },
  {
    domainMatch: (host) => host === 'v.qq.com',
    defaultTitle: '腾讯视频',
    officialDesc:
      '腾讯视频提供丰富优质的在线视听服务，汇聚热播剧集、院线电影、国漫动画与自制综艺',
    smartStats:
      '腾讯视频 · 中国领先的综合在线视频流媒体平台 · 汇集海量独播剧集、国漫、院线电影与自制综艺',
    tags: ['视频', '流媒体', '影音'],
  },
  {
    domainMatch: (host) => host === 'y.qq.com',
    defaultTitle: 'QQ 音乐',
    officialDesc:
      'QQ 音乐拥有千万量级高品质海量正版曲库，支持 Hi-Res 无损音质与丰富互动音乐社区体验',
    smartStats:
      'QQ 音乐 · 拥有国内领先的高品质海量正版曲库 · 深度整合社交音乐互动与 Hi-Res 无损音质',
    tags: ['音乐', '音频', '娱乐'],
  },
  {
    domainMatch: (host) => host === 'docs.qq.com',
    defaultTitle: '腾讯文档',
    officialDesc:
      '腾讯文档是一款支持多人在线实时协同的云端办公软件，涵盖文档、表格、幻灯片、收集表与思维导图',
    smartStats:
      '腾讯文档 · 国民级专业在线协作文档 · 覆盖数亿用户 · 支持 Word、Excel、PPT、思维导图实时多人协同',
    tags: ['协作', '文档', '办公'],
  },

  // --- 网易 (163.com) 专精规则 ---
  {
    domainMatch: (host) => host === '163.com' || host === 'www.163.com',
    defaultTitle: '网易门户',
    officialDesc:
      '网易门户汇聚新闻、财经、体育、科技与军事多维热点资讯，打造有态度、有温度的综合传媒内容平台',
    smartStats:
      '网易门户 · 国内老牌综合资讯门户与新闻传播平台 · 涵盖要闻、财经与科技深度报道',
    tags: ['门户', '资讯', '新闻'],
  },
  {
    domainMatch: (host) => host === 'mail.163.com' || host === 'mail.126.com',
    defaultTitle: '网易邮箱',
    officialDesc:
      '网易邮箱拥有二十余年专业技术沉淀，服务超 10 亿用户，提供安全稳定、极速收发与强效反垃圾邮件防护',
    smartStats:
      '网易邮箱 · 中文老牌电子邮箱 · 累计服务用户超 10 亿 · 安全稳定高效防垃圾邮件',
    tags: ['邮箱', '通讯', '办公'],
  },
  {
    domainMatch: (host) => host === 'music.163.com',
    defaultTitle: '网易云音乐',
    officialDesc:
      '网易云音乐是专注于发现与分享的音乐社区，汇集海量优质歌单、原创音乐人与百万级真实走心乐评',
    smartStats:
      '网易云音乐 · 月活超 2 亿的音乐社交社区 · 沉淀数十亿条走心评论与华语独立原创音乐人生态',
    tags: ['音乐', '社交', '流媒体'],
  },

  // --- 阿里巴巴与电商 ---
  {
    domainMatch: (host) => host === 'taobao.com' || host === 'www.taobao.com',
    defaultTitle: '淘宝网',
    officialDesc:
      '淘宝网是亚太地区规模领先的网络零售平台，汇聚数亿海量在售商品与特色好物，提供便捷网购与生活服务',
    smartStats:
      '年活跃消费者超 9 亿 · 在售商品数超 10 亿件 · 中国规模领先的国民级综合网络购物平台',
    tags: ['电商', '网购', '生活'],
  },
  {
    domainMatch: (host) => host === 'jd.com' || host === 'www.jd.com',
    defaultTitle: '京东',
    officialDesc:
      '京东商城秉持正品行货与自营正品承诺，提供次日达高品质物流与全场景电商购物体验',
    smartStats:
      '年活跃用户超 5.8 亿 · 自营正品次日达与高品质物流 · 中国供应链驱动的领军电商平台',
    tags: ['电商', '数码', '网购'],
  },

  // --- 字节跳动 ---
  {
    domainMatch: (host) => host === 'douyin.com' || host === 'www.douyin.com',
    defaultTitle: '抖音',
    officialDesc:
      '抖音记录美好生活，是国内领先的短视频与全场景直播创作者互动平台，涵盖知识、娱乐与生活方式',
    smartStats:
      '日活跃用户超 8 亿 · 人均单日使用时长超 120 分钟 · 中国国民级短视频与全场景直播创作者平台',
    tags: ['短视频', '直播', '社交'],
  },
  {
    domainMatch: (host) => host === 'feishu.cn' || host === 'www.feishu.cn',
    defaultTitle: '飞书',
    officialDesc:
      '飞书整合即时沟通、日历、音视频会议、云文档、多维表格与应用中心，打造先进企业的一体化协同平台',
    smartStats:
      '先进团队先用飞书 · 深度整合协同沟通、云文档与项目管理 · 字节跳动旗下高效率企业数字化工具',
    tags: ['办公', '协同', '企业软件'],
  },

  // --- 国际知名服务 ---
  {
    domainMatch: (host) => host === 'google.com' || host === 'www.google.com',
    defaultTitle: 'Google',
    officialDesc:
      '全球领先的搜索引擎，提供精准高效的网页、图片、学术、地图与资讯检索服务',
    smartStats:
      '全球搜索引擎市场份额超 90% · 日均处理搜索请求逾 85 亿次 · 全球访问量最大的第一大网站',
    tags: ['搜索', 'Google', '全球门户'],
  },
  {
    domainMatch: (host) => host === 'bing.com' || host === 'cn.bing.com' || host === 'www.bing.com',
    defaultTitle: '微软 Bing',
    officialDesc:
      '微软必应搜索引擎融合前沿 AI 智能检索与每日精选超清壁纸，提供多语言精准网页与资讯搜索',
    smartStats:
      '全球桌面搜索份额超 10% · 深度融合 Copilot 智能助手 · 微软核心跨平台智能搜索引擎',
    tags: ['搜索', '微软', 'AI搜索'],
  },
  {
    domainMatch: (host) => host === 'github.com' || host === 'www.github.com',
    defaultTitle: 'GitHub',
    officialDesc:
      '全球最大的代码托管与开源协作平台，汇聚全球超 1 亿开发者与数亿个开源软件仓库',
    smartStats:
      '全球托管代码仓库超 4 亿 · 注册开发者突破 1 亿 · 全球规模最大的开源代码托管与协同平台',
    tags: ['开源', '代码托管', '开发者'],
  },
  {
    domainMatch: (host) => host === 'bilibili.com' || host === 'www.bilibili.com',
    defaultTitle: '哔哩哔哩',
    officialDesc:
      '哔哩哔哩是国内知名的年轻代文化社区与弹幕视频平台，涵盖动漫、科技、游戏、知识与生活等多维内容',
    smartStats:
      '月均活跃用户超 3.4 亿 · 日均视频播放量超 40 亿次 · 优质创作者超 400 万的年轻文化社区',
    tags: ['视频', '弹幕', '社区', '二次元'],
  },
  {
    domainMatch: (host) => host === 'zhihu.com' || host === 'www.zhihu.com',
    defaultTitle: '知乎',
    officialDesc:
      '知乎是中文互联网高质量的问答社区与创作者聚集地，汇聚各领域专业人士分享知识、经验与见解',
    smartStats:
      '月活跃用户超 1 亿 · 累计专业问答突破 5 亿条 · 中文互联网高质量专业知识与深度讨论社区',
    tags: ['问答', '社区', '知识'],
  },
];

// Look up major service rule by host and pathname
export function matchMajorServiceRule(host: string, pathname = '/'): MajorServiceRule | null {
  const cleanHost = host.toLowerCase().replace(/^www\./, '');
  for (const rule of MAJOR_TECH_RULES) {
    if (rule.domainMatch(host.toLowerCase(), pathname) || rule.domainMatch(cleanHost, pathname)) {
      return rule;
    }
  }
  return null;
}
