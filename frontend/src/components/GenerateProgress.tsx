import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { t } from '../i18n';
import { getProgress } from '../api';
import { Progress } from '../types';
import { Loader2, AlertTriangle, Square } from 'lucide-react';

interface GenerateProgressProps {
  novelId: number;
  onStuck?: () => void;
  onProgressUpdate?: (progress: Progress) => void;
  onStop?: () => void;
}

function GenerateProgress({ novelId, onStuck, onProgressUpdate, onStop }: GenerateProgressProps) {
  const { locale } = useStore();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [stopping, setStopping] = useState(false);
  const lastCurrentRef = useRef(0);
  const stuckCountRef = useRef(0);
  const onStuckRef = useRef(onStuck);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onStopRef = useRef(onStop);
  const stoppedRef = useRef(false);

  useEffect(() => {
    onStuckRef.current = onStuck;
  }, [onStuck]);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;
    
    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const data = await getProgress(novelId);
        if (!mounted) return;
        
        setProgress(data);
        
        if (onProgressUpdateRef.current) {
          onProgressUpdateRef.current(data);
        }
        
        if (data.status === 'generating') {
          if (data.current === lastCurrentRef.current && data.current < data.total) {
            stuckCountRef.current += 1;
            if (stuckCountRef.current >= 6) {
              setIsStuck(true);
              if (onStuckRef.current) {
                onStuckRef.current();
              }
            }
          } else {
            stuckCountRef.current = 0;
            setIsStuck(false);
          }
          lastCurrentRef.current = data.current;
        } else {
          stuckCountRef.current = 0;
          setIsStuck(false);
          stoppedRef.current = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (e) {
        console.error('Failed to get progress:', e);
      }
    };

    poll();
    intervalId = setInterval(poll, 5000);
    
    return () => {
      mounted = false;
      stoppedRef.current = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [novelId]);

  const handleStop = async () => {
    if (stopping || !onStopRef.current) return;
    setStopping(true);
    stoppedRef.current = true;
    try {
      await onStopRef.current();
    } catch (e) {
      console.error('Failed to stop generation:', e);
    }
    setStopping(false);
  };

  if (!progress || progress.status === 'done' || progress.status === 'interrupted') {
    return null;
  }

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="vercel-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{t('progress.generating', locale)}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray">
            {progress.current} / {progress.total}
          </span>
          <button
            onClick={handleStop}
            disabled={stopping}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
            title={locale === 'zh' ? '停止生成' : 'Stop generation'}
          >
            <Square size={12} fill="currentColor" />
            {stopping ? (locale === 'zh' ? '停止中' : 'Stopping') : (locale === 'zh' ? '停止' : 'Stop')}
          </button>
        </div>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {progress.currentChapter && (
        <p className="text-xs text-gray truncate">
          {t('progress.current', locale)}: {progress.currentChapter}
        </p>
      )}
      
      {isStuck && (
        <div className="mt-3 flex items-center gap-2 text-orange-600 text-sm">
          <AlertTriangle size={16} />
          <span>{t('progress.stuck', locale)}</span>
        </div>
      )}
      
      {progress?.logs && progress.logs.length > 0 && (
        <div className="mt-3 text-xs text-gray-600 max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
          <p className="font-medium mb-1 text-gray-700">{locale === 'zh' ? '最近日志' : 'Recent logs'}:</p>
          {progress.logs.slice(-5).map((log, i) => (
            <p key={i} className={log.includes('ERROR') ? 'text-red-500' : ''}>
              {log}
            </p>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-2 text-sm text-gray">
        <Loader2 size={14} className="animate-spin" />
        <span>{t('loading', locale)}</span>
      </div>
    </div>
  );
}

export default GenerateProgress;
