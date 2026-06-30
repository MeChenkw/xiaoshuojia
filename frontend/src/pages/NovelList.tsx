import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { t } from '../i18n';
import { getNovels, deleteNovel, demoSeed } from '../api';
import { Novel } from '../types';
import { Plus, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const CATEGORIES = ['玄幻', '奇幻', '都市', '历史', '科幻', '悬疑', '言情', '武侠'] as const;

function NovelList() {
  const navigate = useNavigate();
  const { locale } = useStore();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadNovels();
    
    // Poll every 5 seconds
    const interval = setInterval(loadNovels, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNovels = async () => {
    try {
      const data = await getNovels();
      setNovels(data);
    } catch (e) {
      console.error('Failed to load novels:', e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteNovel(id);
      await loadNovels();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
    setDeletingId(null);
    setDeleteConfirm(null);
  };

  const handleDemoSeed = async () => {
    setSeeding(true);
    try {
      const novel = await demoSeed();
      await loadNovels();
      navigate(`/novel/${novel.id}`);
    } catch (e) {
      console.error('Failed to seed demo:', e);
    }
    setSeeding(false);
  };

  const getCategoryClass = (category: string) => {
    const classMap: Record<string, string> = {
      '玄幻': 'category-xuanhuan',
      '奇幻': 'category-qihuan',
      '都市': 'category-dushi',
      '历史': 'category-lishi',
      '科幻': 'category-kehuan',
      '悬疑': 'category-xuanyu',
      '言情': 'category-yanqing',
      '武侠': 'category-wuxia',
    };
    return classMap[category] || 'bg-gray-100';
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      draft: 'vercel-badge-draft',
      confirmed: 'vercel-badge-confirmed',
      generating: 'vercel-badge-generating',
      done: 'vercel-badge-done',
      interrupted: 'vercel-badge-interrupted',
    };
    return classMap[status] || 'bg-gray-100';
  };

  const getNavigatePath = (novel: Novel) => {
    if (novel.status === 'generating') {
      return `/novel/${novel.id}/read`;
    }
    if (novel.status === 'done') {
      return `/novel/${novel.id}/read`;
    }
    if (novel.status === 'interrupted') {
      return `/novel/${novel.id}`;
    }
    if (novel.volumes && novel.volumes.length > 0) {
      return `/novel/${novel.id}`;
    }
    return `/novel/${novel.id}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">{t('novelList', locale)}</h2>
        <button
          onClick={handleDemoSeed}
          disabled={seeding}
          className="vercel-btn-secondary flex items-center gap-1"
        >
          {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {t('demoSeed', locale)}
        </button>
      </div>

      {/* Novel Grid */}
      {novels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {novels.map(novel => (
            <div 
              key={novel.id}
              className="vercel-card vercel-border-raised p-5 cursor-pointer hover:border-gray transition-colors"
              onClick={() => navigate(getNavigatePath(novel))}
            >
              {/* Category & Status */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryClass(novel.category)}`}>
                  {t(`categories.${novel.category}`, locale)}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(novel.status)}`}>
                  {t(`status.${novel.status}`, locale)}
                </span>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold mb-2 line-clamp-1">{novel.title}</h3>
              
              {/* Idea */}
              <p className="text-sm text-gray mb-3 line-clamp-2">
                {novel.user_idea || (locale === 'zh' ? '暂无创意描述' : 'No idea description')}
              </p>
              
              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray">
                <span>{novel.word_count.toLocaleString()} {t('words', locale)}</span>
                <span>{t('lastUpdated', locale)}: {formatDate(novel.updated_at)}</span>
              </div>
              
              {/* Continue Generate Button for interrupted */}
              {novel.status === 'interrupted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/novel/${novel.id}`);
                  }}
                  className="mt-3 w-full vercel-btn-primary text-sm"
                >
                  {t('continueGenerate', locale)}
                </button>
              )}
              
              {/* Delete Button */}
              {deleteConfirm === novel.id ? (
                <div 
                  className="mt-3 flex gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDelete(novel.id)}
                    disabled={deletingId === novel.id}
                    className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded text-sm"
                  >
                    {deletingId === novel.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : t('confirm', locale)}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 vercel-btn-secondary text-sm"
                  >
                    {t('cancel', locale)}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(novel.id);
                  }}
                  className="mt-3 w-full vercel-btn-secondary text-sm text-red-500 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  {t('deleteNovel', locale)}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="vercel-card p-12 text-center">
          <AlertCircle className="mx-auto text-gray mb-4" size={32} />
          <p className="text-gray mb-4">{t('emptyState', locale)}</p>
          <button
            onClick={() => navigate('/create')}
            className="vercel-btn-primary inline-flex items-center gap-1"
          >
            <Plus size={16} />
            {t('create', locale)}
          </button>
        </div>
      )}
    </div>
  );
}

export default NovelList;
