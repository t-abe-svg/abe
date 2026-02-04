import {
  Meeting,
  MeetingListResponse,
  UploadResponse,
  ProgressUpdate,
  EmailData,
  MeetingMetadata,
} from '@/types/meeting';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(error.detail || 'Request failed', response.status);
  }
  return response.json();
}

export const api = {
  // Upload audio file
  async uploadAudio(
    file: File,
    metadata?: MeetingMetadata,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.meeting_date) formData.append('meeting_date', metadata.meeting_date);
    if (metadata?.location) formData.append('location', metadata.location);
    if (metadata?.participants) {
      formData.append('participants', JSON.stringify(metadata.participants));
    }
    if (metadata?.purpose) formData.append('purpose', metadata.purpose);

    // Use XMLHttpRequest for upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/meetings/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new ApiError(error.detail || 'Upload failed', xhr.status));
          } catch {
            reject(new ApiError('Upload failed', xhr.status));
          }
        }
      };

      xhr.onerror = () => {
        reject(new ApiError('Network error', 0));
      };

      xhr.send(formData);
    });
  },

  // Start processing meeting
  async startProcessing(meetingId: number): Promise<{ message: string; id: number }> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/process`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Get processing progress
  async getProgress(meetingId: number): Promise<ProgressUpdate> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/progress`);
    return handleResponse(response);
  },

  // Stream processing progress via SSE
  streamProgress(meetingId: number, onProgress: (update: ProgressUpdate) => void): () => void {
    const eventSource = new EventSource(
      `${API_BASE_URL}/api/meetings/${meetingId}/progress/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);

        if (data.status === 'completed' || data.status === 'error') {
          eventSource.close();
        }
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  },

  // Get meeting details
  async getMeeting(meetingId: number): Promise<Meeting> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}`);
    return handleResponse(response);
  },

  // List meetings
  async listMeetings(
    skip: number = 0,
    limit: number = 20,
    search?: string
  ): Promise<MeetingListResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/api/meetings/?${params}`);
    return handleResponse(response);
  },

  // Update meeting
  async updateMeeting(meetingId: number, data: Partial<Meeting>): Promise<Meeting> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete meeting
  async deleteMeeting(meetingId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new ApiError('Failed to delete meeting', response.status);
    }
  },

  // Regenerate minutes
  async regenerateMinutes(meetingId: number): Promise<{ message: string; id: number }> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/regenerate`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Generate email
  async generateEmail(
    meetingId: number,
    emailData: EmailData
  ): Promise<{ mailto_url: string; subject: string; body: string }> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
    return handleResponse(response);
  },

  // Export meeting
  getExportUrl(meetingId: number, format: 'md' | 'txt'): string {
    return `${API_BASE_URL}/api/meetings/${meetingId}/export/${format}`;
  },

  // Health check
  async healthCheck(): Promise<{
    status: string;
    openai_configured: boolean;
    anthropic_configured: boolean;
  }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};
