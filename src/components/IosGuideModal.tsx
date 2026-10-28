import { useState } from 'react';
import { Smartphone, Check, Copy, X, ShieldAlert } from 'lucide-react';

interface IosGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IosGuideModal({ isOpen, onClose }: IosGuideModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg backdrop-blur-2xl bg-white/90 dark:bg-zinc-900/90 rounded-3xl border border-zinc-200/80 dark:border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden transition-colors">
        {/* Tiêu đề Modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Hướng Dẫn Kết Nối Trên iOS & Android</h3>
              <p className="text-xs text-cyan-100">Điều khiển đèn Cito Smart Light qua Bluetooth Web BLE</p>
            </div>
          </div>
          <button
            id="close-ios-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung Hướng dẫn */}
        <div className="p-6 space-y-5 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed">
          {/* Chú ý cho iOS Safari */}
          <div className="p-4 rounded-2xl backdrop-blur-md bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs mb-1">Lưu ý cho người dùng iPhone / iPad (iOS):</p>
              <p className="text-[11px] leading-normal opacity-90">
                Trình duyệt Safari mặc định của Apple khóa tính năng Web Bluetooth. Để kết nối trực tiếp với đèn Cito Smart Light mà không cần máy chủ trung gian, bạn chỉ cần mở qua ứng dụng duyệt web BLE miễn phí.
              </p>
            </div>
          </div>

          {/* 3 Bước trên iPhone / iPad */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              3 Bước Đơn Giản Trên iPhone / iPad:
            </h4>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl backdrop-blur-md bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08]">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                1
              </span>
              <div>
                <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Cài ứng dụng "Bluefy – Web BLE Browser"
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Tải miễn phí từ App Store (hỗ trợ Web Bluetooth nguyên bản cho iOS).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl backdrop-blur-md bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08]">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                2
              </span>
              <div className="flex-1">
                <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Sao chép và dán địa chỉ Web này vào Bluefy
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl backdrop-blur-md bg-white/90 dark:bg-zinc-950/80 border border-zinc-300 dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 truncate select-all"
                  />
                  <button
                    id="copy-app-url-btn"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl backdrop-blur-md bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08]">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                3
              </span>
              <div>
                <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Bấm "Kết Nối" & Chọn thiết bị "CitoLedSmart"
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Cửa sổ Bluetooth sẽ xuất hiện và ghép nối trực tiếp với đèn ngay lập tức.
                </p>
              </div>
            </div>
          </div>

          {/* Ghi chú Android & Máy tính */}
          <div className="p-3.5 rounded-2xl backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/[0.06] text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5">
            <div>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Android:</span> Hoạt động trực tiếp trên <strong>Google Chrome</strong>. Lưu ý: Cần <strong>BẬT VỊ TRÍ (GPS/Location)</strong> trên điện thoại thì Android mới cho phép trình duyệt quét Bluetooth LE.
            </div>
            <div>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Windows & MacOS:</span> Hoạt động trực tiếp trên Google Chrome, Microsoft Edge hoặc Opera.
            </div>
          </div>
        </div>

        {/* Chân Modal */}
        <div className="px-6 py-4 backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-200/80 dark:border-white/[0.08] flex justify-end">
          <button
            id="close-ios-modal-bottom-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Đã Hiểu, Bắt Đầu Điều Khiển
          </button>
        </div>
      </div>
    </div>
  );
}
