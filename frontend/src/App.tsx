import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import { t } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import NovelList from './pages/NovelList';
import CreatePage from './pages/CreatePage';
import OutlineEditor from './components/OutlineEditor';
import NovelReader from './components/NovelReader';
import ModelSettings from './components/ModelSettings';
import { Globe, Settings, Plus } from 'lucide-react';

function App() {
  const { locale, setLocale, loadConfig } = useStore();
  
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);
  
  const toggleLocale = () => {
    setLocale(locale === 'zh' ? 'en' : 'zh');
  };
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-white border-b border-border">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-primary">{t('appName', locale)}</h1>
                <span className="text-sm text-gray">{t('appSubtitle', locale)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLocale}
                  className="vercel-btn-secondary flex items-center gap-1.5"
                  title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
                >
                  <Globe size={16} />
                  {locale === 'zh' ? 'EN' : '中'}
                </button>
                
                <button
                  onClick={() => window.location.href = '/settings'}
                  className="vercel-btn-secondary flex items-center gap-1.5"
                >
                  <Settings size={16} />
                  {t('settings', locale)}
                </button>
                
                <button
                  onClick={() => window.location.href = '/create'}
                  className="vercel-btn-primary flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  {t('create', locale)}
                </button>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<NovelList />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/novel/:id" element={<OutlineEditor />} />
              <Route path="/novel/:id/read" element={<NovelReader />} />
              <Route path="/settings" element={<ModelSettings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
