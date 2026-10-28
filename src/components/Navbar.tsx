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
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-white/70 dark:bg-[#07090e]/75 border-b border-zinc-200/70 dark:border-white/[0.08] transition-colors shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Tên App */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1.5px] flex items-center justify-center shadow-md shadow-cyan-500/10">
            <div className="w-full h-full bg-zinc-950/90 backdrop-blur-sm rounded-[10px] flex items-center justify-center">
              <Bluetooth className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                Cito <span className="text-cyan-500 dark:text-cyan-400">Smart Light</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md bg-zinc-100/90 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]">
                BLE & Wi-Fi
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden xs:block">
              Điều khiển đèn thông minh & Lập lịch
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
