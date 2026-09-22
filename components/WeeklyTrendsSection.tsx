import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { LinkItem, Language, Theme } from '../types';
import { getPast7DaysTrends, clearDailyClicks, DayTrendPoint } from '../services/weeklyTrendsService';
import { TRANSLATIONS } from '../translations';

interface WeeklyTrendsSectionProps {
  links: LinkItem[];
  lang: Language;
  theme: Theme;
  onLinkClick?: (link: LinkItem) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: DayTrendPoint }>;
  label?: string;
  lang: Language;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const isZh = lang === 'zh';

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-3 rounded-2xl shadow-xl border border-slate-200/80 dark:border-zinc-700/80 min-w-[190px] animate-in fade-in zoom-in-95 duration-150 text-xs">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
        <span className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-brand-500" />
          {data.dayLabel}
        </span>
        {data.isToday && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-brand-50 text-brand-600 dark:bg-brand-950/80 dark:text-brand-400">
            {isZh ? '今天' : 'Today'}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">
          {isZh ? '点击访问量' : 'Click Volume'}
        </span>
        <span className="text-base font-black text-brand-600 dark:text-brand-400">
          {data.clicks} <span className="text-[10px] font-normal text-slate-400">{isZh ? '次' : 'clicks'}</span>
        </span>
      </div>

      {data.topLinks && data.topLinks.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {isZh ? '当日活跃书签' : 'Top Visited Links'}
          </div>
          {data.topLinks.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 dark:text-zinc-300 truncate max-w-[120px] font-medium">
                {item.title}
              </span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 shrink-0">
                {item.clicks}次
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const WeeklyTrendsSection: React.FC<WeeklyTrendsSectionProps> = ({
  links,
  lang,
  theme,
  onLinkClick
}) => {
  const t = TRANSLATIONS[lang];
  const isZh = lang === 'zh';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('navhub_weekly_trends_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedFilterUrl, setSelectedFilterUrl] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('navhub_weekly_trends_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleResetTrends = () => {
    clearDailyClicks();
    setSelectedFilterUrl('');
    setShowResetConfirm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const { days, summary, topTrending } = useMemo(() => {
    return getPast7DaysTrends(links, selectedFilterUrl, lang);
  }, [links, selectedFilterUrl, lang, refreshTrigger]);

  const selectedLinkObj = useMemo(() => {
    if (!selectedFilterUrl) return null;
    return links.find(l => l.url === selectedFilterUrl || l.id === selectedFilterUrl) || null;
  }, [links, selectedFilterUrl]);

  return (
    <section className="animate-slide-up mb-12 scroll-mt-24" id="weekly-trends-section">
      {/* Header Bar */}
      <div 
        className="flex items-center justify-between gap-4 mb-5 group/trends cursor-pointer select-none"
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2 lg:p-2.5 bg-gradient-to-br from-brand-500/15 to-brand-600/10 dark:from-brand-500/25 dark:to-brand-600/15 rounded-2xl text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-2xs transition-transform group-hover/trends:scale-105">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                {t.app?.weeklyTrendsTitle || (isZh ? '近 7 日热度趋势' : 'Weekly Trends')}
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                {isZh ? '真实点击统计' : 'Accurate Visits'}
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                {summary.totalClicks === 0 
                  ? (isZh ? '暂无记录 · 0次点击' : '0 clicks recorded')
                  : (isZh ? `7日累计 ${summary.totalClicks} 次点击` : `${summary.totalClicks} clicks total`)}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
              {t.app?.weeklyTrendsDesc || (isZh ? '100% 严谨记录过去 7 天书签真实访问频次，绝无模拟虚假数据' : 'Real-time accurate link visit volume over the past 7 days')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset button for resetting historical data */}
          {summary.totalClicks > 0 && !showResetConfirm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowResetConfirm(true);
              }}
              className="p-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 flex items-center gap-1"
              title={isZh ? '清空趋势数据' : 'Clear trends'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isZh ? '重置趋势' : 'Reset'}</span>
            </button>
          )}

          {showResetConfirm && (
            <div 
              className="flex items-center gap-1.5 p-1 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {isZh ? '确定清空统计？' : 'Clear all?'}
              </span>
              <button
                type="button"
                onClick={handleResetTrends}
                className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-700"
              >
                {isZh ? '确认' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCollapse();
            }}
            className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 transition-colors active:scale-95"
            title={isCollapsed ? (isZh ? '展开趋势图' : 'Expand Trends') : (isZh ? '折叠趋势图' : 'Collapse Trends')}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Trends Card Body */}
      {!isCollapsed && (
        <div className="p-4 lg:p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-[0_12px_36px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.25)] space-y-6">
          
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isZh ? '7 日总点击量' : '7-Day Total'}
                </span>
                <Activity className="w-3.5 h-3.5 text-brand-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {summary.totalClicks}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                  {isZh ? '次' : 'clicks'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                {summary.todayClicks > 0
                  ? (isZh ? `今日已贡献 ${summary.todayClicks} 次` : `${summary.todayClicks} clicks today`)
                  : (isZh ? '今日暂无新点击' : 'No clicks today')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isZh ? '日均访问频次' : 'Daily Average'}
                </span>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {summary.dailyAverage}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                  {isZh ? '次/天' : '/ day'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                {isZh ? '周度浏览平稳指数' : 'Past 7 days average'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isZh ? '单日峰值' : 'Peak Day'}
                </span>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {summary.peakDay.clicks}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                  {isZh ? '次' : 'clicks'}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold truncate mt-1">
                {summary.totalClicks === 0 ? (isZh ? '暂无峰值' : 'No peak yet') : summary.peakDay.label}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isZh ? '本周榜首' : 'Top Trend'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-base lg:text-lg font-black text-slate-900 dark:text-white truncate tracking-tight">
                {summary.topLink ? summary.topLink.title : (isZh ? '暂无记录' : 'None')}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-1">
                {summary.topLink ? `${summary.topLink.clicks} ${isZh ? '次访问' : 'visits'}` : (isZh ? '点击任意书签激活统计' : 'Click links to record')}
              </p>
            </div>
          </div>

          {/* Chart Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedFilterUrl('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                  !selectedFilterUrl
                    ? 'bg-brand-600 text-white shadow-xs ring-2 ring-brand-500/20'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isZh ? '全部链接汇总' : 'All Links Combined'}</span>
              </button>

              {topTrending.slice(0, 4).map(item => {
                const isSelected = selectedFilterUrl === item.url || selectedFilterUrl === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFilterUrl(isSelected ? '' : item.url)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 max-w-[150px] truncate ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-xs ring-2 ring-brand-500/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                    title={item.title}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className={`text-[10px] px-1 rounded font-normal ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-400'}`}>
                      {item.past7DaysClicks}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Area / Bar Chart Type Switcher */}
            <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100/90 dark:bg-zinc-800/90 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  chartType === 'area'
                    ? 'bg-white dark:bg-zinc-700 text-brand-600 dark:text-brand-300 shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
                title={isZh ? '平滑面积图' : 'Area Spline'}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isZh ? '平滑曲线' : 'Smooth'}</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  chartType === 'bar'
                    ? 'bg-white dark:bg-zinc-700 text-brand-600 dark:text-brand-300 shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
                title={isZh ? '柱状对比图' : 'Bar Chart'}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isZh ? '柱状图' : 'Bars'}</span>
              </button>
            </div>
          </div>

          {/* Active Filter Banner if a specific link is selected */}
          {selectedLinkObj && (
            <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-brand-700 dark:text-brand-300">
                  {isZh ? '当前聚焦链接：' : 'Filtered by Link: '}
                </span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  {selectedLinkObj.title}
                </span>
                <span className="text-slate-400 dark:text-zinc-500 truncate max-w-[240px]">
                  ({selectedLinkObj.url})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFilterUrl('')}
                className="font-black text-brand-600 dark:text-brand-400 hover:underline shrink-0 ml-2"
              >
                {isZh ? '重置并查看总和' : 'Show All Links'}
              </button>
            </div>
          )}

          {/* Recharts Graph Container */}
          <div className="w-full h-[220px] lg:h-[260px] pt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={days} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendsBrandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand-500, #3b82f6)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-brand-500, #3b82f6)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-slate-200/60 dark:text-zinc-800"
                  />
                  <XAxis
                    dataKey="dayLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                    className="text-slate-400 dark:text-zinc-500"
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                    className="text-slate-400 dark:text-zinc-500"
                    dx={-4}
                  />
                  <Tooltip
                    content={<CustomTooltip lang={lang} />}
                    cursor={{
                      stroke: 'var(--color-brand-500, #3b82f6)',
                      strokeWidth: 1.5,
                      strokeDasharray: '4 4',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--color-brand-500, #3b82f6)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#trendsBrandGradient)"
                    activeDot={{
                      r: 6,
                      strokeWidth: 3,
                      stroke: '#ffffff',
                      className: 'fill-brand-500 dark:fill-brand-400 drop-shadow-md',
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={days} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-slate-200/60 dark:text-zinc-800"
                  />
                  <XAxis
                    dataKey="dayLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                    className="text-slate-400 dark:text-zinc-500"
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                    className="text-slate-400 dark:text-zinc-500"
                    dx={-4}
                  />
                  <Tooltip
                    content={<CustomTooltip lang={lang} />}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  />
                  <Bar
                    dataKey="clicks"
                    fill="var(--color-brand-500, #3b82f6)"
                    radius={[8, 8, 2, 2]}
                    maxBarSize={48}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>

            {/* Zero State Overlay Hint */}
            {summary.totalClicks === 0 && (
              <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none">
                <div className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/70 dark:border-zinc-700/70 text-[11px] font-bold text-slate-500 dark:text-zinc-400 shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isZh ? '真实点击统计已就绪 · 点击书签即可绘制访问曲线' : 'Live tracking ready · Click bookmarks to record'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Row: Top Trending Links of the Week */}
          {topTrending.length > 0 ? (
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {isZh ? '本周真实高频访问排行 Top Links' : 'Top Visited Links This Week'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                  {isZh ? '点击卡片聚焦筛选 · 点击箭头直达访问' : 'Click card to isolate · Arrow to visit'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {topTrending.map((item, idx) => {
                  const isFiltered = selectedFilterUrl === item.url || selectedFilterUrl === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedFilterUrl(isFiltered ? '' : item.url);
                      }}
                      className={`group p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isFiltered
                          ? 'bg-brand-50/80 border-brand-300 dark:bg-brand-950/40 dark:border-brand-800 ring-2 ring-brand-500/20'
                          : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-100 dark:border-zinc-800 hover:border-brand-500/30 hover:bg-white dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                          #{idx + 1}
                        </span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onLinkClick) {
                              const raw = links.find(l => l.id === item.id || l.url === item.url);
                              if (raw) onLinkClick(raw);
                            }
                          }}
                          className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-0.5 rounded transition-colors"
                          title={isZh ? '在新标签页打开' : 'Open link'}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="mt-2">
                        <h4 className="text-xs font-black text-slate-800 dark:text-zinc-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          <span>{item.past7DaysClicks} {isZh ? '次点击' : 'clicks'}</span>
                          {item.todayClicks > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +{item.todayClicks}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-center py-4">
              <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                {isZh ? '近 7 日暂无点击数据，点击上方任意书签卡片后将在此自动生成真实访问榜单' : 'No link visits recorded yet. Click any link card above to start tracking.'}
              </p>
            </div>
          )}

        </div>
      )}
    </section>
  );
};

export default WeeklyTrendsSection;
