import React, { useState } from 'react';
import {
  Cpu, Sparkles, Bot, Code, Terminal, Boxes, Database, Cloud,
  Palette, Layers, Camera, Video, Film, Music, Headphones, Gamepad2,
  Briefcase, FileText, Zap, Newspaper, BookOpen, GraduationCap, Globe,
  Wrench, ShieldCheck, ShoppingBag, Coins, MessageSquare, Compass, Rocket,
  Coffee, Search, Bookmark, Package, LayoutGrid, Folder
} from 'lucide-react';
import { Theme } from '../types';
import { normalizeIconForDisplay } from './highResIconService';

export interface CategoryIconDef {
  code: string;
  name: string;
  group: 'ai' | 'dev' | 'design' | 'media' | 'work' | 'news' | 'tools' | 'life';
  keywords: string[];
  component: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const CATEGORY_ICON_GROUPS = [
  { id: 'all', name: '全部图标' },
  { id: 'ai', name: '人工智能' },
  { id: 'dev', name: '编程开发' },
  { id: 'design', name: '视觉设计' },
  { id: 'media', name: '影音娱乐' },
  { id: 'work', name: '办公协作' },
  { id: 'news', name: '资讯知识' },
  { id: 'tools', name: '实用生活' },
] as const;

export const CATEGORY_ICON_LIBRARY: CategoryIconDef[] = [
  // AI / 人工智能
  {
    code: 'cpu',
    name: 'AI 算力/芯片',
    group: 'ai',
    keywords: ['ai', '人工智能', '芯片', '算力', '大模型', 'llm', 'machine learning', '深度学习', 'gpt', 'openai', 'claude'],
    component: Cpu
  },
  {
    code: 'sparkles',
    name: '智能灵感/生成',
    group: 'ai',
    keywords: ['ai tools', '智能', '灵感', '生成', '创意', 'generative', 'midjourney', 'prompt', '对话'],
    component: Sparkles
  },
  {
    code: 'bot',
    name: '机器人/助手',
    group: 'ai',
    keywords: ['bot', '机器人', '助手', 'agent', 'copilot', 'assistant', 'chatbot', '客服'],
    component: Bot
  },

  // 编程开发
  {
    code: 'code',
    name: '代码开发/编程',
    group: 'dev',
    keywords: ['dev', 'development', '开发', '代码', '编程', '前端', '后端', 'code', 'program', 'framework', 'react', 'vue', 'software'],
    component: Code
  },
  {
    code: 'terminal',
    name: '命令行/终端',
    group: 'dev',
    keywords: ['terminal', '终端', '命令行', 'shell', 'bash', 'linux', 'git', 'cli', '运维'],
    component: Terminal
  },
  {
    code: 'boxes',
    name: '组件架构/模块',
    group: 'dev',
    keywords: ['boxes', '架构', '组件', '框架', '库', 'sdk', 'api', 'package', 'npm', 'module'],
    component: Boxes
  },
  {
    code: 'database',
    name: '数据库/存储',
    group: 'dev',
    keywords: ['database', '数据', '数据库', 'sql', 'nosql', 'storage', 'mysql', 'postgres', 'redis', '存储'],
    component: Database
  },
  {
    code: 'cloud',
    name: '云计算/部署',
    group: 'dev',
    keywords: ['cloud', '云服务', '云原生', 'server', '服务器', 'aws', 'aliyun', 'docker', 'k8s', 'devops', 'deploy'],
    component: Cloud
  },

  // 视觉设计
  {
    code: 'palette',
    name: '设计调色/美工',
    group: 'design',
    keywords: ['design', '设计', 'ui', 'ux', '美术', '颜色', 'color', 'figma', 'sketch', 'art', 'graphic'],
    component: Palette
  },
  {
    code: 'layers',
    name: '图层排版/动效',
    group: 'design',
    keywords: ['layers', '图层', '排版', '动效', '交互', 'interface', 'template', '原型'],
    component: Layers
  },
  {
    code: 'camera',
    name: '摄影照相/视觉',
    group: 'design',
    keywords: ['camera', '摄影', '相片', '视觉', '壁纸', 'photo', 'picture', 'image', 'gallery', '图库'],
    component: Camera
  },

  // 影音娱乐
  {
    code: 'video',
    name: '视频影视/播放',
    group: 'media',
    keywords: ['video', '视频', '影视', '短视频', 'youtube', 'bilibili', 'media', 'movie', 'cinema', '直播', 'stream'],
    component: Video
  },
  {
    code: 'film',
    name: '电影剪辑/胶片',
    group: 'media',
    keywords: ['film', '电影', '剪辑', '后期', '特效', 'animation', '动画', 'tv', 'show'],
    component: Film
  },
  {
    code: 'music',
    name: '音乐乐曲/声音',
    group: 'media',
    keywords: ['music', '音乐', '歌曲', '音频', 'sound', 'song', 'spotify', '网易云', '乐谱'],
    component: Music
  },
  {
    code: 'headphones',
    name: '播客音频/听书',
    group: 'media',
    keywords: ['headphones', '播客', 'podcast', '听书', '有声', '耳机', 'fm', 'radio', '电台'],
    component: Headphones
  },
  {
    code: 'gamepad-2',
    name: '游戏娱乐/电竞',
    group: 'media',
    keywords: ['game', 'gamepad', '游戏', '娱乐', 'steam', 'play', 'gaming', '电竞', '手柄', '休闲'],
    component: Gamepad2
  },

  // 办公协作
  {
    code: 'briefcase',
    name: '商务办公/工作',
    group: 'work',
    keywords: ['briefcase', 'office', '办公', '商务', '效率', '工作', 'work', 'productivity', 'job', 'crm'],
    component: Briefcase
  },
  {
    code: 'file-text',
    name: '文档表格/笔记',
    group: 'work',
    keywords: ['file', 'doc', '文档', '表格', '笔记', 'notion', 'word', 'excel', 'notes', '写作', 'writer'],
    component: FileText
  },
  {
    code: 'zap',
    name: '高效神速/自动化',
    group: 'work',
    keywords: ['zap', '高效', '速查', '自动化', 'workflow', 'boost', 'automation', 'shortcut', '快捷'],
    component: Zap
  },

  // 资讯知识
  {
    code: 'newspaper',
    name: '新闻资讯/时事',
    group: 'news',
    keywords: ['news', 'newspaper', '新闻', '资讯', '周刊', '媒体', 'feed', 'rss', '日报', '早报'],
    component: Newspaper
  },
  {
    code: 'book-open',
    name: '知识书籍/阅读',
    group: 'news',
    keywords: ['book', 'read', '知识', '阅读', '图书', '书籍', 'docs', 'wiki', '手册', '指南'],
    component: BookOpen
  },
  {
    code: 'graduation-cap',
    name: '学习教育/学术',
    group: 'news',
    keywords: ['learn', 'study', '学习', '教育', '课程', '大学', 'course', 'academy', '科研', '论文', 'academic'],
    component: GraduationCap
  },
  {
    code: 'globe',
    name: '全球互联网/导航',
    group: 'news',
    keywords: ['globe', '网络', '全球', '国际', 'web', 'internet', 'portal', 'world', '出海'],
    component: Globe
  },

  // 实用生活
  {
    code: 'wrench',
    name: '实用工具/百宝箱',
    group: 'tools',
    keywords: ['tool', 'tools', '工具', '实用', '便捷', 'toolbox', 'utility', '转换', '小工具', '计算'],
    component: Wrench
  },
  {
    code: 'shield-check',
    name: '安全防护/隐私',
    group: 'tools',
    keywords: ['shield', 'security', '安全', '隐私', '密码', 'auth', 'vpn', 'protect', '杀毒', '认证'],
    component: ShieldCheck
  },
  {
    code: 'shopping-bag',
    name: '电商购物/消费',
    group: 'tools',
    keywords: ['shop', 'shopping', '购物', '电商', '商城', '买买买', 'buy', 'store', 'market', '淘宝', '京东'],
    component: ShoppingBag
  },
  {
    code: 'coins',
    name: '财经金融/理财',
    group: 'tools',
    keywords: ['finance', 'money', '金融', '理财', '投资', '股票', '基金', 'crypto', 'coin', '虚拟币', '货币'],
    component: Coins
  },
  {
    code: 'message-square',
    name: '社区社交/交流',
    group: 'tools',
    keywords: ['social', 'community', '社区', '社交', '论坛', 'chat', '讨论', '群组', 'bbs', 'v2ex', 'reddit'],
    component: MessageSquare
  },
  {
    code: 'compass',
    name: '指南发现/探索',
    group: 'tools',
    keywords: ['compass', '导航', '探索', '发现', '旅行', 'travel', '地图', 'explore', 'guide'],
    component: Compass
  },
  {
    code: 'rocket',
    name: '创新前沿/产品',
    group: 'tools',
    keywords: ['rocket', '创新', '前沿', '起航', 'product', 'startup', '发布', '趋势', 'top'],
    component: Rocket
  },
  {
    code: 'coffee',
    name: '生活休闲/爱好',
    group: 'tools',
    keywords: ['coffee', '生活', '休闲', '美食', '日常', 'life', 'relax', '健康', '爱好'],
    component: Coffee
  },
  {
    code: 'search',
    name: '搜索引擎/检索',
    group: 'tools',
    keywords: ['search', '搜索', '查询', '引擎', '查重', 'google', 'baidu', 'find'],
    component: Search
  },
  {
    code: 'bookmark',
    name: '精选收藏/星标',
    group: 'tools',
    keywords: ['bookmark', 'favorite', '收藏', '精选', '推荐', '常用', 'star', '优质'],
    component: Bookmark
  },
  {
    code: 'package',
    name: '资源素材/下载',
    group: 'tools',
    keywords: ['package', 'resource', '资源', '素材', '下载', 'download', 'assets', '驱动', '软件'],
    component: Package
  },
  {
    code: 'layout-grid',
    name: '综合分类/矩阵',
    group: 'tools',
    keywords: ['grid', '综合', '全部', '分类', '全站', 'overview', 'all'],
    component: LayoutGrid
  },
  {
    code: 'folder',
    name: '常规文件夹/归档',
    group: 'tools',
    keywords: ['folder', '文件夹', '归档', '其他', '通用', 'general', 'misc'],
    component: Folder
  }
];

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
  const cleanCode = code.replace(/^#+/, '').replace(/^lucide:/, '').trim().toLowerCase();
  return CATEGORY_ICON_LIBRARY.find(item => item.code.toLowerCase() === cleanCode);
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

  for (const def of CATEGORY_ICON_LIBRARY) {
    if (def.keywords.some(kw => nameToMatch.includes(kw))) {
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
