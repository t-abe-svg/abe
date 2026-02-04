'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { MeetingMetadata } from '@/types/meeting';

interface MetadataFormProps {
  metadata: MeetingMetadata;
  onChange: (metadata: MeetingMetadata) => void;
  disabled?: boolean;
}

export default function MetadataForm({
  metadata,
  onChange,
  disabled = false,
}: MetadataFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [participantInput, setParticipantInput] = useState('');

  const updateField = <K extends keyof MeetingMetadata>(
    field: K,
    value: MeetingMetadata[K]
  ) => {
    onChange({ ...metadata, [field]: value });
  };

  const addParticipant = () => {
    if (participantInput.trim()) {
      const current = metadata.participants || [];
      if (!current.includes(participantInput.trim())) {
        updateField('participants', [...current, participantInput.trim()]);
      }
      setParticipantInput('');
    }
  };

  const removeParticipant = (index: number) => {
    const current = metadata.participants || [];
    updateField(
      'participants',
      current.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        disabled={disabled}
      >
        <span className="font-medium text-gray-900 dark:text-white">
          補助情報を入力（任意）
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700">
          {/* Title */}
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              会議名 / プロジェクト名
            </label>
            <input
              type="text"
              value={metadata.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="例：週次定例会議"
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Meeting Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              日時
            </label>
            <input
              type="datetime-local"
              value={metadata.meeting_date || ''}
              onChange={(e) => updateField('meeting_date', e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              場所 / 形式
            </label>
            <input
              type="text"
              value={metadata.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="例：オンライン（Zoom）"
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              参加者
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                placeholder="名前を入力してEnter"
                disabled={disabled}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={addParticipant}
                disabled={disabled || !participantInput.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                追加
              </button>
            </div>
            {metadata.participants && metadata.participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.participants.map((participant, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700
                      text-gray-700 dark:text-gray-300 rounded-full text-sm"
                  >
                    {participant}
                    {!disabled && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Target className="w-4 h-4 inline mr-1" />
              会議の目的 / アジェンダ
            </label>
            <textarea
              value={metadata.purpose || ''}
              onChange={(e) => updateField('purpose', e.target.value)}
              placeholder="例：プロジェクト進捗の確認と次週のタスク割り当て"
              rows={3}
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
