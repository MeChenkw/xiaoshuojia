import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { t } from '../i18n';
import { createNovel, generateOutline } from '../api';
import { Category } from '../types';
import IdeaEnhancer from '../components/IdeaEnhancer';
import { ArrowLeft, Loader2 } from 'lucide-react';

const CATEGORIES: Category[] = ['玄幻', '奇幻', '都市', '历史', '科幻', '悬疑', '言情', '武侠'];

function CreatePage() {
  const navigate = useNavigate();
  const { locale } = useStore();
  
  const [category, setCategory] = useState<Category>('玄幻');
  const [wordCount, setWordCount] = useState(100000);
  const [idea, setIdea] = useState('');
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleSubmit = async () => {
    if (!idea.trim()) return;
    
    // Check if idea is complete enough
    const isComplete = idea.length > 50 && 
      (idea.includes('主角') || idea.includes('世界') || idea.includes('故事') ||
       idea.toLowerCase().includes('protagonist') || idea.toLowerCase().includes('world'));
    
    if (!isComplete) {
      setShowEnhancer(true);
      return;
    }
    
    await submitNovel(idea);
  };

  const submitNovel = async (finalIdea: string) => {
    setSubmitting(true);
    try {
      const novel = await createNovel({
        title: locale === 'zh' ? '未命名小说' : 'Untitled Novel',
        category,
        user_idea: finalIdea,
        word_count: wordCount,
      });
      
      // Generate outline automatically
      setGenerating(true);
      try {
        await generateOutline(novel.id);
      } catch (e) {
        console.error('Failed to generate outline:', e);
      }
      
      navigate(`/novel/${novel.id}`);
    } catch (e) {
      console.error('Failed to create novel:', e);
    }
    setSubmitting(false);
    setGenerating(false);
  };

  const handleEnhancerComplete = (newIdea: string) => {
    setShowEnhancer(false);
    setIdea(newIdea);
  };

  const handleEnhancerSkip = () => {
    setShowEnhancer(false);
  };

  const handleEnhancerApply = (newIdea: string) => {
    setIdea(newIdea);
    setShowEnhancer(false);
    // Submit after a short delay to let the UI update
    setTimeout(() => submitNovel(newIdea), 100);
  };

  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(0)}万`;
    }
    return count.toString();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="vercel-btn-secondary flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          {t('home', locale)}
        </button>
        <h2 className="text-2xl font-semibold">{t('create', locale)}</h2>
      </div>

      {/* Form */}
      <div className="vercel-card p-6">
        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">{t('selectCategory', locale)}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  category === cat
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:border-gray'
                }`}
              >
                {t(`categories.${cat}`, locale)}
              </button>
            ))}
          </div>
        </div>

        {/* Word Count */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            {t('targetWordCount', locale)}: <span className="text-primary font-bold text-lg">{formatWordCount(wordCount)}</span> {t('words', locale)}
          </label>
          <input
            type="range"
            min="10000"
            max="5000000"
            step="10000"
            value={wordCount}
            onChange={e => setWordCount(parseInt(e.target.value, 10))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, #0070f3 0%, #0070f3 ${((wordCount - 10000) / (5000000 - 10000)) * 100}%, #e5e7eb ${((wordCount - 10000) / (5000000 - 10000)) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray mt-2">
            <span>1万</span>
            <span>100万</span>
            <span>300万</span>
            <span>500万</span>
          </div>
        </div>

        {/* Story Idea */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">{t('storyIdea', locale)}</label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder={t('storyIdeaPlaceholder', locale)}
            rows={6}
            className="w-full p-3 border border-border rounded-lg resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!idea.trim() || submitting || generating}
          className="w-full vercel-btn-primary py-3 flex items-center justify-center gap-2"
        >
          {submitting || generating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {generating ? (locale === 'zh' ? 'AI 生成中...' : 'AI Generating...') : t('loading', locale)}
            </>
          ) : (
            t('submitIdea', locale)
          )}
        </button>
      </div>

      {/* Idea Enhancer Modal */}
      {showEnhancer && (
        <IdeaEnhancer
          idea={idea}
          category={category}
          onComplete={handleEnhancerComplete}
          onSkip={handleEnhancerSkip}
          onApply={handleEnhancerApply}
        />
      )}
    </div>
  );
}

export default CreatePage;
