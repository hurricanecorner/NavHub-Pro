
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Upload, Edit2, Trash2, Folder, ListPlus, Download, Cloud, Settings, Wand2, Loader2, Image as ImageIcon, Globe, Tag, ExternalLink, ChevronDown, CheckCircle2 } from 'lucide-react';
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

type Tab = 'link' | 'category' | 'cloud' | 'data' | 'settings';
type LinkMode = 'single' | 'bulk' | 'icons';

interface BulkIconUpload {
  id: string;
  preview: string;
  assignedId: string | null;
}

const compressImage = async (input: string, maxWidth: number, quality = 0.8): Promise<string> => {
  let src = input;
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
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
      }
      canvas.width = width;
      canvas.height = height;
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

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setLinkForm({ ...editingItem, tags: editingItem.tags || [] });
        setLinkMode('single');
      } else if (initialValues) {
        setLinkForm({ title: '', url: '', description: '', iconUrl: '', tags: [], categoryId: initialValues.categoryId, subCategoryId: initialValues.subCategoryId });
        setLinkMode('single');
      } else {
        setLinkForm({ title: '', url: '', description: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', tags: [] });
      }
      setLocalCloud(cloudConfig);
      setSiteForm({
        title: data.siteConfig?.title || t.app.title,
        logoUrl: data.siteConfig?.logoUrl || '',
        faviconUrl: data.siteConfig?.faviconUrl || '',
        backgroundUrl: data.siteConfig?.backgroundUrl || ''
      });
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig, t]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isIcon: boolean, callback: (res: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        const compressed = await compressImage(result, isIcon ? 128 : 1920);
        callback(compressed);
      }
    };
    reader.readAsDataURL(file as any);
  };

  const handleFetchMetadata = async () => {
    const rawUrl = linkForm.url?.trim();
    if (!rawUrl) return;
    let targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    setLinkForm(prev => ({ ...prev, url: targetUrl }));
    setIsFetchingMeta(true);
    try {
      const parts = new URL(targetUrl).hostname.split('.');
      const query = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      const resApp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=cn&entity=software&limit=1`);
      const appData = await resApp.json();
      if (appData.results?.[0]) {
        const item = appData.results[0];
        const compressedIcon = await compressImage(item.artworkUrl512 || item.artworkUrl100, 128);
        setLinkForm(prev => ({ ...prev, title: item.trackName, description: item.description?.split('\n')[0], iconUrl: compressedIcon }));
        showToast('success', t.admin.link.meta.success);
      } else {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
        const resData = await res.json();
        if (resData.status === 'success') {
          const { title, description, logo } = resData.data;
          let icon = linkForm.iconUrl;
          if (logo?.url) icon = await compressImage(logo.url, 128);
          setLinkForm(prev => ({ ...prev, title: title || prev.title, description: description || prev.description, iconUrl: icon }));
        }
      }
    } catch (e) { showToast('error', t.admin.link.meta.error); } finally { setIsFetchingMeta(false); }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !linkForm.tags?.includes(tag)) {
      setLinkForm({ ...linkForm, tags: [...(linkForm.tags || []), tag] });
      setTagInput('');
    }
  };

  const handleSaveLink = () => {
    if (!linkForm.title?.trim() || !linkForm.url?.trim()) return;
    const newLink: LinkItem = {
      id: linkForm.id || `l-${Date.now()}`,
      title: linkForm.title.trim(),
      url: linkForm.url.trim(),
      description: linkForm.description?.trim() || '',
      categoryId: linkForm.categoryId!,
      subCategoryId: linkForm.subCategoryId || '',
      iconUrl: linkForm.iconUrl || '',
      tags: linkForm.tags || []
    };
    const updatedLinks = linkForm.id ? data.links.map(l => l.id === linkForm.id ? newLink : l) : [...data.links, newLink];
    onUpdateData({ ...data, links: updatedLinks });
    showToast('success', t.app.saved);
    if (linkForm.id) onClose(); else setLinkForm(p => ({ ...p, title: '', url: '', description: '', iconUrl: '', tags: [] }));
  };

  const handleBulkImport = () => {
    const lines = bulkUrls.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    const newLinks: LinkItem[] = lines.map((url, i) => ({
      id: `lbulk-${Date.now()}-${i}`,
      title: bulkDefaultTitle || url.replace(/^https?:\/\//, '').split('/')[0],
      url: url.startsWith('http') ? url : `https://${url}`,
      description: '',
      categoryId: linkForm.categoryId!,
      subCategoryId: linkForm.subCategoryId || '',
      tags: []
    }));
    onUpdateData({ ...data, links: [...data.links, ...newLinks] });
    showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length.toString()));
    setBulkUrls('');
  };

  const handleExportHTML = () => {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1><META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"><TITLE>Bookmarks</TITLE><H1>Bookmarks</H1><DL><p>\n`;
    data.categories.forEach(cat => {
      html += `<DT><H3>${cat.name}</H3>\n<DL><p>\n`;
      data.links.filter(l => l.categoryId === cat.id).forEach(link => {
        html += `<DT><A HREF="${link.url}">${link.title}</A>\n`;
      });
      html += `</DL><p>\n`;
    });
    html += `</DL><p>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = "bookmarks.html"; link.click();
    showToast('success', t.app.saved);
  };

  const handleImportHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'));
      if (links.length === 0) { showToast('error', t.admin.data.error); return; }
      confirmAction(t.admin.data.importTitle, t.admin.data.confirm, () => {
          const newLinks: LinkItem[] = links.map((a, i) => ({
            id: `imp-${Date.now()}-${i}`,
            title: a.textContent || 'No Title',
            url: a.getAttribute('href') || '',
            description: '',
            categoryId: data.categories[0]?.id || 'c1',
            subCategoryId: '',
            tags: []
          }));
          onUpdateData({ ...data, links: [...data.links, ...newLinks] });
          showToast('success', t.admin.data.success);
      }, true);
    };
    reader.readAsText(file);
  };

  const renderSidebar = () => (
    <div className="w-16 sm:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 dark:bg-slate-800/50 dark:border-slate-700">
      <div className="p-4 h-16 flex items-center border-b border-slate-200/50 dark:border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-800 hidden sm:block dark:text-white">{t.admin.title}</h2>
        <Settings className="w-6 h-6 text-slate-400 sm:hidden mx-auto" />
      </div>
      <div className="flex-1 py-4 space-y-1 overflow-y-auto">
        {(Object.keys(t.admin.tabs) as Tab[]).map((tabId) => {
          const iconsMap = {
            link: <Plus className="w-5 h-5" />,
            category: <Folder className="w-5 h-5" />,
            cloud: <Cloud className="w-5 h-5" />,
            data: <Download className="w-5 h-5" />,
            settings: <Wand2 className="w-5 h-5" />,
          };
          return (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${activeTab === tabId ? 'border-indigo-500 bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
              <span className="shrink-0">{iconsMap[tabId]}</span>
              <span className="hidden sm:block">{t.admin.tabs[tabId]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden relative z-10 dark:bg-slate-900 dark:border dark:border-slate-800">
        {renderSidebar()}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 dark:border-slate-800">
            <h3 className="text-lg font-semibold dark:text-white">{t.admin.tabs[activeTab]}</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {/* --- 链接录入 TAB --- */}
            {activeTab === 'link' && (
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit dark:bg-slate-800">
                  {(['single', 'bulk', 'icons'] as LinkMode[]).map(m => (
                    <button key={m} onClick={() => setLinkMode(m)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${linkMode === m ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {t.admin.link.modes[m]}
                    </button>
                  ))}
                </div>

                {linkMode === 'single' && (
                  <div className="max-w-3xl space-y-5 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.url} <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input type="text" value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} className="flex-1 px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="https://example.com" />
                        <button onClick={handleFetchMetadata} disabled={isFetchingMeta} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 transition-colors">
                          {isFetchingMeta ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.title} <span className="text-red-500">*</span></label>
                      <input type="text" value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.category} <span className="text-red-500">*</span></label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' })} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700">
                          {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700">
                          <option value="">{t.admin.link.general}</option>
                          {data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.icon}</label>
                      <div className="flex gap-4">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shrink-0 dark:bg-slate-800 dark:border-slate-700">
                          {linkForm.iconUrl ? <img src={linkForm.iconUrl} className="w-full h-full object-contain p-1.5" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input type="text" value={linkForm.iconUrl} onChange={e => setLinkForm({ ...linkForm, iconUrl: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="https://..." />
                          <label className="inline-block px-4 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-100 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">{t.admin.link.uploadOrPaste}<input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setLinkForm({ ...linkForm, iconUrl: res }))} /></label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.description}</label>
                      <textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.tags}</label>
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder={t.admin.link.tagsPlaceholder} />
                        <button onClick={handleAddTag} className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-white">{t.admin.link.addTag}</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {linkForm.tags?.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold flex items-center gap-1 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {tag}
                            <button onClick={() => setLinkForm({ ...linkForm, tags: linkForm.tags?.filter(t => t !== tag) })}><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 flex gap-4 border-t dark:border-slate-800">
                      <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors dark:hover:bg-slate-800">{t.admin.category.cancel}</button>
                      <button onClick={handleSaveLink} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]">{linkForm.id ? t.admin.link.save : t.admin.link.create}</button>
                    </div>
                  </div>
                )}

                {linkMode === 'bulk' && (
                  <div className="max-w-3xl space-y-5 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.category}</label>
                        <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700">{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.subCategory}</label>
                        <select value={linkForm.subCategoryId} onChange={e => setLinkForm({ ...linkForm, subCategoryId: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700"><option value="">{t.admin.link.general}</option>{data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.bulk.label}</label>
                      <textarea rows={12} value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700 font-mono text-sm" placeholder={t.admin.link.bulk.placeholder} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5 dark:text-slate-300">{t.admin.link.bulk.defaultTitle}</label>
                      <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder={t.admin.link.bulk.defaultTitlePlaceholder} />
                    </div>
                    <button onClick={handleBulkImport} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all">{t.admin.link.bulk.import}</button>
                  </div>
                )}

                {linkMode === 'icons' && (
                  <div className="flex h-[500px] gap-6 animate-in fade-in duration-300">
                    <div className="w-1/3 flex flex-col gap-4">
                      <label className="flex-1 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-tight">{t.admin.link.icons.upload}</span>
                        <input type="file" multiple className="hidden" accept="image/*" onChange={e => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(f => {
                            const r = new FileReader();
                            r.onload = async (ev) => { 
                              const res = ev.target?.result as string;
                              if (res) { const comp = await compressImage(res, 128); setLinkBulkIcons(p => [...p, { id: `bi-${Date.now()}-${Math.random()}`, preview: comp, assignedId: null }]); }
                            };
                            r.readAsDataURL(f as any);
                          });
                        }} />
                      </label>
                      <div className="h-2/3 border border-slate-100 rounded-xl p-2 overflow-y-auto grid grid-cols-4 gap-2 dark:border-slate-700">
                        {linkBulkIcons.map(icon => (
                          <button key={icon.id} onClick={() => setSelectedBulkIconId(icon.id)} className={`aspect-square border-2 rounded p-1 transition-all ${selectedBulkIconId === icon.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent hover:border-slate-200'}`}><img src={icon.preview} className="w-full h-full object-contain" /></button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border border-slate-100 rounded-xl overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                      <div className="p-3 border-b flex justify-between items-center bg-white dark:bg-slate-900 dark:border-slate-700">
                        <h5 className="text-xs font-bold uppercase text-slate-400">{t.admin.link.icons.hint}</h5>
                        <button onClick={() => { 
                          const updatedLinks = data.links.map(l => {
                            const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id);
                            return assigned ? { ...l, iconUrl: assigned.preview } : l;
                          });
                          onUpdateData({ ...data, links: updatedLinks }); 
                          showToast('success', t.app.success); 
                          setLinkBulkIcons([]); 
                          setSelectedBulkIconId(null); 
                        }} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700">{t.admin.link.icons.apply}</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3">
                        {data.links.map(l => {
                          const assigned = linkBulkIcons.find(bi => bi.assignedId === l.id);
                          return (
                            <button key={l.id} onClick={() => selectedBulkIconId && setLinkBulkIcons(p => p.map(bi => bi.id === selectedBulkIconId ? { ...bi, assignedId: l.id } : (bi.assignedId === l.id ? { ...bi, assignedId: null } : bi)))} className={`flex items-center gap-3 p-2 bg-white border rounded-xl text-left transition-all ${assigned ? 'ring-2 ring-indigo-500 shadow-sm' : 'hover:border-indigo-300'} dark:bg-slate-900 dark:border-slate-700`}>
                              <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">{(assigned || l.iconUrl) ? <img src={assigned ? assigned.preview : l.iconUrl} className="w-full h-full object-contain p-1" /> : <Globe className="w-4 h-4 text-slate-300" />}</div>
                              <div className="min-w-0 font-bold truncate text-xs dark:text-white">{l.title}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- 分类管理 TAB --- */}
            {activeTab === 'category' && (
              <div className="max-w-3xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center"><h4 className="font-bold dark:text-white">{t.admin.category.title}</h4><button onClick={() => { setCatForm({ id: null, name: '', icon: '' }); setCatEditingId('new'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"><Plus className="w-4 h-4" /> {t.admin.category.new}</button></div>
                <div className="space-y-4">
                  {data.categories.map(cat => (
                    <div key={cat.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 transition-all hover:bg-white dark:hover:bg-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">{cat.icon ? <img src={cat.icon} className="w-8 h-8 object-contain" /> : <Folder className="w-8 h-8 text-indigo-500" />}<span className="font-bold dark:text-white">{cat.name}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => { setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' }); setCatEditingId(cat.id); }} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setSubCatForm({ parentId: cat.id, id: null, name: '' }); setSubCatEditingId('new'); }} className="p-1.5 hover:bg-green-50 rounded text-green-600 transition-colors"><ListPlus className="w-4 h-4" /></button>
                          <button onClick={() => confirmAction(t.admin.category.edit, t.admin.category.deleteConfirm, () => onUpdateData({ ...data, categories: data.categories.filter(c => c.id !== cat.id) }), true)} className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="pl-11 flex flex-wrap gap-2">
                        {cat.subCategories.map(sub => (
                          <div key={sub.id} className="group flex items-center gap-2 px-3 py-1 bg-white border rounded-full text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/40">
                            <span>{sub.name}</span>
                            <button onClick={() => { setSubCatForm({ parentId: cat.id, id: sub.id, name: sub.name }); setSubCatEditingId(sub.id); }} className="opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => confirmAction(t.admin.category.editSub, t.admin.category.deleteSubConfirm, () => {
                              const newCats = data.categories.map(c => c.id === cat.id ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sub.id) } : c);
                              onUpdateData({ ...data, categories: newCats });
                            }, true)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- 云端同步 TAB --- */}
            {activeTab === 'cloud' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                <div className="bg-slate-50/80 p-6 rounded-2xl flex items-center justify-between dark:bg-slate-800/50">
                  <div className="space-y-1 pr-4">
                    <h4 className="text-lg font-bold dark:text-white">{t.admin.cloud.enable}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.admin.cloud.desc}</p>
                  </div>
                  <button onClick={() => setLocalCloud({ ...localCloud, enabled: !localCloud.enabled })} className={`w-14 h-8 shrink-0 rounded-full transition-colors relative ${localCloud.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${localCloud.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(['github', 'notion', 'webdav'] as const).map(p => (
                    <button key={p} onClick={() => setLocalCloud({ ...localCloud, activeProvider: p })} className={`py-3 text-sm font-bold rounded-xl border transition-all ${localCloud.activeProvider === p ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-400'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {localCloud.activeProvider === 'github' && (
                    <div className="space-y-4">
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.github.token}</label><input type="password" value={localCloud.githubToken} onChange={e => setLocalCloud({ ...localCloud, githubToken: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="ghp_..." /></div>
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.github.gistId}</label><input type="text" value={localCloud.gistId} onChange={e => setLocalCloud({ ...localCloud, gistId: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" /></div>
                    </div>
                  )}
                  {localCloud.activeProvider === 'notion' && (
                    <div className="space-y-4">
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.notion.token}</label><input type="password" value={localCloud.notionToken} onChange={e => setLocalCloud({ ...localCloud, notionToken: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="secret_..." /></div>
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.notion.pageId}</label><input type="text" value={localCloud.notionPageId} onChange={e => setLocalCloud({ ...localCloud, notionPageId: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" /></div>
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.notion.proxy}</label><input type="text" value={localCloud.notionApiUrl} onChange={e => setLocalCloud({ ...localCloud, notionApiUrl: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="https://..." /></div>
                      <p className="text-xs text-amber-500 font-medium italic">{t.admin.cloud.notion.help}</p>
                      <button onClick={() => publishToNotion(data, localCloud).then(res => showToast(res.success ? 'success' : 'error', res.message))} className="w-full py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold flex items-center justify-center gap-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4" /> {t.admin.cloud.notion.publish}</button>
                    </div>
                  )}
                  {localCloud.activeProvider === 'webdav' && (
                    <div className="space-y-4">
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.webdav.url}</label><input type="text" value={localCloud.webdavUrl} onChange={e => setLocalCloud({ ...localCloud, webdavUrl: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="https://..." /></div>
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.webdav.user}</label><input type="text" value={localCloud.webdavUsername} onChange={e => setLocalCloud({ ...localCloud, webdavUsername: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" /></div>
                      <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t.admin.cloud.webdav.pass}</label><input type="password" value={localCloud.webdavPassword} onChange={e => setLocalCloud({ ...localCloud, webdavPassword: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" /></div>
                      <p className="text-xs text-amber-500 font-medium italic">{t.admin.cloud.webdav.help}</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t dark:border-slate-800 space-y-4">
                  <button onClick={() => { onUpdateCloudConfig(localCloud); showToast('success', t.app.configSaved); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-xl transition-all active:scale-[0.98] dark:bg-indigo-600">{t.admin.cloud.saveConfig}</button>
                  <div className="flex gap-4">
                    <button onClick={() => onSyncUpload(localCloud)} disabled={isSyncing} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t.admin.cloud.upload}
                    </button>
                    <button onClick={() => onSyncDownload(localCloud)} disabled={isSyncing} className="flex-1 py-4 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 dark:border-slate-700 dark:text-white hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t.admin.cloud.download}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- 数据备份 TAB --- */}
            {activeTab === 'data' && (
              <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 border-2 border-slate-100 rounded-3xl bg-slate-50/50 text-center flex flex-col items-center dark:bg-slate-800/30 dark:border-slate-700 transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 dark:bg-indigo-900/20">
                    <Download className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h4 className="font-bold text-lg mb-2 dark:text-white">{t.admin.data.exportTitle}</h4>
                  <p className="text-xs text-slate-500 mb-8 dark:text-slate-400 leading-relaxed h-12 flex items-center">{t.admin.data.exportDesc}</p>
                  <button onClick={handleExportHTML} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]">{t.admin.data.exportBtn}</button>
                </div>
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-center flex flex-col items-center dark:bg-slate-800/30 dark:border-slate-700 transition-all hover:border-amber-100 dark:hover:border-amber-900/40">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 dark:bg-amber-900/20">
                    <Upload className="w-8 h-8 text-amber-500" />
                  </div>
                  <h4 className="font-bold text-lg mb-2 dark:text-white">{t.admin.data.importTitle}</h4>
                  <p className="text-xs text-slate-500 mb-8 dark:text-slate-400 leading-relaxed h-12 flex items-center">{t.admin.data.importDesc}</p>
                  <label className="w-full py-3 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer text-sm shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 transition-all active:scale-[0.98] text-center">
                    {t.admin.data.importBtn}
                    <input type="file" className="hidden" accept=".html" onChange={handleImportHTML} />
                  </label>
                </div>
              </div>
            )}

            {/* --- 样式设置 TAB --- */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div><label className="block text-sm font-bold mb-1.5 dark:text-white">{t.admin.settings.siteName}</label><input type="text" value={siteForm.title} onChange={e => setSiteForm({ ...siteForm, title: e.target.value })} className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" /></div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 dark:text-white">{t.admin.settings.logo}</label>
                    <div className="flex gap-2">
                        <input type="text" value={siteForm.logoUrl} onChange={e => setSiteForm({ ...siteForm, logoUrl: e.target.value })} className="flex-1 px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder={t.admin.settings.placeholderUrl} />
                        <label className="px-4 py-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors"><Upload className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setSiteForm({ ...siteForm, logoUrl: res }))} /></label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 dark:text-white">{t.admin.settings.favicon}</label>
                    <div className="flex gap-2">
                        <input type="text" value={siteForm.faviconUrl} onChange={e => setSiteForm({ ...siteForm, faviconUrl: e.target.value })} className="flex-1 px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder={t.admin.settings.placeholderUrl} />
                        <label className="px-4 py-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors"><Upload className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, true, (res) => setSiteForm({ ...siteForm, faviconUrl: res }))} /></label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 dark:text-white">{t.admin.settings.background}</label>
                    <div className="flex gap-2">
                        <input type="text" value={siteForm.backgroundUrl || ''} onChange={e => setSiteForm({ ...siteForm, backgroundUrl: e.target.value })} className="flex-1 px-4 py-3 border rounded-xl dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder={t.admin.settings.placeholderUrl} />
                        <label className="px-4 py-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors"><Upload className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, false, (res) => setSiteForm({ ...siteForm, backgroundUrl: res }))} /></label>
                    </div>
                  </div>
                </div>
                <button onClick={() => { onUpdateData({ ...data, siteConfig: siteForm }); showToast('success', t.admin.settings.success); }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl transition-all active:scale-[0.98]">{t.admin.settings.save}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popups for Cat/SubCat */}
      {(catEditingId || subCatEditingId) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setCatEditingId(null); setSubCatEditingId(null); }} />
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative z-10 dark:bg-slate-900 border dark:border-slate-800 shadow-2xl">
            <h4 className="font-bold mb-4 dark:text-white">{catEditingId ? t.admin.category.edit : t.admin.category.editSub}</h4>
            <div className="space-y-4">
              <input type="text" placeholder={t.admin.category.name} value={catEditingId ? catForm.name : subCatForm.name} onChange={e => catEditingId ? setCatForm({ ...catForm, name: e.target.value }) : setSubCatForm({ ...subCatForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:border-slate-700" />
              <button onClick={() => { 
                if (catEditingId) {
                  const newCats = catForm.id ? data.categories.map(c => c.id === catForm.id ? { ...c, name: catForm.name } : c) : [...data.categories, { id: `c-${Date.now()}`, name: catForm.name, subCategories: [] }];
                  onUpdateData({ ...data, categories: newCats }); setCatEditingId(null);
                } else {
                  const newCats = data.categories.map(c => c.id === subCatForm.parentId ? { ...c, subCategories: subCatForm.id ? c.subCategories.map(s => s.id === subCatForm.id ? { ...s, name: subCatForm.name } : s) : [...c.subCategories, { id: `sc-${Date.now()}`, name: subCatForm.name }] } : c);
                  onUpdateData({ ...data, categories: newCats }); setSubCatEditingId(null);
                }
                showToast('success', t.app.saved);
              }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-95">{t.admin.link.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModal;
