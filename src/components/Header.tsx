import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Download,
  ClipboardList,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { promptPWAInstall, isPWAInstallable } from '../services/sw-register';
import { syncPendingSurveys, isCurrentlySyncing } from '../services/sync';

interface HeaderProps {
  activeTab: 'form' | 'history';
  setActiveTab: (tab: 'form' | 'history') => void;
  pendingCount: number;
  totalCount: number;
  isOnline: boolean;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  totalCount,
  isOnline,
  onRefreshData,
}) => {
  const [canInstall, setCanInstall] = useState(isPWAInstallable());
  const [syncing, setSyncing] = useState(isCurrentlySyncing());

  useEffect(() => {
    const handleCanInstall = (e: any) => {
      setCanInstall(e.detail.canInstall);
    };

    window.addEventListener('vku-can-install', handleCanInstall);
    return () => {
      window.removeEventListener('vku-can-install', handleCanInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    const installed = await promptPWAInstall();
    if (installed) {
      setCanInstall(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Không có kết nối mạng! Dữ liệu sẽ tiếp tục lưu an toàn trong máy.');
      return;
    }
    setSyncing(true);
    await syncPendingSurveys();
    setSyncing(false);
    onRefreshData();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 font-bold text-base tracking-wider">
              VKU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">
                  Field Survey
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                  Offline-First
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Hệ thống kiểm định CSVC phòng học & phòng máy VKU
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center gap-2">
            {/* Online / Offline Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
              }`}
              title={isOnline ? 'Đang kết nối Internet' : 'Mất kết nối mạng - Đang lưu ngoại tuyến'}
            >
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Quick Sync Button if pending items and online */}
            {pendingCount > 0 && isOnline && (
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors disabled:opacity-50"
                title="Đồng bộ các khảo sát đang chờ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Gửi ({pendingCount})</span>
              </button>
            )}

            {/* Install PWA Button */}
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
                title="Cài đặt PWA lên máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cài App</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Clean Main Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'form'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Mẫu kiểm định</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all relative ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lịch sử kiểm định ({totalCount})</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'history'
                  ? 'bg-white text-amber-600'
                  : 'bg-amber-500 text-white'
              }`}>
                {pendingCount} chờ gửi
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
