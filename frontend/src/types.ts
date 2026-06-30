export type NovelStatus = 'draft' | 'confirmed' | 'generating' | 'done' | 'interrupted';
export type Category = '玄幻' | '奇幻' | '都市' | '历史' | '科幻' | '悬疑' | '言情' | '武侠';
export type Locale = 'zh' | 'en';

export interface Chapter {
  id: number;
  volume_id: number;
  order: number;
  title: string;
  outline: string;
  content: string | null;
}

export interface Volume {
  id: number;
  novel_id: number;
  order: number;
  title: string;
  description: string;
  chapters: Chapter[];
}

export interface Novel {
  id: number;
  title: string;
  category: Category;
  user_idea: string;
  word_count: number;
  status: NovelStatus;
  created_at: string;
  updated_at: string;
  volumes?: Volume[];
}

export interface ApiConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export interface Progress {
  current: number;
  total: number;
  currentChapter: string | null;
  status: NovelStatus;
  logs?: string[];
}

export interface IdeaDimensions {
  protagonist: string;
  world: string;
  conflict: string;
  style: string;
  advantage: string;
}
