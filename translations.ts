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
    },
    admin: {
      title: "Admin Dashboard",
      editLink: "Edit Link",
      undo: "Undo Last Action",
      undoSuccess: "Changes reverted successfully.",
      tabs: {
        addLink: "Add Link",
        categories: "Categories",
        notion: "Notion Sync"
      },
      link: {
        title: "Title",
        url: "URL",
        category: "Category",
        subCategory: "Sub-Category",
        description: "Description",
        icon: "Icon",
        uploadOrPaste: "Or paste image URL...",
        selectCategory: "-- Select --",
        create: "Create Link",
        update: "Update Link",
        validation: {
          titleRequired: "Title is required",
          urlRequired: "URL is required",
          urlInvalid: "Invalid URL format (must start with http:// or https://)",
          categoryRequired: "Category is required"
        },
        modes: {
          single: "Single Entry",
          bulk: "Bulk Import"
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
        }
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
        addSub: "Add Sub-Category",
        editSub: "Edit Sub-Category",
        selectParent: "Select Parent Category",
        subName: "Sub-Category Name",
        deleteConfirm: "Delete category? All links inside will be hidden/deleted.",
        deleteSubConfirm: "Delete sub-category? Links associated with it will be hidden.",
        bulkIcons: {
          title: "Bulk Icon Upload",
          drop: "Drop icons here",
          instructions: "Select an icon from the left, then click a category on the right to assign.",
          unassigned: "Unassigned Icons",
          assigned: "Target Categories",
          apply: "Apply Changes",
          clear: "Clear All"
        }
      },
      notion: {
        warning: "Deploying to Notion requires an Integration Token and a Database ID.",
        warningNote: "Note: Direct API syncing from this browser interface often requires a CORS proxy.",
        token: "Notion Integration Token",
        dbId: "Database ID",
        enable: "Enable Integration",
        save: "Save Settings",
        sync: "Sync Now",
        syncing: "Syncing...",
        saved: "Configuration saved locally."
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
    },
    admin: {
      title: "后台管理",
      editLink: "编辑链接",
      undo: "撤销上一步",
      undoSuccess: "操作已撤销。",
      tabs: {
        addLink: "添加链接",
        categories: "分类管理",
        notion: "Notion 同步"
      },
      link: {
        title: "标题",
        url: "链接地址",
        category: "主分类",
        subCategory: "子分类",
        description: "描述",
        icon: "图标",
        uploadOrPaste: "或粘贴图片链接...",
        selectCategory: "-- 请选择 --",
        create: "创建链接",
        update: "更新链接",
        validation: {
          titleRequired: "标题不能为空",
          urlRequired: "链接地址不能为空",
          urlInvalid: "无效的链接格式 (必须以 http:// 或 https:// 开头)",
          categoryRequired: "请选择分类"
        },
        modes: {
          single: "单条录入",
          bulk: "批量导入"
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
        }
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
        addSub: "添加子分类",
        editSub: "编辑子分类",
        selectParent: "选择父级分类",
        subName: "子分类名称",
        deleteConfirm: "确定删除该分类吗？其下的所有链接也将被删除。",
        deleteSubConfirm: "确定删除该子分类吗？相关联的链接将被隐藏。",
        bulkIcons: {
          title: "批量上传图标",
          drop: "拖拽上传图标",
          instructions: "点击左侧图标选中，然后点击右侧分类进行关联。",
          unassigned: "未分配图标",
          assigned: "目标分类",
          apply: "应用图标",
          clear: "清空所有"
        }
      },
      notion: {
        warning: "部署到 Notion 需要集成令牌 (Token) 和数据库 ID。",
        warningNote: "注意：由于 CORS 限制，直接从浏览器同步通常需要代理服务器。",
        token: "Notion 集成令牌 (Token)",
        dbId: "数据库 ID",
        enable: "启用集成",
        save: "保存设置",
        sync: "立即同步",
        syncing: "同步中...",
        saved: "配置已保存到本地。"
      }
    }
  }
};