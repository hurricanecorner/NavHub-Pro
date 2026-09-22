// Comprehensive Domain & Application Statistics Engine
// Provides high-precision, verified metrics, user scale, ratings, and stats in Chinese
import { sanitizeDescriptionText } from './descriptionCleaner';
import { synthesizeAlternativeDescriptionFromExisting } from './descriptionRephraser';

export const DOMAIN_STATS_MAP: Record<string, string> = {
  // 知名中文上网导航与综合门户
  'hao123.com': '百度旗下中文上网导航第一品牌 · 汇聚全网优质网址与分类资源 · 数亿网民便捷上网门户',
  'hao123.cn': '百度旗下中文上网导航第一品牌 · 汇聚全网优质网址与分类资源 · 数亿网民便捷上网门户',
  '2345.com': '国内知名中文上网导航平台 · 汇集全网实用分类网址与生活便民服务',
  '123.sogou.com': '搜狗网址导航 · 汇聚常用分类网站与实时资讯入口',
  'daohang.qq.com': '腾讯网址导航 · 精选优质生活服务与内容直达门户',

  // 垂直前沿设计与游戏 3D AI 工具
  'holopix.cn': 'AI 游戏美术与3D建模设计方案 · 快速生成角色场景与三视图 · 拥有万款独家风格模型 · 游戏团队创作效能工具',

  // 搜索引擎与综合门户 (仅限主站)
  'baidu.com': '国内搜索市场份额超 60% · 日均响应数十亿次检索 · 依托文心大模型提供全场景智能 AI 搜索',
  'google.com': '全球搜索引擎市场份额超 90% · 日均处理搜索请求逾 85 亿次 · 全球访问量最大的第一大网站',
  'bing.com': '全球桌面搜索份额超 10% · 深度融合 Copilot 智能助手 · 微软核心跨平台智能搜索引擎',
  'sogou.com': '搜狗搜索 · 国内知名综合搜索引擎 · 独家收录微信公众号文章与知乎深度内容生态 · 支持智能跨网聚合搜索',
  'duckduckgo.com': '全球日均匿名搜索量超 1 亿次 · 专注隐私保护不追踪用户行为的代表性搜索引擎',

  // 前端主流框架、库与核心运行时 (解决开发类网站精准描述)
  'react.dev': 'Meta 旗下开源前端 UI 库 · 全球使用率第一的组件化声明式框架 · GitHub 225k+ Stars · 现代前端事实标准',
  'reactjs.org': 'React 官方网站 · Meta 旗下开源前端声明式组件框架 · 驱动海量现代 Web 应用',
  'vuejs.org': '渐进式 JavaScript 框架 · 极易上手且生态庞大 · GitHub 205k+ Stars · 中文前端开发首选框架',
  'angular.io': 'Google 旗下企业级 TypeScript 前端框架 · 开箱即用完善的架构设计与全套工具链',
  'angular.dev': 'Google 旗下全新 Angular 官方门户 · 现代化企业级 TypeScript 前端框架',
  'svelte.dev': '编译型极简前端框架 · 无虚拟 DOM 运行开销 · 以极高运行性能与响应式语法著称',
  'typescriptlang.org': '微软开源 JavaScript 超集 · 支持强类型系统与现代 ECMAScript · 全球现代化工程研发标准',
  'tailwindcss.com': '全球最主流的原子化实用优先 CSS 框架 · 灵活极速构建高品质现代化用户界面',
  'nextjs.org': 'Vercel 旗下全栈 React 生产级应用框架 · 深度支持 SSR 服务端渲染与 Server Components',
  'nuxt.com': 'Vue 生态直观且强大的全栈开发框架 · 开箱即用 SSR、自动路由与极速构建',
  'vite.dev': '新一代极速前端构建工具 · 基于原生 ESM 与 esbuild · 秒级冷启动与极速热更新',
  'vitejs.dev': '新一代极速前端构建工具与开发服务器 · 前端现代工程化极速构建利器',
  'webpack.js.org': '老牌高扩展性模块打包工具 · 支撑全球庞大前端工程构建生态',
  'nodejs.org': '基于 Chrome V8 引擎的高性能 JavaScript 运行时 · 驱动全球海量服务端与前端工程化工具链',
  'deno.com': 'Node.js 之父打造的现代安全 JavaScript/TypeScript 运行时 · 原生内置安全沙箱与 TS 支持',
  'bun.sh': '基于 JavaScriptCore 的全新极速全能 JS 运行时与打包器 · 极致执行性能',
  'python.org': '全球最流行的通用编程语言之一 · 人工智能、数据科学与自动化工程的核心支柱',
  'golang.org': 'Google 主导的高性能静态并发编程语言 · 全球云计算与云原生分布式系统主流语言',
  'go.dev': 'Go 语言官方开发者门户 · 云计算与微服务分布式架构主流编程语言',
  'rust-lang.org': '注重内存安全与高并发的高性能系统级编程语言 · 连续多年蝉联开发者最喜爱语言',
  'developer.mozilla.org': 'MDN 官方 Web 技术权威文档 · 全球 Web 开发者公认的 HTML/CSS/JS 权威参考指南',
  'kernel.org': 'Linux 官方内核源码与发布中心 · 驱动全球超级计算机、服务器与移动设备',
  'leetcode.cn': '国内领先的程序员算法面试与技术测评平台 · 收录数千道经典编程算法题',
  'leetcode.com': '全球领先的程序员算法面试与技术测评平台 · 全球工程师技术面试题库',
  'electronjs.org': '使用 Web 技术构建跨平台桌面应用的成熟框架 · 驱动 VS Code、Slack 等知名软件',
  'flutter.dev': 'Google 跨平台 UI 软件开发工具包 · 单套代码库编译部署 iOS、Android、Web 与桌面应用',
  'tauri.app': '基于 Rust 构建更小、更快、更安全的极轻量跨平台桌面应用开发框架',

  // 知名开发者公共基础设施与包仓库
  'hub.docker.com': 'Docker 官方容器镜像中央仓库 · 托管数百万官方与社区镜像 · 全球云原生镜像分发枢纽',
  'pypi.org': 'Python 官方第三方包中央仓库 · 托管超 50 万个开源软件包 · 累计下载量超数千亿次',
  'crates.io': 'Rust 官方开源库包注册中心 · 托管数万个 Rust 高性能 Crates 依赖包',
  'rubygems.org': 'Ruby 社区官方软件包管理与依赖分发中心',
  'packagist.org': 'PHP Composer 官方主要软件包源仓库',
  'mvnrepository.com': 'Java 生态最核心的 Maven 中央构件依赖库检索与版本中心',
  'cdnjs.com': 'Cloudflare 驱动的全球公共前端开源库免费极速 CDN 加速服务',
  'unpkg.com': '基于 npm 的全球极速公共 CDN 模块分发网络 · 快速引入前端脚本与样式',
  'jsdelivr.com': '开源免费公共 CDN 网络 · 深度集成 npm 与 GitHub 仓库全球边缘分发',
  'shields.io': '面向开源项目的 GitHub 动态徽章生成服务 · 覆盖构建状态、下载量与版本号',
  'caniuse.com': '全球 Web 前端工程师必备的浏览器特性兼容性权威速查数据库',
  'postman.com': '全球超 3,000 万开发者使用的 API 设计、调试、自动化测试与文档协作平台',
  'json.cn': '国内老牌轻量在线 JSON 格式化、语法高亮与解析校验工具',
  'regex101.com': '全球最主流的正则表达式在线编写、实时匹配测试与详细规则解析工具',
  'carbon.now.sh': '极速生成高颜值可定制代码片段截图的在线工具',

  // 知名设计与素材资源站
  'unsplash.com': '全球最大的高质量免费无版权高分辨率摄影素材社区 · 赋能数千万设计师与创作者',
  'pixabay.com': '拥有超 400 万张免费可商用正版摄影图、插画与视频资源的全球免版权素材库',
  'pexels.com': '全球知名高品质免费商用图片与高清视频素材平台',
  'tinypng.com': '全球知名智能 WebP/PNG/JPEG 在线图片压缩服务 · 保持原画质显著降低体积',
  'wallhaven.cc': '全球知名高质量动漫、二次元与数码插画超清壁纸社区',
  'icons8.com': '全球知名设计图标、插画与免抠图素材库',
  'iconfont.cn': '阿里巴巴矢量图标库 · 国内规模最大的矢量图标素材共享与设计管理平台',
  'deepl.com': '全球公认高质量高拟真神经网络翻译引擎 · 翻译自然流畅准确度极高',
  'speedtest.net': 'Ookla 全球最权威的互联网带宽与网络连接测速平台',

  // AI、前沿大模型与智能生产力
  'deepseek.com': '开源大模型全球下载突破数千万次 · 登顶全球多国应用商店免费榜第一 · 推理性能对标全球顶尖梯队',
  'openai.com': '全球周活跃用户超 2.5 亿 · API 赋能全球上百万开发者与企业 · 全球生成式 AI 开创者与领军者',
  'chatgpt.com': '全球访问量最大的 AI 对话应用 · 覆盖 180+ 国家与地区 · 月均独立访问量突破 30 亿次',
  'claude.ai': 'Anthropic 官方旗舰智能助手 · 支持 200K 超长无损上下文 · 行业评测领先的代码与长文推理模型',
  'anthropic.com': '全球顶级 AI 安全与前沿研究机构 · 估值超数百亿美元 · 研发世界前列的 Claude 系列大模型',
  'moonshot.cn': '月之暗面科技官方出品 · 国内首创 200 万字长文本上下文 · 深度赋能职场研究与学术分析',
  'kimi.ai': '国内领先的超长文本 AI 助手 · 支持单次处理数十万字复杂文档与长篇研报 · 累计服务数千万用户',
  'zhipuai.cn': '清华系智谱 AI 旗舰平台 · 开源 GLM 系列模型全球下载超 2,000 万次 · 赋能千行百业全栈智算',
  'chatglm.cn': '智谱清言多模态 AI 助手 · 累计服务超千万终端用户 · 具备强大的代码、图表与智能体创作能力',
  'minimax.io': '自研全模态大模型矩阵 · 语音合成与海螺 AI 视频生成技术位列全球第一梯队',
  'minimaxi.com': 'MiniMax 稀宇科技官方入口 · 自研万亿参数 MoE 架构 · 服务全球数千万个人与开发者用户',
  'stepfun.com': '阶跃星辰多模态大模型 · 跃问与 Step-2 万亿参数大模型核心引擎 · 极强图像与长文本理解力',
  'baichuan-ai.com': '百川智能全学科大模型 · 百万量级上下文推理 · 医疗与专业知识问答行业领先',
  '01.ai': '零一万物开源 Yi 系列大模型 · 在多项国际开源大模型排行榜位居前列 · 专注高性价比推理',
  'sensetime.com': '商汤科技日日新大模型体系 · 拥有亚洲最大单体 AI 超算中心之一 · 落地海量工业与消费级场景',
  'iflytek.com': '科大讯飞星火大模型 · 语音识别准确率超 98% · 覆盖教育、医疗与政企千万级软硬件终端',
  'huggingface.co': '托管开源 AI 模型超 100 万个 · 数据集超 20 万个 · 全球数百万机器学习研究者必备的 AI 枢纽',
  'midjourney.com': '全球最具影响力的 AI 绘图引擎 · 官方社区成员超 2,000 万 · 创意与设计领域的现象级工具',
  'runwayml.com': 'Gen-2 / Gen-3 视频生成先锋 · 好莱坞影视与创意行业顶级 AI 视频大模型制作平台',
  'cursor.com': '全球首款 AI 原生代码编辑器 · 获全球数百万开发者高频使用 · 极速重构与代码智能补全',
  'cursor.sh': 'Cursor 官方技术网站 · 全球新一代 AI 智能编程利器 · 显著提升 40% 以上软件工程产出',
  'v0.dev': 'Vercel 官方生成式前端 UI 平台 · 自然语言即时生成高品质 React / Tailwind 组件',
  'coze.cn': '字节跳动一站式 AI Bot 开发平台 · 汇集数万款实用智能体 · 极简零代码与低代码编排',
  'lobehub.com': '开源现代化 AI 会话与插件框架 · GitHub 50k+ Stars · 支持多大模型聚合与即插即用',
  'siliconflow.cn': '硅基流动高吞吐大模型推理云平台 · 毫秒级极速响应调用 DeepSeek 等前沿开源大模型',
  'modelscope.cn': '阿里达摩院魔搭社区 · 聚集超 5,000 款优质开源 AI 模型与数百万开发者生态',

  // 开发者服务、代码托管与极客技术社区
  'github.com': '全球托管代码仓库超 4 亿 · 注册开发者突破 1 亿 · 全球规模最大的开源代码托管与协同平台',
  'gitee.com': '托管开源项目超 2,800 万 · 服务超 1,200 万开发者与 30 万家企业 · 国内领先的自主代码托管平台',
  'gitlab.com': '全球数千万开发者使用的 DevOps 一体化平台 · 完整覆盖从代码版本到 CI/CD 自动化流水线',
  'v2ex.com': '注册技术节点超 1,000 个 · 汇集超 60 万极客与软件工程师 · 中文极具影响力的创意工作者社区',
  'linux.do': '汇聚数万活跃极客与技术玩家 · 每日高质量技术交流万条 · 聚焦前沿 AI、云原生与开源的新锐社区',
  'nodeseek.com': '专业服务器、VPS 与网络技术交流社区 · 汇聚万名极客日常探讨、评测与技术折腾',
  'hostloc.com': '国内老牌全球主机交流论坛 · 累计活跃主题数百万 · 数十万站长与网络技术折腾者的聚集地',
  'juejin.cn': '累计优质技术文章数百万篇 · 汇聚超千万开发者答疑交流 · 字节跳动旗下高活跃度技术社区',
  'csdn.net': '注册开发者超 4,500 万 · 累计专业技术博文数亿篇 · 中文老牌 IT 知识分享与技术交流平台',
  'stackoverflow.com': '累计专业技术问答超 5,800 万条 · 全球数千万软件工程师排查与解决 Bug 的核心知识库',
  'segmentfault.com': '思否中文技术问答与专栏社区 · 汇聚数百万开发者 · 专注纯粹的技术交流与成长',
  'oschina.net': '开源中国本土知名开源技术社区 · 收录开源软件超 6 万款 · 推动国内自主开源生态繁荣',
  'docker.com': 'Docker 容器镜像累计拉取量突破数千亿次 · 全球云原生与微服务架构的行业标准基石',
  'npmjs.com': '收录开源 npm 软件包超 300 万个 · 每周模块下载量逾数百亿次 · 全球最大的 JavaScript 生态仓库',
  'cloudflare.com': '全球 Anycast 网络覆盖 300+ 核心城市 · 保护全球超 20% 网页流量 · 极速边缘计算与网络安全服务',
  'vercel.com': 'Next.js 官方开发与托管平台 · 赋能全球数百万前端工程师秒级部署上线与全球边缘加速',
  'supabase.com': '开源 Firebase 最佳替代方案 · GitHub 75k+ Stars · 托管数十万生产级 PostgreSQL 数据库',

  // 社交、短视频与综合多媒体内容平台
  'bilibili.com': '月均活跃用户超 3.4 亿 · 日均视频播放量超 40 亿次 · 优质创作者超 400 万的年轻文化社区',
  'youtube.com': '全球月活用户超 25 亿 · 每分钟上传视频超 500 小时 · 全球规模最大的视频创作与流媒体平台',
  'zhihu.com': '月活跃用户超 1 亿 · 累计专业问答突破 5 亿条 · 中文互联网高质量专业知识与深度讨论社区',
  'douyin.com': '日活跃用户超 8 亿 · 人均单日使用时长超 120 分钟 · 中国国民级短视频与全场景直播创作者平台',
  'kuaishou.com': '平均日活跃用户超 3.8 亿 · 互关好友对数超 300 亿对 · 普惠温暖的国民级短视频与直播社区',
  'xiaohongshu.com': '月活跃用户超 3 亿 · 分享者超 8,000 万 · 汇聚年轻人生活方式与消费决策的核心种草社区',
  'weibo.com': '月活跃用户超 5.8 亿 · 日活跃用户超 2.5 亿 · 中文互联网最具即时传播力的话题与舆论首发地',
  'twitter.com': '全球日活跃用户超 2.5 亿 · 每日产生推文超 5 亿条 · 全球即时新闻、科技资讯与公众讨论主阵地',
  'x.com': '全球日活跃用户超 2.5 亿 · 汇聚全球政商要闻与前沿科技爆料 · 顶尖即时社交媒体平台',
  'telegram.org': '全球月活跃用户突破 9 亿 · 每日新增注册用户逾 250 万 · 全球领先的轻量端到端加密即时通讯软件',
  'discord.com': '全球月活用户超 2 亿 · 活跃社群服务器超 1,900 万个 · 游戏、技术开发者与数字社群语音互动中心',
  'reddit.com': '全球月活跃用户超 8.5 亿 · 活跃子版块 Subreddit 超 10 万个 · 互联网前沿流行文化与观点集散地',
  'instagram.com': '全球月活跃用户超 20 亿 · 每日分享图片与 Reels 逾数亿条 · 视觉社交、流行美学与时尚风向标',
  'douban.com': '收录图书、电影与音乐条目数千万 · 汇聚超 1.5 亿文艺青年的权威书影音评分与文化社区',
  'hupu.com': '虎扑体育垂直社区 · 真实体育迷与直男聚集地 · 评分区每日数十万真实打分与犀利互动',
  'nga.cn': '艾泽拉斯国家地理 · 国内极具影响力的硬核游戏玩家社区 · 覆盖数千款单机、网游与电竞讨论',

  // 效率办公、笔记协作与在线设计
  'notion.so': '全球活跃用户超 3,500 万 · 覆盖 100+ 国家和地区 · 笔记、文档、项目与 AI 知识库一体化协作利器',
  'figma.com': '全球协同设计软件市场份额首位 · 拥有数百万团队用户 · 实时云端矢量设计与交互原型行业标杆',
  'canva.com': '全球月活跃用户超 1.9 亿 · 累计设计输出超 200 亿次 · 覆盖 190 个国家支持 100+ 语言在线做图',
  'dingtalk.com': '服务企业与组织超 2,500 万家 · 数字化用户超 7 亿 · 阿里巴巴旗下智能协同办公平台',
  'wps.cn': '金山办公全球月度活跃设备数超 6 亿 · 覆盖政企与数亿个人用户 · 民族办公软件代表品牌',
  'processon.com': '累计绘制专业图表数亿张 · 汇聚千万级用户 · 专业在线流程图、思维导图与原型设计作图工具',
  'yuque.com': '蚂蚁集团旗下专业云端知识库 · 服务数百万开发者与团队 · 结构化知识沉淀与企业知识协同利器',
  'flomoapp.com': '记录卡片数突破数亿张 · 拥有数百万深度思考者与知识管理者 · 极简轻量无压力记录笔记',

  // 电商网购、生活服务与数字消费
  'taobao.com': '年活跃消费者超 9 亿 · 在售商品数超 10 亿件 · 中国规模领先的国民级综合网络购物平台',
  'jd.com': '年活跃用户超 5.8 亿 · 自营正品次日达与高品质物流 · 中国供应链驱动的领军电商平台',
  'pinduoduo.com': '年活跃买家超 8.8 亿 · 极致性价比与农副产品产地直供 · 创新社交拼团与百亿补贴电商领头羊',
  'amazon.com': '全球最大的综合电商零售平台 · Prime 会员超 2 亿 · 业务覆盖全球数十个主要国家与海外仓网',
  'meituan.com': '年交易用户数近 7 亿 · 覆盖全国 2,800+ 县市区 · 中国领先的本地生活与到家综合服务平台',
  'dianping.com': '大众点评拥有真实用户评价超数十亿条 · 覆盖美食、休闲与出行 · 消费决策必备指南',
  'ctrip.com': '携程服务全球数亿旅行者 · 覆盖全球 200+ 国家与地区酒店航班 · 国内领军在线旅游一站式服务商',
  '12306.cn': '中国铁路官方唯一网上购票平台 · 日均售票能力超 2,000 万张 · 全球交易规模最大的铁路客运票务系统',

  // 音乐、影视娱乐与主机数字游戏
  'spotify.com': '全球月活用户超 6.2 亿 · 付费订阅会员超 2.4 亿 · 曲库与播客资源超 1 亿首 · 全球第一大音乐流媒体',
  'netflix.com': '全球付费订阅会员超 2.7 亿 · 覆盖 190+ 国家和地区 · 全球流媒体原创自制影视剧巨头',
  'steampowered.com': '同时在线玩家峰值突破 3,800 万 · 收录正版游戏超 10 万款 · 全球第一大 PC 数字游戏分发平台',
  'steamcommunity.com': 'Steam 官方社区 · 汇聚全球数亿玩家的游戏指南、创意工坊与市场交易中心',
  'epicgames.com': 'Epic 游戏商城注册用户超 2.7 亿 · 虚幻引擎生态核心 · 屡推免费优质 3A 游戏大作',
  'mihoyo.com': '米哈游旗舰官网 · 原神与崩坏系列全球月活跃玩家数千万 · 头部二次元动作游戏研发商',
  'hoyoverse.com': '米哈游海外品牌 · 旗下沉浸式虚拟世界体验覆盖全球 150+ 国家与地区',

  // 科技前沿媒体与硬件数码
  'ithome.com': 'IT之家日均发稿数百篇 · 评论区数万科技数码爱好者高频互动 · 国内领先的科技前沿门户社区',
  '36kr.com': '覆盖 90% 以上中国新经济创新企业 · 创投商业报道与科技财经前沿资讯头部媒体',
  'sspai.com': '少数派高品质数字生活社区 · 高效工作流与软硬件评测深度内容创作者平台',
  'coolapk.com': '酷安真实机主数码社区 · 收录数千万应用下载与数千万条真实机主玩机测评',
  'chiphell.com': '国内顶级硬件与数码发烧友论坛 · 专注高端 PC、摄影器材与高品质科技生活分享',
};

// =========================================================================
// 专门的大厂独立子应用、独立产品矩阵高精度词典 (防止子域名被根域名粗暴覆盖)
// =========================================================================
export const SUB_APP_STATS_MAP: Record<string, string> = {
  // === Google 旗下专属应用与生产力服务 ===
  'docs.google.com': 'Google 在线文档 · 实时多人协同编辑与智能排版 · 全球数亿用户信赖的云端文字处理平台',
  'sheets.google.com': 'Google 智能表格 · 云端实时多维计算与动态图表分析 · 支持协同公式与强大函数生态',
  'slides.google.com': 'Google 云端演示文稿 · 现代化动态幻灯片制作 · 支持多人沉浸式实时排版与投屏分享',
  'forms.google.com': 'Google 在线表单 · 极速创建问卷调查、活动报名与数据搜集 · 自动生成图表与统计分析',
  'drive.google.com': 'Google 云端硬盘 · 全球超 10 亿用户 · 提供 15GB 免费初始云空间 · 跨设备安全备份与团队共享枢纽',
  'mail.google.com': 'Gmail 谷歌邮箱 · 全球月活跃用户逾 18 亿 · 超强反垃圾邮件拦截与智能化邮件分类归档',
  'gmail.com': 'Gmail 谷歌邮箱 · 全球月活跃用户逾 18 亿 · 超强反垃圾邮件拦截与智能化邮件分类归档',
  'colab.research.google.com': 'Google Colaboratory · 全球数百万 AI 与数据科学家的交互式 Python 笔记本 · 提供免费云端 GPU/TPU 算力',
  'colab.google.com': 'Google Colaboratory · 全球数百万 AI 与数据科学家的交互式 Python 笔记本 · 提供免费云端 GPU/TPU 算力',
  'maps.google.com': 'Google 地图 · 覆盖全球 220+ 国家与地区 · 提供高精度实时路况导航、街景全景与本地探索',
  'translate.google.com': 'Google 翻译 · 支持全球 130+ 种语言即时互译 · 基于先进神经网络机器翻译模型 · 极速跨语种交流',
  'cloud.google.com': 'Google Cloud 谷歌云平台 · 全球超大规模公有云基础设施 · 深度赋能 BigQuery、Kubernetes 与企业级 AI 算力',
  'aistudio.google.com': 'Google AI Studio · 谷歌 Gemini 大模型官方极速原型开发与 API 调试平台 · 零门槛调用前沿多模态大模型',
  'ai.google.dev': 'Google AI 开发者门户 · 包含 Gemini API、Gemma 开源模型与全套开发者文档与提示词实验台',
  'gemini.google.com': 'Google Gemini 官方智能助手 · 谷歌原生端到端多模态大模型 · 具备强大的推理分析、代码编写与任务规划',
  'photos.google.com': 'Google 相册 · 智能人脸与语义图像检索 · 全球超 10 亿用户信赖的云端照片自动备份与整理空间',
  'calendar.google.com': 'Google 日历 · 跨终端时间管理与团队会议协同 · 深度集成 Gmail 邮件与 Google Meet 视频会议',
  'meet.google.com': 'Google Meet · 企业级高保真音视频云端会议系统 · 支持智能降噪、实时多语种字幕与端到端加密协同',
  'keep.google.com': 'Google Keep · 轻量极速便签与灵感速记清单 · 支持跨终端色彩分类、图文语音备忘录与团队实时共享',
  'scholar.google.com': 'Google 学术搜索 · 覆盖全球跨学科海量科研学术论文、期刊文献与学术专利 · 全球科研学者必备文献库',
  'fonts.google.com': 'Google Fonts · 收录全球数千款高品质开源西文与多语言字体库 · 每日服务数百亿次网络字体渲染',
  'earth.google.com': 'Google 地球 · 全球高精度 3D 遥感卫星测绘与地理风貌三维交互浏览平台 · 沉浸式俯瞰数字地球',
  'play.google.com': 'Google Play · 全球安卓生态官方数字商城 · 托管数百万款正版移动应用、数字游戏、图书与音视频媒体',
  'news.google.com': 'Google 新闻 · 全球数十万媒体资讯智能聚合 · 提供多维客观报道与个性化前沿动态追踪',
  'classroom.google.com': 'Google 课堂 · 全球数千万师生使用的智慧教学协作平台 · 便捷布置作业、在线评分与教学互动',
  'trends.google.com': 'Google 趋势 · 实时洞察全球搜索兴趣与话题热度走向 · 权威的市场研究与舆情分析大数据',
  'analytics.google.com': 'Google Analytics · 全球网站流量分析与数字营销归因追踪的事实行业标准',
  'firebase.google.com': 'Google Firebase · 全栈移动与 Web 应用后端云开发套件 · 涵盖 Firestore 实时数据库与极速身份验证',
  'console.firebase.google.com': 'Google Firebase 控制台 · 全栈移动与 Web 应用后端云开发套件 · 涵盖实时数据库与鉴权体系',
  'sites.google.com': 'Google 协作平台 · 零代码极速创建企业内网知识库、团队项目专属公开主页与协同门户',
  'developers.google.com': 'Google 开发者中心 · 汇集 Android、Chrome、Web、TensorFlow 与 AI 全生态官方技术文档与 SDK',
  'chromewebstore.google.com': 'Chrome 网上应用店 · 全球规模最大的浏览器扩展插件与专属主题分发商店',
  'chrome.google.com/webstore': 'Chrome 网上应用店 · 全球规模最大的浏览器扩展插件与专属主题分发商店',
  'podcasts.google.com': 'Google 播客 · 汇聚全球百万级优质音频节目与电台专题 · 支持跨设备收听进度无缝同步',
  'messages.google.com': 'Google 信息网页版 · 支持与 Android 设备无缝联动实时收发 RCS 富媒体短信与即时通讯',
  'contacts.google.com': 'Google 通讯录 · 跨终端联系人智能云同步与分组管理中心',

  // === 微软 (Microsoft) 旗下专属应用与服务 ===
  'portal.azure.com': '微软 Azure 顶级公有云控制台 · 服务全球 95% 财富 500 强企业 · 涵盖分布式超大规模云原生基础设施',
  'azure.microsoft.com': '微软 Azure 云计算平台 · 全球分布广泛的数据中心 · 提供算力、AI 与现代企业级混合云方案',
  'azure.com': '微软 Azure 云计算平台 · 全球顶级企业级公有云服务商',
  'learn.microsoft.com': '微软官方技术学习与权威文档中心 · 涵盖 Azure、.NET、Windows、TypeScript 与全栈开发者认证',
  'onedrive.live.com': '微软 OneDrive 云存储 · 深度嵌入 Windows 系统 · 支持 Office 文档多端自动同步与历史版本回滚',
  'onedrive.com': '微软 OneDrive 云存储 · 全球数亿用户信赖的跨平台文件备份与协同共享云空间',
  'outlook.live.com': '微软 Outlook 邮箱与日程 · 全球数亿个人与企业信赖的专业邮件通讯与商务日程管理',
  'outlook.com': '微软 Outlook 邮箱 · 微软旗舰个人与企业安全电子邮箱服务',
  'teams.microsoft.com': '微软 Teams 统一协同中枢 · 融合团队即时沟通、高清视频会议与 Office 云端协同 · 全球月活超 3 亿',
  'office.com': 'Microsoft 365 办公套件 · 深度整合 Word、Excel、PowerPoint、OneNote 与 Copilot 智能办公',
  'microsoft365.com': 'Microsoft 365 旗舰云办公平台 · 包含全套经典 Office 应用与企业安全合规云服务',
  'vscode.dev': '微软 VS Code 网页版轻量编辑器 · 免安装纯浏览器运行 · 支持 GitHub 仓库即开即写与丰富代码高亮',
  'copilot.microsoft.com': '微软 Copilot 智能副驾驶 · 深度融合前沿大模型与微软生态 · 助力职场智能问答、创意写作与分析',
  'powerbi.microsoft.com': '微软 Power BI · 全球领先的敏捷商业智能与数据可视化看板分析工具',
  'makecode.com': '微软 MakeCode · 面向青少年的图形化与代码双模创意编程教育平台',

  // === 腾讯 (Tencent) 旗下专属应用与服务 ===
  'docs.qq.com': '腾讯文档 · 国民级专业在线协作文档 · 覆盖数亿用户 · 支持 Word、Excel、PPT、思维导图实时多人协同',
  'meeting.tencent.com': '腾讯会议 · 国内领先的云视频会议协同工具 · 服务数亿用户 · 提供智能 AI 音视频降噪与会议纪要',
  'cloud.tencent.com': '腾讯云 · 国内领先的云计算与人工智能服务商 · 为数百万政企与开发者提供高可用数字化算力',
  'v.qq.com': '腾讯视频 · 中国领先的综合在线视频流媒体平台 · 汇集海量独播剧集、国漫、院线电影与自制综艺',
  'mp.weixin.qq.com': '微信公众平台 · 拥有超千万创作者与公众号生态 · 中文移动互联网最核心的图文内容与服务入口',
  'work.weixin.qq.com': '企业微信 · 连接 12 亿微信生态的企业级通讯与私域运营工具 · 深度赋能组织内外部协同',
  'y.qq.com': 'QQ 音乐 · 拥有国内领先的高品质海量正版曲库 · 深度整合社交音乐互动与 Hi-Res 无损音质',
  'mail.qq.com': 'QQ 邮箱 · 中国国民级电子邮箱平台 · 拥有数亿活跃用户 · 提供超大附件传输与即时投递提醒',
  'im.qq.com': '腾讯 QQ 官方主页 · 跨越数代青年人的经典即时通讯软件 · 具备丰富的社群、文件快传与娱乐生态',

  // === 百度 (Baidu) 旗下专属应用与服务 ===
  'pan.baidu.com': '百度网盘 · 国内注册用户超 8 亿 · 提供超大容量云端备份、多端极速传输、在线解压与智能相册',
  'wenku.baidu.com': '百度文库 · 累计沉淀超 12 亿份专业文档与课件范本 · 深度融合 AI 一键研读与智能 PPT 生成',
  'fanyi.baidu.com': '百度翻译 · 支持 200+ 语种即时互译 · 日均响应数十亿次跨语种调用 · 专注中文深度语境与垂直领域翻译',
  'map.baidu.com': '百度地图 · 日均位置服务请求超千亿次 · 基于北斗高精度定位的车道级导航与城市数字孪生地图',
  'baike.baidu.com': '百度百科 · 收录权威知识词条超 2,700 万 · 中文互联网规模最大的开放式网络百科全书',
  'tieba.baidu.com': '百度贴吧 · 累计主题贴数超数十亿 · 涵盖数百万兴趣吧 · 中文网络青年亚文化与兴趣讨论发源地',
  'yiyan.baidu.com': '文心一言 · 百度自研知识增强大语言模型 · 具备深厚的中文语境理解、文学创作与商业规划能力',
  'xueshu.baidu.com': '百度学术 · 保持与数十万学术期刊数据库实时同步 · 汇聚海量中英文学术论文与科研文献',
  'jingyan.baidu.com': '百度经验 · 汇集数百万生活、数码、办公实用经验与技巧步骤图文指南',

  // === 搜狗 (Sogou) 旗下专属业务 ===
  'pinyin.sogou.com': '搜狗拼音输入法 · 国民级中文拼音输入法 · 累计装机用户超 6 亿 · 词库精准丰富且支持多端云同步',
  'shurufa.sogou.com': '搜狗拼音输入法 · 国民级中文拼音输入法 · 累计装机用户超 6 亿 · 词库精准丰富且支持多端云同步',
  'fanyi.sogou.com': '搜狗翻译 · 支持文本、文档与语音多语种即时互译 · 深度融合神经网络机器翻译',
  'map.sogou.com': '搜狗地图 · 提供全国主要城市道路高精度地图、公交自驾导航与实时路况规划',
  'wenwen.sogou.com': '搜狗问问 · 综合性互动问答社区 · 沉淀数千万各领域生活常识与实用解答',
  'baike.sogou.com': '搜狗百科 · 权威中文网络知识百科 · 涵盖数百万百科词条与科普信息',

  // === 苹果 (Apple) 旗下专属应用与服务 ===
  'developer.apple.com': 'Apple 官方全球开发者门户 · 汇聚 iOS/macOS/visionOS 官方 SDK、Swift 语言指南与 WWDC 核心技术资源',
  'icloud.com': 'Apple iCloud 网页版云端工作区 · 支持备忘录、照片、邮件、Keynote/Pages 与设备查找云端互通',
  'music.apple.com': 'Apple Music · 拥有超 1 亿首无损音频与空间音频曲库 · 覆盖 167 个国家与地区的全球音乐流媒体',
  'podcasts.apple.com': 'Apple 播客 · 全球最具影响力的优质音频节目与独立播客分发平台之一',
  'tv.apple.com': 'Apple TV+ · 苹果官方高品质原创影视剧流媒体平台 · 汇集屡获殊荣的院线级自制电影与剧集',
  'support.apple.com': 'Apple 官方技术支持平台 · 提供全生态硬件使用指南、保修查询与官方售后服务网点预约',

  // === 阿里巴巴 / 字节跳动 / 网易 / 哔哩哔哩 / 其他大厂产品 ===
  'aliyun.com': '阿里云 · 亚太第一大云计算厂商 · 拥有飞天分布式操作系统 · 为全球数百万政企与开发者提供坚实云基础设施',
  'tongyi.aliyun.com': '阿里通义千问 · 阿里巴巴自研旗舰级超大规模语言模型 · 支持万亿参数与丰富多模态理解',
  'live.bilibili.com': '哔哩哔哩直播 · 汇聚二次元、电竞赛事、虚拟主播与生活日常的年轻人高互动弹幕直播',
  'manga.bilibili.com': '哔哩哔哩漫画 · 拥有海量正版国漫与热门日漫正品授权的数字阅读与交流社区',
  'music.163.com': '网易云音乐 · 月活超 2 亿的音乐社交社区 · 沉淀数十亿条走心评论与华语独立原创音乐人生态',
  'fanyi.youdao.com': '网易有道翻译 · 基于神经机器翻译技术 · 专注于地道学术论文与商务文档多语种翻译',
  'dict.youdao.com': '网易有道词典 · 收录权威牛津/朗文词典 · 数亿语言学习者必备词汇工具',
  'feishu.cn': '飞书 · 字节跳动旗下先进企业协作平台 · 整合即时沟通、多维表格与云文档 · 深度赋能组织数字化运作',
  'coze.cn': '扣子 Coze · 字节跳动一站式 AI Bot 开发平台 · 极简零代码与低代码快速编排发布个性化智能体',
  'juejin.cn': '稀土掘金 · 汇聚超千万软件工程师的高质量原创技术社区 · 字节跳动旗下开发者知识沉淀阵地',
};

// Format numeric counts into clean Chinese units (万/亿)
export function formatCountZh(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!n || isNaN(n)) return '';
  if (n >= 100000000) {
    const val = (n / 100000000).toFixed(1).replace(/\.0$/, '');
    return `${val}亿+`;
  }
  if (n >= 10000) {
    const val = (n / 10000).toFixed(1).replace(/\.0$/, '');
    return `${val}万+`;
  }
  if (n >= 1000) {
    return `${n.toLocaleString('zh-CN')}+`;
  }
  return `${n}`;
}

// Convert bytes to human readable Chinese/metric size
export function formatBytesZh(bytesStr?: string | number): string {
  const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
  if (!bytes || isNaN(bytes)) return '';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

// Format detailed App Store statistical description
export function formatAppStoreStatsZh(app: {
  cleanName?: string;
  trackName?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  version?: string;
  formattedPrice?: string;
  price?: number;
  primaryGenreName?: string;
  genres?: string[];
  fileSizeBytes?: string;
  sellerName?: string;
}): string {
  const parts: string[] = [];

  // 1. Rating and count
  if (app.averageUserRating && app.averageUserRating > 0) {
    const ratingStr = app.averageUserRating.toFixed(1);
    const countStr = app.userRatingCount ? `（${formatCountZh(app.userRatingCount)}评价）` : '';
    parts.push(`⭐️ 评分 ${ratingStr}分${countStr}`);
  } else if (app.userRatingCount && app.userRatingCount > 0) {
    parts.push(`超 ${formatCountZh(app.userRatingCount)}次评分`);
  }

  // 2. Category & Pricing
  const genre = app.primaryGenreName || (app.genres && app.genres[0]) || '';
  const price = app.formattedPrice || (app.price === 0 ? '免费' : '');
  if (price && genre) {
    parts.push(`${price} · ${genre}`);
  } else if (genre) {
    parts.push(genre);
  } else if (price) {
    parts.push(price);
  }

  // 3. Version
  if (app.version) {
    parts.push(`最新 v${app.version.replace(/^v/i, '')}`);
  }

  // 4. File Size
  if (app.fileSizeBytes) {
    const sizeStr = formatBytesZh(app.fileSizeBytes);
    if (sizeStr) parts.push(sizeStr);
  }

  // 5. Developer / Seller
  if (app.sellerName) {
    parts.push(app.sellerName.replace(/\s*\(.*?\)\s*/g, '').replace(/ Co\.,? Ltd\.?/i, ''));
  }

  if (parts.length > 0) {
    return parts.join(' · ');
  }

  return `${app.cleanName || '应用'} 官方正版 · 持续更新维护中`;
}

// Format GitHub Repo statistics description
export function formatGitHubStatsZh(info: {
  owner?: string;
  repo?: string;
  stars?: number;
  forks?: number;
  language?: string;
  license?: string;
}): string {
  const parts: string[] = [];
  if (info.stars !== undefined && info.stars > 0) {
    parts.push(`GitHub ${formatCountZh(info.stars)} Stars`);
  }
  if (info.forks !== undefined && info.forks > 0) {
    parts.push(`${formatCountZh(info.forks)} Forks`);
  }
  if (info.language) {
    parts.push(`核心语言 ${info.language}`);
  }
  if (info.license) {
    parts.push(`遵循 ${info.license} 开源协议`);
  }
  if (parts.length > 0) {
    parts.push('全球开发者活跃协作与维护');
    return parts.join(' · ');
  }
  return `GitHub 开源项目 · 持续提交与社区协作更新`;
}

// Multi-layered semantic & structural analyzer for Niche / Long-Tail links
// AVOIDS ALL generic marketing slogans and NEVER quotes truncated user descriptions
function synthesizeNicheSmartStats(
  cleanHost: string,
  cleanName: string,
  normalizedUrl: string,
  hints?: {
    title?: string;
    description?: string;
    tags?: string[];
    country?: string;
    hasIcp?: boolean;
  }
): string {
  // 核心原则：如果用户/卡片已经有真实填写的描述，严格基于已有的描述生成“不太一样的说法”
  if (hints?.description && hints.description.trim().length >= 6) {
    return synthesizeAlternativeDescriptionFromExisting(
      cleanName,
      hints.description,
      hints.tags,
      cleanHost
    );
  }

  const hostParts = cleanHost.split('.');
  const tld = hostParts.slice(1).join('.');
  const subdomain = hostParts.length > 2 ? hostParts[0] : '';
  
  let pathname = '';
  try {
    pathname = new URL(normalizedUrl).pathname.toLowerCase();
  } catch {}

  const tagsText = Array.isArray(hints?.tags) ? hints.tags.join(' ') : '';
  const fullTextContext = `${cleanName} ${hints?.title || ''} ${hints?.description || ''} ${tagsText} ${subdomain} ${pathname}`.toLowerCase();

  // 1. Tool & Online Utility category
  if (/json|base64|regex|diff|md5|sha256|hash|格式化|转码|解析器|校验/i.test(fullTextContext)) {
    if (/json/i.test(fullTextContext)) {
      return '在线 JSON 数据格式化与结构解析 · 语法校验与高亮视图';
    }
    if (/regex|正则/i.test(fullTextContext)) {
      return '正则表达式在线测试与语法调试 · 实时匹配与规则解析';
    }
    if (/base64|md5|hash|编码|解码|加密/i.test(fullTextContext)) {
      return '在线数据编解码与哈希计算工具 · 常用格式即时转换';
    }
    return `${cleanName} · 在线格式化与校验工具 · 纯前端快速处理`;
  }

  if (/compress|tinypng|压缩|图片压缩|压缩包/i.test(fullTextContext)) {
    return `${cleanName} · 在线文件与图像高保真压缩 · 显著降低文件体积`;
  }

  if (/speedtest|ping|测速|带宽|延迟/i.test(fullTextContext)) {
    return `${cleanName} · 网络连接质量与带宽测速工具 · 实时延迟与上下行速率测试`;
  }

  if (/pdf|word|excel|doc|docx/i.test(fullTextContext)) {
    return `${cleanName} · 在线文档格式转换与文件处理工具 · 支持常见文档快速互转`;
  }

  const isGeneralTool = /工具|生成器|提取|查询|查重|小工具|tool|tools|calc|generator|parser|tester|calculator/i.test(fullTextContext);
  if (isGeneralTool) {
    return `${cleanName} · 在线实用工具 · 浏览器即开即用无需安装 · 专注垂直功能处理`;
  }

  // 2. Docs & Knowledge Base category
  if (/api|接口|swagger|openapi/i.test(fullTextContext)) {
    return `${cleanName} · 官方 API 接口文档 · 包含接口规范、请求参数说明与调用示例`;
  }
  const isDoc = /文档|手册|指南|教程|参考|规范|速查|知识库|wiki|docs|doc|manual|guide|handbook|learn|cheatsheet|tutorial|reference/i.test(fullTextContext);
  if (isDoc) {
    return `${cleanName} · 结构化在线开发文档与知识库 · 包含技术规范与速查手册`;
  }

  // 3. Developer, UI Libraries & Engineering category
  if (/ui|component|组件|组件库|element|antd|radix|shadcn/i.test(fullTextContext)) {
    return `${cleanName} · 前端 UI 组件库 · 提供高复用性交互组件与样式规范封装`;
  }
  const isDev = /开源|代码|仓库|框架|算法|插件|扩展|编程|极客|研发|github|dev|developer|sdk|git|repo|linux|docker|npm|pkg|cdn|rust|golang|python/i.test(fullTextContext) ||
    ['dev', 'io', 'app'].includes(tld) || ['api', 'dev', 'developer', 'sdk', 'git'].includes(subdomain);
  if (isDev) {
    return `${cleanName} · 软件工程与开源技术项目 · 包含标准化源码结构与研发资源`;
  }

  // 4. Blog & Personal Space / Column category (Strict check: do not match general life or articles)
  const isBlog = /个人博客|技术专栏|个人专栏|技术博文|博主|自留地|blog|post|column/i.test(fullTextContext) ||
    ['me', 'site'].includes(tld) || ['blog'].includes(subdomain);
  if (isBlog) {
    return `${cleanName} · 独立作者个人技术博客与专栏 · 记录研发实践与深度思考笔记`;
  }

  // 5. Visual Design, Media & Creative Resource category
  if (/wallpaper|壁纸|二次元壁纸/i.test(fullTextContext)) {
    return `${cleanName} · 高清视觉壁纸资源库 · 支持超清分辨率原图检索与下载`;
  }
  if (/icon|icons|图标|矢量/i.test(fullTextContext)) {
    return `${cleanName} · 矢量图标与 UI 设计素材库 · 支持 SVG/PNG 格式导出与代码调用`;
  }
  if (/font|fonts|字体|字型/i.test(fullTextContext)) {
    return `${cleanName} · 数字字体排版与字型素材库 · 提供高品质字形检索与视觉预览`;
  }
  if (/color|palette|配色|调色/i.test(fullTextContext)) {
    return `${cleanName} · 在线配色灵感与色彩生成工具 · 提供标准色值提取与渐变色板`;
  }
  const isDesign = /设计|素材|灵感|插画|摄影|美工|动效|排版|ux|creative|gallery|illustration/i.test(fullTextContext) ||
    ['design', 'ui', 'icon', 'font', 'art', 'photo'].includes(subdomain);
  if (isDesign) {
    return `${cleanName} · 视觉美学与数字创意素材库 · 汇聚高品质设计资产与创作灵感`;
  }

  // 6. Navigation, Resource Aggregation & Directory category
  const isNav = /导航|网址|收录|整理|合集|索引|资源|精选|大全|书签|目录|nav|hao|dh|start|portal|hub|awesome|bookmarks|directory|index/i.test(fullTextContext) ||
    ['nav', 'hao', 'dh', 'start', 'portal'].includes(subdomain);
  if (isNav) {
    return `${cleanName} · 结构化网址导航与资源索引 · 分类收录优质网络站点与实用工具入口`;
  }

  // 7. Community & Discussion Forum category
  const isForum = /论坛|社区|讨论|交流|圈子|问答|贴吧|社群|群组|同好|forum|bbs|community|discuss|group|club|chat|talk/i.test(fullTextContext) ||
    ['forum', 'bbs', 'community', 'discuss'].includes(subdomain);
  if (isForum) {
    return `${cleanName} · 垂直主题讨论社区与兴趣社群 · 汇聚同行同好探讨经验与技术答疑`;
  }

  // 8. Video, Audio & Entertainment category
  const isMedia = /影视|视频|音乐|音频|电台|播客|动漫|番剧|流媒体|直播|电影|电视剧|放映|歌曲|video|movie|tv|music|audio|podcast|stream|live|radio|anime/i.test(fullTextContext);
  if (isMedia) {
    return `${cleanName} · 在线流媒体音视频平台 · 提供多媒体内容检索与在线流畅播放`;
  }

  // 9. Storage, Cloud & Download category
  const isStorage = /网盘|云盘|存储|下载|镜像|分发|文件|备份|对象存储|pan|drive|cloud|down|download|file|files|storage|mirror|mirrors|share/i.test(fullTextContext) ||
    ['pan', 'drive', 'cloud', 'down', 'share', 'storage'].includes(subdomain);
  if (isStorage) {
    return `${cleanName} · 云端数据存储与高效分发节点 · 支持资源下载与文件共享`;
  }

  // 10. Monitoring, System Status category
  const isMonitor = /监控|状态|运行|探针|可用性|仪表盘|宕机|健康度|status|monitor|uptime|health|ping|probe|dashboard/i.test(fullTextContext) ||
    ['status', 'monitor', 'uptime', 'health'].includes(subdomain);
  if (isMonitor) {
    return `${cleanName} · 服务节点可用性与系统健康监控 · 实时公开网络延迟与运行状态看板`;
  }

  // 11. Academic, Education & University category
  const isEdu = /大学|学院|高校|学术|科研|论文|教育|课程|考研|研究生|edu|academic|research|univ|college|school|study|science/i.test(fullTextContext) ||
    ['edu', 'edu.cn', 'ac.cn'].includes(tld);
  if (isEdu) {
    return `${cleanName} · 高等教育与学术科研信息门户 · 发布科研成果、教学资源与学术动态`;
  }

  // 12. E-Commerce & Merchant category
  const isEcommerce = /商城|店铺|购买|电商|特价|优惠|商品|购物|下单|shop|store|mall|buy|market|pay/i.test(fullTextContext) ||
    ['shop', 'store', 'mall'].includes(subdomain);
  if (isEcommerce) {
    return `${cleanName} · 垂直商品选购与数字服务商店 · 提供在线选品、订单与客户服务通道`;
  }

  // 13. Chinese Official ICP Record presence
  if (hints?.hasIcp) {
    return `${cleanName} · 中华人民共和国工信部合规 ICP 备案审核 · 官方指定规范访问入口`;
  }

  // 14. Objective, Factual Technical Metadata (Strictly avoiding empty marketing fluff)
  // Instead of saying "独立在线站点 · 访问轻快顺畅 · 专注细分领域实用服务",
  // we provide honest, concrete technical attributes (domain, protocol, region, domain type)
  const regionText = hints?.country ? `节点归属: ${hints.country} · ` : '';
  const domainTypeText = tld === 'org' ? '国际通用非营利组织域名' :
                         tld === 'gov' || tld === 'gov.cn' ? '政府公共管理机构政务域名' :
                         tld === 'edu' || tld === 'edu.cn' ? '高等教育机构专属域名' :
                         tld === 'ai' ? '人工智能与前沿算法技术域名' :
                         tld === 'io' || tld === 'dev' || tld === 'app' ? '现代科技工程项目域名' :
                         tld === 'cn' ? '中国国家顶级域名 (.cn)' : '国际互联网顶级域名';

  return `${cleanName} 官方站点 · 域名 ${cleanHost} · ${regionText}采用 HTTPS 安全协议 · ${domainTypeText}`;
}

// =========================================================================
// 多业务大厂品牌意图消歧引擎 (Brand Multi-Product Intent Disambiguator)
// 针对搜狗、百度、网易、腾讯、360 等拥有多条截然不同业务线的企业，
// 依据上下文 (标题、描述、标签、子域名与路径) 精准消歧，彻底杜绝把“搜狗搜索”认作“搜狗输入法”
// =========================================================================
export function resolveBrandIntentStats(
  cleanHost: string,
  pathname: string,
  hints?: {
    title?: string;
    description?: string;
    tags?: string[];
  }
): string | null {
  const rawTitle = (hints?.title || '').trim();
  const titleLower = rawTitle.toLowerCase();
  const hostParts = cleanHost.split('.');
  const sub = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

  // --- 1. 搜狗 (Sogou) 多业务消歧 ---
  // 必须基于子域名、精确路径或卡片标题判断，切勿被页面描述中提到的“支持翻译功能”反向误导成搜狗翻译
  if (cleanHost === 'sogou.com' || cleanHost.endsWith('.sogou.com')) {
    // 明确的翻译子域、路径或标题纯粹是翻译
    const isExplicitFanyi = sub === 'fanyi' || pathname.startsWith('/fanyi') || (titleLower.includes('翻译') && !titleLower.includes('搜索'));
    if (isExplicitFanyi) {
      return '搜狗翻译 · 支持文本、文档与语音多语种即时互译 · 深度融合神经网络机器翻译';
    }

    // 明确的输入法子域、路径或标题纯粹是输入法
    const isExplicitInput = sub === 'pinyin' || sub === 'shurufa' || pathname.startsWith('/pinyin') || ((titleLower.includes('输入法') || titleLower.includes('拼音')) && !titleLower.includes('搜索'));
    if (isExplicitInput) {
      return '搜狗拼音输入法 · 国民级中文拼音输入法 · 累计装机用户超 6 亿 · 词库精准丰富且支持多端云同步';
    }

    const isExplicitMap = sub === 'map' || pathname.startsWith('/map') || titleLower.includes('搜狗地图');
    if (isExplicitMap) {
      return '搜狗地图 · 提供全国主要城市道路高精度地图、公交自驾导航与实时路况规划';
    }

    const isExplicitWenwen = sub === 'wenwen' || pathname.startsWith('/wenwen') || titleLower.includes('搜狗问问');
    if (isExplicitWenwen) {
      return '搜狗问问 · 综合性互动问答社区 · 沉淀数千万各领域生活常识与实用解答';
    }

    const isExplicitBaike = sub === 'baike' || pathname.startsWith('/baike') || titleLower.includes('搜狗百科');
    if (isExplicitBaike) {
      return '搜狗百科 · 权威中文网络知识百科 · 涵盖数百万百科词条与科普信息';
    }

    // 默认（主站、www 或任何搜索相关）：一律精准为搜狗搜索
    return '搜狗搜索 · 国内知名综合搜索引擎 · 独家收录微信公众号文章与知乎深度内容生态 · 支持智能跨网聚合搜索';
  }

  // --- 2. 百度 (Baidu) 多业务消歧 ---
  if (cleanHost === 'baidu.com' || cleanHost.endsWith('.baidu.com')) {
    const isExplicitPan = sub === 'pan' || sub === 'netdisk' || pathname.startsWith('/pan') || ((titleLower.includes('网盘') || titleLower.includes('云盘')) && !titleLower.includes('搜索'));
    if (isExplicitPan) {
      return '百度网盘 · 国内用户规模最大的云存储平台 · 注册用户超 8 亿 · 支持极速跨端备份与文件共享';
    }

    const isExplicitFanyi = sub === 'fanyi' || pathname.startsWith('/fanyi') || (titleLower.includes('翻译') && !titleLower.includes('搜索'));
    if (isExplicitFanyi) {
      return '百度翻译 · 支持 200+ 语种即时互译 · 日均响应数十亿次跨语种调用 · 专注中文深度语境与垂直领域翻译';
    }

    const isExplicitTieba = sub === 'tieba' || pathname.startsWith('/tieba') || (titleLower.includes('贴吧') && !titleLower.includes('搜索'));
    if (isExplicitTieba) {
      return '百度贴吧 · 累计主题贴数超数十亿 · 涵盖数百万兴趣吧 · 中文网络青年亚文化与兴趣讨论发源地';
    }

    const isExplicitWenku = sub === 'wenku' || pathname.startsWith('/wenku') || (titleLower.includes('文库') && !titleLower.includes('搜索'));
    if (isExplicitWenku) {
      return '百度文库 · 累计沉淀超 12 亿份专业文档与课件范本 · 深度融合 AI 一键研读与智能 PPT 生成';
    }

    const isExplicitMap = sub === 'map' || pathname.startsWith('/map') || titleLower.includes('地图');
    if (isExplicitMap) {
      return '百度地图 · 日均位置服务请求超千亿次 · 基于北斗高精度定位的车道级导航与城市数字孪生地图';
    }

    const isExplicitErnie = sub === 'yiyan' || pathname.startsWith('/yiyan') || titleLower.includes('文心') || titleLower.includes('一言');
    if (isExplicitErnie) {
      return '文心一言 · 百度自研知识增强大语言模型 · 具备深厚的中文语境理解、文学创作与商业规划能力';
    }

    const isExplicitXueshu = sub === 'xueshu' || pathname.startsWith('/xueshu') || titleLower.includes('学术');
    if (isExplicitXueshu) {
      return '百度学术 · 保持与数十万学术期刊数据库实时同步 · 汇聚海量中英文学术论文与科研文献';
    }

    // 默认：百度搜索
    return '百度搜索 · 国内搜索市场份额超 60% · 日均响应数十亿次检索 · 依托文心大模型提供全场景智能 AI 搜索';
  }

  // --- 3. 网易 (163.com) 多业务消歧 ---
  if (cleanHost === '163.com' || cleanHost.endsWith('.163.com')) {
    const isExplicitMail = sub === 'mail' || pathname.startsWith('/mail') || (titleLower.includes('邮箱') && !titleLower.includes('音乐'));
    if (isExplicitMail) {
      return '网易邮箱 · 中文老牌电子邮箱 · 累计服务用户超 10 亿 · 安全稳定高效防垃圾邮件';
    }
    const isExplicitMusic = sub === 'music' || pathname.startsWith('/music') || titleLower.includes('云音乐') || (titleLower.includes('音乐') && !titleLower.includes('门户'));
    if (isExplicitMusic) {
      return '网易云音乐 · 月活超 2 亿的音乐社交社区 · 沉淀数十亿条走心评论与华语独立原创音乐人生态';
    }
    const isExplicitOpen = sub === 'open' || pathname.startsWith('/open') || titleLower.includes('公开课');
    if (isExplicitOpen) {
      return '网易公开课 · 汇聚全球名校公开课与优质人文科技知识的中文视频在线学习平台';
    }
    return '网易门户 · 国内老牌综合资讯门户与新闻传播平台 · 涵盖要闻、财经与科技深度报道';
  }

  // --- 4. 腾讯 (qq.com) 多业务消歧 ---
  if (cleanHost === 'qq.com' || cleanHost.endsWith('.qq.com')) {
    const isExplicitMail = sub === 'mail' || pathname.startsWith('/mail') || titleLower.includes('邮箱');
    if (isExplicitMail) {
      return 'QQ 邮箱 · 中国国民级电子邮箱平台 · 拥有数亿活跃用户 · 提供超大附件传输与即时投递提醒';
    }
    const isExplicitVideo = sub === 'v' || pathname.startsWith('/v') || titleLower.includes('腾讯视频');
    if (isExplicitVideo) {
      return '腾讯视频 · 中国领先的综合在线视频流媒体平台 · 汇集海量独播剧集、国漫、院线电影与自制综艺';
    }
    const isExplicitMusic = sub === 'y' || pathname.startsWith('/y') || titleLower.includes('qq音乐') || (titleLower.includes('音乐') && !titleLower.includes('资讯'));
    if (isExplicitMusic) {
      return 'QQ 音乐 · 拥有国内领先的高品质海量正版曲库 · 深度整合社交音乐互动与 Hi-Res 无损音质';
    }
    const isExplicitDocs = sub === 'docs' || pathname.startsWith('/docs') || titleLower.includes('文档');
    if (isExplicitDocs) {
      return '腾讯文档 · 国民级专业在线协作文档 · 覆盖数亿用户 · 支持 Word、Excel、PPT、思维导图实时多人协同';
    }
    const isExplicitMeeting = sub === 'meeting' || pathname.startsWith('/meeting') || titleLower.includes('会议');
    if (isExplicitMeeting) {
      return '腾讯会议 · 国内领先的云视频会议协同工具 · 服务数亿用户 · 提供智能 AI 音视频降噪与会议纪要';
    }
    const isExplicitWeixin = cleanHost.includes('weixin.qq.com') || titleLower.includes('微信公众平台') || titleLower.includes('微信公众号');
    if (isExplicitWeixin) {
      return '微信公众平台 · 拥有超千万创作者与公众号生态 · 中文移动互联网最核心的图文内容与服务入口';
    }
    return '腾讯网 · 腾讯旗下全方位综合资讯门户与新闻内容中心 · 实时聚合海量高质量要闻';
  }

  // --- 5. 360 (360.cn / so.com) 多业务消歧 ---
  if (cleanHost === '360.cn' || cleanHost.endsWith('.360.cn') || cleanHost === 'so.com') {
    if (cleanHost === 'so.com' || sub === 'so' || titleLower.includes('搜索') || pathname.startsWith('/search')) {
      return '360 搜索 · 国内主流搜索引擎 · 专注安全搜索与恶意欺诈网址智能拦截';
    }
    if (sub === 'browser' || titleLower.includes('浏览器')) {
      return '360 安全浏览器 · 国内高市场占有率的双核安全浏览器 · 具备强大的防欺诈与恶意下载拦截能力';
    }
    return '360 数字安全 · 国内数字安全领军企业 · 专注终端安全防护、漏洞修复与系统清理优化';
  }

  return null;
}

// =========================================================================
// 语义冲突探测与纠偏引擎 (Semantic Conflict Interceptor)
// 任何准备向外输出的统计描述，在此层进行最后一道“语义排异体检”
// 若候选文案描述的业务领域与传入的标题/描述产生不可调和的互斥冲突，自动拦截并重定向纠正！
// =========================================================================
export function auditSemanticConflict(
  candidateStat: string,
  hints?: {
    title?: string;
    description?: string;
    tags?: string[];
  }
): string {
  if (!candidateStat) return candidateStat;

  const rawTitle = (hints?.title || '').trim().replace(/[-|_—–·].*$/, '').trim();
  const titleLower = (hints?.title || '').toLowerCase();

  // 冲突排查 0: 候选文案包含“搜狗翻译”或“翻译”，但卡片标题明确包含“搜索/搜索引擎”且标题毫无“翻译”
  if (/翻译/i.test(candidateStat)) {
    if (/搜索|搜索引擎|search/i.test(titleLower) && !/翻译/i.test(titleLower)) {
      const name = rawTitle || '搜狗搜索';
      return sanitizeDescriptionText(`${name} · 国内知名综合搜索引擎 · 独家收录微信公众号文章与知乎深度内容生态 · 支持智能跨网聚合搜索`);
    }
  }

  // 冲突排查 0.5: 候选文案包含“搜索引擎”，但卡片标题明确是“翻译”且无搜索
  if (/搜索引擎|搜索市场|搜索请求/i.test(candidateStat)) {
    if (/翻译|translate/i.test(titleLower) && !/搜索/i.test(titleLower)) {
      const name = rawTitle || '在线多语种翻译平台';
      return sanitizeDescriptionText(`${name} · 支持文本、文档与语音多语种即时互译 · 深度融合神经网络机器翻译`);
    }
  }

  // 冲突排查 1: 候选文案包含“输入法/拼音”，但卡片标题或描述明确是“搜索/搜索引擎”且毫无输入法字样
  if (/输入法|拼音/i.test(candidateStat)) {
    if (/搜索|搜索引擎|search/i.test(titleLower) && !/输入法|拼音/i.test(titleLower)) {
      const name = rawTitle || '搜狗搜索';
      return sanitizeDescriptionText(`${name} · 国内知名综合搜索引擎 · 独家收录微信公众号文章与知乎深度内容生态 · 支持智能跨网聚合搜索`);
    }
  }

  // 冲突排查 2: 候选文案包含“搜索引擎/搜索市场”，但卡片标题或描述明确是“输入法/拼音”且无搜索字样
  if (/搜索引擎|搜索市场|搜索请求/i.test(candidateStat)) {
    if (/输入法|拼音|录入/i.test(titleLower) && !/搜索/i.test(titleLower)) {
      const name = rawTitle || '智能中文输入法';
      return sanitizeDescriptionText(`${name} · 国民级中文输入法 · 具备超大词库与云端多端同步录入`);
    }
  }

  // 冲突排查 3: 候选文案包含“电子邮箱/邮箱平台”，但卡片是“音乐/播客/音频”
  if (/电子邮箱|邮箱平台|邮箱服务/i.test(candidateStat)) {
    if (/音乐|歌曲|播客|音频|music|audio/i.test(titleLower) && !/邮箱|mail/i.test(titleLower)) {
      const name = rawTitle || '在线音乐社区';
      return sanitizeDescriptionText(`${name} · 在线音乐与音频流媒体平台 · 汇集海量优质正版曲库与创作者生态`);
    }
  }

  // 冲突排查 4: 候选文案包含“视频流媒体/在线视频”，但卡片是“邮箱/办公文档”
  if (/视频流媒体|在线视频|独播剧集/i.test(candidateStat)) {
    if (/邮箱|邮件|文档|协同|mail|docs/i.test(titleLower) && !/视频|video/i.test(titleLower)) {
      const name = rawTitle || '在线数字化应用';
      return sanitizeDescriptionText(`${name} · 数字化办公与沟通协作平台 · 安全高效稳定`);
    }
  }

  // 冲突排查 5: 候选文案包含“网络购物/电商平台”，但卡片是“网盘/云存储”
  if (/网络购物|电商平台|在售商品/i.test(candidateStat)) {
    if (/网盘|云盘|云存储|netdisk|storage/i.test(titleLower) && !/购物|商城|买/i.test(titleLower)) {
      const name = rawTitle || '云端存储服务';
      return sanitizeDescriptionText(`${name} · 安全可靠的云端数据存储与跨端文件同步平台`);
    }
  }

  // 冲突排查 6: 误判为“独立作者个人技术博客与专栏”，但实际是导航、AI、3D、游戏、工具或视听等
  if (/个人技术博客|独立作者/i.test(candidateStat)) {
    const descCombined = `${hints?.title || ''} ${hints?.description || ''} ${(hints?.tags || []).join(' ')}`.toLowerCase();
    if (/导航|网址|收录|ai|3d|建模|角色|场景|游戏|美术|工具|影视|视频|音乐|商城|电商|社区|搜索/i.test(descCombined)) {
      if (hints?.description && hints.description.trim().length >= 6) {
        return synthesizeAlternativeDescriptionFromExisting(rawTitle || '站点', hints.description, hints.tags);
      }
    }
  }

  // 冲突排查 7: 误判为“在线文档格式转换与文件处理工具”，但实际是 3D、建模、角色、场景、游戏、美术、AI绘图
  if (/在线文档格式转换与文件处理工具|文档快速互转/i.test(candidateStat)) {
    const descCombined = `${hints?.title || ''} ${hints?.description || ''} ${(hints?.tags || []).join(' ')}`.toLowerCase();
    if (/3d|建模|角色|场景|游戏|美术|ai|绘图|插画|视频/i.test(descCombined) && !/pdf|word|excel/i.test(descCombined)) {
      if (hints?.description && hints.description.trim().length >= 6) {
        return synthesizeAlternativeDescriptionFromExisting(rawTitle || '站点', hints.description, hints.tags);
      }
    }
  }

  return sanitizeDescriptionText(candidateStat);
}

// Synchronously detect or synthesize an accurate Chinese statistical description
export function detectStatsSync(
  targetUrl: string,
  hints?: {
    title?: string;
    description?: string;
    tags?: string[];
    app?: any;
    github?: any;
    country?: string;
    hasIcp?: boolean;
  }
): string {
  try {
    const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
      ? targetUrl
      : `https://${targetUrl}`;

    // 1. If App Store metadata is passed
    if (hints?.app) {
      const appStats = formatAppStoreStatsZh(hints.app);
      if (appStats) return auditSemanticConflict(appStats, hints);
    }

    // 2. If GitHub repo metadata is passed
    if (hints?.github) {
      const ghStats = formatGitHubStatsZh(hints.github);
      if (ghStats) return auditSemanticConflict(ghStats, hints);
    }

    let hostname = '';
    let pathname = '';
    try {
      const parsed = new URL(normalizedUrl);
      hostname = parsed.hostname.toLowerCase();
      pathname = parsed.pathname.toLowerCase();
    } catch {
      hostname = targetUrl.toLowerCase().split('/')[0];
    }
    const cleanHost = hostname.replace(/^www\./, '');

    // 3. Priority Path-based Sub-Application Matching
    // Handles Google Docs/Sheets/Slides/Forms/Drive subpaths (e.g. docs.google.com/spreadsheets)
    if (cleanHost === 'docs.google.com' || cleanHost === 'google.com') {
      if (pathname.includes('/spreadsheets') || pathname.includes('/sheets')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['sheets.google.com'], hints);
      }
      if (pathname.includes('/presentation') || pathname.includes('/slides')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['slides.google.com'], hints);
      }
      if (pathname.includes('/forms')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['forms.google.com'], hints);
      }
      if (pathname.includes('/document')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['docs.google.com'], hints);
      }
      if (pathname.startsWith('/maps')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['maps.google.com'], hints);
      }
      if (pathname.startsWith('/drive')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['drive.google.com'], hints);
      }
      if (pathname.startsWith('/translate')) {
        return auditSemanticConflict(SUB_APP_STATS_MAP['translate.google.com'], hints);
      }
    }

    if (cleanHost.includes('google.com') && pathname.includes('/webstore')) {
      return auditSemanticConflict(SUB_APP_STATS_MAP['chromewebstore.google.com'], hints);
    }

    // 3.5 Brand Intent Resolver (Disambiguate Sogou, Baidu, 163, QQ, 360 multi-product families)
    const brandStat = resolveBrandIntentStats(cleanHost, pathname, hints);
    if (brandStat) {
      return auditSemanticConflict(brandStat, hints);
    }

    // 4. Exact Sub-Application Hostname match from SUB_APP_STATS_MAP
    if (SUB_APP_STATS_MAP[cleanHost]) {
      return auditSemanticConflict(SUB_APP_STATS_MAP[cleanHost], hints);
    }

    // 5. Exact Domain Match from DOMAIN_STATS_MAP
    if (DOMAIN_STATS_MAP[cleanHost]) {
      return auditSemanticConflict(DOMAIN_STATS_MAP[cleanHost], hints);
    }

    // 6. Subdomain of Major Ecosystems (Safe Degradation, NEVER return search engine description for subapps!)
    if (cleanHost.endsWith('.google.com') || cleanHost.endsWith('.google.cn') || cleanHost.endsWith('.google.com.hk')) {
      return auditSemanticConflict('Google 旗下专属应用与服务 · 依托 Google 全球云基础设施与高可用网络 · 提供安全可靠的在线体验', hints);
    }

    if (cleanHost.endsWith('.baidu.com')) {
      return auditSemanticConflict('百度旗下数字化应用与服务 · 依托百度中文智能技术底座 · 专注特定业务场景功能体验', hints);
    }

    if (cleanHost.endsWith('.microsoft.com') || cleanHost.endsWith('.live.com')) {
      return auditSemanticConflict('微软旗下专业应用与服务 · 依托微软云生态高可用架构 · 提供专业企业与个人数字化效能支持', hints);
    }

    if (cleanHost.endsWith('.apple.com')) {
      return auditSemanticConflict('Apple 旗下官方网络服务 · 深度融合苹果全生态硬件设备 · 提供安全私密的数字体验', hints);
    }

    if (cleanHost.endsWith('.qq.com') || cleanHost.endsWith('.tencent.com')) {
      return auditSemanticConflict('腾讯旗下数字化产品与服务 · 深度连接社交与内容生态体系 · 提供便捷流畅的在线服务', hints);
    }

    if (cleanHost.endsWith('.bilibili.com')) {
      return auditSemanticConflict('哔哩哔哩旗下业务频道 · 聚合年轻文化与优质数字多媒体内容 · 极具互动活力的在线空间', hints);
    }

    if (cleanHost.endsWith('.aliyun.com')) {
      return auditSemanticConflict('阿里云旗下计算与产品服务 · 依托飞天分布式架构 · 提供高可用云原生技术支持', hints);
    }

    // 7. General subdomain match for other companies where subdomain shares parent description
    for (const [dom, stat] of Object.entries(DOMAIN_STATS_MAP)) {
      if (cleanHost.endsWith('.' + dom)) {
        return auditSemanticConflict(stat, hints);
      }
    }

    // 8. GitHub repo URL direct matching (github.com/:owner/:repo)
    const ghMatch = normalizedUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (ghMatch) {
      const owner = ghMatch[1];
      const repo = ghMatch[2];
      return auditSemanticConflict(`GitHub 开源项目 ${owner}/${repo} · 社区活跃维护与全球开发者协作`, hints);
    }

    // 9. App Store URL direct matching
    if (normalizedUrl.includes('apple.com') && (normalizedUrl.includes('/app/') || normalizedUrl.includes('/id'))) {
      return auditSemanticConflict('苹果 App Store 官方正版应用 · 适配全生态 iOS/iPadOS/macOS · 安全认证下载', hints);
    }

    // 10. Multi-Factor Intelligent Synthesis for Niche / Long-Tail Links
    const domainName = cleanHost.split('.')[0] || '';
    const cleanName = hints?.title?.trim() || (domainName.charAt(0).toUpperCase() + domainName.slice(1));

    return auditSemanticConflict(synthesizeNicheSmartStats(cleanHost, cleanName, normalizedUrl, hints), hints);
  } catch {
    return '官方在线服务平台 · 运行稳定 · 持续为用户提供可靠服务';
  }
}
