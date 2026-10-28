import { useEffect, useState, type ReactNode } from 'react';
import {
  Lightbulb,
  Layers,
  RefreshCw,
  Settings2,
  Check,
  AlertTriangle,
  Loader2,
  Radio,
  WifiOff,
  Info,
} from 'lucide-react';
import { ControlTarget, MeshInfo, MeshLamp } from '../types';
import {
  GroupNames,
  groupLabel,
  lampDisplayName,
  rssiLevel,
  sameTarget,
  targetIncludesLamp,
  usedGroups,
} from '../utils/meshUtils';
import { getFixtureColorCSS } from '../utils/colorUtils';

interface LampGroupPanelProps {
  isConnected: boolean;
  meshSupported: boolean;
  info: MeshInfo | null;
  lamps: MeshLamp[];
  target: ControlTarget;
  groupNames: GroupNames;
  onSetTarget: (target: ControlTarget) => void;
  onRefresh: () => void;
  onManageLamp: (id: string) => void;
}

const ACK_OK_VISIBLE_MS = 3000;

function SignalBars({ rssi, hops }: { rssi: number; hops: number }) {
  const level = rssiLevel(rssi);
  if (level === 0) {
    // Firmware build bằng core 2.x không báo RSSI -> chỉ hiện đường đi
    return hops > 0 ? (
      <span className="text-[9px] font-mono text-zinc-400" title="Nhận qua đèn chuyển tiếp">
        qua 1 đèn
      </span>
    ) : null;
  }
  return (
    <span className="flex items-end gap-[2px] h-3" title={`${rssi} dBm${hops > 0 ? ' · qua 1 đèn' : ''}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm ${i <= level ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-white/[0.12]'}`}
          style={{ height: `${i * 4}px` }}
        />
      ))}
    </span>
  );
}

function AckIcon({ lamp, now }: { lamp: MeshLamp; now: number }) {
  if (lamp.ack === 2) return <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" />;
  if (lamp.ack === 3)
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Không phản hồi</span>
      </span>
    );
  if (lamp.ack === 1 && lamp.ackAt && now - lamp.ackAt < ACK_OK_VISIBLE_MS)
    return <Check className="w-3.5 h-3.5 text-emerald-500" />;
  return null;
}

export function LampGroupPanel({
  isConnected,
  meshSupported,
  info,
  lamps,
  target,
  groupNames,
  onSetTarget,
  onRefresh,
  onManageLamp,
}: LampGroupPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  // Nhịp 1 giây để dấu ✓ tự ẩn sau vài giây
  const hasRecentAck = lamps.some((l) => l.ack === 1 && l.ackAt && Date.now() - l.ackAt < ACK_OK_VISIBLE_MS);
  useEffect(() => {
    if (!hasRecentAck) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasRecentAck]);

  if (!isConnected) return null;

  if (!meshSupported) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl glass-card text-xs text-zinc-500 dark:text-zinc-400">
        <Info className="w-4 h-4 text-zinc-400 shrink-0" />
        <span>Đèn này dùng firmware cũ – chỉ điều khiển riêng đèn này.</span>
      </div>
    );
  }

  const groups = usedGroups(lamps);
  const onlineCount = lamps.filter((l) => l.online === 1).length;
  const controlled = lamps.filter((l) => l.online === 1 && targetIncludesLamp(target, l)).length;
  const selectedIds = target.kind === 'lamps' ? target.ids : [];

  const toggleLamp = (lamp: MeshLamp) => {
    if (lamp.online !== 1) return;
    const base = target.kind === 'lamps' ? target.ids : [];
    const ids = base.includes(lamp.id) ? base.filter((id) => id !== lamp.id) : [...base, lamp.id];
    onSetTarget(ids.length === 0 ? { kind: 'self' } : { kind: 'lamps', ids });
  };

  const chip = (label: string, t: ControlTarget, icon?: ReactNode) => {
    const active = sameTarget(target, t);
    return (
      <button
        key={label}
        onClick={() => onSetTarget(t)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
          active
            ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 border-transparent shadow-md shadow-cyan-500/25'
            : 'glass-button'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  const targetText = () => {
    switch (target.kind) {
      case 'self':
        return 'Đèn đang kết nối';
      case 'all':
        return 'Tất cả đèn';
      case 'group':
        return groupLabel(target.group, groupNames);
      case 'lamps':
        return `${target.ids.length} đèn đã chọn`;
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            Điều Khiển Nhiều Đèn
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {onlineCount}/{lamps.length} đèn trực tuyến
            {info ? ` · mạng ${info.net} · kênh ${info.ch}` : ''}
          </p>
        </div>
        <button
          onClick={onRefresh}
          title="Hỏi lại trạng thái tất cả các đèn"
          className="p-2 rounded-xl glass-button cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Chọn đích điều khiển */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {chip('Đèn này', { kind: 'self' }, <Radio className="w-3.5 h-3.5" />)}
        {chip('Tất cả', { kind: 'all' }, <Lightbulb className="w-3.5 h-3.5" />)}
        {groups.map((g) => chip(groupLabel(g, groupNames), { kind: 'group', group: g }))}
      </div>

      <div className="mt-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        Đang điều khiển: <span className="font-bold text-cyan-600 dark:text-cyan-400">{targetText()}</span>
        {target.kind !== 'self' && ` (${controlled} đèn trực tuyến)`}
      </div>

      {/* Danh sách đèn */}
      <ul className="mt-3 space-y-2">
        {lamps.map((lamp) => {
          const inTarget = targetIncludesLamp(target, lamp);
          const offline = lamp.online !== 1;
          const color = getFixtureColorCSS(lamp.r, lamp.g, lamp.b, lamp.cw, lamp.bri, lamp.power);
          return (
            <li
              key={lamp.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                inTarget && !offline
                  ? 'border-cyan-500/40 bg-cyan-500/[0.06]'
                  : 'border-zinc-200/70 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-zinc-950/30'
              } ${offline ? 'opacity-50' : ''}`}
            >
              <input
                type="checkbox"
                aria-label={`Chọn ${lampDisplayName(lamp)}`}
                checked={selectedIds.includes(lamp.id)}
                disabled={offline}
                onChange={() => toggleLamp(lamp)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
              />

              <span
                className="w-7 h-7 rounded-full border border-zinc-200 dark:border-white/[0.12] shrink-0"
                style={{ background: color.cssColor }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {lampDisplayName(lamp)}
                  </span>
                  {lamp.isGateway === 1 && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-px rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shrink-0">
                      Cổng
                    </span>
                  )}
                  {lamp.group > 0 && (
                    <span className="text-[9px] font-semibold px-1.5 py-px rounded-md glass-pill text-zinc-600 dark:text-zinc-300 truncate max-w-[90px]">
                      {groupLabel(lamp.group, groupNames)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {offline ? (
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> Mất kết nối
                    </span>
                  ) : (
                    <>
                      <span>{lamp.power ? `Bật ${lamp.bri}%` : 'Tắt'}</span>
                      {lamp.tempC !== null && <span>{lamp.tempC.toFixed(1)}°C</span>}
                      <span className="text-zinc-400">{lamp.id}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <AckIcon lamp={lamp} now={now} />
                {!offline && <SignalBars rssi={lamp.rssi} hops={lamp.hops} />}
                <button
                  onClick={() => onManageLamp(lamp.id)}
                  title="Đổi tên, nhóm, nháy nhận diện"
                  className="p-1.5 rounded-lg glass-button cursor-pointer active:scale-95"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {lamps.length <= 1 && (
        <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          Chưa thấy đèn nào khác. Các đèn phải cùng kênh Wi-Fi và cùng mã mạng; bấm làm mới sau khi bật đèn khác.
        </p>
      )}
    </div>
  );
}
