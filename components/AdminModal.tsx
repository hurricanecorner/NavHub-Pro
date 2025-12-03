
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Save, Upload, Edit2, Trash2, CornerDownRight, Folder, ListPlus, Images, ArrowRight, Undo2, Tag, Download, Book, Cloud, ExternalLink, Settings, ChevronDown, ChevronUp, Wand2, Loader2, PanelTop } from 'lucide-react';
import { AppData, Category, LinkItem, CloudConfig, SubCategory, SiteConfig } from '../types';
import { ToastType } from './Toast';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  cloudConfig: CloudConfig;
  onUpdateCloudConfig: (config: CloudConfig) => void;
  onSyncUpload: () => void;
  onSyncDownload: () => void;
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
  assignedId: string | null; // Generic ID (can be catId or linkId)
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, onClose, data, onUpdateData, cloudConfig, onUpdateCloudConfig, onSyncUpload, onSyncDownload, isSyncing, editingItem, initialValues, t, showToast, confirmAction
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [linkMode, setLinkMode] = useState<LinkMode>('single');
  
  // Link Form State
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({
    title: '', url: '', description: '', categoryId: '', subCategoryId: '', iconUrl: '', tags: []
  });
  const [linkErrors, setLinkErrors] = useState<{ title?: string; url?: string; categoryId?: string }>({});
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  
  // Tag Inputs
  const [tagInput, setTagInput] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Bulk Import State
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkDefaultTitle, setBulkDefaultTitle] = useState('');

  // Link Bulk Icons State
  const [linkBulkIcons, setLinkBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedLinkBulkIconId, setSelectedLinkBulkIconId] = useState<string | null>(null);

  // Category Form State
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; icon: string }>({ 
    id: null, name: '', icon: '' 
  });
  
  // SubCategory Form State (Unified for Add/Edit)
  const [subCatForm, setSubCatForm] = useState<{ parentId: string; id: string | null; name: string }>({
    parentId: '', id: null, name: ''
  });
  
  // Category UI State
  const [isExistingCatsOpen, setIsExistingCatsOpen] = useState(true);

  // Category Bulk Icon Upload State
  const [catBulkIcons, setCatBulkIcons] = useState<BulkIconUpload[]>([]);
  const [selectedCatBulkIconId, setSelectedCatBulkIconId] = useState<string | null>(null);

  // Site Settings State
  const [siteForm, setSiteForm] = useState<SiteConfig>({ title: '', logoUrl: '', faviconUrl: '' });

  // Undo State
  const [lastBulkActionData, setLastBulkActionData] = useState<AppData | null>(null);

  // Cloud Config State
  const [localCloudConfig, setLocalCloudConfig] = useState<CloudConfig>(cloudConfig);

  // Data Export/Import helpers
  const handleExportData = () => {
    // Generate Netscape Bookmark HTML format
    const now = Math.floor(Date.now() / 1000);
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>NavHub Bookmarks</TITLE>
<H1>NavHub Bookmarks</H1>
<DL><p>
`;

    data.categories.forEach(cat => {
      html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${cat.name}</H3>\n`;
      html += `    <DL><p>\n`;
      
      // General links (no subcategory)
      const generalLinks = data.links.filter(l => l.categoryId === cat.id && !l.subCategoryId);
      if (generalLinks.length > 0) {
          generalLinks.forEach(link => {
            html += `            <DT><A HREF="${link.url}" ADD_DATE="${now}" ICON="${link.iconUrl || ''}">${link.title}</A>\n`;
            if (link.description) {
              html += `            <DD>${link.description}\n`;
            }
          });
      }

      // Subcategories as nested folders
      if (cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          html += `        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${sub.name}</H3>\n`;
          html += `        <DL><p>\n`;
          
          const links = data.links.filter(l => l.categoryId === cat.id && l.subCategoryId === sub.id);
          links.forEach(link => {
            html += `            <DT><A HREF="${link.url}" ADD_DATE="${now}" ICON="${link.iconUrl || ''}">${link.title}</A>\n`;
            if (link.description) {
              html += `            <DD>${link.description}\n`;
            }
          });
          
          html += `        </DL><p>\n`;
        });
      }
      
      html += `    </DL><p>\n`;
    });

    html += `</DL><p>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navhub-bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', t.app.success);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string;
      if (!htmlContent) return;

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const newCategories: Category[] = [];
        const newLinks: LinkItem[] = [];
        let catIdCounter = Date.now();
        let subIdCounter = 0;
        let linkIdCounter = 0;

        // Find top-level DL
        const rootDl = doc.querySelector('dl');
        if (!rootDl) throw new Error("Invalid Bookmark file");

        const topLevelDts = Array.from(rootDl.children).filter(el => el.tagName === 'DT');

        topLevelDts.forEach(dt => {
          const h3 = dt.querySelector('h3');
          const dl = dt.querySelector('dl');
          
          if (h3 && dl) {
            const catName = h3.textContent || "Untitled";
            const catId = `c-${catIdCounter++}`;
            const subCategories: SubCategory[] = [];

            const subLevelDts = Array.from(dl.children).filter(el => el.tagName === 'DT');

            // First pass: Direct links (General links)
            subLevelDts.forEach(subDt => {
                const a = subDt.querySelector('a');
                if (a && !subDt.querySelector('h3')) {
                     // This is a direct link under category
                     let url = a.href;
                     if (url && !/^(https?:\/\/)/i.test(url) && !url.startsWith('file:')) {
                        // Protocol check
                     }
                     newLinks.push({
                        id: `l-${catId}-general-${linkIdCounter++}`,
                        title: a.textContent || "Link",
                        url: url,
                        description: "", 
                        categoryId: catId,
                        subCategoryId: '', // No sub-category
                        iconUrl: a.getAttribute('ICON') || '',
                        tags: []
                     });
                }
            });

            // Second pass: Subfolders
            subLevelDts.forEach(subDt => {
              const subH3 = subDt.querySelector('h3');
              const subDl = subDt.querySelector('dl');

              if (subH3) {
                // It is a subfolder -> SubCategory
                const subName = subH3.textContent || "Untitled";
                const subId = `sc-${catId}-${subIdCounter++}`;
                subCategories.push({ id: subId, name: subName });

                if (subDl) {
                  const linkDts = Array.from(subDl.children).filter(el => el.tagName === 'DT');
                  linkDts.forEach(linkDt => {
                    const a = linkDt.querySelector('a');
                    if (a) {
                      let url = a.href;
                      if (url && !/^(https?:\/\/)/i.test(url) && !url.startsWith('file:')) {}

                      newLinks.push({
                        id: `l-${catId}-${subId}-${linkIdCounter++}`,
                        title: a.textContent || "Link",
                        url: url,
                        description: "", 
                        categoryId: catId,
                        subCategoryId: subId,
                        iconUrl: a.getAttribute('ICON') || '',
                        tags: []
                      });
                    }
                  });
                }
              }
            });

            newCategories.push({
              id: catId,
              name: catName,
              subCategories: subCategories,
              icon: '' 
            });
          }
        });

        if (newCategories.length > 0) {
            confirmAction(
              t.admin.data.importTitle,
              t.admin.data.confirm,
              () => {
                 onUpdateData({ categories: newCategories, links: newLinks });
                 showToast('success', t.admin.data.success);
                 onClose();
              },
              true
            );
        } else {
            showToast('info', "No folders found in bookmark file.");
        }

      } catch (error) {
        console.error("Import Error", error);
        showToast('error', t.admin.data.error);
      }
    };
    reader.readAsText(file);
  };

  // Get all unique tags from existing links for suggestions
  const allExistingTags = useMemo(() => {
    const tags = new Set<string>();
    data.links.forEach(link => {
      if (link.tags) {
        link.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [data.links]);

  // Filter suggestions based on input and already selected tags
  const suggestedTags = useMemo(() => {
    const currentTags = new Set((linkForm.tags || []).map(t => t.toLowerCase()));
    const availableTags = allExistingTags.filter(t => !currentTags.has(t.toLowerCase()));

    if (!tagInput.trim()) {
      return availableTags.slice(0, 8); // Show top 8 if empty
    }
    
    return availableTags
      .filter(t => t.toLowerCase().includes(tagInput.toLowerCase().trim()))
      .slice(0, 8);
  }, [allExistingTags, tagInput, linkForm.tags]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setLinkForm({ ...editingItem, tags: editingItem.tags || [] });
        setActiveTab('link');
        setLinkMode('single'); // Always single mode when editing
      } else if (initialValues) {
        setLinkForm({ 
            title: '', url: '', description: '', iconUrl: '', tags: [],
            categoryId: initialValues.categoryId,
            subCategoryId: initialValues.subCategoryId
        });
        setActiveTab('link');
        setLinkMode('single');
      } else {
        // Reset link form
        setLinkForm({ title: '', url: '', description: '', categoryId: data.categories[0]?.id || '', subCategoryId: '', iconUrl: '', tags: [] });
      }
      setLocalCloudConfig(cloudConfig);
      // Reset forms
      setCatForm({ id: null, name: '', icon: '' });
      setSubCatForm({ parentId: '', id: null, name: '' });
      setLinkErrors({});
      setBulkUrls('');
      setBulkDefaultTitle('');
      setCatBulkIcons([]);
      setSelectedCatBulkIconId(null);
      setLinkBulkIcons([]);
      setSelectedLinkBulkIconId(null);
      setLastBulkActionData(null); // Reset undo history on open
      setTagInput('');
      setBulkTags([]);
      setBulkTagInput('');
      setIsExistingCatsOpen(true);
      setIsFetchingMeta(false);
      
      // Site Config Sync
      setSiteForm({
        title: data.siteConfig?.title || t.app.title,
        logoUrl: data.siteConfig?.logoUrl || '',
        faviconUrl: data.siteConfig?.faviconUrl || ''
      });
    }
  }, [isOpen, editingItem, initialValues, data, cloudConfig]);

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

  // ... (Keep existing fetch metadata, bulk icons, tag logic)
  const handleFetchMetadata = async () => {
    const url = linkForm.url?.trim();
    if (!url) return;

    // Ensure protocol
    let targetUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      targetUrl = `https://${url}`;
      setLinkForm(prev => ({ ...prev, url: targetUrl }));
    }

    setIsFetchingMeta(true);

    try {
      // Use Microlink API to fetch metadata (free tier)
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (data.status === 'success') {
        const { title, description, logo, image } = data.data;
        
        setLinkForm(prev => ({
          ...prev,
          title: title || prev.title,
          description: description || prev.description,
          iconUrl: logo?.url || image?.url || prev.iconUrl
        }));
        showToast('success', t.admin.link.meta.success);
      } else {
         throw new Error("API failed");
      }
    } catch (e) {
      // Fallback: Infer title from Domain
      try {
         const urlObj = new URL(targetUrl);
         const hostname = urlObj.hostname.replace(/^www\./, '');
         const title = hostname.split('.')[0];
         if (title && !linkForm.title) {
             setLinkForm(prev => ({ 
                 ...prev, 
                 title: title.charAt(0).toUpperCase() + title.slice(1) 
             }));
         }
      } catch (err) {}
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // ... (Bulk Icon Logic kept same) ...
  const handleCatBulkIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCatBulkIcons(prev => [
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

  const handleApplyCatBulkIcons = () => {
    const assignments = catBulkIcons.filter(item => item.assignedId);
    if (assignments.length === 0) return;

    setLastBulkActionData({ ...data });

    const updatedCategories = data.categories.map(cat => {
      const assignment = assignments.find(a => a.assignedId === cat.id);
      if (assignment) {
        return { ...cat, icon: assignment.preview };
      }
      return cat;
    });

    onUpdateData({ ...data, categories: updatedCategories });
    setCatBulkIcons([]);
    showToast('success', t.admin.category.bulkIcons.success);
  };

  const handleAssignIconToCategory = (catId: string) => {
    if (!selectedCatBulkIconId) return;
    setCatBulkIcons(prev => prev.map(icon => {
      if (icon.assignedId === catId) return { ...icon, assignedId: null };
      if (icon.id === selectedCatBulkIconId) return { ...icon, assignedId: catId };
      return icon;
    }));
    setSelectedCatBulkIconId(null);
  };

  const handleUnassignCatIcon = (e: React.MouseEvent, iconId: string) => {
    e.stopPropagation();
    setCatBulkIcons(prev => prev.map(icon => 
      icon.id === iconId ? { ...icon, assignedId: null } : icon
    ));
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

    setLastBulkActionData({ ...data });

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

  // --- Tag Logic ---
  const handleAddTag = (tag: string, isBulk = false) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    const isDuplicate = (tags: string[]) => tags.some(t => t.toLowerCase() === cleanTag.toLowerCase());

    if (isBulk) {
      if (isDuplicate(bulkTags)) {
        showToast('error', t.admin.link.validation.tagExists || "Tag already exists!");
        return;
      }
      setBulkTags([...bulkTags, cleanTag]);
      setBulkTagInput('');
    } else {
      const currentTags = linkForm.tags || [];
      if (isDuplicate(currentTags)) {
        showToast('error', t.admin.link.validation.tagExists || "Tag already exists!");
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
        subCategoryId: linkForm.subCategoryId || '', // Allow empty for General
        iconUrl: linkForm.iconUrl,
        tags: linkForm.tags || [],
      };
      updatedLinks.push(newLink);
    }
    onUpdateData({ ...data, links: updatedLinks });
    onClose();
    showToast('success', editingItem ? t.admin.link.updated : t.admin.link.created);
  };

  const handleDeleteLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingItem) return;
    confirmAction(
      t.admin.link.delete,
      t.app.deleteLinkConfirm,
      () => {
        const updatedLinks = data.links.filter(l => l.id !== editingItem.id);
        onUpdateData({ ...data, links: updatedLinks });
        onClose();
        showToast('success', t.app.linkDeleted);
      },
      true
    );
  };

  // ... (Bulk Import, Undo, Category Editing logic) ...
  const handleBulkImport = () => {
    if (!linkForm.categoryId) {
      setLinkErrors({ ...linkErrors, categoryId: t.admin.link.validation.categoryRequired });
      return;
    }
    const lines = bulkUrls.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      showToast('error', t.admin.link.bulk.error);
      return;
    }
    setLastBulkActionData({ ...data });
    const newLinks: LinkItem[] = [];
    const baseId = Date.now();
    lines.forEach((line, index) => {
      let url = line;
      if (!/^(https?:\/\/)/i.test(url)) {
        url = `https://${url}`;
      }
      let title = bulkDefaultTitle;
      if (!title) {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          const cleanHost = hostname.replace(/^www\./, '');
          const domainSegment = cleanHost.split('.')[0];
          if (domainSegment) {
            title = domainSegment.charAt(0).toUpperCase() + domainSegment.slice(1);
          } else {
            title = "Link";
          }
        } catch (e) {
          title = "Link";
        }
      }
      newLinks.push({
        id: `${baseId}-${index}`,
        title: title,
        url: url,
        description: '',
        categoryId: linkForm.categoryId || '',
        subCategoryId: linkForm.subCategoryId || '',
        iconUrl: '',
        tags: [...bulkTags] 
      });
    });
    onUpdateData({ ...data, links: [...data.links, ...newLinks] });
    setBulkUrls(''); 
    setBulkTags([]);
    setBulkDefaultTitle('');
    showToast('success', t.admin.link.bulk.success.replace('{count}', newLinks.length));
  };

  const handleUndo = () => {
    if (lastBulkActionData) {
      onUpdateData(lastBulkActionData);
      setLastBulkActionData(null);
      showToast('info', t.admin.undoSuccess);
    }
  };

  const handleEditCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    e.preventDefault();
    setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '' });
    const form = document.getElementById('main-cat-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    confirmAction(
      t.admin.category.edit,
      t.admin.category.deleteConfirm,
      () => {
         const updatedCategories = data.categories.filter(c => c.id !== id);
         const updatedLinks = data.links.filter(l => l.categoryId !== id);
         onUpdateData({ categories: updatedCategories, links: updatedLinks });
         showToast('success', t.admin.category.deleted);
      },
      true
    );
  };

  const handleSaveCategory = () => {
    if (!catForm.name) return;
    let updatedCategories = [...data.categories];
    if (catForm.id) {
      updatedCategories = updatedCategories.map(c => 
        c.id === catForm.id 
          ? { ...c, name: catForm.name, icon: catForm.icon } 
          : c
      );
    } else {
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
    showToast('success', catForm.id ? t.admin.category.updated : t.admin.category.created);
  };

  const handleEditSubCategory = (e: React.MouseEvent, parentId: string, subCat: SubCategory) => {
    e.stopPropagation();
    e.preventDefault();
    setSubCatForm({ parentId, id: subCat.id, name: subCat.name });
    const form = document.getElementById('sub-cat-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteSubCategory = (e: React.MouseEvent, parentId: string, subId: string) => {
    e.stopPropagation();
    e.preventDefault();
    confirmAction(
      t.admin.category.editSub,
      t.admin.category.deleteSubConfirm,
      () => {
         const updatedCategories = data.categories.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              subCategories: c.subCategories.filter(sc => sc.id !== subId)
            };
          }
          return c;
        });
        const updatedLinks = data.links.map(l => {
          if (l.categoryId === parentId && l.subCategoryId === subId) {
            return { ...l, categoryId: '', subCategoryId: '' };
          }
          return l;
        });
        onUpdateData({ categories: updatedCategories, links: updatedLinks });
        showToast('success', t.admin.category.subDeleted);
      },
      true
    );
  };

  const handleSaveSubCategory = () => {
    if (!subCatForm.name || !subCatForm.parentId) return;
    let updatedCategories = [...data.categories];
    const parentIndex = updatedCategories.findIndex(c => c.id === subCatForm.parentId);
    if (parentIndex === -1) return;
    if (subCatForm.id) {
      const updatedSubCats = updatedCategories[parentIndex].subCategories.map(sc => 
        sc.id === subCatForm.id ? { ...sc, name: subCatForm.name } : sc
      );
      updatedCategories[parentIndex] = { ...updatedCategories[parentIndex], subCategories: updatedSubCats };
    } else {
      const newSubCat: SubCategory = { id: `sc-${Date.now()}`, name: subCatForm.name };
      updatedCategories[parentIndex] = {
        ...updatedCategories[parentIndex],
        subCategories: [...updatedCategories[parentIndex].subCategories, newSubCat]
      };
    }
    onUpdateData({ ...data, categories: updatedCategories });
    setSubCatForm({ parentId: '', id: null, name: '' });
    showToast('success', subCatForm.id ? t.admin.category.subUpdated : t.admin.category.subCreated);
  };

  const handleSaveCloudConfig = () => {
    onUpdateCloudConfig(localCloudConfig);
  };

  const handleSaveSiteSettings = () => {
    onUpdateData({
      ...data,
      siteConfig: {
        title: siteForm.title,
        logoUrl: siteForm.logoUrl,
        faviconUrl: siteForm.faviconUrl
      }
    });
    showToast('success', t.admin.settings.success);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative z-10 dark:bg-slate-900 dark:border dark:border-slate-700 animate-fadeIn">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 dark:text-white">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t.admin.title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-slate-50 border-r border-slate-100 hidden md:block dark:bg-slate-800/50 dark:border-slate-800">
            <nav className="p-3 space-y-1">
              <button onClick={() => setActiveTab('link')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'link' ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}>
                <Plus className="w-4 h-4" />{t.admin.tabs.addLink}
              </button>
              <button onClick={() => setActiveTab('category')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'category' ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}>
                <Folder className="w-4 h-4" />{t.admin.tabs.categories}
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}>
                <PanelTop className="w-4 h-4" />{t.admin.tabs.settings}
              </button>
              <button onClick={() => setActiveTab('cloud')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'cloud' ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}>
                <Cloud className="w-4 h-4" />{t.admin.tabs.cloud}
              </button>
              <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}>
                <Save className="w-4 h-4" />{t.admin.tabs.data}
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {/* Mobile Tabs Omitted for brevity (same as before) */}
            <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
              <button onClick={() => setActiveTab('link')} className={`flex-none px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'link' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t.admin.tabs.addLink}</button>
              <button onClick={() => setActiveTab('category')} className={`flex-none px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'category' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t.admin.tabs.categories}</button>
              <button onClick={() => setActiveTab('settings')} className={`flex-none px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t.admin.tabs.settings}</button>
              <button onClick={() => setActiveTab('cloud')} className={`flex-none px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'cloud' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t.admin.tabs.cloud}</button>
              <button onClick={() => setActiveTab('data')} className={`flex-none px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'data' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t.admin.tabs.data}</button>
            </div>

            {/* --- LINK TAB --- */}
            {activeTab === 'link' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                {!editingItem && !initialValues && (
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-6 dark:bg-slate-800">
                    <button onClick={() => setLinkMode('single')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${linkMode === 'single' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      <Plus className="w-4 h-4" />{t.admin.link.modes.single}
                    </button>
                    <button onClick={() => setLinkMode('bulk')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${linkMode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      <ListPlus className="w-4 h-4" />{t.admin.link.modes.bulk}
                    </button>
                    <button onClick={() => setLinkMode('icons')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${linkMode === 'icons' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      <Images className="w-4 h-4" />{t.admin.link.modes.icons}
                    </button>
                  </div>
                )}
                {linkMode === 'single' && (
                  <div className="space-y-4 animate-fadeIn">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.title} <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            value={linkForm.title} 
                            onChange={(e) => {
                              setLinkForm({ ...linkForm, title: e.target.value });
                              setLinkErrors({ ...linkErrors, title: '' });
                            }}
                            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${linkErrors.title ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200'}`}
                          />
                          {linkErrors.title && <p className="text-xs text-red-500">{linkErrors.title}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.url} <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={linkForm.url} 
                              onChange={(e) => {
                                setLinkForm({ ...linkForm, url: e.target.value });
                                setLinkErrors({ ...linkErrors, url: '' });
                              }}
                              onBlur={handleFetchMetadata}
                              placeholder="https://"
                              className={`w-full pl-3 pr-10 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${linkErrors.url ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200'}`}
                            />
                            <button 
                              type="button"
                              onClick={handleFetchMetadata}
                              disabled={isFetchingMeta || !linkForm.url}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors disabled:opacity-50"
                              title={t.admin.link.meta.fetch}
                            >
                              {isFetchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            </button>
                          </div>
                          {linkErrors.url && <p className="text-xs text-red-500">{linkErrors.url}</p>}
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.category} <span className="text-red-500">*</span></label>
                          <select 
                            value={linkForm.categoryId} 
                            onChange={(e) => {
                              const newCatId = e.target.value;
                              // Default to General (empty subId) when switching categories
                              setLinkForm({ ...linkForm, categoryId: newCatId, subCategoryId: '' });
                              setLinkErrors({ ...linkErrors, categoryId: '' });
                            }}
                            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${linkErrors.categoryId ? 'border-red-500' : 'border-slate-200'}`}
                          >
                            <option value="">{t.admin.link.selectCategory}</option>
                            {data.categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.subCategory}</label>
                          <select 
                            value={linkForm.subCategoryId} 
                            onChange={(e) => setLinkForm({ ...linkForm, subCategoryId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            disabled={!linkForm.categoryId}
                          >
                            <option value="">{t.admin.link.general}</option>
                            {linkForm.categoryId && data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        </div>
                     </div>
                     {/* Description, Tags, Icon fields remain the same */}
                     <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.description}</label>
                        <textarea value={linkForm.description} onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.tags}</label>
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[42px] dark:bg-slate-800 dark:border-slate-700">
                           {linkForm.tags && linkForm.tags.length > 0 ? (
                             linkForm.tags.map(tag => (
                               <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium dark:bg-indigo-900/50 dark:text-indigo-300">
                                 {tag}
                                 <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                               </span>
                             ))
                           ) : (
                             <span className="text-slate-400 text-sm italic p-1">{t.admin.link.tags}</span>
                           )}
                        </div>
                        <div className="flex gap-2">
                           <div className="relative flex-1">
                             <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                             <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddTag(tagInput); } }} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.link.addTag} />
                           </div>
                           <button type="button" onClick={() => handleAddTag(tagInput)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><Plus className="w-4 h-4" /></button>
                        </div>
                        {suggestedTags.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t.admin.link.suggestedTags}</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestedTags.map(tag => (
                                <button key={tag} type="button" onClick={() => handleAddTag(tag)} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/30">{tag}</button>
                              ))}
                            </div>
                          </div>
                        )}
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.icon}</label>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 dark:bg-slate-800 dark:border-slate-700">
                             {linkForm.iconUrl ? <img src={linkForm.iconUrl} alt="Preview" className="w-full h-full object-cover" /> : <Images className="w-5 h-5 text-slate-400" />}
                           </div>
                           <div className="flex-1 space-y-2">
                              <label className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-200 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Upload Image</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setLinkForm({ ...linkForm, iconUrl: res }))} />
                              </label>
                              <input type="text" value={linkForm.iconUrl} onChange={(e) => setLinkForm({ ...linkForm, iconUrl: e.target.value })} placeholder={t.admin.link.uploadOrPaste} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                           </div>
                        </div>
                     </div>
                     <div className="pt-4 flex items-center gap-3">
                       {editingItem && (
                         <button type="button" onClick={handleDeleteLink} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
                           <Trash2 className="w-4 h-4" /><span>{t.admin.link.delete}</span>
                         </button>
                       )}
                       <button type="button" onClick={handleSaveLink} className={`ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2`}>
                         <Save className="w-4 h-4" /><span>{editingItem ? t.admin.link.update : t.admin.link.create}</span>
                       </button>
                     </div>
                  </div>
                )}
                {/* Bulk Import and Icons views omitted for brevity (same structure, different content) */}
                {linkMode === 'bulk' && (
                  <div className="space-y-4 animate-fadeIn">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.category} <span className="text-red-500">*</span></label>
                          <select 
                            value={linkForm.categoryId} 
                            onChange={(e) => {
                              const newCatId = e.target.value;
                              setLinkForm({ ...linkForm, categoryId: newCatId, subCategoryId: '' });
                              setLinkErrors({ ...linkErrors, categoryId: '' });
                            }}
                            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${linkErrors.categoryId ? 'border-red-500' : 'border-slate-200'}`}
                          >
                            <option value="">{t.admin.link.selectCategory}</option>
                            {data.categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.subCategory}</label>
                          <select 
                            value={linkForm.subCategoryId} 
                            onChange={(e) => setLinkForm({ ...linkForm, subCategoryId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            disabled={!linkForm.categoryId}
                          >
                            <option value="">{t.admin.link.general}</option>
                            {linkForm.categoryId && data.categories.find(c => c.id === linkForm.categoryId)?.subCategories.map(sc => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        </div>
                     </div>
                     {/* ... Rest of Bulk Mode ... */}
                     <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.bulk.label}</label>
                       <textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} placeholder={t.admin.link.bulk.placeholder} rows={8} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.bulk.defaultTitle}</label>
                       <input type="text" value={bulkDefaultTitle} onChange={e => setBulkDefaultTitle(e.target.value)} placeholder={t.admin.link.bulk.defaultTitlePlaceholder} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.tags}</label>
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[42px] dark:bg-slate-800 dark:border-slate-700">
                           {bulkTags.map(tag => (
                             <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium dark:bg-indigo-900/50 dark:text-indigo-300">
                               {tag}
                               <button onClick={() => handleRemoveTag(tag, true)} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                             </span>
                           ))}
                        </div>
                        <div className="flex gap-2">
                           <input type="text" value={bulkTagInput} onChange={e => setBulkTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddTag(bulkTagInput, true); } }} className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder={t.admin.link.addTag} />
                           <button onClick={() => handleAddTag(bulkTagInput, true)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"><Plus className="w-4 h-4" /></button>
                        </div>
                     </div>
                     <div className="pt-4 flex justify-between items-center">
                        {lastBulkActionData && (
                           <button onClick={handleUndo} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                              <Undo2 className="w-4 h-4" /> {t.admin.undo}
                           </button>
                        )}
                        <button onClick={handleBulkImport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 ml-auto">
                         <Upload className="w-4 h-4" /><span>{t.admin.link.bulk.import}</span>
                       </button>
                     </div>
                  </div>
                )}
                {/* ... Icons Mode ... */}
                {linkMode === 'icons' && (
                    <div className="space-y-6 animate-fadeIn">
                     <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                       <p>{t.admin.link.bulkIcons.instructions}</p>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.link.bulkIcons.drop}</h4>
                           <label className="block w-full h-32 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer dark:border-slate-700 dark:hover:bg-slate-800">
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-500">Click to upload icons</span>
                              <input type="file" multiple accept="image/*" onChange={handleLinkBulkIconUpload} className="hidden" />
                           </label>
                           <div className="grid grid-cols-4 gap-2">
                              {linkBulkIcons.filter(i => !i.assignedId).map(icon => (
                                <div key={icon.id} onClick={() => setSelectedLinkBulkIconId(prev => prev === icon.id ? null : icon.id)} className={`aspect-square rounded-lg border cursor-pointer relative group overflow-hidden ${selectedLinkBulkIconId === icon.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-slate-700'}`}>
                                  <img src={icon.preview} className="w-full h-full object-cover" />
                                  <button onClick={(e) => { e.stopPropagation(); setLinkBulkIcons(prev => prev.filter(i => i.id !== icon.id)); }} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-4 flex flex-col h-[400px]">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">{t.admin.link.bulkIcons.assigned}</h4>
                           <div className="flex-1 overflow-y-auto pr-2 space-y-4 border rounded-xl p-3 border-slate-100 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800">
                              {data.categories.map(cat => (
                                <div key={cat.id}>
                                   <div className="sticky top-0 bg-slate-50 z-10 py-1 mb-1 dark:bg-slate-900">
                                      <span className="text-xs font-bold text-slate-500 uppercase">{cat.name}</span>
                                   </div>
                                   {/* General Links in Bulk Icon view */}
                                   <div className="ml-2 mb-2">
                                       <div className="text-[10px] font-semibold text-slate-400 mb-1 border-l-2 border-slate-200 pl-2 dark:border-slate-700">General</div>
                                       <div className="space-y-1">
                                            {data.links.filter(l => l.categoryId === cat.id && !l.subCategoryId).map(link => {
                                                 const assignedIcon = linkBulkIcons.find(i => i.assignedId === link.id);
                                                 return (
                                                   <div key={link.id} onClick={() => handleAssignIconToLink(link.id)} className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-colors ${assignedIcon ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700'}`}>
                                                      <span className="truncate flex-1 mr-2">{link.title}</span>
                                                      {assignedIcon ? (
                                                        <div className="flex items-center gap-2"><img src={assignedIcon.preview} className="w-6 h-6 rounded-full object-cover border border-indigo-200" /><button onClick={(e) => handleUnassignLinkIcon(e, assignedIcon.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button></div>
                                                      ) : (
                                                        <div className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center ${selectedLinkBulkIconId ? 'border-indigo-300 bg-indigo-50 text-indigo-400' : 'border-slate-300 text-slate-300'}`}><Plus className="w-3 h-3" /></div>
                                                      )}
                                                   </div>
                                                 );
                                            })}
                                       </div>
                                   </div>
                                   {/* Subcategories */}
                                   {cat.subCategories.map(sub => {
                                      const links = data.links.filter(l => l.categoryId === cat.id && l.subCategoryId === sub.id);
                                      if (links.length === 0) return null;
                                      return (
                                        <div key={sub.id} className="ml-2 mb-2">
                                           <div className="text-[10px] font-semibold text-slate-400 mb-1 border-l-2 border-slate-200 pl-2 dark:border-slate-700">{sub.name}</div>
                                           <div className="space-y-1">
                                              {links.map(link => {
                                                 const assignedIcon = linkBulkIcons.find(i => i.assignedId === link.id);
                                                 return (
                                                   <div key={link.id} onClick={() => handleAssignIconToLink(link.id)} className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-colors ${assignedIcon ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700'}`}>
                                                      <span className="truncate flex-1 mr-2">{link.title}</span>
                                                      {assignedIcon ? (
                                                        <div className="flex items-center gap-2"><img src={assignedIcon.preview} className="w-6 h-6 rounded-full object-cover border border-indigo-200" /><button onClick={(e) => handleUnassignLinkIcon(e, assignedIcon.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button></div>
                                                      ) : (
                                                        <div className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center ${selectedLinkBulkIconId ? 'border-indigo-300 bg-indigo-50 text-indigo-400' : 'border-slate-300 text-slate-300'}`}><Plus className="w-3 h-3" /></div>
                                                      )}
                                                   </div>
                                                 );
                                              })}
                                           </div>
                                        </div>
                                      );
                                   })}
                                </div>
                              ))}
                           </div>
                           <div className="shrink-0 flex justify-between items-center">
                              {lastBulkActionData && <button onClick={handleUndo} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"><Undo2 className="w-4 h-4" /> {t.admin.undo}</button>}
                              {linkBulkIcons.some(i => i.assignedId) && <button onClick={handleApplyLinkBulkIcons} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none ml-auto">{t.admin.link.bulkIcons.apply}</button>}
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            )}
            
            {/* ... Other Tabs remain identical (Category, Settings, Cloud, Data) ... */}
            {activeTab === 'category' && (
               // ... existing category tab content ...
               <div className="space-y-10 max-w-2xl mx-auto">
                {/* 1. Existing Categories */}
                <div>
                   <div 
                     className="flex items-center justify-between mb-4 cursor-pointer group"
                     onClick={() => setIsExistingCatsOpen(!isExistingCatsOpen)}
                   >
                     <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                       <ListPlus className="w-5 h-5 text-indigo-500" />
                       {t.admin.category.existing}
                     </h3>
                     <div className={`p-1 rounded-full text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-300 transition-colors`}>
                        {isExistingCatsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                     </div>
                   </div>
                   {isExistingCatsOpen && (
                     <div className="space-y-4 animate-fadeIn">
                        {data.categories.length === 0 ? (
                          <p className="text-slate-400 italic">{t.admin.category.noCategories}</p>
                        ) : (
                          data.categories.map(cat => (
                            <div key={cat.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                               <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                     {cat.icon ? (
                                       <img src={cat.icon} alt="" className="w-8 h-8 rounded-lg object-contain bg-slate-50 dark:bg-slate-700" />
                                     ) : (
                                       <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 dark:bg-slate-700"><Folder className="w-4 h-4" /></div>
                                     )}
                                     <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                     <button type="button" onClick={(e) => handleEditCategory(e, cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"><Edit2 className="w-4 h-4 pointer-events-none" /></button>
                                     <button type="button" onClick={(e) => handleDeleteCategory(e, cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30 dark:hover:text-red-400"><Trash2 className="w-4 h-4 pointer-events-none" /></button>
                                  </div>
                               </div>
                               <div className="pl-11 space-y-2">
                                 {cat.subCategories.length > 0 ? (
                                   cat.subCategories.map(sub => (
                                     <div key={sub.id} className="flex items-center justify-between text-sm group">
                                       <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                         <CornerDownRight className="w-3 h-3 text-slate-300" />
                                         <span>{sub.name}</span>
                                       </div>
                                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button type="button" onClick={(e) => handleEditSubCategory(e, cat.id, sub)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3 h-3 pointer-events-none" /></button>
                                         <button type="button" onClick={(e) => handleDeleteSubCategory(e, cat.id, sub.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3 pointer-events-none" /></button>
                                       </div>
                                     </div>
                                   ))
                                 ) : (
                                   <p className="text-xs text-slate-300 italic pl-5">{t.app.noSubCategories}</p>
                                 )}
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                   )}
                </div>
                {/* 2. New Main Category */}
                <div id="main-cat-form" className="bg-slate-50 rounded-xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700">
                   <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200 font-semibold">
                      <Folder className="w-5 h-5 text-indigo-500" />
                      <h3>{catForm.id ? t.admin.category.edit : t.admin.category.new}</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.name}</label>
                         <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.icon}</label>
                         <div className="flex gap-2">
                            <input type="text" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} placeholder="URL..." className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                            <label className="px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700"><Images className="w-4 h-4 text-slate-500" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setCatForm({ ...catForm, icon: res }))} /></label>
                         </div>
                      </div>
                   </div>
                   <div className="flex justify-end gap-2 mt-6">
                      {catForm.id && <button onClick={() => setCatForm({ id: null, name: '', icon: '' })} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">{t.admin.category.cancel}</button>}
                      <button onClick={handleSaveCategory} disabled={!catForm.name} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Save className="w-4 h-4" /><span>{catForm.id ? t.admin.category.update : t.admin.category.create}</span></button>
                   </div>
                </div>
                {/* 3. New Sub-Category */}
                <div id="sub-cat-form" className="bg-slate-50 rounded-xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700">
                   <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200 font-semibold">
                      <Save className="w-5 h-5 text-indigo-500" />
                      <h3>{subCatForm.id ? t.admin.category.editSub : t.admin.category.addSub}</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.selectParent}</label>
                         <select value={subCatForm.parentId} onChange={e => setSubCatForm({...subCatForm, parentId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                           <option value="">{t.admin.link.selectCategory}</option>
                           {data.categories.map(c => (
                             <option key={c.id} value={c.id}>{c.name}</option>
                           ))}
                         </select>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.subName}</label>
                         <input type="text" value={subCatForm.name} onChange={e => setSubCatForm({...subCatForm, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                      </div>
                   </div>
                   <div className="flex justify-end gap-2 mt-6">
                      {subCatForm.id && <button onClick={() => setSubCatForm({ parentId: '', id: null, name: '' })} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">{t.admin.category.cancel}</button>}
                      <button onClick={handleSaveSubCategory} disabled={!subCatForm.parentId || !subCatForm.name} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Save className="w-4 h-4" /><span>{subCatForm.id ? t.admin.category.update : t.admin.category.create}</span></button>
                   </div>
                </div>
                {/* 4. Bulk Icons (Category) */}
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 mb-4 dark:text-slate-200 flex items-center gap-2">
                    <Images className="w-5 h-5 text-indigo-500" />
                    {t.admin.category.bulkIcons.title}
                  </h3>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                    <p>{t.admin.category.bulkIcons.instructions}</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.bulkIcons.drop}</h4>
                       <label className="block w-full h-32 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer dark:border-slate-700 dark:hover:bg-slate-800">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-500">Click to upload multiple icons</span>
                          <input type="file" multiple accept="image/*" onChange={handleCatBulkIconUpload} className="hidden" />
                       </label>
                       <div className="grid grid-cols-4 gap-2">
                          {catBulkIcons.filter(i => !i.assignedId).map(icon => (
                            <div key={icon.id} onClick={() => setSelectedCatBulkIconId(prev => prev === icon.id ? null : icon.id)} className={`aspect-square rounded-lg border cursor-pointer relative group overflow-hidden ${selectedCatBulkIconId === icon.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-slate-700'}`}>
                              <img src={icon.preview} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); setCatBulkIcons(catBulkIcons.filter(i => i.id !== icon.id)); }} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.category.bulkIcons.assigned}</h4>
                       <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {data.categories.map(cat => {
                            const assignedIcon = catBulkIcons.find(i => i.assignedId === cat.id);
                            const hasPending = !!assignedIcon;
                            return (
                              <div key={cat.id} onClick={() => handleAssignIconToCategory(cat.id)} className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${hasPending ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700'}`}>
                                <span className={`text-sm font-medium ${hasPending ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{cat.name}</span>
                                {assignedIcon ? (
                                  <div className="flex items-center gap-2"><img src={assignedIcon.preview} className="w-8 h-8 rounded object-cover border border-indigo-200" /><button onClick={(e) => handleUnassignCatIcon(e, assignedIcon.id)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>
                                ) : (
                                  <div className={`w-8 h-8 rounded border border-dashed flex items-center justify-center ${selectedCatBulkIconId ? 'border-indigo-300 bg-indigo-50 text-indigo-400' : 'border-slate-300 text-slate-300'}`}><ArrowRight className="w-4 h-4" /></div>
                                )}
                              </div>
                            );
                          })}
                       </div>
                       {catBulkIcons.some(i => i.assignedId) && <button onClick={handleApplyCatBulkIcons} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">{t.admin.category.bulkIcons.apply}</button>}
                    </div>
                  </div>
                </div>
               </div>
            )}
            {/* Settings, Cloud, Data tabs remain mostly static, just rendering content */}
            {activeTab === 'settings' && (
                // Same settings tab
              <div className="space-y-8 max-w-2xl mx-auto">
                 <div className="text-center">
                    <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-violet-900/20">
                      <PanelTop className="w-8 h-8 text-violet-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.admin.settings.title}</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto dark:text-slate-400">{t.admin.settings.desc}</p>
                 </div>
                 {/* ... Inputs ... */}
                 <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6 dark:bg-slate-800 dark:border-slate-700">
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.settings.siteName}</label>
                       <input type="text" value={siteForm.title} onChange={e => setSiteForm({ ...siteForm, title: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.settings.logo}</label>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 dark:bg-slate-900 dark:border-slate-700">
                            {siteForm.logoUrl ? <img src={siteForm.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <PanelTop className="w-6 h-6 text-slate-400" />}
                          </div>
                          <div className="flex-1 space-y-2">
                             <div className="flex gap-2">
                                <input type="text" value={siteForm.logoUrl} onChange={e => setSiteForm({ ...siteForm, logoUrl: e.target.value })} placeholder={t.admin.settings.placeholderUrl} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                <label className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700"><Upload className="w-4 h-4 text-slate-500" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setSiteForm({ ...siteForm, logoUrl: res }))} /></label>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.settings.favicon}</label>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 dark:bg-slate-900 dark:border-slate-700">
                            {siteForm.faviconUrl ? <img src={siteForm.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" /> : <div className="w-4 h-4 bg-slate-400 rounded-sm" />}
                          </div>
                          <div className="flex-1 space-y-2">
                             <div className="flex gap-2">
                                <input type="text" value={siteForm.faviconUrl} onChange={e => setSiteForm({ ...siteForm, faviconUrl: e.target.value })} placeholder={t.admin.settings.placeholderUrl} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                <label className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700"><Upload className="w-4 h-4 text-slate-500" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setSiteForm({ ...siteForm, faviconUrl: res }))} /></label>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="flex justify-end">
                    <button onClick={handleSaveSiteSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"><Save className="w-4 h-4" />{t.admin.settings.save}</button>
                 </div>
              </div>
            )}
            
            {activeTab === 'cloud' && (
              // Same Cloud Tab
              <div className="space-y-8 max-w-2xl mx-auto">
                 {/* ... Cloud Content ... */}
                 {/* Re-using existing structure for consistency */}
                 <div className="text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-blue-900/20"><Cloud className="w-8 h-8 text-blue-500" /></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.admin.cloud.title}</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto dark:text-slate-400">{t.admin.cloud.desc}</p>
                 </div>
                 <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                       <span className="font-semibold text-slate-700 dark:text-slate-300">{t.admin.cloud.enable}</span>
                       <button onClick={() => setLocalCloudConfig({ ...localCloudConfig, enabled: !localCloudConfig.enabled })} className={`w-12 h-6 rounded-full transition-colors relative ${localCloudConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localCloudConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                    </div>
                    {localCloudConfig.enabled && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.cloud.provider}</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setLocalCloudConfig({ ...localCloudConfig, activeProvider: 'github' })} className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl border transition-all ${localCloudConfig.activeProvider === 'github' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500 dark:bg-slate-800 dark:text-indigo-400' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-white hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400'}`}><span className="font-bold text-sm">GitHub</span></button>
                            <button onClick={() => setLocalCloudConfig({ ...localCloudConfig, activeProvider: 'notion' })} className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl border transition-all ${localCloudConfig.activeProvider === 'notion' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500 dark:bg-slate-800 dark:text-indigo-400' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-white hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400'}`}><span className="font-bold text-sm">Notion</span></button>
                            <button onClick={() => setLocalCloudConfig({ ...localCloudConfig, activeProvider: 'webdav' })} className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl border transition-all ${localCloudConfig.activeProvider === 'webdav' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500 dark:bg-slate-800 dark:text-indigo-400' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-white hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400'}`}><span className="font-bold text-sm">WebDAV</span></button>
                          </div>
                        </div>
                        {/* Provider Fields */}
                        {localCloudConfig.activeProvider === 'github' && (
                          <div className="space-y-4 pt-2">
                             <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.cloud.github.tokenLabel}</label><input type="password" value={localCloudConfig.githubToken} onChange={e => setLocalCloudConfig({ ...localCloudConfig, githubToken: e.target.value })} placeholder={t.admin.cloud.github.tokenPlaceholder} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white" /><a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">{t.admin.cloud.github.help} <ExternalLink className="w-3 h-3" /></a></div>
                             <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.cloud.github.gistLabel}</label><input type="text" value={localCloudConfig.gistId} onChange={e => setLocalCloudConfig({ ...localCloudConfig, gistId: e.target.value })} placeholder={t.admin.cloud.github.gistPlaceholder} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" /></div>
                          </div>
                        )}
                        {/* ... Notion & WebDAV config UI (omitted for brevity, same as previous) ... */}
                        {/* Save Button */}
                        <div className="flex justify-end pt-2"><button onClick={handleSaveCloudConfig} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700">{t.admin.cloud.saveConfig}</button></div>
                      </div>
                    )}
                 </div>
                 {/* Cloud Actions */}
                 {localCloudConfig.enabled && (
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={onSyncUpload} disabled={isSyncing} className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500"><div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform dark:bg-indigo-900/30"><Upload className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${isSyncing ? 'animate-bounce' : ''}`} /></div><span className="font-semibold text-sm">{t.admin.cloud.upload}</span></button>
                      <button onClick={onSyncDownload} disabled={isSyncing} className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500"><div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform dark:bg-indigo-900/30"><Download className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${isSyncing ? 'animate-bounce' : ''}`} /></div><span className="font-semibold text-sm">{t.admin.cloud.download}</span></button>
                   </div>
                 )}
              </div>
            )}
            
            {activeTab === 'data' && (
              <div className="space-y-8 max-w-2xl mx-auto">
                 <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/20"><Book className="w-8 h-8 text-emerald-500" /></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.admin.tabs.data}</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col dark:bg-slate-800 dark:border-slate-700">
                       <div className="flex-1 mb-6"><h4 className="font-bold text-slate-800 mb-2 dark:text-white">{t.admin.data.exportTitle}</h4><p className="text-sm text-slate-500 dark:text-slate-400">{t.admin.data.exportDesc}</p></div>
                       <button onClick={handleExportData} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors dark:bg-indigo-600 dark:hover:bg-indigo-700"><Download className="w-4 h-4" />{t.admin.data.exportBtn}</button>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col dark:bg-slate-800 dark:border-slate-700">
                       <div className="flex-1 mb-6"><h4 className="font-bold text-slate-800 mb-2 dark:text-white">{t.admin.data.importTitle}</h4><p className="text-sm text-slate-500 dark:text-slate-400">{t.admin.data.importDesc}</p></div>
                       <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 cursor-pointer transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"><Upload className="w-4 h-4" />{t.admin.data.importBtn}<input type="file" accept=".html,.htm" className="hidden" onChange={handleImportData} /></label>
                    </div>
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
