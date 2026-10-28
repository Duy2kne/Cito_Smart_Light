import { Power, Sparkles, Zap, Thermometer, Wind } from 'lucide-react';
import { getFixtureColorCSS } from '../utils/colorUtils';

interface FixtureVisualizerProps {
  power: number;
  r: number;
  g: number;
  b: number;
  cw: number;
  bri: number;
  tempC?: number;
  fanDuty?: number;
  onTogglePower?: () => void;
}

export function FixtureVisualizer({
  power,
  r,
  g,
  b,
  cw,
  bri,
  tempC,
  fanDuty,
  onTogglePower,
}: FixtureVisualizerProps) {
  const isLampOn = power === 1 && bri > 0;
  const { cssColor, cssGlow, hex, intensityPercent } = getFixtureColorCSS(r, g, b, cw, bri, power);

  // Tính toán 32 lỗ tản nhiệt CNC và 4 ốc vít định vị chuẩn theo ảnh đèn thực tế
  // 4 ốc ở các góc lệch ~25°, 115°, 205°, 295°
  const screwAngles = [25, 115, 205, 295];
  const totalSlots = 36;
  const outerElements = Array.from({ length: totalSlots }, (_, i) => {
    const angle = (i * 360) / totalSlots;
    // Kiểm tra xem góc này có gần ốc vít hay không (sai số < 5 độ)
    const isScrew = screwAngles.some((sa) => Math.abs(sa - angle) < 5);
    return { index: i, angle, isScrew };
  });

  // Mảng vị trí các mắt LED bên trong mặt kính khuếch tán tròn:
  // - 1 chíp trung tâm
  // - 6 chíp vòng trong (bán kính r = 32px)
  // - 12 chíp vòng ngoài (bán kính r = 58px)
  const innerLedRing = Array.from({ length: 6 }, (_, i) => ({
    angle: (i * 360) / 6,
    type: i % 4, // 0: R, 1: G, 2: B, 3: CW
    dist: 32,
  }));

  const outerLedRing = Array.from({ length: 12 }, (_, i) => ({
    angle: (i * 360) / 12 + 15,
    type: (i + 1) % 4,
    dist: 58,
  }));

  // Helper tính màu cho từng mắt LED
  const getDiodeColor = (type: number) => {
    if (!isLampOn) return { bg: '#2b2c34', glow: 'none', op: 0.25 };
    if (type === 0) {
      // Đỏ (R)
      const op = Math.max(0.15, r / 100);
      return {
        bg: '#ff3b30',
        glow: r > 0 ? `0 0 8px #ff3b30, 0 0 14px rgba(255, 59, 48, ${op})` : 'none',
        op,
      };
    }
    if (type === 1) {
      // Xanh lá (G)
      const op = Math.max(0.15, g / 100);
      return {
        bg: '#34c759',
        glow: g > 0 ? `0 0 8px #34c759, 0 0 14px rgba(52, 199, 89, ${op})` : 'none',
        op,
      };
    }
    if (type === 2) {
      // Xanh dương (B)
      const op = Math.max(0.15, b / 100);
      return {
        bg: '#007aff',
        glow: b > 0 ? `0 0 8px #007aff, 0 0 14px rgba(0, 122, 255, ${op})` : 'none',
        op,
      };
    }
    // Trắng lạnh (CW)
    const op = Math.max(0.15, cw / 100);
    return {
      bg: '#f8fafc',
      glow: cw > 0 ? `0 0 10px #ffffff, 0 0 18px rgba(255, 255, 255, ${op})` : 'none',
      op,
    };
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all overflow-hidden relative">
      {/* TIÊU ĐỀ & CHẾ ĐỘ HIỂN THỊ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Màu Ánh Sáng Đèn</span>
              {isLampOn && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {hex}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Mô phỏng quang phổ theo thiết kế đèn tròn CNC thực tế
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Nút bật/tắt nhanh */}
          {onTogglePower && (
            <button
              id="visualizer-power-btn"
              onClick={onTogglePower}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                isLampOn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 ring-2 ring-emerald-400/30'
                  : 'backdrop-blur-md bg-zinc-200/90 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-300 dark:border-white/[0.1]'
              }`}
              title={isLampOn ? 'Nhấn để tắt đèn' : 'Nhấn để bật đèn'}
            >
              <Power className={`w-3.5 h-3.5 ${isLampOn ? 'text-white' : 'text-zinc-500'}`} />
              <span className="hidden xs:inline">{isLampOn ? 'ĐÈN BẬT' : 'ĐÈN TẮT'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KHUNG MÔ PHỎNG QUANG HỌC CHÍNH */}
      <div className="relative rounded-2xl bg-zinc-950 p-4 sm:p-6 overflow-hidden border border-zinc-800/80 shadow-inner flex flex-col items-center justify-center min-h-[290px] select-none">
        {/* Nền đêm sâu thẳm */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/60 via-zinc-950 to-black pointer-events-none" />

        {/* Quầng sáng quang phổ tỏa rộng trong không gian */}
        {isLampOn && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-84 h-72 sm:h-84 rounded-full blur-3xl pointer-events-none transition-all duration-500"
            style={{
              backgroundColor: cssColor,
              opacity: Math.max(0.2, (bri / 100) * 0.75),
            }}
          />
        )}

        {/* MÔ PHỎNG ĐÈN TRÒN NHÔM CNC (CHI TIẾT CHUẨN ĐỒ HỌA) */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto">
            {/* THÂN ĐÈN TRÒN CNC */}
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 rounded-full flex items-center justify-center transition-transform duration-300">
              {/* Bóng đổ vật lý và vầng sáng phía sau */}
              <div
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  boxShadow: isLampOn
                    ? `${cssGlow}, 0 20px 50px rgba(0,0,0,0.8)`
                    : '0 20px 40px rgba(0,0,0,0.8)',
                }}
              />

              {/* VỎ NHÔM NGOÀI CÙNG (BEZEL) - HIỆU ỨNG KIM LOẠI PHAY CNC */}
              <div
                className="absolute inset-0 rounded-full border border-zinc-400/30 p-2 sm:p-2.5 shadow-2xl flex items-center justify-center"
                style={{
                  background:
                    'conic-gradient(from 45deg, #a1a1aa 0deg, #e4e4e7 60deg, #71717a 120deg, #d4d4d8 180deg, #52525b 240deg, #e4e4e7 300deg, #a1a1aa 360deg)',
                  boxShadow:
                    'inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -2px 5px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.9)',
                }}
              >
                {/* VÒNG LỖ TẢN NHIỆT CNC & 4 ỐC VÍT ĐỊNH VỊ CHÍNH XÁC */}
                <div className="absolute inset-0 pointer-events-none">
                  {outerElements.map((elem) => {
                    const radius = 98; // Bán kính đặt lỗ/ốc
                    const rad = (elem.angle * Math.PI) / 180;
                    // Tọa độ tính từ tâm (100% / 2 = 50%)
                    const xPercent = 50 + (radius / 112) * 50 * Math.cos(rad);
                    const yPercent = 50 + (radius / 112) * 50 * Math.sin(rad);

                    if (elem.isScrew) {
                      // 4 Ốc vít bắt mặt đèn (đầu bake 4 cạnh chìm)
                      return (
                        <div
                          key={elem.index}
                          className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner flex items-center justify-center"
                          style={{
                            left: `${xPercent}%`,
                            top: `${yPercent}%`,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.6)',
                          }}
                          title="Ốc siết mặt đèn CNC"
                        >
                          {/* Rãnh chữ thập của ốc vít */}
                          <div className="relative w-1.5 h-1.5">
                            <div className="absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2 bg-zinc-700" />
                            <div className="absolute top-0 left-1/2 w-[1px] h-full -translate-x-1/2 bg-zinc-700" />
                          </div>
                        </div>
                      );
                    }

                    // Lỗ tản nhiệt CNC tròn quanh viền
                    return (
                      <div
                        key={elem.index}
                        className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 border border-zinc-700/60"
                        style={{
                          left: `${xPercent}%`,
                          top: `${yPercent}%`,
                          boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.9), 0 0.5px 1px rgba(255,255,255,0.4)',
                        }}
                      />
                    );
                  })}
                </div>

                {/* VÒNG BẬC NHÔM TRONG (INNER STEPPED RIM) */}
                <div
                  className="w-full h-full rounded-full p-2.5 sm:p-3 flex items-center justify-center border border-zinc-500/50"
                  style={{
                    background:
                      'radial-gradient(circle, #52525b 0%, #71717a 70%, #3f3f46 100%)',
                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.5)',
                  }}
                >
                  {/* MẶT KÍNH KHUẾCH TÁN QUANG HỌC TRÒN (FROSTED DIFFUSER LENS) */}
                  <div
                    className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isLampOn ? cssColor : '#1e1f26',
                      boxShadow: isLampOn
                        ? `inset 0 0 25px rgba(255,255,255,0.7), 0 0 20px ${cssColor}`
                        : 'inset 0 0 15px rgba(0,0,0,0.7)',
                    }}
                  >
                    {/* Hạt sương khuếch tán bề mặt mica mờ */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.35)_100%)] pointer-events-none" />

                    {/* Vệt phản xạ ánh sáng trên mặt kính cong (Glass specular sheen) */}
                    <div
                      className="absolute top-2 left-4 w-3/4 h-8 rounded-full pointer-events-none transition-opacity duration-300"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)',
                        transform: 'rotate(-20deg)',
                      }}
                    />

                    {/* MẢNG CHÍP LED (MULTI-CHIP LED CLUSTER) BÊN DƯỚI LỚP KÍNH */}
                    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                      {/* Chùm LED trung tâm */}
                      <div className="absolute flex items-center justify-center">
                        <div
                          className="w-3.5 h-3.5 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: isLampOn ? '#ffffff' : '#383a45',
                            opacity: isLampOn ? Math.max(0.4, bri / 100) : 0.2,
                            boxShadow: isLampOn ? '0 0 14px #ffffff, 0 0 22px #ffffff' : 'none',
                          }}
                        />
                      </div>

                      {/* Vòng 6 LED bên trong */}
                      {innerLedRing.map((led, idx) => {
                        const rad = (led.angle * Math.PI) / 180;
                        const x = Math.cos(rad) * led.dist;
                        const y = Math.sin(rad) * led.dist;
                        const diode = getDiodeColor(led.type);

                        return (
                          <div
                            key={`inner-${idx}`}
                            className="absolute w-2 h-2 rounded-full transition-all duration-300"
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                              backgroundColor: diode.bg,
                              opacity: diode.op,
                              boxShadow: diode.glow,
                            }}
                          />
                        );
                      })}

                      {/* Vòng 12 LED bên ngoài */}
                      {outerLedRing.map((led, idx) => {
                        const rad = (led.angle * Math.PI) / 180;
                        const x = Math.cos(rad) * led.dist;
                        const y = Math.sin(rad) * led.dist;
                        const diode = getDiodeColor(led.type);

                        return (
                          <div
                            key={`outer-${idx}`}
                            className="absolute w-2 h-2 rounded-full transition-all duration-300"
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                              backgroundColor: diode.bg,
                              opacity: diode.op,
                              boxShadow: diode.glow,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CHÙM ÁNH SÁNG CHIẾU TỎA NÓN (VOLUMETRIC SPOTLIGHT BEAM) */}
            <div className="relative w-full h-16 sm:h-20 overflow-hidden pointer-events-none mt-2">
              {isLampOn ? (
                <>
                  {/* Chùm sáng nón hình thang mờ dịu */}
                  <div
                    className="w-full h-full transition-all duration-300 blur-md"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 95% 100%, 5% 100%)',
                      background: `linear-gradient(to bottom, ${cssColor}, transparent)`,
                      opacity: Math.max(0.3, (bri / 100) * 0.7),
                    }}
                  />
                  {/* Vùng phản chiếu bề mặt bên dưới */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full blur-md transition-all duration-300"
                    style={{
                      backgroundColor: cssColor,
                      opacity: Math.max(0.2, (bri / 100) * 0.6),
                    }}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  Đèn đang tắt
                </div>
              )}
            </div>
          </div>
      </div>

      {/* THANH THỐNG SỐ CHI TIẾT DƯỚI CÙNG */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Màu tổng hợp */}
        <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 flex items-center gap-2.5">
          <div
            className="w-5 h-5 rounded-lg border border-zinc-300 dark:border-white/20 shadow-xs flex-shrink-0"
            style={{ backgroundColor: cssColor }}
          />
          <div className="min-w-0">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Mã Màu
            </span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate block">
              {hex}
            </span>
          </div>
        </div>

        {/* Tỷ lệ 4 kênh R-G-B-W */}
        <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40">
          <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Kênh R • G • B • W
          </span>
          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[11px]">
            {r} • {g} • {b} • {cw}
          </span>
        </div>

        {/* Cường độ sáng */}
        <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Độ Sáng / Quang
            </span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
              {bri}% <span className="text-[10px] text-zinc-400">({intensityPercent}%)</span>
            </span>
          </div>
        </div>

        {/* Nhiệt độ & Quạt tản nhiệt */}
        <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 flex items-center gap-2">
          <div className="flex items-center gap-1 text-zinc-400 flex-shrink-0">
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            <Wind className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Vỏ Nhôm CNC
            </span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[11px]">
              {tempC !== undefined && tempC > 0 ? `${tempC}°C` : '--°C'}
              {fanDuty !== undefined ? ` • ${fanDuty}%` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
