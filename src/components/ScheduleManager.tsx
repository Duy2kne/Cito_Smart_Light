import { useState, useEffect } from 'react';
import { ScheduleData, ScheduleSlot } from '../types';
import {
  Calendar,
  Clock,
  Power,
  Sparkles,
  Check,
  Edit2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  X,
  Sun,
  Moon,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Sliders,
} from 'lucide-react';
import { getFixtureColorCSS } from '../utils/colorUtils';

interface ScheduleManagerProps {
  scheduleData: ScheduleData | null;
  isConnected: boolean;
  tvalid?: number;
  deviceClock?: string;
  currentColors?: {
    r: number;
    g: number;
    b: number;
    cw: number;
    bri: number;
  };
  onSyncTime: () => Promise<void> | void;
  onToggleMasterSchedule: (enabled: boolean) => void;
  onSaveSlot: (slot: ScheduleSlot) => void;
  onRefreshSchedule: () => void;
}

const WEEKDAYS = [
  { bit: 1, label: 'T2', name: 'Thứ Hai', mask: 2 },
  { bit: 2, label: 'T3', name: 'Thứ Ba', mask: 4 },
  { bit: 3, label: 'T4', name: 'Thứ Tư', mask: 8 },
  { bit: 4, label: 'T5', name: 'Thứ Năm', mask: 16 },
  { bit: 5, label: 'T6', name: 'Thứ Sáu', mask: 32 },
  { bit: 6, label: 'T7', name: 'Thứ Bảy', mask: 64 },
  { bit: 0, label: 'CN', name: 'Chủ Nhật', mask: 1 },
];

export function ScheduleManager({
  scheduleData,
  isConnected,
  tvalid,
  deviceClock,
  currentColors,
  onSyncTime,
  onToggleMasterSchedule,
  onSaveSlot,
  onRefreshSchedule,
}: ScheduleManagerProps) {
  // Đồng hồ thời gian thực (cập nhật mỗi giây)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Trạng thái modal chỉnh sửa mốc
  const [editingSlot, setDraftSlot] = useState<ScheduleSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSyncTime = async () => {
    if (!isConnected || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncTime();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  const isMasterEnabled = scheduleData?.enabled === 1;

  // Lấy danh sách toàn bộ các slots từ scheduleData
  const rawItems = scheduleData?.items || [];
  
  // Xây dựng danh sách các mốc đã được kích hoạt/thêm vào
  const configuredSlots: ScheduleSlot[] = [];

  rawItems.forEach((raw, idx) => {
    if (Array.isArray(raw) && raw.length >= 5) {
      // Nếu slot có en === 1 hoặc có thiết lập giờ phút hoặc act
      const en = raw[0] ?? 0;
      const h = raw[1] ?? 0;
      const m = raw[2] ?? 0;
      const days = raw[3] ?? 127;
      const act = raw[4] ?? 1;
      const scene = raw[5] ?? 0;
      const r = Math.round(raw[6] ?? currentColors?.r ?? 100);
      const g = Math.round(raw[7] ?? currentColors?.g ?? 100);
      const b = Math.round(raw[8] ?? currentColors?.b ?? 100);
      const cw = Math.round(raw[9] ?? currentColors?.cw ?? 100);
      const bri = Math.round(raw[10] ?? currentColors?.bri ?? 100);

      // Chỉ hiển thị slot nếu en === 1 hoặc đã được cấu hình (h, m khác 0 hoặc act khác 0)
      if (en === 1 || h !== 0 || m !== 0 || scene !== 0) {
        configuredSlots.push({
          idx,
          en,
          h,
          m,
          days,
          act,
          scene,
          r,
          g,
          b,
          cw,
          bri,
        });
      }
    }
  });

  // Tìm index tiếp theo chưa dùng
  const getNextAvailableIndex = () => {
    const usedIndices = new Set(configuredSlots.map((s) => s.idx));
    let next = 0;
    while (usedIndices.has(next)) {
      next++;
    }
    return next;
  };

  // Nhấn nút thêm Hẹn Giờ Bật (ON)
  const handleAddOnTimer = () => {
    const newIdx = getNextAvailableIndex();
    const curR = Math.round(currentColors?.r ?? 100);
    const curG = Math.round(currentColors?.g ?? 100);
    const curB = Math.round(currentColors?.b ?? 100);
    const curCw = Math.round(currentColors?.cw ?? 100);
    const curBri = Math.round(currentColors?.bri ?? 100);

    const newSlot: ScheduleSlot = {
      idx: newIdx,
      en: 1,
      h: 8,
      m: 0,
      days: 127, // Hằng ngày
      act: 1, // Bật
      scene: 1, // Áp dụng kịch bản màu
      r: curR,
      g: curG,
      b: curB,
      cw: curCw,
      bri: curBri,
    };
    onSaveSlot(newSlot);
  };

  // Nhấn nút thêm Hẹn Giờ Tắt (OFF)
  const handleAddOffTimer = () => {
    const newIdx = getNextAvailableIndex();
    const newSlot: ScheduleSlot = {
      idx: newIdx,
      en: 1,
      h: 22,
      m: 30,
      days: 127, // Hằng ngày
      act: 0, // Tắt
      scene: 0,
      r: 0,
      g: 0,
      b: 0,
      cw: 0,
      bri: 0,
    };
    onSaveSlot(newSlot);
  };

  // Xóa mốc hẹn giờ
  const handleDeleteSlot = (slot: ScheduleSlot) => {
    onSaveSlot({
      ...slot,
      en: 0,
      h: 0,
      m: 0,
      days: 0,
      scene: 0,
    });
    if (isModalOpen && editingSlot?.idx === slot.idx) {
      setIsModalOpen(false);
      setDraftSlot(null);
    }
  };

  // Chỉnh sửa mốc
  const handleEditSlot = (slot: ScheduleSlot) => {
    setDraftSlot({ ...slot });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setDraftSlot(null);
  };

  const handleSaveModal = () => {
    if (editingSlot) {
      onSaveSlot({
        ...editingSlot,
        en: 1,
        r: Math.round(editingSlot.r),
        g: Math.round(editingSlot.g),
        b: Math.round(editingSlot.b),
        cw: Math.round(editingSlot.cw),
        bri: Math.round(editingSlot.bri),
      });
      closeModal();
    }
  };

  const formatDaysText = (daysMask: number) => {
    if (daysMask === 127) return 'Hằng ngày';
    if (daysMask === 62) return 'Thứ 2 - Thứ 6';
    if (daysMask === 65) return 'Thứ 7 & Chủ Nhật';
    if (daysMask === 0) return 'Không lặp lại';

    const activeDays: string[] = [];
    WEEKDAYS.forEach((d) => {
      if ((daysMask & d.mask) !== 0) {
        activeDays.push(d.label);
      }
    });
    return activeDays.join(', ') || 'Không lặp';
  };

  const toggleDayInDraft = (mask: number) => {
    if (!editingSlot) return;
    const newMask = editingSlot.days ^ mask;
    setDraftSlot({ ...editingSlot, days: newMask });
  };

  // Chuỗi thời gian hiện tại
  const timeString = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateString = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all space-y-5">
      {/* HEADER: Tiêu đề + Nút Đọc Lại + Nút Bật/Tắt Báo Thức */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Lịch Trình Hẹn Giờ (Timer Auto)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Tự động kích hoạt bật / tắt đèn theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Nút đọc lại lịch */}
          <button
            id="refresh-schedule-btn"
            onClick={onRefreshSchedule}
            disabled={!isConnected}
            title="Đọc lại lịch trình từ đèn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer disabled:opacity-40 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* NÚT BẬT / TẮT BÁO THỨC */}
          <button
            id="master-schedule-toggle"
            onClick={() => onToggleMasterSchedule(!isMasterEnabled)}
            disabled={!isConnected}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-40 active:scale-95 ${
              isMasterEnabled
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                : 'backdrop-blur-md bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-white/[0.1]'
            }`}
          >
            {isMasterEnabled ? <Bell className="w-4 h-4 text-amber-300" /> : <BellOff className="w-4 h-4" />}
            <span>{isMasterEnabled ? 'Báo Thức: ĐANG BẬT' : 'Báo Thức: ĐANG TẮT'}</span>
          </button>
        </div>
      </div>

      {/* THANH ĐỒNG HỒ THỜI GIAN THỰC & ĐỒNG BỘ GIỜ ĐÈN */}
      <div className="p-4 rounded-2xl backdrop-blur-md bg-gradient-to-r from-zinc-100/90 via-zinc-50/80 to-zinc-100/90 dark:from-zinc-950/60 dark:via-zinc-900/40 dark:to-zinc-950/60 border border-zinc-200/80 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Khối giờ điện thoại */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-zinc-500 dark:text-zinc-400">
                Giờ Điện Thoại
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                {timeString}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans capitalize hidden sm:inline">
                ({dateString})
              </span>
            </div>
          </div>
        </div>

        {/* Khối giờ của đèn & Nút đồng bộ */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-200/60 dark:border-white/[0.06] flex-wrap">
          <div className="flex flex-col sm:items-end">
            <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-zinc-500 dark:text-zinc-400">
              Đồng Hồ Trên Đèn (C3)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {isConnected ? (
                tvalid === 1 && deviceClock && deviceClock !== '--:--:--' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {deviceClock} (Chuẩn)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    {deviceClock || '--:--:--'} (Chưa có giờ)
                  </span>
                )
              ) : (
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  Chưa kết nối
                </span>
              )}
            </div>
          </div>

          <button
            id="sync-time-btn"
            onClick={handleManualSyncTime}
            disabled={!isConnected || isSyncing}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 shrink-0 ${
              syncSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
            title="Đồng bộ mốc giờ UTC hiện tại và múi giờ từ điện thoại xuống đèn qua BLE"
          >
            {syncSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã Gửi Giờ!</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang Gửi...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đồng Bộ Giờ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CẢNH BÁO KHI ĐÈN CHƯA CÓ GIỜ CHUẨN (tvalid === 0) */}
      {isConnected && (tvalid === 0 || deviceClock === '--:--:--') && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-amber-800 dark:text-amber-300">
              Đèn chưa có giờ chuẩn (now: --:--:--)
            </div>
            <p className="leading-relaxed opacity-90">
              ESP32-C3 không có pin RTC lưu giờ khi ngắt nguồn. Hệ thống đang tự động gửi thời gian từ điện thoại sang đèn, hoặc bạn có thể bấm nút <strong>"Đồng Bộ Giờ"</strong> để lịch hẹn giờ bắt đầu chạy ngay.
            </p>
          </div>
          <button
            onClick={handleManualSyncTime}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shrink-0 cursor-pointer shadow-xs active:scale-95 text-[11px]"
          >
            Đồng bộ ngay
          </button>
        </div>
      )}

      {/* 2 NÚT NHẤN THÊM MỐC HẸN GIỜ: BẬT (ON) & TẮT (OFF) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* NÚT 1: HẸN GIỜ BẬT (ON) */}
        <button
          id="add-on-timer-btn"
          onClick={handleAddOnTimer}
          disabled={!isConnected}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-700 dark:text-emerald-300 font-bold transition-all shadow-sm hover:shadow-md hover:shadow-emerald-500/10 active:scale-98 disabled:opacity-40 cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm sm:text-base">
              <Plus className="w-4 h-4" />
              <span>Hẹn Giờ Bật (ON)</span>
            </div>
            <p className="text-xs font-normal text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              Tự động mở đèn sáng
            </p>
          </div>
        </button>

        {/* NÚT 2: HẸN GIỜ TẮT (OFF) */}
        <button
          id="add-off-timer-btn"
          onClick={handleAddOffTimer}
          disabled={!isConnected}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-rose-500/30 dark:border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/5 hover:from-rose-500/20 hover:to-pink-500/20 text-rose-700 dark:text-rose-300 font-bold transition-all shadow-sm hover:shadow-md hover:shadow-rose-500/10 active:scale-98 disabled:opacity-40 cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-xs shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm sm:text-base">
              <Plus className="w-4 h-4" />
              <span>Hẹn Giờ Tắt (OFF)</span>
            </div>
            <p className="text-xs font-normal text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Tự động tắt toàn bộ đèn
            </p>
          </div>
        </button>
      </div>

      {/* DANH SÁCH CÁC MỐC HẸN GIỜ ĐÃ THÊM */}
      {configuredSlots.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            <span>Danh Sách Mốc Hẹn Giờ ({configuredSlots.length})</span>
            <span className="text-[11px] text-zinc-400 font-normal">Nhấn nút trên để thêm mốc</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configuredSlots.map((slot) => {
              const isTurnOn = slot.act === 1;
              const isSlotEnabled = slot.en === 1;
              const timeStr = `${slot.h.toString().padStart(2, '0')}:${slot.m.toString().padStart(2, '0')}`;
              const preview = getFixtureColorCSS(slot.r, slot.g, slot.b, slot.cw, slot.bri, 1);
              const isAfternoon = slot.h >= 12;

              if (isTurnOn) {
                // ================= CARD MỐC HẸN GIỜ BẬT (ON) =================
                return (
                  <div
                    key={slot.idx}
                    className={`p-5 rounded-2xl border backdrop-blur-lg transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSlotEnabled && isMasterEnabled
                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/40 shadow-md shadow-emerald-500/5'
                        : 'bg-zinc-50/70 dark:bg-zinc-950/30 border-zinc-200/80 dark:border-white/[0.08] opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
                          <Sun className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                            Hẹn Giờ Bật (ON)
                          </span>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Tự động mở đèn sáng
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Nút Bật/Tắt mốc */}
                        <button
                          id={`toggle-slot-${slot.idx}-btn`}
                          onClick={() => onSaveSlot({ ...slot, en: isSlotEnabled ? 0 : 1 })}
                          disabled={!isConnected}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                            isSlotEnabled
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'backdrop-blur-md bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isSlotEnabled ? 'BẬT' : 'TẮT'}</span>
                        </button>

                        {/* Nút xóa mốc */}
                        <button
                          id={`delete-slot-${slot.idx}-btn`}
                          onClick={() => handleDeleteSlot(slot)}
                          disabled={!isConnected}
                          title="Xóa mốc hẹn giờ này"
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị Giờ BẬT & Lặp lại */}
                    <div className="py-2 flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                          {timeStr}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                          {isAfternoon ? 'Chiều / Tối' : 'Sáng'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          {formatDaysText(slot.days)}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {slot.scene === 1 ? `Độ sáng ${slot.bri}%` : 'Màu hiện tại'}
                        </span>
                      </div>
                    </div>

                    {/* Chi tiết kịch bản màu */}
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20"
                          style={{ backgroundColor: preview.cssColor }}
                        />
                        <span>Đỏ: {slot.r}% • Lá: {slot.g}% • Dương: {slot.b}% • Trắng: {slot.cw}%</span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                        Màu tự chọn
                      </span>
                    </div>

                    {/* Nút Chỉnh Sửa */}
                    <button
                      id={`edit-slot-${slot.idx}-btn`}
                      onClick={() => handleEditSlot(slot)}
                      disabled={!isConnected}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-40 active:scale-98"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Cài Đặt Giờ BẬT & Màu Sắc</span>
                    </button>
                  </div>
                );
              } else {
                // ================= CARD MỐC HẸN GIỜ TẮT (OFF) =================
                return (
                  <div
                    key={slot.idx}
                    className={`p-5 rounded-2xl border backdrop-blur-lg transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSlotEnabled && isMasterEnabled
                        ? 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/40 shadow-md shadow-rose-500/5'
                        : 'bg-zinc-50/70 dark:bg-zinc-950/30 border-zinc-200/80 dark:border-white/[0.08] opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500 text-white shadow-xs">
                          <Moon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                            Hẹn Giờ Tắt (OFF)
                          </span>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Tự động tắt toàn bộ đèn
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Nút Bật/Tắt mốc */}
                        <button
                          id={`toggle-slot-${slot.idx}-btn`}
                          onClick={() => onSaveSlot({ ...slot, en: isSlotEnabled ? 0 : 1 })}
                          disabled={!isConnected}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                            isSlotEnabled
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'backdrop-blur-md bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isSlotEnabled ? 'BẬT' : 'TẮT'}</span>
                        </button>

                        {/* Nút xóa mốc */}
                        <button
                          id={`delete-slot-${slot.idx}-btn`}
                          onClick={() => handleDeleteSlot(slot)}
                          disabled={!isConnected}
                          title="Xóa mốc hẹn giờ này"
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị Giờ TẮT & Lặp lại */}
                    <div className="py-2 flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                          {timeStr}
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase font-mono">
                          {isAfternoon ? 'Chiều / Tối' : 'Sáng'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          {formatDaysText(slot.days)}
                        </span>
                        <span className="text-[11px] text-rose-500 font-medium">
                          Tắt đèn hoàn toàn
                        </span>
                      </div>
                    </div>

                    {/* Chi tiết tắt */}
                    <div className="mt-2 pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span>Ngắt nguồn đèn tự động</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Chế độ ngủ
                      </span>
                    </div>

                    {/* Nút Chỉnh Sửa */}
                    <button
                      id={`edit-slot-${slot.idx}-btn`}
                      onClick={() => handleEditSlot(slot)}
                      disabled={!isConnected}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 active:scale-98"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Cài Đặt Giờ TẮT</span>
                    </button>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT THỜI GIAN (CHO MỐC BẬT HOẶC MỐC TẮT) */}
      {isModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg backdrop-blur-2xl bg-white/95 dark:bg-zinc-900/95 rounded-3xl border border-zinc-200/80 dark:border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden">
            {/* Header Modal */}
            <div
              className={`px-6 py-4.5 text-white flex items-center justify-between ${
                editingSlot.act === 1
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {editingSlot.act === 1 ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <div>
                  <h3 className="text-sm font-bold">
                    {editingSlot.act === 1 ? 'Cài Đặt Giờ BẬT Đèn (ON)' : 'Cài Đặt Giờ TẮT Đèn (OFF)'}
                  </h3>
                  <p className="text-xs opacity-90">
                    {editingSlot.act === 1
                      ? 'Thiết lập thời gian mở đèn, ngày lặp lại và kịch bản màu'
                      : 'Thiết lập thời gian tự động tắt đèn hoàn toàn'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Chọn Giờ & Phút (Số nguyên 24H) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                  Thời Gian Báo Thức (24 Giờ)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500 font-bold">Giờ:</span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      step="1"
                      value={editingSlot.h}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setDraftSlot({ ...editingSlot, h: Math.max(0, Math.min(23, val)) });
                        }
                      }}
                      className="w-full px-3 py-2 text-center text-xl font-mono font-black rounded-xl backdrop-blur-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <span className="text-2xl font-bold text-zinc-400">:</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500 font-bold">Phút:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={editingSlot.m}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setDraftSlot({ ...editingSlot, m: Math.max(0, Math.min(59, val)) });
                        }
                      }}
                      className="w-full px-3 py-2 text-center text-xl font-mono font-black rounded-xl backdrop-blur-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Lặp lại các thứ trong tuần */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                    Lặp Lại Trong Tuần
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setDraftSlot({ ...editingSlot, days: 127 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      Hằng ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftSlot({ ...editingSlot, days: 62 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      T2 - T6
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftSlot({ ...editingSlot, days: 65 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      T7, CN
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const isSelected = (editingSlot.days & d.mask) !== 0;
                    return (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => toggleDayInDraft(d.mask)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? editingSlot.act === 1
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'backdrop-blur-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tùy chỉnh màu & độ sáng khi Bật đèn */}
              {editingSlot.act === 1 && (
                <div className="p-4 rounded-2xl backdrop-blur-md bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-white/[0.08] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Áp Dụng Màu & Độ Sáng Khi Bật
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSlot({ ...editingSlot, scene: editingSlot.scene === 1 ? 0 : 1 })
                      }
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        editingSlot.scene === 1
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {editingSlot.scene === 1 ? 'BẬT MÀU' : 'GIỮ NGUYÊN'}
                    </button>
                  </div>

                  {editingSlot.scene === 1 && (
                    <div className="space-y-3 pt-2">
                      {currentColors && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                          <span className="text-zinc-600 dark:text-zinc-300 font-medium text-[11px]">
                            Lấy mẫu màu đang phát trên đèn:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDraftSlot({
                                ...editingSlot,
                                r: Math.round(currentColors.r),
                                g: Math.round(currentColors.g),
                                b: Math.round(currentColors.b),
                                cw: Math.round(currentColors.cw),
                                bri: Math.round(currentColors.bri),
                              });
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Màu Đèn Hiện Tại</span>
                          </button>
                        </div>
                      )}

                      {/* Độ sáng */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-amber-500 font-bold">Độ sáng tổng</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {editingSlot.bri}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editingSlot.bri}
                          onChange={(e) =>
                            setDraftSlot({ ...editingSlot, bri: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 rounded-lg accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* R */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-red-500 font-bold font-sans">Màu Đỏ</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {editingSlot.r}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editingSlot.r}
                          onChange={(e) =>
                            setDraftSlot({ ...editingSlot, r: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 rounded-lg accent-red-500 cursor-pointer"
                        />
                      </div>

                      {/* G */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-500 font-bold font-sans">Màu Xanh Lá</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {editingSlot.g}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editingSlot.g}
                          onChange={(e) =>
                            setDraftSlot({ ...editingSlot, g: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 rounded-lg accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* B */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-blue-500 font-bold font-sans">Màu Xanh Dương</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {editingSlot.b}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editingSlot.b}
                          onChange={(e) =>
                            setDraftSlot({ ...editingSlot, b: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 rounded-lg accent-blue-500 cursor-pointer"
                        />
                      </div>

                      {/* CW */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-800 dark:text-zinc-200 font-bold font-sans flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white border border-zinc-400 dark:border-zinc-300" />
                            Màu Trắng
                          </span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {editingSlot.cw}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editingSlot.cw}
                          onChange={(e) =>
                            setDraftSlot({ ...editingSlot, cw: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 rounded-lg accent-white cursor-pointer border border-zinc-300 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="save-slot-btn"
                type="button"
                onClick={handleSaveModal}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md active:scale-95 ${
                  editingSlot.act === 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-rose-600/25 hover:from-rose-500 hover:to-pink-500'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Lưu Vào Đèn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
