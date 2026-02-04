'use client';

import { useState, useMemo } from 'react';
import { Mail, Copy, Check, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmailData } from '@/types/meeting';
import { api } from '@/lib/api';

interface EmailComposerProps {
  meetingId: number;
  defaultSubject: string;
  defaultBody: string;
}

export default function EmailComposer({
  meetingId,
  defaultSubject,
  defaultBody,
}: EmailComposerProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: [],
    cc: [],
    bcc: [],
    subject: defaultSubject,
    body: defaultBody,
  });
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = (field: 'to' | 'cc' | 'bcc', email: string) => {
    if (isValidEmail(email) && !emailData[field].includes(email)) {
      setEmailData((prev) => ({
        ...prev,
        [field]: [...prev[field], email],
      }));
    }
  };

  const removeEmail = (field: 'to' | 'cc' | 'bcc', index: number) => {
    setEmailData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'to' | 'cc' | 'bcc',
    value: string,
    setValue: (v: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = value.trim().replace(/,$/, '');
      if (trimmed) {
        addEmail(field, trimmed);
        setValue('');
      }
    }
  };

  const copyAll = async () => {
    try {
      const text = `宛先: ${emailData.to.join(', ')}\n${
        emailData.cc.length > 0 ? `Cc: ${emailData.cc.join(', ')}\n` : ''
      }${
        emailData.bcc.length > 0 ? `Bcc: ${emailData.bcc.join(', ')}\n` : ''
      }件名: ${emailData.subject}\n\n${emailData.body}`;

      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('メール内容をコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const openMailClient = async () => {
    try {
      const result = await api.generateEmail(meetingId, emailData);
      window.location.href = result.mailto_url;
    } catch {
      toast.error('メールクライアントの起動に失敗しました');
    }
  };

  const EmailTagInput = ({
    label,
    value,
    onChange,
    emails,
    field,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    emails: string[];
    field: 'to' | 'cc' | 'bcc';
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg
        bg-white dark:bg-gray-700 min-h-[42px]"
      >
        {emails.map((email, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/50
              text-primary-700 dark:text-primary-300 rounded text-sm"
          >
            {email}
            <button
              onClick={() => removeEmail(field, index)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, field, value, onChange)}
          onBlur={() => {
            if (value.trim()) {
              addEmail(field, value.trim());
              onChange('');
            }
          }}
          placeholder={emails.length === 0 ? 'メールアドレスを入力' : ''}
          className="flex-1 min-w-[200px] outline-none bg-transparent text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            メール作成
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAll}
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
          <button
            onClick={openMailClient}
            className="inline-flex items-center gap-1 px-4 py-1.5 text-sm bg-primary-500 text-white
              rounded-lg hover:bg-primary-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            メールクライアントで開く
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        <EmailTagInput
          label="宛先 (To)"
          value={toInput}
          onChange={setToInput}
          emails={emailData.to}
          field="to"
        />

        <button
          onClick={() => setShowCcBcc(!showCcBcc)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          {showCcBcc ? 'Cc/Bccを隠す' : 'Cc/Bccを追加'}
        </button>

        {showCcBcc && (
          <>
            <EmailTagInput
              label="Cc"
              value={ccInput}
              onChange={setCcInput}
              emails={emailData.cc}
              field="cc"
            />
            <EmailTagInput
              label="Bcc"
              value={bccInput}
              onChange={setBccInput}
              emails={emailData.bcc}
              field="bcc"
            />
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            件名
          </label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) =>
              setEmailData((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            本文
          </label>
          <textarea
            value={emailData.body}
            onChange={(e) =>
              setEmailData((prev) => ({ ...prev, body: e.target.value }))
            }
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none
              font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
