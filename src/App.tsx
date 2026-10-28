/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LedState,
  ConnectionStatus,
  BleLogEntry,
  ScheduleData,
  ScheduleSlot,
  WifiStatus,
  MeshInfo,
  MeshLamp,
  ControlTarget,
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
import { LampGroupPanel } from './components/LampGroupPanel';
import { LampManagerModal } from './components/LampManagerModal';
import { ScheduleCopyBar } from './components/ScheduleCopyBar';
import {
  GroupNames,
  loadGroupNames,
  saveGroupNames,
  targetIncludesGateway,
  targetIncludesLamp,
  usedGroups,
} from './utils/meshUtils';

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

  // Nhiều đèn (chỉ firmware CitoLedMesh) - firmware cũ thì meshSupported = false
  const [meshSupported, setMeshSupported] = useState<boolean>(false);
  const [meshInfo, setMeshInfo] = useState<MeshInfo | null>(null);
  const [meshLamps, setMeshLamps] = useState<MeshLamp[]>([]);
  const [target, setTarget] = useState<ControlTarget>({ kind: 'self' });
  const [groupNames, setGroupNames] = useState<GroupNames>(() => loadGroupNames());
  const [manageLampId, setManageLampId] = useState<string | null>(null);

  // Đèn ảo để thử giao diện không cần phần cứng: ?mock=1 (firmware mới), ?mock=old (firmware cũ)
  useEffect(() => {
    const mock = new URLSearchParams(window.location.search).get('mock');
    if (mock) bleService.enableMockMode(true, mock === 'old');
  }, []);

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
    bleService.setMeshCallback((supported, info, lamps) => {
      setMeshSupported(supported);
      setMeshInfo(info);
      setMeshLamps(lamps);
      if (!supported) setTarget({ kind: 'self' });
    });
  }, []);

  // Trạng thái hiển thị trên slider / mô phỏng đèn:
  // - đích có đèn đang kết nối -> trạng thái TX của đèn đó (như cũ)
  // - đích chỉ gồm đèn khác    -> trạng thái đèn đầu tiên trong đích (từ danh sách mesh)
  const referenceLamp = useMemo(() => {
    if (!meshSupported || target.kind === 'self') return null;
    const inTarget = meshLamps.filter((l) => l.online === 1 && targetIncludesLamp(target, l));
    if (inTarget.length === 0 || inTarget.some((l) => l.isGateway === 1)) return null;
    return inTarget[0];
  }, [meshSupported, meshLamps, target]);

  const view: LedState = referenceLamp
    ? {
        ...state,
        power: referenceLamp.power,
        r: referenceLamp.r,
        g: referenceLamp.g,
        b: referenceLamp.b,
        cw: referenceLamp.cw,
        bri: referenceLamp.bri,
        tempC: referenceLamp.tempC ?? undefined,
        fanDuty: referenceLamp.fanDuty,
      }
    : state;

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
  }, []);

  // Ghi thay đổi vào state của đèn đang kết nối CHỈ khi đích có đèn đó;
  // các đèn khác được bleService cập nhật thẳng trong danh sách mesh.
  const patchView = (changes: Partial<LedState>) => {
    if (!meshSupported || targetIncludesGateway(target, meshLamps, meshInfo?.self)) {
      setState((prev) => ({ ...prev, ...changes }));
    }
  };

  const handleSetTarget = (next: ControlTarget) => {
    triggerHaptic();
    bleService.setTarget(next);
    setTarget(next);
  };

  const handleSaveGroupNames = (names: GroupNames) => {
    const cleaned: GroupNames = {};
    Object.entries(names).forEach(([k, v]) => {
      const t = (v || '').trim();
      if (t) cleaned[Number(k)] = t;
    });
    setGroupNames(cleaned);
    saveGroupNames(cleaned);
  };

  // Xử lý thay đổi Bật/Tắt nguồn (0 hoặc 1)
  const handlePowerChange = (power: number) => {
    triggerHaptic();
    patchView({ power });
    bleService.sendChanges({ power }, true);
  };

  // Xử lý thay đổi Độ sáng tổng thể (Số nguyên 0-100)
  const handleBrightnessChange = (bri: number) => {
    const intBri = Math.max(0, Math.min(100, Math.round(bri)));
    patchView({ bri: intBri });
    bleService.sendChanges({ bri: intBri });
  };

  // Xử lý bật tắt Gamma (0 hoặc 1)
  const handleGammaChange = (gamma: number) => {
    triggerHaptic();
    patchView({ gamma });
    bleService.sendChanges({ gamma }, true);
  };

  // Xử lý thay đổi từng kênh màu R, G, B, CW (Số nguyên 0-100)
  const handleChannelChange = (channel: 'r' | 'g' | 'b' | 'cw', value: number) => {
    const intVal = Math.max(0, Math.min(100, Math.round(value)));
    patchView({ [channel]: intVal });
    bleService.sendChanges({ [channel]: intVal });
  };

  // Đặt tất cả các kênh về cùng một giá trị (ví dụ: Mặc định 90%)
  const handleSetAllChannels = (value: number) => {
    triggerHaptic();
    const intVal = Math.max(0, Math.min(100, Math.round(value)));
    patchView({ r: intVal, g: intVal, b: intVal, cw: intVal, power: 1 });
    bleService.sendChanges({ r: intVal, g: intVal, b: intVal, cw: intVal, power: 1 }, true);
  };

  // Đặt màu tổng hợp R, G, B, CW cùng lúc (chọn từ dải màu hoặc mã Hex)
  const handleSetRgbCw = (r: number, g: number, b: number, cw?: number) => {
    triggerHaptic();
    const rVal = Math.max(0, Math.min(100, Math.round(r)));
    const gVal = Math.max(0, Math.min(100, Math.round(g)));
    const bVal = Math.max(0, Math.min(100, Math.round(b)));
    const cwVal = cw !== undefined ? Math.max(0, Math.min(100, Math.round(cw))) : view.cw;

    patchView({ r: rVal, g: gVal, b: bVal, cw: cwVal, power: 1 });
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

        {/* Danh Sách Đèn & Chọn Đích Điều Khiển (chỉ firmware CitoLedMesh) */}
        <LampGroupPanel
          isConnected={isConnected}
          meshSupported={meshSupported}
          info={meshInfo}
          lamps={meshLamps}
          target={target}
          groupNames={groupNames}
          onSetTarget={handleSetTarget}
          onRefresh={() => bleService.meshPing()}
          onManageLamp={(id) => setManageLampId(id)}
        />

        {/* Khung Hiển Thị Mô Phỏng Quang Học Màu Sắc Thực Tế Của Đèn */}
        <FixtureVisualizer
          power={view.power}
          r={view.r}
          g={view.g}
          b={view.b}
          cw={view.cw}
          bri={view.bri}
          tempC={view.tempC}
          fanDuty={view.fanDuty}
          onTogglePower={() => handlePowerChange(view.power === 1 ? 0 : 1)}
        />

        {/* Điều Chỉnh Màu Sắc Đèn R, G, B, CW (Số Nguyên 0-100%) & Bật/Tắt Nguồn */}
        <ChannelSliders
          r={view.r}
          g={view.g}
          b={view.b}
          cw={view.cw}
          power={view.power}
          onChannelChange={handleChannelChange}
          onSetAllChannels={handleSetAllChannels}
          onSetRgbCw={handleSetRgbCw}
          onTogglePower={() => handlePowerChange(view.power === 1 ? 0 : 1)}
        />

        {/* Quản Lý Lập Lịch Hẹn Giờ Bật/Tắt Tự Động (Thêm Mốc ON / OFF linh hoạt) */}
        <ScheduleManager
          scheduleData={scheduleData}
          isConnected={isConnected}
          tvalid={state.tvalid}
          deviceClock={state.now}
          currentColors={{
            r: view.r,
            g: view.g,
            b: view.b,
            cw: view.cw,
            bri: view.bri,
          }}
          onSyncTime={handleSyncTime}
          onToggleMasterSchedule={handleToggleScheduleMaster}
          onSaveSlot={handleSaveScheduleSlot}
          onRefreshSchedule={handleRefreshSchedule}
        />

        {/* Chép lịch của đèn đang kết nối sang các đèn khác (chỉ khi có từ 2 đèn) */}
        {isConnected && meshSupported && meshLamps.length > 1 && (
          <ScheduleCopyBar
            scheduleData={scheduleData}
            groups={usedGroups(meshLamps)}
            groupNames={groupNames}
            onCopy={(to) => (scheduleData ? bleService.meshCopySchedule(to, scheduleData) : Promise.resolve())}
          />
        )}

        {/* Cảm Biến Nhiệt Khung Nhôm & Quạt Tản Nhiệt Thời Gian Thực */}
        <TelemetryGauges
          tempC={view.tempC}
          fanDuty={view.fanDuty}
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

      {/* Quản Lý Từng Đèn: Tên, Nhóm, Nháy Nhận Diện, Tuỳ Chọn Cả Khu */}
      <LampManagerModal
        lamp={meshLamps.find((l) => l.id === manageLampId) ?? null}
        info={meshInfo}
        groupNames={groupNames}
        onClose={() => setManageLampId(null)}
        onRename={(id, name) => bleService.meshRename(id, name)}
        onSetGroup={(id, group) => bleService.meshSetGroup(id, group)}
        onIdentify={(id) => bleService.meshIdentify(id)}
        onSaveGroupNames={handleSaveGroupNames}
        onSetAreaOption={(key, value) => bleService.meshSetAreaOption(key, value)}
        onSetNet={(net) => bleService.meshSetNet(net)}
      />

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
