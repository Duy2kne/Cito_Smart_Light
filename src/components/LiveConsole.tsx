import { useState, useRef, useEffect, FormEvent } from 'react';
import { BleLogEntry } from '../types';
import { Terminal, Send, Trash2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, Info, AlertCircle } from 'lucide-react';

interface LiveConsoleProps {
  logs: BleLogEntry[];
  isConnected: boolean;
  onSendRaw: (command: string) => void;
  onClearLogs: () => void;
}

export function LiveConsole({ logs, onSendRaw, onClearLogs }: LiveConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'tx' | 'rx'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSendRaw(rawInput.trim());
    setRawInput('');
  };

  const filteredLogs = logs.filter((l) => {
    if (filter === 'tx') return l.type === 'tx';
    if (filter === 'rx') return l.type === 'rx';
    return true;
  });

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all overflow-hidden">
      {/* Thanh tiêu đề / Thu gọn mở rộng */}
      <button
        id="toggle-live-console"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-cyan-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                Nhật Ký Giao Thức BLE & Lệnh Trực Tiếp (Console)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-md bg-zinc-100/90 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]">
                {logs.length} sự kiện
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Kiểm tra các chuỗi lệnh gửi đi UTF-8 và gói tin phản hồi JSON từ đèn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-zinc-200/80 dark:border-white/[0.08] space-y-4">
          {/* Bộ lọc và Nút xóa */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 backdrop-blur-md bg-zinc-100/90 dark:bg-white/[0.06] p-1 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] text-[11px] font-mono">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Tất Cả ({logs.length})
              </button>
              <button
                onClick={() => setFilter('tx')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filter === 'tx'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Gửi Đi TX ({logs.filter((l) => l.type === 'tx').length})
              </button>
              <button
                onClick={() => setFilter('rx')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filter === 'rx'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Nhận Về RX ({logs.filter((l) => l.type === 'rx').length})
              </button>
            </div>

            <button
              id="clear-logs-btn"
              onClick={onClearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Nhật Ký</span>
            </button>
          </div>

          {/* Cửa sổ dòng lệnh Terminal */}
          <div
            ref={scrollRef}
            className="h-56 overflow-y-auto rounded-2xl bg-zinc-950/90 backdrop-blur-md p-3.5 font-mono text-[11px] leading-relaxed border border-zinc-800 dark:border-white/[0.08] text-zinc-300 space-y-1.5 select-text shadow-inner"
          >
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                Chưa có dữ liệu Bluetooth nào được ghi nhận. Hãy kết nối hoặc thay đổi mức màu để xem gói tin.
              </div>
            ) : (
              filteredLogs.map((log) => {
                let badge = (
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Info className="w-3 h-3" /> INFO
                  </span>
                );
                let textClass = 'text-zinc-300';

                if (log.type === 'tx') {
                  badge = (
                    <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" /> TX
                    </span>
                  );
                  textClass = 'text-cyan-300 font-semibold';
                } else if (log.type === 'rx') {
                  badge = (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <ArrowDownLeft className="w-3 h-3" /> RX
                    </span>
                  );
                  textClass = 'text-emerald-300';
                } else if (log.type === 'error') {
                  badge = (
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> LỖI
                    </span>
                  );
                  textClass = 'text-rose-400';
                }

                return (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 border-b border-zinc-900/60">
                    <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className="shrink-0 w-12">{badge}</span>
                    <span className={`break-all ${textClass}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Form gửi chuỗi lệnh thủ công */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="raw-command-input"
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="VD: power=1&r=80&g=50&b=10&cw=0&bri=100"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl backdrop-blur-md bg-zinc-50/90 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/[0.1] focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              id="send-raw-command-btn"
              type="submit"
              disabled={!rawInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-cyan-600/25 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Lệnh</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
