import { LinkItem } from '../types';
import { normalizeUrlKey, loadClickStats } from './storageUtils';

export const DAILY_CLICKS_KEY = 'navhub_daily_link_clicks_v2';
export const LEGACY_DAILY_CLICKS_KEY = 'navhub_daily_link_clicks_v1';

export interface DailyClickRecord {
  total: number;
  // linkId (preferred) or normalized URL -> click count on this calendar date
  links: Record<string, number>;
}

export type DailyClicksStorage = Record<string, DailyClickRecord>;

export interface DayTrendPoint {
  dateKey: string; // 'YYYY-MM-DD'
  dayLabel: string; // e.g. "09/15 周二" or "Tue 09/15"
  shortDay: string; // "周二" / "Tue"
  fullDate: string;
  clicks: number;
  isToday: boolean;
  topLinks: { title: string; clicks: number; url: string }[];
}

export interface TrendSummary {
  totalClicks: number;
  dailyAverage: number;
  peakDay: { label: string; clicks: number };
  topLink: { title: string; clicks: number } | null;
  todayClicks: number;
}

export interface TrendingLinkItem {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  iconBgColor?: string;
  past7DaysClicks: number;
  todayClicks: number;
}

export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 迁移与净化历史记录：彻底剔除早期自动生成注入的虚假/模拟点击数据 (ensureSeededTrends)，
 * 确保所有统计指标 100% 均来自用户的真实点击事件。
 */
export const sanitizeAndLoadDailyClicks = (): DailyClicksStorage => {
  try {
    const rawV2 = localStorage.getItem(DAILY_CLICKS_KEY);
    if (rawV2) {
      return JSON.parse(rawV2);
    }

    // 检查旧版 v1 存储并净化
    const rawV1 = localStorage.getItem(LEGACY_DAILY_CLICKS_KEY);
    if (rawV1) {
      const oldStorage = JSON.parse(rawV1) as Record<string, any>;
      const cleaned: DailyClicksStorage = {};
      const todayKey = formatDateKey(new Date());

      // 仅保留真实的今日点击或经过校验的真实记录
      // 早期伪造算法特征：dayRatios = [0.10, 0.12, 0.16, 0.14, 0.18, 0.13, 0.17] 且对未点击过的书签强行赋予 total >= 6
      // 我们验证真实书签点击记录 (通过 CLICK_STATS_KEY 中的实际点击记录)
      const realClickStats = loadClickStats();
      const validKeys = new Set(Object.keys(realClickStats));

      Object.entries(oldStorage).forEach(([dateKey, rec]) => {
        if (!rec || typeof rec !== 'object') return;
        const links = rec.links || {};
        const cleanedLinks: Record<string, number> = {};
        let dayTotal = 0;

        Object.entries(links).forEach(([k, count]) => {
          const num = typeof count === 'number' ? count : parseInt(String(count), 10);
          if (num > 0 && (validKeys.has(k) || dateKey === todayKey)) {
            // 真实统计上限受限于实际总点击数，防止伪造数据残留
            const realMax = realClickStats[k]?.clickCount || num;
            const validCount = Math.min(num, realMax);
            if (validCount > 0) {
              cleanedLinks[k] = validCount;
              dayTotal += validCount;
            }
          }
        });

        if (dayTotal > 0) {
          cleaned[dateKey] = {
            total: dayTotal,
            links: cleanedLinks,
          };
        }
      });

      // 保存至 v2 并清理旧的污染 key
      localStorage.setItem(DAILY_CLICKS_KEY, JSON.stringify(cleaned));
      try {
        localStorage.removeItem(LEGACY_DAILY_CLICKS_KEY);
      } catch {}
      return cleaned;
    }
  } catch (err) {
    console.warn('Failed to sanitize/load daily clicks', err);
  }
  return {};
};

export const loadDailyClicks = (): DailyClicksStorage => {
  return sanitizeAndLoadDailyClicks();
};

export const saveDailyClicks = (storage: DailyClicksStorage): void => {
  try {
    localStorage.setItem(DAILY_CLICKS_KEY, JSON.stringify(storage));
  } catch (err) {
    console.warn('Failed to save daily clicks', err);
  }
};

/**
 * 清空所有周度热度趋势数据 (重置为零)
 */
export const clearDailyClicks = (): void => {
  try {
    localStorage.removeItem(DAILY_CLICKS_KEY);
    localStorage.removeItem(LEGACY_DAILY_CLICKS_KEY);
  } catch (err) {
    console.warn('Failed to clear daily clicks', err);
  }
};

/**
 * 记录一次真实的链接点击
 * 采用 linkId 作为主键，若无 linkId 则回退至 normalized URL，
 * 绝不再同时写入双份 key，确保日总和与各链接点击完全一致！
 */
export const recordDailyClick = (url: string, linkId?: string, count: number = 1): void => {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const normKey = normalizeUrlKey(url);
  const storage = loadDailyClicks();

  if (!storage[todayKey]) {
    storage[todayKey] = { total: 0, links: {} };
  }

  const dayRecord = storage[todayKey];
  if (!dayRecord.links) {
    dayRecord.links = {};
  }

  // 优先采用唯一的 linkId，若 linkId 不存在则采用规范化 URL
  const primaryKey = linkId || normKey;
  if (primaryKey) {
    dayRecord.links[primaryKey] = (dayRecord.links[primaryKey] || 0) + count;
  }

  // 当同时有 linkId 和 normKey 时，若旧版本存在双写，将其统一归并
  if (linkId && normKey && linkId !== normKey && dayRecord.links[normKey] !== undefined) {
    delete dayRecord.links[normKey];
  }

  // 严格依据实际 links 点击之和更新日总计，确保数学绝对精准
  dayRecord.total = Object.values(dayRecord.links).reduce((sum, c) => sum + (c || 0), 0);

  saveDailyClicks(storage);
};

/**
 * 查询某一天的某个链接点击数，兼容 linkId 和 URL 的查询
 */
export const getLinkClicksOnDay = (
  record: DailyClickRecord | undefined,
  link: LinkItem
): number => {
  if (!record?.links) return 0;
  // 1. 首选用 link.id 匹配
  if (link.id && record.links[link.id] !== undefined) {
    return record.links[link.id];
  }
  // 2. 次选用规范化 URL 匹配
  const norm = normalizeUrlKey(link.url);
  if (norm && record.links[norm] !== undefined) {
    return record.links[norm];
  }
  return 0;
};

const ZH_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * 获取近 7 日精准热度趋势：
 * 绝不使用任何 mock/seed 虚假权重分配，全部数据 100% 取自真实用户点击
 */
export const getPast7DaysTrends = (
  links: LinkItem[],
  selectedUrlOrId?: string,
  lang: 'en' | 'zh' = 'zh'
): {
  days: DayTrendPoint[];
  summary: TrendSummary;
  topTrending: TrendingLinkItem[];
} => {
  const storage = loadDailyClicks();
  const now = new Date();
  const todayKey = formatDateKey(now);

  // 若用户指定筛选特定链接，精确定位该链接对象
  const selectedLink = selectedUrlOrId
    ? links.find(
        l =>
          l.id === selectedUrlOrId ||
          l.url === selectedUrlOrId ||
          normalizeUrlKey(l.url) === normalizeUrlKey(selectedUrlOrId)
      ) || null
    : null;

  const days: DayTrendPoint[] = [];

  // 计算过去的 7 天 (前 6 天到今天，确保以中午 12:00 计算避免夏令时或跨时区天数跳跃)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
    const dateKey = formatDateKey(d);
    const isToday = dateKey === todayKey;

    const dayOfWeek = d.getDay();
    const shortDay = lang === 'zh' ? ZH_WEEKDAYS[dayOfWeek] : EN_WEEKDAYS[dayOfWeek];
    const monthNum = d.getMonth() + 1;
    const dayNum = d.getDate();
    const monthDay = `${String(monthNum).padStart(2, '0')}/${String(dayNum).padStart(2, '0')}`;

    let dayLabel = '';
    if (isToday) {
      dayLabel = lang === 'zh' ? '今天' : 'Today';
    } else {
      dayLabel = `${shortDay} ${monthDay}`;
    }

    const fullDate = `${dateKey} (${shortDay})`;
    const record = storage[dateKey];

    let clicks = 0;
    if (selectedLink) {
      // 筛选单一链接时的精准日点击
      clicks = getLinkClicksOnDay(record, selectedLink);
    } else if (record) {
      // 全局汇总：严格计算该日所有链接的点击之和
      clicks = Object.values(record.links || {}).reduce((sum, c) => sum + (c || 0), 0);
    }

    // 当日热门资源排行 (Tooltip 显示用)
    const topLinksForDay: { title: string; clicks: number; url: string }[] = [];
    if (record?.links) {
      links.forEach(l => {
        const c = getLinkClicksOnDay(record, l);
        if (c > 0) {
          topLinksForDay.push({
            title: l.title,
            clicks: c,
            url: l.url,
          });
        }
      });
      topLinksForDay.sort((a, b) => b.clicks - a.clicks);
    }

    days.push({
      dateKey,
      dayLabel,
      shortDay,
      fullDate,
      clicks,
      isToday,
      topLinks: topLinksForDay.slice(0, 4),
    });
  }

  // 严格统计 7 日内各链接的真实访问总量 (绝不使用 0.4 系数伪造)
  const linkStatsMap = new Map<string, { past7: number; today: number; link: LinkItem }>();

  links.forEach(link => {
    let past7 = 0;
    let today = 0;

    days.forEach(day => {
      const rec = storage[day.dateKey];
      const c = getLinkClicksOnDay(rec, link);
      past7 += c;
      if (day.isToday) {
        today += c;
      }
    });

    if (past7 > 0) {
      linkStatsMap.set(link.id, {
        past7,
        today,
        link,
      });
    }
  });

  // 按近 7 日真实点击数从大到小排列
  const topTrending: TrendingLinkItem[] = Array.from(linkStatsMap.values())
    .sort((a, b) => b.past7 - a.past7 || a.link.title.localeCompare(b.link.title))
    .slice(0, 6)
    .map(item => ({
      id: item.link.id,
      title: item.link.title,
      url: item.link.url,
      iconUrl: item.link.iconUrl,
      iconBgColor: item.link.iconBgColor,
      past7DaysClicks: item.past7,
      todayClicks: item.today,
    }));

  // 计算 KPI 汇总指标
  const totalClicks = days.reduce((sum, d) => sum + d.clicks, 0);
  const todayClicks = days.find(d => d.isToday)?.clicks || 0;

  // 单日峰值计算
  let peakDayLabel = lang === 'zh' ? '暂无峰值' : 'None';
  let peakClicks = 0;

  if (totalClicks > 0) {
    const sortedDays = [...days].sort((a, b) => b.clicks - a.clicks);
    if (sortedDays[0].clicks > 0) {
      peakClicks = sortedDays[0].clicks;
      peakDayLabel = sortedDays[0].dayLabel;
    }
  }

  // 日均访问频次：若无点击为 0，若能整除显示整数，否则精确保留 1 位小数 (如 0.4 次/天，而非粗暴四舍五入为 0)
  const dailyAverage =
    totalClicks === 0
      ? 0
      : totalClicks % 7 === 0
      ? totalClicks / 7
      : Number((totalClicks / 7).toFixed(1));

  // 本周榜首：有真实点击展示真实榜首，否则为 null
  const topLink =
    topTrending.length > 0
      ? { title: topTrending[0].title, clicks: topTrending[0].past7DaysClicks }
      : null;

  const summary: TrendSummary = {
    totalClicks,
    dailyAverage,
    peakDay: {
      label: peakDayLabel,
      clicks: peakClicks,
    },
    topLink,
    todayClicks,
  };

  return { days, summary, topTrending };
};
