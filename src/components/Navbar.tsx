import { Bluetooth, BluetoothConnected, BluetoothOff, BluetoothSearching, Moon, Sun, Smartphone, RefreshCw } from 'lucide-react';
import { ConnectionStatus, ThemeMode } from '../types';

interface NavbarProps {
  status: ConnectionStatus;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onConnect: (scanAll?: boolean) => void;
  onDisconnect: () => void;
  onOpenIosGuide: () => void;
}

export function Navbar({
  status,
  themeMode,
  onToggleTheme,
  onConnect,
  onDisconnect,
  onOpenIosGuide,
}: NavbarProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Đã Kết Nối</span>
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Đang nối lại...</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Đang kết nối...</span>
          </div>
        );
      case 'scanning':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <BluetoothSearching className="w-3 h-3 animate-pulse" />
            <span>Đang quét tìm...</span>
          </div>
        );
      case 'disconnecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
            <span>Đang ngắt...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Lỗi kết nối</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-zinc-100/80 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
            <span>Chưa kết nối</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-white/80 dark:bg-[#07090e]/80 border-b border-zinc-200/80 dark:border-white/[0.08] transition-colors shadow-sm">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-17 sm:h-20 flex items-center justify-between">
        {/* Logo & Tên App */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="relative group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 p-[1.5px] flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/35 transition-all">
              <div className="w-full h-full bg-zinc-950/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-[14px] flex items-center justify-center">
                <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            {/* Vòng sáng nhẹ uyển chuyển */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 blur-sm pointer-events-none -z-10 group-hover:opacity-40 transition-opacity"></div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="font-brand text-xl sm:text-2xl md:text-[1.7rem] font-black tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(6,182,212,0.15)] dark:drop-shadow-[0_2px_16px_rgba(34,211,238,0.25)] flex items-center">
                <span className="text-zinc-900 dark:text-white font-extrabold tracking-tight mr-1.5 sm:mr-2">
                  Cito
                </span>
                <span className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 dark:from-cyan-300 dark:via-teal-200 dark:to-sky-400 bg-clip-text text-transparent font-extrabold tracking-tight">
                  Smart Light
                </span>
                <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-400 dark:bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85)] animate-pulse ml-1.5"></span>
              </h1>
              <span className="hidden md:inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 shadow-xs">
                BLE & Wi-Fi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wide flex items-center gap-1.5 mt-1">
              <span className="hidden xs:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
              <span>Điều khiển đèn thông minh & Lập lịch quang chu kỳ</span>
            </p>
          </div>
        </div>

        {/* Nút thao tác & Trạng thái */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Huy hiệu trạng thái */}
          {getStatusBadge()}

          {/* Nút Kết nối / Ngắt kết nối */}
          {status === 'connected' ? (
            <button
              id="ble-disconnect-btn"
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 backdrop-blur-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <BluetoothOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ngắt Kết Nối</span>
            </button>
          ) : (
            <button
              id="ble-connect-btn"
              onClick={() => onConnect(true)}
              disabled={status === 'connecting' || status === 'scanning'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <BluetoothConnected className="w-3.5 h-3.5" />
              <span>Kết Nối</span>
            </button>
          )}

          <div className="h-5 w-px bg-zinc-200/80 dark:bg-white/[0.1] mx-0.5 hidden sm:block"></div>

          {/* Hướng dẫn iOS */}
          <button
            id="ios-guide-btn"
            onClick={onOpenIosGuide}
            title="Hướng dẫn kết nối trên iPhone / iPad (iOS)"
            className="p-2 rounded-xl text-xs font-medium backdrop-blur-md bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Chuyển Giao Diện Sáng / Tối (Ban Ngày / Ban Đêm) */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            title={themeMode === 'dark' ? 'Đang ở chế độ Ban đêm (Dark) - Nhấn để chuyển sang Ban ngày' : 'Đang ở chế độ Ban ngày (Light) - Nhấn để chuyển sang Ban đêm'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.1] transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            {themeMode === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                <span className="hidden md:inline text-[11px] font-semibold text-cyan-300">Tối</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span className="hidden md:inline text-[11px] font-semibold text-amber-600">Sáng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
