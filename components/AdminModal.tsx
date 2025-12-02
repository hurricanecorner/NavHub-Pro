import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Save, Upload, AlertCircle, Edit2, Trash2, CornerDownRight, Folder, ListPlus, FileText, Images, ArrowRight, Check, Undo2, Tag, Download, FileJson } from 'lucide-react';
import { AppData, Category, LinkItem, NotionConfig, SubCategory } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  notionConfig: NotionConfig;
  onUpdateNotionConfig: (config: NotionConfig) => void;
  onSyncNotion: () => void;
  isSyncing: boolean;
  editingItem: LinkItem | null; 
  t: any;
}

type Tab = 'link' | 'category' | 'notion' | 'data';
type LinkMode = 'single' | 'bulk';

interface BulkIconUpload {
  id: string;
  preview: string;
  assignedCatId: string | null;
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, onClose, data, onUpdateData, notionConfig, onUpdateNotionConfig, onSyncNotion, isSyncing, editingItem, t
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  
  // Link Form State
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({
    title: '', url: '', description: '', categoryId: '', subCategoryId: '', iconUrl: '', tags: []
  });
  const [linkErrors, setLinkErrors] = useState<{ title?: string; url?: string; categoryId?: string }>({});
  
  // Tag Inputs
  const [tagInput, setTagInput] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Bulk Import State
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState('');

  // Category Form State
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ 
    id: null, name: '', icon: '' 
  });
  
  // SubCategory Form State (Unified for Add/Edit)
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({
    parentId: '', id: null, name: ''
  });
  
  // Bulk Icon Upload State
  const [bulkIcons, setBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedBulkIconId, setSelectedBulkIconId] = useState<string | null>(null);

  // Undo State
  const [lastBulkActionData, setLastBulkActionData] = useState<AppData | null>(null);

  // Notion Form State
  const [localNotionConfig, setLocalNotionConfig] = useState<NotionConfig>(notionConfig);

  // Get all unique tags from existing links for suggestions
  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    data.links.forEach(link => {
      if (link.tags) {
        link.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [data.links]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setLinkForm({ ...editingItem, tags: editingItem.tags || [] });
        setActiveTab('link');
        setLinkMode('single'); // Always single mode when editing
      } else {
        // Reset link form
        setLinkForm({ title: '', url: '', description: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', tags: [] });
      }
      setLocalNotionConfig(notionConfig);
      // Reset forms
      setCatForm({ id: null, name: '', icon: '' });
      setSubCatForm({ parentId: '', id: null, name: '' });
      setLinkErrors({});
      setBulkUrls('');
      setBulkDefaultTitle('');
      setBulkIcons([]);
      setSelectedBulkIconId(null);
      setLastBulkActionData(null); // Reset undo history on open
      setTagInput('');
      setBulkTags([]);
      setBulkTagInput('');
    }
  }, [isOpen, editingItem, data, notionConfig]);

  // Handle Image Upload (Generic)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (result: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSuccess(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Bulk Icon Uploads
  const handleBulkIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBulkIcons(prev => [
            ...prev, 
            { 
              id: Math.random().toString(36).substr(2, 9), 
              preview: reader.result as string, 
              assignedCatId: null 
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleApplyBulkIcons = () => {
    const assignments = bulkIcons.filter(item => item.assignedCatId);
    if (assignments.length === 0) return;

    // Save state for undo
    setLastBulkActionData({ ...data });

    const updatedCategories = data.categories.map(cat => {
      const assignment = assignments.find(a => a.assignedCatId === cat.id);
      if (assignment) {
        return { ...cat, icon: assignment.preview };
      }
      return cat;
    });

    onUpdateData({ ...data, categories: updatedCategories });
    setBulkIcons([]);
    alert(t.admin.category.bulkIcons.apply + " Success!");
  };

  const handleBulkIconClick = (iconId: string) => {
    setSelectedBulkIconId(prev => prev === iconId ? null : iconId);
  };

  const handleAssignIconToCategory = (catId: string) => {
    if (!selectedBulkIconId) return;

    // 1. If this category already has a pending bulk icon assigned, unassign it first
    // 2. Assign the selected icon to this category
    // 3. Clear the selection
    setBulkIcons(prev => prev.map(icon => {
      // Unassign any icon currently on this category
      if (icon.assignedCatId === catId) {
        return { ...icon, assignedCatId: null };
      }
      // Assign the selected icon
      if (icon.id === selectedBulkIconId) {
        return { ...icon, assignedCatId: catId };
      }
      return icon;
    }));
    
    setSelectedBulkIconId(null);
  };

  const handleUnassignIcon = (e: React.MouseEvent, iconId: string) => {
    e.stopPropagation();
    setBulkIcons(prev => prev.map(icon => 
      icon.id === iconId ? { ...icon, assignedCatId: null } : icon
    ));
  };

  // --- Tag Logic ---

  const handleAddTag = (tag: string, isBulk = false) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    
    // Case-insensitive check
    const isDuplicate = (tags: string[]) => tags.some(t => t.toLowerCase() === cleanTag.toLowerCase());

    if (isBulk) {
      if (isDuplicate(bulkTags)) {
        alert(t.admin.link.validation.tagExists || "Tag already exists!");
        return;
      }
      setBulkTags([...bulkTags, cleanTag]);
      setBulkTagInput('');
    } else {
      const currentTags = linkForm.tags || [];
      if (isDuplicate(currentTags)) {
        alert(t.admin.link.validation.tagExists || "Tag already exists!");
        return;
      }
      setLinkForm({ ...linkForm, tags: [...currentTags, cleanTag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string, isBulk = false) => {
    if (isBulk) {
      setBulkTags(bulkTags.filter(t => t !== tag));
    } else {
      const currentTags = linkForm.tags || [];
      setLinkForm({ ...linkForm, tags: currentTags.filter(t => t !== tag) });
    }
  };

  const validateLink = (): boolean => {
    const errors: { title?: string; url?: string; categoryId?: string } = {};
    let isValid = true;

    if (!linkForm.title?.trim()) {
      errors.title = t.admin.link.validation.titleRequired;
      isValid = false;
    }

    if (!linkForm.url?.trim()) {
      errors.url = t.admin.link.validation.urlRequired;
      isValid = false;
    } 

    if (!linkForm.categoryId) {
      errors.categoryId = t.admin.link.validation.categoryRequired;
      isValid = false;
    }

    setLinkErrors(errors);
    return isValid;
  };

  const handleSaveLink = () => {
    if (!validateLink()) return;

    // Auto-prepend https:// if missing
    let finalUrl = linkForm.url?.trim() || '';
    if (finalUrl && !/^(https?:\/\/)/i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    let updatedLinks = [...data.links];
    
    if (editingItem) {
       updatedLinks = updatedLinks.map(l => l.id === editingItem.id ? { ...l, ...linkForm, url: finalUrl } as LinkItem : l);
    } else {
      const newLink: LinkItem = {
        id: Date.now().toString(),
        title: linkForm.title || '',
        url: finalUrl,
        description: linkForm.description || '',
        categoryId: linkForm.categoryId || '',
        subCategoryId: linkForm.subCategoryId || (data.categories.find(c => c.id === linkForm.categoryId)?.subCategories[0]?.id || ''),
        iconUrl: linkForm.iconUrl,
        tags: linkForm.tags || [],
      };
      updatedLinks.push(newLink);
    }

    onUpdateData({ ...data, links: updatedLinks });
    onClose();
  };

  const handleBulkImport = () => {
    if (!linkForm.categoryId) {
      setLinkErrors({ ...linkErrors, categoryId: t.admin.link.validation.categoryRequired });
      return;
    }

    const lines = bulkUrls.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      alert(t.admin.link.bulk.error);
      return;
    }

    // Save state for undo
    setLastBulkActionData({ ...data });

    const newLinks: LinkItem[] = [];
    const baseId = Date.now();

    lines.forEach((line, index) => {
      let url = line;
      if (!/^(https?:\/\/)/i.test(url)) {
        url = `https://${url}`;
      }

      // Infer title from URL if not provided
      let title = bulkDefaultTitle;
      if (!title) {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          // Remove www.
          const cleanHost = hostname.replace(/^www\./, '');
          
          // Get the domain name (e.g. "google" from "google.com")
          const domainSegment = cleanHost.split('.')[0];
          
          // Capitalize first letter
          if (domainSegment) {
            title = domainSegment.charAt(0).toUpperCase() + domainSegment.slice(1);
          } else {
            title = "Link";
          }
        } catch (e) {
          // If URL parsing fails, fallback to "Link" or truncated line
          title = "Link";
        }
      }

      newLinks.push({
        id: `${baseId}-${index}`,
        title: title,
        url: url,
        description: '',
        categoryId: linkForm.categoryId || '',
        subCategoryId: linkForm.subCategoryId || (data.categories.find(c => c.id === linkForm.categoryId)?.subCategories[0]?.id || ''),
        iconUrl: '',
        tags: [...bulkTags] // Copy bulk tags to each item
      });
    });

    onUpdateData({ ...data, links: [...data.links, ...newLinks] });
    
    setBulkUrls(''); // Clear input on success
    setBulkTags([]); // Clear tags
    setBulkDefaultTitle('');
    alert(t.admin.link.bulk.success.replace('{count}', newLinks.length));
    // Do NOT close modal, allow Undo
  };

  const handleUndo = () => {
    if (lastBulkActionData) {
      onUpdateData(lastBulkActionData);
      setLastBulkActionData(null);
      alert(t.admin.undoSuccess);
    }
  };

  // --- Category Logic ---

  const handleEditCategory = (cat: Category) => {
    setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm(t.admin.category.deleteConfirm)) {
      const updatedCategories = data.categories.filter(c => c.id !== id);
      // Remove or unlink links associated with this category
      const updatedLinks = data.links.filter(l => l.categoryId !== id);
      onUpdateData({ categories: updatedCategories, links: updatedLinks });
    }
  };

  const handleSaveCategory = () => {
    if (!catForm.name) return;

    let updatedCategories = [...data.categories];

    if (catForm.id) {
      // Edit existing
      updatedCategories = updatedCategories.map(c => 
        c.id === catForm.id 
          ? { ...c, name: catForm.name, icon: catForm.icon } 
          : c
      );
    } else {
      // Add new
      const newCat: Category = {
        id: `c-${Date.now()}`,
        name: catForm.name,
        icon: catForm.icon,
        subCategories: []
      };
      updatedCategories.push(newCat);
    }
    
    onUpdateData({ ...data, categories: updatedCategories });
    setCatForm({ id: null, name: '', icon: '' });
  };

  // --- SubCategory Logic ---

  const handleEditSubCategory = (parentId: string, subCat: SubCategory) => {
    setSubCatForm({ parentId, id: subCat.id, name: subCat.name });
  };

  const handleDeleteSubCategory = (parentId: string, subId: string) => {
    if (window.confirm(t.admin.category.deleteSubConfirm)) {
      // 1. Remove subcategory from parent category
      const updatedCategories = data.categories.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            subCategories: c.subCategories.filter(sc => sc.id !== subId)
          };
        }
        return c;
      });

      // 2. Remove categoryId and subCategoryId from associated links (orphaning them from view)
      const updatedLinks = data.links.map(l => {
        if (l.categoryId === parentId && l.subCategoryId === subId) {
          return { ...l, categoryId: '', subCategoryId: '' };
        }
        return l;
      });

      onUpdateData({ categories: updatedCategories, links: updatedLinks });
    }
  };

  const handleSaveSubCategory = () => {
    if (!subCatForm.name || !subCatForm.parentId) return;

    let updatedCategories = [...data.categories];
    const parentIndex = updatedCategories.findIndex(c => c.id === subCatForm.parentId);
    
    if (parentIndex === -1) return;

    if (subCatForm.id) {
      // Edit existing
      const updatedSubCats = updatedCategories[parentIndex].subCategories.map(sc => 
        sc.id === subCatForm.id ? { ...sc, name: subCatForm.name } : sc
      );
      updatedCategories[parentIndex] = { ...updatedCategories[parentIndex], subCategories: updatedSubCats };
    } else {
      // Add new
      const newSubCat: SubCategory = { id: `sc-${Date.now()}`, name: subCatForm.name };
      updatedCategories[parentIndex] = {
        ...updatedCategories[parentIndex],
        subCategories: [...updatedCategories[parentIndex].subCategories, newSubCat]
      };
    }

    onUpdateData({ ...data, categories: updatedCategories });
    setSubCatForm({ parentId: '', id: null, name: '' });
  };


  const handleSaveNotion = () => {
    onUpdateNotionConfig(localNotionConfig);
    alert(t.admin.notion.saved);
  };

  // --- Data Import/Export Logic ---

  const handleExportData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `navhub_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // Basic validation
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.links)) {
          if (window.confirm(t.admin.data.confirm)) {
            onUpdateData(parsed);
            alert(t.admin.data.success);
            onClose();
          }
        } else {
          alert(t.admin.data.error);
        }
      } catch (err) {
        alert(t.admin.data.error);
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be selected again if needed
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] dark:bg-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {editingItem ? t.admin.editLink : t.admin.title}
            </h2>
            {/* Undo Button */}
            {lastBulkActionData && (
              <button 
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium hover:bg-amber-100 border border-amber-200 transition-colors dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                title={t.admin.undo}
              >
                <Undo2 className="w-3.5 h-3.5" />
                {t.admin.undo}
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition dark:hover:bg-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {!editingItem && (
          <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('link')} 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors min-w-[80px] ${activeTab === 'link' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {t.admin.tabs.addLink}
            </button>
            <button 
              onClick={() => setActiveTab('category')} 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors min-w-[80px] ${activeTab === 'category' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {t.admin.tabs.categories}
            </button>
            <button 
              onClick={() => setActiveTab('notion')} 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors min-w-[80px] ${activeTab === 'notion' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {t.admin.tabs.notion}
            </button>
            <button 
              onClick={() => setActiveTab('data')} 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors min-w-[80px] ${activeTab === 'data' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {t.admin.tabs.data}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          
          {/* LINK TAB */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              
              {/* Mode Toggle (Single vs Bulk) - Only when not editing */}
              {!editingItem && (
                <div className="flex p-1 bg-slate-100 rounded-lg mb-4 dark:bg-slate-700">
                  <button 
                    onClick={() => setLinkMode('single')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${linkMode === 'single' ? 'bg-white shadow text-indigo-600 dark:bg-slate-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {t.admin.link.modes.single}
                  </button>
                  <button 
                    onClick={() => setLinkMode('bulk')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${linkMode === 'bulk' ? 'bg-white shadow text-indigo-600 dark:bg-slate-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    {t.admin.link.modes.bulk}
                  </button>
                </div>
              )}

              {/* SINGLE MODE */}
              {linkMode === 'single' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.title} <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition dark:bg-slate-700 dark:text-white ${linkErrors.title ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200 dark:border-slate-600'}`}
                        placeholder="e.g. Google"
                        value={linkForm.title}
                        onChange={(e) => {
                          setLinkForm({ ...linkForm, title: e.target.value });
                          if(linkErrors.title) setLinkErrors({...linkErrors, title: undefined});
                        }}
                      />
                      {linkErrors.title && <p className="text-red-500 text-xs mt-1">{linkErrors.title}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.url} <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition dark:bg-slate-700 dark:text-white ${linkErrors.url ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200 dark:border-slate-600'}`}
                        placeholder="google.com"
                        value={linkForm.url}
                        onChange={(e) => {
                          setLinkForm({ ...linkForm, url: e.target.value });
                          if(linkErrors.url) setLinkErrors({...linkErrors, url: undefined});
                        }}
                      />
                      {linkErrors.url && <p className="text-red-500 text-xs mt-1">{linkErrors.url}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.category} <span className="text-red-500">*</span></label>
                      <select 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white ${linkErrors.categoryId ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}`}
                        value={linkForm.categoryId}
                        onChange={(e) => {
                          setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' });
                          if(linkErrors.categoryId) setLinkErrors({...linkErrors, categoryId: undefined});
                        }}
                      >
                        {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {linkErrors.categoryId && <p className="text-red-500 text-xs mt-1">{linkErrors.categoryId}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.subCategory}</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        value={linkForm.subCategoryId}
                        onChange={(e) => setLinkForm({ ...linkForm, subCategoryId: e.target.value })}
                        disabled={!linkForm.categoryId}
                      >
                        <option value="">{t.admin.link.selectCategory}</option>
                        {data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => (
                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.description}</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      rows={2}
                      placeholder="..."
                      value={linkForm.description}
                      onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                    />
                  </div>

                  {/* Tags Section (Single) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.tags}</label>
                    
                    {/* Input Area */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
                          placeholder="Add a tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => handleAddTag(tagInput)}
                        disabled={!tagInput.trim()}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 text-xs font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        {t.admin.link.addTag}
                      </button>
                    </div>

                    {/* Selected Tags */}
                    {linkForm.tags && linkForm.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {linkForm.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-900/30 dark:text-indigo-300">
                            #{tag}
                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {existingTags.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-medium">{t.admin.link.suggestedTags}</p>
                        <div className="flex flex-wrap gap-1.5">
                           {existingTags.filter(t => !linkForm.tags?.includes(t)).slice(0, 10).map(tag => (
                             <button
                               key={tag}
                               onClick={() => handleAddTag(tag)}
                               className="px-2 py-0.5 rounded border border-slate-200 text-slate-500 text-[10px] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                             >
                               #{tag}
                             </button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.icon}</label>
                    <div className="flex gap-4 items-center">
                      <div className="relative group w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 dark:bg-slate-700 dark:border-slate-600">
                        {linkForm.iconUrl ? (
                          <img src={linkForm.iconUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-400" />
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleImageUpload(e, (res) => setLinkForm({ ...linkForm, iconUrl: res }))}
                        />
                      </div>
                      <input 
                        type="text" 
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        placeholder={t.admin.link.uploadOrPaste}
                        value={linkForm.iconUrl}
                        onChange={(e) => setLinkForm({ ...linkForm, iconUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveLink}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingItem ? t.admin.link.update : t.admin.link.create}
                  </button>
                </>
              )}

              {/* BULK MODE */}
              {linkMode === 'bulk' && !editingItem && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.category} <span className="text-red-500">*</span></label>
                      <select 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white ${linkErrors.categoryId ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}`}
                        value={linkForm.categoryId}
                        onChange={(e) => {
                          setLinkForm({ ...linkForm, categoryId: e.target.value, subCategoryId: '' });
                          if(linkErrors.categoryId) setLinkErrors({...linkErrors, categoryId: undefined});
                        }}
                      >
                        {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {linkErrors.categoryId && <p className="text-red-500 text-xs mt-1">{linkErrors.categoryId}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.subCategory}</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        value={linkForm.subCategoryId}
                        onChange={(e) => setLinkForm({ ...linkForm, subCategoryId: e.target.value })}
                        disabled={!linkForm.categoryId}
                      >
                        <option value="">{t.admin.link.selectCategory}</option>
                        {data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => (
                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.bulk.label}</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:bg-slate-700 dark:text-white dark:border-slate-600 font-mono text-sm"
                      rows={6}
                      placeholder={t.admin.link.bulk.placeholder}
                      value={bulkUrls}
                      onChange={(e) => setBulkUrls(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.bulk.defaultTitle}</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      placeholder={t.admin.link.bulk.defaultTitlePlaceholder}
                      value={bulkDefaultTitle}
                      onChange={(e) => setBulkDefaultTitle(e.target.value)}
                    />
                  </div>

                  {/* Tags Section (Bulk) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.link.tags}</label>
                    
                    {/* Input Area */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
                          placeholder="Add tag for all..."
                          value={bulkTagInput}
                          onChange={(e) => setBulkTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(bulkTagInput, true);
                            }
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => handleAddTag(bulkTagInput, true)}
                        disabled={!bulkTagInput.trim()}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 text-xs font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        {t.admin.link.addTag}
                      </button>
                    </div>

                    {/* Selected Tags */}
                    {bulkTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {bulkTags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-900/30 dark:text-indigo-300">
                            #{tag}
                            <button onClick={() => handleRemoveTag(tag, true)} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {existingTags.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-medium">{t.admin.link.suggestedTags}</p>
                        <div className="flex flex-wrap gap-1.5">
                           {existingTags.filter(t => !bulkTags.includes(t)).slice(0, 10).map(tag => (
                             <button
                               key={tag}
                               onClick={() => handleAddTag(tag, true)}
                               className="px-2 py-0.5 rounded border border-slate-200 text-slate-500 text-[10px] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                             >
                               #{tag}
                             </button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleBulkImport}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ListPlus className="w-4 h-4" />
                    {t.admin.link.bulk.import}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY TAB */}
          {activeTab === 'category' && (
            <div className="space-y-8">
              {/* Category Form (Add/Edit) */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100 dark:bg-slate-700/50 dark:border-slate-600">
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide dark:text-slate-200">
                  {catForm.id ? t.admin.category.edit : t.admin.category.new}
                </h3>
                <div className="space-y-3">
                   <div className="flex gap-4">
                     {/* Icon Input */}
                      <div className="space-y-1 shrink-0">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block dark:text-slate-400">{t.admin.category.icon}</label>
                        <div className="relative w-10 h-10 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center overflow-hidden hover:border-indigo-400 hover:bg-indigo-50 transition-all group cursor-pointer dark:bg-slate-600 dark:border-slate-500 dark:hover:bg-slate-500">
                           {catForm.icon ? (
                              <img src={catForm.icon} alt="Icon" className="w-full h-full object-cover" />
                           ) : (
                              <Folder className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors dark:text-slate-400 dark:group-hover:text-indigo-300" />
                           )}
                           <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={(e) => handleImageUpload(e, (res) => setCatForm({ ...catForm, icon: res }))}
                            title="Upload Icon"
                          />
                        </div>
                      </div>
                      
                      {/* Name Input */}
                      <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block dark:text-slate-400">{t.admin.category.name}</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-600 dark:text-white dark:border-slate-500"
                          value={catForm.name}
                          onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        />
                      </div>
                   </div>

                   {/* Icon URL Input (Optional) */}
                   <div className="space-y-1">
                      <input 
                        type="text" 
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white dark:bg-slate-600 dark:text-white dark:border-slate-500"
                        placeholder="Icon URL..."
                        value={catForm.icon}
                        onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                      />
                   </div>
                   
                   <div className="flex gap-2 justify-end pt-2">
                     {catForm.id && (
                       <button 
                        onClick={() => setCatForm({ id: null, name: '', icon: '' })}
                        className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 dark:text-slate-400 dark:hover:text-slate-200"
                       >
                         {t.admin.category.cancel}
                       </button>
                     )}
                     <button 
                        onClick={handleSaveCategory}
                        disabled={!catForm.name}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {catForm.id ? t.admin.category.update : t.admin.category.create}
                      </button>
                   </div>
                </div>
              </div>
              
              {/* Existing Categories List */}
              <div className="space-y-2">
                 <h3 className="font-semibold text-slate-700 text-sm dark:text-slate-300">{t.admin.category.existing}</h3>
                 <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto dark:border-slate-700 dark:divide-slate-700">
                    {data.categories.length === 0 && <p className="p-4 text-slate-400 text-sm text-center">{t.admin.category.noCategories}</p>}
                    {data.categories.map(cat => (
                      <div key={cat.id} className="bg-white group dark:bg-slate-800">
                         {/* Main Category Row */}
                         <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors dark:hover:bg-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 dark:bg-indigo-900/30 dark:border-indigo-800">
                                  {cat.icon ? <img src={cat.icon} className="w-full h-full object-cover" /> : <Folder className="w-4 h-4 text-indigo-400 dark:text-indigo-300" />}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.name}</span>
                                <span className="text-xs text-slate-400">({cat.subCategories.length})</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditCategory(cat)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded dark:hover:bg-slate-600"
                                  title={t.admin.category.edit}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-slate-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                         </div>
                         
                         {/* Sub-Categories List (Nested) */}
                         {cat.subCategories.length > 0 && (
                           <div className="bg-slate-50/50 border-t border-slate-100 pl-14 pr-3 py-2 space-y-1 dark:bg-slate-900/30 dark:border-slate-700">
                              {cat.subCategories.map(sc => (
                                <div key={sc.id} className="flex items-center justify-between group/sub">
                                   <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                      <CornerDownRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                      <span>{sc.name}</span>
                                   </div>
                                   <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleEditSubCategory(cat.id, sc)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded dark:hover:bg-slate-700"
                                        title="Edit Sub-Category"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteSubCategory(cat.id, sc.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-slate-700"
                                        title="Delete Sub-Category"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                   </div>
                                </div>
                              ))}
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>

              {/* Bulk Icon Upload Section */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-700/50 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide dark:text-slate-200">
                     {t.admin.category.bulkIcons.title}
                  </h3>
                  {bulkIcons.length > 0 && (
                    <button 
                       onClick={() => { setBulkIcons([]); setSelectedBulkIconId(null); }}
                       className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                       {t.admin.category.bulkIcons.clear}
                    </button>
                  )}
                </div>
                
                {bulkIcons.length === 0 ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors dark:border-slate-500 dark:hover:bg-slate-600">
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Images className="w-6 h-6 text-slate-400 mb-1" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.admin.category.bulkIcons.drop}</p>
                    </div>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleBulkIconUpload} />
                  </label>
                ) : (
                  <div className="space-y-4">
                     <p className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 text-blue-700 p-2 rounded border border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800">
                       {t.admin.category.bulkIcons.instructions}
                     </p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {/* LEFT: Unassigned Icons */}
                       <div className="bg-white border border-slate-200 rounded-lg p-3 dark:bg-slate-800 dark:border-slate-600 flex flex-col h-64">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 dark:text-slate-500">{t.admin.category.bulkIcons.unassigned}</h4>
                          <div className="flex-1 overflow-y-auto content-start grid grid-cols-4 gap-2">
                            {bulkIcons.filter(i => !i.assignedCatId).map(icon => (
                              <button
                                key={icon.id}
                                onClick={() => handleBulkIconClick(icon.id)}
                                className={`aspect-square rounded-lg border-2 overflow-hidden transition-all relative ${
                                  selectedBulkIconId === icon.id 
                                    ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' 
                                    : 'border-slate-100 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
                                }`}
                              >
                                <img src={icon.preview} className="w-full h-full object-cover" />
                                {selectedBulkIconId === icon.id && (
                                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                                  </div>
                                )}
                              </button>
                            ))}
                            {bulkIcons.filter(i => !i.assignedCatId).length === 0 && (
                              <div className="col-span-4 text-center py-8 text-xs text-slate-400 italic">
                                All icons assigned
                              </div>
                            )}
                          </div>
                       </div>

                       {/* RIGHT: Categories Target */}
                       <div className="bg-white border border-slate-200 rounded-lg p-3 dark:bg-slate-800 dark:border-slate-600 flex flex-col h-64">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 dark:text-slate-500">{t.admin.category.bulkIcons.assigned}</h4>
                          <div className="flex-1 overflow-y-auto space-y-1">
                             {data.categories.map(cat => {
                               const assignedIcon = bulkIcons.find(i => i.assignedCatId === cat.id);
                               return (
                                 <button
                                    key={cat.id}
                                    onClick={() => handleAssignIconToCategory(cat.id)}
                                    disabled={!selectedBulkIconId && !assignedIcon}
                                    className={`w-full flex items-center justify-between p-2 rounded border transition-colors ${
                                      selectedBulkIconId 
                                        ? 'cursor-pointer hover:bg-indigo-50 border-indigo-100 dark:hover:bg-indigo-900/30 dark:border-indigo-800' 
                                        : 'cursor-default border-transparent'
                                    }`}
                                 >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                       <span className="text-xs font-medium text-slate-600 truncate dark:text-slate-300">{cat.name}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                       {/* Slot */}
                                       <div className={`w-8 h-8 rounded border flex items-center justify-center overflow-hidden shrink-0 relative ${
                                         assignedIcon 
                                           ? 'bg-white border-indigo-200 dark:bg-slate-700 dark:border-indigo-500' 
                                           : 'bg-slate-50 border-slate-100 dark:bg-slate-700 dark:border-slate-600'
                                       }`}>
                                          {assignedIcon ? (
                                            <>
                                              <img src={assignedIcon.preview} className="w-full h-full object-cover" />
                                              <div 
                                                onClick={(e) => handleUnassignIcon(e, assignedIcon.id)}
                                                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                              >
                                                <X className="w-4 h-4 text-white" />
                                              </div>
                                            </>
                                          ) : (
                                            cat.icon ? (
                                              <img src={cat.icon} className="w-full h-full object-cover opacity-50 grayscale" title="Current Icon" />
                                            ) : (
                                              <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
                                            )
                                          )}
                                       </div>
                                       {selectedBulkIconId && (
                                          <ArrowRight className="w-3 h-3 text-slate-300" />
                                       )}
                                    </div>
                                 </button>
                               );
                             })}
                          </div>
                       </div>

                     </div>

                     <div className="flex justify-end pt-2">
                        <button 
                           onClick={handleApplyBulkIcons}
                           disabled={bulkIcons.filter(i => i.assignedCatId).length === 0}
                           className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                           {t.admin.category.bulkIcons.apply}
                        </button>
                     </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 my-4 dark:border-slate-700" />

              {/* Sub Categories Add/Edit Form */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm dark:text-slate-300">
                  {subCatForm.id ? t.admin.category.editSub : t.admin.category.addSub}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    value={subCatForm.parentId}
                    onChange={(e) => setSubCatForm({ ...subCatForm, parentId: e.target.value })}
                  >
                    <option value="">{t.admin.category.selectParent}</option>
                    {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      placeholder={t.admin.category.subName}
                      value={subCatForm.name}
                      onChange={(e) => setSubCatForm({ ...subCatForm, name: e.target.value })}
                    />
                    <div className="flex gap-1">
                      {subCatForm.id && (
                        <button 
                          onClick={() => setSubCatForm({ parentId: '', id: null, name: '' })}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500"
                        >
                          {t.admin.category.cancel}
                        </button>
                      )}
                      <button 
                        onClick={handleSaveSubCategory}
                        disabled={!subCatForm.name || !subCatForm.parentId}
                        className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center min-w-[3rem] dark:bg-indigo-600 dark:hover:bg-indigo-700"
                      >
                         {subCatForm.id ? <Save className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTION TAB */}
          {activeTab === 'notion' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  {t.admin.notion.warning}
                  <br className="mb-1"/>
                  <strong>{t.admin.notion.warningNote}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.notion.token}</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="secret_..."
                  value={localNotionConfig.apiKey}
                  onChange={(e) => setLocalNotionConfig({ ...localNotionConfig, apiKey: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">{t.admin.notion.dbId}</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="32 char ID"
                  value={localNotionConfig.databaseId}
                  onChange={(e) => setLocalNotionConfig({ ...localNotionConfig, databaseId: e.target.value })}
                />
              </div>

               <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="enableNotion"
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-500"
                    checked={localNotionConfig.enabled}
                    onChange={(e) => setLocalNotionConfig({ ...localNotionConfig, enabled: e.target.checked })}
                  />
                  <label htmlFor="enableNotion" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.admin.notion.enable}</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSaveNotion}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  {t.admin.notion.save}
                </button>
                <button 
                  onClick={onSyncNotion}
                  disabled={isSyncing || !localNotionConfig.enabled}
                  className="flex-1 bg-black text-white font-medium py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition flex justify-center items-center gap-2 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                >
                  {isSyncing ? t.admin.notion.syncing : (
                    <>
                      <Upload className="w-4 h-4" />
                      {t.admin.notion.sync}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && (
             <div className="space-y-6">
               <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shrink-0 dark:bg-green-900/20">
                       <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1 dark:text-slate-100">{t.admin.data.exportTitle}</h3>
                      <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">{t.admin.data.exportDesc}</p>
                      <button 
                        onClick={handleExportData}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                         <FileJson className="w-4 h-4" />
                         {t.admin.data.exportBtn}
                      </button>
                    </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0 dark:bg-blue-900/20">
                       <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1 dark:text-slate-100">{t.admin.data.importTitle}</h3>
                      <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">{t.admin.data.importDesc}</p>
                      
                      <label className="inline-flex cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium items-center gap-2 transition-colors">
                         <FileJson className="w-4 h-4" />
                         {t.admin.data.importBtn}
                         <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                      </label>
                    </div>
                  </div>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminModal;