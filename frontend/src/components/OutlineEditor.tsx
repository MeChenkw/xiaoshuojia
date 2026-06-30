import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { t, getTranslations } from '../i18n';
import { getNovel, updateOutline, confirmNovel, generateOutline, generateNovel } from '../api';
import { Novel, Volume } from '../types';
import GenerateProgress from './GenerateProgress';
import { ArrowLeft, Save, Check, Edit3, Play, Loader2, AlertCircle } from 'lucide-react';

function OutlineEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale } = useStore();
  const translations = getTranslations(locale);
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedVolumes, setEditedVolumes] = useState<Partial<Volume>[]>([]);
  const lastProgressRef = useRef(0);
  
  const novelId = parseInt(id || '0', 10);

  useEffect(() => {
    if (novelId) {
      loadNovel();
    }
  }, [novelId]);

  const loadNovel = async () => {
    try {
      const data = await getNovel(novelId);
      setNovel(data);
      setEditedVolumes(data.volumes || []);
      let completed = 0;
      for (const v of (data.volumes || [])) {
        for (const c of (v.chapters || [])) {
          if (c.content) completed++;
        }
      }
      lastProgressRef.current = completed;
    } catch (e) {
      console.error('Failed to load novel:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!novel) return;
    setSaving(true);
    try {
      await updateOutline(novel.id, editedVolumes);
      await loadNovel();
      setIsEditMode(false);
    } catch (e) {
      console.error('Failed to save:', e);
    }
    setSaving(false);
  };

  const handleConfirm = async () => {
    if (!novel) return;
    try {
      await confirmNovel(novel.id);
      await loadNovel();
    } catch (e) {
      console.error('Failed to confirm:', e);
    }
  };

  const handleGenerateOutline = async () => {
    if (!novel) return;
    setGenerating(true);
    try {
      await generateOutline(novel.id);
      await loadNovel();
    } catch (e) {
      console.error('Failed to generate outline:', e);
      alert('大纲生成失败: ' + (e as Error).message);
    }
    setGenerating(false);
  };

  const handleStartGenerate = async () => {
    if (!novel) return;
    try {
      const result = await generateNovel(novel.id);
      console.log('生成结果:', result);
      // 显示结果给用户
      if (result.status === 'error' || result.status === 'already generating') {
        alert('生成状态: ' + result.status);
      } else {
        navigate(`/novel/${novel.id}/read`);
      }
    } catch (e) {
      console.error('Failed to start generation:', e);
      alert('生成失败: ' + (e as Error).message);
    }
  };

  const handleContinueGenerate = async () => {
    if (!novel) return;
    try {
      const result = await generateNovel(novel.id);
      console.log('继续生成结果:', result);
      if (result.status === 'error' || result.status === 'already generating') {
        alert('生成状态: ' + result.status);
      } else {
        navigate(`/novel/${novel.id}/read`);
      }
    } catch (e) {
      console.error('Failed to continue generation:', e);
      alert('生成失败: ' + (e as Error).message);
    }
  };

  const updateVolume = (index: number, field: string, value: string) => {
    const newVolumes = [...editedVolumes];
    newVolumes[index] = { ...newVolumes[index], [field]: value };
    setEditedVolumes(newVolumes);
  };

  const updateChapter = (vIndex: number, cIndex: number, field: string, value: string) => {
    const newVolumes = [...editedVolumes];
    const chapters = [...(newVolumes[vIndex].chapters || [])];
    chapters[cIndex] = { ...chapters[cIndex], [field]: value };
    newVolumes[vIndex] = { ...newVolumes[vIndex], chapters };
    setEditedVolumes(newVolumes);
  };

  const handleProgressUpdate = async (progress: { current: number; total: number; status: string }) => {
    try {
      if (progress.current !== lastProgressRef.current) {
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
        <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
        <p>{t('error', locale)}</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'vercel-badge-draft',
    confirmed: 'vercel-badge-confirmed',
    generating: 'vercel-badge-generating',
    done: 'vercel-badge-done',
    interrupted: 'vercel-badge-interrupted',
  };

  const canEdit = novel.status === 'draft' || novel.status === 'confirmed';
  const canConfirm = novel.status === 'draft' && novel.volumes && novel.volumes.length > 0;
  const canGenerate = novel.status === 'confirmed' || novel.status === 'interrupted';
  const hasOutline = novel.volumes && novel.volumes.length > 0;

  return (
    <div className="pt-[72px]">
      {/* Fixed Header */}
      <div className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Status Banner */}
        {novel.status === 'draft' && hasOutline && (
          <div className="vercel-badge-draft px-4 py-2 flex items-center gap-2 max-w-6xl mx-auto mt-3">
            <AlertCircle size={16} />
            {t('status.draft', locale)} - {translations.outlineEditor.editMode}
          </div>
        )}
        {novel.status === 'confirmed' && (
          <div className="vercel-badge-confirmed px-4 py-2 flex items-center gap-2 max-w-6xl mx-auto mt-3">
            {t('status.confirmed', locale)}
          </div>
        )}
        {novel.status === 'interrupted' && (
          <div className="vercel-badge-interrupted px-4 py-2 flex items-center gap-2 max-w-6xl mx-auto mt-3">
            <AlertCircle size={16} />
            {t('status.interrupted', locale)}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="vercel-btn-secondary flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              {t('reader.back', locale)}
            </button>
            <div>
              <input
                type="text"
                value={novel.title}
                onChange={e => setNovel({ ...novel, title: e.target.value })}
                disabled={!isEditMode}
                className={`text-2xl font-semibold bg-transparent border-none focus:outline-none ${
                  isEditMode ? 'border-b border-border' : ''
                }`}
              />
              <span className={`ml-3 px-2 py-0.5 rounded text-sm ${statusColors[novel.status]}`}>
                {translations.status[novel.status]}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
          {canEdit && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="vercel-btn-secondary flex items-center gap-1"
            >
              <Edit3 size={16} />
              {t('outlineEditor.modify', locale)}
            </button>
          )}
          
          {isEditMode && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="vercel-btn-primary flex items-center gap-1"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('outlineEditor.save', locale)}
              </button>
              <button
                onClick={async () => {
                  if (!novel) return;
                  setSaving(true);
                  try {
                    await updateOutline(novel.id, editedVolumes);
                    await confirmNovel(novel.id);
                    await loadNovel();
                    setIsEditMode(false);
                  } catch (e) {
                    console.error('Failed to confirm:', e);
                  }
                  setSaving(false);
                }}
                disabled={saving}
                className="vercel-btn-primary flex items-center gap-1"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t('outlineEditor.confirm', locale)}
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditedVolumes(novel.volumes || []);
                }}
                className="vercel-btn-secondary"
              >
                {t('cancel', locale)}
              </button>
            </>
          )}
          
          {canConfirm && !isEditMode && (
            <button
              onClick={handleConfirm}
              className="vercel-btn-primary flex items-center gap-1"
            >
              <Check size={16} />
              {t('outlineEditor.confirm', locale)}
            </button>
          )}
          
          {!hasOutline && !isEditMode && (
            <button
              onClick={handleGenerateOutline}
              disabled={generating}
              className="vercel-btn-primary flex items-center gap-1"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {generating 
                ? (locale === 'zh' ? '正在生成大纲...' : 'Generating outline...')
                : `AI ${t('outlineEditor.generate', locale)}`}
            </button>
          )}

          {/* Loading overlay for outline generation */}
          {generating && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md text-center">
                <Loader2 size={48} className="animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">
                  {locale === 'zh' ? '正在生成大纲' : 'Generating Outline'}
                </h3>
                <p className="text-gray mb-4">
                  {locale === 'zh' 
                    ? 'AI 正在根据您的创意和目标字数规划小说结构，预计需要 30-60 秒'
                    : 'AI is planning the novel structure based on your idea and target word count. Expected time: 30-60 seconds'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            </div>
          )}
          
          {canGenerate && (
            <button
              onClick={novel.status === 'interrupted' ? handleContinueGenerate : handleStartGenerate}
              className="vercel-btn-primary flex items-center gap-1"
            >
              <Play size={16} />
              {novel.status === 'interrupted' ? t('continueGenerate', locale) : t('outlineEditor.generate', locale)}
            </button>
          )}
          
          {(novel.status === 'done' || novel.status === 'generating') && (
            <button
              onClick={() => navigate(`/novel/${novel.id}/read`)}
              className="vercel-btn-primary"
            >
              {t('reader.tableOfContents', locale)}
            </button>
          )}
        </div>
        </div>
      </div>
      {/* Progress - only show during active generation */}
      {(novel.status === 'generating') && (
        <div className="mb-6">
          <GenerateProgress novelId={novelId} onProgressUpdate={handleProgressUpdate} />
        </div>
      )}

      {/* Outline Content */}
      <div className="space-y-6">
        {editedVolumes.map((volume, vIndex) => (
          <div key={vIndex} className="vercel-card p-6">
            {/* Volume Header */}
            <div className="mb-4 pb-4 border-b border-border">
              <input
                type="text"
                value={volume.title || ''}
                onChange={e => updateVolume(vIndex, 'title', e.target.value)}
                disabled={!isEditMode}
                placeholder={translations.outlineEditor.volumeTitle}
                className={`text-xl font-semibold w-full bg-transparent border-none focus:outline-none ${
                  isEditMode ? 'text-primary border-b border-primary/30' : 'text-gray-800'
                }`}
              />
              <textarea
                value={volume.description || ''}
                onChange={e => updateVolume(vIndex, 'description', e.target.value)}
                disabled={!isEditMode}
                placeholder={translations.outlineEditor.volumeDesc}
                rows={2}
                className={`w-full mt-2 bg-transparent border-none focus:outline-none resize-none ${
                  isEditMode ? 'text-gray-800' : 'text-gray'
                }`}
              />
            </div>
            
            {/* Chapters */}
            <div className="space-y-4">
              {(volume.chapters || []).map((chapter, cIndex) => (
                <div key={cIndex} className="pl-4 border-l-2 border-border">
                  <input
                    type="text"
                    value={chapter.title || ''}
                    onChange={e => updateChapter(vIndex, cIndex, 'title', e.target.value)}
                    disabled={!isEditMode}
                    placeholder={translations.outlineEditor.chapterTitle}
                    className={`font-medium w-full bg-transparent border-none focus:outline-none ${
                      isEditMode ? 'text-primary' : 'text-gray-700'
                    }`}
                  />
                  <textarea
                    value={chapter.outline || ''}
                    onChange={e => updateChapter(vIndex, cIndex, 'outline', e.target.value)}
                    disabled={!isEditMode}
                    placeholder={translations.outlineEditor.chapterOutline}
                    rows={2}
                    className={`w-full mt-1 text-sm bg-transparent border-none focus:outline-none resize-none ${
                      isEditMode ? 'text-gray-700' : 'text-gray'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!hasOutline && !generating && (
        <div className="vercel-card p-12 text-center">
          <p className="text-gray mb-4">
            {locale === 'zh' ? '还没有大纲，点击上方按钮让 AI 生成' : 'No outline yet. Click the button above to generate with AI'}
          </p>
          <button
            onClick={handleGenerateOutline}
            className="vercel-btn-primary"
          >
            AI {t('outlineEditor.generate', locale)}
          </button>
        </div>
      )}
    </div>
  );
}

export default OutlineEditor;
