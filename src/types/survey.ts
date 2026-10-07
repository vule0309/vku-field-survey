// Type definitions for VKU Field Survey

export type SurveyCategory = 'Hardware' | 'Projector' | 'AC' | 'Electrical' | 'Furniture';

export type SurveyStatus = 'PENDING_SYNC' | 'SYNCED' | 'FAILED';

export interface SurveyDraft {
  building: string;
  floor: string;
  room: string;
  category: SurveyCategory | '';
  rating: number; // 1 to 5
  notes: string;
  photo?: string; // Base64 data URL
  currentStep: number; // 1, 2, or 3
  updatedAt: string;
}

export interface SurveyRecord {
  id: string; // UUID v4
  building: string;
  floor: string;
  room: string;
  category: SurveyCategory;
  rating: number; // 1-5
  notes: string;
  photo?: string;
  createdAt: string; // ISO String
  status: SurveyStatus;
  syncedAt?: string;
  syncError?: string;
}

export interface ServerSyncLog {
  id: string;
  surveyId: string;
  room: string;
  building: string;
  category: SurveyCategory;
  rating: number;
  syncedAt: string;
  clientIp?: string;
  status: 'SUCCESS' | 'ERROR';
}
