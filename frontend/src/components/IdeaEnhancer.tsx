import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { t } from '../i18n';
import { suggestOptions } from '../api';
import { X, RefreshCw, Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const ALL_DIMENSIONS = ['protagonist', 'world', 'conflict', 'style', 'advantage'] as const;
type Dimension = typeof ALL_DIMENSIONS[number];

interface IdeaEnhancerProps {
  idea: string;
  category?: string;
  onComplete: (enhancedIdea: string) => void;
  onSkip: () => void;
  onApply: (enhancedIdea: string) => void;
}

// Keywords for detecting if a dimension is already described in the idea
const DIMENSION_KEYWORDS: Record<string, Record<Dimension, string[]>> = {
  zh: {
    protagonist: ['主角', '主人公', '男主', '女主', '少年', '少女', '青年', '男子', '女子', '穿越者', '重生', '转世', '身份', '性格', '天赋', '资质', '大学生', '特种兵', '科学家', '法师', '剑客'],
    world: ['世界', '大陆', '时代', '背景', '架空', '异界', '古代', '现代', '未来', '星际', '末世', '江湖', '都市', '仙界', '魔界', '王朝', '帝国', '三国', '三国时期', '平行'],
    conflict: ['冲突', '矛盾', '斗争', '对决', '复仇', '阴谋', '危机', '战争', '争夺', '对抗', '博弈', '追杀', '逃亡', '宿命', '命运', '匡扶', '统一天下', '拯救'],
    style: ['风格', '基调', '热血', '治愈', '悬疑', '轻松', '黑暗', '史诗', '文艺', '紧张', '哲学', '浪漫', '幽默', '搞笑', '写实', '日常', '恐怖', '言情', '感情'],
    advantage: ['金手指', '系统', '优势', '能力', '异能', '法宝', '秘籍', '血脉', '天赋', '运气', '智慧', '资源', '势力', '支持', '传承', '宝物', '先知', '预知'],
  },
  en: {
    protagonist: ['protagonist', 'main character', 'hero', 'heroine', 'youth', 'soldier', 'scientist', 'transmigrator', 'reincarnated', 'identity', 'personality', 'college student'],
    world: ['world', 'continent', 'era', 'background', 'setting', 'fantasy', 'modern', 'ancient', 'future', 'interstellar', 'apocalypse', 'empire', 'kingdom', 'parallel'],
    conflict: ['conflict', 'conspiracy', 'revenge', 'war', 'battle', 'crisis', 'struggle', 'confrontation', 'chase', 'fate', 'destiny', 'scheme', 'unify', 'save'],
    style: ['style', 'tone', 'action', 'healing', 'mystery', 'comedy', 'dark', 'epic', 'literary', 'thriller', 'philosophical', 'romantic', 'humor', 'romance'],
    advantage: ['system', 'advantage', 'ability', 'power', 'magic', 'treasure', 'bloodline', 'talent', 'luck', 'wisdom', 'resource', 'legacy', 'artifact', 'foresight'],
  },
};

function detectCoveredDimensions(idea: string, locale: string): Set<Dimension> {
  const covered = new Set<Dimension>();
  const text = idea.toLowerCase();
  const keywords = DIMENSION_KEYWORDS[locale] || DIMENSION_KEYWORDS['zh'];

  for (const dim of ALL_DIMENSIONS) {
    const dimKeywords = keywords[dim] || [];
    if (dimKeywords.some(kw => text.includes(kw.toLowerCase()))) {
      covered.add(dim);
    }
  }

  return covered;
}

function buildEnhancedIdea(originalIdea: string, values: Record<Dimension, string>, locale: string): string {
  const dimLabels: Record<string, Record<Dimension, string>> = {
    zh: {
      protagonist: '主角设定',
      world: '世界观',
      conflict: '核心冲突',
      style: '风格基调',
      advantage: '主角优势',
    },
    en: {
      protagonist: 'Protagonist',
      world: 'World Setting',
      conflict: 'Core Conflict',
      style: 'Writing Style',
      advantage: 'Protagonist Advantage',
    },
  };

  const labels = dimLabels[locale] || dimLabels['zh'];
  const parts: string[] = [];

  for (const dim of ALL_DIMENSIONS) {
    if (values[dim]) {
      parts.push(`${labels[dim]}：${values[dim]}`);
    }
  }

  if (parts.length > 0) {
    return parts.join('；') + '。' + originalIdea;
  }
  return originalIdea;
}

function IdeaEnhancer({ idea, category, onComplete, onSkip, onApply }: IdeaEnhancerProps) {
  const { locale } = useStore();
  const coveredDims = detectCoveredDimensions(idea, locale);
  const neededDimensions = ALL_DIMENSIONS.filter(d => !coveredDims.has(d));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<Dimension, string>>({
    protagonist: '', world: '', conflict: '', style: '', advantage: '',
  });
  const [customInputs, setCustomInputs] = useState<Record<Dimension, string>>({
    protagonist: '', world: '', conflict: '', style: '', advantage: '',
  });
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(neededDimensions.length === 0);

  const dimension = neededDimensions[currentIndex];
  const progress = neededDimensions.length > 0
    ? ((currentIndex + 1) / neededDimensions.length) * 100
    : 100;

  const useAiByDefault = category && category !== '玄幻';

  const loadOptions = useCallback(async (useAi = false) => {
    if (!dimension) return;
    if (useAi || useAiByDefault) {
      setAiLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const opts = await suggestOptions(dimension, idea, useAi || useAiByDefault, category);
      setOptions(opts);
    } catch {
      setOptions([]);
    }
    setLoading(false);
    setAiLoading(false);
  }, [dimension, idea, category, useAiByDefault]);

  useEffect(() => {
    if (dimension) {
      loadOptions(useAiByDefault);
    }
  }, [loadOptions]);

  const handleSelect = (value: string) => {
    if (!dimension) return;
    setValues(prev => ({ ...prev, [dimension]: value }));
  };

  const handleCustomChange = (value: string) => {
    if (!dimension) return;
    setCustomInputs(prev => ({ ...prev, [dimension]: value }));
  };

  const handleCustomSubmit = () => {
    if (!dimension) return;
    const val = customInputs[dimension]?.trim();
    if (val) {
      setValues(prev => ({ ...prev, [dimension]: val }));
    }
  };

  const handleNext = () => {
    if (!dimension) return;
    const val = customInputs[dimension]?.trim() || values[dimension];
    if (val) {
      setValues(prev => ({ ...prev, [dimension]: val }));
    }
    if (currentIndex < neededDimensions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowPreview(true);
    }
  };

  const handlePrev = () => {
    if (showPreview) {
      setShowPreview(false);
      setCurrentIndex(neededDimensions.length - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRefresh = () => {
    loadOptions(true);
  };

  const enhancedIdea = buildEnhancedIdea(idea, values, locale);

  // If all dimensions are covered, show preview directly
  if (showPreview || neededDimensions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="vercel-card w-full max-w-lg mx-4 p-6 animate-fade-in relative">
          {/* Close Button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition-colors"
            title={t('ideaEnhancer.close', locale)}
          >
            <X size={20} />
          </button>

          <div className="mb-4">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: '100%' }} />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-1">{t('ideaEnhancer.enhanceComplete', locale)}</h3>
          <p className="text-sm text-gray mb-4">
            {locale === 'zh' ? '创意已完善，您可以查看并选择下一步操作' : 'Your idea has been enhanced. Review and choose next step.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
            <p className="text-xs text-gray mb-1">{t('ideaEnhancer.enhancedIdea', locale)}</p>
            <p className="text-sm">{enhancedIdea}</p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => onApply(enhancedIdea)}
              className="w-full vercel-btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              {t('ideaEnhancer.applyAndSubmit', locale)}
            </button>
            <button
              onClick={() => onComplete(enhancedIdea)}
              className="w-full vercel-btn-secondary py-2.5"
            >
              {t('ideaEnhancer.applyOnly', locale)}
            </button>
            {neededDimensions.length > 0 && (
              <button
                onClick={handlePrev}
                className="w-full text-sm text-gray hover:text-primary py-1"
              >
                {t('ideaEnhancer.backToEdit', locale)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="vercel-card w-full max-w-lg mx-4 p-6 animate-fade-in relative">
        {/* Close Button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition-colors"
          title={t('ideaEnhancer.close', locale)}
        >
          <X size={20} />
        </button>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray mt-2 text-right">
            {currentIndex + 1} / {neededDimensions.length}
          </p>
        </div>

        {/* Header */}
        <h3 className="text-lg font-semibold mb-1">
          {t(`ideaEnhancer.${dimension}`, locale)}
        </h3>
        <p className="text-sm text-gray mb-4">
          {t(`ideaEnhancer.${dimension}Hint`, locale)}
        </p>

        {/* Refresh Button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleRefresh}
            disabled={aiLoading}
            className="text-xs flex items-center gap-1 text-accent hover:text-primary transition-colors disabled:opacity-50"
            title={t('ideaEnhancer.refreshTooltip', locale)}
          >
            {aiLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {t('ideaEnhancer.aiGenerating', locale)}
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                {t('ideaEnhancer.refresh', locale)}
              </>
            )}
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {options.map((option, i) => (
            <button
              key={`${dimension}-${i}`}
              onClick={() => handleSelect(option)}
              className={`p-3 text-sm rounded-lg border text-left transition-all ${
                values[dimension] === option
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-gray'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-gray">
            {t('loading', locale)}...
          </div>
        )}

        {/* Custom Input - Per Dimension */}
        <div className="mb-6">
          <input
            type="text"
            value={customInputs[dimension] || ''}
            onChange={e => handleCustomChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            placeholder={t('ideaEnhancer.customInput', locale)}
            className="w-full p-3 border border-border rounded-lg"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={currentIndex === 0 ? onSkip : handlePrev}
            className="vercel-btn-secondary flex items-center gap-1"
          >
            {currentIndex === 0 ? (
              t('ideaEnhancer.skip', locale)
            ) : (
              <>
                <ArrowLeft size={14} />
                {t('ideaEnhancer.prev', locale)}
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!values[dimension] && !customInputs[dimension]?.trim()}
            className="vercel-btn-primary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentIndex === neededDimensions.length - 1 ? (
              <>
                {t('ideaEnhancer.confirm', locale)}
                <Check size={14} />
              </>
            ) : (
              <>
                {t('ideaEnhancer.next', locale)}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IdeaEnhancer;