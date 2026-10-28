import { Thermometer, Fan } from 'lucide-react';

interface TelemetryGaugesProps {
  tempC?: number;
  fanDuty?: number;
  isConnected: boolean;
}

export function TelemetryGauges({ tempC, fanDuty = 0, isConnected }: TelemetryGaugesProps) {
  const hasData = isConnected && tempC !== undefined && tempC > 0;
  const currentTemp = tempC !== undefined ? tempC : 0;
  const currentFanDuty = Math.round(fanDuty);

  const getTempStatus = () => {
    if (!isConnected || tempC === undefined || tempC === 0) {
      return {
        label: 'Chưa có dữ liệu',
        bgPill: 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 border-zinc-200 dark:border-white/[0.08]',
        iconTheme: 'bg-zinc-100 dark:bg-white/[0.06] border-zinc-200 dark:border-white/[0.08] text-zinc-400',
      };
    }
    if (currentTemp < 45) {
      return {
        label: 'Mát mẻ (Bình thường)',
        bgPill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        iconTheme: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
      };
    }
    if (currentTemp < 60) {
      return {
        label: 'Ấm (Đèn đang tỏa nhiệt)',
        bgPill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        iconTheme: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
      };
    }
    return {
      label: 'Cảnh báo nhiệt độ cao',
      bgPill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      iconTheme: 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse',
    };
  };

  const status = getTempStatus();

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-rose-500" />
            Cảm Biến Nhiệt & Quạt Tản Nhiệt
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dữ liệu cảm biến thời gian thực nhận từ đèn
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono backdrop-blur-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            TRỰC TIẾP
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Thẻ Nhiệt Độ */}
        <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-lg bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/[0.07] flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-rose-500" />
              Nhiệt Độ Khung Nhôm
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                {hasData ? currentTemp.toFixed(1) : '--.-'}
              </span>
              <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500 font-mono">°C</span>
            </div>
            <div className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${status.bgPill}`}>
              {status.label}
            </div>
          </div>

          {/* Biểu Tượng Nhiệt Kế Đồng Bộ Với Thẻ Quạt */}
          <div className={`w-14 h-14 rounded-2xl backdrop-blur-md flex items-center justify-center border overflow-hidden shadow-xs transition-colors duration-300 ${status.iconTheme}`}>
            <Thermometer className="w-7 h-7" />
          </div>
        </div>

        {/* Thẻ Quạt Tản Nhiệt */}
        <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-lg bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/[0.07] flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Fan className="w-3.5 h-3.5 text-cyan-500" />
              Công Suất Quạt Làm Mát
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                {isConnected ? currentFanDuty : '--'}
              </span>
              <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500 font-mono">%</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              {isConnected
                ? currentFanDuty > 0
                  ? `Đang quay (${currentFanDuty}%)`
                  : 'Quạt đang nghỉ (0%)'
                : 'Chưa có dữ liệu'}
            </div>
          </div>

          {/* Biểu Tượng Quạt Quay */}
          <div className="w-14 h-14 rounded-2xl backdrop-blur-md bg-zinc-100/90 dark:bg-white/[0.06] flex items-center justify-center border border-zinc-200/80 dark:border-white/[0.08] overflow-hidden shadow-xs">
            <Fan
              className={`w-7 h-7 text-cyan-500 transition-all duration-300 ${
                isConnected && currentFanDuty > 0 ? 'animate-spin' : 'opacity-40'
              }`}
              style={{
                animationDuration:
                  isConnected && currentFanDuty > 0
                    ? `${Math.max(0.2, 2.5 - (currentFanDuty / 100) * 2.3)}s`
                    : '0s',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
