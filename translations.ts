
import { Language } from './types';

export const TRANSLATIONS = {
  en: {
    app: {
      title: "NavHub",
      searchPlaceholder: "Search resources...",
      admin: "Admin",
      toggleEdit: "Toggle Edit Mode",
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
        system: "System"
      },
      searchResults: "Search Results",
      noResults: "No results found.",
      addLink: "Add Link",
      deleteLinkConfirm: "Are you sure you want to delete this link?",
      noSubCategories: "No sub-categories defined.",
      visit: "Visit",
      // Toast Messages
      success: "Success",
      saved: "Saved successfully",
      deleted: "Deleted successfully",
      configSaved: "Configuration saved successfully",
      enableSyncFirst: "Please enable cloud sync first.",
      missingGithubToken: "Please configure GitHub Token.",
      missingNotionConfig: "Please configure Notion Token and Page ID.",
      missingGithubConfig: "Please configure GitHub Token and Gist ID.",
      linkDeleted: "Link deleted.",
    },
    admin: {
      title: "Admin Dashboard",
      editLink: "Edit Link",
      undo: "Undo Last Action",
      undoSuccess: "Changes reverted successfully.",
      tabs: {
        addLink: "Add Link",
        categories: "Categories",
        cloud: "Cloud Sync",
        data: "Data Backup"
      },
      data: {
        exportTitle: "Export Bookmarks",
        exportDesc: "Download a standard Bookmarks HTML file. Categories become folders.",
        exportBtn: "Export to HTML",
        importTitle: "Import Bookmarks",
        importDesc: "Restore data from a Bookmarks HTML file. Warning: This will overwrite current data.",
        importBtn: "Import from HTML",
        success: "Bookmarks imported successfully!",
        error: "Invalid HTML file format.",
        confirm: "This will overwrite all your current categories and links. Are you sure you want to proceed?"
      },
      link: {
        title: "Title",
        url: "URL",
        category: "Category",
        subCategory: "Sub-Category",
        description: "Description",
        tags: "Tags",
        addTag: "Add",
        suggestedTags: "Suggested Tags",
        icon: "Icon",
        uploadOrPaste: "Or paste image URL...",
        selectCategory: "-- Select --",
        create: "Create Link",
        update: "Update Link",
        delete: "Delete Link",
        validation: {
          titleRequired: "Title is required",
          urlRequired: "URL is required",
          urlInvalid: "Invalid URL format (must start with http:// or https://)",
          categoryRequired: "Category is required",
          tagExists: "Tag already exists in this list!"
        },
        meta: {
          fetch: "Auto-fill details",
          fetching: "Fetching metadata...",
          success: "Metadata fetched!",
          error: "Could not fetch metadata."
        },
        modes: {
          single: "Single Entry",
          bulk: "Bulk Import",
          icons: "Bulk Icons"
        },
        bulk: {
          label: "Paste URLs (one per line)",
          placeholder: "https://example.com\ngoogle.com\n...",
          defaultTitle: "Default Title (Optional)",
          defaultTitlePlaceholder: "Leave empty to infer from URL",
          import: "Import Links",
          success: "Successfully imported {count} links!",
          error: "No valid URLs found. Please check your input.",
          processing: "Processing..."
        },
        bulkIcons: {
          title: "Bulk Icon Upload",
          drop: "Drop icons here",
          instructions: "Select an icon from the left, then click a link on the right to assign.",
          unassigned: "Unassigned Icons",
          assigned: "Target Links",
          apply: "Apply Icons",
          clear: "Clear All",
          success: "Icons applied successfully!"
        },
        created: "Link created successfully.",
        updated: "Link updated successfully.",
      },
      category: {
        new: "New Main Category",
        edit: "Edit Category",
        name: "Name",
        icon: "Icon",
        cancel: "Cancel",
        create: "Create",
        update: "Update",
        existing: "Existing Categories",
        noCategories: "No categories found.",
        addSub: "New Sub-Category",
        editSub: "Edit Sub-Category",
        selectParent: "Select Parent Category",
        subName: "Sub-Category Name",
        deleteConfirm: "Delete category? All links inside will be hidden/deleted.",
        deleteSubConfirm: "Delete sub-category? Links associated with it will be hidden.",
        created: "Category created successfully.",
        updated: "Category updated successfully.",
        deleted: "Category deleted.",
        subCreated: "Sub-category created successfully.",
        subUpdated: "Sub-category updated successfully.",
        subDeleted: "Sub-category deleted.",
        bulkIcons: {
          title: "Bulk Icon Upload",
          drop: "Drop icons here",
          instructions: "Select an icon from the left, then click a category on the right to assign.",
          unassigned: "Unassigned Icons",
          assigned: "Target Categories",
          apply: "Apply Changes",
          clear: "Clear All",
          success: "Icons applied successfully!"
        }
      },
      cloud: {
        title: "Cloud Synchronization",
        desc: "Sync your navigation data across devices. Choose your preferred provider.",
        provider: "Sync Provider",
        github: {
          tokenLabel: "GitHub Personal Access Token",
          tokenPlaceholder: "ghp_...",
          gistLabel: "Gist ID",
          gistPlaceholder: "Leave empty to create new, or paste ID to sync",
          help: "How to get a Token?",
          helpText: "Go to GitHub Settings -> Developer settings -> Personal access tokens (Classic). Select 'gist' scope.",
        },
        notion: {
          tokenLabel: "Notion Integration Token",
          tokenPlaceholder: "secret_...",
          pageLabel: "Page ID",
          pagePlaceholder: "32-character Page ID",
          apiUrlLabel: "Notion API URL (Proxy)",
          apiUrlPlaceholder: "https://your-worker.workers.dev/v1",
          help: "Setup Guide",
          helpText: "Create an Integration in Notion. Share a page with it. Copy the Page ID from the URL."
        },
        enable: "Enable Cloud Sync",
        saveConfig: "Save Configuration",
        upload: "Upload to Cloud",
        download: "Download from Cloud",
        uploadSuccess: "Data uploaded successfully!",
        downloadSuccess: "Data downloaded successfully!",
        warning: "Downloading will overwrite your current local data.",
        providerWarning: "Note: Notion API requires a proxy (e.g., Cloudflare Worker) to work in the browser due to CORS."
      }
    }
  },
  zh: {
    app: {
      title: "导航站",
      searchPlaceholder: "搜索资源...",
      admin: "管理后台",
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
        system: "跟随系统"
      },
      searchResults: "搜索结果",
      noResults: "未找到结果。",
      addLink: "添加链接",
      deleteLinkConfirm: "确定要删除此链接吗？",
      noSubCategories: "暂无子分类。",
      visit: "访问",
      // Toast Messages
      success: "操作成功",
      saved: "保存成功",
      deleted: "删除成功",
      configSaved: "配置已保存",
      enableSyncFirst: "请先启用云同步功能。",
      missingGithubToken: "请配置 GitHub Token。",
      missingNotionConfig: "请配置 Notion Token 和 Page ID。",
      missingGithubConfig: "请配置 GitHub Token 和 Gist ID。",
      linkDeleted: "链接已删除。",
    },
    admin: {
      title: "后台管理",
      editLink: "编辑链接",
      undo: "撤销上一步",
      undoSuccess: "操作已撤销。",
      tabs: {
        addLink: "添加链接",
        categories: "分类管理",
        cloud: "云端同步",
        data: "数据备份"
      },
      data: {
        exportTitle: "导出书签",
        exportDesc: "将数据导出为标准书签 HTML 文件，主分类和子分类将变为文件夹。",
        exportBtn: "导出为 HTML",
        importTitle: "导入书签",
        importDesc: "从书签 HTML 文件恢复数据。警告：这将覆盖当前所有数据。",
        importBtn: "从 HTML 导入",
        success: "书签导入成功！",
        error: "无效的 HTML 文件格式。",
        confirm: "这将覆盖当前所有的分类和链接数据，确定要继续吗？"
      },
      link: {
        title: "标题",
        url: "链接地址",
        category: "主分类",
        subCategory: "子分类",
        description: "描述",
        tags: "标签",
        addTag: "添加",
        suggestedTags: "常用标签",
        icon: "图标",
        uploadOrPaste: "或粘贴图片链接...",
        selectCategory: "-- 请选择 --",
        create: "创建链接",
        update: "更新链接",
        delete: "删除链接",
        validation: {
          titleRequired: "标题不能为空",
          urlRequired: "链接地址不能为空",
          urlInvalid: "无效的链接格式 (必须以 http:// 或 https:// 开头)",
          categoryRequired: "请选择分类",
          tagExists: "该标签已存在！"
        },
        meta: {
          fetch: "自动获取详情",
          fetching: "正在获取元数据...",
          success: "元数据获取成功！",
          error: "无法获取元数据"
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
          defaultTitlePlaceholder: "留空则自动从网址获取",
          import: "导入链接",
          success: "成功导入 {count} 个链接！",
          error: "未发现有效网址，请检查输入。",
          processing: "处理中..."
        },
        bulkIcons: {
          title: "批量上传图标",
          drop: "拖拽上传图标",
          instructions: "点击左侧图标选中，然后点击右侧链接进行关联。",
          unassigned: "未分配图标",
          assigned: "目标链接",
          apply: "应用图标",
          clear: "清空所有",
          success: "图标应用成功！"
        },
        created: "链接创建成功。",
        updated: "链接更新成功。",
      },
      category: {
        new: "新建主分类",
        edit: "编辑主分类",
        name: "名称",
        icon: "图标",
        cancel: "取消",
        create: "创建",
        update: "更新",
        existing: "已有分类",
        noCategories: "暂无分类。",
        addSub: "新建子分类",
        editSub: "编辑子分类",
        selectParent: "选择父级分类",
        subName: "子分类名称",
        deleteConfirm: "确定删除该分类吗？其下的所有链接也将被删除。",
        deleteSubConfirm: "确定删除该子分类吗？相关联的链接将被隐藏。",
        created: "分类创建成功。",
        updated: "分类更新成功。",
        deleted: "分类已删除。",
        subCreated: "子分类创建成功。",
        subUpdated: "子分类更新成功。",
        subDeleted: "子分类已删除。",
        bulkIcons: {
          title: "批量上传图标",
          drop: "拖拽上传图标",
          instructions: "点击左侧图标选中，然后点击右侧分类进行关联。",
          unassigned: "未分配图标",
          assigned: "目标分类",
          apply: "应用图标",
          clear: "清空所有",
          success: "图标应用成功！"
        }
      },
      cloud: {
        title: "云端同步",
        desc: "在多设备间同步导航数据。请选择您偏好的服务提供商。",
        provider: "同步服务商",
        github: {
          tokenLabel: "GitHub 访问令牌 (Token)",
          tokenPlaceholder: "ghp_...",
          gistLabel: "Gist ID",
          gistPlaceholder: "留空新建，或粘贴 ID 同步",
          help: "如何获取 Token？",
          helpText: "GitHub Settings -> Developer settings -> Personal access tokens (Classic). 勾选 'gist' 权限。",
        },
        notion: {
          tokenLabel: "Notion Integration Token",
          tokenPlaceholder: "secret_...",
          pageLabel: "Page ID (页面 ID)",
          pagePlaceholder: "32位 Page ID",
          apiUrlLabel: "Notion API 地址 (代理)",
          apiUrlPlaceholder: "https://your-worker.workers.dev/v1",
          help: "配置指南",
          helpText: "在 Notion 创建 Integration，将页面分享给它，从 URL 复制 Page ID。"
        },
        enable: "启用同步功能",
        saveConfig: "保存配置",
        upload: "上传到云端",
        download: "从云端下载",
        uploadSuccess: "上传成功！",
        downloadSuccess: "数据下载成功！",
        warning: "下载将覆盖当前的本地数据。",
        providerWarning: "注意：由于浏览器跨域(CORS)限制，您必须配置反向代理(如 Cloudflare Worker)才能使用 Notion。"
      }
    }
  }
};
