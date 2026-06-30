import { create } from 'zustand';
import { Locale, ApiConfig } from './types';

interface AppState {
  locale: Locale;
  apiConfig: ApiConfig;
  setLocale: (locale: Locale) => void;
  setApiConfig: (config: Partial<ApiConfig>) => void;
  loadConfig: () => void;
}

const defaultApiConfig: ApiConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export const useStore = create<AppState>((set) => ({
  locale: (localStorage.getItem('locale') as Locale) || 'zh',
  apiConfig: defaultApiConfig,
  
  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    set({ locale });
    window.location.reload();
  },
  
  setApiConfig: (config) => {
    const newConfig = { ...useStore.getState().apiConfig, ...config };
    localStorage.setItem('apiConfig', JSON.stringify(newConfig));
    set({ apiConfig: newConfig });
  },
  
  loadConfig: () => {
    const savedConfig = localStorage.getItem('apiConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig) as ApiConfig;
        set({ apiConfig: config });
      } catch {
        set({ apiConfig: defaultApiConfig });
      }
    }
  },
}));
