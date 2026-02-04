'use client';

import { ProgressUpdate, ProcessingStatus } from '@/types/meeting';
import { Loader2, CheckCircle, AlertCircle, FileAudio, Wand2, Upload } from 'lucide-react';
import clsx from 'clsx';

interface ProgressDisplayProps {
  progress: ProgressUpdate | null;
  uploadProgress?: number;
  isUploading?: boolean;
}

const statusConfig: Record<
  ProcessingStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: '処理待ち', icon: Loader2, color: 'text-gray-500' },
  uploading: { label: 'アップロード中', icon: Upload, color: 'text-blue-500' },
  transcribing: { label: '文字起こし中', icon: FileAudio, color: 'text-blue-500' },
  generating: { label: '議事録生成中', icon: Wand2, color: 'text-purple-500' },
  completed: { label: '完了', icon: CheckCircle, color: 'text-green-500' },
  error: { label: 'エラー', icon: AlertCircle, color: 'text-red-500' },
};

export default function ProgressDisplay({
  progress,
  uploadProgress = 0,
  isUploading = false,
}: ProgressDisplayProps) {
  const currentStatus: ProcessingStatus = isUploading
    ? 'uploading'
    : progress?.status || 'pending';
  const currentProgress = isUploading ? uploadProgress : progress?.progress || 0;
  const message = isUploading
    ? `アップロード中... ${uploadProgress}%`
    : progress?.message || '処理を開始しています...';

  const config = statusConfig[currentStatus];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={clsx(
            'p-3 rounded-full',
            currentStatus === 'completed'
              ? 'bg-green-100 dark:bg-green-900/30'
              : currentStatus === 'error'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          )}
        >
          <Icon
            className={clsx(
              'w-6 h-6',
              config.color,
              currentStatus !== 'completed' &&
                currentStatus !== 'error' &&
                'animate-spin'
            )}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-900 dark:text-white">
              {config.label}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentProgress}%
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={clsx(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            currentStatus === 'completed'
              ? 'bg-green-500'
              : currentStatus === 'error'
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-blue-500 to-purple-500'
          )}
          style={{ width: `${currentProgress}%` }}
        />
        {currentStatus !== 'completed' && currentStatus !== 'error' && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{
              animation: 'shimmer 2s infinite',
            }}
          />
        )}
      </div>

      {/* Steps */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {(['uploading', 'transcribing', 'generating'] as const).map((step, index) => {
          const stepConfig = statusConfig[step];
          const StepIcon = stepConfig.icon;
          const isPast =
            currentStatus === 'completed' ||
            (step === 'uploading' && ['transcribing', 'generating'].includes(currentStatus)) ||
            (step === 'transcribing' && currentStatus === 'generating');
          const isCurrent = step === currentStatus;

          return (
            <div
              key={step}
              className={clsx(
                'flex flex-col items-center p-3 rounded-lg transition-colors',
                isCurrent
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : isPast
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-gray-50 dark:bg-gray-800'
              )}
            >
              <StepIcon
                className={clsx(
                  'w-5 h-5 mb-1',
                  isCurrent
                    ? 'text-primary-500'
                    : isPast
                    ? 'text-green-500'
                    : 'text-gray-400'
                )}
              />
              <span
                className={clsx(
                  'text-xs font-medium',
                  isCurrent
                    ? 'text-primary-700 dark:text-primary-300'
                    : isPast
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-500'
                )}
              >
                {stepConfig.label}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
