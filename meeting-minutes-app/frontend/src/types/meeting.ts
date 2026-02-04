export type ProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'transcribing'
  | 'generating'
  | 'completed'
  | 'error';

export interface Meeting {
  id: number;
  file_name: string;
  file_size: number;
  title: string | null;
  meeting_date: string | null;
  location: string | null;
  participants: string[] | null;
  purpose: string | null;
  status: ProcessingStatus;
  transcription: string | null;
  minutes: string | null;
  progress: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingListResponse {
  meetings: Meeting[];
  total: number;
}

export interface UploadResponse {
  id: number;
  file_name: string;
  file_size: number;
  message: string;
}

export interface ProgressUpdate {
  progress: number;
  status: ProcessingStatus;
  message: string;
}

export interface EmailData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

export interface MeetingMetadata {
  title?: string;
  meeting_date?: string;
  location?: string;
  participants?: string[];
  purpose?: string;
}
