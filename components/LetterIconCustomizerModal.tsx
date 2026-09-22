import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, RefreshCw, Palette, Type, Sliders, ChevronDown } from 'lucide-react';
import {
  generateLetterIcon,
  extractBrandInitials,
  MODERN_GRADIENT_PALETTES,
  LetterIconOptions,
} from '../services/highResIconService';

export interface LetterIconCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialUrl?: string;
  initialBgColor?: string;
  onApply: (iconDataUrl: string, bgColor?: string) => void;
}

// 精选纯色底色库（供用户一键快速挑选背景底色）
const PRESET_BG_COLORS = [
  { name: 'Indigo 经典紫蓝', from: '#4f46e5', to: '#7c3aed' },
  { name: 'Blue 科技深蓝', from: '#0284c7', to: '#2563eb' },
  { name: 'Emerald 活力翡翠', from: '#059669', to: '#10b981' },
  { name: 'Amber 暖光流金', from: '#d97706', to: '#f59e0b' },
  { name: 'Rose 雅致玫粉', from: '#e11d48', to: '#f43f5e' },
  { name: 'Purple 幻彩极光', from: '#9333ea', to: '#c026d3' },
  { name: 'Teal 清透薄荷', from: '#0d9488', to: '#06b6d4' },
  { name: 'Orange 耀阳暖橙', from: '#ea580c', to: '#fb923c' },
  { name: 'Slate 玄墨质感', from: '#334155', to: '#0f172a' },
  { name: 'Onyx 纯黑夜空', from: '#18181b', to: '#09090b' },
  { name: 'Coral 活力珊瑚', from: '#f43f5e', to: '#fb7185' },
  { name: 'Lime 清新亮绿', from: '#65a30d', to: '#84cc16' },
  { name: 'Cyan 碧蓝晴空', from: '#0891b2', to: '#06b6d4' },
  { name: 'Plum 奢华黑曜梅', from: '#701a75', to: '#4a044e' },
  { name: 'Pure White 纯白高级', from: '#ffffff', to: '#f1f5f9', text: '#0f172a' },
];

export const LetterIconCustomizerModal: React.FC<LetterIconCustomizerModalProps> = ({
  isOpen,
  onClose,
  initialTitle = '',
  initialUrl = '',
  initialBgColor = '',
  onApply,
}) => {
  const [titleOrText, setTitleOrText] = useState(initialTitle || initialUrl || 'Nav');
  const [customLetters, setCustomLetters] = useState('');
  
  // 背景模式：gradient(现代高级微渐变) 或 solid(纯色背景)
  const [bgMode, setBgMode] = useState<'gradient' | 'solid'>('gradient');
  const [solidColor, setSolidColor] = useState(initialBgColor || '#4f46e5');
  const [gradientIndex, setGradientIndex] = useState(0);
  const [customGradientFrom, setCustomGradientFrom] = useState('#4f46e5');
  const [customGradientTo, setCustomGradientTo] = useState('#7c3aed');
  
  // 文字颜色与大小缩放微调 (75% ~ 150%) 与 垂直对齐微调 (-24 ~ +24)
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontScale, setFontScale] = useState(1.0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
  // 字标形状预览形态切换（纯圆形、超椭圆、直角方）
  const [previewShape, setPreviewShape] = useState<'rounded' | 'circle' | 'square'>('rounded');

  // 初始化当弹窗打开时
  React.useEffect(() => {
    if (isOpen) {
      const fallbackText = initialTitle || initialUrl || 'Nav';
      setTitleOrText(fallbackText);
      const autoInitials = extractBrandInitials(fallbackText);
      setCustomLetters(autoInitials);
      setVerticalOffset(0);

      if (initialBgColor && /^#[0-9A-F]{6}$/i.test(initialBgColor)) {
        setBgMode('solid');
        setSolidColor(initialBgColor);
      } else {
        setBgMode('gradient');
        setSolidColor('#4f46e5');
      }
    }
  }, [isOpen, initialTitle, initialUrl, initialBgColor]);

  // 计算当前最终展示的字母
  const activeLetters = (customLetters.trim() || extractBrandInitials(titleOrText) || 'W').toUpperCase();

  // 生成实时图标 SVG Data URI
  const generatedIconDataUrl = useMemo(() => {
    const opts: LetterIconOptions = {
      size: 256,
      rounded: 'none', // 全画幅铺满，依靠外层容器圆角裁切
      customLetters: activeLetters,
      fontScale,
      verticalOffset,
      textColor,
    };

    if (bgMode === 'solid') {
      opts.background = solidColor;
      opts.backgroundTo = solidColor;
    } else {
      opts.background = customGradientFrom;
      opts.backgroundTo = customGradientTo;
    }

    return generateLetterIcon(titleOrText, opts);
  }, [titleOrText, activeLetters, fontScale, verticalOffset, textColor, bgMode, solidColor, customGradientFrom, customGradientTo]);

  if (!isOpen) return null;

  const handleSelectPresetPalette = (p: typeof PRESET_BG_COLORS[0], idx: number) => {
    setGradientIndex(idx);
    setCustomGradientFrom(p.from);
    setCustomGradientTo(p.to);
    if (p.text) {
      setTextColor(p.text);
    } else {
      setTextColor('#ffffff');
    }
  };

  const handleApplyIcon = () => {
    const finalBgColor = bgMode === 'solid' ? solidColor : customGradientFrom;
    onApply(generatedIconDataUrl, finalBgColor);
    onClose();
  };

  const getShapeClass = (s: string) => {
    switch (s) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-none';
      case 'rounded': return 'rounded-[38%]';
      default: return 'rounded-2xl';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                极简字母图标定制工坊
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  PERFECT CENTER
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-md">
                100% 绝对正中心对齐 · 自由调色与缩放 · 适配各种形状
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Live Preview Panel */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                实机多尺寸渲染效果
              </span>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setPreviewShape('rounded')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    previewShape === 'rounded' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  超椭圆
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewShape('circle')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    previewShape === 'circle' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  正圆
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewShape('square')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    previewShape === 'square' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  方角
                </button>
              </div>
            </div>

            {/* Icons Display Row */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 my-2">
              {/* Large 64px */}
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className={`w-16 h-16 sm:w-20 sm:h-20 ${getShapeClass(previewShape)} overflow-hidden shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all relative`}
                >
                  <img src={generatedIconDataUrl} alt="Preview" className="w-full h-full object-cover select-none" />
                  {showGuidelines && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-red-500 -translate-y-1/2" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-red-500 -translate-x-1/2" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400">大尺寸卡片</span>
              </div>

              {/* Medium 48px */}
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className={`w-12 h-12 ${getShapeClass(previewShape)} overflow-hidden shadow-md border border-black/5 dark:border-white/10 flex items-center justify-center transition-all relative`}
                >
                  <img src={generatedIconDataUrl} alt="Preview" className="w-full h-full object-cover select-none" />
                  {showGuidelines && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-red-500 -translate-y-1/2" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-red-500 -translate-x-1/2" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400">标准导航</span>
              </div>

              {/* Small 32px */}
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className={`w-8 h-8 ${getShapeClass(previewShape)} overflow-hidden shadow-sm border border-black/5 dark:border-white/10 flex items-center justify-center transition-all relative`}
                >
                  <img src={generatedIconDataUrl} alt="Preview" className="w-full h-full object-cover select-none" />
                  {showGuidelines && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-red-500 -translate-y-1/2" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-red-500 -translate-x-1/2" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400">侧栏/微标</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ 光学物理双重居中校准：已补偿 Latin 字体基线天然下沉量，实现完美垂直正中
              </span>
              <button
                type="button"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  showGuidelines 
                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' 
                    : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-700'
                }`}
              >
                {showGuidelines ? '隐藏对齐十字线' : '显示对齐十字线'}
              </button>
            </div>
          </div>

          {/* Section 1: Letter Text, Font Size & Vertical Centering */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Type className="w-4 h-4 text-violet-500" />
              字母内容、字号比例与居中校准
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  字标字符 (支持 1~2 位英文字母、数字或汉字)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={customLetters}
                  onChange={(e) => setCustomLetters(e.target.value.toUpperCase())}
                  placeholder="例如: G, YT, B, 智"
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                    字符大小比例
                  </label>
                  <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                    {Math.round(fontScale * 100)}% {fontScale >= 1.2 ? '(超大)' : fontScale >= 1.0 ? '(饱满标配)' : '(精巧)'}
                  </span>
                </div>
                <div className="pt-2">
                  <input
                    type="range"
                    min="0.75"
                    max="1.50"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>精巧 (75%)</span>
                    <span>饱满标配 (100%)</span>
                    <span>特大显眼 (150%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Centering Fine-tuning Slider */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                    垂直居中 / 上下微调
                  </label>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200">
                    {verticalOffset === 0 ? '🎯 光学正中 (推荐)' : verticalOffset < 0 ? `向上抬升 ${Math.abs(verticalOffset)}px` : `向下微移 ${verticalOffset}px`}
                  </span>
                </div>
                {verticalOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(0)}
                    className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    恢复默认正中
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">向上</span>
                <input
                  type="range"
                  min="-24"
                  max="24"
                  step="1"
                  value={verticalOffset}
                  onChange={(e) => setVerticalOffset(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400 shrink-0">向下</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                默认已施加精准向上补偿消除字体下沉；若在某些特殊字体或屏幕下仍有视觉偏差，可自由微调。
              </p>
            </div>
          </div>

          {/* Section 2: Background Colors */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                自由调整背景底色
              </h3>
              
              {/* Background Mode Toggle */}
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setBgMode('gradient')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    bgMode === 'gradient' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  现代微渐变
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('solid')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    bgMode === 'solid' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  纯色单色
                </button>
              </div>
            </div>

            {/* Mode 1: Preset Palettes */}
            {bgMode === 'gradient' ? (
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                  选择精选高质感渐变配色：
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {PRESET_BG_COLORS.map((p, idx) => {
                    const isSelected = customGradientFrom === p.from && customGradientTo === p.to;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPresetPalette(p, idx)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center group ${
                          isSelected
                            ? 'border-violet-600 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-950/30'
                            : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-violet-300'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded-lg shadow-inner flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
                          }}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 truncate w-full">
                          {p.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Gradient Hex Inputs */}
                <div className="pt-2 flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">渐变始:</span>
                    <input
                      type="color"
                      value={customGradientFrom}
                      onChange={(e) => setCustomGradientFrom(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={customGradientFrom}
                      onChange={(e) => setCustomGradientFrom(e.target.value)}
                      className="w-24 px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold dark:text-white"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">渐变终:</span>
                    <input
                      type="color"
                      value={customGradientTo}
                      onChange={(e) => setCustomGradientTo(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={customGradientTo}
                      onChange={(e) => setCustomGradientTo(e.target.value)}
                      className="w-24 px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Solid Background */
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                  选择或自定义纯色底色：
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-sm shrink-0">
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => setSolidColor(e.target.value)}
                      className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 cursor-pointer border-0"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">#</span>
                    <input
                      type="text"
                      value={solidColor.replace(/^#/, '')}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/#/g, '');
                        setSolidColor(clean ? `#${clean}` : '#000000');
                      }}
                      placeholder="4F46E5"
                      className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold dark:text-white uppercase"
                    />
                  </div>
                </div>

                {/* Quick Solid Swatches */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {['#4f46e5', '#2563eb', '#059669', '#d97706', '#dc2626', '#9333ea', '#0d9488', '#ea580c', '#18181b', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSolidColor(c)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 ${
                        solidColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-violet-500 border-white' : 'border-slate-200 dark:border-zinc-700'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {solidColor.toLowerCase() === c.toLowerCase() && (
                        <Check className={`w-3.5 h-3.5 ${c === '#ffffff' ? 'text-black' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text Color Setting */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                字母文字颜色：
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTextColor('#ffffff')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    textColor === '#ffffff'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200'
                  }`}
                >
                  白色
                </button>
                <button
                  type="button"
                  onClick={() => setTextColor('#0f172a')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    textColor === '#0f172a'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200'
                  }`}
                >
                  黑色
                </button>
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer p-0"
                  />
                  <span className="text-[11px] font-mono text-slate-400 font-bold">{textColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            取消
          </button>
          
          <button
            type="button"
            onClick={handleApplyIcon}
            className="px-6 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 shadow-md shadow-violet-500/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            应用此极简字母图标
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
