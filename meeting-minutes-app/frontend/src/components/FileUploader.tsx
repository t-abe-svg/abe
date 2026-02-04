'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
}

const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'webm', 'mp4'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function FileUploader({
  onFileSelect,
  disabled = false,
  error,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFileError(null);

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!ext || !SUPPORTED_FORMATS.includes(ext)) {
        setFileError(
          `対応していない形式です。対応形式: ${SUPPORTED_FORMATS.join(', ')}`
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError('ファイルサイズが500MBを超えています');
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'],
      'video/*': ['.mp4', '.webm'],
    },
    maxFiles: 1,
    disabled,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={clsx(
              'w-12 h-12 mx-auto mb-4',
              isDragActive
                ? 'text-primary-500'
                : 'text-gray-400 dark:text-gray-500'
            )}
          />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isDragActive
              ? 'ファイルをドロップしてください'
              : 'クリックまたはドラッグ＆ドロップ'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            対応形式: {SUPPORTED_FORMATS.join(', ').toUpperCase()} (最大500MB)
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                <File className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!disabled && (
              <button
                onClick={removeFile}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {(fileError || error) && (
        <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{fileError || error}</p>
        </div>
      )}
    </div>
  );
}
