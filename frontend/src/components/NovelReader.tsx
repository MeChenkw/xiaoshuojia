import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { t } from '../i18n';
import { getNovel, updateChapter, downloadTxt, exportEpub, downloadChapterTxt, exportChapterEpub, generateNovel, stopGeneration } from '../api';
import { Novel } from '../types';
import GenerateProgress from './GenerateProgress';
import { 
  ArrowLeft, List, X, ChevronLeft, ChevronRight, 
  Download, BookOpen, Edit3, Save, Loader2, Play, AlertCircle, RefreshCw
} from 'lucide-react';

function NovelReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale } = useStore();
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentVolumeIndex, setCurrentVolumeIndex] = useState(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastProgressRef = useRef(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  const novelId = parseInt(id || '0', 10);

  useEffect(() => {
    if (novelId) {
      loadNovel();
    }
  }, [novelId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadNovel = async () => {
    try {
      const data = await getNovel(novelId);
      setNovel(data);
      
      outer: for (let v = 0; v < (data.volumes?.length || 0); v++) {
        for (let c = 0; c < (data.volumes?.[v]?.chapters?.length || 0); c++) {
          if (data.volumes?.[v]?.chapters?.[c]?.content) {
            setCurrentVolumeIndex(v);
            setCurrentChapterIndex(c);
            break outer;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load novel:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNovel();
    setRefreshing(false);
  };

  const handleDownloadTxt = async () => {
    setDownloading(true);
    try {
      await downloadTxt(novelId);
    } catch (e) {
      console.error('Failed to download:', e);
    }
    setDownloading(false);
  };

  const handleExportEpub = async () => {
    setDownloading(true);
    try {
      await exportEpub(novelId);
    } catch (e) {
      console.error('Failed to export:', e);
    }
    setDownloading(false);
  };

  const handleDownloadChapterTxt = async () => {
    if (!currentChapter?.id) return;
    setDownloading(true);
    try {
      await downloadChapterTxt(novelId, currentChapter.id);
    } catch (e) {
      console.error('Failed to download chapter:', e);
    }
    setDownloading(false);
  };

  const handleExportChapterEpub = async () => {
    if (!currentChapter?.id) return;
    setDownloading(true);
    try {
      await exportChapterEpub(novelId, currentChapter.id);
    } catch (e) {
      console.error('Failed to export chapter:', e);
    }
    setDownloading(false);
  };

  const handleContinueGenerate = async () => {
    try {
      setContinuing(true);
      const result = await generateNovel(novelId);
      if (result.status === 'error' || result.status === 'already generating') {
        alert('生成状态: ' + result.status);
      }
      await loadNovel();
    } catch (e) {
      console.error('Failed to continue generation:', e);
      alert('生成失败: ' + (e as Error).message);
    }
    setContinuing(false);
  };

  const handleStopGenerate = async () => {
    try {
      await stopGeneration(novelId);
      await loadNovel();
    } catch (e) {
      console.error('Failed to stop generation:', e);
    }
  };

  const handleProgressUpdate = async (progress: { current: number; total: number; status: string }) => {
    try {
      if (progress.current > lastProgressRef.current && novel?.status === 'generating') {
        lastProgressRef.current = progress.current;
        await loadNovel();
      }
      if ((progress.status === 'done' || progress.status === 'interrupted') && novel?.status !== progress.status) {
        await loadNovel();
      }
    } catch (e) {
      console.error('Failed to check progress update:', e);
    }
  };

  const handleSaveChapter = async () => {
    if (!novel || editingChapterId === null) return;
    setSaving(true);
    try {
      await updateChapter(novelId, editingChapterId, editContent);
      await loadNovel();
      setEditingChapterId(null);
    } catch (e) {
      console.error('Failed to save chapter:', e);
    }
    setSaving(false);
  };

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  };

  const goToChapter = (vIndex: number, cIndex: number) => {
    setCurrentVolumeIndex(vIndex);
    setCurrentChapterIndex(cIndex);
    setEditingChapterId(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    // Scroll to top of content area
    scrollToTop();
  };

  const goToPrevChapter = () => {
    if (!novel?.volumes) return;
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    } else if (currentVolumeIndex > 0) {
      const prevVolume = novel.volumes[currentVolumeIndex - 1];
      setCurrentVolumeIndex(currentVolumeIndex - 1);
      setCurrentChapterIndex((prevVolume.chapters?.length || 1) - 1);
    }
    setEditingChapterId(null);
    // Scroll to top of content area
    scrollToTop();
  };

  const goToNextChapter = () => {
    if (!novel?.volumes) return;
    const currentVolume = novel.volumes[currentVolumeIndex];
    if (currentChapterIndex < (currentVolume.chapters?.length || 0) - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    } else if (currentVolumeIndex < novel.volumes.length - 1) {
      setCurrentVolumeIndex(currentVolumeIndex + 1);
      setCurrentChapterIndex(0);
    }
    setEditingChapterId(null);
    // Scroll to top of content area
    scrollToTop();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray" size={32} />
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="text-center py-20">
        <p>{t('error', locale)}</p>
      </div>
    );
  }

  const currentVolume = novel.volumes?.[currentVolumeIndex];
  const currentChapter = currentVolume?.chapters?.[currentChapterIndex];
  const hasPrev = currentVolumeIndex > 0 || currentChapterIndex > 0;
  const hasNext = currentVolumeIndex < (novel.volumes?.length || 0) - 1 || 
                  currentChapterIndex < (currentVolume?.chapters?.length || 0) - 1;

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="fixed top-0 z-50 bg-white border-b border-border w-full">
        <div className="flex items-center justify-between px-4 py-3 pr-72">
          {/* Left: Book Title */}
          <h1 className="font-bold text-xl truncate">{novel.title}</h1>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="vercel-btn-secondary md:hidden flex-shrink-0"
            >
              {sidebarOpen ? <X size={16} /> : <List size={16} />}
            </button>
            <button
              onClick={() => navigate('/')}
              className="vercel-btn-secondary flex items-center gap-1 text-sm flex-shrink-0 whitespace-nowrap"
              title={t('reader.backToList', locale)}
            >
              <List size={14} />
              <span className="hidden 2xl:inline">{t('reader.backToList', locale)}</span>
            </button>
            <button
              onClick={() => navigate(`/novel/${novelId}`)}
              className="vercel-btn-secondary flex items-center gap-1 text-sm flex-shrink-0 whitespace-nowrap"
              title={t('reader.backToOutline', locale)}
            >
              <ArrowLeft size={14} />
              <span className="hidden 2xl:inline">{t('reader.backToOutline', locale)}</span>
            </button>
            {(novel.status === 'done' || novel.status === 'generating') && (
              <>
                <button
                  onClick={handleDownloadTxt}
                  disabled={downloading}
                  className="vercel-btn-secondary flex items-center gap-1 text-sm whitespace-nowrap"
                  title={t('reader.downloadTxt', locale)}
                >
                  <Download size={14} />
                  <span className="hidden 2xl:inline">{t('reader.downloadTxt', locale)}</span>
                </button>
                <button
                  onClick={handleExportEpub}
                  disabled={downloading}
                  className="vercel-btn-secondary flex items-center gap-1 text-sm whitespace-nowrap"
                  title={t('reader.exportEpub', locale)}
                >
                  <BookOpen size={14} />
                  <span className="hidden 2xl:inline">{t('reader.exportEpub', locale)}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Fixed Three-Column Layout */}
      <div className="fixed top-14 left-0 right-0 bottom-0 flex">
        {/* Left Sidebar - Table of Contents */}
        <aside className={`
          w-64 bg-white border-r border-border flex flex-col flex-shrink-0
          ${sidebarOpen ? '' : '-translate-x-full md:translate-x-0'} md:translate-x-0
          transition-transform duration-300
          fixed md:relative top-0 left-0 h-full z-40 md:z-auto
        `}>
          {/* Fixed Title */}
          <div className="px-4 py-3 flex-shrink-0 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('reader.tableOfContents', locale)}</h2>
              {novel.status === 'generating' && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1 text-gray hover:text-primary transition-colors"
                  title={t('reader.refresh', locale)}
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {novel.volumes?.map((volume, vIndex) => (
              <div key={vIndex} className="mb-3">
                <button
                  onClick={() => {
                    setCurrentVolumeIndex(vIndex);
                    setCurrentChapterIndex(0);
                    setEditingChapterId(null);
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg font-bold text-base mb-1 transition-colors
                    ${currentVolumeIndex === vIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-50 text-gray-800'
                    }
                  `}
                >
                  {volume.title}
                </button>
                <div className="space-y-0.5 pl-2">
                  {volume.chapters?.map((chapter, cIndex) => (
                    <button
                      key={chapter.id}
                      onClick={() => goToChapter(vIndex, cIndex)}
                      className={`
                        w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors
                        ${currentVolumeIndex === vIndex && currentChapterIndex === cIndex
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-50'
                        }
                        ${!chapter.content ? 'text-gray' : ''}
                      `}
                    >
                      {chapter.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content with scrollable area */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Chapter Title */}
            <div className="bg-white py-3 mb-6 border-b border-border sticky top-0 z-10">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-1">{currentChapter?.title}</h2>
                <p className="text-gray text-sm">{currentVolume?.title}</p>
              </div>
            </div>

            {/* Status Banner */}
            {novel.status === 'generating' && (
              <div className="mb-6">
                <GenerateProgress 
                  novelId={novelId} 
                  onProgressUpdate={handleProgressUpdate}
                  onStop={handleStopGenerate}
                />
              </div>
            )}
            {novel.status === 'interrupted' && (
              <div className="mb-6 vercel-badge-interrupted px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{t('status.interrupted', locale)}</span>
                </div>
                <button
                  onClick={handleContinueGenerate}
                  disabled={continuing}
                  className="vercel-btn-primary flex items-center gap-1 text-sm"
                >
                  {continuing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {t('continueGenerate', locale)}
                </button>
              </div>
            )}

            {/* Chapter Content or Edit */}
            {editingChapterId === currentChapter?.id ? (
              <div className="mb-8">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full p-4 border border-border rounded-lg novel-content bg-white"
                  placeholder={locale === 'zh' ? '开始写作...' : 'Start writing...'}
                />
              </div>
            ) : (
              <div className="mb-8 bg-white p-6 rounded-lg border border-border">
                {currentChapter?.content ? (
                  <div className="novel-content leading-relaxed">
                    {currentChapter.content}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray">
                    {novel.status === 'generating' ? (
                      <div>
                        <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                        <p>{locale === 'zh' ? '正在生成中，请稍候...' : 'Generating, please wait...'}</p>
                      </div>
                    ) : (
                      <p>{locale === 'zh' ? '暂无内容' : 'No content yet'}</p>
                    )}
                    {novel.status === 'done' && (
                      <button
                        onClick={() => {
                          setEditingChapterId(currentChapter?.id || null);
                          setEditContent(currentChapter?.content || '');
                        }}
                        className="mt-4 vercel-btn-secondary"
                      >
                        {t('reader.editChapter', locale)}
                      </button>
                    )}
                    {novel.status === 'interrupted' && (
                      <button
                        onClick={handleContinueGenerate}
                        disabled={continuing}
                        className="mt-4 vercel-btn-primary flex items-center gap-1 mx-auto"
                      >
                        {continuing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        {t('continueGenerate', locale)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Navigation & Actions */}
        <aside className="hidden lg:flex w-56 bg-white border-l border-border flex-col flex-shrink-0">
          {/* Fixed Title */}
          <div className="px-4 py-3 flex-shrink-0 border-b border-border">
            <h3 className="text-xs font-semibold text-gray uppercase tracking-wider">{t('reader.navigation', locale)}</h3>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Navigation */}
            <div className="space-y-2">
              <button
                onClick={goToPrevChapter}
                disabled={!hasPrev}
                className="w-full vercel-btn-secondary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('reader.previousChapter', locale)}
              </button>
              <button
                onClick={goToNextChapter}
                disabled={!hasNext}
                className="w-full vercel-btn-secondary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('reader.nextChapter', locale)}
              </button>
            </div>

            {/* Edit Controls */}
            {currentChapter?.content && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-gray uppercase tracking-wider mb-2">{t('reader.chapterActions', locale)}</h3>
                {editingChapterId === currentChapter?.id ? (
                  <>
                    <button
                      onClick={handleSaveChapter}
                      disabled={saving}
                      className="w-full vercel-btn-primary justify-center flex gap-1"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {t('reader.saveChapter', locale)}
                    </button>
                    <button
                      onClick={() => setEditingChapterId(null)}
                      className="w-full vercel-btn-secondary justify-center"
                    >
                      {t('reader.cancelEdit', locale)}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingChapterId(currentChapter?.id || null);
                      setEditContent(currentChapter?.content || '');
                    }}
                    className="w-full vercel-btn-secondary justify-center flex gap-1"
                  >
                    <Edit3 size={14} />
                    {t('reader.editChapter', locale)}
                  </button>
                )}
              </div>
            )}

            {/* Chapter Download */}
            {currentChapter?.content && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-gray uppercase tracking-wider mb-2">{t('reader.chapterDownload', locale)}</h3>
                <button
                  onClick={handleDownloadChapterTxt}
                  disabled={downloading}
                  className="w-full vercel-btn-secondary justify-center flex gap-1 text-sm"
                >
                  <Download size={14} />
                  {t('reader.downloadTxt', locale)}
                </button>
                <button
                  onClick={handleExportChapterEpub}
                  disabled={downloading}
                  className="w-full vercel-btn-secondary justify-center flex gap-1 text-sm"
                >
                  <BookOpen size={14} />
                  {t('reader.exportEpub', locale)}
                </button>
              </div>
            )}

            {/* Continue Generate */}
            {novel.status === 'interrupted' && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={handleContinueGenerate}
                  disabled={continuing}
                  className="w-full vercel-btn-primary justify-center flex gap-1"
                >
                  {continuing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {t('continueGenerate', locale)}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default NovelReader;