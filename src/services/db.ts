import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SurveyDraft, SurveyRecord, ServerSyncLog, SurveyStatus } from '../types/survey';

const DB_NAME = 'VKU_Field_Survey_DB';
const DB_VERSION = 1;

interface VKUSurveyDB extends DBSchema {
  draft: {
    key: string;
    value: SurveyDraft;
  };
  surveys: {
    key: string;
    value: SurveyRecord;
    indexes: {
      'by-status': SurveyStatus;
      'by-created': string;
    };
  };
  server_logs: {
    key: string;
    value: ServerSyncLog;
    indexes: {
      'by-synced': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VKUSurveyDB>> | null = null;

function getDb(): Promise<IDBPDatabase<VKUSurveyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VKUSurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store 1: Form Draft Store
        if (!db.objectStoreNames.contains('draft')) {
          db.createObjectStore('draft');
        }

        // Store 2: Surveys Store with indexes
        if (!db.objectStoreNames.contains('surveys')) {
          const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
          surveyStore.createIndex('by-status', 'status');
          surveyStore.createIndex('by-created', 'createdAt');
        }

        // Store 3: Server Logs (for demonstration & inspection)
        if (!db.objectStoreNames.contains('server_logs')) {
          const logStore = db.createObjectStore('server_logs', { keyPath: 'id' });
          logStore.createIndex('by-synced', 'syncedAt');
        }
      },
    });
  }
  return dbPromise;
}

// ==================== DRAFT OPERATIONS ====================

const DRAFT_KEY = 'active_draft';

export async function getDraft(): Promise<SurveyDraft | null> {
  try {
    const db = await getDb();
    const draft = await db.get('draft', DRAFT_KEY);
    return draft || null;
  } catch (error) {
    console.error('Error reading draft from IndexedDB:', error);
    return null;
  }
}

export async function saveDraft(draft: SurveyDraft): Promise<void> {
  try {
    const db = await getDb();
    await db.put('draft', draft, DRAFT_KEY);
  } catch (error) {
    console.error('Error saving draft to IndexedDB:', error);
  }
}

export async function clearDraft(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('draft', DRAFT_KEY);
  } catch (error) {
    console.error('Error clearing draft from IndexedDB:', error);
  }
}

// ==================== SURVEY QUEUE OPERATIONS ====================

export async function saveSurvey(survey: SurveyRecord): Promise<void> {
  const db = await getDb();
  await db.put('surveys', survey);
}

export async function getAllSurveys(): Promise<SurveyRecord[]> {
  const db = await getDb();
  const list = await db.getAll('surveys');
  // Sort newest first
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPendingSurveys(): Promise<SurveyRecord[]> {
  const db = await getDb();
  const list = await db.getAllFromIndex('surveys', 'by-status', 'PENDING_SYNC');
  // Return in chronological order for SEQUENTIAL FIFO dispatch
  return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateSurveyStatus(
  id: string,
  status: SurveyStatus,
  extra?: { syncedAt?: string; syncError?: string }
): Promise<void> {
  const db = await getDb();
  const existing = await db.get('surveys', id);
  if (existing) {
    existing.status = status;
    if (extra?.syncedAt) existing.syncedAt = extra.syncedAt;
    if (extra?.syncError !== undefined) existing.syncError = extra.syncError;
    await db.put('surveys', existing);
  }
}

export async function deleteSurvey(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('surveys', id);
}

export async function clearAllSurveys(): Promise<void> {
  const db = await getDb();
  await db.clear('surveys');
}

// ==================== SIMULATED SERVER LOGS ====================

export async function addServerLog(log: ServerSyncLog): Promise<void> {
  const db = await getDb();
  await db.put('server_logs', log);
}

export async function getServerLogs(): Promise<ServerSyncLog[]> {
  const db = await getDb();
  const logs = await db.getAll('server_logs');
  return logs.sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
}

export async function clearServerLogs(): Promise<void> {
  const db = await getDb();
  await db.clear('server_logs');
}
