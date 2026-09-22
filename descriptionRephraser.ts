/**
 * descriptionRephraser.ts
 * 智能统计描述 (Smart Stats Description) 语义重构引擎
 * 
 * 核心设计原则：
 * 针对用户没有预先硬编码存储的站点，严格根据卡片已有/输入的真实描述文本（hints.description / item.description），
 * 提取真实业务领域与功能特色，生成一种“不太一样的说法”作为高水准的智能统计标签。
 * 
 * 彻底杜绝：
 * 1. 杜绝把导航网站、AI工具误判为“独立作者个人技术博客”或“在线文档转换工具”。
 * 2. 杜绝毫无意义的模板套话（如“独立在线站点 · 访问轻快顺畅”）。
 * 3. 杜绝原封不动复制一模一样的主描述，采用更精炼、结构化（品牌 · 业务定位 · 核心场景/数据 · 效能价值）的专业说法。
 */

import { sanitizeDescriptionText } from './descriptionCleaner';

/**
 * 常见广告/营销口号过滤清洗
 */
function cleanFluffFromText(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:注册立享|立即注册|免费注册|注册即可|立享|限时特惠|限时免费)[^，。！!；;\n]*/g, '')
    .replace(/(?:点击下载|立即下载|立即前往|立即体验|点击访问|欢迎访问|欢迎光临|更多详情|详情点击)[^，。！!；;\n]*/g, '')
    .replace(/(?:上网，从.*?开始|让您的网络生活更简单精彩)[^，。！!；;\n]*/g, '')
    .replace(/^[0-9]+[、. ]+/, '')
    .trim();
}

/**
 * 分割成有效语义子句
 */
function extractClauses(text: string): string[] {
  if (!text) return [];
  const rawSegments = text.split(/[。！？!?\n;；]+/);
  const clauses: string[] = [];

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    // 如果单个分句很长，可以按逗号或分号继续适度拆分
    if (trimmed.length > 35) {
      const subParts = trimmed.split(/[，,]/);
      for (const sp of subParts) {
        const cleaned = sp.trim();
        if (cleaned.length >= 4) {
          clauses.push(cleaned);
        }
      }
    } else if (trimmed.length >= 4) {
      clauses.push(trimmed);
    }
  }

  return clauses;
}

/**
 * 检测核心业务领域定位 (根据真实描述与标签)
 */
function detectDomainPositioning(
  name: string,
  desc: string,
  tags: string[]
): {
  category: string;
  roleTag: string;
  scenarioTag?: string;
} {
  const combined = `${name} ${desc} ${tags.join(' ')}`.toLowerCase();

  // 1. 3D / 游戏美术 / 角色场景 AI 创作
  if (
    /3d|建模|三视图|游戏美术|游戏角色|游戏场景|贴图|渲染|美术资产/i.test(combined) &&
    /ai|生成|智能|模型|设计/i.test(combined)
  ) {
    return {
      category: 'game_3d_ai',
      roleTag: '游戏美术与3D建模AI设计方案',
      scenarioTag: '快速生成角色场景三视图与3D资产转换'
    };
  }

  // 2. AI 绘画 / 图像创意设计
  if (/ai绘图|ai绘画|生图|绘图|插画|壁纸生成|图像生成|midjourney|sd|stable diffusion|二次元插画/i.test(combined)) {
    return {
      category: 'image_ai',
      roleTag: 'AI 智能绘画与视觉创意设计平台',
      scenarioTag: '支持高质量图像生成与多样艺术风格创作'
    };
  }

  // 3. AI 大语言模型 / 智能对话 / 生产力助手
  if (/对话|聊天机器人|大模型|llm|gpt|claude|deepseek|问答|文本生成|提示词/i.test(combined)) {
    return {
      category: 'text_ai',
      roleTag: '智能大语言模型与多模态AI应用',
      scenarioTag: '提供智能对话解答与长文本综合处理'
    };
  }

  // 4. 网址导航 / 资源聚合收录
  if (/网址导航|上网导航|网址|导航|收录|网址大全|常用网站|常用网址|分类资源|资源导航|书签/i.test(combined)) {
    return {
      category: 'navigation',
      roleTag: '中文上网导航与综合网络资源汇集平台',
      scenarioTag: '分类收录优质网址与全网常用生活服务入口'
    };
  }

  // 5. 前端框架 / 软件开发 / 开源项目
  if (/ui组件|前端框架|开发框架|开源库|开源项目|typescript|javascript|react|vue|node|api接口|代码托管/i.test(combined)) {
    return {
      category: 'developer',
      roleTag: '现代软件工程与开源技术研发框架',
      scenarioTag: '提供标准化开发架构与高效组件生态'
    };
  }

  // 6. 图像处理与无损压缩 (非3D)
  if (/图片压缩|图像压缩|无损压缩|tinypng|webp压缩|图片格式优化/i.test(combined)) {
    return {
      category: 'image_compress',
      roleTag: '智能图像在线无损压缩与体积优化工具',
      scenarioTag: '高保真保持画质并显著节省带宽存储'
    };
  }

  // 7. 文档格式转换 (严格限制为文档文件，排斥3D模型转换)
  if (
    /pdf转|word转|excel转|文档转换|格式转换工具|转成pdf|pdf格式/i.test(combined) &&
    !/3d|建模|角色|游戏/i.test(combined)
  ) {
    return {
      category: 'doc_convert',
      roleTag: '在线文档格式转换与文件处理中心',
      scenarioTag: '支持常见办公文档高效快速互转'
    };
  }

  // 8. 视觉设计素材 / 图标 / 字体 / 灵感
  if (/矢量图标|图标库|设计素材|字体库|配色|灵感库|ui素材/i.test(combined)) {
    return {
      category: 'design_asset',
      roleTag: '数字视觉设计素材与创意资产库',
      scenarioTag: '汇集海量优质设计素材与高品质视觉灵感'
    };
  }

  // 9. 影视 / 音乐 / 音视频流媒体
  if (/视频播放|弹幕视频|在线音乐|影视资源|流媒体|播客电台|二次元番剧/i.test(combined)) {
    return {
      category: 'multimedia',
      roleTag: '在线多媒体视听内容与流媒体平台',
      scenarioTag: '提供高品质影音内容检索与流畅播放'
    };
  }

  // 10. 极客 / 讨论社区 / 技术论坛
  if (/论坛|讨论社区|技术交流|问答社区|极客交流|开发者社区/i.test(combined)) {
    return {
      category: 'community',
      roleTag: '垂直专业交流社区与技术探讨空间',
      scenarioTag: '汇聚同好共同分享经验与知识解答'
    };
  }

  // 11. 独立博客 / 个人专栏 (严格排斥导航和AI工具)
  if (
    /个人技术博客|个人专栏|随笔心得|生活随笔|博主|自留地/i.test(combined) &&
    !/导航|网址|ai|建模|电商|商城|网盘/i.test(combined)
  ) {
    return {
      category: 'blog',
      roleTag: '独立作者技术专栏与深度思考记录',
      scenarioTag: '记录研发实践心得与长期技术沉淀'
    };
  }

  // 12. 数字化办公与效能协作
  if (/在线文档|协同表格|思维导图|知识库|项目协作|数字化办公/i.test(combined)) {
    return {
      category: 'office',
      roleTag: '现代化团队协作与数字办公效能平台',
      scenarioTag: '支持实时协同编辑与结构化知识管理'
    };
  }

  return {
    category: 'general',
    roleTag: `${name} 综合数字在线服务平台`
  };
}

/**
 * 从用户描述中提炼关键量化指标和独特功能点
 */
function extractHighlightsAndStats(desc: string, siteName?: string): string[] {
  const highlights: string[] = [];
  const lowerName = (siteName || '').toLowerCase();

  // 提取带数字和量词/百分比的突出特征 (例如 10000+独家风格模型, 10万+游戏团队, 提升70%, 3分钟完成)
  // 避免抓取单纯的数字品牌名如 123
  const metricMatches = desc.match(/(?:[0-9]+(?:\.[0-9]+)?\s*(?:[万千亿kKM%＋+]|[+＋])\s*(?:[个款家项门套只首条篇本分钟秒度小时次%位人]?[\u4e00-\u9fa5A-Za-z0-9]{1,10})|[0-9]+(?:\.[0-9]+)?\s*[个款家项门套只首条篇本分钟秒度小时次%位人][\u4e00-\u9fa5A-Za-z0-9]{1,10})/g);
  if (metricMatches) {
    for (const m of metricMatches) {
      const cleanM = m.replace(/^[0-9]+[、.]/, '').trim();
      if (lowerName && cleanM.toLowerCase().includes(lowerName)) continue;
      if (cleanM.length >= 3 && cleanM.length <= 18 && !highlights.some(h => h.includes(cleanM))) {
        highlights.push(cleanM);
        if (highlights.length >= 2) break;
      }
    }
  }

  // 提取具体的业务词组
  const featureMatches = [
    { regex: /三视图/i, text: '角色三视图设计' },
    { regex: /3D建模/i, text: '3D建模资产生成' },
    { regex: /万款|海量模型|风格模型/i, text: '提供万款风格模型' },
    { regex: /欧美卡通|二次元|Q版|国风/i, text: '覆盖二次元与国风多元风格' },
    { regex: /游戏美术/i, text: 'AI游戏美术资产创作' },
    { regex: /影视、音乐、小说、游戏/i, text: '收录影视音乐小说游戏资源' },
    { regex: /微信公众号|知乎/i, text: '支持微信公众号与知乎搜索生态' },
    { regex: /无损压缩/i, text: '高保真无损画质压缩' },
    { regex: /剪贴板/i, text: '跨端剪贴板历史同步' },
    { regex: /加密存储|本地存储/i, text: '本地安全加密存储' }
  ];

  for (const f of featureMatches) {
    if (f.regex.test(desc) && !highlights.some(h => h.includes(f.text))) {
      highlights.push(f.text);
      if (highlights.length >= 3) break;
    }
  }

  return highlights;
}

/**
 * 核心对外接口：基于已有的描述，生成结构化、高水准的“不太一样的说法”
 */
export function synthesizeAlternativeDescriptionFromExisting(
  title: string,
  rawDescription: string,
  tags?: string[],
  hostname?: string
): string {
  const cleanName = (title || hostname?.split('.')[0] || '站点')
    .replace(/[-|_—–·].*$/, '')
    .trim() || '服务平台';

  const cleanDesc = cleanFluffFromText(rawDescription || '');
  const tagsList = Array.isArray(tags) ? tags.filter(Boolean) : [];

  // 如果原描述非常短或为空，构造一个真实、客观的定位
  if (!cleanDesc || cleanDesc.length < 6) {
    const fallbackTag = tagsList.length > 0 ? tagsList.slice(0, 2).join(' · ') : '';
    const hostInfo = hostname ? `域名 ${hostname.replace(/^www\./, '')}` : '';
    return sanitizeDescriptionText(
      [cleanName, fallbackTag, hostInfo, '官方在线服务通道'].filter(Boolean).join(' · ')
    );
  }

  // 1. 获取分析定位
  const domainInfo = detectDomainPositioning(cleanName, cleanDesc, tagsList);

  // 2. 提取特色词组/数字亮点
  const highlights = extractHighlightsAndStats(cleanDesc, cleanName);

  // 3. 构建第一子句 (业务定位重构)
  const firstPart = domainInfo.roleTag;

  // 4. 构建第二子句 (核心亮点与场景重构 - “不太一样的说法”)
  let secondPart = '';
  if (highlights.length >= 2) {
    secondPart = highlights.slice(0, 2).join(' · ');
  } else if (highlights.length === 1) {
    secondPart = `${highlights[0]} · ${domainInfo.scenarioTag || '支持全流程在线敏捷创作'}`;
  } else if (domainInfo.scenarioTag) {
    secondPart = domainInfo.scenarioTag;
  } else {
    // 从用户描述的有效子句中，挑选最具信息量的子句并重新修饰
    const clauses = extractClauses(cleanDesc);
    const bestClause = clauses.find(c => c.length >= 8 && !c.includes(cleanName)) || clauses[0] || '';
    secondPart = bestClause ? bestClause.replace(/^是/, '专注').replace(/让您.*$/, '') : '提供专业高效的数字化服务支持';
  }

  // 5. 构建第三子句 (效能或价值总结，杜绝空话)
  let thirdPart = '';
  if (/游戏团队|创作者|设计师|开发者|工程师/i.test(cleanDesc)) {
    if (/游戏团队/i.test(cleanDesc)) {
      thirdPart = '游戏团队低门槛创作效能方案';
    } else if (/开发者|工程师/i.test(cleanDesc)) {
      thirdPart = '提升工程师工程研发效率';
    } else if (/设计师/i.test(cleanDesc)) {
      thirdPart = '赋能设计创意高效落地';
    }
  } else if (domainInfo.category === 'navigation') {
    thirdPart = '一站式便捷直达全网常用生活网站';
  } else if (domainInfo.category === 'image_compress') {
    thirdPart = '显著优化网页性能与传输开销';
  }

  // 拼接成精炼的 “不太一样的说法”
  const components = [cleanName, firstPart, secondPart, thirdPart].filter(Boolean);
  
  // 去除相似与重复子句
  const finalParts: string[] = [];
  for (const comp of components) {
    const trimmedComp = comp.trim();
    if (!trimmedComp) continue;
    const hasDuplicate = finalParts.some(p => {
      if (p === trimmedComp) return true;
      if (p.includes(trimmedComp) || trimmedComp.includes(p)) return true;
      const pChars = new Set(p.split(''));
      let common = 0;
      for (const ch of trimmedComp) {
        if (pChars.has(ch)) common++;
      }
      return common / Math.max(p.length, trimmedComp.length) > 0.6;
    });
    if (!hasDuplicate) {
      finalParts.push(trimmedComp);
    }
  }

  return sanitizeDescriptionText(finalParts.join(' · '));
}
