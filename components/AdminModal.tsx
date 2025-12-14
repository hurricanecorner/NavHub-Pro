

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Save, Upload, Edit2, Trash2, Folder, ListPlus, Images, ArrowRight, Undo2, Tag, Download, Book, Cloud, ExternalLink, Settings, ChevronDown, ChevronUp, Wand2, Loader2, PanelTop, Copy, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { AppData, Category, LinkItem, CloudConfig, SubCategory, SiteConfig } from '../types';
import { ToastType } from './Toast';

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

// Types for Bulk Icon Logic
interface BulkIconUpload {
  id: string;
  preview: string;
  assignedId: string | null;
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, onClose, data, onUpdateData, cloudConfig, onUpdateCloudConfig, onSyncUpload, onSyncDownload, isSyncing, editingItem, initialValues, t, showToast, confirmAction
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  
  // --- LINK TAB STATE ---
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({
    title: '', url: '', description: '', categoryId: '', subCategoryId: '', iconUrl: '', tags: []
  });
  const [linkErrors, setLinkErrors] = useState<{ title?: string; url?: string; categoryId?: string }>({});
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [tagInput, setTagInput] = useState('');
  // Bulk Import
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState('');
  // Bulk Icons
  const [linkBulkIcons, setLinkBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedLinkBulkIconId, setSelectedLinkBulkIconId] = useState<string | null>(null);


  // --- CATEGORY TAB STATE ---
  const [catEditingId, setCatEditingId] = useState<string | null>(null); // ID of category being edited, null for list view
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ id: null, name: '', icon: '' });
  
  const [subCatEditingId, setSubCatEditingId] = useState<string | null>(null); // ID of subcat being edited
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({ parentId: '', id: null, name: '' });
  
  // Bulk Icons for Categories
  const [catBulkIcons, setCatBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedCatBulkIconId, setSelectedCatBulkIconId] = useState<string | null>(null);


  // --- SETTINGS TAB STATE ---
  const [siteForm, setSiteForm] = useState<SiteConfig>({ title: '', logoUrl: '', faviconUrl: '', backgroundUrl: '' });


  // --- CLOUD TAB STATE ---
  const [localCloudConfig, setLocalCloudConfig] = useState<CloudConfig>(cloudConfig);


  // --- INITIALIZATION ---
  useEffect(() => {
    if (isOpen) {
      // Initialize Link Form
      if (editingItem) {
        setLinkForm({ ...editingItem, tags: editingItem.tags || [] });
        setActiveTab('link');
        setLinkMode('single');
      } else if (initialValues) {
        setLinkForm({ 
            title: '', url: '', description: '', iconUrl: '', tags: [],
            categoryId: initialValues.categoryId,
            subCategoryId: initialValues.subCategoryId
        });
        setActiveTab('link');
        setLinkMode('single');
      } else {
        setLinkForm({ title: '', url: '', description: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', tags: [] });
      }

      // Reset Cloud
      setLocalCloudConfig(cloudConfig);

      // Reset Settings
      setSiteForm({
        title: data.siteConfig?.title || t.app.title,
        logoUrl: data.siteConfig?.logoUrl || '',
        faviconUrl: data.siteConfig?.faviconUrl || '',
        backgroundUrl: data.siteConfig?.backgroundUrl || ''
      });

      // Reset others
      setLinkErrors({});
      setTagInput('');
      setBulkUrls('');
      setLinkBulkIcons([]);
      setCatBulkIcons([]);
      setCatEditingId(null);
      setSubCatEditingId(null);
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig]);


  // --- HELPER: Image Handling ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (result: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit warning
         showToast('info', "Image is large. It might slow down the app.");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onSuccess(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LINK LOGIC ---

  const handleFetchMetadata = async () => {
    const url = linkForm.url?.trim();
    if (!url) return;

    let targetUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      targetUrl = `https://${url}`;
      setLinkForm(prev => ({ ...prev, url: targetUrl }));
    }

    setIsFetchingMeta(true);
    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
      const resData = await response.json();
      if (resData.status === 'success') {
        const { title, description, logo, image } = resData.data;
        setLinkForm(prev => ({
          ...prev,
          title: title || prev.title,
          description: description || prev.description,
          iconUrl: logo?.url || image?.url || prev.iconUrl
        }));
        showToast('success', t.admin.link.meta.success);
      } else { throw new Error("API failed"); }
    } catch (e) {
      // Fallback simple title extraction
      try {
         const urlObj = new URL(targetUrl);
         const hostname = urlObj.hostname.replace(/^www\./, '');
         const title = hostname.split('.')[0];
         if (title && !linkForm.title) {
             setLinkForm(prev => ({ ...prev, title: title.charAt(0).toUpperCase() + title.slice(1) }));
         }
      } catch (err) {}
    } finally { setIsFetchingMeta(false); }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !linkForm.tags?.includes(tagInput.trim())) {
      setLinkForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setLinkForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) }));
  };

  const handleSaveLink = () => {
      if (!linkForm.title?.trim()) { setLinkErrors(p => ({...p, title: t.admin.link.validation.titleRequired})); return; }
      if (!linkForm.url?.trim()) { setLinkErrors(p => ({...p, url: t.admin.link.validation.urlRequired})); return; }
      if (!linkForm.categoryId) { setLinkErrors(p => ({...p, categoryId: t.admin.link.validation.categoryRequired})); return; }

      let url = linkForm.url.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

      const newLink: LinkItem = {
          id: linkForm.id || `l-${Date.now()}`,
          title: linkForm.title.trim(),
          url: url,
          description: linkForm.description?.trim() || '',
          categoryId: linkForm.categoryId,
          subCategoryId: linkForm.subCategoryId || '',
          iconUrl: linkForm.iconUrl || '',
          tags: linkForm.tags || []
      };

      let updatedLinks = [...data.links];
      if (linkForm.id) {
          updatedLinks = updatedLinks.map(l => l.id === linkForm.id ? newLink : l);
          showToast('success', t.admin.link.updated);
      } else {
          updatedLinks.push(newLink);
          showToast('success', t.admin.link.created);
      }
      onUpdateData({ ...data, links: updatedLinks });
      if (linkForm.id) onClose();
      else setLinkForm(prev => ({ ...prev, title: '', url: '', description: '', iconUrl: '', tags: [] }));
  };

  const handleBulkImport = () => {
      if (!linkForm.categoryId) {
          showToast('error', t.admin.link.validation.categoryRequired);
          return;
      }
      const lines = bulkUrls.split('\n').filter(line => line.trim());
      const newLinks: LinkItem[] = [];
      
      lines.forEach((line, idx) => {
          let url = line.trim();
          if (!url) return;
          if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
          
          // Try to guess title from URL if default not provided
          let title = bulkDefaultTitle;
          if (!title) {
              try {
                  const hostname = new URL(url).hostname;
                  title = hostname.replace('www.', '').split('.')[0];
                  title = title.charAt(0).toUpperCase() + title.slice(1);
              } catch { title = "Link"; }
          }

          newLinks.push({
              id: `blk-${Date.now()}-${idx}`,
              title,
              url,
              description: '',
              categoryId: linkForm.categoryId!,
              subCategoryId: linkForm.subCategoryId || '',
              iconUrl: '',
              tags: []
          });
      });

      if (newLinks.length > 0) {
          onUpdateData({ ...data, links: [...data.links, ...newLinks] });
          showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length));
          setBulkUrls('');
      } else {
          showToast('error', t.admin.link.bulk.error);
      }
  };

  const handleLinkBulkIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLinkBulkIcons(prev => [
            ...prev, 
            { 
              id: Math.random().toString(36).substr(2, 9), 
              preview: reader.result as string, 
              assignedId: null 
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleApplyLinkBulkIcons = () => {
    const assignments = linkBulkIcons.filter(item => item.assignedId);
    if (assignments.length === 0) return;

    const updatedLinks = data.links.map(link => {
      const assignment = assignments.find(a => a.assignedId === link.id);
      if (assignment) {
        return { ...link, iconUrl: assignment.preview };
      }
      return link;
    });

    onUpdateData({ ...data, links: updatedLinks });
    setLinkBulkIcons([]);
    showToast('success', t.admin.link.bulkIcons.success);
  };

  const handleAssignIconToLink = (linkId: string) => {
    if (!selectedLinkBulkIconId) return;
    setLinkBulkIcons(prev => prev.map(icon => {
      if (icon.assignedId === linkId) return { ...icon, assignedId: null };
      if (icon.id === selectedLinkBulkIconId) return { ...icon, assignedId: linkId };
      return icon;
    }));
    setSelectedLinkBulkIconId(null);
  };

  const handleUnassignLinkIcon = (e: React.MouseEvent, iconId: string) => {
    e.stopPropagation();
    setLinkBulkIcons(prev => prev.map(icon => 
      icon.id === iconId ? { ...icon, assignedId: null } : icon
    ));
  };


  // --- CATEGORY LOGIC ---

  const handleSaveCategory = () => {
      if (!catForm.name.trim()) return;
      
      let newCats = [...data.categories];
      if (catForm.id) {
          // Update
          newCats = newCats.map(c => c.id === catForm.id ? { ...c, name: catForm.name, icon: catForm.icon } : c);
          showToast('success', t.admin.category.updated);
      } else {
          // Create
          newCats.push({
              id: `c-${Date.now()}`,
              name: catForm.name,
              icon: catForm.icon,
              subCategories: []
          });
          showToast('success', t.admin.category.created);
      }
      onUpdateData({ ...data, categories: newCats });
      setCatEditingId(null);
  };

  const handleDeleteCategory = (id: string) => {
      confirmAction(t.admin.category.deleteConfirm, "", () => {
          const newCats = data.categories.filter(c => c.id !== id);
          const newLinks = data.links.filter(l => l.categoryId !== id);
          onUpdateData({ categories: newCats, links: newLinks });
          showToast('success', t.admin.category.deleted);
      }, true);
  };

  const handleSaveSubCategory = () => {
      if (!subCatForm.name.trim() || !subCatForm.parentId) return;

      const catIndex = data.categories.findIndex(c => c.id === subCatForm.parentId);
      if (catIndex === -1) return;

      const newCats = [...data.categories];
      const category = { ...newCats[catIndex] };
      const newSubs = [...category.subCategories];

      if (subCatForm.id) {
          // Update
          const subIndex = newSubs.findIndex(s => s.id === subCatForm.id);
          if (subIndex > -1) {
              newSubs[subIndex] = { ...newSubs[subIndex], name: subCatForm.name };
              showToast('success', t.admin.category.subUpdated);
          }
      } else {
          // Create
          newSubs.push({ id: `sc-${Date.now()}`, name: subCatForm.name });
          showToast('success', t.admin.category.subCreated);
      }
      
      category.subCategories = newSubs;
      newCats[catIndex] = category;
      onUpdateData({ ...data, categories: newCats });
      setSubCatEditingId(null);
  };

  const handleDeleteSubCategory = (catId: string, subId: string) => {
       confirmAction(t.admin.category.deleteSubConfirm, "", () => {
          const newCats = [...data.categories];
          const catIndex = newCats.findIndex(c => c.id === catId);
          if (catIndex > -1) {
              newCats[catIndex] = {
                  ...newCats[catIndex],
                  subCategories: newCats[catIndex].subCategories.filter(s => s.id !== subId)
              };
              // Note: Links in this subcat will become hidden or move to General depending on logic elsewhere. 
              // For safety, let's move them to General (empty subCategoryId)
              const newLinks = data.links.map(l => {
                  if (l.categoryId === catId && l.subCategoryId === subId) {
                      return { ...l, subCategoryId: '' };
                  }
                  return l;
              });
              onUpdateData({ categories: newCats, links: newLinks });
              showToast('success', t.admin.category.subDeleted);
          }
       }, true);
  };

  // --- DATA & CLOUD LOGIC ---

  const handleExportData = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.categories && json.links) {
                  confirmAction(t.admin.data.importTitle, t.admin.data.confirm, () => {
                      onUpdateData(json);
                      showToast('success', t.admin.data.success);
                      onClose();
                  }, true);
              } else { throw new Error("Invalid Format"); }
          } catch { showToast('error', t.admin.data.error); }
      };
      reader.readAsText(file);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const htmlContent = event.target?.result as string;
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlContent, 'text/html');
              
              const newCategories: Category[] = [];
              const newLinks: LinkItem[] = [];
              
              const h3s = Array.from(doc.querySelectorAll('h3'));
              
              if (h3s.length === 0) {
                  // No folders found, put all links in one category
                  const links = Array.from(doc.querySelectorAll('a'));
                  if (links.length === 0) throw new Error("No links found");
                  
                  const catId = `c-${Date.now()}`;
                  newCategories.push({ id: catId, name: 'Imported', subCategories: [] });
                  
                  links.forEach((a, i) => {
                      newLinks.push({
                          id: `l-${Date.now()}-${i}`,
                          title: a.textContent || 'Untitled',
                          url: (a as HTMLAnchorElement).href,
                          description: '',
                          categoryId: catId,
                          subCategoryId: '',
                          iconUrl: a.getAttribute('icon') || '',
                          tags: []
                      });
                  });
              } else {
                  h3s.forEach((h3, idx) => {
                      const catId = `c-${Date.now()}-${idx}`;
                      newCategories.push({
                          id: catId,
                          name: h3.textContent || 'Untitled',
                          subCategories: []
                      });
                      
                      // Find links in the DL immediately following the H3
                      const dl = h3.nextElementSibling;
                      if (dl && dl.tagName === 'DL') {
                          const links = Array.from(dl.querySelectorAll(':scope > dt > a'));
                          links.forEach((a, lIdx) => {
                              newLinks.push({
                                  id: `l-${Date.now()}-${idx}-${lIdx}`,
                                  title: a.textContent || 'Untitled',
                                  url: (a as HTMLAnchorElement).href,
                                  description: '',
                                  categoryId: catId,
                                  subCategoryId: '',
                                  iconUrl: a.getAttribute('icon') || '',
                                  tags: []
                              });
                          });
                      }
                  });
              }
              
              if (newCategories.length > 0) {
                   confirmAction(t.admin.data.importTitle, t.admin.data.confirm, () => {
                      onUpdateData({ ...data, categories: newCategories, links: newLinks });
                      showToast('success', t.admin.data.success);
                      onClose();
                  }, true);
              } else {
                  showToast('error', t.admin.data.error);
              }
          } catch {
              showToast('error', t.admin.data.error);
          }
      };
      reader.readAsText(file);
  };

  const handleSaveCloudConfig = () => {
      onUpdateCloudConfig(localCloudConfig);
      showToast('success', t.app.configSaved);
  };
  
  const handleSaveSiteConfig = () => {
      onUpdateData({ ...data, siteConfig: siteForm });
      showToast('success', t.admin.settings.success);
  };

  // --- RENDER HELPERS ---
  const renderSidebar = () => (
      <div className="w-16 sm:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="p-4 h-16 flex items-center border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-bold text-slate-800 hidden sm:block dark:text-white">{t.admin.title}</h2>
              <Settings className="w-6 h-6 text-slate-400 sm:hidden mx-auto" />
          </div>
          <div className="flex-1 py-4 space-y-1 overflow-y-auto">
              {[
                  { id: 'link', icon: <Plus />, label: t.admin.tabs.addLink },
                  { id: 'category', icon: <Folder />, label: t.admin.tabs.categories },
                  { id: 'cloud', icon: <Cloud />, label: t.admin.tabs.cloud },
                  { id: 'data', icon: <Download />, label: t.admin.tabs.data },
                  { id: 'settings', icon: <Wand2 />, label: t.admin.tabs.settings },
              ].map((tab) => (
                  <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as Tab); setCatEditingId(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                          activeTab === tab.id 
                          ? 'border-indigo-500 bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' 
                          : 'border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                  >
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="hidden sm:block">{tab.label}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden relative z-10 dark:bg-slate-900 dark:border dark:border-slate-800 animate-in zoom-in-95 duration-200">
          
          {renderSidebar()}

          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 dark:border-slate-800">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                      {activeTab === 'link' && t.admin.tabs.addLink}
                      {activeTab === 'category' && t.admin.tabs.categories}
                      {activeTab === 'cloud' && t.admin.tabs.cloud}
                      {activeTab === 'data' && t.admin.tabs.data}
                      {activeTab === 'settings' && t.admin.tabs.settings}
                  </h3>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                  
                  {/* === TAB: LINK === */}
                  {activeTab === 'link' && (
                      <div className="max-w-3xl mx-auto space-y-6">
                           <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit dark:bg-slate-800">
                               {['single', 'bulk', 'icons'].map(m => (
                                   <button key={m} onClick={() => setLinkMode(m as LinkMode)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${linkMode === m ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                       {t.admin.link.modes[m]}
                                   </button>
                               ))}
                           </div>

                           {linkMode === 'single' && (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                                   {/* URL & Title */}
                                   <div className="space-y-4 md:col-span-2">
                                       <div>
                                           <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.url} <span className="text-red-500">*</span></label>
                                           <div className="flex gap-2">
                                               <input type="text" value={linkForm.url} onChange={e => { setLinkForm({...linkForm, url: e.target.value}); setLinkErrors({...linkErrors, url: ''}) }} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="https://example.com" />
                                               <button onClick={handleFetchMetadata} disabled={isFetchingMeta} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-900/30 dark:text-indigo-300">{isFetchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}</button>
                                           </div>
                                           {linkErrors.url && <p className="text-xs text-red-500 mt-1">{linkErrors.url}</p>}
                                       </div>
                                       <div>
                                           <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.title} <span className="text-red-500">*</span></label>
                                           <input type="text" value={linkForm.title} onChange={e => { setLinkForm({...linkForm, title: e.target.value}); setLinkErrors({...linkErrors, title: ''}) }} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                           {linkErrors.title && <p className="text-xs text-red-500 mt-1">{linkErrors.title}</p>}
                                       </div>
                                   </div>
                                   
                                   {/* Category Selects */}
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.category} <span className="text-red-500">*</span></label>
                                       <select value={linkForm.categoryId} onChange={e => { setLinkForm({...linkForm, categoryId: e.target.value, subCategoryId: ''}); setLinkErrors({...linkErrors, categoryId: ''}) }} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                           <option value="">{t.admin.link.selectCategory}</option>
                                           {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.subCategory}</label>
                                       <select value={linkForm.subCategoryId} onChange={e => setLinkForm({...linkForm, subCategoryId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                           <option value="">{t.admin.link.general}</option>
                                           {data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                       </select>
                                   </div>

                                   {/* Icon Upload (Added back) */}
                                   <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.icon}</label>
                                      <div className="flex gap-4 items-center">
                                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 dark:bg-slate-800 dark:border-slate-700">
                                              {linkForm.iconUrl ? <img src={linkForm.iconUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                                          </div>
                                          <div className="flex-1 space-y-2">
                                              <input type="text" placeholder="https://..." value={linkForm.iconUrl} onChange={e => setLinkForm({...linkForm, iconUrl: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                              <div className="flex gap-2">
                                                <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300">
                                                    {t.admin.link.uploadOrPaste}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setLinkForm({...linkForm, iconUrl: url}))} />
                                                </label>
                                                {linkForm.iconUrl && <button onClick={() => setLinkForm({...linkForm, iconUrl: ''})} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md">Clear</button>}
                                              </div>
                                          </div>
                                      </div>
                                   </div>

                                   <div className="md:col-span-2">
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.description}</label>
                                       <textarea value={linkForm.description} onChange={e => setLinkForm({...linkForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white h-20" />
                                   </div>

                                   {/* Tags */}
                                   <div className="md:col-span-2">
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.tags}</label>
                                       <div className="flex gap-2 mb-2">
                                           <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Type and press Enter" />
                                           <button onClick={handleAddTag} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">{t.admin.link.addTag}</button>
                                       </div>
                                       <div className="flex flex-wrap gap-2">
                                           {linkForm.tags?.map(tag => (
                                               <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                                                   #{tag} <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                                               </span>
                                           ))}
                                       </div>
                                   </div>

                                   <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                       <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800">{t.admin.category.cancel}</button>
                                       <button onClick={handleSaveLink} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">{linkForm.id ? t.admin.link.update : t.admin.link.create}</button>
                                   </div>
                               </div>
                           )}

                           {linkMode === 'bulk' && (
                               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                   <div className="grid grid-cols-2 gap-4">
                                       <div>
                                           <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.category}</label>
                                           <select value={linkForm.categoryId} onChange={e => setLinkForm({...linkForm, categoryId: e.target.value, subCategoryId: ''})} className="w-full px-3 py-2 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                               <option value="">{t.admin.link.selectCategory}</option>
                                               {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                           </select>
                                       </div>
                                       <div>
                                           <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.subCategory}</label>
                                           <select value={linkForm.subCategoryId} onChange={e => setLinkForm({...linkForm, subCategoryId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                               <option value="">{t.admin.link.general}</option>
                                               {data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                           </select>
                                       </div>
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.bulk.label}</label>
                                       <textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} placeholder={t.admin.link.bulk.placeholder} className="w-full h-48 px-3 py-2 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono text-sm" />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.link.bulk.defaultTitle}</label>
                                       <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} placeholder={t.admin.link.bulk.defaultTitlePlaceholder} className="w-full px-3 py-2 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                   </div>
                                   <div className="flex justify-end pt-4">
                                       <button onClick={handleBulkImport} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t.admin.link.bulk.import}</button>
                                   </div>
                               </div>
                           )}

                           {linkMode === 'icons' && (
                              <div className="flex flex-col lg:flex-row gap-6 h-[600px] animate-in fade-in slide-in-from-bottom-2">
                                  <div className="w-full lg:w-1/3 flex flex-col gap-4">
                                      <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-slate-100 transition-colors relative dark:bg-slate-800/50 dark:border-slate-700">
                                          <input type="file" multiple accept="image/*" onChange={handleLinkBulkIconUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                          <p className="text-sm text-slate-500">{t.admin.link.bulkIcons.drop}</p>
                                      </div>
                                      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-4 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 grid grid-cols-4 content-start gap-2">
                                          {linkBulkIcons.map(icon => (
                                              <div key={icon.id} onClick={() => setSelectedLinkBulkIconId(selectedLinkBulkIconId === icon.id ? null : icon.id)} className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer relative group ${selectedLinkBulkIconId === icon.id ? 'border-indigo-500 ring-2 ring-indigo-200' : icon.assignedId ? 'border-green-500 opacity-50' : 'border-slate-200 hover:border-slate-300 dark:border-slate-600'}`}>
                                                  <img src={icon.preview} className="w-full h-full object-cover" />
                                                  {icon.assignedId && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>}
                                                  {icon.assignedId && (
                                                      <button onClick={(e) => handleUnassignLinkIcon(e, icon.id)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col dark:border-slate-700">
                                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center dark:bg-slate-800 dark:border-slate-700">
                                          <h4 className="font-semibold text-sm dark:text-white">{t.admin.link.bulkIcons.assigned}</h4>
                                          <button onClick={handleApplyLinkBulkIcons} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">{t.admin.link.bulkIcons.apply}</button>
                                      </div>
                                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {data.links.map(link => {
                                              const assignedIcon = linkBulkIcons.find(i => i.assignedId === link.id);
                                              return (
                                                  <div key={link.id} onClick={() => handleAssignIconToLink(link.id)} className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${assignedIcon ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-slate-100 hover:border-indigo-300 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                                                      {assignedIcon ? <img src={assignedIcon.preview} className="w-8 h-8 rounded-md object-cover" /> : (link.iconUrl ? <img src={link.iconUrl} className="w-8 h-8 rounded-md object-cover opacity-50 grayscale" /> : <div className="w-8 h-8 bg-slate-100 rounded-md dark:bg-slate-700" />)}
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-sm font-medium truncate dark:text-slate-200">{link.title}</p>
                                                          <p className="text-xs text-slate-400 truncate">{link.url}</p>
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>
                              </div>
                           )}
                      </div>
                  )}

                  {/* === TAB: CATEGORY === */}
                  {activeTab === 'category' && (
                      <div className="max-w-4xl mx-auto">
                          {catEditingId === null ? (
                              <div className="space-y-6">
                                  <div className="flex justify-between items-center">
                                      <h2 className="text-xl font-bold dark:text-white">{t.admin.category.existing}</h2>
                                      <button onClick={() => { setCatEditingId('new'); setCatForm({id: null, name: '', icon: ''}); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                                          <Plus className="w-4 h-4" /> {t.admin.category.new}
                                      </button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-4">
                                      {data.categories.map(cat => (
                                          <div key={cat.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                                              <div className="flex items-center justify-between mb-4">
                                                  <div className="flex items-center gap-3">
                                                      {cat.icon ? <img src={cat.icon} className="w-8 h-8 object-contain" /> : <Folder className="w-8 h-8 text-indigo-500" />}
                                                      <span className="font-bold text-lg dark:text-white">{cat.name}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                      <button onClick={() => { setCatEditingId(cat.id); setCatForm({id: cat.id, name: cat.name, icon: cat.icon || ''}); }} className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors dark:hover:bg-slate-700"><Edit2 className="w-4 h-4" /></button>
                                                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:bg-white hover:text-red-600 rounded-lg transition-colors dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                                                  </div>
                                              </div>
                                              
                                              {/* Subcategories */}
                                              <div className="pl-4 ml-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                                                  {cat.subCategories.map(sub => (
                                                      <div key={sub.id} className="flex items-center justify-between text-sm group">
                                                          <span className="text-slate-600 dark:text-slate-400">{sub.name}</span>
                                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                              <button onClick={() => { setSubCatEditingId(sub.id); setSubCatForm({parentId: cat.id, id: sub.id, name: sub.name}); }} className="p-1 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                                              <button onClick={() => handleDeleteSubCategory(cat.id, sub.id)} className="p-1 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                          </div>
                                                      </div>
                                                  ))}
                                                  <button onClick={() => { setSubCatEditingId('new'); setSubCatForm({parentId: cat.id, id: null, name: ''}); }} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-2">
                                                      <Plus className="w-3 h-3" /> {t.admin.category.addSub}
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ) : (
                              <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                                  <h3 className="font-bold mb-4 dark:text-white">{catEditingId === 'new' ? t.admin.category.new : t.admin.category.edit}</h3>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t.admin.category.name}</label>
                                          <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t.admin.category.icon} (URL/Upload)</label>
                                          <div className="flex gap-2">
                                              <input type="text" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                                              <label className="px-3 py-2 bg-slate-200 rounded-lg cursor-pointer hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">
                                                  <Upload className="w-4 h-4" />
                                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setCatForm({...catForm, icon: url}))} />
                                              </label>
                                          </div>
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2">
                                          <button onClick={() => setCatEditingId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg dark:text-slate-300 dark:hover:bg-slate-700">{t.admin.category.cancel}</button>
                                          <button onClick={handleSaveCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{catEditingId === 'new' ? t.admin.category.create : t.admin.category.update}</button>
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          {/* Sub Category Modal (Simple Overlay) */}
                          {subCatEditingId && (
                              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                  <div className="bg-white p-6 rounded-xl shadow-xl w-96 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                      <h3 className="font-bold mb-4 dark:text-white">{subCatEditingId === 'new' ? t.admin.category.addSub : t.admin.category.editSub}</h3>
                                      <input type="text" value={subCatForm.name} onChange={e => setSubCatForm({...subCatForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg mb-4 dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Name" />
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => setSubCatEditingId(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded dark:text-slate-400 dark:hover:bg-slate-700">{t.admin.category.cancel}</button>
                                          <button onClick={handleSaveSubCategory} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">{t.admin.category.create}</button>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* === TAB: CLOUD === */}
                  {activeTab === 'cloud' && (
                     <div className="max-w-xl mx-auto space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">{t.admin.cloud.enable}</h4>
                                <p className="text-xs text-slate-500 mt-1">{t.admin.cloud.desc}</p>
                            </div>
                            <button 
                                onClick={() => setLocalCloudConfig(prev => ({ ...prev, enabled: !prev.enabled }))} 
                                className={`w-12 h-6 rounded-full transition-colors relative ${localCloudConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localCloudConfig.enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {localCloudConfig.enabled && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-slate-300">{t.admin.cloud.provider}</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['github', 'notion', 'webdav'].map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => setLocalCloudConfig({...localCloudConfig, activeProvider: p as any})}
                                                className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize ${localCloudConfig.activeProvider === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {localCloudConfig.activeProvider === 'github' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.github.tokenLabel}</label>
                                            <input type="password" value={localCloudConfig.githubToken} onChange={e => setLocalCloudConfig({...localCloudConfig, githubToken: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.github.gistLabel}</label>
                                            <input type="text" value={localCloudConfig.gistId} onChange={e => setLocalCloudConfig({...localCloudConfig, gistId: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.cloud.github.gistPlaceholder} />
                                        </div>
                                    </div>
                                )}

                                {localCloudConfig.activeProvider === 'notion' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.notion.tokenLabel}</label>
                                            <input type="password" value={localCloudConfig.notionToken} onChange={e => setLocalCloudConfig({...localCloudConfig, notionToken: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.cloud.notion.tokenPlaceholder} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.notion.pageLabel}</label>
                                            <input type="text" value={localCloudConfig.notionPageId} onChange={e => setLocalCloudConfig({...localCloudConfig, notionPageId: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.cloud.notion.pagePlaceholder} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.notion.apiUrlLabel}</label>
                                            <input type="text" value={localCloudConfig.notionApiUrl || ''} onChange={e => setLocalCloudConfig({...localCloudConfig, notionApiUrl: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.cloud.notion.apiUrlPlaceholder} />
                                            <p className="text-xs text-amber-500 mt-1">{t.admin.cloud.providerWarning}</p>
                                        </div>
                                    </div>
                                )}

                                {localCloudConfig.activeProvider === 'webdav' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.webdav.urlLabel}</label>
                                            <input type="text" value={localCloudConfig.webdavUrl || ''} onChange={e => setLocalCloudConfig({...localCloudConfig, webdavUrl: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.cloud.webdav.urlPlaceholder} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.webdav.userLabel}</label>
                                            <input type="text" value={localCloudConfig.webdavUsername || ''} onChange={e => setLocalCloudConfig({...localCloudConfig, webdavUsername: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.admin.cloud.webdav.pwdLabel}</label>
                                            <input type="password" value={localCloudConfig.webdavPassword || ''} onChange={e => setLocalCloudConfig({...localCloudConfig, webdavPassword: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <p className="text-xs text-amber-500">{t.admin.cloud.webdavWarning}</p>
                                    </div>
                                )}

                                <button onClick={handleSaveCloudConfig} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600">{t.admin.cloud.saveConfig}</button>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                                   <button onClick={() => onSyncUpload(localCloudConfig)} className="py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                                     <Upload className="w-4 h-4" /> {t.admin.cloud.upload}
                                   </button>
                                   <button onClick={() => onSyncDownload(localCloudConfig)} className="py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                                     <Download className="w-4 h-4" /> {t.admin.cloud.download}
                                   </button>
                                </div>
                            </div>
                        )}
                     </div>
                  )}

                  {/* === TAB: SETTINGS === */}
                  {activeTab === 'settings' && (
                      <div className="max-w-xl mx-auto space-y-6">
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.settings.siteName}</label>
                                   <input type="text" value={siteForm.title} onChange={e => setSiteForm({...siteForm, title: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                               </div>
                               <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.settings.logo}</label>
                                   <div className="flex gap-3">
                                       <input type="text" value={siteForm.logoUrl} onChange={e => setSiteForm({...siteForm, logoUrl: e.target.value})} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.settings.placeholderUrl} />
                                       {siteForm.logoUrl && <img src={siteForm.logoUrl} className="w-10 h-10 object-contain border rounded bg-slate-50" />}
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.settings.favicon}</label>
                                   <div className="flex gap-3">
                                       <input type="text" value={siteForm.faviconUrl} onChange={e => setSiteForm({...siteForm, faviconUrl: e.target.value})} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.settings.placeholderUrl} />
                                       {siteForm.faviconUrl && <img src={siteForm.faviconUrl} className="w-10 h-10 object-contain border rounded bg-slate-50" />}
                                   </div>
                               </div>
                               
                               {/* Background Image Setting */}
                               <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                   <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{t.admin.settings.background} <span className="text-xs font-normal text-slate-400">({t.app.theme.custom})</span></label>
                                   <div className="flex flex-col gap-3">
                                       <div className="flex gap-3">
                                          <input type="text" value={siteForm.backgroundUrl || ''} onChange={e => setSiteForm({...siteForm, backgroundUrl: e.target.value})} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="https://..." />
                                          <label className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap">
                                              <Upload className="w-4 h-4 inline mr-2" /> Upload
                                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setSiteForm({...siteForm, backgroundUrl: url}))} />
                                          </label>
                                       </div>
                                       {siteForm.backgroundUrl && (
                                           <div className="w-full h-32 rounded-lg bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url(${siteForm.backgroundUrl})` }} />
                                       )}
                                   </div>
                               </div>
                           </div>
                           <button onClick={handleSaveSiteConfig} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">{t.admin.settings.save}</button>
                      </div>
                  )}

                  {/* === TAB: DATA === */}
                  {activeTab === 'data' && (
                     <div className="max-w-xl mx-auto grid grid-cols-1 gap-6">
                         <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center space-y-4 dark:bg-slate-800 dark:border-slate-700">
                             <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"><Download className="w-6 h-6" /></div>
                             <div>
                                 <h4 className="font-bold text-slate-800 dark:text-white">{t.admin.data.exportTitle}</h4>
                                 <p className="text-sm text-slate-500">{t.admin.data.exportDesc}</p>
                             </div>
                             <button onClick={handleExportData} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600">{t.admin.data.exportBtn}</button>
                         </div>
                         <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center space-y-4 dark:bg-slate-800 dark:border-slate-700">
                             <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"><Upload className="w-6 h-6" /></div>
                             <div>
                                 <h4 className="font-bold text-slate-800 dark:text-white">{t.admin.data.importTitle}</h4>
                                 <p className="text-sm text-slate-500">{t.admin.data.importDesc}</p>
                             </div>
                             <label className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
                                 {t.admin.data.importBtn}
                                 <input type="file" accept=".json,.html" onChange={(e) => {
                                     if(e.target.files?.[0]?.name.endsWith('.html')) handleImportData(e);
                                     else handleImportJson(e);
                                 }} className="hidden" />
                             </label>
                         </div>
                     </div>
                  )}

              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminModal;
