import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LinkItem, LogoShape, Theme, LinkHealth } from '../types';
import { 
  ExternalLink, 
  Edit2, 
  Trash2, 
  Globe, 
  Flame, 
  Pin, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sparkles,
  MapPin 
} from 'lucide-react';
import { detectCountrySync } from '../countryDetector';
import { detectStatsSync, auditSemanticConflict } from '../domainStats';
import { generateLetterIcon, normalizeIconForDisplay } from '../services/highResIconService';

const COUNTRY_FLAGS: Record<string, string> = {
  '中国': '🇨🇳',
  '中国香港': '🇭🇰',
  '中国台湾': '🇹🇼',
  '中国澳门': '🇲🇴',
  '日本': '🇯🇵',
  '韩国': '🇰🇷',
  '美国': '🇺🇸',
  '英国': '🇬🇧',
  '德国': '🇩🇪',
  '法国': '🇫🇷',
  '俄罗斯': '🇷🇺',
  '新加坡': '🇸🇬',
  '加拿大': '🇨🇦',
  '澳大利亚': '🇦🇺',
  '印度': '🇮🇳',
  '意大利': '🇮🇹',
  '西班牙': '🇪🇸',
  '荷兰': '🇳🇱',
  '瑞士': '🇨🇭',
  '瑞典': '🇸🇪',
  '挪威': '🇳🇴',
  '芬兰': '🇫🇮',
  '丹麦': '🇩🇰',
  '比利时': '🇧🇪',
  '奥地利': '🇦🇹',
  '波兰': '🇵🇱',
  '巴西': '🇧🇷',
  '墨西哥': '🇲🇽',
  '越南': '🇻🇳',
  '泰国': '🇹🇭',
  '马来西亚': '🇲🇾',
  '印度尼西亚': '🇮🇩',
  '菲律宾': '🇵🇭',
  '新西兰': '🇳🇿',
  '爱尔兰': '🇮🇪',
  '南非': '🇿🇦',
  '阿联酋': '🇦🇪',
  '土耳其': '🇹🇷',
  '乌克兰': '🇺🇦',
  '欧洲': '🇪🇺',
};

const getCountryFlag = (country: string): string => {
  return COUNTRY_FLAGS[country] || '🌐';
};

interface LinkCardProps {
  item: LinkItem;
  isEditMode: boolean;
  isDragging?: boolean;
  healthStatus?: LinkHealth;
  isQuickView?: boolean;
  onEdit: (item: LinkItem) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (item: LinkItem) => void;
  onClickLink?: (item: LinkItem) => void;
  onSelectTag?: (tag: string) => void;
  onRecheckHealth?: (url: string) => void;
  onToggleTrust?: (url: string) => void;
  onEnhanceIcon?: (item: LinkItem) => void;
  activeTag?: string;
  t: any;
  shape?: LogoShape;
  theme?: Theme;
  rank?: number;
  showStats?: boolean;
}

interface SingleLineTagsProps {
  tags: string[];
  activeTag?: string;
  onSelectTag?: (tag: string) => void;
  isEditMode: boolean;
  isDragging?: boolean;
  onPopoverChange?: (open: boolean) => void;
}

const SingleLineTags: React.FC<SingleLineTagsProps> = ({
  tags,
  activeTag,
  onSelectTag,
  isEditMode,
  isDragging,
  onPopoverChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(tags.length);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onPopoverChange?.(showPopover);
  }, [showPopover, onPopoverChange]);

  const updatePopoverCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const popoverWidth = 210;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }

    const spaceAbove = rect.top;
    if (spaceAbove >= 130) {
      setPopoverCoords({
        left,
        bottom: window.innerHeight - rect.top + 8
      });
    } else {
      setPopoverCoords({
        left,
        top: rect.bottom + 8
      });
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updatePopoverCoords();
    setShowPopover(true);
  }, [updatePopoverCoords]);

  const handleScheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setShowPopover(false);
    }, 180);
  }, []);

  const handleCancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || tags.length <= 1) {
      setVisibleCount(tags.length);
      return;
    }

    const calculateFit = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth <= 0) return;

      const ELLIPSIS_WIDTH = 28; // width of '···' button
      const GAP = 4; // gap-1 is 4px

      let currentTotal = 0;
      let fit = 0;

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        // Calculate tag pill width: px-1.5 (12px) + borders (2px) + '#' (~6px) + char widths
        let tagW = 20;
        for (let j = 0; j < tag.length; j++) {
          tagW += tag.charCodeAt(j) > 255 ? 12 : 7.5;
        }

        const isLast = (i === tags.length - 1);
        const gap = (i > 0 ? GAP : 0);
        const needed = currentTotal + gap + tagW + (isLast ? 0 : (GAP + ELLIPSIS_WIDTH));

        if (needed <= containerWidth) {
          currentTotal += gap + tagW;
          fit++;
        } else {
          if (isLast && currentTotal + gap + tagW <= containerWidth) {
            fit++;
          }
          break;
        }
      }

      setVisibleCount(Math.max(1, fit));
    };

    calculateFit();

    const ro = new ResizeObserver(() => {
      calculateFit();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [tags]);

  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setShowPopover(false);
      }
    };
    const handleScrollOrResize = () => {
      updatePopoverCoords();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showPopover, updatePopoverCoords]);

  const visibleTags = tags.slice(0, visibleCount);
  const hiddenTags = tags.slice(visibleCount);

  return (
    <div ref={containerRef} className="h-5 flex items-center gap-1 mt-1.5 min-w-0 overflow-hidden flex-nowrap relative z-20">
      {visibleTags.map((tag, idx) => (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            if (onSelectTag && !isEditMode) {
              e.preventDefault();
              e.stopPropagation();
              onSelectTag(tag);
            }
          }}
          className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${
            isDragging ? '!transition-none' : 'duration-300'
          } ${
            activeTag === tag
              ? 'bg-brand-600 text-white border border-brand-600 shadow-xs'
              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:bg-white/5 dark:text-zinc-200 dark:border-white/5 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 cursor-pointer'
          }`}
        >
          #{tag}
        </button>
      ))}

      {hiddenTags.length > 0 && (
        <div 
          className="relative shrink-0 inline-flex items-center"
          onMouseEnter={handleOpen}
          onMouseLeave={handleScheduleClose}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (showPopover) {
                setShowPopover(false);
              } else {
                handleOpen();
              }
            }}
            className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg text-[9px] font-black tracking-widest transition-all cursor-pointer select-none ${
              showPopover
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-brand-600 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/20 dark:hover:text-white'
            }`}
            title={`更多 ${hiddenTags.length} 个标签: ${hiddenTags.map(t => `#${t}`).join(' ')}`}
          >
            ···
          </button>
        </div>
      )}

      {showPopover && popoverCoords && createPortal(
        <div
          ref={popoverRef}
          className="fixed min-w-[160px] max-w-[240px] p-2.5 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 z-[9999] flex flex-wrap gap-1 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${popoverCoords.left}px`,
            ...(popoverCoords.bottom !== undefined 
              ? { bottom: `${popoverCoords.bottom}px` } 
              : { top: `${popoverCoords.top}px` }
            )
          }}
          onMouseEnter={handleCancelClose}
          onMouseLeave={handleScheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full text-[9px] font-bold text-slate-400 dark:text-zinc-400 mb-1 px-0.5 flex items-center justify-between">
            <span>更多标签 (+{hiddenTags.length})</span>
          </div>
          {hiddenTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                if (onSelectTag && !isEditMode) {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPopover(false);
                  onSelectTag(tag);
                }
              }}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTag === tag
                  ? 'bg-brand-600 text-white border border-brand-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:bg-zinc-700 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 cursor-pointer'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const LinkCard: React.FC<LinkCardProps> = ({ 
  item, 
  isEditMode, 
  isDragging, 
  healthStatus,
  isQuickView = false,
  onEdit, 
  onDelete, 
  onTogglePin,
  onClickLink,
  onSelectTag, 
  onRecheckHealth,
  onToggleTrust,
  onEnhanceIcon,
  activeTag, 
  t, 
  shape = 'square', 
  theme,
  rank,
  showStats = true
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState<{
    left: number;
    width: number;
    top: number;
    bottom: number;
    placeBelow: boolean;
  } | null>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; size: number; id: number }[]>([]);
  const touchMovedRef = useRef(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // 移动端轻微触觉反馈（振动）与视觉微交互波纹
  const triggerTactileFeedback = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    // 1. 设备触觉反馈：支持 Vibration API 的移动端设备调用 12ms 的轻微振动
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // 静默处理浏览器权限或非用户激活限制
      }
    }

    // 2. 视觉轻微按压与弹性回弹状态
    setIsPressed(true);
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setIsPressed(false);
    }, 280);

    // 3. 计算产生触击点辐射展开的涟漪微光
    if (cardRef.current && e) {
      const rect = cardRef.current.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches.length > 0) {
        clientX = (e as React.TouchEvent).changedTouches[0].clientX;
        clientY = (e as React.TouchEvent).changedTouches[0].clientY;
      } else if ('clientX' in e && (e.clientX !== 0 || e.clientY !== 0)) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.2;
      const id = Date.now() + Math.random();

      setRipples(prev => [...prev.slice(-2), { x, y, size, id }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 500);
    }
  }, []);

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    triggerTactileFeedback(e);
    onClickLink?.(item);
  }, [item, onClickLink, triggerTactileFeedback]);

  const handleTouchStart = useCallback(() => {
    if (isEditMode || isDragging) return;
    touchMovedRef.current = false;
    setIsPressed(true);
  }, [isEditMode, isDragging]);

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    setIsPressed(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchMovedRef.current) {
      setTimeout(() => setIsPressed(false), 200);
    } else {
      setIsPressed(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  const cleanDomain = useMemo(() => {
    try {
      const u = new URL(item.url.startsWith('http://') || item.url.startsWith('https://') ? item.url : `https://${item.url}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return item.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }, [item.url]);

  const detectedCountry = useMemo(() => {
    if (!isQuickView) return '';
    return detectCountrySync(item.url, { title: item.title, description: item.description });
  }, [item.url, item.title, item.description, isQuickView]);

  const domainStat = useMemo(() => {
    if (!isQuickView) return '';
    if (typeof item.smartStats === 'string' && item.smartStats.trim()) {
      return auditSemanticConflict(item.smartStats.trim(), {
        title: item.title,
        description: item.description,
        tags: item.tags
      });
    }
    return detectStatsSync(item.url, { 
      title: item.title, 
      description: item.description, 
      tags: item.tags,
      country: detectedCountry 
    });
  }, [item.url, item.title, item.description, item.tags, item.smartStats, detectedCountry, isQuickView]);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(item.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const updateCoords = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsHovered(false);
      return;
    }
    const placeBelow = rect.top < 85;
    setTooltipCoords({
      left: rect.left,
      width: rect.width,
      top: rect.top,
      bottom: rect.bottom,
      placeBelow
    });
  };

  const handleMouseEnter = () => {
    if (isEditMode || isDragging || isQuickView) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    updateCoords();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    if (!isHovered || isQuickView) return;
    const handleScrollOrResize = () => {
      updateCoords();
    };
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isHovered, isQuickView]);

  useEffect(() => {
    if (isDragging || isEditMode || isQuickView) {
      setIsHovered(false);
    }
  }, [isDragging, isEditMode, isQuickView]);

  const letterIconSrc = useMemo(() => {
    return generateLetterIcon(item.title || item.url, item.iconBgColor ? {
      background: item.iconBgColor,
      backgroundTo: item.iconBgColor,
    } : undefined);
  }, [item.title, item.url, item.iconBgColor]);

  // 规范化图标显示，解决历史生成的 SVG 中写死的 rx 导致的八边形切角或边角冲突问题
  const displayIconUrl = useMemo(() => {
    return normalizeIconForDisplay(item.iconUrl);
  }, [item.iconUrl]);

  const [imgSrc, setImgSrc] = useState<string>(displayIconUrl);
  const [hasTriedProxy, setHasTriedProxy] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(displayIconUrl);
    setHasTriedProxy(false);
    setImgError(false);
  }, [displayIconUrl]);

  const handleImageError = useCallback(() => {
    // 若外部直连（如 Google Favicon API）因网络阻断或超时失败，自动无缝切换到免墙服务端代理回退
    if (
      !hasTriedProxy &&
      imgSrc &&
      /^https?:\/\//i.test(imgSrc) &&
      !imgSrc.includes('/api/proxy-image')
    ) {
      setHasTriedProxy(true);
      setImgSrc(`/api/proxy-image?url=${encodeURIComponent(imgSrc)}`);
    } else {
      setImgError(true);
    }
  }, [hasTriedProxy, imgSrc]);

  const IconFallback = () => (
    <img
      src={letterIconSrc}
      alt={item.title || 'Logo'}
      className="w-full h-full object-contain select-none"
      draggable={false}
    />
  );
  
  const isCustom = theme === 'custom';
  const isOffline = healthStatus && !healthStatus.online && !healthStatus.isChecking;

  // Calculate border radius based on shape prop
  const getShapeClass = (s: string) => {
    switch (s) {
      case 'circle': return 'rounded-full';
      case 'rounded': return 'rounded-[38%]'; // Xiaomi superellipse style
      case 'square': return 'rounded-none'; // Sharp square as requested
      default: return 'rounded-none';
    }
  };

  // 根据图标形状保持标准比例与自适应居中，彻底消除强制 scale 放大导致的边缘与圆角被裁切（杜绝八边形切角）
  const iconContainerStyle = item.iconBgColor ? { backgroundColor: item.iconBgColor } : {};
  const iconContainerClasses = `w-10 h-10 lg:w-12 lg:h-12 ${getShapeClass(shape)} overflow-hidden shrink-0 border border-slate-100 dark:border-white/5 flex items-center justify-center shadow-inner transition-transform relative ${isDragging ? '!transition-none' : 'group-hover:scale-110 duration-500'} ${isPressed ? '!scale-110 !duration-150' : ''} ${!item.iconBgColor ? 'bg-white dark:bg-zinc-800' : ''}`;
  const iconImageClasses = `w-full h-full object-contain select-none transform-gpu scale-100 ${isDragging ? '!transition-none' : 'transition-transform duration-500'}`;

  // ===================== QUICK VIEW EXPANDED MODE =====================
  if (isQuickView) {
    const quickCardClasses = `group relative rounded-[1.25rem] lg:rounded-[1.5rem] border shadow-sm p-4 lg:p-5 flex flex-col justify-between gap-3.5
      min-h-[195px] h-full
      ${isOffline 
        ? 'bg-rose-50/40 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/50' 
        : 'bg-white border-slate-200/70 dark:bg-zinc-800/90 dark:border-white/10'
      }
      ${isCustom 
        ? 'dark:bg-zinc-900/80 dark:backdrop-blur-md dark:border-white/10' 
        : 'dark:backdrop-blur-md'
      }
      dark:shadow-none isolate
      ${isDragging ? 'opacity-90 shadow-2xl scale-105 !transition-none z-50' : 'transition-all duration-300 hover:shadow-xl hover:border-brand-500/40'}
      ${isEditMode && !isDragging ? 'cursor-default' : 'hover:-translate-y-1 active:scale-[0.985]'}
      ${isPressed && !isEditMode && !isDragging ? '!scale-[0.985] ring-2 ring-brand-500/30 border-brand-500/40' : ''}`;

    return (
      <div ref={cardRef} className={quickCardClasses}>
        {/* Tactile Ripple Wave Feedback Container (Clipped to Card Radius) */}
        <div className="absolute inset-0 rounded-[1.25rem] lg:rounded-[1.5rem] overflow-hidden pointer-events-none z-0">
          {ripples.map(r => (
            <span
              key={r.id}
              className="absolute rounded-full bg-brand-500/15 dark:bg-brand-400/20 animate-tactile-ripple pointer-events-none"
              style={{
                left: `${r.x - r.size / 2}px`,
                top: `${r.y - r.size / 2}px`,
                width: `${r.size}px`,
                height: `${r.size}px`,
              }}
            />
          ))}
        </div>

        {/* Rank or Pinned Badge */}
        {item.isPinned ? (
          <div 
            className="absolute -top-2.5 -left-2 z-30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm border bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400"
            title={t.app?.pinnedBadge || "已置顶到常用前排"}
          >
            <Pin className="w-2.5 h-2.5 fill-current rotate-12" />
            <span>{t.app?.pinnedBadge || '置顶'}</span>
            {typeof rank === 'number' && <span className="opacity-80 text-[9px]">#{rank}</span>}
          </div>
        ) : typeof rank === 'number' ? (
          <div className={`absolute -top-2.5 -left-2 z-30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-0.5 shadow-sm border ${
            rank === 1 
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 border-amber-300' 
              : rank === 2 
              ? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-slate-300'
              : rank === 3 
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 border-amber-500'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
          }`}>
            <span>#{rank}</span>
          </div>
        ) : null}

        {/* Top Section: Icon, Title, Domain & Metadata Badges */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className={iconContainerClasses} style={iconContainerStyle}>
                  {item.iconUrl && !imgError ? (
                    <img
                      src={imgSrc || displayIconUrl}
                      alt={item.title}
                      className={iconImageClasses}
                      style={{ imageRendering: '-webkit-optimize-contrast' }}
                      onError={handleImageError}
                    />
                  ) : ( <IconFallback /> )}
                </div>
                {/* Health Status Dot Badge on Bottom-Right of Icon */}
                {healthStatus && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (healthStatus.isTrusted || item.isTrusted) {
                        onToggleTrust?.(item.url);
                      } else {
                        onRecheckHealth?.(item.url);
                      }
                    }}
                    onContextMenu={(e) => {
                      if (!healthStatus.online && onToggleTrust) {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleTrust(item.url);
                      }
                    }}
                    className="absolute -bottom-0.5 -right-0.5 z-20 w-4 h-4 lg:w-[18px] lg:h-[18px] rounded-full bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-sm transition-transform hover:scale-125 cursor-pointer p-0 m-0 leading-none flex items-center justify-center shrink-0"
                    title={
                      healthStatus.isChecking
                        ? (t.app?.detecting || '正在检测中...')
                        : (healthStatus.isTrusted || item.isTrusted)
                        ? '受信任网址 · 始终判定正常 (点击可取消信任)'
                        : healthStatus.online
                        ? `响应正常 · 在线 (${healthStatus.responseTimeMs ? `${healthStatus.responseTimeMs}ms` : '正常'}) · 点击可重新检测`
                        : `该链接无法响应 · 离线${healthStatus.status ? ` (HTTP ${healthStatus.status})` : ''}${healthStatus.error ? ` · ${healthStatus.error}` : ''} · 点击立即重新检测${onToggleTrust ? ' (右键加入信任白名单)' : ''}`
                    }
                    aria-label={healthStatus.online ? (t.app?.online || '在线') : (t.app?.offline || '离线')}
                  >
                    <span
                      className={`rounded-full flex items-center justify-center shrink-0 m-auto ${
                        healthStatus.isChecking
                          ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-slate-400 dark:bg-zinc-400 animate-pulse'
                          : (healthStatus.isTrusted || item.isTrusted)
                          ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-teal-500'
                          : healthStatus.online
                          ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-emerald-500'
                          : 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-rose-500 animate-pulse'
                      }`}
                    >
                      {(healthStatus.isTrusted || item.isTrusted) && (
                        <ShieldCheck className="w-1.5 h-1.5 text-white stroke-[2.5]" />
                      )}
                    </span>
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className="group/title inline-flex items-center gap-1.5 max-w-full font-black text-sm lg:text-base text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 active:scale-[0.98] transition-all tracking-tight line-clamp-1 touch-manipulation select-none"
                  title={item.title}
                >
                  <span className="truncate">{item.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover/title:opacity-100 text-brand-500 transition-opacity shrink-0" />
                </a>

                {/* Metadata Pill Strip: Domain + Region / Country */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100/90 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-white/5 max-w-[170px] truncate" title={item.url}>
                    <Globe className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cleanDomain}</span>
                  </span>
                  {detectedCountry && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100/90 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-white/5 shrink-0" title={`归属地区: ${detectedCountry}`}>
                      <span>{getCountryFlag(detectedCountry)}</span>
                      <span>{detectedCountry}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Status Badges: Clicks / Stats */}
            {Boolean(showStats) && (
              <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                <span 
                  className="h-[18px] shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 rounded-md border border-amber-200/50 dark:border-amber-800/40 select-none"
                  title={`点击访问统计: ${item.clickCount || 0} 次`}
                >
                  <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{item.clickCount || 0}</span>
                </span>
              </div>
            )}
          </div>

          {/* Middle: Expanded Preview Snippet Box */}
          <div className="mt-3">
            <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-700/50 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium select-text">
              {item.description ? (
                <p className="line-clamp-4">{item.description}</p>
              ) : (
                <p className="italic text-slate-400 dark:text-zinc-500 text-[11px]">{t.app?.noSnippet || '暂无预览详情描述。'}</p>
              )}
            </div>

            {/* Domain Intelligence / Statistics Snippet */}
            {domainStat && (
              <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100/70 dark:border-brand-900/40 text-[11px] font-medium text-brand-800 dark:text-brand-300 leading-snug">
                <Sparkles className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                <span>{domainStat}</span>
              </div>
            )}
          </div>

          {/* Tags Section */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {item.tags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    if (onSelectTag && !isEditMode) {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectTag(tag);
                    }
                  }}
                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTag === tag
                      ? 'bg-brand-600 text-white border border-brand-600 shadow-xs'
                      : 'bg-slate-100/90 text-slate-600 border border-slate-200/60 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:bg-zinc-700/60 dark:text-zinc-300 dark:border-white/5 dark:hover:bg-brand-900/30 cursor-pointer'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Row: Copy URL button & Visit Site button / Edit controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-700/50 flex items-center justify-between gap-2 mt-auto">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
            title={`点击复制网址: ${item.url}`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{t.app?.copiedUrl || '已复制!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.app?.copyUrl || '复制链接'}</span>
              </>
            )}
          </button>

          {isEditMode && !isDragging ? (
            <div className="flex items-center gap-1">
              {onTogglePin && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTogglePin(item); }} 
                  title={item.isPinned ? (t.app?.unpinFromTop || "取消常用置顶") : (t.app?.pinToTop || "置顶到常用前排")}
                  className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                    item.isPinned 
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:hover:bg-amber-900/70 ring-1 ring-amber-400/60' 
                      : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-current rotate-12' : ''}`} />
                </button>
              )}
              {onEnhanceIcon && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEnhanceIcon(item); }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-90"
                  title="图标高清修复 / 算法锐化"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-90" title="编辑"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-all active:scale-95 touch-manipulation select-none"
            >
              <span>{t.app?.visitSite || '直达访问'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ===================== STANDARD COMPACT MODE =====================
  const cardClasses = `group relative rounded-[1.25rem] lg:rounded-[1.5rem] border shadow-sm p-3.5 lg:p-4 flex gap-3.5 lg:gap-4 items-center 
    h-[96px] lg:h-[104px]
    ${isOffline 
      ? 'bg-rose-50/30 border-rose-200/80 dark:bg-rose-950/15 dark:border-rose-900/40' 
      : 'bg-white border-slate-100/60'
    }
    ${isCustom 
      ? 'dark:bg-zinc-900/60 dark:backdrop-blur-md dark:border-white/10' 
      : 'dark:bg-zinc-700/30 dark:backdrop-blur-md dark:border-white/5'
    }
    dark:shadow-none
    isolate
    ${isDragging 
      ? 'opacity-90 shadow-2xl scale-105 !transition-none z-50' 
      : isPopoverOpen 
      ? 'z-40 transition-all duration-500' 
      : 'transition-all duration-300 hover:z-40 focus-within:z-40'
    }
    ${isEditMode && !isDragging 
      ? 'cursor-default' 
      : `hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 hover:border-brand-500/20 active:scale-[0.975] ${isCustom ? 'dark:hover:bg-zinc-900/80' : 'dark:hover:bg-zinc-700/60'}`}
    ${isPressed && !isEditMode && !isDragging ? '!scale-[0.975] ring-2 ring-brand-500/30 border-brand-500/40 shadow-inner' : ''}`;

  return (
    <>
      <div 
        ref={cardRef}
        className={cardClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Tactile Ripple Wave Feedback Container (Clipped to Card Radius) */}
        <div className="absolute inset-0 rounded-[1.25rem] lg:rounded-[1.5rem] overflow-hidden pointer-events-none z-0">
          {ripples.map(r => (
            <span
              key={r.id}
              className="absolute rounded-full bg-brand-500/15 dark:bg-brand-400/20 animate-tactile-ripple pointer-events-none"
              style={{
                left: `${r.x - r.size / 2}px`,
                top: `${r.y - r.size / 2}px`,
                width: `${r.size}px`,
                height: `${r.size}px`,
              }}
            />
          ))}
        </div>

        {/* Rank or Pinned Badge */}
        {item.isPinned ? (
          <div 
            className="absolute -top-2 -left-2 z-30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm border bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400"
            title={t.app?.pinnedBadge || "已置顶到常用前排"}
          >
            <Pin className="w-2.5 h-2.5 fill-current rotate-12" />
            <span>{t.app?.pinnedBadge || '置顶'}</span>
            {typeof rank === 'number' && <span className="opacity-80 text-[9px]">#{rank}</span>}
          </div>
        ) : typeof rank === 'number' ? (
          <div className={`absolute -top-2 -left-2 z-30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-0.5 shadow-sm border ${
            rank === 1 
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 border-amber-300' 
              : rank === 2 
              ? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-slate-300'
              : rank === 3 
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 border-amber-500'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
          }`}>
            <span>#{rank}</span>
          </div>
        ) : null}

        <div className="relative shrink-0">
          <div className={iconContainerClasses} style={iconContainerStyle}>
            {item.iconUrl && !imgError ? (
              <img 
                src={imgSrc || displayIconUrl} 
                alt={item.title} 
                className={iconImageClasses}
                style={{ imageRendering: '-webkit-optimize-contrast' }}
                onError={handleImageError} 
              />
            ) : ( <IconFallback /> )}
          </div>
          {/* Health Status Dot Badge on Bottom-Right of Icon */}
          {healthStatus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (healthStatus.isTrusted || item.isTrusted) {
                  onToggleTrust?.(item.url);
                } else {
                  onRecheckHealth?.(item.url);
                }
              }}
              onContextMenu={(e) => {
                if (!healthStatus.online && onToggleTrust) {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleTrust(item.url);
                }
              }}
              className="absolute -bottom-0.5 -right-0.5 z-20 w-4 h-4 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-sm transition-transform hover:scale-125 cursor-pointer p-0 m-0 leading-none flex items-center justify-center shrink-0"
              title={
                healthStatus.isChecking
                  ? (t.app?.detecting || '正在检测中...')
                  : (healthStatus.isTrusted || item.isTrusted)
                  ? '受信任网址 · 始终判定正常 (点击可取消信任)'
                  : healthStatus.online
                  ? `响应正常 · 在线 (${healthStatus.responseTimeMs ? `${healthStatus.responseTimeMs}ms` : '正常'}) · 点击可重新检测`
                  : `该链接无法响应 · 离线${healthStatus.status ? ` (HTTP ${healthStatus.status})` : ''}${healthStatus.error ? ` · ${healthStatus.error}` : ''} · 点击立即重新检测${onToggleTrust ? ' (右键加入信任白名单)' : ''}`
              }
              aria-label={healthStatus.online ? (t.app?.online || '在线') : (t.app?.offline || '离线')}
            >
              <span
                className={`rounded-full flex items-center justify-center shrink-0 m-auto ${
                  healthStatus.isChecking
                    ? 'w-2 h-2 bg-slate-400 dark:bg-zinc-400 animate-pulse'
                    : (healthStatus.isTrusted || item.isTrusted)
                    ? 'w-2 h-2 bg-teal-500'
                    : healthStatus.online
                    ? 'w-2 h-2 bg-emerald-500'
                    : 'w-2 h-2 bg-rose-500 animate-pulse'
                }`}
              >
                {(healthStatus.isTrusted || item.isTrusted) && (
                  <ShieldCheck className="w-1.5 h-1.5 text-white stroke-[2.5]" />
                )}
              </span>
            </button>
          )}
        </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
        <div className="flex items-center justify-between gap-2 pr-6 mb-0.5">
          <h3 className={`font-black text-slate-800 truncate text-xs lg:text-sm dark:text-zinc-100 leading-tight tracking-wider transition-colors ${isDragging ? '!transition-none' : 'group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>{item.title}</h3>
          {Boolean(showStats) && (
            <div className="shrink-0 flex items-center gap-1.5">
              <span 
                className="h-[18px] shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 rounded-md border border-amber-200/50 dark:border-amber-800/40 select-none"
                title={`点击访问统计: ${item.clickCount || 0} 次`}
              >
                <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                <span>{item.clickCount || 0}</span>
              </span>
            </div>
          )}
        </div>
        <p className="text-[10px] lg:text-[11px] font-medium text-slate-500 truncate leading-snug dark:text-zinc-400 tracking-normal">{item.description || 'No description'}</p>
        {item.tags && item.tags.length > 0 && (
          <SingleLineTags
            tags={item.tags}
            activeTag={activeTag}
            onSelectTag={onSelectTag}
            isEditMode={isEditMode}
            isDragging={isDragging}
            onPopoverChange={setIsPopoverOpen}
          />
        )}
      </div>
      
      {isEditMode && !isDragging ? (
        <div className="absolute top-2 right-2 flex gap-1 z-20 animate-in fade-in zoom-in duration-300">
          {onTogglePin && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePin(item); }} 
              title={item.isPinned ? (t.app?.unpinFromTop || "取消常用置顶") : (t.app?.pinToTop || "置顶到常用前排")}
              className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                item.isPinned 
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:hover:bg-amber-900/70 ring-1 ring-amber-400/60' 
                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-zinc-700'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-current rotate-12' : ''}`} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-90"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ) : !isEditMode && !isDragging && (
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={handleLinkClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="absolute inset-0 z-10 touch-manipulation select-none" 
          aria-label={`Visit ${item.title}`}
        >
          <div className={`absolute top-4 right-4 transform transition-all duration-300 ${
            isPressed 
              ? 'opacity-100 scale-125 text-brand-600 dark:text-brand-400 translate-x-0' 
              : 'opacity-0 lg:group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 text-brand-500'
          }`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </a>
      )}
    </div>

    {isHovered && !isPopoverOpen && tooltipCoords && (item.description || (item.tags && item.tags.length > 0)) && !isEditMode && !isDragging && createPortal(
      <div 
        className="fixed text-white text-[10px] lg:text-[11px] p-3 lg:p-4 rounded-2xl shadow-2xl z-[9999] pointer-events-none border border-white/10 backdrop-blur-md animate-in fade-in duration-150"
        style={{ 
          backgroundColor: 'var(--brand-700)',
          left: `${tooltipCoords.left}px`,
          width: `${tooltipCoords.width}px`,
          ...(tooltipCoords.placeBelow 
            ? { top: `${tooltipCoords.bottom + 12}px` }
            : { bottom: `${window.innerHeight - tooltipCoords.top + 12}px` }
          )
        }}
      >
        {item.description && <p className="leading-relaxed font-black text-white">{item.description}</p>}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/20">
            {item.tags.map((tag, idx) => (
              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/20 text-white text-[9px] font-bold">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {healthStatus && (
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[9px] font-bold tracking-wide">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${healthStatus.online ? 'bg-emerald-300' : 'bg-rose-300'}`} />
              <span>{healthStatus.online ? (t.app?.online || '在线') : (t.app?.offline || '离线')}</span>
              {(healthStatus.responseTimeMs ?? 0) > 0 && (
                <span className="opacity-80">· {healthStatus.responseTimeMs}ms</span>
              )}
            </span>
            {healthStatus.status ? (
              <span className="opacity-90">HTTP {healthStatus.status}</span>
            ) : healthStatus.error ? (
              <span className="text-rose-200 max-w-[130px] truncate">{healthStatus.error}</span>
            ) : null}
          </div>
        )}
        {tooltipCoords.placeBelow ? (
          <div 
            className="absolute left-8 bottom-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px]"
            style={{ borderBottomColor: 'var(--brand-700)' }}
          />
        ) : (
          <div 
            className="absolute left-8 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]"
            style={{ borderTopColor: 'var(--brand-700)' }}
          />
        )}
      </div>,
      document.body
    )}
  </>
  );
};

export default LinkCard;