import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  Star,
  MapPin,
  Laptop,
  Tv,
  Wind,
  Zap,
  Armchair,
  Filter,
  Plus,
} from 'lucide-react';
import type { SurveyRecord, SurveyCategory } from '../types/survey';
import { deleteSurvey } from '../services/db';
import { syncPendingSurveys, isCurrentlySyncing } from '../services/sync';

interface SurveyQueueProps {
  surveys: SurveyRecord[];
  isOnline: boolean;
  onRefresh: () => void;
  onNewSurvey: () => void;
}

const CATEGORY_ICONS: Record<SurveyCategory, React.ReactNode> = {
  Hardware: <Laptop className="w-4 h-4 text-blue-600" />,
  Projector: <Tv className="w-4 h-4 text-purple-600" />,
  AC: <Wind className="w-4 h-4 text-cyan-600" />,
  Electrical: <Zap className="w-4 h-4 text-amber-600" />,
  Furniture: <Armchair className="w-4 h-4 text-emerald-600" />,
};

export const SurveyQueue: React.FC<SurveyQueueProps> = ({
  surveys,
  isOnline,
  onRefresh,
  onNewSurvey,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; room: string } | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(isCurrentlySyncing());

  const pendingList = surveys.filter((s) => s.status === 'PENDING_SYNC');
  const syncedList = surveys.filter((s) => s.status === 'SYNCED');

  const filteredSurveys = surveys.filter((s) => {
    if (filter === 'PENDING') return s.status === 'PENDING_SYNC';
    if (filter === 'SYNCED') return s.status === 'SYNCED';
    return true;
  });

  const handleSyncAll = async () => {
    if (!isOnline) {
      alert('Không có kết nối mạng! Không thể gửi dữ liệu lên máy chủ lúc này.');
      return;
    }

    if (pendingList.length === 0) {
      alert('Không có khảo sát nào đang chờ đồng bộ.');
      return;
    }

    setIsSyncing(true);
    try {
      await syncPendingSurveys((current, total, item) => {
        setSyncProgress({ current, total, room: item.room });
      });
      onRefresh();
    } catch (err) {
      console.error('Error during manual sync:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleDelete = async (id: string, room: string) => {
    if (confirm(`Bạn có chắc muốn xóa bản ghi khảo sát phòng ${room}?`)) {
      await deleteSurvey(id);
      onRefresh();
      if (selectedSurvey?.id === id) {
        setSelectedSurvey(null);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Lịch sử kiểm định phòng học</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              Đã lưu trên máy
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách thiết bị đã kiểm tra. Tự động lưu trữ khi mất sóng và đồng bộ lên hệ thống trường khi có mạng.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onNewSurvey}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mới</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={!isOnline || isSyncing || pendingList.length === 0}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all ${
              pendingList.length > 0 && isOnline
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Đang đồng bộ...'
                : `Đồng bộ ngay (${pendingList.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Sequential Sync Progress Bar Alert */}
      {syncProgress && (
        <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl shadow-xs animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-sky-800 mb-1.5">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              Đang đồng bộ tuần tự: Phòng {syncProgress.room}...
            </span>
            <span>
              {syncProgress.current} / {syncProgress.total} (
              {Math.round((syncProgress.current / syncProgress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-sky-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-sky-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(syncProgress.current / syncProgress.total) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Stats Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({surveys.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ đồng bộ ({pendingList.length})</span>
          </button>
          <button
            onClick={() => setFilter('SYNCED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'SYNCED'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã đồng bộ ({syncedList.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Sắp xếp: Mới nhất trước (FIFO khi sync)</span>
        </div>
      </div>

      {/* Survey List */}
      {filteredSurveys.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Chưa có khảo sát nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'Hãy tạo khảo sát đầu tiên ngay cả khi không có kết nối Internet.'
              : filter === 'PENDING'
              ? 'Không có khảo sát nào đang chờ đồng bộ.'
              : 'Chưa có khảo sát nào được đồng bộ lên máy chủ.'}
          </p>
          <button
            onClick={onNewSurvey}
            className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Bắt đầu khảo sát mới
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSurveys.map((survey) => {
            const isPending = survey.status === 'PENDING_SYNC';
            return (
              <div
                key={survey.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                  isPending
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    {/* Status Badge Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPending
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                      title={isPending ? 'Chờ đồng bộ' : 'Đã đồng bộ lên server'}
                    >
                      {isPending ? (
                        <Clock className="w-5 h-5 animate-pulse" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      {/* Room & Building title */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-base">
                          {isPending ? '⏳' : '✓'} Phòng {survey.room}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {survey.building} - Tầng {survey.floor}
                        </span>
                        {/* Status chip */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isPending ? 'Pending Sync' : 'Synced'}
                        </span>
                      </div>

                      {/* Category & Rating */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          {CATEGORY_ICONS[survey.category]}
                          {survey.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          {Array.from({ length: survey.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="text-slate-500 font-normal ml-1">
                            ({survey.rating}/5)
                          </span>
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-slate-400">
                          Tạo: {new Date(survey.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {/* Defect Notes */}
                      {survey.notes && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <strong>Ghi chú:</strong> {survey.notes}
                        </p>
                      )}

                      {/* Sync Error if any */}
                      {survey.syncError && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Lỗi đồng bộ: {survey.syncError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right actions & photo thumbnail */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {survey.photo && (
                      <div
                        onClick={() => setSelectedSurvey(survey)}
                        className="cursor-pointer relative rounded-xl overflow-hidden border border-slate-200 w-12 h-12 shrink-0 group hover:ring-2 hover:ring-sky-500 transition-all"
                      >
                        <img
                          src={survey.photo}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedSurvey(survey)}
                        className="p-2 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(survey.id, survey.room)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa khảo sát"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Survey Detail Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                Chi tiết khảo sát: Phòng {selectedSurvey.room}
              </h3>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Photo */}
            {selectedSurvey.photo ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                <img
                  src={selectedSurvey.photo}
                  alt="Ảnh hiện trường"
                  className="w-full max-h-72 object-contain"
                />
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl text-xs text-slate-400">
                Không đính kèm ảnh
              </div>
            )}

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block">Địa điểm</span>
                <span className="font-bold text-slate-800">
                  {selectedSurvey.building} - Tầng {selectedSurvey.floor} - {selectedSurvey.room}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block">Danh mục</span>
                <span className="font-bold text-slate-800">
                  {selectedSurvey.category}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block">Đánh giá</span>
                <span className="font-bold text-amber-600">
                  {selectedSurvey.rating} / 5 Sao
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block">Trạng thái</span>
                <span
                  className={`font-bold ${
                    selectedSurvey.status === 'SYNCED'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {selectedSurvey.status}
                </span>
              </div>
            </div>

            {/* Notes */}
            {selectedSurvey.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 block mb-1">Ghi chú lỗi:</span>
                <p className="text-slate-800 whitespace-pre-wrap">{selectedSurvey.notes}</p>
              </div>
            )}

            {/* Metadata UUID & Timestamps */}
            <div className="bg-slate-900 text-slate-300 p-3.5 rounded-xl text-[11px] font-mono space-y-1">
              <div>UUID: <span className="text-sky-400">{selectedSurvey.id}</span></div>
              <div>Tạo lúc: {selectedSurvey.createdAt}</div>
              {selectedSurvey.syncedAt && (
                <div>Đồng bộ lúc: <span className="text-emerald-400">{selectedSurvey.syncedAt}</span></div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSurvey(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
