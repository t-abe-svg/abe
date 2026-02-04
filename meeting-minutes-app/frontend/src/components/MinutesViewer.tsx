'use client';

import { useState } from 'react';
import { Copy, Check, RefreshCw, Download, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface MinutesViewerProps {
  minutes: string;
  meetingId: number;
  onUpdate?: (minutes: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export default function MinutesViewer({
  minutes,
  meetingId,
  onUpdate,
  onRegenerate,
  isRegenerating = false,
}: MinutesViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMinutes, setEditedMinutes] = useState(minutes);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(minutes);
      setCopied(true);
      toast.success('クリップボードにコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleSave = async () => {
    try {
      await api.updateMeeting(meetingId, { minutes: editedMinutes });
      onUpdate?.(editedMinutes);
      setIsEditing(false);
      toast.success('議事録を保存しました');
    } catch {
      toast.error('保存に失敗しました');
    }
  };

  const handleCancel = () => {
    setEditedMinutes(minutes);
    setIsEditing(false);
  };

  const handleExport = (format: 'md' | 'txt') => {
    const url = api.getExportUrl(meetingId, format);
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          生成された議事録
        </h3>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white
                  rounded-lg hover:bg-green-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-500 text-white
                  rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                キャンセル
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                編集
              </button>
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                再生成
              </button>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                コピー
              </button>
              <div className="relative group">
                <button
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  エクスポート
                </button>
                <div className="absolute right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                  border border-gray-200 dark:border-gray-700 opacity-0 invisible
                  group-hover:opacity-100 group-hover:visible transition-all z-10"
                >
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                      hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                      hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Text (.txt)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
        {isEditing ? (
          <textarea
            value={editedMinutes}
            onChange={(e) => setEditedMinutes(e.target.value)}
            className="w-full h-[500px] p-4 font-mono text-sm text-gray-800 dark:text-gray-200
              bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
            {minutes}
          </pre>
        )}
      </div>
    </div>
  );
}
