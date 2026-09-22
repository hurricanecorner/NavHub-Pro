import React, { useState } from 'react';
import { icons, Folder } from 'lucide-react';
import { Theme } from '../types';
import { normalizeIconForDisplay } from './highResIconService';

export interface CategoryIconDef {
  code: string;
  pascalName: string;
  name: string;
  group: string;
  keywords: string[];
  component: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const CATEGORY_ICON_GROUPS = [
  { id: 'all', name: '全部图标' },
  { id: 'featured', name: '精选推荐' },
  { id: 'ai', name: '人工智能 & 科技' },
  { id: 'dev', name: '编程开发 & 架构' },
  { id: 'design', name: '视觉设计 & 创意' },
  { id: 'media', name: '影音多媒体 & 游戏' },
  { id: 'work', name: '商务办公 & 协作' },
  { id: 'data', name: '数据图表 & 统计' },
  { id: 'news', name: '知识资讯 & 教育' },
  { id: 'social', name: '社交互动 & 通讯' },
  { id: 'finance', name: '金融理财 & 电商' },
  { id: 'tools', name: '实用工具 & 硬件' },
  { id: 'security', name: '安全防护 & 隐私' },
  { id: 'travel', name: '交通出行 & 地理' },
  { id: 'life', name: '生活日常 & 健康' },
  { id: 'controls', name: '界面系统 & 控件' },
  { id: 'symbols', name: '基础符号 & 标记' },
] as const;

// 优先语义推荐规则：根据分类名称、子分类关键词直接映射到最具有辨识度与代表性的经典图标
const SEMANTIC_CATEGORY_RULES: Array<{ match: string[]; iconCode: string }> = [
  { match: ['ai', '人工智能', '大模型', 'gpt', 'llm', 'chatgpt', 'openai', 'claude', 'deepseek', 'gemini', '智能体'], iconCode: 'sparkles' },
  { match: ['芯片', '算力', '处理器', '硬件主机', '硬件研发'], iconCode: 'cpu' },
  { match: ['机器人', '助手', 'agent', '客服机器人', '对话机器人'], iconCode: 'bot' },
  { match: ['代码', '编程', '开发', '研发', '前端', '后端', 'dev', '程序员', '架构', 'react', 'vue', 'python', 'java', 'node', '开源'], iconCode: 'code' },
  { match: ['终端', '命令行', 'shell', 'bash', 'linux', '控制台', 'cli', '运维'], iconCode: 'terminal' },
  { match: ['数据库', '存储', 'sql', 'mysql', 'postgres', 'redis', '数据源', 'nosql'], iconCode: 'database' },
  { match: ['云服务', '云计算', '网盘', '云盘', '云原生', 'serverless', 'aws', '阿里云', '腾讯云'], iconCode: 'cloud' },
  { match: ['服务器', '主机', '机房', '集群', '容器', 'docker', 'k8s'], iconCode: 'server' },
  { match: ['设计', 'ui', 'ux', '美术', '插画', '色彩', '调色', '素材', '美工', 'figma', 'sketch', '原画'], iconCode: 'palette' },
  { match: ['图层', '排版', '分层', '排版布局', '交互设计'], iconCode: 'layers' },
  { match: ['摄影', '相机', '照片', '图库', '视觉', '壁纸', '相册'], iconCode: 'camera' },
  { match: ['视频', '影视', '短视频', '播放', 'bilibili', 'youtube', '剪辑', '剧集', '动画', '动漫'], iconCode: 'video' },
  { match: ['电影', '胶片', '院线', '大片', '纪录片', '影视大片'], iconCode: 'film' },
  { match: ['音乐', '歌曲', '音频', '网易云', 'qq音乐', 'spotify', '乐谱', '唱片'], iconCode: 'music' },
  { match: ['播客', '耳机', '听歌', '有声书', '电台', '收音机'], iconCode: 'headphones' },
  { match: ['游戏', '手柄', 'steam', '主机', '电竞', '娱乐', 'switch', '开黑'], iconCode: 'gamepad-2' },
  { match: ['办公', '公文包', '商务', '职场', '求职', '工作', '企业', '商业'], iconCode: 'briefcase' },
  { match: ['文档', '笔记', 'word', 'excel', '语雀', 'notion', '备忘录', '文章'], iconCode: 'file-text' },
  { match: ['日程', '日历', '计划', '排期', '会议', '时间表', '时间线'], iconCode: 'calendar' },
  { match: ['效率', '神速', '闪电', '高能', '爆发', '飞速'], iconCode: 'zap' },
  { match: ['新闻', '资讯', '早报', '日报', '博客', '阅读', '文章', '媒体', '周刊'], iconCode: 'newspaper' },
  { match: ['知识', '图书', '书籍', '阅读', '电子书', '小说', '知识库', '图书馆', '阅览'], iconCode: 'book-open' },
  { match: ['教育', '学习', '大学', '学位', '考研', '学术', '课程', '学院', '高校', '培训', '网课'], iconCode: 'graduation-cap' },
  { match: ['全球', '网站', '网络', '互联网', '出海', '国际', '外贸', '浏览器', '海外', '跨国'], iconCode: 'globe' },
  { match: ['工具', '百宝箱', '实用', '效率', '转换', '下载', '检测', '小工具', '调试'], iconCode: 'wrench' },
  { match: ['安全', '防护', '隐私', '杀毒', '权限', '加密', '认证', '防火墙', '盾牌'], iconCode: 'shield-check' },
  { match: ['购物', '电商', '商城', '买买买', '商品', '超市', '淘宝', '京东', '拼多多'], iconCode: 'shopping-bag' },
  { match: ['金融', '理财', '投资', '股票', '基金', '银行', '钱', '货币', '财富', '资产', '虚拟币', 'crypto'], iconCode: 'coins' },
  { match: ['社交', '社区', '论坛', '聊天', '讨论', '圈子', '互动', '私信', '消息', '群聊'], iconCode: 'message-square' },
  { match: ['出行', '旅游', '地图', '导航', '交通', '航班', '地理', '路线', '探索', '发现', '向导'], iconCode: 'compass' },
  { match: ['创新', '前沿', '起航', '火箭', '产品', '创业', '孵化', '发布', '黑科技'], iconCode: 'rocket' },
  { match: ['生活', '日常', '休闲', '美食', '餐饮', '咖啡', '健康', '下午茶', '爱好'], iconCode: 'coffee' },
  { match: ['搜索', '引擎', '检索', '查询', '发现', '寻找', '探查'], iconCode: 'search' },
  { match: ['收藏', '星标', '优质', '精选', '必备', '推荐', '常用', '核心', '书签'], iconCode: 'bookmark' },
  { match: ['资源', '素材', '包', '组件库', '驱动', '软件包', '下载站'], iconCode: 'package' },
  { match: ['综合', '全站', '导航', '矩阵', '全览', '聚合', '分类'], iconCode: 'layout-grid' },
  { match: ['设置', '管理', '系统', '控制', '配置', '后台', '运维', '偏好', '选项'], iconCode: 'settings' }
];

// 常见图标的中文友好名称
const ICON_CHINESE_NAME_MAP: Record<string, string> = {
  cpu: '算力/芯片',
  sparkles: 'AI/生成灵感',
  bot: 'AI机器人/助手',
  code: '代码/编程开发',
  terminal: '终端/命令行',
  database: '数据库/存储',
  cloud: '云计算/云盘',
  palette: '设计调色/美术',
  layers: '图层排版/动效',
  camera: '摄影相机/视觉',
  video: '视频播放/影视',
  film: '电影胶片/特效',
  music: '音乐乐曲/声音',
  headphones: '播客音频/听书',
  gamepad2: '游戏电竞/娱乐',
  gamepad: '游戏手柄',
  briefcase: '商务办公/工作',
  filetext: '文档笔记/文字',
  zap: '闪电/神速效率',
  newspaper: '新闻资讯/时事',
  bookopen: '知识书籍/阅读',
  book: '书籍/书册',
  graduationcap: '教育学习/学术',
  globe: '全球网络/互联网',
  wrench: '实用工具/百宝箱',
  shieldcheck: '安全认证/防护',
  shield: '安全盾牌/隐私',
  shoppingbag: '电商购物/消费',
  shoppingcart: '购物车/商城',
  coins: '财经金融/理财',
  messagesquare: '社交社区/讨论',
  messagecircle: '即时聊天/气泡',
  compass: '发现探索/指南',
  rocket: '创新起航/产品',
  coffee: '生活休闲/爱好',
  search: '搜索引擎/检索',
  bookmark: '精选收藏/标签',
  package: '素材资源/组件',
  layoutgrid: '综合分类/矩阵',
  folder: '常规文件夹/归档',
  heart: '红心/喜爱关注',
  star: '星标/优质推荐',
  settings: '系统配置/偏好',
  user: '个人用户/账号',
  mail: '电子邮件/信箱',
  bell: '通知提醒/消息',
  calendar: '日程排期/日历',
  lock: '加密私密/权限',
  activity: '健康动态/监控',
  barchart: '柱状图表/统计',
  trendingup: '上升趋势/热门',
  flame: '火爆热点/潮流'
};

// 预置精选高频图标集合
const FEATURED_CODE_SET = new Set([
  'cpu', 'sparkles', 'bot', 'code', 'terminal', 'boxes', 'database', 'cloud',
  'palette', 'layers', 'camera', 'video', 'film', 'music', 'headphones', 'gamepad-2', 'gamepad2',
  'briefcase', 'file-text', 'filetext', 'zap', 'newspaper', 'book-open', 'bookopen', 'book',
  'graduation-cap', 'graduationcap', 'globe', 'wrench', 'shield-check', 'shieldcheck', 'shield',
  'shopping-bag', 'shoppingbag', 'shopping-cart', 'shoppingcart', 'coins', 'message-square',
  'messagesquare', 'message-circle', 'messagecircle', 'compass', 'rocket', 'coffee', 'search',
  'bookmark', 'package', 'layout-grid', 'layoutgrid', 'folder', 'heart', 'star', 'settings',
  'user', 'users', 'mail', 'bell', 'calendar', 'clock', 'lock', 'trending-up', 'trendingup',
  'activity', 'pie-chart', 'piechart', 'bar-chart', 'barchart', 'line-chart', 'linechart',
  'server', 'hard-drive', 'harddrive', 'link', 'external-link', 'externallink', 'download',
  'upload', 'share-2', 'share2', 'help-circle', 'helpcircle', 'alert-circle', 'alertcircle',
  'eye', 'check-circle-2', 'checkcircle2', 'sun', 'moon', 'flame', 'map-pin', 'mappin'
]);

function toKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function toWords(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/**
 * 智能判定图标分组
 */
function classifyIconGroup(kebab: string): string {
  const k = kebab.toLowerCase();
  const raw = k.replace(/[-_]/g, '');

  if (
    raw.includes('cpu') || raw.includes('bot') || raw.includes('sparkle') || raw.includes('brain') ||
    raw.includes('robot') || raw.includes('circuit') || raw.includes('chip') || raw.includes('atom') ||
    raw.includes('orbit') || raw.includes('satellite') || raw.includes('radar') || raw.includes('wand') ||
    raw.includes('microchip') || raw.includes('dna') || raw.includes('scan') || k === 'ai' || k.startsWith('ai-') || k.endsWith('-ai')
  ) {
    return 'ai';
  }

  if (
    raw.includes('code') || raw.includes('terminal') || raw.includes('database') || raw.includes('server') ||
    raw.includes('git') || raw.includes('bug') || raw.includes('binary') || raw.includes('brace') ||
    raw.includes('bracket') || raw.includes('box') || raw.includes('cloud') || raw.includes('network') ||
    raw.includes('api') || raw.includes('webhook') || raw.includes('package') || raw.includes('container') ||
    raw.includes('pullrequest') || raw.includes('branch') || raw.includes('commit') || raw.includes('cable') ||
    raw.includes('workflow') || raw.includes('variable') || raw.includes('harddrive')
  ) {
    return 'dev';
  }

  if (
    raw.includes('palette') || raw.includes('brush') || raw.includes('pen') || raw.includes('paint') ||
    raw.includes('crop') || raw.includes('blend') || raw.includes('layer') || raw.includes('layout') ||
    raw.includes('vector') || raw.includes('ruler') || raw.includes('scissor') || raw.includes('stamp') ||
    raw.includes('shapes') || raw.includes('figma') || raw.includes('contrast') || raw.includes('pipette') ||
    raw.includes('frame') || raw.includes('image') || raw.includes('canvas') || raw.includes('eyedropper') ||
    raw.includes('spline') || raw.includes('art') || raw.includes('bezier')
  ) {
    return 'design';
  }

  if (
    raw.includes('video') || raw.includes('music') || raw.includes('film') || raw.includes('camera') ||
    raw.includes('audio') || raw.includes('speaker') || raw.includes('headphone') || raw.includes('gamepad') ||
    raw.includes('play') || raw.includes('pause') || raw.includes('disc') || raw.includes('radio') ||
    raw.includes('tv') || raw.includes('mic') || raw.includes('clapperboard') || raw.includes('theater') ||
    raw.includes('projector') || raw.includes('volume') || raw.includes('podcast') || raw.includes('joystick')
  ) {
    return 'media';
  }

  if (
    raw.includes('chart') || raw.includes('pie') || raw.includes('scatter') || raw.includes('activity') ||
    raw.includes('trending') || raw.includes('gauge') || raw.includes('percent') || raw.includes('sigma') ||
    raw.includes('calculator') || raw.includes('poll') || raw.includes('histogram') || raw.includes('analytics')
  ) {
    return 'data';
  }

  if (
    raw.includes('briefcase') || raw.includes('clipboard') || raw.includes('calendar') || raw.includes('presentation') ||
    raw.includes('kanban') || raw.includes('milestone') || raw.includes('target') || raw.includes('goal') ||
    raw.includes('printer') || raw.includes('archive') || raw.includes('inbox') || raw.includes('timer') ||
    raw.includes('hourglass') || raw.includes('contact') || raw.includes('idcard')
  ) {
    return 'work';
  }

  if (
    raw.includes('book') || raw.includes('notebook') || raw.includes('bookmark') || raw.includes('library') ||
    raw.includes('graduation') || raw.includes('newspaper') || raw.includes('file') || raw.includes('folder') ||
    raw.includes('scroll') || raw.includes('pencil') || raw.includes('diploma') || raw.includes('school') ||
    raw.includes('award') || raw.includes('trophy') || raw.includes('certificate') || raw.includes('medal') ||
    raw.includes('crown') || raw.includes('microscope')
  ) {
    return 'news';
  }

  if (
    raw.includes('message') || raw.includes('chat') || raw.includes('mail') || raw.includes('send') ||
    raw.includes('user') || raw.includes('share') || raw.includes('thumbs') || raw.includes('phone') ||
    raw.includes('rss') || raw.includes('bell') || raw.includes('megaphone') || raw.includes('quote')
  ) {
    return 'social';
  }

  if (
    raw.includes('dollar') || raw.includes('cent') || raw.includes('euro') || raw.includes('pound') ||
    raw.includes('bank') || raw.includes('credit') || raw.includes('coins') || raw.includes('wallet') ||
    raw.includes('receipt') || raw.includes('shopping') || raw.includes('cart') || raw.includes('store') ||
    raw.includes('bag') || raw.includes('landmark') || raw.includes('currency') || raw.includes('bitcoin') ||
    raw.includes('gem') || raw.includes('diamond') || raw.includes('tag')
  ) {
    return 'finance';
  }

  if (
    raw.includes('shield') || raw.includes('lock') || raw.includes('unlock') || raw.includes('key') ||
    raw.includes('fingerprint') || raw.includes('eye') || raw.includes('siren') || raw.includes('alarm') ||
    raw.includes('safe') || raw.includes('vault') || raw.includes('privacy') || raw.includes('firewall')
  ) {
    return 'security';
  }

  if (
    raw.includes('compass') || raw.includes('map') || raw.includes('globe') || raw.includes('pin') ||
    raw.includes('navigation') || raw.includes('plane') || raw.includes('car') || raw.includes('bus') ||
    raw.includes('train') || raw.includes('bike') || raw.includes('ship') || raw.includes('anchor') ||
    raw.includes('hotel') || raw.includes('mountain') || raw.includes('route') || raw.includes('milestone') ||
    raw.includes('flag')
  ) {
    return 'travel';
  }

  if (
    raw.includes('coffee') || raw.includes('cup') || raw.includes('utensils') || raw.includes('pizza') ||
    raw.includes('apple') || raw.includes('heart') || raw.includes('cross') || raw.includes('pill') ||
    raw.includes('stethoscope') || raw.includes('thermometer') || raw.includes('sun') || raw.includes('moon') ||
    raw.includes('cloud') || raw.includes('umbrella') || raw.includes('tree') || raw.includes('flower') ||
    raw.includes('leaf') || raw.includes('droplet') || raw.includes('bath') || raw.includes('bed') ||
    raw.includes('baby')
  ) {
    return 'life';
  }

  if (
    raw.includes('tool') || raw.includes('wrench') || raw.includes('hammer') || raw.includes('screwdriver') ||
    raw.includes('axe') || raw.includes('drill') || raw.includes('laptop') || raw.includes('smartphone') ||
    raw.includes('tablet') || raw.includes('monitor') || raw.includes('usb') || raw.includes('bluetooth') ||
    raw.includes('wifi') || raw.includes('battery') || raw.includes('flashlight') || raw.includes('magnet') ||
    raw.includes('plug')
  ) {
    return 'tools';
  }

  if (
    raw.includes('settings') || raw.includes('search') || raw.includes('filter') || raw.includes('sliders') ||
    raw.includes('toggle') || raw.includes('switch') || raw.includes('menu') || raw.includes('grid') ||
    raw.includes('list') || raw.includes('maximize') || raw.includes('minimize') || raw.includes('chevron') ||
    raw.includes('arrow') || raw.includes('check') || raw.includes('plus') || raw.includes('minus') ||
    raw.includes('power') || raw.includes('refresh') || raw.includes('zoom') || raw.includes('mouse')
  ) {
    return 'controls';
  }

  return 'symbols';
}

/**
 * 完整构建 1400+ 图标库
 */
export const CATEGORY_ICON_LIBRARY: CategoryIconDef[] = (() => {
  const iconKeys = Object.keys(icons) as (keyof typeof icons)[];
  const list: CategoryIconDef[] = [];

  for (const pascalName of iconKeys) {
    const Component = icons[pascalName] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    if (!Component) continue;

    const kebab = toKebab(pascalName);
    const rawKey = kebab.replace(/[-_]/g, '');
    const words = toWords(pascalName);
    const group = classifyIconGroup(kebab);

    // 收集关键词
    const keywords: string[] = [kebab, pascalName.toLowerCase(), words.toLowerCase()];

    // 中文名称
    const chineseName = ICON_CHINESE_NAME_MAP[rawKey] || ICON_CHINESE_NAME_MAP[kebab] || '';
    if (chineseName) {
      keywords.push(chineseName);
    }
    const displayName = chineseName ? `${chineseName} (${words})` : words;

    list.push({
      code: kebab,
      pascalName,
      name: displayName,
      group,
      keywords,
      component: Component
    });
  }

  // 排序：精选图标排前列，其余按代码字母序
  list.sort((a, b) => {
    const aFeatured = FEATURED_CODE_SET.has(a.code) || FEATURED_CODE_SET.has(a.code.replace(/[-_]/g, ''));
    const bFeatured = FEATURED_CODE_SET.has(b.code) || FEATURED_CODE_SET.has(b.code.replace(/[-_]/g, ''));
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    return a.code.localeCompare(b.code);
  });

  return list;
})();

// 快速索引表：支持按 code (kebab-case), pascalName, 或去除中划线的无缝查询
const CODE_TO_DEF_MAP = new Map<string, CategoryIconDef>();
for (const def of CATEGORY_ICON_LIBRARY) {
  CODE_TO_DEF_MAP.set(def.code.toLowerCase(), def);
  CODE_TO_DEF_MAP.set(def.pascalName.toLowerCase(), def);
  CODE_TO_DEF_MAP.set(def.code.toLowerCase().replace(/[-_]/g, ''), def);
}

export interface ResolvedCategoryIcon {
  type: 'custom' | 'builtin';
  code: string;
  name: string;
  isAutoAssigned: boolean;
  component: React.ComponentType<{ className?: string; style?: React.CSSProperties }> | null;
  imageUrl: string | null;
}

/**
 * 根据图标代码获取定义
 */
export function getCategoryIconDef(code: string): CategoryIconDef | undefined {
  if (!code) return undefined;
  const clean = code.replace(/^#+/, '').replace(/^lucide:/, '').trim().toLowerCase();
  return (
    CODE_TO_DEF_MAP.get(clean) ||
    CODE_TO_DEF_MAP.get(clean.replace(/[-_]/g, ''))
  );
}

/**
 * 核心解析函数：根据主分类名称或已配置图标，自动分配具有独特编码的图标，或读取自定义上传图标
 */
export function resolveCategoryIcon(category?: {
  id?: string;
  name?: string;
  icon?: string;
  subCategories?: Array<{ name: string }>;
}): ResolvedCategoryIcon {
  const iconStr = (category?.icon || '').trim();

  // 1. 如果已手动配置为自定义上传图片 (URL 或 base64)
  if (iconStr && (iconStr.startsWith('data:') || iconStr.startsWith('http://') || iconStr.startsWith('https://') || iconStr.startsWith('/'))) {
    return {
      type: 'custom',
      code: 'custom',
      name: '自定义上传图标',
      isAutoAssigned: false,
      component: null,
      imageUrl: iconStr
    };
  }

  // 2. 如果已选用了特定的内置图标代码
  if (iconStr) {
    const matched = getCategoryIconDef(iconStr);
    if (matched) {
      return {
        type: 'builtin',
        code: matched.code,
        name: matched.name,
        isAutoAssigned: false,
        component: matched.component,
        imageUrl: null
      };
    }
  }

  // 3. 自动语义推荐：根据分类名称、子分类名称及内容特征匹配最贴切的图标
  const nameToMatch = [
    category?.name || '',
    ...(category?.subCategories?.map(s => s.name) || [])
  ].join(' ').toLowerCase();

  if (nameToMatch.trim()) {
    // 优先匹配预设的经典分类规则
    for (const rule of SEMANTIC_CATEGORY_RULES) {
      if (rule.match.some(m => nameToMatch.includes(m))) {
        const found = getCategoryIconDef(rule.iconCode);
        if (found) {
          return {
            type: 'builtin',
            code: found.code,
            name: found.name,
            isAutoAssigned: true,
            component: found.component,
            imageUrl: null
          };
        }
      }
    }

    // 次选匹配词库
    for (const def of CATEGORY_ICON_LIBRARY) {
      if (def.keywords.some(kw => kw && kw.length >= 2 && nameToMatch.includes(kw.toLowerCase()))) {
        return {
          type: 'builtin',
          code: def.code,
          name: def.name,
          isAutoAssigned: true,
          component: def.component,
          imageUrl: null
        };
      }
    }
  }

  // 4. 若关键词未命中，通过确定性哈希将分类映射到独一无二且固定的编码图标上
  const seedString = (category?.name || category?.id || 'category').trim();
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const pickedIndex = Math.abs(hash) % CATEGORY_ICON_LIBRARY.length;
  const fallbackDef = CATEGORY_ICON_LIBRARY[pickedIndex] || CATEGORY_ICON_LIBRARY[0];

  return {
    type: 'builtin',
    code: fallbackDef.code,
    name: fallbackDef.name,
    isAutoAssigned: true,
    component: fallbackDef.component,
    imageUrl: null
  };
}

/**
 * 统一分类图标渲染组件
 */
export const CategoryIconDisplay: React.FC<{
  category?: { id?: string; name?: string; icon?: string; subCategories?: Array<{ name: string }> };
  icon?: string;
  name?: string;
  className?: string;
  isActive?: boolean;
  theme?: Theme;
  showFallbackOnCustomError?: boolean;
}> = ({
  category,
  icon,
  name,
  className = 'w-5 h-5',
  isActive = false,
  theme,
  showFallbackOnCustomError = true
}) => {
  const [imageError, setImageError] = useState(false);
  const isCustomTheme = theme === 'custom';

  const resolved = resolveCategoryIcon(category || { icon, name });

  // 自定义图片且未报错
  if (resolved.type === 'custom' && resolved.imageUrl && (!imageError || !showFallbackOnCustomError)) {
    return (
      <img
        src={normalizeIconForDisplay(resolved.imageUrl)}
        alt={category?.name || name || 'Category Icon'}
        className={`${className} object-contain shrink-0`}
        onError={() => setImageError(true)}
      />
    );
  }

  // 内置 Lucide 图标或图片加载失败降级图标
  const IconComponent = resolved.component || Folder;

  // 默认根据激活态与主题给出舒适配色
  const colorClass = isCustomTheme
    ? (isActive ? 'text-white' : 'text-slate-100')
    : (isActive ? 'text-brand-600 dark:text-zinc-100' : 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-400 dark:group-hover:text-zinc-200');

  return (
    <IconComponent
      className={`${className} shrink-0 transition-colors ${colorClass}`}
    />
  );
};
