
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, PlusCircle, Upload, Edit2, Trash2, Folder, ListPlus, Download, Cloud, Settings, Wand2, Loader2, Image as ImageIcon, Globe, Tag, ExternalLink, ChevronDown, CheckCircle2, Cpu, Hash, Search, Save, Check, MousePointer2, Apple, Chrome, Play, LayoutGrid, Palette, Send } from 'lucide-react';
import { AppData, Category, LinkItem, CloudConfig, SiteConfig, SubCategory, Theme } from '../types';
import { ToastType } from './Toast';
import { COLOR_PALETTES } from '../App';
import { publishToNotion, uploadToCloud, downloadFromCloud } from '../services/storageUtils';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  cloudConfig: CloudConfig;
  onUpdateCloudConfig: (config: CloudConfig) => void;
  onSyncUpload: (config?: CloudConfig) => void;
  onSyncDownload: (config?: CloudConfig) => void;
  isSyncing: boolean;
  editingItem: LinkItem | null;
  initialValues?: { categoryId: string; subCategoryId: string } | null;
  t: any;
  showToast: (type: ToastType, message: string) => void;
  confirmAction: (title: string, message: string, onConfirm: () => void, isDangerous?: boolean) => void;
  theme: Theme;
}

type Tab = 'link' | 'category' | 'tags' | 'cloud' | 'data' | 'settings';
type LinkMode = 'single' | 'bulk' | 'icons';

interface BulkIconUpload {
  id: string;
  preview: string;
  assignedId: string | null;
}

interface MetaResult {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
}

const compressImage = async (input: string, maxWidth: number = 128, quality = 0.8): Promise<string> => {
  let src = input;
  if (!input) return '';
  if (input.startsWith('http')) {
    try {
      const res = await fetch(input);
      const blob = await res.blob() as any;
      src = URL.createObjectURL(blob as Blob);
    } catch (e) { return input; }
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
      else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(input);
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/webp', quality);
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      resolve(compressed);
    };
    img.onerror = () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); resolve(input); };
  });
};

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, onClose, data, onUpdateData, cloudConfig, onUpdateCloudConfig, onSyncUpload, onSyncDownload, isSyncing, editingItem, initialValues, t, showToast, confirmAction, theme
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({ title: '', url: '', description: '', categoryId: '', subCategoryId: '', iconUrl: '', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState(''); 
  const [linkBulkIcons, setLinkBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedBulkIconId, setSelectedBulkIconId] = useState<string | null>(null);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ id: null, name: '', icon: '' });
  const [subCatEditingId, setSubCatEditingId] = useState<string | null>(null);
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({ parentId: '', id: null, name: '' });
  const [siteForm, setSiteForm] = useState<SiteConfig>({ title: '', logoUrl: '', faviconUrl: '', backgroundUrl: '', linkColumns: 4, themeColor: 'indigo' });
  const [localCloud, setLocalCloud] = useState<CloudConfig>(cloudConfig);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [renamingTag, setRenamingTag] = useState<{ old: string; new: string } | null>(null);

  const globalTags = useMemo(() => {
    const counts: Record<string, number> = {};
    data.links.forEach(l => { (l.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [data.links]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) { setLinkForm({ ...editingItem, tags: editingItem.tags || [] }); setLinkMode('single'); }
      else if (initialValues) { setLinkForm({ title: '', url: '', description: '', iconUrl: '', tags: [], categoryId: initialValues.categoryId, subCategoryId: initialValues.subCategoryId }); setLinkMode('single'); }
      else { setLinkForm({ title: '', url: '', description: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', tags: [] }); }
      setLocalCloud(cloudConfig);
      setSiteForm({ 
        title: data.siteConfig?.title || t.app.title, 
        logoUrl: data.siteConfig?.logoUrl || '', 
        faviconUrl: data.siteConfig?.faviconUrl || '', 
        backgroundUrl: data.siteConfig?.backgroundUrl || '',
        linkColumns: data.siteConfig?.linkColumns || 4,
        themeColor: data.siteConfig?.themeColor || 'indigo'
      });
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig, t]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, compress: boolean, callback: (res: string) => void) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 1024 * 1024) { showToast('error', t.app.imageTooLarge); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async (ev) => { 
      const res = ev.target?.result as string; 
      if (res) {
        const finalRes = compress ? await compressImage(res) : await compressImage(res, 1920, 0.7);
        callback(finalRes); 
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !linkForm.tags?.includes(tag)) {
      setLinkForm({ ...linkForm, tags: [...(linkForm.tags || []), tag] });
      setTagInput('');
    }
  };

  const handleFetchMetadata = async () => {
    const rawUrl = linkForm.url?.trim(); if (!rawUrl) return;
    let targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    setLinkForm(prev => ({ ...prev, url: targetUrl }));
    setIsFetchingMeta(true);
    try {
      const query = new URL(targetUrl).hostname.split('.').filter(p => p !== 'www')[0];
      const tasks = [
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=cn&entity=software&limit=1`).then(r => r.json()).then(async d => d.results?.[0] ? { title: d.results[0].trackName, description: d.results[0].description?.split('\n')[0], iconUrl: await compressImage(d.results[0].artworkUrl100) } : null).catch(() => null),
        fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`).then(r => r.json()).then(async d => (d.status === 'success' && d.data.title) ? { title: d.data.title, description: d.data.description || '', iconUrl: d.data.logo?.url ? await compressImage(d.data.logo.url) : '' } : null).catch(() => null)
      ];
      const res = (await Promise.all(tasks)).filter(r => r !== null) as MetaResult[];
      if (res.length === 0) showToast('error', t.admin.link.meta.error);
      else {
        const f = res[0];
        setLinkForm(prev => ({ ...prev, title: f.title, description: f.description, iconUrl: f.iconUrl }));
        showToast('success', t.admin.link.meta.success);
      }
    } catch (e) { showToast('error', t.admin.link.meta.error); } finally { setIsFetchingMeta(false); }
  };

  const handleSaveLink = () => {
    if (!linkForm.title?.trim() || !linkForm.url?.trim()) { showToast('error', 'Required fields empty'); return; }
    const newItem: LinkItem = {
      id: linkForm.id || `l-${Date.now()}`,
      title: linkForm.title.trim(),
      url: linkForm.url.trim(),
      description: linkForm.description?.trim() || '',
      iconUrl: linkForm.iconUrl || '',
      categoryId: linkForm.categoryId || data.categories[0]?.id || '',
      subCategoryId: linkForm.subCategoryId || '',
      tags: linkForm.tags || []
    };
    const newLinks = linkForm.id ? data.links.map(l => l.id === linkForm.id ? newItem : l) : [...data.links, newItem];
    onUpdateData({ ...data, links: newLinks });
    showToast('success', t.app.saved);
    if (!linkForm.id) { setLinkForm({ title: '', url: '', description: '', categoryId: linkForm.categoryId, subCategoryId: linkForm.subCategoryId, iconUrl: '', tags: [] }); setTagInput(''); }
    else onClose();
  };

  const handlePublishNotion = async () => {
    if (!localCloud.notionToken || !localCloud.notionPageId) { showToast('error', t.app.missingNotionConfig); return; }
    setIsPublishing(true);
    try {
      const res = await publishToNotion(data, localCloud);
      showToast(res.success ? 'success' : 'error', res.message);
    } catch (e: any) { showToast('error', e.message || 'Publish failed'); } finally { setIsPublishing(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-zinc-800 w-full h-full lg:max-w-[1250px] lg:h-[92vh] lg:rounded-[2rem] flex flex-col lg:flex-row overflow-hidden border border-slate-200 dark:border-white/5 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-[280px] bg-slate-50 dark:bg-zinc-900/50 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0">
          <div className="p-6 lg:p-10 flex items-center gap-4">
            <div className="p-2 lg:p-3 bg-brand-600 rounded-xl shadow-lg shadow-brand-100"><LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6 text-white" /></div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight leading-none">{t.admin.title}</h2>
          </div>
          <div className="flex-1 flex lg:flex-col overflow-x-auto lg:overflow-y-auto px-4 lg:px-4 space-x-2 lg:space-x-0 lg:space-y-1 custom-scrollbar pb-4 lg:pb-0">
            {(Object.keys(t.admin.tabs) as Tab[]).map((tabId) => {
              const iconsMap: Record<Tab, React.ReactNode> = {
                link: <PlusCircle className="w-5 h-5" />, category: <Folder className="w-5 h-5" />, tags: <Hash className="w-5 h-5" />,
                cloud: <Cloud className="w-5 h-5" />, data: <Download className="w-5 h-5" />, settings: <Settings className="w-5 h-5" />,
              };
              return (
                <button key={tabId} onClick={() => setActiveTab(tabId)} className={`flex items-center gap-3 px-5 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm font-bold rounded-xl transition-all shrink-0 whitespace-nowrap ${activeTab === tabId ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50'}`}>
                  <span className="shrink-0">{iconsMap[tabId]}</span>
                  <span>{t.admin.tabs[tabId]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-800">
          <div className="h-16 lg:h-20 flex items-center justify-between px-6 lg:px-12 shrink-0 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">{t.admin.tabs[activeTab]}</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 pt-6 lg:pt-8 custom-scrollbar">
            {activeTab === 'link' && (
              <div className="max-w-4xl space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-zinc-900/50 rounded-2xl w-full lg:w-fit border border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar">
                  {(['single', 'bulk', 'icons'] as const).map(m => (
                    <button key={m} onClick={() => setLinkMode(m)} className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${linkMode === m ? 'bg-white dark:bg-zinc-100 text-brand-600 dark:text-brand-600 shadow-lg border border-slate-200 dark:border-transparent' : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-800'}`}>{t.admin.link.modes[m]}</button>
                  ))}
                </div>

                {linkMode === 'single' && (
                  <div className="space-y-8 lg:space-y-10 max-w-3xl">
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.url} <span className="text-red-500">*</span></label>
                      <div className="flex gap-4">
                        <input type="text" value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} className="flex-1 px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 transition-colors font-medium text-base lg:text-lg dark:text-white" placeholder="https://example.com" />
                        <button onClick={handleFetchMetadata} disabled={isFetchingMeta} className="w-14 lg:w-20 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-colors shrink-0 flex items-center justify-center disabled:bg-brand-400">{isFetchingMeta ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" /> : <Wand2 className="w-5 h-5 lg:w-6 lg:h-6" />}</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.title} <span className="text-red-500">*</span></label>
                      <input type="text" value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base lg:text-lg focus:border-brand-500 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base lg:text-lg appearance-none cursor-pointer focus:border-brand-500 dark:text-white">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-base lg:text-lg appearance-none cursor-pointer focus:border-brand-500 dark:text-white"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>
                    
                    {/* 标签库还原 - 匹配图1 */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.tags}</label>
                      <div className="space-y-4">
                        <div className="w-full min-h-[80px] px-6 py-5 bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-[1.5rem] flex flex-wrap gap-2">
                           {linkForm.tags && linkForm.tags.length > 0 ? linkForm.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-200 rounded-xl text-xs font-bold shadow-sm border border-slate-100 dark:border-transparent">
                                # {tag}
                                <button onClick={() => setLinkForm({ ...linkForm, tags: linkForm.tags?.filter(t => t !== tag) })} className="hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                              </span>
                            )) : <span className="text-slate-300 dark:text-zinc-500 text-sm italic py-2">尚未添加任何标签...</span>}
                        </div>
                        <div className="flex gap-3">
                          <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 px-6 py-4 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-[1rem] outline-none focus:border-brand-500 dark:text-white font-medium" placeholder={t.admin.link.tagsPlaceholder} />
                          <button onClick={handleAddTag} className="px-10 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-200 rounded-[1rem] font-bold hover:bg-slate-50 transition-colors shadow-sm">{t.admin.link.addTag}</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">{t.admin.link.description}</label>
                      <textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={3} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none resize-none font-medium text-base lg:text-lg dark:text-white" />
                    </div>
                    
                    <button onClick={handleSaveLink} className="w-full py-5 lg:py-6 bg-brand-600 text-white rounded-2xl font-black text-lg lg:text-xl hover:opacity-90 transition-all shadow-xl shadow-brand-100 dark:shadow-none uppercase tracking-widest">{t.admin.link.save}</button>
                  </div>
                )}
                
                {linkMode === 'bulk' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg appearance-none dark:text-white">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg appearance-none dark:text-white"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t.admin.link.bulk.defaultTitle}</label>
                      <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold text-lg dark:text-white" placeholder={t.admin.link.bulk.defaultTitlePlaceholder} />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t.admin.link.bulk.label}</label>
                      <textarea rows={10} value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} className="w-full px-5 py-5 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none resize-none font-mono text-sm dark:text-white" placeholder={t.admin.link.bulk.placeholder} />
                    </div>
                    <button onClick={() => {
                        const lines = bulkUrls.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        const newLinks: LinkItem[] = lines.map((url, i) => ({ id: `lbulk-${Date.now()}-${i}`, title: bulkDefaultTitle || url.replace(/^https?:\/\//, '').split('/')[0], url: url.startsWith('http') ? url : `https://${url}`, description: '', categoryId: linkForm.categoryId!, subCategoryId: linkForm.subCategoryId || '', tags: [] }));
                        onUpdateData({ ...data, links: [...data.links, ...newLinks] });
                        showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length.toString()));
                        setBulkUrls(''); setBulkDefaultTitle(''); onClose();
                    }} className="w-full py-5 lg:py-6 bg-brand-600 text-white rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-100 dark:shadow-none uppercase tracking-widest">{t.admin.link.bulk.import}</button>
                  </div>
                )}

                {linkMode === 'icons' && (
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 lg:h-[600px] animate-in fade-in duration-300">
                    <div className="w-full lg:w-1/3 flex flex-col gap-6">
                      <label className="h-40 lg:flex-1 cursor-pointer border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-700 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors group">
                        <Upload className="w-10 h-10 mb-2 text-slate-300 dark:text-zinc-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t.admin.link.icons.upload}</span>
                        <input type="file" multiple className="hidden" accept="image/*" onChange={e => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(f => {
                            const r = new FileReader();
                            r.onload = async (ev) => { const res = ev.target?.result as string; if (res) { const comp = await compressImage(res); setLinkBulkIcons(p => [...p, { id: `bi-${Date.now()}-${Math.random()}`, preview: comp, assignedId: null }]); } };
                            r.readAsDataURL(f as Blob);
                          });
                        }} />
                      </label>
                      <div className="h-40 lg:h-[300px] bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-3xl p-4 overflow-y-auto grid grid-cols-4 lg:grid-cols-3 gap-3 custom-scrollbar">
                        {linkBulkIcons.map(icon => (
                          <button key={icon.id} onClick={() => setSelectedBulkIconId(icon.id)} className={`aspect-square border-2 rounded-xl p-1.5 transition-colors ${selectedBulkIconId === icon.id ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40' : 'border-transparent bg-white dark:bg-zinc-600 hover:border-slate-300 dark:hover:border-white/10'}`}><img src={icon.preview} className="w-full h-full object-contain" /></button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-zinc-800 h-[400px] lg:h-full shadow-sm">
                      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-zinc-700/50">
                        <h5 className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-400 tracking-widest">{t.admin.link.icons.hint}</h5>
                        <button onClick={() => { 
                            const updatedLinks = data.links.map(l => { const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id); return assigned ? { ...l, iconUrl: assigned.preview } : l; });
                            onUpdateData({ ...data, links: updatedLinks }); showToast('success', t.app.success); setLinkBulkIcons([]); setSelectedBulkIconId(null); 
                        }} className="px-5 lg:px-8 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-bold hover:bg-brand-700 transition-colors uppercase tracking-widest">{t.admin.link.icons.apply}</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 lg:p-6 grid grid-cols-2 lg:grid-cols-2 gap-3 custom-scrollbar">
                        {data.links.map(l => {
                          const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id);
                          return (
                            <button key={l.id} onClick={() => selectedBulkIconId && setLinkBulkIcons(p => p.map(bi => bi.id === selectedBulkIconId ? { ...bi, assignedId: l.id } : (bi.assignedId === l.id ? { ...bi, assignedId: null } : bi)))} className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-700/30 border-2 rounded-2xl text-left transition-colors ${assigned ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'border-transparent hover:border-slate-200 dark:hover:border-white/5'}`}>
                              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0 bg-white dark:bg-zinc-700">{(assigned || l.iconUrl) ? <img src={assigned ? assigned.preview : l.iconUrl} className="w-full h-full object-cover" /> : <Globe className="w-5 h-5 text-slate-200 dark:text-zinc-600" />}</div>
                              <div className="min-w-0 font-bold truncate text-[11px] text-slate-700 dark:text-zinc-300 tracking-tight">{l.title}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="max-w-4xl space-y-10 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-2xl lg:text-3xl text-slate-800 dark:text-zinc-100 tracking-tight">{t.admin.tags.globalTitle}</h4>
                    <p className="text-sm text-slate-400 dark:text-zinc-400 font-medium">{t.admin.tags.globalDesc}</p>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className="w-full pl-11 pr-6 py-3 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold text-sm dark:text-white shadow-sm" placeholder={t.admin.tags.searchPlaceholder} />
                  </div>
                </div>
                <div className="bg-slate-50/50 dark:bg-zinc-700/20 border border-slate-200 dark:border-white/5 rounded-3xl p-6 lg:p-8 min-h-[500px]">
                  {globalTags.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                       {globalTags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tag => (
                          <div key={tag.name} className="p-4 lg:p-6 bg-white dark:bg-zinc-700/60 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg"><Hash className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
                                <div className="flex flex-col">
                                   <span className="font-bold text-base text-slate-700 dark:text-zinc-100">{tag.name}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tag.count} {t.admin.tags.count.split(' ')[1]}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setRenamingTag({ old: tag.name, new: tag.name })} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-600 text-brand-600 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => confirmAction(t.admin.tags.deleteTitle, t.admin.tags.deleteMessage.replace('{tag}', tag.name), () => onUpdateData({ ...data, links: data.links.map(l => ({ ...l, tags: l.tags?.filter(t => t !== tag.name) })) }), true)} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-600 text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="flex flex-col h-[400px] items-center justify-center text-slate-300 dark:text-zinc-600 font-bold text-xl italic gap-4">
                      <Hash className="w-16 h-16 opacity-20" />
                      {t.admin.tags.empty}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cloud' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in pt-4">
                <div className="bg-white dark:bg-zinc-700 p-8 lg:p-10 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-100/50 dark:shadow-none">
                  <div className="flex items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">{t.admin.cloud.enable}</h4>
                      <p className="text-xs text-slate-400 dark:text-zinc-400 font-medium">{t.admin.cloud.desc}</p>
                    </div>
                    <button onClick={() => setLocalCloud({ ...localCloud, enabled: !localCloud.enabled })} className={`w-14 h-7 shrink-0 rounded-full transition-colors relative ${localCloud.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-zinc-600'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localCloud.enabled ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['github', 'notion', 'webdav'] as const).map(p => (
                    <button key={p} onClick={() => setLocalCloud({ ...localCloud, activeProvider: p })} className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${localCloud.activeProvider === p ? 'bg-white dark:bg-zinc-100 text-brand-600 dark:text-brand-600 border-brand-600 shadow-lg' : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-zinc-700/50 text-slate-400 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}>{p}</button>
                  ))}
                </div>
                <div className="space-y-6 pt-6">
                    {localCloud.activeProvider === 'github' && (
                        <div className="space-y-4">
                            <input type="password" value={localCloud.githubToken} onChange={e => setLocalCloud({ ...localCloud, githubToken: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.github.token} />
                            <input type="text" value={localCloud.gistId} onChange={e => setLocalCloud({ ...localCloud, gistId: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.github.gistId} />
                        </div>
                    )}
                    {localCloud.activeProvider === 'notion' && (
                        <div className="space-y-4">
                            <input type="password" value={localCloud.notionToken} onChange={e => setLocalCloud({ ...localCloud, notionToken: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.notion.token} />
                            <input type="text" value={localCloud.notionPageId} onChange={e => setLocalCloud({ ...localCloud, notionPageId: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.notion.pageId} />
                            <input type="text" value={localCloud.notionApiUrl} onChange={e => setLocalCloud({ ...localCloud, notionApiUrl: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.notion.proxy} />
                            <div className="p-4 bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/5 rounded-2xl">
                              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">{t.admin.cloud.notion.proxyHelp}</p>
                            </div>
                            <button onClick={handlePublishNotion} disabled={isPublishing} className="w-full py-4 border-2 border-dashed border-brand-200 text-brand-600 rounded-2xl text-xs font-bold hover:bg-brand-50 transition-colors flex items-center justify-center gap-2">
                               {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                               {t.admin.cloud.notion.publish}
                            </button>
                        </div>
                    )}
                    {localCloud.activeProvider === 'webdav' && (
                        <div className="space-y-4">
                            <input type="text" value={localCloud.webdavUrl} onChange={e => setLocalCloud({ ...localCloud, webdavUrl: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.webdav.url} />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={localCloud.webdavUsername} onChange={e => setLocalCloud({ ...localCloud, webdavUsername: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.webdav.user} />
                                <input type="password" value={localCloud.webdavPassword} onChange={e => setLocalCloud({ ...localCloud, webdavPassword: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm shadow-sm" placeholder={t.admin.cloud.webdav.pass} />
                            </div>
                            <div className="p-4 bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/5 rounded-2xl">
                              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">{t.admin.cloud.webdav.help}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <button onClick={() => { onUpdateCloudConfig(localCloud); showToast('success', t.app.configSaved); }} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black tracking-widest hover:opacity-90 transition-all uppercase text-xs shadow-lg shadow-brand-100">{t.admin.cloud.saveConfig}</button>
                        <div className="flex gap-3">
                            <button onClick={() => onSyncUpload(localCloud)} disabled={isSyncing || !localCloud.enabled} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:bg-brand-300 transition-colors uppercase text-xs shadow-lg shadow-brand-100"><Upload className="w-4 h-4" /> {t.admin.cloud.upload}</button>
                            <button onClick={() => onSyncDownload(localCloud)} disabled={isSyncing || !localCloud.enabled} className="flex-1 py-4 bg-slate-100 dark:bg-zinc-700 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-zinc-200 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors uppercase text-xs"><Download className="w-4 h-4" /> {t.admin.cloud.download}</button>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 animate-in fade-in duration-300">
                <div className="p-8 lg:p-10 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/5 rounded-3xl text-center flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-6"><Download className="w-8 h-8 text-brand-600" /></div>
                  <h4 className="font-bold text-xl mb-3 text-slate-800 dark:text-zinc-100">{t.admin.data.exportTitle}</h4>
                  <p className="text-xs text-slate-400 dark:text-zinc-400 mb-8 font-medium">{t.admin.data.exportDesc}</p>
                  <button onClick={() => {
                      const dataStr = JSON.stringify(data, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'navhub-backup.json'; a.click();
                      URL.revokeObjectURL(url); showToast('success', 'Backup downloaded');
                  }} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-brand-100">{t.admin.data.exportBtn}</button>
                </div>
                <div className="p-8 lg:p-10 border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-700/50 rounded-3xl text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6"><Upload className="w-8 h-8 text-amber-500" /></div>
                  <h4 className="font-bold text-xl mb-3 text-slate-800 dark:text-zinc-100">{t.admin.data.importTitle}</h4>
                  <p className="text-xs text-slate-400 dark:text-zinc-400 mb-8 font-medium">{t.admin.data.importDesc}</p>
                  <label className="w-full py-4 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 rounded-2xl font-bold cursor-pointer text-base hover:bg-slate-100 transition-colors flex items-center justify-center shadow-sm">
                    {t.admin.data.importBtn}
                    <input type="file" className="hidden" accept=".json" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const imported = JSON.parse(ev.target?.result as string);
                                if (imported.categories && imported.links) {
                                    confirmAction(t.admin.data.importTitle, t.admin.data.confirm, () => { onUpdateData(imported); showToast('success', t.admin.data.success); });
                                } else { throw new Error(); }
                            } catch { showToast('error', t.admin.data.error); }
                        };
                        reader.readAsText(file);
                    }} />
                  </label>
                </div>
                <div className="lg:col-span-2">
                   <button onClick={() => showToast('info', 'Import action starting...')} className="w-full py-6 bg-brand-600 text-white rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-100 dark:shadow-none uppercase tracking-widest">{t.admin.data.importBtn.split(' ')[0]}导入</button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl space-y-12 animate-in fade-in duration-300 pb-12">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.settings.siteName}</label>
                  <input type="text" value={siteForm.title} onChange={e => setSiteForm({ ...siteForm, title: e.target.value })} className="w-full px-8 py-5 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl text-xl font-bold tracking-tight outline-none focus:border-brand-500 transition-all dark:text-white shadow-sm" placeholder={t.app.title} />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Palette className="w-3 h-3" /> 主题色方案 (THEME COLOR)</label>
                  <div className="p-8 lg:p-10 bg-slate-50/50 dark:bg-zinc-700/50 border border-slate-200 dark:border-white/5 rounded-3xl space-y-10">
                    <div className="grid grid-cols-4 lg:grid-cols-4 gap-6 lg:gap-8">
                      {Object.keys(COLOR_PALETTES).map(paletteName => (
                        <button key={paletteName} onClick={() => setSiteForm({ ...siteForm, themeColor: paletteName })} className={`group relative aspect-square rounded-2xl border-4 transition-all overflow-hidden ${siteForm.themeColor === paletteName ? 'border-brand-500 scale-105 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)]' : 'border-white dark:border-zinc-700 hover:border-brand-200'}`} title={paletteName}>
                          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                             <div style={{ backgroundColor: COLOR_PALETTES[paletteName][400] }}></div>
                             <div style={{ backgroundColor: COLOR_PALETTES[paletteName][600] }}></div>
                             <div style={{ backgroundColor: COLOR_PALETTES[paletteName][800] }}></div>
                             <div style={{ backgroundColor: COLOR_PALETTES[paletteName][500] }}></div>
                          </div>
                          {siteForm.themeColor === paletteName && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5"><Check className="w-8 h-8 lg:w-10 lg:h-10 text-white drop-shadow-md" /></div>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="pt-8 border-t border-slate-200 dark:border-white/5 text-center space-y-6">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">当前配色方案预览 (SHADES PREVIEW)</label>
                       <div className="flex justify-center h-12 w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-white/5">
                          {[100, 200, 400, 700, 950].map(shade => (
                             <div key={shade} className="flex-1" style={{ backgroundColor: COLOR_PALETTES[siteForm.themeColor || 'indigo'][shade] }}></div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                {/* 桌面端链接栏数 - 按照截图重构并适配主题色 */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.admin.settings.linkColumns}</label>
                  <div className="flex items-center gap-8 p-6 lg:p-10 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-100 dark:border-white/5 rounded-[2.5rem]">
                    <div className="flex-1 relative flex items-center h-12">
                      {/* 自定义滑动条背景渲染 - 适配主题色 (bg-brand-600) */}
                      <div className="absolute inset-0 flex items-center pointer-events-none">
                        <div className="w-full h-3 bg-white dark:bg-zinc-800 rounded-full border border-slate-200 dark:border-white/10 relative overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-brand-600" 
                            style={{ width: `${((siteForm.linkColumns || 1) - 1) / 9 * 100}%` }}
                          />
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="10" step="1" 
                        value={siteForm.linkColumns || 4} 
                        onChange={e => setSiteForm({ ...siteForm, linkColumns: parseInt(e.target.value) })} 
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" 
                      />
                      {/* 自定义滑块指示器 - 适配主题色 (bg-brand-600) */}
                      <div 
                        className="absolute w-6 h-6 bg-brand-600 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] pointer-events-none transition-all duration-75 border-2 border-white dark:border-zinc-300"
                        style={{ left: `calc(${((siteForm.linkColumns || 1) - 1) / 9 * 100}% - 12px)` }}
                      />
                    </div>
                    
                    <div className="px-6 py-4 bg-white dark:bg-zinc-800 rounded-[1.5rem] border border-slate-100 dark:border-white/10 font-black text-slate-700 dark:text-zinc-100 min-w-[110px] text-center shadow-sm">
                      <span className="text-2xl tabular-nums">{siteForm.linkColumns}</span> 
                      <span className="text-sm ml-1 text-slate-400">{t.admin.settings.columnsUnit}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {[
                    { key: 'logoUrl', label: t.admin.settings.logo, icon: ImageIcon },
                    { key: 'faviconUrl', label: t.admin.settings.favicon, icon: Globe },
                    { key: 'backgroundUrl', label: t.admin.settings.background, icon: LayoutGrid },
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                      <div className="flex gap-4">
                        <input type="text" value={(siteForm as any)[field.key] || ''} onChange={e => setSiteForm({ ...siteForm, [field.key]: e.target.value })} className="flex-1 px-6 py-4 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-brand-500 transition-all font-medium text-sm dark:text-white shadow-sm" placeholder={t.admin.settings.placeholderUrl} />
                        <label className="w-14 h-14 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-brand-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-sm hover:scale-105">
                           <Upload className="w-6 h-6" />
                           <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, false, (res) => setSiteForm({ ...siteForm, [field.key]: res }))} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => { onUpdateData({ ...data, siteConfig: siteForm }); showToast('success', t.admin.settings.success); }} className="w-full py-6 bg-brand-600 text-white rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-100 dark:shadow-none uppercase tracking-widest active:scale-[0.98]">
                  {t.admin.settings.save}
                </button>
              </div>
            )}

            {activeTab === 'category' && (
              <div className="max-w-4xl space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                <div className="flex justify-end">
                  <button onClick={() => { setCatForm({ id: null, name: '', icon: '' }); setCatEditingId('new'); }} className="w-full lg:w-fit px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-brand-100"><Plus className="w-5 h-5" /> {t.admin.category.new}</button>
                </div>
                <div className="space-y-6 lg:space-y-8">
                  {data.categories.map(cat => (
                    <div key={cat.id} className="bg-white dark:bg-zinc-700/40 border border-slate-200 dark:border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-sm">
                      <div className="px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-zinc-700/50 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 flex items-center justify-center shadow-sm"><Folder className="w-5 h-5 text-brand-600" /></div>
                          <span className="font-bold text-base lg:text-lg text-slate-800 dark:text-zinc-100">{cat.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' }); setCatEditingId(cat.id); }} className="p-2 bg-white dark:bg-zinc-600 text-brand-600 border border-slate-200 dark:border-white/5 rounded-lg transition-all hover:bg-slate-50 shadow-sm"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => confirmAction(t.admin.category.edit, t.admin.category.deleteConfirm, () => onUpdateData({ ...data, categories: data.categories.filter(c => c.id !== cat.id) }), true)} className="p-2 bg-white dark:bg-zinc-600 text-red-600 border border-slate-200 dark:border-white/5 rounded-lg transition-all hover:bg-red-50 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cat.subCategories.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-white/5 group shadow-sm">
                              <span className="font-bold text-sm text-slate-600 dark:text-zinc-200 truncate pr-2">{sub.name}</span>
                              <div className="flex gap-1.5 opacity-60 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSubCatForm({ parentId: cat.id, id: sub.id, name: sub.name }); setSubCatEditingId(sub.id); }} className="p-1 hover:text-brand-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => confirmAction(t.admin.tags.deleteTitle, t.admin.category.deleteSubConfirm, () => onUpdateData({ ...data, categories: data.categories.map(c => c.id === cat.id ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sub.id) } : c) }), true)} className="p-1 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => { setSubCatForm({ parentId: cat.id, id: null, name: '' }); setSubCatEditingId('new'); }} className="flex items-center justify-center px-5 py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 transition-colors uppercase gap-2"><Plus className="w-4 h-4" />{t.admin.category.newSub}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popovers */}
      {renamingTag && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setRenamingTag(null)} />
          <div className="bg-white dark:bg-zinc-800 rounded-[2rem] p-10 w-full max-w-md relative z-10 border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <h4 className="font-bold text-2xl mb-8 text-slate-800 dark:text-zinc-100">{t.admin.tags.rename}</h4>
            <div className="space-y-6">
              <input type="text" value={renamingTag.new} onChange={e => setRenamingTag({ ...renamingTag, new: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-xl tracking-tight focus:border-brand-500 dark:text-white shadow-inner" autoFocus />
              <button onClick={() => { 
                if (!renamingTag.new.trim() || renamingTag.old === renamingTag.new) { setRenamingTag(null); return; }
                onUpdateData({ ...data, links: data.links.map(l => l.tags?.includes(renamingTag.old) ? { ...l, tags: Array.from(new Set(l.tags.map(t => t === renamingTag.old ? renamingTag.new.trim() : t))) } : l) });
                setRenamingTag(null); showToast('success', t.admin.tags.renameSuccess);
              }} className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black text-lg hover:opacity-90 transition-all uppercase tracking-widest shadow-lg">保存修改</button>
            </div>
          </div>
        </div>
      )}

      {(catEditingId || subCatEditingId) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => { setCatEditingId(null); setSubCatEditingId(null); }} />
          <div className="bg-white dark:bg-zinc-800 rounded-[2rem] p-8 lg:p-10 w-full max-w-md relative z-10 border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200 shadow-2xl">
            <h4 className="font-bold text-xl lg:text-2xl mb-8 text-slate-800 dark:text-zinc-100 tracking-tight">{catEditingId ? (catEditingId === 'new' ? t.admin.category.new : t.admin.category.edit) : (subCatEditingId === 'new' ? t.admin.category.newSub : t.admin.category.editSub)}</h4>
            <div className="space-y-6">
              <input type="text" placeholder={t.admin.category.name} value={catEditingId ? catForm.name : subCatForm.name} onChange={e => catEditingId ? setCatForm({ ...catForm, name: e.target.value }) : setSubCatForm({ ...subCatForm, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-lg tracking-tight focus:border-brand-500 dark:text-white" autoFocus />
              <button onClick={() => { 
                if (catEditingId) { const newCats = catForm.id ? data.categories.map(c => c.id === catForm.id ? { ...c, name: catForm.name } : c) : [...data.categories, { id: `c-${Date.now()}`, name: catForm.name, subCategories: [] }]; onUpdateData({ ...data, categories: newCats }); setCatEditingId(null); } 
                else { const newCats = data.categories.map(c => c.id === subCatForm.parentId ? { ...c, subCategories: subCatForm.id ? c.subCategories.map(s => s.id === subCatForm.id ? { ...s, name: subCatForm.name } : s) : [...c.subCategories, { id: `sc-${Date.now()}`, name: subCatForm.name }] } : c); onUpdateData({ ...data, categories: newCats }); setSubCatEditingId(null); }
                showToast('success', t.app.saved);
              }} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-base hover:opacity-90 transition-all uppercase tracking-widest shadow-lg">完成保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModal;
