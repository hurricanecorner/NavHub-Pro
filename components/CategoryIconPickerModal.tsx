import React, { useState, useMemo, useRef } from 'react';
import {
  X, Check, Search, Upload, Sparkles, Image as ImageIcon,
  RotateCcw, Sliders, CheckCircle2, ArrowRight
} from 'lucide-react';
import {
  CATEGORY_ICON_LIBRARY,
  CATEGORY_ICON_GROUPS,
  resolveCategoryIcon,
  getCategoryIconDef,
  CategoryIconDef
} from '../services/categoryIconService';
import { normalizeIconForDisplay } from '../services/highResIconService';

interface CategoryIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  subCategoryNames?: string[];
  currentIcon?: string;
  onApplyIcon: (iconValue: string) => void;
}

export const CategoryIconPickerModal: React.FC<CategoryIconPickerModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  subCategoryNames = [],
  currentIcon = '',
  onApplyIcon
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [selectedIcon, setSelectedIcon] = useState<string>(currentIcon);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 计算智能推荐的图标
  const autoAssigned = useMemo(() => {
    return resolveCategoryIcon({
      name: categoryName,
      icon: '',
      subCategories: subCategoryNames.map(name => ({ name }))
    });
  }, [categoryName, subCategoryNames]);

  // 计算当前选中的图标解析结果
  const resolvedCurrent = useMemo(() => {
    return resolveCategoryIcon({
      name: categoryName,
      icon: selectedIcon,
      subCategories: subCategoryNames.map(name => ({ name }))
    });
  }, [categoryName, selectedIcon, subCategoryNames]);

  // 图标库过滤列表
  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^#+/, '');
    return CATEGORY_ICON_LIBRARY.filter(def => {
      // 分组过滤
      if (selectedGroup !== 'all' && def.group !== selectedGroup) {
        return false;
      }
      // 搜索过滤
      if (query) {
        const matchesCode = def.code.toLowerCase().includes(query);
        const matchesName = def.name.toLowerCase().includes(query);
        const matchesKeywords = def.keywords.some(kw => kw.toLowerCase().includes(query));
        return matchesCode || matchesName || matchesKeywords;
      }
      return true;
    });
  }, [searchQuery, selectedGroup]);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('请选择有效的图片文件（支持 PNG, SVG, JPG, WebP）');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedIcon(result);
        setCustomUrlInput('');
      }
    };
    reader.onerror = () => {
      setUploadError('读取图片失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setSelectedIcon(trimmed);
  };

  const handleSave = () => {
    onApplyIcon(selectedIcon);
    onClose();
  };

  const isCurrentAuto = !selectedIcon || selectedIcon === '';

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={onClose} />

      <div className="bg-white dark:bg-zinc-800 rounded-[2rem] w-full max-w-2xl relative z-[180] border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <span>分类图标配置</span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md">
                  {categoryName || '新建分类'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                根据分类名称智能分配专属编码图标，也可从图标库自选或上传图片
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Icon Status Bar */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              {resolvedCurrent.type === 'custom' && resolvedCurrent.imageUrl ? (
                <img
                  src={normalizeIconForDisplay(resolvedCurrent.imageUrl)}
                  alt=""
                  className="w-6 h-6 object-contain"
                />
              ) : resolvedCurrent.component ? (
                <resolvedCurrent.component className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              ) : null}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700 dark:text-zinc-200">
                  {resolvedCurrent.name}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/40">
                  #{resolvedCurrent.code}
                </span>
                {isCurrentAuto && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    系统智能推荐
                  </span>
                )}
                {!isCurrentAuto && resolvedCurrent.type === 'custom' && (
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-200/60 dark:border-purple-800/40">
                    自定义图片
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                {isCurrentAuto
                  ? `已根据分类「${categoryName || '当前'}」的内容特征自动匹配`
                  : '已配置自定义图标'}
              </span>
            </div>
          </div>

          {!isCurrentAuto && (
            <button
              type="button"
              onClick={() => setSelectedIcon('')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 hover:border-brand-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="清除自定义设置，恢复系统自动根据分类名分配图标"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复智能推荐 (#{autoAssigned.code})
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-slate-100 dark:bg-zinc-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>从图标库选用 ({CATEGORY_ICON_LIBRARY.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>上传自定义图标</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search & Groups */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="按名称、编码（如 #code, #cpu）或关键词搜索图标..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-700/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-brand-500 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Group Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORY_ICON_GROUPS.map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedGroup(grp.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedGroup === grp.id
                          ? 'bg-brand-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-zinc-700/50 text-slate-500 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      {grp.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icons Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {filteredIcons.map(def => {
                  const IconComp = def.component;
                  const isSelected = selectedIcon === def.code || (!selectedIcon && autoAssigned.code === def.code);
                  const isAuto = autoAssigned.code === def.code;

                  return (
                    <button
                      key={def.code}
                      type="button"
                      onClick={() => setSelectedIcon(def.code)}
                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 relative group cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-brand-50/90 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20 shadow-xs'
                          : 'bg-white dark:bg-zinc-800 border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-zinc-300 hover:border-brand-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                      }`}
                      title={`${def.name} (#${def.code})`}
                    >
                      {isAuto && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded-full border border-amber-200/60">
                          推荐
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-1">
                        <IconComp className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 truncate max-w-full">
                        #{def.code}
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 truncate max-w-full text-center">
                        {def.name.split('/')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredIcons.length === 0 && (
                <div className="py-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
                  <p className="text-xs font-bold">没有匹配的图标</p>
                  <p className="text-[11px]">请尝试其他关键词或搜索编码</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-5">
              {/* File Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-brand-500 dark:hover:border-brand-400 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/60 dark:bg-zinc-900/30 hover:bg-brand-50/20 transition-all cursor-pointer group text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    点击选择图片，或将图片拖放至此处
                  </p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                    支持 SVG, PNG, JPG, WebP 格式（建议正方形无白边透明底，小于 2MB）
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold">
                  {uploadError}
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                  或者输入外部图片直链 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/icon.svg"
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-700/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-brand-500 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95"
                  >
                    应用链接
                  </button>
                </div>
              </div>

              {/* Preview if custom image selected */}
              {selectedIcon && (selectedIcon.startsWith('data:') || selectedIcon.startsWith('http')) && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1.5 shadow-2xs overflow-hidden">
                      <img
                        src={normalizeIconForDisplay(selectedIcon)}
                        alt="Custom Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-200">已载入自定义图标</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-xs">
                        {selectedIcon.startsWith('data:') ? '本地上传图片 (Base64)' : selectedIcon}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIcon('')}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    移除图片
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>保存图标</span>
          </button>
        </div>
      </div>
    </div>
  );
};
