import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Meeting,
  UploadResponse,
  ProgressUpdate,
  MeetingMetadata,
} from '@/types/meeting';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchMeetings = useCallback(async (skip = 0, limit = 20, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listMeetings(skip, limit, search);
      setMeetings(response.meetings);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMeeting = useCallback(async (meetingId: number) => {
    try {
      const meeting = await api.getMeeting(meetingId);
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? meeting : m))
      );
      return meeting;
    } catch (err) {
      console.error('Failed to refresh meeting:', err);
      return null;
    }
  }, []);

  return {
    meetings,
    loading,
    error,
    total,
    fetchMeetings,
    refreshMeeting,
  };
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, metadata?: MeetingMetadata): Promise<UploadResponse | null> => {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const response = await api.uploadAudio(file, metadata, (progress) => {
          setUploadProgress(progress);
        });
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return {
    upload,
    uploading,
    uploadProgress,
    error,
    setError,
  };
}

export function useProcessing() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startProcessing = useCallback(async (meetingId: number) => {
    setProcessing(true);
    setProgress(null);
    setError(null);

    try {
      await api.startProcessing(meetingId);

      // Start streaming progress
      const cleanup = api.streamProgress(meetingId, (update) => {
        setProgress(update);

        if (update.status === 'completed') {
          setProcessing(false);
        } else if (update.status === 'error') {
          setProcessing(false);
          setError(update.message);
        }
      });

      // Return cleanup function
      return cleanup;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setProcessing(false);
      return null;
    }
  }, []);

  const pollProgress = useCallback(async (meetingId: number) => {
    try {
      const update = await api.getProgress(meetingId);
      setProgress(update);

      if (update.status === 'completed') {
        setProcessing(false);
      } else if (update.status === 'error') {
        setProcessing(false);
        setError(update.message);
      }

      return update;
    } catch (err) {
      console.error('Failed to poll progress:', err);
      return null;
    }
  }, []);

  return {
    startProcessing,
    pollProgress,
    processing,
    progress,
    error,
    setProcessing,
    setProgress,
    setError,
  };
}
