'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, History } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StepIndicator from '@/components/StepIndicator';
import FileUploader from '@/components/FileUploader';
import MetadataForm from '@/components/MetadataForm';
import ProgressDisplay from '@/components/ProgressDisplay';
import MinutesViewer from '@/components/MinutesViewer';
import EmailComposer from '@/components/EmailComposer';
import HistoryList from '@/components/HistoryList';
import { Meeting, MeetingMetadata, ProgressUpdate } from '@/types/meeting';
import { useUpload, useProcessing } from '@/hooks/useMeetings';
import { api } from '@/lib/api';
import clsx from 'clsx';

const STEPS = [
  { id: 1, label: '音声アップロード' },
  { id: 2, label: '処理中' },
  { id: 3, label: '議事録確認' },
];

type View = 'new' | 'history';

export default function HomePage() {
  const [view, setView] = useState<View>('new');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MeetingMetadata>({});
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { upload, uploading, uploadProgress, error: uploadError } = useUpload();
  const {
    startProcessing,
    pollProgress,
    processing,
    progress,
    error: processingError,
    setProgress,
  } = useProcessing();

  // Poll for progress updates when processing
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (processing && currentMeeting) {
      intervalId = setInterval(async () => {
        const update = await pollProgress(currentMeeting.id);
        if (update?.status === 'completed' || update?.status === 'error') {
          if (intervalId) clearInterval(intervalId);
          // Refresh meeting data
          const meeting = await api.getMeeting(currentMeeting.id);
          setCurrentMeeting(meeting);
          if (meeting.status === 'completed') {
            setCurrentStep(3);
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [processing, currentMeeting, pollProgress]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    try {
      // Upload file
      const uploadResult = await upload(selectedFile, metadata);

      if (!uploadResult) {
        return;
      }

      setCurrentStep(2);

      // Start processing
      const cleanup = await startProcessing(uploadResult.id);

      // Get initial meeting data
      const meeting = await api.getMeeting(uploadResult.id);
      setCurrentMeeting(meeting);

      // Store cleanup function for later
      return cleanup;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '処理を開始できませんでした');
    }
  };

  const handleSelectFromHistory = async (meeting: Meeting) => {
    setCurrentMeeting(meeting);
    setView('new');

    if (meeting.status === 'completed') {
      setCurrentStep(3);
    } else if (['transcribing', 'generating', 'uploading'].includes(meeting.status)) {
      setCurrentStep(2);
      // Resume progress polling
      setProgress({
        progress: meeting.progress,
        status: meeting.status,
        message: '処理を再開しています...',
      });
    } else {
      setCurrentStep(1);
    }
  };

  const handleRegenerate = async () => {
    if (!currentMeeting) return;

    setIsRegenerating(true);
    try {
      await api.regenerateMinutes(currentMeeting.id);

      // Poll for completion
      const checkStatus = async () => {
        const update = await api.getProgress(currentMeeting.id);
        if (update.status === 'completed') {
          const meeting = await api.getMeeting(currentMeeting.id);
          setCurrentMeeting(meeting);
          setIsRegenerating(false);
          toast.success('議事録を再生成しました');
        } else if (update.status === 'error') {
          setIsRegenerating(false);
          toast.error('再生成に失敗しました');
        } else {
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    } catch {
      setIsRegenerating(false);
      toast.error('再生成に失敗しました');
    }
  };

  const handleMinutesUpdate = (minutes: string) => {
    if (currentMeeting) {
      setCurrentMeeting({ ...currentMeeting, minutes });
    }
  };

  const resetToNew = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setMetadata({});
    setCurrentMeeting(null);
    setProgress(null);
  };

  const extractSubject = (minutes: string): string => {
    const match = minutes.match(/【件名】(.+)/);
    return match ? match[1].trim() : '打ち合わせ議事録';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => {
              setView('new');
              if (!currentMeeting) resetToNew();
            }}
            className={clsx(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all',
              view === 'new'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            )}
          >
            <Plus className="w-5 h-5" />
            新規作成
          </button>
          <button
            onClick={() => setView('history')}
            className={clsx(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all',
              view === 'history'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            )}
          >
            <History className="w-5 h-5" />
            履歴
          </button>
        </div>

        {view === 'history' ? (
          <HistoryList
            onSelect={handleSelectFromHistory}
            selectedId={currentMeeting?.id}
          />
        ) : (
          <>
            {/* Step Indicator */}
            <StepIndicator steps={STEPS} currentStep={currentStep} />

            {/* Step Content */}
            <div className="max-w-4xl mx-auto">
              {/* Step 1: Upload */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <FileUploader
                    onFileSelect={handleFileSelect}
                    disabled={uploading}
                    error={uploadError}
                  />

                  <MetadataForm
                    metadata={metadata}
                    onChange={setMetadata}
                    disabled={uploading}
                  />

                  <div className="flex justify-center">
                    <button
                      onClick={handleStartProcessing}
                      disabled={!selectedFile || uploading}
                      className="px-8 py-3 bg-primary-500 text-white font-medium rounded-lg
                        hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors shadow-lg shadow-primary-500/30"
                    >
                      {uploading ? '処理中...' : '議事録を生成する'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Processing */}
              {currentStep === 2 && (
                <ProgressDisplay
                  progress={progress}
                  uploadProgress={uploadProgress}
                  isUploading={uploading}
                />
              )}

              {/* Step 3: Results */}
              {currentStep === 3 && currentMeeting?.minutes && (
                <div className="space-y-6">
                  <MinutesViewer
                    minutes={currentMeeting.minutes}
                    meetingId={currentMeeting.id}
                    onUpdate={handleMinutesUpdate}
                    onRegenerate={handleRegenerate}
                    isRegenerating={isRegenerating}
                  />

                  <EmailComposer
                    meetingId={currentMeeting.id}
                    defaultSubject={extractSubject(currentMeeting.minutes)}
                    defaultBody={currentMeeting.minutes}
                  />

                  <div className="flex justify-center">
                    <button
                      onClick={resetToNew}
                      className="px-6 py-2.5 text-primary-600 dark:text-primary-400 font-medium
                        hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      新しい議事録を作成
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error Display */}
        {processingError && (
          <div className="max-w-4xl mx-auto mt-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{processingError}</p>
              <button
                onClick={resetToNew}
                className="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
              >
                最初からやり直す
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
