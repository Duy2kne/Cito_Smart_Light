import { useState, FormEvent } from 'react';
import { WifiStatus, RawWifiNetwork } from '../types';
import {
  Wifi,
  Radio,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react';

interface WifiConfigManagerProps {
  wifiStatus: WifiStatus | null;
  isConnected: boolean;
  onScanWifi: () => void;
  onConnectWifi: (ssid: string, pass: string) => void;
  onRefreshWifiStatus: () => void;
}

export function WifiConfigManager({
  wifiStatus,
  isConnected,
  onScanWifi,
  onConnectWifi,
  onRefreshWifiStatus,
}: WifiConfigManagerProps) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isScanning = wifiStatus?.scanning === 1;
  const isWifiConnected = wifiStatus?.connected === 1;
  const currentIp = wifiStatus?.ip;
  const savedSsid = wifiStatus?.savedSsid;
  const networks: RawWifiNetwork[] = wifiStatus?.networks || [];

  const handleSelectNetwork = (netSsid: string) => {
    setSsid(netSsid);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!ssid.trim()) return;
    onConnectWifi(ssid.trim(), password);
  };

  const getSignalIcon = (rssi: number) => {
    if (rssi >= -55) return <SignalHigh className="w-4 h-4 text-emerald-500" />;
    if (rssi >= -75) return <SignalMedium className="w-4 h-4 text-amber-500" />;
    return <SignalLow className="w-4 h-4 text-rose-500" />;
  };

  const getSignalText = (rssi: number) => {
    if (rssi >= -55) return 'Sóng rất mạnh';
    if (rssi >= -75) return 'Sóng ổn định';
    return 'Sóng yếu';
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cyan-500" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Cấu Hình Wi-Fi (Cập Nhật Thời Gian NTP)
            </h2>
            {isWifiConnected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                ĐÃ VÀO MẠNG
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]">
                CHƯA KẾT NỐI
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Kết nối đèn vào mạng Wi-Fi để tự động đồng bộ thời gian thực chuẩn xác qua Internet (NTP), đảm bảo lịch hẹn giờ tự động chạy chính xác.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-wifi-status-btn"
            onClick={onRefreshWifiStatus}
            disabled={!isConnected}
            title="Đọc lại trạng thái Wi-Fi từ đèn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer disabled:opacity-40 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            id="scan-wifi-btn"
            onClick={onScanWifi}
            disabled={!isConnected || isScanning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-xs active:scale-95 ${
              isScanning
                ? 'bg-amber-600 cursor-not-allowed opacity-80'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 shadow-cyan-600/25'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Đang Quét Sóng...' : 'Quét Mạng Wi-Fi'}</span>
          </button>
        </div>
      </div>

      {/* THÔNG TIN TRẠNG THÁI KẾT NỐI WI-FI VÀ ĐỒNG BỘ GIỜ NTP */}
      {isWifiConnected && (
        <div className="p-3.5 sm:p-4 rounded-xl backdrop-blur-md bg-emerald-500/10 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              Đèn đã kết nối Wi-Fi <strong>{savedSsid || 'gia đình'}</strong> &bull; Sẵn sàng đồng bộ giờ NTP tự động qua Internet
            </span>
          </div>
          {currentIp && currentIp !== '0.0.0.0' && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              IP: {currentIp}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* DANH SÁCH MẠNG QUÉT ĐƯỢC */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 text-cyan-500" />
              Mạng Wi-Fi Quét Được ({networks.length})
            </span>
            {isScanning && (
              <span className="text-[11px] font-mono text-amber-500 animate-pulse font-semibold">
                Đang quét sóng...
              </span>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] p-2 bg-zinc-50/50 dark:bg-zinc-950/40">
            {networks.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-xs space-y-2">
                <Radio className="w-8 h-8 mx-auto opacity-30 text-zinc-500" />
                <p>Chưa có danh sách mạng Wi-Fi.</p>
                <p className="text-[11px] text-zinc-500">
                  Nhấn nút "Quét Mạng Wi-Fi" ở góc phải để tìm các router 2.4GHz gần đèn.
                </p>
              </div>
            ) : (
              networks.map(([netSsid, rssi, secured], index) => {
                const isSelected = ssid === netSsid;
                return (
                  <button
                    key={`${netSsid}-${index}`}
                    type="button"
                    onClick={() => handleSelectNetwork(netSsid)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/30'
                        : 'bg-white/70 dark:bg-zinc-900/60 border-zinc-200/60 dark:border-white/[0.05] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {getSignalIcon(rssi)}
                      <div>
                        <p className="text-xs font-bold truncate max-w-[170px] sm:max-w-[220px]">
                          {netSsid}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {rssi} dBm • {getSignalText(rssi)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      {secured === 1 ? (
                        <span className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500" title="Mạng có mật khẩu">
                          <Lock className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500" title="Mạng mở">
                          <Unlock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* FORM NHẬP MẬT KHẨU & KẾT NỐI */}
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Cài Đặt Thông Tin Mạng Wi-Fi
          </span>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Tên Wi-Fi (SSID) */}
            <div className="space-y-1">
              <label htmlFor="wifi-ssid-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Tên Mạng Wi-Fi (SSID 2.4GHz):
              </label>
              <input
                id="wifi-ssid-input"
                type="text"
                required
                placeholder="Chọn từ danh sách hoặc nhập tên..."
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl backdrop-blur-md bg-zinc-50/90 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/[0.1] focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Mật khẩu Wi-Fi */}
            <div className="space-y-1">
              <label htmlFor="wifi-pass-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Mật Khẩu Wi-Fi:
              </label>
              <div className="relative">
                <input
                  id="wifi-pass-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu Wi-Fi (nếu có)..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pr-10 text-xs font-mono rounded-xl backdrop-blur-md bg-zinc-50/90 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/[0.1] focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Lưu ý khi kết nối */}
            <div className="p-3 rounded-xl backdrop-blur-md bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <span>
                Lưu ý: Sau khi lưu cấu hình, chip đèn sẽ khởi động lại trong 3-4 giây để kết nối Wi-Fi. Kết nối Bluetooth sẽ tự phục hồi sau đó.
              </span>
            </div>

            {/* Nút gửi kết nối */}
            <button
              id="save-wifi-connect-btn"
              type="submit"
              disabled={!isConnected || !ssid.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-cyan-600/25 active:scale-98"
            >
              <Wifi className="w-4 h-4" />
              <span>Lưu & Kết Nối Vào Đèn</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
