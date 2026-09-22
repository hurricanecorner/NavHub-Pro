import { LinkHealth, HealthCheckCycle } from './types';

const STORAGE_KEY = 'navhub_link_health_v4';
const TRUSTED_URLS_KEY = 'navhub_trusted_urls_v1';
const LAST_CHECK_TIME_KEY = 'navhub_last_full_health_check_time';
const HEALTH_CYCLE_KEY = 'navhub_health_check_cycle';

export function getCycleDurationMs(cycle: HealthCheckCycle): number {
  switch (cycle) {
    case '12h':
      return 12 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '3d':
      return 3 * 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case 'manual':
      return Infinity;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export function getHealthCheckCycle(): HealthCheckCycle {
  try {
    const saved = localStorage.getItem(HEALTH_CYCLE_KEY) as HealthCheckCycle;
    if (saved && ['12h', '24h', '3d', '7d', 'manual'].includes(saved)) {
      return saved;
    }
  } catch {}
  return '24h';
}

export function setHealthCheckCycle(cycle: HealthCheckCycle) {
  try {
    localStorage.setItem(HEALTH_CYCLE_KEY, cycle);
  } catch {}
}

export function getLastHealthCheckTime(): number {
  try {
    const raw = localStorage.getItem(LAST_CHECK_TIME_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setLastHealthCheckTime(ts: number = Date.now()) {
  try {
    localStorage.setItem(LAST_CHECK_TIME_KEY, String(ts));
  } catch {}
}

export function isHealthCheckDue(cycle?: HealthCheckCycle): boolean {
  const activeCycle = cycle || getHealthCheckCycle();
  if (activeCycle === 'manual') return false;
  const lastTime = getLastHealthCheckTime();
  if (!lastTime) return true; // Never checked before
  const duration = getCycleDurationMs(activeCycle);
  return (Date.now() - lastTime) >= duration;
}

export function normalizeHealthUrl(url: string): string {
  try {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return full;
  } catch {
    return url.trim();
  }
}

// Trusted URLs (Whitelist) management
export function loadTrustedUrls(): string[] {
  try {
    const raw = localStorage.getItem(TRUSTED_URLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrustedUrls(urls: string[]) {
  try {
    localStorage.setItem(TRUSTED_URLS_KEY, JSON.stringify(urls));
  } catch {}
}

export function isUrlTrusted(url: string, explicitList?: string[]): boolean {
  const norm = normalizeHealthUrl(url).toLowerCase();
  if (!norm) return false;
  const list = explicitList || loadTrustedUrls();
  return list.some(item => {
    const target = normalizeHealthUrl(item).toLowerCase();
    return target === norm || norm.includes(target) || target.includes(norm);
  });
}

export function toggleTrustUrl(url: string): boolean {
  const norm = normalizeHealthUrl(url).toLowerCase();
  if (!norm) return false;
  const current = loadTrustedUrls();
  const exists = current.some(u => normalizeHealthUrl(u).toLowerCase() === norm);
  let next: string[];
  if (exists) {
    next = current.filter(u => normalizeHealthUrl(u).toLowerCase() !== norm);
  } else {
    next = [...current, norm];
  }
  saveTrustedUrls(next);
  return !exists;
}

export function loadHealthCache(): Record<string, LinkHealth> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const cycle = getHealthCheckCycle();
    const cycleMs = getCycleDurationMs(cycle);
    // Keep online status valid for the entire cycle period (minimum 24 hours)
    const onlineMaxAge = Math.max(cycleMs, 24 * 60 * 60 * 1000);
    // Keep offline status valid for at least 2 hours so page refreshes don't re-ping constantly
    const offlineMaxAge = 2 * 60 * 60 * 1000;

    const valid: Record<string, LinkHealth> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === 'object') {
        const item = v as LinkHealth;
        const maxAge = (item.online || item.isTrusted) ? onlineMaxAge : offlineMaxAge;
        if (now - (item.checkedAt || 0) < maxAge) {
          valid[k] = item;
        }
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function saveHealthCache(map: Record<string, LinkHealth>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function clearHealthCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_CHECK_TIME_KEY);
  } catch {}
}

/**
 * Client-Assisted Probing:
 * When cloud server detection returns offline (e.g. cross-border latency or IP blocking),
 * browser sends a lightweight non-CORS probe directly from the user's computer.
 * If the server responds (opaque response), it definitively confirms the site is alive from the user's location.
 */
export async function clientPingProbe(url: string, timeoutMs = 4000): Promise<boolean> {
  const norm = normalizeHealthUrl(url);
  if (!norm) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(norm, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export async function checkSingleUrlApi(url: string, force = false): Promise<LinkHealth> {
  const norm = normalizeHealthUrl(url);
  if (!norm) {
    return {
      online: false,
      status: null,
      responseTimeMs: 0,
      checkedAt: Date.now(),
      error: 'Empty URL',
    };
  }

  // If user explicitly marked this URL as trusted, always return online
  if (isUrlTrusted(norm)) {
    return {
      online: true,
      status: 200,
      responseTimeMs: 15,
      checkedAt: Date.now(),
      isTrusted: true,
    };
  }

  try {
    const res = await fetch(`/api/check-url?url=${encodeURIComponent(norm)}${force ? '&force=true' : ''}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    let result: LinkHealth = {
      online: Boolean(data.online),
      status: data.status ?? null,
      responseTimeMs: data.responseTimeMs || 0,
      checkedAt: data.checkedAt || Date.now(),
      error: data.error,
    };

    // If server thinks it is offline, give the user's local browser a chance to verify
    if (!result.online) {
      const localReachable = await clientPingProbe(norm, 3500);
      if (localReachable) {
        result = {
          online: true,
          status: 200,
          responseTimeMs: 350,
          checkedAt: Date.now(),
          isClientVerified: true,
        };
      }
    }

    return result;
  } catch (err: any) {
    // If server call itself threw, perform client fallback
    const localReachable = await clientPingProbe(norm, 3500);
    if (localReachable) {
      return {
        online: true,
        status: 200,
        responseTimeMs: 400,
        checkedAt: Date.now(),
        isClientVerified: true,
      };
    }

    return {
      online: false,
      status: null,
      responseTimeMs: 0,
      checkedAt: Date.now(),
      error: err?.message || 'Check failed',
    };
  }
}

export async function checkBatchUrlsApi(urls: string[], force = false): Promise<Record<string, LinkHealth>> {
  if (!urls.length) return {};
  const trusted = loadTrustedUrls();

  try {
    const res = await fetch('/api/check-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, force }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const out: Record<string, LinkHealth> = {};

    if (data.results) {
      // Collect offline candidates for client-side cross-check
      const offlineCandidates: string[] = [];

      for (const [k, v] of Object.entries(data.results)) {
        const item = v as any;
        const isTrusted = isUrlTrusted(k, trusted);

        if (isTrusted) {
          out[k] = {
            online: true,
            status: 200,
            responseTimeMs: 15,
            checkedAt: Date.now(),
            isTrusted: true,
          };
          continue;
        }

        const online = Boolean(item.online);
        out[k] = {
          online,
          status: item.status ?? null,
          responseTimeMs: item.responseTimeMs || 0,
          checkedAt: item.checkedAt || Date.now(),
          error: item.error,
        };

        if (!online) {
          offlineCandidates.push(k);
        }
      }

      // Concurrently run client ping probe on any links the server marked offline
      if (offlineCandidates.length > 0) {
        await Promise.all(
          offlineCandidates.slice(0, 10).map(async (candidateUrl) => {
            const reachable = await clientPingProbe(candidateUrl, 3000);
            if (reachable) {
              out[candidateUrl] = {
                online: true,
                status: 200,
                responseTimeMs: 320,
                checkedAt: Date.now(),
                isClientVerified: true,
              };
            }
          })
        );
      }
    }
    return out;
  } catch (err: any) {
    console.error('Batch health check failed:', err);
    return {};
  }
}
