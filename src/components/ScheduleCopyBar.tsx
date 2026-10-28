import { useState } from 'react';
import { CopyCheck, Loader2 } from 'lucide-react';
import { ScheduleData } from '../types';
import { GroupNames, groupLabel } from '../utils/meshUtils';

interface ScheduleCopyBarProps {
  scheduleData: ScheduleData | null;
  groups: number[];
  groupNames: GroupNames;
  onCopy: (to: string) => Promise<void>;
}

/**
 * Chép lịch hẹn giờ của đèn đang kết nối sang các đèn khác (qua mesh).
 * Web không đọc được lịch của đèn khác - firmware chỉ nhận lệnh ghi.
 */
export function ScheduleCopyBar({ scheduleData, groups, groupNames, onCopy }: ScheduleCopyBarProps) {
  const [to, setTo] = useState('all');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  if (!scheduleData) return null;

  const label = (t: string) => (t === 'all' ? 'Tất cả đèn' : groupLabel(Number(t.substring(1)), groupNames));

  const handleCopy = async () => {
    const ok = window.confirm(
      `Chép toàn bộ lịch hẹn giờ của đèn đang kết nối sang "${label(to)}"?\nLịch cũ trên các đèn đó sẽ bị ghi đè.`
    );
    if (!ok) return;
    setBusy(true);
    setDone('');
    try {
      await onCopy(to);
      setDone(`Đã gửi lịch sang ${label(to)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-4 py-3 rounded-2xl glass-card">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
        <CopyCheck className="w-4 h-4 text-cyan-500" />
        Chép lịch này sang
      </div>
      <div className="flex gap-2 flex-1 min-w-0">
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 min-w-0 px-3 py-1.5 rounded-lg glass-input text-xs outline-none cursor-pointer"
        >
          <option value="all">Tất cả đèn</option>
          {groups.map((g) => (
            <option key={g} value={`g${g}`}>
              {groupLabel(g, groupNames)}
            </option>
          ))}
        </select>
        <button
          onClick={handleCopy}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-60 cursor-pointer active:scale-95 shrink-0"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Chép
        </button>
      </div>
      {done && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{done}</span>}
    </div>
  );
}
