
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, PlusCircle, Upload, Edit2, Trash2, Folder, ListPlus, Download, Cloud, Settings, Wand2, Loader2, Image as ImageIcon, Globe, Tag, ExternalLink, ChevronDown, CheckCircle2, Cpu, Hash, Search, Save, Check, MousePointer2, Apple, Chrome, Play, LayoutGrid } from 'lucide-react';
import { AppData, Category, LinkItem, CloudConfig, SiteConfig, SubCategory } from '../types';
import { ToastType } from './Toast';
import { publishToNotion } from '../services/storageUtils';

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
  sourceName: string;
  sourceType: 'appstore' | 'web' | 'googleplay' | 'chrome';
}

declare const __BUILD_TIME__: string;
const BUILD_ID = "v3.2.0-Glass-" + (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toLocaleString());

// 恢复至 128px 分辨率 + 0.8 质量，确保图标清晰度
const compressImage = async (input: string, maxWidth: number = 128, quality = 0.8): Promise<string> => {
  let src = input;
  if (!input) return '';
  if (input.startsWith('http')) {
    try {
      const res = await fetch(input);
      const blob = (await res.blob()) as any;
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
  isOpen, onClose, data, onUpdateData, cloudConfig, onUpdateCloudConfig, onSyncUpload, onSyncDownload, isSyncing, editingItem, initialValues, t, showToast, confirmAction
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({ title: '', url: '', description: '', categoryId: '', subCategoryId: '', iconUrl: '', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaPickerResults, setMetaPickerResults] = useState<MetaResult[]>([]);
  const [pickerSelections, setPickerSelections] = useState({ title: '', description: '', iconUrl: '' });
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState(''); 
  const [linkBulkIcons, setLinkBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedBulkIconId, setSelectedBulkIconId] = useState<string | null>(null);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ id: null, name: '', icon: '' });
  const [subCatEditingId, setSubCatEditingId] = useState<string | null>(null);
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({ parentId: '', id: null, name: '' });
  const [siteForm, setSiteForm] = useState<SiteConfig>({ title: '', logoUrl: '', faviconUrl: '', backgroundUrl: '' });
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
      setSiteForm({ title: data.siteConfig?.title || t.app.title, logoUrl: data.siteConfig?.logoUrl || '', faviconUrl: data.siteConfig?.faviconUrl || '', backgroundUrl: data.siteConfig?.backgroundUrl || '' });
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig, t]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, compress: boolean, callback: (res: string) => void) => {
    const file = e.target.files?.[0]; if (!file) return;

    // 严格限制上传体积：1MB (1048576 字节)
    if (file.size > 1024 * 1024) {
      showToast('error', t.app.imageTooLarge);
      e.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => { 
      const res = ev.target?.result as string; 
      if (res) {
        // 如果是图标类，执行 128px 压缩；如果是背景图，保留较高分辨率但仍限制体积
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
    setIsFetchingMeta(true); setMetaPickerResults([]);
    try {
      const urlObj = new URL(targetUrl);
      const query = urlObj.hostname.split('.').filter(p => p !== 'www')[0];
      const isGP = targetUrl.includes('play.google.com/store/apps/details'), isChrome = targetUrl.includes('chromewebstore.google.com/detail');
      const gpSel = isGP ? { title: { selector: 'h1 span' }, icon: { selector: 'img[alt="Icon image"]', attr: 'src' }, description: { selector: '[data-g-id="description"]' } } : { title: { selector: '.Dd1H1' }, icon: { selector: 'img.T7XW9e', attr: 'src' }, description: { selector: '.ubS7Rd' } };
      const chSel = isChrome ? { title: { selector: 'h1' }, icon: { selector: 'main img', attr: 'src' }, description: { selector: 'meta[name="description"]', attr: 'content' } } : { title: { selector: 'h2' }, icon: { selector: 'img', attr: 'src' }, description: { selector: 'p' } };
      
      const tasks = [
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=cn&entity=software&limit=1`).then(r => r.json()).then(async d => d.results?.[0] ? { id: 'appstore', title: d.results[0].trackName, description: d.results[0].description?.split('\n')[0], iconUrl: await compressImage(d.results[0].artworkUrl512 || d.results[0].artworkUrl100), sourceName: 'App Store', sourceType: 'appstore' as const } : null).catch(() => null),
        fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`).then(r => r.json()).then(async d => (d.status === 'success' && d.data.title) ? { id: 'web', title: d.data.title, description: d.data.description || '', iconUrl: d.data.logo?.url ? await compressImage(d.data.logo.url) : '', sourceName: 'Web', sourceType: 'web' as const } : null).catch(() => null),
        fetch(`https://api.microlink.io?url=${encodeURIComponent(isGP ? targetUrl : `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`)}&prerender=true&data=${encodeURIComponent(JSON.stringify(gpSel))}`).then(r => r.json()).then(async d => (d.status === 'success' && d.data.title && !d.data.title.includes('Google Play')) ? { id: 'googleplay', title: d.data.title, description: d.data.description || '', iconUrl: d.data.icon ? await compressImage(d.data.icon) : '', sourceName: 'Google Play', sourceType: 'googleplay' as const } : null).catch(() => null),
        fetch(`https://api.microlink.io?url=${encodeURIComponent(isChrome ? targetUrl : `https://chromewebstore.google.com/search/${encodeURIComponent(query)}`)}&prerender=true&data=${encodeURIComponent(JSON.stringify(chSel))}`).then(r => r.json()).then(async d => (d.status === 'success' && d.data.title && !d.data.title.includes('Chrome')) ? { id: 'chrome', title: d.data.title, description: d.data.description || '', iconUrl: d.data.icon ? await compressImage(d.data.icon) : '', sourceName: 'Chrome Store', sourceType: 'chrome' as const } : null)
      ];
      const results = (await Promise.all(tasks)).filter(r => r !== null && r.title) as MetaResult[];
      if (results.length > 1) { setMetaPickerResults(results); setPickerSelections({ title: results[0].id, description: results[0].id, iconUrl: results[0].id }); }
      else if (results.length === 1) { const f = results[0]; setLinkForm(prev => ({ ...prev, title: f.title, description: f.description, iconUrl: f.iconUrl })); showToast('success', t.admin.link.meta.success); }
      else showToast('error', t.admin.link.meta.error);
    } catch (e) { showToast('error', t.admin.link.meta.error); } finally { setIsFetchingMeta(false); }
  };

  const applyPickerSelection = () => {
    if (metaPickerResults.length === 0) return;
    const finalTitle = metaPickerResults.find(r => r.id === pickerSelections.title)?.title || '';
    const finalDesc = metaPickerResults.find(r => r.id === pickerSelections.description)?.description || '';
    const finalIcon = metaPickerResults.find(r => r.id === pickerSelections.iconUrl)?.iconUrl || '';
    setLinkForm(prev => ({ ...prev, title: finalTitle, description: finalDesc, iconUrl: finalIcon }));
    setMetaPickerResults([]); showToast('success', t.admin.link.meta.success);
  };

  const SourceIcon = ({ type }: { type: MetaResult['sourceType'] }) => {
    switch(type) { case 'appstore': return <Apple className="w-3.5 h-3.5" />; case 'chrome': return <Chrome className="w-3.5 h-3.5" />; case 'googleplay': return <Play className="w-3.5 h-3.5" />; default: return <Globe className="w-3.5 h-3.5" />; }
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
    if (!linkForm.id) { setLinkForm({ ...linkForm, title: '', url: '', description: '', iconUrl: '', tags: [] }); setTagInput(''); }
    else onClose();
  };

  const handleExportHTML = () => {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1><META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"><TITLE>Bookmarks</TITLE><H1>Bookmarks</H1><DL><p>\n`;
    data.categories.forEach(cat => {
      html += `    <DT><H3>${cat.name}</H3>\n    <DL><p>\n`;
      data.links.filter(l => l.categoryId === cat.id && !l.subCategoryId).forEach(l => {
        html += `        <DT><A HREF="${l.url}" ICON="${l.iconUrl || ''}">${l.title}</A>\n`;
      });
      cat.subCategories.forEach(sub => {
        html += `        <DT><H3>${sub.name}</H3>\n        <DL><p>\n`;
        data.links.filter(l => l.categoryId === cat.id && l.subCategoryId === sub.id).forEach(l => {
          html += `            <DT><A HREF="${l.url}" ICON="${l.iconUrl || ''}">${l.title}</A>\n`;
        });
        html += `        </DL><p>\n`;
      });
      html += `    </DL><p>\n`;
    });
    html += `</DL><p>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'navhub-bookmarks.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); showToast('success', t.app.success);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl w-full max-w-5xl h-[88vh] rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] flex overflow-hidden border border-white/40 dark:border-white/5 relative z-10 animate-in zoom-in-95 duration-500">
        
        <div className="w-16 sm:w-64 bg-white/30 dark:bg-slate-950/20 backdrop-blur-sm border-r border-white/20 dark:border-white/5 flex flex-col shrink-0">
          <div className="p-6 h-20 flex items-center">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 mr-3 hidden sm:flex">
                <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-800 hidden sm:block dark:text-white tracking-tight">{t.admin.title}</h2>
          </div>
          <div className="flex-1 py-4 space-y-1 overflow-y-auto px-3">
            {(Object.keys(t.admin.tabs) as Tab[]).map((tabId) => {
              const iconsMap: Record<Tab, React.ReactNode> = {
                link: <PlusCircle className="w-5 h-5" />, category: <Folder className="w-5 h-5" />, tags: <Hash className="w-5 h-5" />,
                cloud: <Cloud className="w-5 h-5" />, data: <Download className="w-5 h-5" />, settings: <Settings className="w-5 h-5" />,
              };
              const active = activeTab === tabId;
              return (
                <button key={tabId} onClick={() => setActiveTab(tabId)} className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/30' : 'text-slate-500 hover:bg-white/40 dark:text-slate-400 dark:hover:bg-white/5'}`}>
                  <span className="shrink-0">{iconsMap[tabId]}</span>
                  <span className="hidden sm:block">{t.admin.tabs[tabId]}</span>
                </button>
              );
            })}
          </div>
          <div className="p-6 border-t border-white/20 dark:border-white/5 hidden sm:block">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-40">
              <Cpu className="w-3 h-3" /> <span>{BUILD_ID}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          <div className="h-20 border-b border-white/20 dark:border-white/5 flex items-center justify-between px-8 shrink-0">
            <h3 className="text-xl font-bold dark:text-white tracking-tight">{t.admin.tabs[activeTab]}</h3>
            <button onClick={onClose} className="p-3 text-slate-400 hover:bg-white/40 rounded-full dark:hover:bg-white/5 transition-all"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'link' && (
              <div className="space-y-8 max-w-3xl mx-auto">
                <div className="flex gap-2 p-1.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl w-fit border border-white/20 dark:border-white/5">
                  {(['single', 'bulk', 'icons'] as const).map(m => (
                    <button key={m} onClick={() => setLinkMode(m)} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${linkMode === m ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}>{t.admin.link.modes[m]}</button>
                  ))}
                </div>

                {linkMode === 'single' && (
                  <div className="space-y-6 relative">
                    {metaPickerResults.length > 0 && (
                      <div className="absolute inset-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl flex flex-col p-8 animate-in fade-in zoom-in-95 duration-500 border border-white/40 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                          <div>
                            <h4 className="font-black text-2xl dark:text-white flex items-center gap-3"><div className="p-2.5 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20"><MousePointer2 className="w-6 h-6 text-white" /></div>{t.admin.link.meta.pickerTitle}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{t.admin.link.meta.pickerDesc}</p>
                          </div>
                          <button onClick={() => setMetaPickerResults([])} className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar">
                          <div className="space-y-5">
                            <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> {t.admin.link.meta.titleStrategy}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{metaPickerResults.map(item => { const active = pickerSelections.title === item.id; return (<button key={item.id} onClick={() => setPickerSelections(p => ({...p, title: item.id}))} className={`relative p-5 rounded-3xl border-2 text-left transition-all duration-300 ${active ? 'border-indigo-500 bg-indigo-500/5 shadow-xl shadow-indigo-500/10' : 'border-white/40 hover:border-indigo-300 bg-white/20 dark:border-white/5 dark:hover:border-white/20'}`}><div className="flex items-center gap-2 mb-3 text-slate-400 dark:text-slate-500"><SourceIcon type={item.sourceType} /><span className="text-[10px] font-bold uppercase tracking-tight">{item.sourceName}</span></div><div className="font-bold text-sm dark:text-white truncate pr-8 leading-relaxed">{item.title}</div>{active && <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"><Check className="w-4 h-4 text-white" /></div>}</button>); })}</div>
                          </div>
                          <div className="space-y-5">
                            <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> {t.admin.link.meta.iconStrategy}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{metaPickerResults.map(item => { const active = pickerSelections.iconUrl === item.id; if (!item.iconUrl) return null; return (<button key={item.id} onClick={() => setPickerSelections(p => ({...p, iconUrl: item.id}))} className={`relative p-5 rounded-3xl border-2 flex items-center gap-5 transition-all duration-300 ${active ? 'border-indigo-500 bg-indigo-500/5 shadow-xl shadow-indigo-500/10' : 'border-white/40 hover:border-indigo-300 bg-white/20 dark:border-white/5 dark:hover:border-white/20'}`}><div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-white/40 dark:border-white/10 overflow-hidden flex items-center justify-center shadow-inner shrink-0"><img src={item.iconUrl} className="w-full h-full object-cover scale-[1.12]" /></div><div className="min-w-0"><div className="flex items-center gap-2 mb-2 text-slate-400 dark:text-slate-500"><SourceIcon type={item.sourceType} /><span className="text-[10px] font-bold uppercase tracking-tight">{item.sourceName}</span></div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">128px 采样</div></div>{active && <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"><Check className="w-4 h-4 text-white" /></div>}</button>); })}</div>
                          </div>
                          <div className="space-y-5">
                            <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><ListPlus className="w-3.5 h-3.5" /> {t.admin.link.meta.descStrategy}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{metaPickerResults.map(item => { const active = pickerSelections.description === item.id; if (!item.description) return null; return (<button key={item.id} onClick={() => setPickerSelections(p => ({...p, description: item.id}))} className={`relative p-5 rounded-3xl border-2 text-left transition-all duration-300 ${active ? 'border-indigo-500 bg-indigo-500/5 shadow-xl shadow-indigo-500/10' : 'border-white/40 hover:border-indigo-300 bg-white/20 dark:border-white/5 dark:hover:border-white/20'}`}><div className="flex items-center gap-2 mb-3 text-slate-400 dark:text-slate-500"><SourceIcon type={item.sourceType} /><span className="text-[10px] font-bold uppercase tracking-tight">{item.sourceName}</span></div><div className="text-xs dark:text-slate-300 line-clamp-3 leading-relaxed h-16 overflow-hidden italic font-medium">{item.description}</div>{active && <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"><Check className="w-4 h-4 text-white" /></div>}</button>); })}</div>
                          </div>
                        </div>
                        <div className="pt-8 flex gap-5 mt-6 border-t border-white/40 dark:border-white/5 shrink-0">
                          <button onClick={() => setMetaPickerResults([])} className="px-10 py-4 text-slate-500 font-bold hover:bg-black/5 rounded-2xl transition-all dark:text-slate-400 dark:hover:bg-white/5">{t.admin.link.meta.abandon}</button>
                          <button onClick={applyPickerSelection} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"><Save className="w-6 h-6" /> {t.admin.link.meta.apply}</button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.url} <span className="text-red-500">*</span></label>
                        <div className="flex gap-3">
                          <input type="text" value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} className="flex-1 px-5 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 rounded-2xl dark:text-white outline-none focus:ring-2 ring-indigo-500/20" placeholder="https://example.com" />
                          <button onClick={handleFetchMetadata} disabled={isFetchingMeta} className="px-5 py-3.5 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">{isFetchingMeta ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.title} <span className="text-red-500">*</span></label>
                        <input type="text" value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} className="w-full px-5 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 rounded-2xl dark:text-white outline-none font-bold" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.category}</label>
                          <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-4 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 rounded-2xl dark:text-white outline-none">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.subCategory}</label>
                          <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-4 py-3.5 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white outline-none"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.icon}</label>
                      <div className="flex gap-5">
                        <div className="w-16 h-16 bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/5 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner">{linkForm.iconUrl ? <img src={linkForm.iconUrl} className="w-full h-full object-cover scale-[1.12]" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}</div>
                        <div className="flex-1 space-y-3">
                          <input type="text" value={linkForm.iconUrl} onChange={e => setLinkForm({ ...linkForm, iconUrl: e.target.value })} className="w-full px-4 py-2.5 bg-white/40 border border-white/20 rounded-xl text-xs dark:bg-slate-800/40 dark:text-white outline-none" placeholder="https://..." />
                          <label className="inline-block px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-400">{t.admin.link.uploadOrPaste}<input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setLinkForm({ ...linkForm, iconUrl: res }))} /></label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.description}</label>
                      <textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} className="w-full px-5 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 rounded-2xl dark:text-white outline-none resize-none" />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t.admin.link.tags}</label>
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-white/20 dark:bg-slate-800/20 rounded-2xl border border-dashed border-white/40">
                        {linkForm.tags?.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 animate-in zoom-in-95">
                            <Hash className="w-3 h-3" />{tag}
                            <button onClick={() => setLinkForm({ ...linkForm, tags: linkForm.tags?.filter(t => t !== tag) })} className="hover:bg-white/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                        {(!linkForm.tags || linkForm.tags.length === 0) && <span className="text-xs text-slate-400 italic py-1 px-1">{t.admin.link.tagsPlaceholder}</span>}
                      </div>
                      <div className="flex gap-3">
                        <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 px-5 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 rounded-2xl dark:text-white outline-none" placeholder={t.admin.link.tagsPlaceholder} />
                        <button onClick={handleAddTag} className="px-6 py-3.5 bg-white/40 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-black text-xs hover:bg-white transition-all uppercase tracking-widest">{t.admin.link.addTag}</button>
                      </div>
                    </div>
                    <div className="pt-8 flex gap-4 border-t border-white/20 dark:border-white/5">
                      <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-black/5 rounded-2xl transition-all dark:text-slate-400">{t.admin.category.cancel}</button>
                      <button onClick={handleSaveLink} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-[0.98]">{linkForm.id ? t.admin.link.save : t.admin.link.create}</button>
                    </div>
                  </div>
                )}

                {linkMode === 'bulk' && (
                  <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value })} className="w-full px-4 py-3.5 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white outline-none">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-4 py-3.5 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white outline-none"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.bulk.defaultTitle}</label>
                      <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} className="w-full px-5 py-3.5 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white outline-none" placeholder={t.admin.link.bulk.defaultTitlePlaceholder} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.link.bulk.label}</label>
                      <textarea rows={8} value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} className="w-full px-5 py-4 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white font-mono text-sm outline-none" placeholder={t.admin.link.bulk.placeholder} />
                    </div>
                    <button onClick={() => {
                        const lines = bulkUrls.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        const newLinks: LinkItem[] = lines.map((url, i) => ({ id: `lbulk-${Date.now()}-${i}`, title: bulkDefaultTitle || url.replace(/^https?:\/\//, '').split('/')[0], url: url.startsWith('http') ? url : `https://${url}`, description: '', categoryId: linkForm.categoryId!, subCategoryId: linkForm.subCategoryId || '', tags: [] }));
                        onUpdateData({ ...data, links: [...data.links, ...newLinks] });
                        showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length.toString()));
                        setBulkUrls(''); setBulkDefaultTitle(''); onClose();
                    }} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all">{t.admin.link.bulk.import}</button>
                  </div>
                )}
                
                {linkMode === 'icons' && (
                  <div className="flex h-[520px] gap-8 animate-in fade-in duration-300">
                    <div className="w-1/3 flex flex-col gap-4">
                      <label className="flex-1 cursor-pointer border-2 border-dashed border-white/40 bg-white/20 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:bg-white/40 transition-all dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 group">
                        <Upload className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.admin.link.icons.upload}</span>
                        <input type="file" multiple className="hidden" accept="image/*" onChange={e => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(f => {
                            const r = new FileReader();
                            r.onload = async (ev) => { const res = ev.target?.result as string; if (res) { const comp = await compressImage(res); setLinkBulkIcons(p => [...p, { id: `bi-${Date.now()}-${Math.random()}`, preview: comp, assignedId: null }]); } };
                            r.readAsDataURL(f as any);
                          });
                        }} />
                      </label>
                      <div className="h-[280px] bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-3xl p-3 overflow-y-auto grid grid-cols-4 gap-2.5 custom-scrollbar">
                        {linkBulkIcons.map(icon => (
                          <button key={icon.id} onClick={() => setSelectedBulkIconId(icon.id)} className={`aspect-square border-2 rounded-xl p-1 transition-all ${selectedBulkIconId === icon.id ? 'border-indigo-500 bg-white shadow-lg' : 'border-transparent hover:bg-white/40'}`}><img src={icon.preview} className="w-full h-full object-contain" /></button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden flex flex-col bg-white/10 dark:bg-slate-950/20">
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.admin.link.icons.hint}</h5>
                        <button onClick={() => { 
                          const updatedLinks = data.links.map(l => { const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id); return assigned ? { ...l, iconUrl: assigned.preview } : l; });
                          onUpdateData({ ...data, links: updatedLinks }); showToast('success', t.app.success); setLinkBulkIcons([]); setSelectedBulkIconId(null); 
                        }} className="px-5 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-600 transition-all active:scale-95">{t.admin.link.icons.apply}</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 custom-scrollbar">
                        {data.links.map(l => {
                          const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id);
                          return (
                            <button key={l.id} onClick={() => selectedBulkIconId && setLinkBulkIcons(p => p.map(bi => bi.id === selectedBulkIconId ? { ...bi, assignedId: l.id } : (bi.assignedId === l.id ? { ...bi, assignedId: null } : bi)))} className={`flex items-center gap-4 p-3 bg-white/40 border rounded-2xl text-left transition-all ${assigned ? 'border-indigo-500 shadow-xl bg-indigo-500/5 ring-4 ring-indigo-500/10' : 'border-white/20 hover:bg-white/60'} dark:bg-slate-800/20 dark:border-white/5`}>
                              <div className="w-10 h-10 rounded-xl border border-white/40 overflow-hidden flex items-center justify-center shrink-0 bg-white shadow-inner">{(assigned || l.iconUrl) ? <img src={assigned ? assigned.preview : l.iconUrl} className="w-full h-full object-cover scale-[1.12]" /> : <Globe className="w-5 h-5 text-slate-300" />}</div>
                              <div className="min-w-0 font-bold truncate text-xs dark:text-white leading-tight">{l.title}</div>
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
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-between px-2">
                  <div className="space-y-1">
                    <h4 className="font-black text-xl dark:text-white uppercase tracking-tight">{t.admin.tags.globalTitle}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.admin.tags.globalDesc}</p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-white/40 dark:bg-slate-800/40 border border-white/20 rounded-2xl outline-none text-sm font-bold dark:text-white" placeholder={t.admin.tags.searchPlaceholder} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {globalTags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tag => (
                    <div key={tag.name} className="p-5 bg-white/30 dark:bg-slate-800/30 backdrop-blur-md rounded-[2rem] border border-white/20 dark:border-white/5 flex items-center justify-between group transition-all hover:bg-white/50">
                      <div className="flex-1 mr-6">
                        {renamingTag?.old === tag.name ? (
                          <div className="flex gap-2 animate-in zoom-in-95 duration-200">
                            <input type="text" value={renamingTag.new} onChange={e => setRenamingTag({ ...renamingTag, new: e.target.value })} className="flex-1 px-4 py-2 text-sm font-bold bg-white/60 border border-indigo-500/30 rounded-xl outline-none" autoFocus onKeyDown={e => e.key === 'Enter' && (()=>{ if (!renamingTag.new.trim() || tag.name === renamingTag.new) { setRenamingTag(null); return; } onUpdateData({ ...data, links: data.links.map(l => l.tags?.includes(tag.name) ? { ...l, tags: Array.from(new Set(l.tags.map(t => t === tag.name ? renamingTag.new.trim() : t))) } : l) }); setRenamingTag(null); showToast('success', t.admin.tags.renameSuccess); })()} />
                            <button onClick={() => setRenamingTag(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 bg-indigo-500/10 rounded-lg"><Hash className="w-4 h-4 text-indigo-500" /></div>
                              <span className="font-black text-slate-800 dark:text-white tracking-tight">{tag.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.admin.tags.usageCount.replace('{count}', tag.count.toString())}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setRenamingTag({ old: tag.name, new: tag.name })} className="p-3 bg-white/60 dark:bg-white/5 rounded-xl text-indigo-600 hover:bg-white transition-all"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => confirmAction(t.admin.tags.deleteTitle, t.admin.tags.deleteMessage.replace('{tag}', tag.name), () => onUpdateData({ ...data, links: data.links.map(l => ({ ...l, tags: l.tags?.filter(t => t !== tag.name) })) }), true)} className="p-3 bg-white/60 dark:bg-white/5 rounded-xl text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                  {globalTags.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-black uppercase tracking-widest bg-white/20 rounded-[3rem] border border-dashed border-white/40">{t.admin.tags.empty}</div>}
                </div>
              </div>
            )}

            {activeTab === 'category' && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex justify-end items-center px-2">
                    <button onClick={() => { setCatForm({ id: null, name: '', icon: '' }); setCatEditingId('new'); }} className="px-6 py-2.5 bg-indigo-500 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95"><Plus className="w-5 h-5" /> {t.admin.category.new}</button>
                </div>
                <div className="space-y-10">
                  {data.categories.map(cat => (
                    <div key={cat.id} className="isolate border border-white/40 dark:border-white/5 rounded-[2.5rem] bg-white/20 dark:bg-slate-800/20 shadow-sm flex flex-col overflow-hidden">
                      <div className="p-6 flex items-center justify-between bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/10 rounded-t-[2.5rem]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                            {cat.icon ? <img src={cat.icon} className="w-8 h-8 object-contain" /> : <Folder className="w-7 h-7 text-indigo-500" />}
                          </div>
                          <span className="font-black text-lg dark:text-white tracking-tight">{cat.name}</span>
                        </div>
                        <div className="flex gap-2.5">
                          <button onClick={() => { setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' }); setCatEditingId(cat.id); }} className="p-3 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl text-indigo-600 dark:text-indigo-400 transition-all shadow-sm"><Edit2 className="w-5 h-5" /></button>
                          <button onClick={() => { setSubCatForm({ parentId: cat.id, id: null, name: '' }); setSubCatEditingId('new'); }} className="p-3 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl text-green-600 dark:text-green-400 transition-all shadow-sm"><ListPlus className="w-5 h-5" /></button>
                          <button onClick={() => confirmAction(t.admin.category.edit, t.admin.category.deleteConfirm, () => onUpdateData({ ...data, categories: data.categories.filter(c => c.id !== cat.id) }), true)} className="p-3 bg-white/60 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <div className="p-6 bg-transparent rounded-b-[2.5rem] overflow-hidden">
                        {cat.subCategories.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {cat.subCategories.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between px-5 py-3.5 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-white/20 dark:border-white/5 group transition-all hover:border-indigo-500/40 hover:bg-white/60">
                                <span className="text-sm font-bold dark:text-slate-300 truncate mr-3">{sub.name}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setSubCatForm({ parentId: cat.id, id: sub.id, name: sub.name }); setSubCatEditingId(sub.id); }} className="p-1.5 hover:text-indigo-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => confirmAction(t.admin.category.editSub, t.admin.category.deleteSubConfirm, () => onUpdateData({ ...data, categories: data.categories.map(c => c.id === cat.id ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sub.id) } : c) }), true)} className="p-1.5 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">{t.admin.category.noSub}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 animate-in zoom-in-95 duration-500">
                <div className="p-10 border border-white/40 bg-white/30 rounded-[3rem] text-center flex flex-col items-center dark:bg-slate-800/30 dark:border-white/5 transition-all hover:bg-white/50 hover:shadow-2xl">
                  <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30 dark:bg-indigo-600"><Download className="w-10 h-10 text-white" /></div>
                  <h4 className="font-black text-xl mb-3 dark:text-white">{t.admin.data.exportTitle}</h4>
                  <p className="text-xs text-slate-500 mb-10 dark:text-slate-400 font-medium leading-relaxed px-4">{t.admin.data.exportDesc}</p>
                  <button onClick={handleExportHTML} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all active:scale-[0.98]">{t.admin.data.exportBtn}</button>
                </div>
                <div className="p-10 border-4 border-dashed border-white/40 bg-white/10 rounded-[3rem] text-center flex flex-col items-center dark:bg-slate-800/20 dark:border-white/10 transition-all hover:bg-white/20">
                  <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30 dark:bg-amber-600"><Upload className="w-10 h-10 text-white" /></div>
                  <h4 className="font-black text-xl mb-3 dark:text-white">{t.admin.data.importTitle}</h4>
                  <p className="text-xs text-slate-500 mb-10 dark:text-slate-400 font-medium leading-relaxed px-4">{t.admin.data.importDesc}</p>
                  <label className="w-full py-5 bg-white/60 text-slate-800 rounded-[2rem] font-black cursor-pointer text-sm shadow-xl hover:bg-white transition-all active:scale-[0.98] flex items-center justify-center">
                    <span className="leading-none select-none">{t.admin.data.importBtn}</span>
                    <input type="file" className="hidden" accept=".html" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 1024 * 1024) {
                        showToast('error', t.app.imageTooLarge);
                        e.target.value = '';
                        return;
                      }
                    }} />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-6">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{t.admin.settings.siteName}</label><input type="text" value={siteForm.title} onChange={e => setSiteForm({ ...siteForm, title: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{t.admin.settings.logo}</label><div className="flex gap-4"><input type="text" value={siteForm.logoUrl} onChange={e => setSiteForm({ ...siteForm, logoUrl: e.target.value })} className="flex-1 px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /><label className="px-5 py-4 bg-indigo-500 text-white rounded-[1.5rem] cursor-pointer hover:bg-indigo-600 transition-all shadow-lg shrink-0"><Upload className="w-6 h-6" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setSiteForm({ ...siteForm, logoUrl: res }))} /></label></div></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{t.admin.settings.favicon}</label><div className="flex gap-4"><input type="text" value={siteForm.faviconUrl} onChange={e => setSiteForm({ ...siteForm, faviconUrl: e.target.value })} className="flex-1 px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /><label className="px-5 py-4 bg-indigo-500 text-white rounded-[1.5rem] cursor-pointer hover:bg-indigo-600 transition-all shadow-lg shrink-0"><Upload className="w-6 h-6" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setSiteForm({ ...siteForm, faviconUrl: res }))} /></label></div></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{t.admin.settings.background}</label><div className="flex gap-4"><input type="text" value={siteForm.backgroundUrl || ''} onChange={e => setSiteForm({ ...siteForm, backgroundUrl: e.target.value })} className="flex-1 px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /><label className="px-5 py-4 bg-indigo-500 text-white rounded-[1.5rem] cursor-pointer hover:bg-indigo-600 transition-all shadow-lg shrink-0"><Upload className="w-6 h-6" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, false, (res) => setSiteForm({ ...siteForm, backgroundUrl: res }))} /></label></div></div>
                </div>
                <button onClick={() => { onUpdateData({ ...data, siteConfig: siteForm }); showToast('success', t.admin.settings.success); }} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-500/40 transition-all hover:bg-indigo-700 active:scale-[0.98]">{t.admin.settings.save}</button>
              </div>
            )}
            
            {activeTab === 'cloud' && (
              <div className="max-w-2xl mx-auto space-y-10 pt-2 animate-in fade-in duration-500">
                <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-8 rounded-[2.5rem] flex items-center justify-between border border-white/20 dark:border-white/5">
                  <div className="space-y-2 pr-6">
                    <h4 className="text-xl font-black dark:text-white tracking-tight">{t.admin.cloud.enable}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{t.admin.cloud.desc}</p>
                  </div>
                  <button onClick={() => setLocalCloud({ ...localCloud, enabled: !localCloud.enabled })} className={`w-16 h-9 shrink-0 rounded-full transition-all relative ${localCloud.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-7 h-7 bg-white rounded-full transition-all shadow-xl ${localCloud.enabled ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['github', 'notion', 'webdav'] as const).map(p => (
                    <button key={p} onClick={() => setLocalCloud({ ...localCloud, activeProvider: p })} className={`py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl border-2 transition-all duration-300 ${localCloud.activeProvider === p ? 'border-indigo-500 bg-indigo-500/5 text-indigo-500 shadow-xl' : 'border-white/20 hover:border-indigo-300 dark:border-white/5'}`}>{p}</button>
                  ))}
                </div>
                <div className="space-y-6">
                    {localCloud.activeProvider === 'github' && (
                        <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                            <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.github.token}</label><input type="password" value={localCloud.githubToken} onChange={e => setLocalCloud({ ...localCloud, githubToken: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" placeholder="ghp_..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.github.gistId}</label><input type="text" value={localCloud.gistId} onChange={e => setLocalCloud({ ...localCloud, gistId: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /></div>
                        </div>
                    )}
                    {localCloud.activeProvider === 'notion' && (
                        <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                             <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.notion.token}</label><input type="password" value={localCloud.notionToken} onChange={e => setLocalCloud({ ...localCloud, notionToken: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /></div>
                             <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.notion.pageId}</label><input type="text" value={localCloud.notionPageId} onChange={e => setLocalCloud({ ...localCloud, notionPageId: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" /></div>
                             <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.notion.proxy}</label><input type="text" value={localCloud.notionApiUrl} onChange={e => setLocalCloud({ ...localCloud, notionApiUrl: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" placeholder="https://cors-proxy.org/https://api.notion.com/v1" /></div>
                             <p className="text-[10px] text-slate-500 font-bold italic tracking-wider">{t.admin.cloud.notion.proxyHelp}</p>
                        </div>
                    )}
                    {localCloud.activeProvider === 'webdav' && (
                        <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                             <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.webdav.url}</label><input type="text" value={localCloud.webdavUrl} onChange={e => setLocalCloud({ ...localCloud, webdavUrl: e.target.value })} className="w-full px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" placeholder="https://dav.jianguoyun.com/dav/" /></div>
                             <div><label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.admin.cloud.webdav.user} / {t.admin.cloud.webdav.pass}</label><div className="flex gap-4"><input type="text" value={localCloud.webdavUsername} onChange={e => setLocalCloud({ ...localCloud, webdavUsername: e.target.value })} className="flex-1 px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" placeholder="Email" /><input type="password" value={localCloud.webdavPassword} onChange={e => setLocalCloud({ ...localCloud, webdavPassword: e.target.value })} className="flex-1 px-6 py-4 bg-white/40 border border-white/20 rounded-[1.5rem] dark:bg-slate-800/40 dark:text-white outline-none font-bold" placeholder="App Password" /></div></div>
                             <p className="text-[10px] text-slate-500 font-bold italic">{t.admin.cloud.webdav.help}</p>
                        </div>
                    )}
                </div>
                <div className="pt-8 border-t border-white/20 dark:border-white/5 space-y-5">
                    <button onClick={() => { onUpdateCloudConfig(localCloud); showToast('success', t.app.configSaved); }} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black tracking-widest shadow-2xl transition-all active:scale-[0.98] dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 uppercase">{t.admin.cloud.saveConfig}</button>
                    <div className="flex gap-5">
                        <button onClick={() => onSyncUpload(localCloud)} disabled={isSyncing} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 disabled:opacity-50"><Upload className="w-6 h-6" /> {t.admin.cloud.upload}</button>
                        <button onClick={() => onSyncDownload(localCloud)} disabled={isSyncing} className="flex-1 py-5 bg-white/60 text-slate-800 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-white shadow-xl dark:bg-white/5 dark:text-white disabled:opacity-50"><Download className="w-6 h-6" /> {t.admin.cloud.download}</button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(catEditingId || subCatEditingId) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setCatEditingId(null); setSubCatEditingId(null); }} />
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-8 w-full max-w-sm relative z-10 border border-white/40 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300">
            <h4 className="font-black text-xl mb-6 dark:text-white tracking-tight">{catEditingId ? (catEditingId === 'new' ? t.admin.category.new : t.admin.category.edit) : (subCatEditingId === 'new' ? t.admin.category.newSub : t.admin.category.editSub)}</h4>
            <div className="space-y-6">
              <input type="text" placeholder={t.admin.category.name} value={catEditingId ? catForm.name : subCatForm.name} onChange={e => catEditingId ? setCatForm({ ...catForm, name: e.target.value }) : setSubCatForm({ ...subCatForm, name: e.target.value })} className="w-full px-5 py-4 bg-white/40 border border-white/20 rounded-2xl dark:bg-slate-800/40 dark:text-white outline-none font-bold" autoFocus />
              <button onClick={() => { 
                if (catEditingId) { const newCats = catForm.id ? data.categories.map(c => c.id === catForm.id ? { ...c, name: catForm.name } : c) : [...data.categories, { id: `c-${Date.now()}`, name: catForm.name, subCategories: [] }]; onUpdateData({ ...data, categories: newCats }); setCatEditingId(null); } 
                else { const newCats = data.categories.map(c => c.id === subCatForm.parentId ? { ...c, subCategories: subCatForm.id ? c.subCategories.map(s => s.id === subCatForm.id ? { ...s, name: subCatForm.name } : s) : [...c.subCategories, { id: `sc-${Date.now()}`, name: subCatForm.name }] } : c); onUpdateData({ ...data, categories: newCats }); setSubCatEditingId(null); }
                showToast('success', t.app.saved);
              }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all active:scale-95">{t.admin.category.saveDone}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModal;
