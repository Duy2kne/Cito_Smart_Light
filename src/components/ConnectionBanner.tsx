import { AlertCircle, Bluetooth, RefreshCw, X, HelpCircle, Radio, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ConnectionStatus } from '../types';

interface ConnectionBannerProps {
  status: ConnectionStatus;
  errorMessage?: string;
  onConnect: (scanAll?: boolean) => void;
  onDismissError: () => void;
}

export function ConnectionBanner({
  status,
  errorMessage,
  onConnect,
  onDismissError,
}: ConnectionBannerProps) {
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  if (status === 'reconnecting') {
    return (
      <div className="rounded-2xl p-4 sm:p-5 backdrop-blur-xl bg-cyan-500/10 dark:bg-cyan-950/30 border border-cyan-500/30 text-cyan-900 dark:text-cyan-200 flex items-center justify-between gap-4 shadow-lg shadow-cyan-950/5 animate-in fade-in">
        <div className="flex items-center gap-3.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-700 dark:text-cyan-300">
              Đang Khởi Động Lại & Nối Lại BLE...
            </h4>
            <p className="text-xs leading-relaxed opacity-90 max-w-2xl mt-0.5">
              {errorMessage || 'Đèn đang áp dụng cấu hình và kết nối Wi-Fi. Ứng dụng sẽ tự động kết nối lại.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl p-4 sm:p-5 backdrop-blur-xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex flex-col gap-3 shadow-lg shadow-rose-950/5 animate-in fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-rose-700 dark:text-rose-300">
                Lỗi Kết Nối Bluetooth
              </h4>
              <p className="text-xs leading-relaxed opacity-90 max-w-2xl">
                {errorMessage || 'Không thể thiết lập kết nối Bluetooth Low Energy với đèn Cito Smart Light.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="retry-connect-all-btn"
                  onClick={() => onConnect(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-all cursor-pointer shadow-md shadow-rose-600/25 active:scale-95 flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Quét Tất Cả Thiết Bị BLE</span>
                </button>
                <button
                  id="retry-connect-filter-btn"
                  onClick={() => onConnect(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-200 transition-all cursor-pointer border border-rose-500/30 active:scale-95"
                >
                  Quét Lọc Theo Tên Cito
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onDismissError}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (status === 'idle') {
    return (
      <div className="rounded-2xl p-4 sm:p-5 backdrop-blur-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 dark:from-cyan-950/40 dark:via-blue-950/30 dark:to-indigo-950/40 border border-cyan-500/30 dark:border-cyan-400/20 text-zinc-800 dark:text-zinc-200 flex flex-col gap-4 shadow-lg shadow-cyan-950/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl backdrop-blur-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-xs">
              <Bluetooth className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Sẵn Sàng Kết Nối Cito Smart Light</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                  BLE Trực Tiếp
                </span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Quét và ghép nối trực tiếp với đèn thông minh của bạn qua Bluetooth trình duyệt.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Nút Quét Tất Cả Thiết Bị BLE (Khuyên Dùng) */}
            <button
              id="banner-connect-all-btn"
              onClick={() => onConnect(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer shadow-md shadow-cyan-500/25 active:scale-95"
              title="Quét và hiển thị tất cả thiết bị Bluetooth xung quanh (không ẩn thiết bị)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Quét Tất Cả Thiết Bị BLE</span>
            </button>

            {/* Nút Quét Lọc Cito */}
            <button
              id="banner-connect-filter-btn"
              onClick={() => onConnect(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md bg-white/70 hover:bg-white/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer border border-zinc-200/80 dark:border-white/[0.08] active:scale-95"
              title="Chỉ tìm các thiết bị có tên Cito Smart Light"
            >
              <Bluetooth className="w-3.5 h-3.5 text-cyan-500" />
              <span>Lọc Tên Cito</span>
            </button>

            {/* Nút mở Trợ Giúp Quét */}
            <button
              id="toggle-troubleshoot-btn"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showTroubleshoot
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-600 dark:text-cyan-400'
                  : 'bg-white/50 dark:bg-white/[0.04] border-zinc-200/80 dark:border-white/[0.08] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Xem hướng dẫn khắc phục khi không thấy thiết bị"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Khung giải thích lý do không quét thấy thiết bị */}
        {showTroubleshoot && (
          <div className="pt-3 border-t border-cyan-500/20 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vì sao điện thoại quét thấy nhiều mà trên Web không thấy?</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-300 pl-1 text-[11px] leading-relaxed">
              <li>
                <strong>Bộ lọc thiết bị:</strong> Trình duyệt web có cơ chế bảo mật lọc thiết bị. Nếu chọn <strong>"Quét Tất Cả Thiết Bị BLE"</strong>, trình duyệt sẽ hiển thị toàn bộ thiết bị xung quanh như các app BLE Scanner trên điện thoại.
              </li>
              <li>
                <strong>Điện thoại Android:</strong> Hãy chắc chắn bạn đã <strong>BẬT VỊ TRÍ (GPS/Location)</strong> trên điện thoại. Android yêu cầu quyền Vị Trí thì trình duyệt mới được quét Bluetooth LE.
              </li>
              <li>
                <strong>iPhone / iPad (iOS):</strong> Trình duyệt Safari không hỗ trợ Web Bluetooth. Vui lòng mở trang web này trong ứng dụng <strong>Bluefy</strong> (tải miễn phí trên App Store).
              </li>
              <li>
                <strong>Đèn đang bị kết nối bởi app khác:</strong> Đèn thông minh chỉ cho phép 1 kết nối cùng lúc. Nếu bạn đang mở app BLE Scanner / nRF Connect khác và đã bấm "Connect", hãy ngắt kết nối ở app đó để đèn phát sóng lại.
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}

