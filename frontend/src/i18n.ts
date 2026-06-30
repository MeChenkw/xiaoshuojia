import { Locale } from './types';

const translations = {
  zh: {
    appName: '小说家',
    appSubtitle: 'AI 辅助小说创作工具',
    
    // Navigation
    home: '首页',
    settings: '设置',
    create: '创建小说',
    
    // Categories
    categories: {
      '玄幻': '玄幻',
      '奇幻': '奇幻',
      '都市': '都市',
      '历史': '历史',
      '科幻': '科幻',
      '悬疑': '悬疑',
      '言情': '言情',
      '武侠': '武侠',
    },
    
    // Status
    status: {
      draft: '草稿',
      confirmed: '已确认',
      generating: '生成中',
      done: '已完成',
      interrupted: '已中断',
    },
    
    // Novel List
    novelList: '我的小说',
    emptyState: '还没有小说，点击上方按钮创建你的第一部作品',
    words: '字',
    lastUpdated: '最后更新',
    continueGenerate: '继续生成',
    deleteNovel: '删除小说',
    deleteConfirm: '确定要删除这部小说吗？此操作不可撤销。',
    
    // Create Page
    selectCategory: '选择分类',
    targetWordCount: '目标字数',
    storyIdea: '故事创意',
    storyIdeaPlaceholder: '描述你的故事创意...',
    submitIdea: '提交创意',
    
    // Idea Enhancer
    ideaEnhancer: {
      title: '完善你的创意',
      protagonist: '主角设定',
      protagonistHint: '主角的身份和性格是怎样的？',
      world: '世界观',
      worldHint: '故事发生在怎样的世界里？',
      conflict: '核心冲突',
      conflictHint: '故事的主要矛盾是什么？',
      style: '风格基调',
      styleHint: '你期望的创作风格是什么？',
      advantage: '主角优势',
      advantageHint: '主角有什么独特优势？',
      aiSuggest: 'AI 换一批',
      next: '下一步',
      prev: '上一步',
      skip: '跳过',
      confirm: '确认',
      selectOption: '选择一个选项或输入自定义内容',
      customInput: '或输入自定义内容...',
      close: '返回',
      refresh: '换一批',
      refreshTooltip: '获取更多创意选项',
      aiGenerating: 'AI 生成中...',
      enhanceComplete: '创意已完善',
      enhancedIdea: '完善后的创意',
      applyAndSubmit: '应用并生成大纲',
      applyOnly: '应用到创意框',
      backToEdit: '返回修改',
    },
    
    // Outline Editor
    outlineEditor: {
      novelTitle: '小说标题',
      volumeTitle: '卷标题',
      volumeDesc: '卷简介',
      chapterTitle: '章节标题',
      chapterOutline: '章节大纲',
      save: '保存',
      confirm: '确认大纲',
      modify: '修改大纲',
      generate: '开始生成',
      generating: '生成中...',
      editMode: '编辑模式',
      readMode: '只读模式',
    },
    
    // Reader
    reader: {
      tableOfContents: '目录',
      toggleSidebar: '切换目录',
      downloadTxt: '下载 TXT',
      exportEpub: '导出 EPUB',
      previousChapter: '上一章',
      nextChapter: '下一章',
      editChapter: '编辑章节',
      saveChapter: '保存',
      cancelEdit: '取消',
      back: '返回',
      backToOutline: '返回大纲',
      backToList: '返回列表',
      refresh: '刷新',
      navigation: '章节导航',
      currentChapter: '当前章节',
      chapterActions: '章节操作',
      chapterDownload: '章节下载',
    },
    
    // Settings
    settingsPage: {
      title: '模型设置',
      quickSelect: '快速选择',
      provider: '提供商',
      apiKey: 'API Key',
      baseUrl: 'Base URL',
      model: '模型',
      testConnection: '测试连接',
      connectionSuccess: '连接成功！',
      connectionFailed: '连接失败：',
      save: '保存设置',
      privacyNote: '你的 API Key 仅存储在本地浏览器中，不会发送到我们的服务器。',
      providers: {
        openai: 'OpenAI',
        deepseek: 'DeepSeek',
        siliconflow: '硅基流动',
        ollama: 'Ollama (本地)',
      },
    },
    
    // Progress
    progress: {
      generating: '正在生成',
      current: '当前章节',
      completed: '已完成',
      total: '总章节数',
      stuck: '生成似乎卡住了',
    },
    
    // Common
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    save: '保存',
    loading: '加载中...',
    error: '出错了',
    retry: '重试',
    demo: '演示',
    demoSeed: '加载演示数据',
  },
  
  en: {
    appName: 'Novelist',
    appSubtitle: 'AI-Powered Novel Writing Tool',
    
    // Navigation
    home: 'Home',
    settings: 'Settings',
    create: 'Create Novel',
    
    // Categories
    categories: {
      '玄幻': 'Xianxia',
      '奇幻': 'Fantasy',
      '都市': 'Urban',
      '历史': 'Historical',
      '科幻': 'Sci-Fi',
      '悬疑': 'Mystery',
      '言情': 'Romance',
      '武侠': 'Wuxia',
    },
    
    // Status
    status: {
      draft: 'Draft',
      confirmed: 'Confirmed',
      generating: 'Generating',
      done: 'Done',
      interrupted: 'Interrupted',
    },
    
    // Novel List
    novelList: 'My Novels',
    emptyState: 'No novels yet. Click the button above to create your first work.',
    words: 'words',
    lastUpdated: 'Last updated',
    continueGenerate: 'Continue',
    deleteNovel: 'Delete Novel',
    deleteConfirm: 'Are you sure you want to delete this novel? This cannot be undone.',
    
    // Create Page
    selectCategory: 'Select Category',
    targetWordCount: 'Target Word Count',
    storyIdea: 'Story Idea',
    storyIdeaPlaceholder: 'Describe your story idea...',
    submitIdea: 'Submit Idea',
    
    // Idea Enhancer
    ideaEnhancer: {
      title: 'Enhance Your Idea',
      protagonist: 'Protagonist',
      protagonistHint: 'Who is your protagonist and what are their characteristics?',
      world: 'World',
      worldHint: 'What world does the story take place in?',
      conflict: 'Core Conflict',
      conflictHint: 'What is the main conflict of the story?',
      style: 'Style',
      styleHint: 'What writing style do you expect?',
      advantage: 'Advantage',
      advantageHint: 'What unique advantage does the protagonist have?',
      aiSuggest: 'AI Suggest More',
      next: 'Next',
      prev: 'Previous',
      skip: 'Skip',
      confirm: 'Confirm',
      selectOption: 'Select an option or enter custom content',
      customInput: 'Or enter custom content...',
      close: 'Back',
      refresh: 'Refresh',
      refreshTooltip: 'Get more creative options',
      aiGenerating: 'AI generating...',
      enhanceComplete: 'Idea Enhanced',
      enhancedIdea: 'Enhanced Idea',
      applyAndSubmit: 'Apply & Generate Outline',
      applyOnly: 'Apply to Idea Box',
      backToEdit: 'Back to Edit',
    },
    
    // Outline Editor
    outlineEditor: {
      novelTitle: 'Novel Title',
      volumeTitle: 'Volume Title',
      volumeDesc: 'Volume Description',
      chapterTitle: 'Chapter Title',
      chapterOutline: 'Chapter Outline',
      save: 'Save',
      confirm: 'Confirm Outline',
      modify: 'Modify Outline',
      generate: 'Start Generating',
      generating: 'Generating...',
      editMode: 'Edit Mode',
      readMode: 'Read Mode',
    },
    
    // Reader
    reader: {
      tableOfContents: 'Contents',
      toggleSidebar: 'Toggle Sidebar',
      downloadTxt: 'Download TXT',
      exportEpub: 'Export EPUB',
      previousChapter: 'Previous',
      nextChapter: 'Next',
      editChapter: 'Edit',
      saveChapter: 'Save',
      cancelEdit: 'Cancel',
      back: 'Back',
      backToOutline: 'Back to Outline',
      backToList: 'Back to List',
      refresh: 'Refresh',
      navigation: 'Navigation',
      currentChapter: 'Current Chapter',
      chapterActions: 'Chapter Actions',
      chapterDownload: 'Chapter Download',
    },
    
    // Settings
    settingsPage: {
      title: 'Model Settings',
      quickSelect: 'Quick Select',
      provider: 'Provider',
      apiKey: 'API Key',
      baseUrl: 'Base URL',
      model: 'Model',
      testConnection: 'Test Connection',
      connectionSuccess: 'Connection successful!',
      connectionFailed: 'Connection failed:',
      save: 'Save Settings',
      privacyNote: 'Your API key is stored only in your local browser and will not be sent to our servers.',
      providers: {
        openai: 'OpenAI',
        deepseek: 'DeepSeek',
        siliconflow: 'SiliconFlow',
        ollama: 'Ollama (Local)',
      },
    },
    
    // Progress
    progress: {
      generating: 'Generating',
      current: 'Current Chapter',
      completed: 'Completed',
      total: 'Total Chapters',
      stuck: 'Generation seems stuck',
    },
    
    // Common
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    demo: 'Demo',
    demoSeed: 'Load Demo Data',
  },
};

type TranslationKeys = typeof translations.zh;

export function t(key: string, locale: Locale = 'zh'): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale];
}
