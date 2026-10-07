import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Laptop,
  Tv,
  Wind,
  Zap,
  Armchair,
  Star,
  Camera,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  CloudUpload,
} from 'lucide-react';
import type { SurveyCategory, SurveyDraft, SurveyRecord } from '../types/survey';
import { saveDraft, getDraft, clearDraft, saveSurvey } from '../services/db';
import { fileToCompressedBase64 } from '../utils/image';
import { syncPendingSurveys } from '../services/sync';

interface SurveyFormProps {
  isOnline: boolean;
  onSurveySubmitted: () => void;
  onViewQueue: () => void;
}

const CATEGORIES: { id: SurveyCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'Hardware', label: 'Hardware / Máy tính', icon: <Laptop className="w-5 h-5" />, color: 'border-blue-500 text-blue-600 bg-blue-50' },
  { id: 'Projector', label: 'Projector / Máy chiếu', icon: <Tv className="w-5 h-5" />, color: 'border-purple-500 text-purple-600 bg-purple-50' },
  { id: 'AC', label: 'AC / Điều hòa', icon: <Wind className="w-5 h-5" />, color: 'border-cyan-500 text-cyan-600 bg-cyan-50' },
  { id: 'Electrical', label: 'Electrical / Điện', icon: <Zap className="w-5 h-5" />, color: 'border-amber-500 text-amber-600 bg-amber-50' },
  { id: 'Furniture', label: 'Furniture / Bàn ghế', icon: <Armchair className="w-5 h-5" />, color: 'border-emerald-500 text-emerald-600 bg-emerald-50' },
];

const QUICK_BUILDINGS = ['Khu A', 'Khu B', 'Khu C', 'Khu V', 'Khu K', 'Ký túc xá'];

const QUICK_NOTES: Record<SurveyCategory, string[]> = {
  Hardware: ['Màn hình không lên nguồn', 'Chuột/Bàn phím hỏng', 'Mất kết nối mạng LAN', 'Case kêu to, quạt tản nhiệt hỏng'],
  Projector: ['HDMI chập chờn / không nhận cáp', 'Bóng đèn mờ, nhòe màu', 'Không có remote điều khiển', 'Khung chiếu bị lệch méo'],
  AC: ['Điều hòa chảy nước', 'Không mát / hết gas', 'Remote hỏng pin/liệt phím', 'Phát tiếng ồn lớn khi chạy'],
  Electrical: ['Ổ cắm điện bị lỏng chập', 'Bóng đèn tuýp nhấp nháy', 'Công tắc điện bị vỡ', 'Quạt trần rung lắc mạnh'],
  Furniture: ['Ghế gãy chân / lung lay', 'Bàn bị vẽ bậy, tróc sơn', 'Bục giảng hỏng khóa tủ', 'Rèm cửa bị đứt dây kéo'],
};

export const SurveyForm: React.FC<SurveyFormProps> = ({
  isOnline,
  onSurveySubmitted,
  onViewQueue,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [building, setBuilding] = useState<string>('Khu A');
  const [floor, setFloor] = useState<string>('3');
  const [room, setRoom] = useState<string>('A301');
  const [category, setCategory] = useState<SurveyCategory | ''>('Projector');
  const [rating, setRating] = useState<number>(2);
  const [notes, setNotes] = useState<string>('Cáp HDMI chập chờn, máy chiếu nhấp nháy');
  const [photo, setPhoto] = useState<string>('');
  const [draftRestored, setDraftRestored] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    getDraft().then((draft) => {
      if (!mounted) return;
      if (draft) {
        if (draft.building) setBuilding(draft.building);
        if (draft.floor) setFloor(draft.floor);
        if (draft.room) setRoom(draft.room);
        if (draft.category) setCategory(draft.category);
        if (draft.rating) setRating(draft.rating);
        if (draft.notes) setNotes(draft.notes);
        if (draft.photo) setPhoto(draft.photo);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        setDraftRestored(true);
        setLastSavedTime(new Date(draft.updatedAt).toLocaleTimeString('vi-VN'));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-save draft into IndexedDB on every change
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date();
      const draftData: SurveyDraft = {
        building,
        floor,
        room,
        category,
        rating,
        notes,
        photo,
        currentStep,
        updatedAt: now.toISOString(),
      };
      saveDraft(draftData);
      setLastSavedTime(now.toLocaleTimeString('vi-VN'));
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [building, floor, room, category, rating, notes, photo, currentStep]);

  // Handle Photo input / camera capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToCompressedBase64(file);
      setPhoto(base64);
    } catch (err) {
      console.error('Error reading image file:', err);
      alert('Không thể tải ảnh. Vui lòng thử lại.');
    }
  };

  const handleClearDraft = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa bản nháp hiện tại và nhập lại từ đầu?')) {
      await clearDraft();
      setBuilding('Khu A');
      setFloor('1');
      setRoom('');
      setCategory('');
      setRating(3);
      setNotes('');
      setPhoto('');
      setCurrentStep(1);
      setDraftRestored(false);
    }
  };

  // Submit survey form
  const handleSubmitSurvey = async () => {
    if (!building || !floor || !room) {
      alert('Vui lòng hoàn thành thông tin địa điểm (Tòa nhà, Tầng, Phòng)');
      setCurrentStep(1);
      return;
    }

    if (!category) {
      alert('Vui lòng chọn danh mục thiết bị kiểm định');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const newSurvey: SurveyRecord = {
        id: crypto.randomUUID(),
        building,
        floor,
        room,
        category,
        rating,
        notes,
        photo,
        createdAt: new Date().toISOString(),
        status: 'PENDING_SYNC', // Always start as PENDING_SYNC in local IndexedDB
      };

      // 1. Save to local IndexedDB Survey Queue
      await saveSurvey(newSurvey);

      // 2. Clear current draft
      await clearDraft();

      // 3. If online, trigger sequential auto-sync
      if (isOnline) {
        syncPendingSurveys().then(() => {
          onSurveySubmitted();
        });
        setSubmitSuccessMessage(
          `Khảo sát phòng ${room} đã lưu và đang được đồng bộ lên máy chủ VKU!`
        );
      } else {
        setSubmitSuccessMessage(
          `Khảo sát phòng ${room} đã lưu an toàn vào máy (Ngoại tuyến). Hệ thống sẽ tự động gửi khi có kết nối mạng!`
        );
      }

      // Reset form fields
      setRoom('');
      setNotes('');
      setPhoto('');
      setRating(3);
      setCurrentStep(1);
      onSurveySubmitted();
    } catch (err) {
      console.error('Failed to submit survey:', err);
      alert('Có lỗi khi lưu khảo sát. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>
              <strong>Bản nháp được khôi phục từ IndexedDB</strong> (Lần lưu cuối: {lastSavedTime})
            </span>
          </div>
          <button
            onClick={() => setDraftRestored(false)}
            className="text-sky-600 hover:text-sky-900 font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Submit Success Message */}
      {submitSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Gửi khảo sát thành công!</h4>
              <p className="text-xs text-emerald-700 mt-0.5">{submitSuccessMessage}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={onViewQueue}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Xem lịch sử kiểm định
                </button>
                <button
                  onClick={() => setSubmitSuccessMessage(null)}
                  className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-medium"
                >
                  Tạo tiếp khảo sát mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Header Stepper */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs mb-6">
        <div className="flex items-center justify-between relative mb-2">
          {/* Step 1 */}
          <button
            onClick={() => setCurrentStep(1)}
            className="flex flex-col items-center z-10 focus:outline-none"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 1
                  ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md'
                  : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <span
              className={`text-xs mt-1.5 font-medium ${
                currentStep === 1 ? 'text-sky-700 font-bold' : 'text-slate-500'
              }`}
            >
              Địa điểm
            </span>
          </button>

          {/* Connector Line 1-2 */}
          <div className="flex-1 h-0.5 mx-2 bg-slate-200 -mt-5 relative">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{ width: currentStep >= 2 ? '100%' : '0%' }}
            ></div>
          </div>

          {/* Step 2 */}
          <button
            onClick={() => building && floor && room && setCurrentStep(2)}
            className="flex flex-col items-center z-10 focus:outline-none"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 2
                  ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md'
                  : currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
            </div>
            <span
              className={`text-xs mt-1.5 font-medium ${
                currentStep === 2 ? 'text-sky-700 font-bold' : 'text-slate-500'
              }`}
            >
              Thiết bị & Đánh giá
            </span>
          </button>

          {/* Connector Line 2-3 */}
          <div className="flex-1 h-0.5 mx-2 bg-slate-200 -mt-5 relative">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{ width: currentStep >= 3 ? '100%' : '0%' }}
            ></div>
          </div>

          {/* Step 3 */}
          <button
            onClick={() => building && floor && room && category && setCurrentStep(3)}
            className="flex flex-col items-center z-10 focus:outline-none"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 3
                  ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs mt-1.5 font-medium ${
                currentStep === 3 ? 'text-sky-700 font-bold' : 'text-slate-500'
              }`}
            >
              Ảnh chụp & Xác nhận
            </span>
          </button>
        </div>

        {/* Step details header */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5 text-sky-600" />
            <span>Tự động lưu vào IndexedDB</span>
            {lastSavedTime && <span>({lastSavedTime})</span>}
          </div>
          <button
            onClick={handleClearDraft}
            className="text-rose-500 hover:text-rose-700 inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa nháp</span>
          </button>
        </div>
      </div>

      {/* ================= STEP 1: LOCATION ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-600" />
              Bước 1: Thông tin địa điểm kiểm định
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn tòa nhà, số tầng và phòng học cần thanh tra thiết bị
            </p>
          </div>

          {/* Building Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tòa nhà / Khu vực (Building) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {QUICK_BUILDINGS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBuilding(b);
                    if (!room || room.startsWith('A') || room.startsWith('B') || room.startsWith('V') || room.startsWith('K')) {
                      const prefix = b.includes('A') ? 'A' : b.includes('B') ? 'B' : b.includes('V') ? 'V' : b.includes('K') ? 'K' : '';
                      setRoom(`${prefix}${floor}01`);
                    }
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    building === b
                      ? 'border-sky-600 bg-sky-50 text-sky-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Hoặc nhập tên tòa nhà khác..."
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          {/* Floor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tầng (Floor) <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4', '5', '6'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFloor(f);
                    const prefix = building.includes('A') ? 'A' : building.includes('B') ? 'B' : building.includes('V') ? 'V' : building.includes('K') ? 'K' : '';
                    setRoom(`${prefix}${f}01`);
                  }}
                  className={`w-12 h-10 rounded-xl font-bold text-sm border transition-all ${
                    floor === f
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Room Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mã phòng học / Lab (Room #) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: A301, V204, B102, Lab 5..."
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ví dụ: A301 (Tòa A, Tầng 3, Phòng 01), V102 (Tòa Việt-Hàn)
            </p>
          </div>

          {/* Navigation */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={!building || !floor || !room}
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all"
            >
              <span>Tiếp tục: Bước 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: CATEGORY & RATING ================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-sky-600" />
              Bước 2: Phân loại danh mục & Đánh giá hiện trạng
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {building} • Tầng {floor} • Phòng <strong>{room}</strong>
            </p>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Danh mục thiết bị (Category) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    category === cat.id
                      ? `${cat.color} font-bold ring-2 ring-sky-400/40 shadow-xs`
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      category === cat.id ? 'bg-white shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{cat.label.split('/')[0]}</div>
                    <div className="text-[11px] text-slate-500">{cat.label.split('/')[1]}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Condition Rating (1-5 Stars) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tình trạng hoạt động (Condition Rating) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {rating === 1 && '⭐ 1 - Rất tệ / Hỏng hoàn toàn'}
                {rating === 2 && '⭐⭐ 2 - Kém / Cần sửa chữa'}
                {rating === 3 && '⭐⭐⭐ 3 - Trung bình / Tạm dùng'}
                {rating === 4 && '⭐⭐⭐⭐ 4 - Tốt / Bình thường'}
                {rating === 5 && '⭐⭐⭐⭐⭐ 5 - Rất tốt / Hoàn hảo'}
              </span>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-115 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400 filter drop-shadow-xs'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold text-slate-700 ml-2">
                {rating} / 5 Sao
              </span>
            </div>
          </div>

          {/* Defect Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ghi chú lỗi / Chi tiết hư hại (Defect Notes)
            </label>

            {/* Quick pre-filled tags */}
            {category && QUICK_NOTES[category] && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {QUICK_NOTES[category].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setNotes((prev) => (prev ? `${prev}, ${tag}` : tag));
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={3}
              placeholder="Mô tả chi tiết tình trạng hỏng hóc, vị trí thiết bị trong phòng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            ></textarea>
          </div>

          {/* Navigation */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              disabled={!category}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all"
            >
              <span>Tiếp tục: Bước 3</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PHOTO & SUBMIT ================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-sky-600" />
              Bước 3: Chụp ảnh hiện trường & Xác nhận gửi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đính kèm hình ảnh minh chứng hư hại và xem lại toàn bộ thông tin
            </p>
          </div>

          {/* Camera Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ảnh chụp hiện trường (Camera Photo)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment" // Native camera trigger on mobile devices
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900 max-w-md mx-auto">
                <img
                  src={photo}
                  alt="Ảnh kiểm định"
                  className="w-full h-56 object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Chụp lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa ảnh
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white rounded-lg text-[10px] font-mono">
                  Ảnh đã nén & sẵn sàng lưu IndexedDB
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
              >
                <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  Nhấn để Chụp ảnh hoặc Tải ảnh lên
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ Camera trực tiếp từ điện thoại hoặc chọn ảnh từ thư viện
                </p>
                <span className="inline-block mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-2xs">
                  Mở Máy ảnh
                </span>
              </div>
            )}
          </div>

          {/* Summary Review Card */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kiểm tra lại thông tin khảo sát
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Phòng kiểm tra</span>
                <span className="font-bold text-slate-800 text-sm">{room}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Tòa & Tầng</span>
                <span className="font-semibold text-slate-700">{building} • Tầng {floor}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Danh mục</span>
                <span className="font-semibold text-sky-700">{category}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Đánh giá</span>
                <span className="font-bold text-amber-600">{rating} / 5 ⭐</span>
              </div>
            </div>

            {notes && (
              <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 block mb-0.5 font-medium">Ghi chú lỗi:</span>
                <p className="text-slate-700">{notes}</p>
              </div>
            )}

            {/* Offline tag preview */}
            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <span>Trạng thái ban đầu:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold font-mono text-[11px]">
                PENDING_SYNC (IndexedDB Queue)
              </span>
            </div>
          </div>

          {/* Navigation & Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitSurvey}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
                isOnline
                  ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/30'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : isOnline ? (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Xác nhận & Gửi khảo sát</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu ngoại tuyến (Chờ gửi)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
