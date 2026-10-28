/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import {
  LedState,
  ConnectionStatus,
  BleLogEntry,
  ScheduleData,
  ScheduleSlot,
  WifiStatus,
} from './types';
import { bleService } from './services/bleService';
import { useTheme } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { FixtureVisualizer } from './components/FixtureVisualizer';
import { ChannelSliders } from './components/ChannelSliders';
import { ScheduleManager } from './components/ScheduleManager';
import { WifiConfigManager } from './components/WifiConfigManager';
import { TelemetryGauges } from './components/TelemetryGauges';
import { LiveConsole } from './components/LiveConsole';
import { IosGuideModal } from './components/IosGuideModal';
import { ConnectionBanner } from './components/ConnectionBanner';

export default function App() {
  const { themeMode, toggleTheme } = useTheme();

  // Trạng thái đèn LED (các giá trị số nguyên 0-100%)
  const [state, setState] = useState<LedState>({
    power: 1,
    r: 80,
    g: 50,
    b: 10,
    cw: 0,
    bri: 100,
    fade: 400,
    gamma: 1,
    tempC: 32.5,
    fanDuty: 0,
  });

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<BleLogEntry[]>([]);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  // Thiết lập các hàm lắng nghe từ BLE Service
  useEffect(() => {
    bleService.setCallbacks(
      (notifiedState) => {
        setState((prev) => ({
          ...prev,
          ...notifiedState,
          r: notifiedState.r !== undefined ? Math.round(notifiedState.r) : prev.r,
          g: notifiedState.g !== undefined ? Math.round(notifiedState.g) : prev.g,
          b: notifiedState.b !== undefined ? Math.round(notifiedState.b) : prev.b,
          cw: notifiedState.cw !== undefined ? Math.round(notifiedState.cw) : prev.cw,
          bri: notifiedState.bri !== undefined ? Math.round(notifiedState.bri) : prev.bri,
          fanDuty: notifiedState.fanDuty !== undefined ? Math.round(notifiedState.fanDuty) : prev.fanDuty,
        }));
      },
      (status, errorMsg) => {
        setConnectionStatus(status);
        if (errorMsg) {
          setErrorMessage(errorMsg);
        } else if (status === 'connected') {
          setErrorMessage('');
        }
      },
      (logEntry) => {
        setLogs((prev) => [...prev.slice(-100), logEntry]);
      },
      (sched) => {
        setScheduleData(sched);
      },
      (wifi) => {
        setWifiStatus(wifi);
      }
    );
  }, []);

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
  }, []);

  // Xử lý thay đổi Bật/Tắt nguồn (0 hoặc 1)
  const handlePowerChange = (power: number) => {
    triggerHaptic();
    setState((prev) => ({ ...prev, power }));
    bleService.sendChanges({ power }, true);
  };

  // Xử lý thay đổi Độ sáng tổng thể (Số nguyên 0-100)
  const handleBrightnessChange = (bri: number) => {
    const intBri = Math.max(0, Math.min(100, Math.round(bri)));
    setState((prev) => ({ ...prev, bri: intBri }));
    bleService.sendChanges({ bri: intBri });
  };

  // Xử lý bật tắt Gamma (0 hoặc 1)
  const handleGammaChange = (gamma: number) => {
    triggerHaptic();
    setState((prev) => ({ ...prev, gamma }));
    bleService.sendChanges({ gamma }, true);
  };

  // Xử lý thay đổi từng kênh màu R, G, B, CW (Số nguyên 0-100)
  const handleChannelChange = (channel: 'r' | 'g' | 'b' | 'cw', value: number) => {
    const intVal = Math.max(0, Math.min(100, Math.round(value)));
    setState((prev) => ({ ...prev, [channel]: intVal }));
    bleService.sendChanges({ [channel]: intVal });
  };

  // Đặt tất cả các kênh về cùng một giá trị (ví dụ: Mặc định 90%)
  const handleSetAllChannels = (value: number) => {
    triggerHaptic();
    const intVal = Math.max(0, Math.min(100, Math.round(value)));
    setState((prev) => ({
      ...prev,
      r: intVal,
      g: intVal,
      b: intVal,
      cw: intVal,
      power: 1,
    }));
    bleService.sendChanges({ r: intVal, g: intVal, b: intVal, cw: intVal, power: 1 }, true);
  };

  // Đặt màu tổng hợp R, G, B, CW cùng lúc (chọn từ dải màu hoặc mã Hex)
  const handleSetRgbCw = (r: number, g: number, b: number, cw?: number) => {
    triggerHaptic();
    const rVal = Math.max(0, Math.min(100, Math.round(r)));
    const gVal = Math.max(0, Math.min(100, Math.round(g)));
    const bVal = Math.max(0, Math.min(100, Math.round(b)));
    const cwVal = cw !== undefined ? Math.max(0, Math.min(100, Math.round(cw))) : state.cw;

    setState((prev) => ({
      ...prev,
      r: rVal,
      g: gVal,
      b: bVal,
      cw: cwVal,
      power: 1,
    }));
    bleService.sendChanges({ r: rVal, g: gVal, b: bVal, cw: cwVal, power: 1 }, true);
  };

  // Xử lý Lập lịch hẹn giờ bật/tắt (SCHED characteristic)
  const handleToggleScheduleMaster = (enabled: boolean) => {
    triggerHaptic();
    bleService.setScheduleEnabled(enabled);
  };

  const handleSaveScheduleSlot = (slot: ScheduleSlot) => {
    triggerHaptic();
    bleService.saveScheduleSlot(slot);
  };

  const handleRefreshSchedule = () => {
    bleService.readSchedule();
  };

  const handleSyncTime = async () => {
    triggerHaptic();
    await bleService.syncDeviceTime(true);
  };

  // Xử lý Mạng Wi-Fi (WIFI characteristic)
  const handleScanWifi = () => {
    triggerHaptic();
    bleService.startWifiScan();
  };

  const handleConnectWifi = (ssid: string, pass: string) => {
    triggerHaptic();
    bleService.connectWifi(ssid, pass);
  };

  const handleRefreshWifiStatus = () => {
    bleService.readWifiStatus();
  };

  // Chuyển đổi theme Sáng (Ban ngày) / Tối (Ban đêm)
  const handleToggleTheme = () => {
    triggerHaptic();
    toggleTheme();
  };

  // Kết nối / Ngắt kết nối BLE
  const handleConnect = (scanAll: boolean = true) => {
    setErrorMessage('');
    bleService.connect(scanAll);
  };

  const handleDisconnect = () => {
    bleService.disconnect();
  };

  const handleSendRaw = (cmd: string) => {
    bleService.sendRawCommand(cmd);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-[#07090e] text-zinc-900 dark:text-zinc-100 antialiased font-sans transition-colors duration-300 selection:bg-cyan-500/30">
      {/* Hiệu ứng ánh sáng nền mờ Frosted Glass */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/15 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Thanh Điều Hướng Trên Cùng */}
      <Navbar
        status={connectionStatus}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onOpenIosGuide={() => setShowIosGuide(true)}
      />

      {/* Khung Nội Dung Chính */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner Thông Báo Kết Nối & Khởi Động Lại */}
        <ConnectionBanner
          status={connectionStatus}
          errorMessage={errorMessage}
          onConnect={handleConnect}
          onDismissError={() => setErrorMessage('')}
        />

        {/* Khung Hiển Thị Mô Phỏng Quang Học Màu Sắc Thực Tế Của Đèn */}
        <FixtureVisualizer
          power={state.power}
          r={state.r}
          g={state.g}
          b={state.b}
          cw={state.cw}
          bri={state.bri}
          tempC={state.tempC}
          fanDuty={state.fanDuty}
          onTogglePower={() => handlePowerChange(state.power === 1 ? 0 : 1)}
        />

        {/* Điều Chỉnh Màu Sắc Đèn R, G, B, CW (Số Nguyên 0-100%) & Bật/Tắt Nguồn */}
        <ChannelSliders
          r={state.r}
          g={state.g}
          b={state.b}
          cw={state.cw}
          power={state.power}
          onChannelChange={handleChannelChange}
          onSetAllChannels={handleSetAllChannels}
          onSetRgbCw={handleSetRgbCw}
          onTogglePower={() => handlePowerChange(state.power === 1 ? 0 : 1)}
        />

        {/* Quản Lý Lập Lịch Hẹn Giờ Bật/Tắt Tự Động (Thêm Mốc ON / OFF linh hoạt) */}
        <ScheduleManager
          scheduleData={scheduleData}
          isConnected={isConnected}
          tvalid={state.tvalid}
          deviceClock={state.now}
          currentColors={{
            r: state.r,
            g: state.g,
            b: state.b,
            cw: state.cw,
            bri: state.bri,
          }}
          onSyncTime={handleSyncTime}
          onToggleMasterSchedule={handleToggleScheduleMaster}
          onSaveSlot={handleSaveScheduleSlot}
          onRefreshSchedule={handleRefreshSchedule}
        />

        {/* Cảm Biến Nhiệt Khung Nhôm & Quạt Tản Nhiệt Thời Gian Thực */}
        <TelemetryGauges
          tempC={state.tempC}
          fanDuty={state.fanDuty}
          isConnected={isConnected}
        />

        {/* Cấu Hình Wi-Fi (Cập Nhật Thời Gian NTP) */}
        <WifiConfigManager
          wifiStatus={wifiStatus}
          isConnected={isConnected}
          onScanWifi={handleScanWifi}
          onConnectWifi={handleConnectWifi}
          onRefreshWifiStatus={handleRefreshWifiStatus}
        />

        {/* Cửa Sổ Dòng Lệnh Giao Thức BLE & Kiểm Tra Gói Tin */}
        <LiveConsole
          logs={logs}
          isConnected={isConnected}
          onSendRaw={handleSendRaw}
          onClearLogs={handleClearLogs}
        />
      </main>

      {/* Cửa Sổ Hướng Dẫn Kết Nối iOS / Android */}
      <IosGuideModal isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />

      {/* Chân Trang */}
      <footer className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/80 dark:border-white/[0.08] mt-12 font-mono">
        <p>Cito Smart Light &bull; Điều Khiển Trực Tiếp Bluetooth Low Energy</p>
        <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          UUID: 6e400001-b5a3-f393-e0a9-e50e24dcca9e &bull; Hoạt động ngoại tuyến qua Bluetooth Low Energy
        </p>
      </footer>
    </div>
  );
}
