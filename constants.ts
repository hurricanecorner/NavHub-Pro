import { AppData } from './types';

export const DEFAULT_DATA: AppData = {
  categories: [
    {
      id: 'c1',
      name: 'AI Tools',
      subCategories: [
        { id: 'sc1-1', name: 'Chatbots' },
        { id: 'sc1-2', name: 'Image Gen' },
      ],
    },
    {
      id: 'c2',
      name: 'Development',
      subCategories: [
        { id: 'sc2-1', name: 'Frameworks' },
        { id: 'sc2-2', name: 'Docs' },
      ],
    },
    {
      id: 'c3',
      name: 'Design',
      subCategories: [
        { id: 'sc3-1', name: 'Inspiration' },
        { id: 'sc3-2', name: 'Icons' },
      ],
    }
  ],
  links: [
    {
      id: 'l1',
      title: 'ChatGPT',
      url: 'https://chat.openai.com',
      description: 'Advanced AI chatbot by OpenAI.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
      categoryId: 'c1',
      subCategoryId: 'sc1-1',
    },
    {
      id: 'l2',
      title: 'Midjourney',
      url: 'https://midjourney.com',
      description: 'Generative Artificial Intelligence program.',
      iconUrl: '', // Will use placeholder
      categoryId: 'c1',
      subCategoryId: 'sc1-2',
    },
    {
      id: 'l3',
      title: 'React',
      url: 'https://react.dev',
      description: 'The library for web and native user interfaces.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png',
      categoryId: 'c2',
      subCategoryId: 'sc2-1',
    },
    {
      id: 'l4',
      title: 'Tailwind CSS',
      url: 'https://tailwindcss.com',
      description: 'Rapidly build modern websites without leaving your HTML.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg',
      categoryId: 'c2',
      subCategoryId: 'sc2-1',
    },
    {
      id: 'l5',
      title: 'Dribbble',
      url: 'https://dribbble.com',
      description: 'Discover the world’s top designers & creative professionals.',
      iconUrl: '',
      categoryId: 'c3',
      subCategoryId: 'sc3-1',
    }
  ],
  siteConfig: {
    title: 'NavHub',
    logoUrl: '',
    faviconUrl: ''
  }
};