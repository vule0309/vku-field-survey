import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SurveyForm } from './components/SurveyForm';
import { SurveyQueue } from './components/SurveyQueue';
import { getAllSurveys } from './services/db';
import type { SurveyRecord } from './types/survey';
import { registerServiceWorker } from './services/sw-register';
import { syncPendingSurveys } from './services/sync';
import { WifiOff } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Refresh survey list from IndexedDB
  const refreshSurveys = useCallback(async () => {
    try {
      const list = await getAllSurveys();
      setSurveys(list);
    } catch (err) {
      console.error('Failed to load surveys from IndexedDB:', err);
    }
  }, []);

  // Initialize Service Worker and global event listeners
  useEffect(() => {
    // Register Cache-First Service Worker
    registerServiceWorker();

    // Initial data load
    refreshSurveys();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto sequential dispatch when network restores
      syncPendingSurveys().then(() => {
        refreshSurveys();
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSurveysUpdated = () => {
      refreshSurveys();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('vku-surveys-updated', handleSurveysUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('vku-surveys-updated', handleSurveysUpdated);
    };
  }, [refreshSurveys]);

  const pendingCount = surveys.filter((s) => s.status === 'PENDING_SYNC').length;
  const totalCount = surveys.length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Offline Alert Strip - Only shown when device is genuinely offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2 font-medium flex items-center justify-center gap-2 shadow-xs transition-all">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            <strong>Đang ở chế độ Ngoại tuyến:</strong> Thiết bị mất kết nối mạng. Dữ liệu kiểm định sẽ được lưu an toàn trong máy và tự động đồng bộ tuần tự khi có mạng trở lại.
          </span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        totalCount={totalCount}
        isOnline={isOnline}
        onRefreshData={refreshSurveys}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'form' && (
          <SurveyForm
            isOnline={isOnline}
            onSurveySubmitted={refreshSurveys}
            onViewQueue={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <SurveyQueue
            surveys={surveys}
            isOnline={isOnline}
            onRefresh={refreshSurveys}
            onNewSurvey={() => setActiveTab('form')}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <p>
          VKU Field Survey PWA • Trường Đại học CNTT & Truyền thông Việt - Hàn
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Cache-First Service Worker • IndexedDB Local Persistence • Sequential Auto-Sync Queue
        </p>
      </footer>
    </div>
  );
}

export default App;
