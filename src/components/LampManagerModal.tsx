import { useEffect, useState } from 'react';
import { X, Settings2, Zap, Save, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { MeshInfo, MeshLamp } from '../types';
import {
  GroupNames,
  MESH_GROUP_MAX,
  MESH_NAME_MAX_BYTES,
  groupLabel,
  lampDisplayName,
  sanitizeLampName,
  utf8Length,
} from '../utils/meshUtils';

interface LampManagerModalProps {
  lamp: MeshLamp | null;
  info: MeshInfo | null;
  groupNames: GroupNames;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onSetGroup: (id: string, group: number) => void;
  onIdentify: (id: string) => void;
  onSaveGroupNames: (names: GroupNames) => void;
  onSetAreaOption: (key: 'relay' | 'irf', value: 0 | 1) => void;
  onSetNet: (net: number) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-cyan-500' : 'bg-zinc-300 dark:bg-white/[0.15]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  );
}

export function LampManagerModal({
  lamp,
  info,
  groupNames,
  onClose,
  onRename,
  onSetGroup,
  onIdentify,
  onSaveGroupNames,
  onSetAreaOption,
  onSetNet,
}: LampManagerModalProps) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(0);
  const [names, setNames] = useState<GroupNames>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [net, setNet] = useState('1');

  // Nạp lại khi mở cho đèn khác (không nạp lại theo từng notify, kẻo mất chữ đang gõ)
  const lampId = lamp?.id;
  useEffect(() => {
    if (!lamp) return;
    setName(lamp.name);
    setGroup(lamp.group);
    setNames({ ...groupNames });
    setNet(String(info?.net ?? 1));
    setShowAdvanced(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lampId]);

  if (!lamp) return null;

  const cleanName = sanitizeLampName(name);
  const bytesLeft = MESH_NAME_MAX_BYTES - utf8Length(cleanName);
  const dirty = cleanName !== lamp.name || group !== lamp.group;

  const handleSave = () => {
    if (cleanName !== lamp.name) onRename(lamp.id, cleanName);
    if (group !== lamp.group) onSetGroup(lamp.id, group);
    onSaveGroupNames(names);
    onClose();
  };

  const handleSetNet = () => {
    const n = Math.round(Number(net));
    if (!Number.isFinite(n) || n < 1 || n > 255 || n === info?.net) return;
    const ok = window.confirm(
      `Đổi mã mạng của CẢ KHU sang ${n}?\n\n` +
        'Mọi đèn đang thấy nhau sẽ đổi theo, đèn cổng đổi sau cùng. ' +
        'Đèn nào đang mất kết nối sẽ giữ mã cũ và không còn thấy các đèn khác.'
    );
    if (ok) onSetNet(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-2xl bg-white/90 dark:bg-zinc-900/90 rounded-3xl border border-zinc-200/80 dark:border-white/[0.12] shadow-2xl shadow-black/40 transition-colors">
        {/* Tiêu đề */}
        <div className="px-6 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{lampDisplayName(lamp)}</h3>
              <p className="text-xs text-cyan-100 font-mono">
                ID {lamp.id}
                {lamp.isGateway === 1 ? ' · đèn đang kết nối' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm">
          {/* Tên + nhóm */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300">Tên gợi nhớ</label>
            <input
              value={name}
              onChange={(e) => setName(sanitizeLampName(e.target.value))}
              placeholder={`Đèn ${lamp.id}`}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm outline-none"
            />
            <p className={`text-[10px] font-mono ${bytesLeft <= 2 ? 'text-amber-500' : 'text-zinc-400'}`}>
              Còn {bytesLeft} byte (tối đa {MESH_NAME_MAX_BYTES} byte, chữ có dấu tốn 2–3 byte)
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300">Nhóm</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {Array.from({ length: MESH_GROUP_MAX + 1 }, (_, g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer truncate ${
                    group === g
                      ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 border-transparent'
                      : 'glass-button'
                  }`}
                >
                  {g === 0 ? 'Không nhóm' : groupLabel(g, names)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onIdentify(lamp.id)}
            disabled={lamp.online !== 1}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold glass-button cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Nháy nhẹ 3 lần để nhận diện đèn này
          </button>

          {/* Tên nhóm (lưu trong trình duyệt) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300">
              Tên nhóm <span className="font-normal text-zinc-400">(lưu trên điện thoại này)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: MESH_GROUP_MAX }, (_, i) => i + 1).map((g) => (
                <input
                  key={g}
                  value={names[g] ?? ''}
                  onChange={(e) => setNames((prev) => ({ ...prev, [g]: e.target.value.slice(0, 24) }))}
                  placeholder={`Nhóm ${g}`}
                  className="w-full px-3 py-1.5 rounded-lg glass-input text-xs outline-none"
                />
              ))}
            </div>
          </div>

          {/* Nâng cao - áp dụng cho cả khu */}
          <div className="rounded-2xl glass-card">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold cursor-pointer"
            >
              <span>Nâng cao (áp dụng cho cả khu)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">Chuyển tiếp sóng</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Đèn phát lại lệnh 1 lần để tới được đèn ở xa / bị tường chắn
                    </p>
                  </div>
                  <Toggle checked={info?.relay === 1} onChange={(v) => onSetAreaOption('relay', v ? 1 : 0)} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">Cả nhóm chạy theo remote</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Bấm remote hồng ngoại vào một đèn thì các đèn cùng nhóm đổi theo
                    </p>
                  </div>
                  <Toggle checked={info?.irf === 1} onChange={(v) => onSetAreaOption('irf', v ? 1 : 0)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Mã mạng khu vực (1–255)</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Hai khu đặt cạnh nhau đặt mã khác nhau để không điều khiển lẫn nhau.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={255}
                      value={net}
                      onChange={(e) => setNet(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg glass-input text-xs outline-none font-mono"
                    />
                    <button
                      onClick={handleSetNet}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold glass-button cursor-pointer active:scale-95"
                    >
                      Đổi mã (hiện tại: {info?.net ?? '?'})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold glass-button cursor-pointer active:scale-95"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              {dirty ? 'Lưu' : 'Lưu tên nhóm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
