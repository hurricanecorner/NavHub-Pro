/**
 * Netscape Bookmark HTML Format Service
 * 负责与 Chrome、Edge、Safari、Firefox 等各大浏览器的标准书签 (HTML 文件) 互相导入与导出
 *
 * 核心对应规则：
 * 1. 导航站的【主分类】 = 浏览器最外层的一级文件夹 (Level 1 Folder)
 * 2. 导航站的【子分类】 = 浏览器主分类文件夹内的二级子文件夹 (Level 2 Subfolder)
 * 3. 直属主分类的链接 = 存放在一级文件夹直属路径下的书签
 * 4. 子分类下的链接 = 存放在对应二级子文件夹内的书签
 * 5. 智能识别并解包 Chrome / Edge 的 "书签栏 / Bookmarks bar / 收藏夹栏" 顶层容器，确保导入时不产生冗余层级。
 */

import { AppData, Category, LinkItem, SubCategory } from '../types';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 判断是否为 Chrome / Edge / Firefox 等浏览器自动生成的根书签栏容器
 */
function isBrowserToolbarRoot(h3Element: Element | null, folderName: string): boolean {
  if (h3Element) {
    const isToolbar =
      h3Element.getAttribute('personal_toolbar_folder') === 'true' ||
      h3Element.getAttribute('PERSONAL_TOOLBAR_FOLDER') === 'true';
    if (isToolbar) return true;
  }
  const clean = folderName.trim().toLowerCase();
  return [
    '书签栏',
    '收藏夹栏',
    'bookmarks bar',
    'bookmarks toolbar',
    'favorites bar',
    'personal toolbar folder',
  ].includes(clean);
}

/**
 * 将 NavHub 导航数据导出为标准 Netscape Bookmark HTML 文件
 */
export function exportHtmlBookmarks(data: AppData): { content: string; filename: string } {
  const links = data.links || [];
  const categories = data.categories || [];
  const now = Math.floor(Date.now() / 1000);

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // 1. 遍历所有主分类 (浏览器最外层一级主文件夹)
  categories.forEach((cat) => {
    const catLinks = links.filter((l) => l.categoryId === cat.id);
    const subCategories = cat.subCategories || [];

    html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(cat.name)}</H3>\n`;
    html += `    <DL><p>\n`;

    // 1.1 直属该主分类的常规链接 (未指定子分类)
    const directLinks = catLinks.filter((l) => !l.subCategoryId || !subCategories.some((s) => s.id === l.subCategoryId));
    directLinks.forEach((link) => {
      const iconAttr = link.iconUrl ? ` ICON="${escapeHtml(link.iconUrl)}"` : '';
      const tagsAttr = link.tags && link.tags.length > 0 ? ` TAGS="${escapeHtml(link.tags.join(','))}"` : '';
      html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${now}"${iconAttr}${tagsAttr}>${escapeHtml(link.title || link.url)}</A>\n`;
      if (link.description) {
        html += `        <DD>${escapeHtml(link.description)}\n`;
      }
    });

    // 1.2 各子分类 (浏览器主文件夹内的二级子文件夹)
    subCategories.forEach((sub) => {
      const subLinks = catLinks.filter((l) => l.subCategoryId === sub.id);
      html += `        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(sub.name)}</H3>\n`;
      html += `        <DL><p>\n`;
      subLinks.forEach((link) => {
        const iconAttr = link.iconUrl ? ` ICON="${escapeHtml(link.iconUrl)}"` : '';
        const tagsAttr = link.tags && link.tags.length > 0 ? ` TAGS="${escapeHtml(link.tags.join(','))}"` : '';
        html += `            <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${now}"${iconAttr}${tagsAttr}>${escapeHtml(link.title || link.url)}</A>\n`;
        if (link.description) {
          html += `            <DD>${escapeHtml(link.description)}\n`;
        }
      });
      html += `        </DL><p>\n`;
    });

    html += `    </DL><p>\n`;
  });

  // 2. 处理可能没有分配到任何现有主分类的孤立链接
  const allCatIds = new Set(categories.map((c) => c.id));
  const orphanLinks = links.filter((l) => !allCatIds.has(l.categoryId));
  if (orphanLinks.length > 0) {
    html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">未分类书签</H3>\n`;
    html += `    <DL><p>\n`;
    orphanLinks.forEach((link) => {
      const iconAttr = link.iconUrl ? ` ICON="${escapeHtml(link.iconUrl)}"` : '';
      html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${now}"${iconAttr}>${escapeHtml(link.title || link.url)}</A>\n`;
      if (link.description) {
        html += `        <DD>${escapeHtml(link.description)}\n`;
      }
    });
    html += `    </DL><p>\n`;
  }

  html += `</DL><p>\n`;

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `bookmarks-${dateStr}.html`;

  return { content: html, filename };
}

/**
 * 解析从各大浏览器导出的标准 HTML 书签文件
 */
export function parseHtmlBookmarks(htmlContent: string): {
  categories: Category[];
  links: LinkItem[];
  summary: { categoryCount: number; linkCount: number };
} {
  const categories: Category[] = [];
  const links: LinkItem[] = [];

  let catCounter = 1;
  let subCounter = 1;
  let linkCounter = 1;

  // 浏览器环境下使用原生的 DOMParser
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const processDl = (
      dlElement: Element,
      currentCat: Category | null,
      currentSub: SubCategory | null
    ) => {
      const children = Array.from(dlElement.children);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const tag = child.tagName.toUpperCase();

        if (tag === 'DT') {
          const h3 = child.querySelector('h3, H3');
          const a = child.querySelector('a, A');

          if (h3) {
            const folderName = (h3.textContent || '').trim() || '未命名分类';
            // 查找属于该 DT 的下一级 DL
            const nextDl =
              child.querySelector('dl, DL') ||
              (children[i + 1]?.tagName.toUpperCase() === 'DD' && children[i + 1]?.querySelector('dl, DL')) ||
              (children[i + 1]?.tagName.toUpperCase() === 'DL' ? children[i + 1] : null);

            // 智能解包：如果最外层是 Chrome/Edge 的“书签栏/Bookmarks bar”，直接下钻解包
            if (!currentCat && isBrowserToolbarRoot(h3, folderName)) {
              if (nextDl) {
                processDl(nextDl, null, null);
              }
              continue;
            }

            if (!currentCat) {
              // 第一层文件夹：创建为【主分类】
              let existingCat = categories.find((c) => c.name === folderName);
              if (!existingCat) {
                existingCat = {
                  id: `cat_import_${Date.now()}_${catCounter++}`,
                  name: folderName,
                  subCategories: [],
                };
                categories.push(existingCat);
              }
              if (nextDl) {
                processDl(nextDl, existingCat, null);
              }
            } else if (!currentSub) {
              // 第二层文件夹：创建为【子分类】
              let existingSub = currentCat.subCategories.find((s) => s.name === folderName);
              if (!existingSub) {
                existingSub = {
                  id: `sub_import_${Date.now()}_${subCounter++}`,
                  name: folderName,
                };
                currentCat.subCategories.push(existingSub);
              }
              if (nextDl) {
                processDl(nextDl, currentCat, existingSub);
              }
            } else {
              // 超过两级的更深层文件夹：归纳至当前子分类下
              if (nextDl) {
                processDl(nextDl, currentCat, currentSub);
              }
            }
          } else if (a) {
            const href = a.getAttribute('href') || '';
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              const title = (a.textContent || '').trim() || href;
              const iconUrl = a.getAttribute('icon') || a.getAttribute('icon_uri') || '';
              const tagsAttr = a.getAttribute('tags') || '';
              const tags = tagsAttr
                ? tagsAttr.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

              let description = '';
              if (child.nextElementSibling?.tagName.toUpperCase() === 'DD') {
                description = (child.nextElementSibling.textContent || '').trim();
              }

              let targetCat = currentCat;
              if (!targetCat) {
                targetCat = categories.find((c) => c.name === '常用书签') || null;
                if (!targetCat) {
                  targetCat = {
                    id: `cat_import_${Date.now()}_${catCounter++}`,
                    name: '常用书签',
                    subCategories: [],
                  };
                  categories.push(targetCat);
                }
              }

              links.push({
                id: `link_import_${Date.now()}_${linkCounter++}`,
                title,
                url: href,
                description,
                iconUrl: iconUrl || undefined,
                categoryId: targetCat.id,
                subCategoryId: currentSub ? currentSub.id : '',
                tags: tags.length > 0 ? tags : undefined,
              });
            }
          }
        } else if (tag === 'DL') {
          processDl(child, currentCat, currentSub);
        }
      }
    };

    const rootDl = doc.querySelector('dl, DL');
    if (rootDl) {
      processDl(rootDl, null, null);
    } else {
      const allLinks = Array.from(doc.querySelectorAll('a, A'));
      if (allLinks.length > 0) {
        const defaultCat: Category = {
          id: `cat_import_${Date.now()}_${catCounter++}`,
          name: '常用书签',
          subCategories: [],
        };
        categories.push(defaultCat);
        allLinks.forEach((a) => {
          const href = a.getAttribute('href') || '';
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            links.push({
              id: `link_import_${Date.now()}_${linkCounter++}`,
              title: (a.textContent || '').trim() || href,
              url: href,
              description: '',
              iconUrl: a.getAttribute('icon') || undefined,
              categoryId: defaultCat.id,
              subCategoryId: '',
            });
          }
        });
      }
    }
  }

  // 保证至少有分类容纳链接
  if (categories.length === 0 && links.length > 0) {
    const defaultCat: Category = {
      id: `cat_import_${Date.now()}_${catCounter++}`,
      name: '导入书签',
      subCategories: [],
    };
    categories.push(defaultCat);
    links.forEach((l) => (l.categoryId = defaultCat.id));
  }

  return {
    categories,
    links,
    summary: {
      categoryCount: categories.length,
      linkCount: links.length,
    },
  };
}
