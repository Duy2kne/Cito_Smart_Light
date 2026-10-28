import { Power, SunMedium, Activity } from 'lucide-react';

interface PowerBrightnessControlProps {
  power: number;
  bri: number;
  gamma: number;
  onPowerChange: (power: number) => void;
  onBrightnessChange: (bri: number) => void;
  onGammaChange: (gamma: number) => void;
}

export function PowerBrightnessControl({
  power,
  bri,
  gamma,
  onPowerChange,
  onBrightnessChange,
  onGammaChange,
}: PowerBrightnessControlProps) {
  const quickBriLevels = [10, 25, 50, 75, 100];
  const currentBri = Math.round(bri);

  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.min(100, Math.round(currentBri + delta)));
    onBrightnessChange(next);
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Nút nguồn chính & Tiêu đề */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <button
            id="master-power-btn"
            onClick={() => onPowerChange(power === 1 ? 0 : 1)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer shadow-sm active:scale-95 ${
              power === 1
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                : 'backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08]'
            }`}
          >
            <Power className={`w-4 h-4 ${power === 1 ? 'animate-pulse' : ''}`} />
            <span className="font-semibold">{power === 1 ? 'Đèn: ĐANG BẬT' : 'Đèn: ĐANG TẮT'}</span>
          </button>

          <div className="h-6 w-px bg-zinc-200/80 dark:bg-white/[0.1] hidden sm:block"></div>

          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <SunMedium className="w-4 h-4 text-amber-500" />
              Công Suất & Độ Sáng Tổng
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Điều chỉnh cường độ phát quang tổng thể của toàn bộ đèn
            </p>
          </div>
        </div>

        {/* Chuyển đổi Gamma Correction */}
        <div className="flex items-center gap-2 backdrop-blur-md bg-zinc-100/80 dark:bg-white/[0.04] px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] self-start sm:self-auto">
          <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Hiệu chỉnh Gamma (γ=2.2)
          </span>
          <button
            id="gamma-toggle-btn"
            onClick={() => onGammaChange(gamma === 1 ? 0 : 1)}
            className={`ml-1 text-xs font-mono px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
              gamma === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'backdrop-blur-md bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {gamma === 1 ? 'BẬT' : 'TẮT'}
          </button>
        </div>
      </div>

      {/* Thanh kéo Độ sáng tổng (Số nguyên) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="master-bri-slider"
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-mono"
          >
            Độ Sáng Tổng Thể (Master Brightness)
          </label>
          <div className="flex items-center gap-1">
            <input
              id="master-bri-number-input"
              type="number"
              min="0"
              max="100"
              step="1"
              value={currentBri}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onBrightnessChange(Math.max(0, Math.min(100, Math.round(val))));
                }
              }}
              className="w-16 text-right px-2 py-0.5 text-sm font-mono font-bold rounded-lg backdrop-blur-md bg-white/80 dark:bg-zinc-950/70 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/[0.1] focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">%</span>
          </div>
        </div>

        {/* Thanh trượt */}
        <div className="relative flex items-center">
          <input
            id="master-bri-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={currentBri}
            onChange={(e) => onBrightnessChange(Math.round(parseInt(e.target.value, 10)))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${currentBri}%, rgba(120, 120, 130, 0.25) ${currentBri}%, rgba(120, 120, 130, 0.25) 100%)`,
            }}
          />
        </div>

        {/* Nút tăng giảm bước số nguyên & Mức nhanh */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Nút cộng trừ bước nguyên */}
          <div className="flex items-center gap-1">
            <button
              id="bri-minus-5"
              onClick={() => handleStep(-5)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            >
              -5%
            </button>
            <button
              id="bri-minus-1"
              onClick={() => handleStep(-1)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            >
              -1%
            </button>
            <button
              id="bri-plus-1"
              onClick={() => handleStep(1)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            >
              +1%
            </button>
            <button
              id="bri-plus-5"
              onClick={() => handleStep(5)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            >
              +5%
            </button>
          </div>

          {/* Mức nhanh */}
          <div className="flex items-center gap-1">
            {quickBriLevels.map((lvl) => (
              <button
                key={lvl}
                id={`bri-quick-${lvl}`}
                onClick={() => onBrightnessChange(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 ${
                  currentBri === lvl
                    ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/25'
                    : 'backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]'
                }`}
              >
                {lvl}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
