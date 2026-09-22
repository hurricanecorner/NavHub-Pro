import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Zap,
  Sliders,
  Check,
  RefreshCw,
  X,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  probeHighResIcons,
  enhanceIconByAlgorithm,
  HdIconCandidate,
  EnhancementResult,
  loadImageSafely
} from '../utils/iconEnhancer';
import { generateLetterIcon } from '../services/highResIconService';

interface HdIconEnhanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl?: string;
  url?: string;
  targetTitle?: string;
  title?: string;
  currentIconUrl?: string;
  currentIcon?: string;
  initialTab?: 'probe' | 'algorithm';
  onApplyIcon: (newIconUrl: string) => void;
}

export const HdIconEnhanceModal: React.FC<HdIconEnhanceModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  url,
  targetTitle,
  title,
  currentIconUrl,
  currentIcon,
  initialTab,
  onApplyIcon,
}) => {
  const rawUrl = targetUrl || url || '';
  const effectiveTitle = targetTitle || title || '';
  const effectiveCurrentIcon = currentIconUrl || currentIcon || '';

  // 智能推导 effectiveUrl（如 rawUrl 为空但 icon 含有 ?domain= 时自动提取）
  let effectiveUrl = rawUrl;
  if (!effectiveUrl && effectiveCurrentIcon) {
    const domainMatch = effectiveCurrentIcon.match(/[?&]domain=([^&#]+)/i);
    if (domainMatch && domainMatch[1]) {
      effectiveUrl = `https://${domainMatch[1]}`;
    } else if (effectiveCurrentIcon.startsWith('http')) {
      try {
        const p = new URL(effectiveCurrentIcon);
        effectiveUrl = `${p.protocol}//${p.hostname}`;
      } catch {
        effectiveUrl = effectiveCurrentIcon;
      }
    }
  }

  const [activeTab, setActiveTab] = useState<'probe' | 'algorithm'>(initialTab || 'algorithm');
  const [candidates, setCandidates] = useState<HdIconCandidate[]>([]);
  const [isProbing, setIsProbing] = useState(false);
  const [selectedCandidateUrl, setSelectedCandidateUrl] = useState<string>('');

  // Algorithm state
  const [algoInputSource, setAlgoInputSource] = useState<'current' | 'candidate'>('current');
  const [algorithmIntensity, setAlgorithmIntensity] = useState<number>(0.65);
  const [targetResolution, setTargetResolution] = useState<number>(256);
  const [boostContrast, setBoostContrast] = useState<boolean>(true);
  const [isProcessingAlgorithm, setIsProcessingAlgorithm] = useState(false);
  const [algorithmResult, setAlgorithmResult] = useState<EnhancementResult | null>(null);
  const [originalMeta, setOriginalMeta] = useState<{ width: number; height: number } | null>(null);
  const [algorithmError, setAlgorithmError] = useState<string | null>(null);

  // Compare mode toggle
  const [showOriginalComparison, setShowOriginalComparison] = useState(false);

  // Tab sync
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load initial probe when opening
  useEffect(() => {
    if (!isOpen) return;

    // Reset states
    setSelectedCandidateUrl('');
    setAlgorithmResult(null);
    setAlgorithmError(null);
    setAlgoInputSource('current');

    // Initial probe
    if (effectiveUrl) {
      setIsProbing(true);
      probeHighResIcons(effectiveUrl, effectiveTitle, effectiveCurrentIcon)
        .then((list) => {
          setCandidates(list);
          if (list.length > 0) {
            setSelectedCandidateUrl(list[0].url);
          }
        })
        .catch(() => {})
        .finally(() => setIsProbing(false));
    }

    // Inspect original image
    if (effectiveCurrentIcon) {
      loadImageSafely(effectiveCurrentIcon)
        .then((img) => {
          setOriginalMeta({
            width: img.naturalWidth || img.width || 32,
            height: img.naturalHeight || img.height || 32,
          });
        })
        .catch(() => {
          setOriginalMeta({ width: 32, height: 32 });
        });
    }
  }, [isOpen, effectiveUrl, effectiveTitle, effectiveCurrentIcon]);

  // Run algorithm whenever intensity, resolution, or input source changes in algorithm tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'algorithm') return;
    const source = algoInputSource === 'current'
      ? (effectiveCurrentIcon || selectedCandidateUrl)
      : (selectedCandidateUrl || effectiveCurrentIcon);

    if (!source) return;

    let isMounted = true;
    setIsProcessingAlgorithm(true);
    setAlgorithmError(null);

    enhanceIconByAlgorithm(source, {
      intensity: algorithmIntensity,
      targetSize: targetResolution,
      boostContrast,
    })
      .then((res) => {
        if (isMounted) {
          setAlgorithmResult(res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAlgorithmError(err?.message || '算法处理失败');
          // 如果当前原图加载失败，但有候选高清源，自动切换至候选源
          if (algoInputSource === 'current' && candidates.length > 0 && selectedCandidateUrl) {
            setAlgoInputSource('candidate');
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsProcessingAlgorithm(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, algoInputSource, selectedCandidateUrl, effectiveCurrentIcon, algorithmIntensity, targetResolution, boostContrast, candidates.length]);

  if (!isOpen) return null;

  const currentPreviewUrl =
    activeTab === 'algorithm'
      ? (algorithmResult?.dataUrl || (algoInputSource === 'current' ? effectiveCurrentIcon : selectedCandidateUrl) || effectiveCurrentIcon)
      : (selectedCandidateUrl || effectiveCurrentIcon);

  const handleApply = () => {
    let finalUrl = activeTab === 'algorithm' && algorithmResult?.dataUrl
      ? algorithmResult.dataUrl
      : (selectedCandidateUrl || effectiveCurrentIcon || '');

    if (!finalUrl) {
      finalUrl = generateLetterIcon(effectiveTitle || effectiveUrl || 'Web');
    }

    if (finalUrl) {
      onApplyIcon(finalUrl);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                图标高清重构工作台
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  HD STUDIO
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-md">
                {effectiveTitle || '站点图标'} · {effectiveUrl}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setActiveTab('probe')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'probe'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>方案一：多源超清探针</span>
            {candidates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-brand-200/70 text-brand-800 dark:bg-brand-800 dark:text-brand-200 text-[10px]">
                {candidates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'algorithm'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>方案二：算法超分辨率与锐化</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
              AI 锐化
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top: Before & After Visual Comparison Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Box: Original Icon */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  原图标 (当前)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300">
                  {originalMeta ? `${originalMeta.width}×${originalMeta.height} px` : '低清'}
                </span>
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700/80 shadow-inner flex items-center justify-center p-3 relative overflow-hidden group">
                {effectiveCurrentIcon ? (
                  <img
                    src={effectiveCurrentIcon}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-bold">无原图</span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-zinc-500">
                放大展示时可能存在发虚、锯齿或小尺寸马赛克
              </p>
            </div>

            {/* Right Box: Enhanced / HD Target */}
            <div className="p-4 rounded-2xl bg-brand-50/40 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/60 flex flex-col items-center text-center relative overflow-hidden">
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black text-brand-700 dark:text-brand-300 uppercase tracking-wider">
                    {activeTab === 'algorithm' ? '算法高清重构效果' : '超清候选预览'}
                  </span>
                </div>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-brand-600 text-white shadow-xs">
                  {activeTab === 'algorithm'
                    ? `${targetResolution}×${targetResolution} px`
                    : (candidates.find((c) => c.url === selectedCandidateUrl)?.sizeLabel || '超清 256px')}
                </span>
              </div>

              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-brand-500/50 shadow-md flex items-center justify-center p-3 relative overflow-hidden">
                {isProcessingAlgorithm ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
                    <span className="text-[10px] font-bold text-brand-600">重构中...</span>
                  </div>
                ) : currentPreviewUrl ? (
                  <img
                    src={currentPreviewUrl}
                    alt="Enhanced Preview"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                  />
                ) : (
                  <span className="text-xs text-slate-400">请选择候选源</span>
                )}

                {algorithmResult && activeTab === 'algorithm' && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-brand-600 text-white text-[9px] font-black">
                    HD
                  </div>
                )}
              </div>

              <p className="mt-2 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                {activeTab === 'algorithm'
                  ? (algorithmResult?.qualityGain || '4× 超采样 + 卷积边缘锐化')
                  : '官方原画级清晰度，边缘锐利'}
              </p>
            </div>
          </div>

          {/* Bottom Area depending on Tab */}
          {activeTab === 'probe' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  已探测到的超高清原生候选源
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsProbing(true);
                    probeHighResIcons(effectiveUrl, effectiveTitle, effectiveCurrentIcon)
                      .then((l) => setCandidates(l))
                      .finally(() => setIsProbing(false));
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                  重新探测
                </button>
              </div>

              {isProbing ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800">
                  <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                    正在并发探针目标站点 256px 原图、Apple Touch 与矢量 SVG...
                  </p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-500">
                  未能探测到额外的外部超清源，推荐切换到【算法超分辨率与锐化】模式直接对现有图标增强！
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {candidates.map((c, idx) => {
                    const isSelected = selectedCandidateUrl === c.url;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCandidateUrl(c.url)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand-500 ring-2 ring-brand-500/20 dark:bg-brand-950/40 dark:border-brand-600'
                            : 'bg-white dark:bg-zinc-800/60 border-slate-200/70 dark:border-zinc-700/60 hover:border-brand-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-700 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={c.url}
                            alt={c.source}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 dark:text-zinc-100 truncate">
                              {c.source}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                              {c.badge}
                            </span>
                            {c.isVector && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                矢量无损
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Algorithm Control Panel */
            <div className="space-y-4 bg-slate-50 dark:bg-zinc-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  算法参数实时微调 (USM 卷积 + 阶梯超采样)
                </h3>
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  当前锐化系数: {algorithmIntensity.toFixed(2)}x
                </span>
              </div>

              {/* Input Source Selector */}
              {effectiveCurrentIcon && candidates.length > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/70 dark:border-zinc-700/70">
                  <span className="text-xs font-black text-slate-700 dark:text-zinc-300">
                    锐化输入源
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAlgoInputSource('current')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        algoInputSource === 'current'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      当前原图标
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlgoInputSource('candidate')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        algoInputSource === 'candidate'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      超清候选图 ({candidates[0]?.sizeLabel || '256px'})
                    </button>
                  </div>
                </div>
              )}

              {/* Intensity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                  <span>温和 (0.35x)</span>
                  <span className="text-brand-600 dark:text-brand-400">推荐标准 (0.65x)</span>
                  <span>强效锐化 (0.95x)</span>
                  <span>极致高频 (1.25x)</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.4"
                  step="0.05"
                  value={algorithmIntensity}
                  onChange={(e) => setAlgorithmIntensity(parseFloat(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Target Resolution Options */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                <span className="text-xs font-black text-slate-700 dark:text-zinc-300">
                  超分辨率目标输出尺寸
                </span>
                <div className="flex items-center gap-2">
                  {[128, 256].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setTargetResolution(res)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                        targetResolution === res
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {res}×{res} HD
                    </button>
                  ))}
                </div>
              </div>

              {/* Micro Contrast & Vibrance Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-zinc-300 block">
                    边缘微反差与色彩通透度增强
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    消除模糊发白，增强色彩纯度并保护透明边缘
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBoostContrast(!boostContrast)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    boostContrast ? 'bg-brand-600' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      boostContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {algorithmError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{algorithmError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:block">
            {activeTab === 'probe'
              ? `已选中: ${candidates.find((c) => c.url === selectedCandidateUrl)?.source || '默认方案'}`
              : '应用后将以无损高清 PNG 格式保存'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>确认应用此高清图标</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
