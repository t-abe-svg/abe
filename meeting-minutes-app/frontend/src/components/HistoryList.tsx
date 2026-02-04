'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Meeting, ProcessingStatus } from '@/types/meeting';
import { useMeetings } from '@/hooks/useMeetings';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface HistoryListProps {
  onSelect: (meeting: Meeting) => void;
  selectedId?: number;
}

const statusIcons: Record<ProcessingStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  uploading: Loader2,
  transcribing: Loader2,
  generating: Loader2,
  completed: CheckCircle,
  error: AlertCircle,
};

const statusColors: Record<ProcessingStatus, string> = {
  pending: 'text-gray-400',
  uploading: 'text-blue-500',
  transcribing: 'text-blue-500',
  generating: 'text-purple-500',
  completed: 'text-green-500',
  error: 'text-red-500',
};

export default function HistoryList({ onSelect, selectedId }: HistoryListProps) {
  const { meetings, loading, error, total, fetchMeetings } = useMeetings();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchMeetings(page * limit, limit, searchQuery || undefined);
  }, [fetchMeetings, page, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0);
  };

  const handleDelete = async (e: React.MouseEvent, meetingId: number) => {
    e.stopPropagation();
    if (confirm('この議事録を削除してもよろしいですか？')) {
      try {
        await api.deleteMeeting(meetingId);
        toast.success('議事録を削除しました');
        fetchMeetings(page * limit, limit, searchQuery || undefined);
      } catch {
        toast.error('削除に失敗しました');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            履歴 ({total}件)
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="検索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
        {meetings.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? '検索結果がありません' : '履歴がありません'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {meetings.map((meeting) => {
              const StatusIcon = statusIcons[meeting.status];
              const isSelected = meeting.id === selectedId;

              return (
                <div
                  key={meeting.id}
                  onClick={() => onSelect(meeting)}
                  className={clsx(
                    'px-6 py-4 cursor-pointer transition-colors group',
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        'p-2 rounded-lg',
                        isSelected
                          ? 'bg-primary-100 dark:bg-primary-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                      )}
                    >
                      <FileText
                        className={clsx(
                          'w-5 h-5',
                          isSelected
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {meeting.title || meeting.file_name}
                        </p>
                        <StatusIcon
                          className={clsx(
                            'w-4 h-4 flex-shrink-0',
                            statusColors[meeting.status],
                            ['uploading', 'transcribing', 'generating'].includes(meeting.status) &&
                              'animate-spin'
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {format(new Date(meeting.created_at), 'yyyy/MM/dd HH:mm', {
                            locale: ja,
                          })}
                        </span>
                        <span>{formatFileSize(meeting.file_size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, meeting.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30
                          rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <ChevronRight
                        className={clsx(
                          'w-4 h-4',
                          isSelected
                            ? 'text-primary-500'
                            : 'text-gray-400 dark:text-gray-500'
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100
              dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100
              dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
