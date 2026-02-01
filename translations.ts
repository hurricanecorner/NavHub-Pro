
import { Language } from './types';

export const TRANSLATIONS = {
  en: {
    app: {
      title: "NavHub",
      searchPlaceholder: "Search resources...",
      admin: "Admin",
      toggleEdit: "Toggle Edit",
      toggleLang: "Switch Language",
      sync: {
        idle: "Idle",
        syncing: "Syncing...",
        synced: "Synced",
        error: "Error"
      },
      theme: {
        light: "Light",
        dark: "Dark",
        system: "System",
        custom: "Custom BG"
      },
      searchResults: "Search Results",
      noResults: "No results found.",
      addLink: "Add Link",
      quickAdd: "Quick Add",
      deleteLinkConfirm: "Are you sure you want to delete this link?",
      noSubCategories: "No sub-categories.",
      visit: "Visit",
      success: "Success",
      saved: "Saved successfully",
      deleted: "Deleted successfully",
      configSaved: "Config saved",
      enableSyncFirst: "Enable cloud sync first.",
      missingGithubToken: "Missing GitHub Token.",
      missingNotionConfig: "Check Notion Token/ID.",
      missingGithubConfig: "Check Token/Gist ID.",
      linkDeleted: "Link removed.",
      imageTooLarge: "Image is too large (Max 1MB).",
    },
    admin: {
      title: "Admin Center",
      editLink: "Edit Link",
      undo: "Undo",
      undoSuccess: "Reverted.",
      tabs: {
        link: "Add Link",
        category: "Categories",
        tags: "Tags Library",
        cloud: "Cloud Sync",
        data: "Data Backup",
        settings: "Site Settings"
      },
      tags: {
        title: "Tags Management",
        globalTitle: "Global Tags Center",
        globalDesc: "Manage all resource tags. Supports batch renaming and auto-merging.",
        searchPlaceholder: "Filter tags...",
        count: "{count} links",
        usageCount: "{count} items",
        rename: "Rename Tag",
        renamePlaceholder: "New name...",
        deleteTitle: "Delete Tag",
        deleteMessage: "Remove tag \"{tag}\" from ALL links? This cannot be undone.",
        renameSuccess: "Tags updated and merged.",
        empty: "No tags used yet.",
        mergeHint: "Renaming to an existing tag will merge them."
      },
      settings: {
        title: "Branding Settings",
        desc: "Customize the look and feel of your navigation site.",
        siteName: "Site Name",
        logo: "Site Logo (Top-Left)",
        favicon: "Favicon (Browser Tab)",
        background: "Background Image (Custom BG mode)",
        linkColumns: "Desktop Grid Columns",
        columnsUnit: "Columns",
        placeholderUrl: "https://...",
        upload: "Upload",
        save: "Save Settings",
        success: "Settings updated!",
        themeColorTitle: "Theme Color Preview",
        themeShadesTitle: "Palette Shades Preview",
        themeCollections: {
          macaron: "Macaron",
          morandi: "Morandi",
          traditional: "Traditional"
        },
        logoStyle: {
          title: "Logo Appearance",
          shape: "Logo Shape",
          bgColor: "Logo Background (Transparent PNG)",
          shapes: {
            square: "Square",
            rounded: "Rounded",
            circle: "Circle"
          }
        }
      },
      data: {
        exportTitle: "Export Bookmarks (HTML)",
        exportDesc: "Download your navigation data as a standard HTML file for local backup.",
        exportBtn: "Start Export",
        importTitle: "Import Bookmarks (HTML)",
        importDesc: "Upload a standard HTML bookmark file to restore categories and links.",
        importBtn: "Select File",
        success: "Imported!",
        error: "Invalid file.",
        confirm: "Overwrite current data?"
      },
      link: {
        title: "Title",
        url: "Link URL",
        category: "Main Category",
        subCategory: "Sub Category",
        general: "General / No Sub",
        description: "Description",
        tags: "Tags Library",
        tagsPlaceholder: "Type new tag...",
        addTag: "Add",
        icon: "Icon",
        iconBg: "Icon Background (Optional)",
        uploadOrPaste: "Upload & Compress",
        imageCompressed: "Compressed: {from} -> {to}",
        selectCategory: "-- Select --",
        create: "Create Link",
        save: "Save Changes",
        update: "Update Link",
        meta: {
          success: "Metadata fetched!",
          error: "Fetch failed.",
          pickerTitle: "Smart Multi-Source Metadata Picker",
          pickerDesc: "Aggregated info from multiple platforms. Click to mix and match.",
          abandon: "Discard",
          apply: "Apply Selection",
          titleStrategy: "Title Strategy",
          iconStrategy: "Icon Strategy",
          descStrategy: "Description Strategy"
        },
        modes: {
          single: "Single",
          bulk: "Bulk Import",
          icons: "Batch Icons"
        },
        bulk: {
          label: "Paste URLs (one per line)",
          placeholder: "https://example.com\nbaidu.com\n...",
          defaultTitle: "Default Title (Optional)",
          defaultTitlePlaceholder: "Leave empty to auto-fetch from URL",
          import: "Import Now",
          success: "Successfully imported {count} links"
        },
        icons: {
          upload: "Upload Icon",
          apply: "Apply Changes",
          hint: "Select icon above then click link below"
        }
      },
      category: {
        title: "Category Management",
        new: "New Main Category",
        newSub: "New Sub Category",
        noSub: "No sub-categories",
        edit: "Edit Category",
        editSub: "Edit Sub",
        name: "Category Name",
        deleteConfirm: "Delete this category and all links inside?",
        deleteSubConfirm: "Delete this sub-category?",
        cancel: "Cancel",
        saveDone: "Save Done"
      },
      cloud: {
        enable: "Enable Sync Feature",
        desc: "Synchronize your data across multiple devices via your preferred cloud provider.",
        saveConfig: "Save Configuration",
        upload: "Upload Sync",
        download: "Download Local",
        github: {
          token: "GitHub Token",
          gistId: "Gist ID"
        },
        notion: {
          token: "Integration Token",
          pageId: "Page ID",
          proxy: "API Proxy URL (CORS)",
          proxyHelp: "Note: Notion API requires a proxy due to browser CORS restrictions.",
          publish: "Publish to Notion (Append)",
          help: "CORS Note: Use a Proxy URL for Notion API in browser."
        },
        webdav: {
          url: "Server URL",
          user: "Username",
          pass: "App Password",
          help: "Ensure your WebDAV server supports CORS or use a proxy."
        }
      }
    }
  },
  zh: {
    app: {
      title: "导航站",
      searchPlaceholder: "搜索资源...",
      admin: "后台管理",
      toggleEdit: "切换编辑模式",
      toggleLang: "切换语言",
      sync: {
        idle: "空闲",
        syncing: "同步中...",
        synced: "已同步",
        error: "错误"
      },
      theme: {
        light: "亮色模式",
        dark: "暗色模式",
        system: "跟随系统",
        custom: "自选背景"
      },
      searchResults: "搜索结果",
      noResults: "未找到结果。",
      addLink: "添加链接",
      quickAdd: "添加链接",
      deleteLinkConfirm: "确定要删除此链接吗？",
      noSubCategories: "暂无子分类。",
      visit: "访问",
      success: "操作成功",
      saved: "保存成功",
      deleted: "删除成功",
      configSaved: "配置已保存",
      enableSyncFirst: "请先启用云同步功能。",
      missingGithubToken: "请配置 GitHub Token。",
      missingNotionConfig: "请检查 Notion 配置。",
      missingGithubConfig: "请检查 Token/Gist ID。",
      linkDeleted: "链接已删除。",
      imageTooLarge: "图片文件过大（最大 1MB）。",
    },
    admin: {
      title: "管理中心",
      editLink: "编辑链接",
      undo: "撤销",
      undoSuccess: "已撤销。",
      tabs: {
        link: "录入链接",
        category: "分类管理",
        tags: "标签管理",
        cloud: "云端同步",
        data: "数据备份",
        settings: "样式设置"
      },
      tags: {
        title: "标签库管理",
        globalTitle: "全局标签中心",
        globalDesc: "统一管理所有资源标签，支持批量重命名与自动合并。",
        searchPlaceholder: "筛选标签...",
        count: "{count} 个链接使用",
        usageCount: "{count} 个资源使用",
        rename: "重命名标签",
        renamePlaceholder: "新名称...",
        deleteTitle: "删除标签",
        deleteMessage: "确定从所有链接中移除标签 \"{tag}\" 吗？",
        renameSuccess: "标签已更新并自动合并。",
        empty: "暂未提取到任何标签。",
        mergeHint: "如果重命名为已存在的标签，它们将会自动合并。"
      },
      settings: {
        title: "品牌标识",
        desc: "自定义导航站的视觉呈现方案与品牌标识。",
        siteName: "网站名称",
        logo: "网站 Logo (左上角)",
        favicon: "浏览器图标 (Favicon)",
        background: "背景图片 (自选背景模式)",
        linkColumns: "桌面端链接栏数",
        columnsUnit: "栏",
        placeholderUrl: "https://...",
        upload: "上传图片",
        save: "保存所有设置",
        success: "设置已更新！",
        themeColorTitle: "配色方案预览 (THEME COLOR)",
        themeShadesTitle: "当前方案色阶预览 (SHADES PREVIEW)",
        themeCollections: {
          macaron: "马卡龙",
          morandi: "莫兰迪",
          traditional: "国风"
        },
        logoStyle: {
          title: "Logo 外观",
          shape: "Logo 形状",
          bgColor: "Logo 底色 (透明图片透出)",
          shapes: {
            square: "方形",
            rounded: "圆角矩形",
            circle: "圆形"
          }
        }
      },
      data: {
        exportTitle: "导出书签 (HTML)",
        exportDesc: "下载标准的 HTML 格式书签文件，您可以随时在各大浏览器中导入备份。",
        exportBtn: "开始导出",
        importTitle: "导入书签 (HTML)",
        importDesc: "上传标准的 HTML 格式书签文件，我们将从文件中快速提取全部分类链接。",
        importBtn: "选择文件",
        success: "导入成功！",
        error: "文件无效。",
        confirm: "确定要覆盖当前数据吗？"
      },
      link: {
        title: "标题",
        url: "链接地址",
        category: "主分类",
        subCategory: "子分类",
        general: "通用 / 无子分类",
        description: "描述",
        tags: "标签库",
        tagsPlaceholder: "输入新标签并按回车...",
        addTag: "添加",
        icon: "图标",
        iconBg: "图标底色 (选填, 用于透明图标)",
        uploadOrPaste: "上传并自动压缩图片",
        imageCompressed: "图片已压缩：{from} -> {to}",
        selectCategory: "-- 请选择 --",
        create: "创建链接",
        save: "保存修改",
        update: "更新链接",
        meta: {
          success: "元数据获取成功！",
          error: "获取失败。",
          pickerTitle: "精准多源元数据拾取",
          pickerDesc: "智能聚合多平台信息，请通过点击各项来组合您最满意的呈现效果。",
          abandon: "放弃",
          apply: "确认组合方案并应用",
          titleStrategy: "标题组合策略",
          iconStrategy: "图标呈现方案",
          descStrategy: "简介描述优化"
        },
        modes: {
          single: "单条录入",
          bulk: "批量导入",
          icons: "批量图标"
        },
        bulk: {
          label: "粘贴网址 (每行一个)",
          placeholder: "https://example.com\nbaidu.com\n...",
          defaultTitle: "默认标题 (选填)",
          defaultTitlePlaceholder: "留空则自动从网址获取标题",
          import: "立即导入",
          success: "成功导入 {count} 条链接"
        },
        icons: {
          upload: "上传图标",
          apply: "应用修改",
          hint: "选中上方图标后点击下方链接"
        }
      },
      category: {
        title: "分类管理",
        new: "新建主分类",
        newSub: "新建子分类",
        noSub: "暂无子分类",
        edit: "编辑主分类",
        editSub: "编辑子分类",
        name: "分类名称",
        deleteConfirm: "确定删除该分类及其所有链接吗？",
        deleteSubConfirm: "确定删除该子分类吗？",
        cancel: "取消",
        saveDone: "完成保存"
      },
      cloud: {
        enable: "启用同步功能",
        desc: "在多设备间同步导航数据。请选择您偏好的服务提供商以开始您的同步之旅。",
        saveConfig: "保存云端配置项",
        upload: "上传同步",
        download: "下回本地",
        github: {
          token: "GitHub 访问令牌",
          gistId: "Gist ID"
        },
        notion: {
          token: "集成令牌 (Token)",
          pageId: "页面 ID (Page ID)",
          proxy: "API 代理地址 (CORS)",
          proxyHelp: "由于浏览器 CORS 限制，直连 Notion API 可能失效，必须配置反向代理才能在浏览器正常使用。",
          publish: "发布到 Notion (追加)",
          help: "注意：由于跨域限制，Notion API 必须配置反向代理才能在浏览器使用。"
        },
        webdav: {
          url: "服务器地址",
          user: "账户邮箱",
          pass: "应用密码",
          help: "WebDAV 适用于坚果云等支持该协议的服务。请确保服务器已开启 CORS 跨域支持或使用代理服务器。"
        }
      }
    }
  }
};
